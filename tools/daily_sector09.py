#!/usr/bin/env python3
"""TOYOTA GA4 COMMAND: SECTOR 09「JP活用実績」を前日実測まで更新して再暗号化する。
GitHub Actions（毎朝JST）で実行。必要環境変数:
  WINDSOR_API_KEY … Windsor.ai APIキー
  BOARD_GATE_KEY  … ゲート鍵素材 "id:pw"（ROOMY_GATE_KEY でも可）
任意: SECTOR09_INPUT=path.json …Windsorを叩かず既取得の行データを使う（ローカル検証用。
      形式: {"padid":[{date,customevent_padid,event_name,event_count},...],
             "exposure":[{date,event_name,event_count},...]}）
検証: 数値アンカーが全て一致・置換後ラウンドトリップ復号一致が揃わない限り書き込まない。
"""
import json, os, re, sys, time, base64, gzip, urllib.parse, urllib.request
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

KM = os.environ.get('BOARD_GATE_KEY') or os.environ.get('ROOMY_GATE_KEY')
if not KM: sys.exit('BOARD_GATE_KEY 未設定')
TODAY = (date.fromisoformat(os.environ['FETCH_TODAY']) if os.environ.get('FETCH_TODAY')
         else datetime.now(ZoneInfo('Asia/Tokyo')).date())
YB = TODAY - timedelta(days=1)
TC0, AU0 = date(2026, 7, 27), date(2026, 8, 4)
TC_DAYS, AU_DAYS = (YB - TC0).days + 1, (YB - AU0).days + 1

# ---------- データ取得 ----------
def windsor(fields, dfrom, dto, flt):
    key = os.environ.get('WINDSOR_API_KEY')
    if not key: sys.exit('WINDSOR_API_KEY 未設定')
    p = {'api_key': key, 'select_accounts': '324699885', '_renderer': 'json',
         'fields': ','.join(fields), 'date_from': str(dfrom), 'date_to': str(dto),
         'filter': json.dumps(flt, ensure_ascii=False)}
    url = 'https://connectors.windsor.ai/googleanalytics4?' + urllib.parse.urlencode(p)
    last = None
    for att in range(3):
        try:
            with urllib.request.urlopen(url, timeout=240) as r:
                return json.loads(r.read().decode('utf-8')).get('data', [])
        except Exception as e:
            last = e; time.sleep(8 * (att + 1))
    raise SystemExit(f'Windsor取得失敗: {last}')

if os.environ.get('SECTOR09_INPUT'):
    src = json.load(open(os.environ['SECTOR09_INPUT']))
    padid_rows, exp_rows = src['padid'], src['exposure']
else:
    padid_rows = windsor(['date', 'customevent_padid', 'event_name', 'event_count'], TC0, YB,
                         [['customevent_padid', 'contains', 'request_done']])
    exp_rows = windsor(['date', 'event_name', 'event_count'], TC0, YB,
                       [['event_name', 'contains', 'test_drive'], 'and', ['event_name', 'contains', 'complete']])

def n(x): return float(x or 0)
def pid(r): return (r.get('customevent_padid') or '').split(':')[0]   # 値は "padid:リンク先URL" の複合形式
TC_CLICKS = round(sum(n(r['event_count']) for r in padid_rows
                      if pid(r) == 'from_service_request_done_260727' and r.get('event_name') == 'page_view'))
AU_CLICKS = round(sum(n(r['event_count']) for r in padid_rows
                      if pid(r) == 'from_service_request_done_au_260805' and r.get('event_name') == 'page_view'))
TC_EXP = round(sum(n(r['event_count']) for r in exp_rows))
AU_EXP = round(sum(n(r['event_count']) for r in exp_rows if r['date'][:10] >= str(AU0)))
if TC_EXP <= 0: sys.exit('露出0件 — 取得異常の可能性があるため中止')

tc_ctr = round(TC_CLICKS / TC_EXP * 100, 2)
au_ctr = round(AU_CLICKS / AU_EXP * 100, 2) if AU_EXP else 0.0
n_year = round(tc_ctr * 31663 / 100)
h_year = round(n_year * 0.196)
money_now = round(n_year * 7905 / 10000)
end_md = f'{YB.month}/{YB.day}'
today_md = f'{TODAY.month}/{TODAY.day}'
def dot(x):  # 0.58 -> ".58"（scenarios の r 表記）
    s = f'{x:g}'
    return s[1:] if s.startswith('0.') else s
def p2(x):   # CTR表示 "0.58"（常に小数2桁）
    return f'{x:.2f}'
if AU_CLICKS < 1: sys.exit(f'au/UQクリックが既存実績(1件)を下回る（{AU_CLICKS}）— 取得不完全の可能性で中止')

# ---------- 復号 ----------
html = open('index.html', encoding='utf-8').read()
def b64c(name):
    m = re.search(r"const " + name + r"=Uint8Array\.from\(atob\('([^']+)'\)", html)
    assert m, name
    return m.group(1)
salt = base64.b64decode(b64c('SALT'))
key = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=200000).derive(KM.encode())
doc = gzip.decompress(AESGCM(key).decrypt(base64.b64decode(b64c('IV')), base64.b64decode(b64c('CT')), None)).decode('utf-8')

# ---------- 現行値ガード（実測は単調増加のはず） ----------
seg = lambda a, b: (doc.index(a), doc.index(b))
i0, j0 = seg("OWNED.junction.activities[0].kpis", "OWNED.junction.activities[1].purpose")
i1, j1 = seg("OWNED.junction.activities[1].kpis", "OWNED.junction.activities[2].purpose")
prev_tc = int(re.search(r"\{k:'クリック', v:'(\d+)'", doc[i0:j0]).group(1))
prev_exp = int(re.search(r"\{k:'表示（露出）', v:'([\d,]+)'", doc[i0:j0]).group(1).replace(',', ''))
if TC_CLICKS < prev_tc: sys.exit(f'クリック実測が既存値を下回る（{TC_CLICKS} < {prev_tc}）— 取得不完全の可能性で中止')
if TC_EXP < prev_exp * 0.95: sys.exit(f'露出実測が既存値の95%未満（{TC_EXP} vs {prev_exp}）— 中止')

# ---------- 置換 ----------
rep_n = [0]
def sub1(text, pat, rep):
    out, cnt = re.subn(pat, rep, text, count=1)
    assert cnt == 1, f'アンカー不一致: {pat[:60]}'
    rep_n[0] += 1
    return out

d = doc
# scenarios[0] 実測ペース
d = sub1(d, r"\{k:'実測ペース', r:[.\d]+, n:\d+,\s*h:\d+,\s*v:\d+,\s*req:'[^']*'\}",
         f"{{k:'実測ペース', r:{dot(tc_ctr)}, n:{n_year},  h:{h_year},  v:{money_now},  req:'現状の配置のまま（クリック{TC_CLICKS}件/{TC_DAYS}日 実測・{today_md}更新）'}}")
# activities[0]
a0 = d[d.index("OWNED.junction.activities[0].kpis"):d.index("OWNED.junction.activities[1].purpose")]
new_a0 = a0
new_a0 = sub1(new_a0, r"\{k:'表示（露出）', v:'[\d,]+', u:'件/\d+日', s:'完了ページ到達＝試乗予約完了数（GA4実測 7/27〜[\d/]+）'\}",
              f"{{k:'表示（露出）', v:'{TC_EXP:,}', u:'件/{TC_DAYS}日', s:'完了ページ到達＝試乗予約完了数（GA4実測 7/27〜{end_md}）'}}")
new_a0 = sub1(new_a0, r"\{k:'クリック', v:'\d+', u:'件', s:'padid実測（7/27〜[\d/]+・[\d/]+更新）'\}",
              f"{{k:'クリック', v:'{TC_CLICKS}', u:'件', s:'padid実測（7/27〜{end_md}・{today_md}更新）'}}")
new_a0 = sub1(new_a0, r"\{k:'クリック率', v:'[\d.]+', u:'%', s:'\d+ ÷ [\d,]+'\}",
              f"{{k:'クリック率', v:'{p2(tc_ctr)}', u:'%', s:'{TC_CLICKS} ÷ {TC_EXP:,}'}}")
new_a0 = sub1(new_a0, r"money = \{now:\d+, pot:1251, note:'[^']*'\}",
              f"money = {{now:{money_now}, pot:1251, note:'年{n_year}件（実測ペース{p2(tc_ctr)}%×分母31,663件）× 7,905円/件。改修後5%なら1,251万円'}}")
d = d.replace(a0, new_a0, 1)
# activities[1]
a1 = d[d.index("OWNED.junction.activities[1].kpis"):d.index("OWNED.junction.activities[2].purpose")]
new_a1 = a1
new_a1 = sub1(new_a1, r"\{k:'表示（露出）', v:'[\d,]+', u:'件/\d+日', s:'同・完了ページ（8/4〜[\d/]+）'\}",
              f"{{k:'表示（露出）', v:'{AU_EXP:,}', u:'件/{AU_DAYS}日', s:'同・完了ページ（8/4〜{end_md}）'}}")
au_s = (f'8/4の第1号のみ・以後{AU_DAYS-1}日間 追加なし（{today_md}更新）' if AU_CLICKS <= 1
        else f'padid実測（8/4〜{end_md}・{today_md}更新）')
new_a1 = sub1(new_a1, r"\{k:'クリック', v:'\d+', u:'件', s:'[^']*'\}",
              f"{{k:'クリック', v:'{AU_CLICKS}', u:'件', s:'{au_s}'}}")
new_a1 = sub1(new_a1, r"\{k:'クリック率', v:'[\d.]+', u:'%', s:'\d+ ÷ [\d,]+'\}",
              f"{{k:'クリック率', v:'{p2(au_ctr)}', u:'%', s:'{AU_CLICKS} ÷ {AU_EXP:,}'}}")
au_note = (f'8/4以降クリックが増えていない（{AU_DAYS}日間で{AU_CLICKS}件・CTR {p2(au_ctr)}%）。蓄積待ちではなく、訴求文言・掲出位置の見直しフェーズに入るべき段階'
           if AU_CLICKS <= 1 else
           f'クリック{AU_CLICKS}件（CTR {p2(au_ctr)}%・{today_md}更新）— 伸長を継続観測中。次の節目はCTR0.5%')
new_a1 = sub1(new_a1, r"money = \{now:null, pot:null, note:'[^']*'\}",
              f"money = {{now:null, pot:null, note:'{au_note}'}}")
d = d.replace(a1, new_a1, 1)
# サイドバー データ最終日
d = sub1(d, r"（JP活用実績は <span class=\"num\">[\d-]+</span>）",
         f"（JP活用実績は <span class=\"num\">{YB.strftime('%m-%d')}</span>）")

assert rep_n[0] == 10, rep_n

# ---------- 再暗号化（SALT固定・新IV）＋ラウンドトリップ検証 ----------
iv2 = os.urandom(12)
ct2 = AESGCM(key).encrypt(iv2, gzip.compress(d.encode('utf-8'), 9), None)
html2 = re.sub(r"(const IV=Uint8Array\.from\(atob\(')[^']+('\))", r'\g<1>' + base64.b64encode(iv2).decode() + r'\g<2>', html, count=1)
html2 = re.sub(r"(const CT=Uint8Array\.from\(atob\(')[^']+('\))", r'\g<1>' + base64.b64encode(ct2).decode() + r'\g<2>', html2, count=1)
chk = gzip.decompress(AESGCM(key).decrypt(base64.b64decode(re.search(r"const IV=Uint8Array\.from\(atob\('([^']+)'\)", html2).group(1)),
                                          base64.b64decode(re.search(r"const CT=Uint8Array\.from\(atob\('([^']+)'\)", html2).group(1)), None)).decode('utf-8')
assert chk == d, 'ラウンドトリップ不一致'
open('index.html', 'w', encoding='utf-8').write(html2)
print(f'SECTOR09 updated through {YB}: T-Connect {TC_CLICKS}件/CTR{p2(tc_ctr)}%/効果額{money_now}万円 · au/UQ {AU_CLICKS}件/CTR{p2(au_ctr)}% · 露出{TC_EXP:,}')
