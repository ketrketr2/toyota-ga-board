/* ============ 描画エンジン 3：OWNED OPS（オウンド資産／JP活用実績／SNSパフォーマンス）— 実測 ============ */
/* すべて OWNED / SISAKU_INIT（data.js）から描画。GAデモテンソルとは独立。 */

const STATUS_COLORS={
  '初動報告':'#38BDF8','合意済':'#34D399','制作中':'#00E5C7','提案済み（返答待ち）':'#9085E9',
  '再提案準備中':'#FFB020','保留':'#8A96A8','見送り':'#5B6B84'
};
const SIS_KEY='toyotaOwnedSisaku_v1';
const SIS_ST=Object.keys(STATUS_COLORS);
function stBadge(st){const c=STATUS_COLORS[st]||'#8A96A8';
  return `<span class="stb" style="color:${c};background:color-mix(in srgb,${c} 13%,transparent)">${st||'—'}</span>`}
function sisLoad(){
  try{const raw=localStorage.getItem(SIS_KEY); if(raw){const d=JSON.parse(raw); if(Array.isArray(d))return d}}catch(e){}
  return SISAKU_INIT.map(s=>({...s}));
}
function sisSave(list){try{localStorage.setItem(SIS_KEY,JSON.stringify(list))}catch(e){}}
let SIS=null, sisFilter='all';
ST.dwm='w'; ST.snsTab='all';

const fmtF=n=> n>=1e4 ? ((n/1e4).toFixed(1).replace(/\.0$/,''))+'万' : CM(n); // フォロワー用（小数1桁維持）
const oku=n=>n.toFixed(2).replace(/0$/,'')+'億円';

/* ---------- 汎用モーダル ---------- */
function logicOpen(html){ $('#logicModalBox').innerHTML=html; $('#logicModal').classList.add('on'); }
function capOpen(img,title,meta,url){
  $('#capModalBox').innerHTML=`
    <img src="${img}" alt="${title}">
    <div class="ct2"><span>${title}</span>${url?`<a href="${url}" target="_blank" rel="noopener">実ページを開く ↗</a>`:''}</div>
    ${meta?`<div class="cm2">${meta}</div>`:''}`;
  $('#capModal').classList.add('on');
}

/* ---------- 資産ロジック定義（クリックで開く計算式） ---------- */
function stockNow(){ return OWNED.calcStock(OWNED.snaps[1]).by }
function logicHTML(key){
  const by=stockNow(), f=OWNED.snaps[1].f;
  const L={
    total:{t:'オウンド総資産',v:oku(OWNED.assetAt(OWNED.snaps[1]).total),rows:[
      ['式','<div class="leq">総資産 = ( STOCK + FLOW ) × Q</div>STOCK＝アクティブ基盤×獲得単価 ／ FLOW＝年間露出×広告単価 ／ Q＝自社ER÷業界平均ER<small>今回 Q=1.0（補正なし）。基盤は「アクティブのみ」・露出は「実測とGA」— 形骸化した数字を除いて計上</small>'],
      ['STOCK',`${oku(OWNED.assetAt(OWNED.snaps[1]).stock)} ＝ SNS基盤 ${(OWNED.calcStock(OWNED.snaps[1]).total/1e8).toFixed(2)}億 ＋ メルマガ2.70億 ＋ LINE1.91億<small>SNSは総フォロワーでなくアクティブ推計のみ（X60%・IG70%・TikTok80%・FB50%・YT70%）</small>`],
      ['FLOW',`36.75億円/年 ＝ JP 28.6億 ＋ YouTube 2.79億 ＋ メルマガ1.46億 ＋ TikTok1.17億 ＋ LINE1.08億 ＋ IG1.03億 ＋ X0.56億 ＋ FB0.06億<small>impは60%（実際に見られた分）のみ計上</small>`],
      ['保守下限','全単価を下限 × 露出・配信を半減しても <b>24.0億円</b> を下回らない'],
      ['未計上','回遊価値 +'+OWNED.jpAsset.kaiyu.val+'億円（下記JP参照）・バズ二次拡散・JPコンテンツ/SEO資産・トヨタイムズWEB — すべて上振れ要素']
    ],src:'単価・アクティブ率＝オウンドKPI共有資料（7/30版）: Meltwater・ホットリンク・動画広告分析Pro・アドエビス実勢の中央値 ／ 露出＝各公式アカウント実測＋GA'},
    jp:{t:'toyota.jp',v:'28.6億円/年',rows:[
      ['FLOW本体','<div class="leq">28.6億円 = 年間9,525万UU × 検索経由50% × 加重CPC 60円</div>'+OWNED.jpAsset.uuNote+'<small>'+OWNED.jpAsset.cpcNote+'。Direct等は除外（保守）＝検索流入をリスティング広告で買った場合の代替額</small>'],
      ['実測の裏付け',`直近28日（GA4実測・7/22〜8/18）: セッション <b class="num">970万</b> ・ ユーザー546万 ・ PV <b class="num">3,215万</b> → 年換算1.26億セッション・4.2億PV<small>Windsor.ai経由 GA4プロパティ「Toyota.jp【本格移行用】」から取得（2026-08-19）</small>`],
      ['回遊価値（上振れ）','<div class="leq">+'+OWNED.jpAsset.kaiyu.val+'億円/年 = 年間追加閲覧 '+(OWNED.tj.addPVy/1e8).toFixed(2)+'億PV × 有効60% × CPM 700円</div>'+OWNED.jpAsset.kaiyu.note+'<small>追加閲覧＝2ページ目以降の閲覧（PV−セッション）。1訪問あたり平均 '+OWNED.tj.pvps.toFixed(2)+'ページを実測 → 流入後の回遊がディスプレイ広告'+(OWNED.tj.addPVy/1e8).toFixed(1)+'億imp相当の接触を生んでいる</small>'],
      ['STOCK','コンテンツ・SEO資産は推計困難のため未計上（上振れ要素）']
    ],src:'GA4実測（2026-08-19取得・28日間）／ 単価＝KPI共有資料 7/30版'},
    yt:{t:'YouTube 3ch合算',v:oku(by.yt/1e8+OWNED.flowFixed.yt),rows:[
      ['STOCK','<div class="leq">'+(by.yt/1e8).toFixed(2)+'億円 = 登録者 '+fmtF(f.yt)+'（実測 8/19） × アクティブ率70% × CPF 200円</div><small>ショールーム29.1万＋トヨタイムズ90.5万＋ドライバーズ8.3万。トヨタイムズは3週間で+3.8万人</small>'],
      ['FLOW','<div class="leq">2.79億円/年 = 年間再生 7,975万回 × 自然分50% × CPV 7円</div><small>年間再生＝3chの総再生7.21億回÷各運用年数（実測 7/29）。広告配信ブースト分を除くため自然分50%のみ計上（保守）</small>']
    ],src:'登録者・総再生＝各チャンネル公開値実測 ／ CPV実勢＝アドエビス'},
    mail:{t:'メルマガ',v:'4.16億円',rows:[
      ['STOCK','<div class="leq">2.70億円 = 有効リスト 135万件 × 200円</div><small>会員150万×有効配信率90%。単価＝リード獲得実勢（200〜500円）の下限</small>'],
      ['FLOW','<div class="leq">1.46億円/年 = 年2,700万通 × 5円 ＋ JP誘導 9.5万件 × 120円</div><small>月1.5回×150万通。単価＝号外メール広告実勢。誘導はUTM実績（進捗106%）</small>']
    ],src:'会員数＝チーム提供値 ／ 実物をGmail受信分で確認（7/29）'},
    line:{t:'LINE',v:'2.99億円',rows:[
      ['STOCK','<div class="leq">1.91億円 = 非ブロック 127.5万人 × 150円</div><small>友だち150万×非ブロック率85%（業界平均ブロック率15%）。単価＝LINE CPF実勢50〜200円の中央</small>'],
      ['FLOW','<div class="leq">1.08億円/年 = 年3,600万通 × 3円</div><small>月2回×150万通。単価＝LINE公式アカウント従量メッセージ料金実勢</small>']
    ],src:'KPI共有資料 7/30版'},
    ig:{t:'Instagram @toyota_jp',v:oku(by.ig/1e8+OWNED.flowFixed.ig),rows:[
      ['STOCK','<div class="leq">'+(by.ig/1e8).toFixed(2)+'億円 = フォロワー '+fmtF(f.ig)+'（実測 8/19） × アクティブ率70% × CPF 200円</div>'],
      ['FLOW','<div class="leq">1.03億円/年 = 露出 0.54億 ＋ エンゲージ 0.49億</div>露出＝年4,075万imp（リーチ率20%×月20本）× 有効60% × CPM 2,200円<small>エンゲージ＝imp × 実測ER × CPE 100円。CPM実勢2,000〜3,000円（ホットリンク 2025）</small>']
    ],src:'フォロワー＝実測クロール ／ 単価＝KPI共有資料 7/30版'},
    tt:{t:'TikTok @toyota_pr_japan',v:oku(by.tt/1e8+OWNED.flowFixed.tt),rows:[
      ['STOCK','<div class="leq">'+(by.tt/1e8).toFixed(2)+'億円 = フォロワー 80.4万（実測 7/29） × アクティブ率80% × CPF 150円</div><small>8/19はアクセス制限のためクロール不可 → 7/29公開値を継続使用</small>'],
      ['FLOW','<div class="leq">1.17億円/年 = 露出 0.19億 ＋ エンゲージ 0.99億</div>露出＝年3,088万再生（累計いいね630万÷いいね率4%÷運用5.1年）× 有効60% × CPM 1,000円<small>エンゲージ＝再生 × ER4%（実測） × CPE 80円</small>']
    ],src:'累計いいね＝プロフィール公開値 ／ CPM実勢＝動画広告分析Pro 2026'},
    x:{t:'X @TOYOTA_PR',v:oku(by.x/1e8+OWNED.flowFixed.x),rows:[
      ['STOCK','<div class="leq">'+(by.x/1e8).toFixed(2)+'億円 = フォロワー '+fmtF(f.x)+'（実測 8/19） × アクティブ率60% × CPF 150円</div>'],
      ['FLOW','<div class="leq">0.56億円/年 = 露出 0.32億 ＋ エンゲージ 0.24億</div>露出＝年7,600万imp（月120本×平均2.5万imp＋バズ・災害情報 年20回×200万imp）× 有効60% × CPM 700円<small>エンゲージ＝imp × ER0.45%（実測） × CPE 70円。直近4投稿の実測impは1.8万〜5.7万</small>']
    ],src:'imp＝直近投稿実測（8/19）＋投稿頻度 ／ CPF実勢＝Meltwater'},
    fb:{t:'Facebook TOYOTA公式',v:oku(by.fb/1e8+OWNED.flowFixed.fb),rows:[
      ['STOCK','<div class="leq">'+(by.fb/1e8).toFixed(2)+'億円 = フォロワー 56万（実測 8/19） × アクティブ率50% × CPF 250円</div>'],
      ['FLOW','<div class="leq">0.06億円/年 = 露出 0.02億 ＋ エンゲージ 0.04億</div>露出＝年430万リーチ（月8本×リーチ率8%）× 有効60% × CPM 800円']
    ],src:'フォロワー・レビュー＝ページ公開値実測（8/19）'}
  };
  const d=L[key]; if(!d)return '';
  return `<h3>${d.t}<span class="v">${d.v}</span></h3><div class="lsub">計算式と代入値 — すべて出典つき。クリックした金額の内訳</div>
    ${d.rows.map((r,i)=>`<div class="lrow ${i===0?'gold':''}"><div class="lk">${r[0]}</div><div class="lf">${r[1]}</div></div>`).join('')}
    <div class="lsrc">出典：${d.src}</div>`;
}

/* ================= SECTOR 08: オウンド資産 ================= */
function renderAssets(){
  const root=$('#assetsRoot');
  const s0=OWNED.snaps[0], s1=OWNED.snaps[1];
  const a0=OWNED.assetAt(s0), a1=OWNED.assetAt(s1);
  const days=(new Date(s1.d)-new Date(s0.d))/86400000;
  const dTotal=(a1.total-a0.total)*1e8;           // 円
  const perDay=dTotal/days;
  const dwmVal={d:perDay, w:perDay*7, m:perDay*30};
  const dwmLbl={d:'デイリー換算',w:'ウィークリー換算',m:'マンスリー換算'};
  const by1=OWNED.calcStock(s1).by, by0=OWNED.calcStock(s0).by;

  // チャネル行（金額降順）
  const rows=[
    {k:'jp',  n:'toyota.jp', sub:'流入価値（検索代替）', ic:'JP', col:'#00E5C7', stock:0, flow:28.6},
    {k:'yt',  n:'YouTube 3ch', sub:'登録127.9万・年7,975万再生', ic:'YT', col:'#E66767', stock:by1.yt/1e8, flow:OWNED.flowFixed.yt},
    {k:'mail',n:'メルマガ', sub:'有効135万件・年2,700万通', ic:'ML', col:'#C98500', stock:OWNED.fixedStock.mail, flow:OWNED.flowFixed.mail},
    {k:'line',n:'LINE', sub:'非ブロック127.5万・年3,600万通', ic:'LN', col:'#199E70', stock:OWNED.fixedStock.line, flow:OWNED.flowFixed.line},
    {k:'ig',  n:'Instagram', sub:'85.1万フォロワー', ic:'IG', col:'#D55181', stock:by1.ig/1e8, flow:OWNED.flowFixed.ig},
    {k:'tt',  n:'TikTok', sub:'80.4万フォロワー（7/29）', ic:'TT', col:'#38BDF8', stock:by1.tt/1e8, flow:OWNED.flowFixed.tt},
    {k:'x',   n:'X', sub:'64.7万フォロワー', ic:'X', col:'#8A96A8', stock:by1.x/1e8, flow:OWNED.flowFixed.x},
    {k:'fb',  n:'Facebook', sub:'56万フォロワー', ic:'FB', col:'#3987E5', stock:by1.fb/1e8, flow:OWNED.flowFixed.fb},
  ];
  const mx=Math.max(...rows.map(r=>r.stock+r.flow));

  root.innerHTML=`
  <!-- 総資産ヒーロー -->
  <div class="card glow s12 reveal clickable" id="astHero" style="border-color:color-mix(in srgb,var(--gd) 30%,transparent)">
    <div class="oneHero" style="grid-template-columns:auto 1fr">
      <div class="oneBig">
        <div class="cap">OWNED MEDIA ASSET — 年換算 <span class="clickHint">▸ クリックで計算式</span></div>
        <div class="n" style="font-size:70px"><span data-cu="${a1.total.toFixed(2)}" data-dec="2">0</span><span style="font-size:28px">億円</span></div>
        <div class="u">= ( STOCK <b class="num">${a1.stock.toFixed(2)}億</b> + FLOW <b class="num">${a1.flow.toFixed(2)}億</b>/年 ) × Q<span style="color:var(--mut)">1.0</span></div>
        <div style="font-size:10.5px;color:var(--mut);margin-top:7px">保守ケース（全単価下限×露出半減）でも <b style="color:var(--tx2)">24.0億円</b>　·　評価日 ${s1.d}</div>
      </div>
      <div>
        <div class="oneStats" style="grid-template-columns:repeat(3,1fr)">
          <div class="oneStat" style="border-color:color-mix(in srgb,var(--gn) 40%,transparent)">
            <div class="k" style="display:flex;justify-content:space-between;align-items:center">前回実測比（${s0.d.slice(5).replace('-','/')}→${s1.d.slice(5).replace('-','/')}）
              <span class="dwm" id="dwmCtl"><button data-m="d" ${ST.dwm==='d'?'class="on"':''}>D</button><button data-m="w" ${ST.dwm==='w'?'class="on"':''}>W</button><button data-m="m" ${ST.dwm==='m'?'class="on"':''}>M</button></span></div>
            <div class="v" style="color:var(--gn)">＋<span id="dwmV">${CM(dwmVal[ST.dwm]/1e4)}</span><small> 万円/<span id="dwmU">${({d:'日',w:'週',m:'月'})[ST.dwm]}</span></small></div>
            <div class="s" id="dwmS">${days}日間で実測 ＋${CM(dTotal/1e4)}万円 → <span id="dwmL">${dwmLbl[ST.dwm]}</span></div>
          </div>
          <div class="oneStat"><div class="k">増加の主因</div><div class="v" style="font-size:15px;line-height:1.5">トヨタイムズ<br>登録 <b style="color:var(--gn)">+3.8万人</b></div><div class="s">= 基盤資産 +${CM((by1.yt-by0.yt)/1e4)}万円（×70%×200円）</div></div>
          <div class="oneStat"><div class="k">上振れ要素（未計上）</div><div class="v">+<span data-cu="${OWNED.jpAsset.kaiyu.val}" data-dec="2">0</span><small> 億円〜</small></div><div class="s">JP回遊価値（実測PV/S ${OWNED.tj.pvps.toFixed(2)}）。バズ二次拡散等も別途</div></div>
        </div>
        <div style="margin-top:11px;font-size:11.3px;color:var(--tx2);line-height:1.8">オウンド活動の成果を<b class="hl">資産額の増減</b>で説明するための台帳。フォロワー・登録者の実測が更新されるたびにSTOCKが再計算され、<b class="hlc">下のグラフに実測点が積み上がる</b>。</div>
      </div>
    </div>
  </div>

  <!-- 資産推移 -->
  <div class="card s7 reveal">
    <div class="ct"><span class="bar"></span><h3>総資産の推移 — 実測スナップショット</h3><span class="sub">補間なし・実測点のみ（次回クロールで自動追加）</span></div>
    <div class="chart" id="chAstTrend" style="height:240px"></div>
    <div class="twrap" style="margin-top:6px"><table>
      <thead><tr><th>実測日</th><th class="num">STOCK</th><th class="num">FLOW/年</th><th class="num">総資産</th><th class="num">増減</th><th>メモ</th></tr></thead>
      <tbody>
        <tr><td class="num">${s0.d}</td><td class="num">${a0.stock.toFixed(2)}億</td><td class="num">${a0.flow.toFixed(2)}億</td><td class="num">${a0.total.toFixed(2)}億円</td><td class="num" style="color:var(--mut)">基準</td><td style="font-size:10.5px;color:var(--mut)">${s0.src}</td></tr>
        <tr><td class="num">${s1.d}</td><td class="num">${a1.stock.toFixed(2)}億</td><td class="num">${a1.flow.toFixed(2)}億</td><td class="num" style="color:var(--gd);font-weight:700">${a1.total.toFixed(2)}億円</td><td class="num" style="color:var(--gn)">＋${CM(dTotal/1e4)}万円</td><td style="font-size:10.5px;color:var(--mut)">${s1.src}</td></tr>
      </tbody></table></div>
  </div>

  <!-- 何が動いたか -->
  <div class="card s5 reveal">
    <div class="ct"><span class="bar"></span><h3>この3週間で動いた基盤</h3><span class="sub">STOCK 増減の内訳（実測）</span></div>
    <div id="astDeltaRows"></div>
    <div class="insight" style="margin-top:12px;font-size:11.5px">FLOW（露出側）の単価・頻度は7/30版ロジックで固定中。<b class="hl">月次で露出実測に置き換える</b>と、投稿活動の増減も資産額に反映される建て付け。</div>
  </div>

  <!-- チャネル内訳（クリックでロジック） -->
  <div class="card s7 reveal">
    <div class="ct"><span class="bar"></span><h3>チャネル別 資産内訳</h3><span class="sub">行をクリック → 計算式・代入値・出典</span></div>
    <div>${rows.map(r=>{
      const t=r.stock+r.flow;
      return `<div class="achRow" data-logic="${r.k}">
        <div class="ic" style="color:${r.col};background:color-mix(in srgb,${r.col} 14%,transparent)">${r.ic}</div>
        <div class="anm">${r.n}<small>${r.sub}</small></div>
        <div class="abar"><i style="width:${r.stock/mx*100}%;background:#3987E5"></i><i style="width:${r.flow/mx*100}%;background:#00E5C7"></i></div>
        <div class="aval">${t.toFixed(2)}億<small>S ${r.stock.toFixed(2)} / F ${r.flow.toFixed(2)}</small></div>
        <div class="aopen">式 ▸</div>
      </div>`}).join('')}</div>
    <div style="display:flex;gap:16px;margin-top:10px;font-size:10.5px;color:var(--mut)"><span><i style="display:inline-block;width:10px;height:10px;border-radius:3px;background:#3987E5;margin-right:5px"></i>STOCK（基盤資産）</span><span><i style="display:inline-block;width:10px;height:10px;border-radius:3px;background:#00E5C7;margin-right:5px"></i>FLOW（年間活動価値）</span></div>
  </div>

  <!-- 単価表 -->
  <div class="card s5 reveal">
    <div class="ct"><span class="bar"></span><h3>採用単価（市場実勢の中央値）</h3><span class="sub">下段＝実勢レンジ・円</span></div>
    <div class="twrap"><table>
      <thead><tr><th>媒体</th><th class="num">CPF<div style="font-size:9px;color:var(--mut)">フォロワー獲得</div></th><th class="num">CPM<div style="font-size:9px;color:var(--mut)">1,000imp</div></th><th class="num">CPE<div style="font-size:9px;color:var(--mut)">1エンゲージ</div></th></tr></thead>
      <tbody>${OWNED.sns.units.map(u=>`<tr><td><b>${u.m}</b></td>
        <td class="num">${u.cpf}<div style="font-size:9.5px;color:var(--mut)">${u.cpfR}</div></td>
        <td class="num">${u.cpm}<div style="font-size:9.5px;color:var(--mut)">${u.cpmR}</div></td>
        <td class="num">${u.cpe}<div style="font-size:9.5px;color:var(--mut)">${u.cpeR}</div></td></tr>`).join('')}</tbody></table></div>
    <div style="font-size:10.3px;color:var(--mut);margin-top:9px;line-height:1.8">YouTube＝CPF200円/CPV7円×自然50% ・ JP＝検索50%×加重CPC60円 ・ メルマガ＝リスト200円/号外5円 ・ LINE＝友だち150円/従量3円<br>出典：<a href="https://www.meltwater.com/jp" target="_blank" rel="noopener" style="color:var(--cy)">Meltwater</a>・ホットリンク・動画広告分析Pro・アドエビス（実勢レンジの中央値）</div>
  </div>

  <div class="card s12 reveal"><div class="insight" style="font-size:10.8px">
    アピールの型：<b class="hl">「オウンドの総資産は${a1.total.toFixed(1)}億円。うち今期の活動で基盤資産を＋${CM(dTotal/1e4)}万円積み増した」</b> — 金額はすべて上のロジック（クリックで開く計算式）から機械的に算出され、フォロワー・登録者の公開実測値で誰でも検算できる。実測スナップショットが増えるほどD/W/M換算の精度が上がる。
  </div></div>`;

  // D/W/M トグル
  $('#dwmCtl').addEventListener('click',e=>{
    e.stopPropagation();
    const b=e.target.closest('button[data-m]'); if(!b)return;
    ST.dwm=b.dataset.m;
    $$('#dwmCtl button').forEach(x=>x.classList.toggle('on',x===b));
    $('#dwmV').textContent=CM(dwmVal[ST.dwm]/1e4);
    $('#dwmU').textContent=({d:'日',w:'週',m:'月'})[ST.dwm];
    $('#dwmL').textContent=dwmLbl[ST.dwm];
  });
  // ロジックモーダル
  $('#astHero').onclick=e=>{ if(e.target.closest('#dwmCtl')||e.target.closest('a'))return; logicOpen(logicHTML('total')) };
  $$('#assetsRoot .achRow').forEach(r=>r.onclick=()=>logicOpen(logicHTML(r.dataset.logic)));
  // 基盤増減
  const defs=OWNED.snapDefs;
  const yen4=(fd,k)=>fd*defs[k].a*defs[k].cpf;
  $('#astDeltaRows').innerHTML=[
    ['トヨタイムズ（YouTube）','+3.8万人', yen4(38000,'yt'), '#E66767','新体制報道・ウーブンシティ#6'],
    ['Instagram','+2,000人', yen4(2000,'ig'), '#D55181','精霊馬バズ（8.9万いいね）効果'],
    ['ドライバーズch（YouTube）','+500人', yen4(500,'yt'), '#E66767','精霊馬YT版 30万回再生'],
    ['X・TikTok・Facebook','±0', 0, '#8A96A8','横ばい（TikTokは7/29値継続）']
  ].map(r=>`<div class="liftRow" style="margin:9px 0">
    <div class="t"><b style="color:${r[3]}">${r[0]}</b><span style="font-family:var(--mono);font-size:11px;color:var(--tx2)">${r[1]}</span></div>
    <div class="bwrap" style="display:grid;grid-template-columns:1fr 92px;gap:8px;align-items:center">
      <div style="height:12px;border-radius:4px;background:var(--bg2);overflow:hidden"><i style="display:block;height:100%;width:${Math.min(100,r[2]/532000*100)}%;background:${r[3]}"></i></div>
      <div style="font-family:var(--mono);font-size:11px;text-align:right;color:${r[2]>0?'var(--gn)':'var(--mut)'}">${r[2]>0?'+'+CM(r[2]/1e4)+'万円':'—'}</div>
    </div>
    <div style="font-size:10px;color:var(--mut);margin-top:3px">${r[4]}</div>
  </div>`).join('');

  drawAstTrend(a0,a1,s0,s1);
  runCountUps(root);
}

function drawAstTrend(a0,a1,s0,s1){
  const c=E('chAstTrend'); if(!c)return;
  c.setOption(baseOpt({
    grid:{left:64,right:90,top:26,bottom:30},
    xAxis:axX({data:[s0.d.slice(5).replace('-','/'),s1.d.slice(5).replace('-','/'),'次回クロール'],boundaryGap:true,axisLabel:{color:MUT,fontSize:10.5,fontFamily:MONOF}}),
    yAxis:axY({min:46.3,max:46.8,axisLabel:{formatter:v=>v.toFixed(1)+'億'}}),
    tooltip:Object.assign({},TIP,{formatter:p=>p.value?`<b>${p.name}</b><br>総資産 <b>${p.value.toFixed(2)}億円</b>`:''}),
    series:[
      {type:'line',data:[+a0.total.toFixed(2),+a1.total.toFixed(2),null],symbol:'circle',symbolSize:11,
       lineStyle:{color:GD,width:2.5},itemStyle:{color:GD,borderColor:'#070C15',borderWidth:2},
       label:{show:true,position:'top',color:TX,fontFamily:MONOF,fontSize:11,fontWeight:700,formatter:p=>p.value?p.value.toFixed(2)+'億':''},
       markPoint:{data:[{coord:[2,46.62],symbol:'circle',symbolSize:11,itemStyle:{color:'transparent',borderColor:MUT,borderWidth:1.5,borderType:'dashed'},label:{show:true,position:'top',color:MUT,fontSize:9.5,formatter:'自動追加'}}]},
       areaStyle:{color:{type:'linear',x:0,y:0,x2:0,y2:1,colorStops:[{offset:0,color:'rgba(255,216,77,.18)'},{offset:1,color:'rgba(255,216,77,0)'}]}}}
    ]
  }));
}

/* ================= SECTOR 09: JP活用実績（効果 → 活動台帳 → 根拠） ================= */
function renderOps(){
  const J=OWNED.junction, T=OWNED.tj, root=$('#opsRoot');
  if(!SIS) SIS=sisLoad();
  const ACTS=J.activities, live=ACTS.filter(a=>a.state==='live').length;

  root.innerHTML=`
  <!-- 効果ファースト・ヒーロー -->
  <div class="card glow s12 reveal" style="border-color:color-mix(in srgb,var(--gd) 30%,transparent)">
    <div class="oneHero">
      <div class="oneBig">
        <div class="cap">OWNED ACTIVITY — 実装済みの活動</div>
        <div class="n" data-cu="${live}">0</div>
        <div class="u">件<span style="color:var(--mut)">　＝ リクエスト完了ページの <b class="hl">2つのバナー</b></span></div>
        <div style="font-size:10.5px;color:var(--mut);margin-top:7px">T-Connect（7/27〜）／ au・UQ（8/4〜）。<br>下の台帳の行をクリック → <b style="color:var(--gd)">何が変わったか</b>を表示。<br>活動が増えるたびにこの数字と行が増える。</div>
      </div>
      <div>
        <div style="font-family:var(--mono);font-size:9.5px;letter-spacing:.22em;color:var(--gd);margin-bottom:8px">EFFECT — この2件が生んだ効果（GA4実測）</div>
        <div class="oneStats">
          <div class="oneStat" style="border-color:color-mix(in srgb,var(--gd) 40%,transparent)"><div class="k">CV寄与</div><div class="v" style="color:var(--gd)"><span data-cu="1">0</span><small> 件</small></div><div class="s">来店予約step1到達（7/30 実測第1号）</div></div>
          <div class="oneStat"><div class="k">1クリックあたり追加滞在</div><div class="v">11<small>分</small>27<small>秒</small></div><div class="s">予約完了後に純増した接触時間</div></div>
          <div class="oneStat"><div class="k">回遊の深さ</div><div class="v">×<span data-cu="2.1" data-dec="1">0</span></div><div class="s">T-Connect滞在 1分34秒 vs 通常45秒</div></div>
          <div class="oneStat"><div class="k">来店行動（店舗検索）</div><div class="v">+<span data-cu="63">0</span><small> %</small></div><div class="s">滞在1分51秒 vs 通常1分08秒</div></div>
        </div>
        <div style="margin-top:11px;font-size:11.3px;color:var(--tx2);line-height:1.8">アピールの型：<b class="hl">「完了ページに2本のバナーを実装し、クリック者の回遊は通常の2.1倍・店舗検索+63%、来店予約1件に到達」</b>。分母（アクセス量）は下の台帳と母数バーに。</div>
      </div>
    </div>
  </div>

  <!-- 活動台帳 -->
  <div class="card s12 reveal">
    <div class="ct"><span class="bar" style="background:var(--gd);box-shadow:0 0 8px rgba(255,216,77,.5)"></span><h3>活動台帳 — 何をして、どれだけ見られ、何を生んだか</h3><span class="sub">行をクリック → 変更内容・数値詳細・次の一手</span></div>
    <div class="twrap"><table class="actTbl">
      <thead><tr><th>ID</th><th>活動</th><th>状態</th><th>アクセスボリューム</th><th>生んだ効果</th><th class="op"></th></tr></thead>
      <tbody>${ACTS.map((a,i)=>`<tr class="actRow" data-act="${i}">
        <td class="num" style="color:var(--mut);font-size:10.5px">${a.id}</td>
        <td style="min-width:220px"><b style="font-size:12.8px">${a.name}</b><div style="font-size:10.3px;color:var(--mut);margin-top:2px">${a.target}</div></td>
        <td><span class="st ${a.state}" style="display:inline-flex;align-items:center;gap:5px;font-family:var(--mono);font-size:9.5px;padding:2.5px 9px;border-radius:999px;${a.state==='live'?'color:var(--gn);background:color-mix(in srgb,var(--gn) 12%,transparent)':'color:var(--am);background:color-mix(in srgb,var(--am) 12%,transparent)'}">${a.state==='live'?'● LIVE':'◪ 外部計測'}</span><div style="font-family:var(--mono);font-size:9.5px;color:var(--mut);margin-top:3px">${a.since}</div></td>
        <td style="font-size:11.3px;line-height:1.75;min-width:200px"><b class="num" style="color:var(--cy)">${a.vol.clicks}</b><div style="color:var(--mut);font-size:10.3px">${a.vol.exposure}</div></td>
        <td style="font-size:11.3px;line-height:1.8;min-width:240px">${a.fx.slice(0,2).map(f=>`<div><span style="color:var(--gd);font-family:var(--mono);font-size:9px">${f[0]}</span>　${f[1].split('—')[0].split('（')[0]}</div>`).join('')}</td>
        <td class="op" style="white-space:nowrap"><span style="font-family:var(--mono);font-size:10px;color:var(--gd)">詳細 ▸</span></td>
      </tr>`).join('')}</tbody></table></div>
    <div style="font-size:10.5px;color:var(--mut);margin-top:8px">露出面（分母）＝試乗予約 完了 <b class="num">2,429件/28日</b>（GA4実測・日平均86.8件）。この面に立つバナーが上の2件。</div>
  </div>

  <!-- 効果の根拠 -->
  <div class="card s7 reveal">
    <div class="ct"><span class="bar"></span><h3>効果の根拠 — クリックした人 vs しなかった人</h3><span class="sub">同一ページ滞在の実測差（GA4・秒）</span></div>
    <div id="opsLift"></div>
  </div>
  <div class="card s5 reveal">
    <div class="ct"><span class="bar"></span><h3>この効果を量産すると</h3><span class="sub">到達率シナリオ（分母=完了 年換算31,663件 実測）</span></div>
    <div class="chart" id="chOpsScenario" style="height:238px"></div>
    <div style="font-size:10.8px;color:var(--tx2);line-height:1.8;margin-top:8px">現状0.87%＝年253クリック・約200万円。<b class="hl">配置と文言の改修のみで 2〜5%＝460万〜1,200万円/年</b>（レポート#007前提）。</div>
  </div>

  <!-- 母数（参考・小さく） -->
  <div class="card s12 reveal" style="padding:13px 20px">
    <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;font-size:11px;color:var(--mut)">
      <span style="font-family:var(--mono);font-size:9px;letter-spacing:.2em">母数の文脈（28日・GA4実測）</span>
      <span>toyota.jp全体 <b class="num" style="color:var(--tx2)">970万</b>セッション</span><span style="color:var(--line2)">▶</span>
      <span>試乗予約 完了 <b class="num" style="color:var(--tx2)">2,429</b>件（露出面）</span><span style="color:var(--line2)">▶</span>
      <span>導線クリック <b class="num" style="color:var(--cy)">7</b></span><span style="color:var(--line2)">▶</span>
      <span>CV寄与 <b class="num" style="color:var(--gd)">1</b>件</span>
      <span style="margin-left:auto;font-size:10px">JPの資産換算は<a href="javascript:void(0)" id="goAssets2" style="color:var(--gd)">オウンド資産</a>へ</span>
    </div>
  </div>

  <!-- 施策リスト（これから活動になるパイプライン） -->
  <div class="card s12 reveal" id="sisCard">
    <div class="ct"><span class="bar"></span><h3>提案・進行中 施策リスト — 次の「活動」候補</h3><span class="sub">このブラウザに保存（localStorage）— 自由に追加・編集・削除OK</span>
      <div class="r" style="display:flex;gap:8px">
        <button class="btnG" id="sisAdd">＋ 施策を追加</button>
        <button class="btnQ" id="sisReset" title="初期リスト（8/18版・41件）に戻す">初期データに戻す</button>
      </div>
    </div>
    <div class="sisCtl" id="sisCtl"></div>
    <div class="twrap"><table class="sisTbl" id="sisTbl"></table></div>
    <div class="localnote" style="margin-top:9px">✎ 合意→実装に進んだ施策は、上の活動台帳に実測付きで昇格していく建て付け。</div>
  </div>

  <div class="card s12 reveal"><div class="insight" style="font-size:10.5px">
    出典：効果・クリック＝<b>導線価値レポート#007</b>（GA4データ探索 7/7〜8/5 実測）／ 露出面・母数＝GA4実測（Toyota.jp・7/22〜8/18・Windsor.ai経由 2026-08-19取得）／ <a href="${ACTS[0].url}" target="_blank" rel="noopener" style="color:var(--cy)">T-Connectバナー実URL（padid付き）</a> ／ 用品UGは遷移先が別サイトのため計測連携待ち。
  </div></div>`;

  drawOpsLift(J);
  drawOpsScenario(J);
  drawSisaku();
  $('#goAssets2').onclick=()=>showView('assets');
  $$('#opsRoot .actRow').forEach(r=>r.onclick=()=>actOpen(+r.dataset.act));
  runCountUps(root);
}

/* 活動詳細モーダル：何が変わったか */
function actOpen(i){
  const a=OWNED.junction.activities[i], J=OWNED.junction;
  const tl=a.timeline?`
    <div class="lrow"><div class="lk">実測ログ</div><div class="lf"><div style="font-size:11px;color:var(--mut);margin-bottom:6px">成果第1号（7/30深夜）の全行動 — 4分43秒・20ページ・37イベント</div>
    <div class="tl" style="margin-left:4px">${J.timeline.map((r,x)=>`<div class="tlr ${x===5?'gold':''}"><div class="tt">${r.t}</div><div class="te" style="font-size:11.8px">${r.e}</div></div>`).join('')}</div></div></div>`:'';
  logicOpen(`<h3>${a.id}　${a.name}<span class="v" style="font-size:13px;color:${a.state==='live'?'var(--gn)':'var(--am)'}">${a.state==='live'?'● LIVE '+a.since+'〜':'◪ 外部計測'}</span></h3>
    <div class="lsub">${a.target}</div>
    <div class="lrow gold"><div class="lk">何をしたか</div><div class="lf">${a.what}<small>Before: ${a.before}<br>After: ${a.after}</small></div></div>
    <div class="lrow"><div class="lk">ボリューム</div><div class="lf"><b>${a.vol.clicks}</b><small>露出面: ${a.vol.exposure}／${a.vol.note}</small></div></div>
    <div class="lrow"><div class="lk">生んだ効果</div><div class="lf">${a.fx.map(f=>`<div style="margin-bottom:5px"><span style="font-family:var(--mono);font-size:9.5px;color:var(--gd);letter-spacing:.1em">${f[0]}</span><br>${f[1]}</div>`).join('')}</div></div>
    ${tl}
    <div class="lrow"><div class="lk">次の一手</div><div class="lf">${a.next}</div></div>
    <div class="lsrc">出典：レポート#007（GA4実測 7/7〜8/5）／ 露出面＝GA4実測 7/22〜8/18 ／ <a href="${a.url}" target="_blank" rel="noopener" style="color:var(--cy)">実ページを開く ↗</a></div>`);
}

function drawOpsLift(J){
  const box=$('#opsLift');
  const mx=Math.max(...J.lift.map(r=>Math.max(r.a,r.b)));
  box.innerHTML=J.lift.map(r=>{
    const unit=r.unit||'秒';
    return `<div class="liftRow">
      <div class="t"><b>${r.p}</b><span class="pill ${r.hot?'up':'down'}">${r.d}</span></div>
      <div class="bars">
        <div class="bwrap"><span>クリック者</span><div><div class="bar2" style="width:${r.a/mx*100}%;background:linear-gradient(90deg,${r.hot?'var(--te)':'#5B6B84'},${r.hot?'var(--cy)':'#3d4c66'})"></div></div><span class="val">${r.a}${unit}</span></div>
        <div class="bwrap"><span>非クリック者</span><div><div class="bar2" style="width:${r.b/mx*100}%;background:#31415C"></div></div><span class="val">${r.b}${unit}</span></div>
      </div></div>`;
  }).join('');
}

function drawOpsScenario(J){
  const c=E('chOpsScenario'); if(!c)return;
  const ks=J.scenarios.map(s=>`${s.k}\n${s.r}%`);
  c.setOption(baseOpt({
    grid:{left:52,right:56,top:34,bottom:34},
    legend:{top:0,textStyle:{color:TX2,fontSize:10.5},itemWidth:14,data:['年間クリック（件）','年間価値（万円）']},
    xAxis:axX({data:ks,axisLabel:{color:MUT,fontSize:10,fontFamily:MONOF,interval:0,lineHeight:15}}),
    yAxis:[axY({name:'件',nameTextStyle:{color:MUT,fontSize:9}}),
           axY({name:'万円',position:'right',splitLine:{show:false},nameTextStyle:{color:MUT,fontSize:9}})],
    series:[
      {name:'年間クリック（件）',type:'bar',data:J.scenarios.map((s,i)=>({value:s.n,itemStyle:{color:i===0?'#31415C':{type:'linear',x:0,y:0,x2:0,y2:1,colorStops:[{offset:0,color:'#FFE98A'},{offset:1,color:'#C98500'}]},borderRadius:[5,5,0,0]}})),
       barWidth:30,label:{show:true,position:'top',color:TX2,fontFamily:MONOF,fontSize:10,formatter:p=>CM(p.value)}},
      {name:'年間価値（万円）',type:'line',yAxisIndex:1,data:J.scenarios.map(s=>s.v),symbol:'circle',symbolSize:8,
       lineStyle:{color:TE,width:2.5},itemStyle:{color:TE},
       label:{show:true,position:'right',color:TE,fontFamily:MONOF,fontSize:10,formatter:p=>p.value+'万'}}
    ]
  }));
}

/* ---- 施策リスト（localStorage CRUD） ---- */
function sisCounts(){ const c={}; SIS.forEach(s=>c[s.st]=(c[s.st]||0)+1); return c; }
function drawSisaku(){
  const ctl=$('#sisCtl'), tbl=$('#sisTbl'); if(!ctl)return;
  const counts=sisCounts();
  const active=SIS.filter(s=>!['見送り','保留'].includes(s.st)).length;
  ctl.innerHTML=[`<span class="chip ${sisFilter==='all'?'on':''}" data-f="all">すべて <b>${SIS.length}</b></span>`,
    `<span class="chip ${sisFilter==='__act'?'on':''}" data-f="__act">推進中 <b>${active}</b></span>`,
    ...SIS_ST.filter(st=>counts[st]).map(st=>`<span class="chip ${sisFilter===st?'on':''}" data-f="${st}"><span class="sw" style="background:${STATUS_COLORS[st]}"></span>${st} <b>${counts[st]}</b></span>`)].join('');
  $$('#sisCtl .chip').forEach(ch=>ch.onclick=()=>{sisFilter=ch.dataset.f;drawSisaku()});

  let list=SIS.map((s,ix)=>({...s,_ix:ix}));
  if(sisFilter==='__act') list=list.filter(s=>!['見送り','保留'].includes(s.st));
  else if(sisFilter!=='all') list=list.filter(s=>s.st===sisFilter);

  tbl.innerHTML=`<thead><tr><th>ID</th><th>商材</th><th>チャネル</th><th>タイプ</th><th class="nm">施策名</th><th>ステータス</th><th>区分</th><th>担当</th><th class="op"></th></tr></thead>
  <tbody>${list.map(s=>`<tr>
    <td class="num" style="font-size:10.5px;color:var(--mut)">${s.id}</td>
    <td style="white-space:nowrap;font-size:11.5px">${s.prod}</td>
    <td style="font-size:11px;color:var(--tx2)">${s.ch}</td>
    <td style="font-size:11px;color:var(--tx2)">${s.type}</td>
    <td class="nm" style="font-size:11.8px">${s.name}${s.kbn?`<span class="ptag" style="color:var(--gd);background:color-mix(in srgb,var(--gd) 12%,transparent)">${s.kbn}</span>`:''}</td>
    <td>${stBadge(s.st)}</td>
    <td style="font-size:10.5px;color:var(--mut);white-space:nowrap">${s.tgt||''}</td>
    <td style="font-size:11px;color:var(--tx2);white-space:nowrap">${s.own||'—'}</td>
    <td class="op"><span class="iconb" data-e="${s._ix}" title="編集">✎</span> <span class="iconb del" data-x="${s._ix}" title="削除">✕</span></td>
  </tr>`).join('')||'<tr><td colspan="9" style="color:var(--mut);padding:18px">該当なし</td></tr>'}</tbody>`;

  $$('#sisTbl [data-e]').forEach(b=>b.onclick=()=>sisEdit(+b.dataset.e));
  $$('#sisTbl [data-x]').forEach(b=>b.onclick=()=>{
    const s=SIS[+b.dataset.x];
    if(confirm(`施策「${s.name.slice(0,30)}…」を削除しますか？`)){SIS.splice(+b.dataset.x,1);sisSave(SIS);drawSisaku();toast('<b>施策を削除しました</b>（localStorageに保存済み）','warn',3800)}
  });
  $('#sisAdd').onclick=()=>sisEdit(-1);
  $('#sisReset').onclick=()=>{
    if(confirm('編集内容を破棄して初期リスト（41件）に戻しますか？')){SIS=SISAKU_INIT.map(s=>({...s}));sisSave(SIS);drawSisaku();toast('<b>初期データに戻しました</b>','',3200)}
  };
}
function sisEdit(ix){
  const isNew=ix<0;
  const s=isNew?{id:'',prod:'',ch:'',type:'',name:'',st:'初動報告',kbn:'',tgt:'宣伝部TQP',own:'中井'}:SIS[ix];
  const box=$('#sisakuModalBox');
  box.innerHTML=`<h3>${isNew?'施策を追加':'施策を編集'} <span style="font-family:var(--mono);font-size:10px;color:var(--mut)">${isNew?'':s.id}</span></h3>
  <div class="sfrm">
    <label>施策ID<input id="sf_id" value="${s.id||''}" placeholder="I-08-99"></label>
    <label>商材<input id="sf_prod" value="${s.prod||''}" placeholder="T-connect"></label>
    <label>配信チャネル<input id="sf_ch" value="${s.ch||''}" placeholder="toyota.jp / SNS / メルマガ…"></label>
    <label>施策タイプ<input id="sf_type" value="${s.type||''}" placeholder="サイト改修 / LP制作…"></label>
    <label class="w">施策名<textarea id="sf_name">${s.name||''}</textarea></label>
    <label>ステータス<select id="sf_st">${SIS_ST.map(x=>`<option ${x===s.st?'selected':''}>${x}</option>`).join('')}</select></label>
    <label>区分（本命等）<input id="sf_kbn" value="${s.kbn||''}"></label>
    <label>対象区分<input id="sf_tgt" value="${s.tgt||''}" placeholder="宣伝部TQP"></label>
    <label>担当<input id="sf_own" value="${s.own||''}"></label>
    <label style="justify-content:flex-end;flex-direction:row;align-items:flex-end;gap:9px">
      <button class="btnQ" id="sf_cancel">キャンセル</button>
      <button class="btnG" id="sf_save">保存</button></label>
  </div>`;
  $('#sisakuModal').classList.add('on');
  $('#sf_cancel').onclick=()=>$('#sisakuModal').classList.remove('on');
  $('#sf_save').onclick=()=>{
    const v={id:$('#sf_id').value.trim()||('I-ADD-'+String(SIS.length+1).padStart(2,'0')),
      prod:$('#sf_prod').value.trim(),ch:$('#sf_ch').value.trim(),type:$('#sf_type').value.trim(),
      name:$('#sf_name').value.trim(),st:$('#sf_st').value,kbn:$('#sf_kbn').value.trim(),tgt:$('#sf_tgt').value.trim(),own:$('#sf_own').value.trim()};
    if(!v.name){$('#sf_name').style.borderColor='var(--rd)';return}
    if(isNew)SIS.unshift(v); else SIS[ix]=v;
    sisSave(SIS);
    $('#sisakuModal').classList.remove('on');
    drawSisaku();
    toast(`<b>${isNew?'施策を追加':'変更を保存'}しました</b>（このブラウザに保存）`,'',3600);
  };
}

/* ================= SECTOR 10: SNSパフォーマンス（バズ → 媒体別 → ソート表 → 四象限） ================= */
const CAT_COLORS={'キャラ×季節':'#FFD84D','実用ホラー':'#D55181','道場シリーズ':'#38BDF8','活動報告':'#199E70','企業ニュース':'#C98500','感動CM（広告併用）':'#9085E9'};
const PFC={X:'#8A96A8',IG:'#D55181',YT:'#E66767',FB:'#3987E5'};
ST.snsSort={key:'xm',dir:-1};

function postModal(p){
  const m=[ p.exp!=null?['露出',fmtJP(p.exp)+(p.sns==='YT'?' 回視聴':' imp')]:null,
    p.likes!=null?['いいね',CM(p.likes)]:null,
    p.rts!=null?[p.sns==='X'?'リポスト':'シェア・RP',CM(p.rts)]:null,
    p.com!=null?['コメント・返信',CM(p.com)]:null,
    p.xm!=null?['露出倍率','×'+(p.xm>=10?Math.round(p.xm):p.xm.toFixed(2))+'（媒体通常帯比）']:null,
    p.rm!=null?['反応倍率','×'+(p.rm>=10?Math.round(p.rm):p.rm.toFixed(2))]:null ].filter(Boolean);
  const meta=`${p.d} 投稿 ・ ${p.ch} ・ カテゴリ: ${p.cat}　｜　`+m.map(x=>`${x[0]} ${x[1]}`).join(' ・ ');
  if(p.cap) capOpen(p.cap, `${p.sns}：${p.title}`, meta, p.url);
  else logicOpen(`<h3 style="font-size:15px;line-height:1.6">${p.sns}：${p.title}</h3><div class="lsub">${p.d} 投稿 ・ ${p.ch} ・ カテゴリ: ${p.cat}</div>
    ${m.map(x=>`<div class="lrow"><div class="lk">${x[0]}</div><div class="lf"><b class="num" style="font-size:15px">${x[1]}</b></div></div>`).join('')}
    <div class="lsrc">実測 2026-08-19 ／ <a href="${p.url}" target="_blank" rel="noopener" style="color:var(--cy)">実ページを開く ↗</a></div>`);
}

function renderSNS(){
  const S=OWNED.sns, root=$('#snsRoot');
  const buzz=S.posts2.find(p=>p.buzz&&p.sns==='IG'), buzzYT=S.posts2.find(p=>p.buzz&&p.sns==='YT');

  root.innerHTML=`
  <!-- バズ・ヒーロー -->
  <div class="card glow s12 reveal" style="border-color:color-mix(in srgb,var(--gd) 34%,transparent)">
    <div style="display:grid;grid-template-columns:minmax(280px,380px) 1fr;gap:20px;align-items:center">
      <a href="javascript:void(0)" id="buzzCap" style="display:block;border-radius:12px;overflow:hidden;border:1px solid color-mix(in srgb,var(--gd) 40%,transparent)">
        <img src="${buzz.cap}" alt="精霊馬" style="width:100%;display:block"></a>
      <div>
        <div style="font-family:var(--mono);font-size:9.5px;letter-spacing:.24em;color:var(--gd);margin-bottom:6px">BUZZ OF THE WEEK — 通常帯の80倍</div>
        <div style="font-size:16.5px;font-weight:800;line-height:1.6">お盆の帰省ラッシュ。もしご先祖様も渋滞に巻き込まれていたら？<span style="font-size:11px;color:var(--mut);font-weight:400">（精霊馬・CV:ファイルーズあい・8/13）</span></div>
        <div style="display:flex;gap:22px;flex-wrap:wrap;margin:13px 0 10px">
          <div><div style="font-size:10px;color:var(--mut)">いいね（IG）</div><div class="num" style="font-size:27px;font-weight:800;color:var(--gd)"><span data-cu="8.9" data-dec="1">0</span>万</div><div style="font-size:9.5px;color:var(--gn)">通常帯1,100の <b>81倍</b></div></div>
          <div><div style="font-size:10px;color:var(--mut)">シェア（拡散の源泉）</div><div class="num" style="font-size:27px;font-weight:800"><span data-cu="4802">0</span></div><div style="font-size:9.5px;color:var(--mut)">コメント463</div></div>
          <div><div style="font-size:10px;color:var(--mut)">YouTube版（ドライバーズch）</div><div class="num" style="font-size:27px;font-weight:800"><span data-cu="30">0</span>万<small style="font-size:11px;color:var(--tx2)">回</small></div><div style="font-size:9.5px;color:var(--gn)">ch通常帯500の <b>600倍</b></div></div>
        </div>
        <div style="font-size:11.5px;color:var(--tx2);line-height:1.85">勝ち筋の分解：<b class="hl">キャラ（精霊馬）× 季節文脈（お盆渋滞）× 声優起用</b>の三段掛け。シェア4,802がIGアルゴの最重要シグナルを直撃し、海外からも「日本のお盆らしさ」への共感コメントが発生。<b class="hlc">IG・YT・Xの3面同時展開</b>で媒体別の伸びが比較可能になった。</div>
      </div>
    </div>
  </div>

  <!-- 媒体別ボード -->
  <div class="card s12 reveal">
    <div class="ct"><span class="bar"></span><h3>媒体別ボード — 最新投稿の実測とコメント</h3><span class="sub">クロール ${OWNED.crawledAt}・カードクリックで実画面</span></div>
    <div class="grid" style="gap:12px">
      ${S.media.map(md=>`
      <div class="s6" style="min-width:0"><div class="mediaBox clickable" data-mcap="${md.cap}" data-mt="${md.name}" data-mu="${md.url}" style="--ac:${md.col}">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px">
          <span style="font-family:var(--mono);font-weight:800;font-size:12px;color:${md.col}">${md.id}　<span style="color:var(--tx);font-family:inherit;font-weight:700">${md.name}</span></span>
          <span class="num" style="font-size:13px;color:var(--tx)">${md.f}<span style="font-size:9px;color:var(--mut)"> ${md.id==='YT'?'登録':'フォロワー'}・${md.asof}</span></span>
        </div>
        <div style="background:var(--bg2);border:1px solid var(--line);border-radius:10px;padding:9px 12px;margin-bottom:9px">
          <div style="font-size:9.5px;color:var(--mut);font-family:var(--mono);letter-spacing:.12em;margin-bottom:3px">LATEST POST ・ ${md.latest.d}</div>
          <div style="font-size:12px;font-weight:700;line-height:1.55">${md.latest.t}</div>
          <div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:6px;font-family:var(--mono);font-size:10.5px;color:var(--tx2)">
            <span>${md.latest.exp}</span>${md.latest.likes!=null?`<span>♥ ${CM(md.latest.likes)}</span>`:''}<span>${md.latest.rts}</span><span>${md.latest.com}</span>
          </div>
        </div>
        <div style="font-size:11px;color:var(--tx2);line-height:1.8"><span style="font-family:var(--mono);font-size:9px;color:${md.col};letter-spacing:.14em">ANALYSIS</span><br>${md.note}</div>
      </div></div>`).join('')}
    </div>
  </div>

  <!-- ソート可能な投稿テーブル -->
  <div class="card s12 reveal">
    <div class="ct"><span class="bar"></span><h3>投稿パフォーマンス 一覧</h3><span class="sub">列見出しクリックでソート・行クリックで実画面／詳細 — 実測 8/19</span>
      <div class="r" id="snsCatFilter"></div></div>
    <div class="twrap"><table id="snsTable"></table></div>
    <div style="font-size:10.3px;color:var(--mut);margin-top:7px">露出＝imp（X）／回視聴（YT）。IG・FBはリーチ非公開のため <b>倍率＝いいね基準の媒体内通常帯比</b>（代理指標）。倍率の基準値：X imp4.2万・いいね等170／IG 1,100／FB 450／YTはチャンネル別（SR 6千・TM 1.8万・DR 500）。</div>
  </div>

  <!-- 四象限 -->
  <div class="card s8 reveal">
    <div class="ct"><span class="bar"></span><h3>投稿カテゴリ × 四象限 — どの型が跳ねるか</h3><span class="sub">X軸=露出倍率（媒体通常帯比・対数）／ Y軸=反応倍率（同）・バブル=リアクション実数</span></div>
    <div class="chart" id="chSnsQuad" style="height:340px"></div>
    <div style="font-size:10.3px;color:var(--mut);margin-top:4px">リアクション実測が取れる8投稿をプロット（YTは反応数非公開のため対象外：精霊馬YT版は露出600倍・福祉篇は1,175倍/広告併用）。1.0=その媒体の通常投稿。</div>
  </div>
  <div class="card s4 reveal">
    <div class="ct"><span class="bar"></span><h3>カテゴリ別の成績</h3><span class="sub">倍率平均（実測）</span></div>
    <div id="catTable"></div>
    <div class="insight" style="margin-top:11px;font-size:10.8px"><span class="it">READ</span>右上に飛び抜ける<b>キャラ×季節</b>が拡散の主砲。<b>活動報告</b>は露出0.9倍でも反応1.2倍＝<b class="hl">コア層に濃く刺さる</b>型で、体験レポート化すれば露出も伸ばせる。<b>道場・実用ホラー</b>は通常帯の安定運転＝会話率で効くシリーズ資産。</div>
  </div>

  <!-- フォロワー動向 + パワー -->
  <div class="card s5 reveal">
    <div class="ct"><span class="bar"></span><h3>3週間のフォロワー動向</h3><span class="sub">7/29 実測 → 8/19 実測</span></div>
    <div class="chart" id="chSnsDelta" style="height:250px"></div>
  </div>
  <div class="card s7 reveal">
    <div class="ct"><span class="bar"></span><h3>アカウントパワー 100点採点式 — 配点マップ</h3><span class="sub">管理画面データ受領後にスコア化</span></div>
    <div class="chart" id="chSnsPower" style="height:250px"></div>
  </div>

  <div class="card s12 reveal"><div class="insight" style="font-size:10.5px">
    出典：全数値＝各公式アカウント実測クロール（<a href="https://x.com/TOYOTA_PR" target="_blank" rel="noopener" style="color:var(--cy)">X</a>・<a href="https://www.instagram.com/toyota_jp/" target="_blank" rel="noopener" style="color:var(--cy)">Instagram</a>・<a href="https://www.facebook.com/ToyotaMotorCorporation" target="_blank" rel="noopener" style="color:var(--cy)">Facebook</a>・<a href="https://www.youtube.com/@toyotajpchannel" target="_blank" rel="noopener" style="color:var(--cy)">YouTube</a>）2026-08-19 JST。TikTokはアクセス制限のため7/29公開値（80.4万）。金額換算は<a href="javascript:void(0)" id="goAssets3" style="color:var(--gd)">オウンド資産</a>へ集約。リール保持率・保存数・YT高評価などの非公開指標は管理画面データ受領後に追加。
  </div></div>`;

  drawSnsTable();
  drawSnsQuad(S);
  drawCatTable(S);
  drawSnsPower(S);
  drawSnsDelta(S);
  $('#buzzCap').onclick=()=>capOpen(buzz.cap,'IG 精霊馬の帰省ラッシュ','8/13投稿・いいね8.9万（通常帯81倍）・シェア4,802・コメント463',buzz.url);
  $('#goAssets3').onclick=()=>showView('assets');
  $$('#snsRoot .mediaBox').forEach(el=>el.onclick=()=>capOpen(el.dataset.mcap,el.dataset.mt,'取得 '+OWNED.crawledAt,el.dataset.mu));
  runCountUps(root);
}

/* ---- ソート可能テーブル ---- */
ST.snsCat='all';
function drawSnsTable(){
  const S=OWNED.sns;
  // カテゴリフィルタチップ
  const cats=['all',...new Set(S.posts2.map(p=>p.cat))];
  $('#snsCatFilter').innerHTML=cats.map(c=>`<span class="chip ${ST.snsCat===c?'on':''}" data-c="${c}">${c==='all'?'すべて':`<span class="sw" style="background:${CAT_COLORS[c]||'#8A96A8'}"></span>${c}`}</span>`).join('');
  $$('#snsCatFilter .chip').forEach(ch=>ch.onclick=()=>{ST.snsCat=ch.dataset.c;drawSnsTable()});

  let rows=[...S.posts2];
  if(ST.snsCat!=='all') rows=rows.filter(p=>p.cat===ST.snsCat);
  const {key,dir}=ST.snsSort;
  rows.sort((a,b)=>((b[key]??-1)-(a[key]??-1))*(dir<0?1:-1));

  const cols=[['sns','媒体',0],['title','投稿',0],['d','日付',0],['exp','露出(imp/再生)',1],['likes','いいね',1],['rts','RP・シェア',1],['com','コメント',1],['xm','露出倍率',1],['rm','反応倍率',1]];
  $('#snsTable').innerHTML=`<thead><tr>${cols.map(([k,l,n])=>`<th class="${n?'sortable num':''}" data-k="${n?k:''}">${l}${ST.snsSort.key===k?`<span class="arrow">${ST.snsSort.dir<0?'▼':'▲'}</span>`:''}</th>`).join('')}</tr></thead>
  <tbody>${rows.map(p=>`<tr class="snsRow" data-i="${OWNED.sns.posts2.indexOf(p)}">
    <td><span class="pf" style="display:inline-block;font-family:var(--mono);font-size:9.5px;font-weight:700;padding:3px 8px;border-radius:7px;color:${PFC[p.sns]};background:color-mix(in srgb,${PFC[p.sns]} 13%,transparent)">${p.sns}</span></td>
    <td style="min-width:250px;font-size:12px;line-height:1.6">${p.buzz?'<span class="ptag" style="color:var(--gd);background:color-mix(in srgb,var(--gd) 14%,transparent);margin:0 6px 0 0">バズ</span>':''}${p.ad?'<span class="ptag" style="color:#9085E9;background:color-mix(in srgb,#9085E9 14%,transparent);margin:0 6px 0 0">広告併用</span>':''}${p.title}<div style="font-size:9.5px;color:var(--mut)"><span style="color:${CAT_COLORS[p.cat]}">■</span> ${p.cat} ・ ${p.ch}${p.cap?' ・ <span style="color:var(--gd)">実画面 ▸</span>':''}</div></td>
    <td class="num" style="font-size:10.5px;color:var(--mut)">${p.d}</td>
    <td class="num">${p.exp!=null?fmtJP(p.exp):'<span style="color:var(--mut)">非公開</span>'}</td>
    <td class="num">${p.likes!=null?CM(p.likes):'—'}</td>
    <td class="num">${p.rts!=null?CM(p.rts):'—'}</td>
    <td class="num">${p.com!=null?CM(p.com):'—'}</td>
    <td class="num" style="color:${p.xm>=2?'var(--gd)':p.xm>=1?'var(--gn)':'var(--tx2)'};font-weight:700">×${p.xm>=10?Math.round(p.xm):p.xm.toFixed(2)}</td>
    <td class="num" style="color:${p.rm==null?'var(--mut)':p.rm>=2?'var(--gd)':p.rm>=1?'var(--gn)':'var(--tx2)'};font-weight:700">${p.rm!=null?'×'+(p.rm>=10?Math.round(p.rm):p.rm.toFixed(2)):'—'}</td>
  </tr>`).join('')}</tbody>`;
  $$('#snsTable th.sortable').forEach(th=>th.onclick=()=>{
    const k=th.dataset.k; if(!k)return;
    ST.snsSort = ST.snsSort.key===k ? {key:k,dir:-ST.snsSort.dir} : {key:k,dir:-1};
    drawSnsTable();
  });
  $$('#snsTable .snsRow').forEach(tr=>tr.onclick=()=>postModal(OWNED.sns.posts2[+tr.dataset.i]));
}

/* ---- 四象限 ---- */
function drawSnsQuad(S){
  const c=E('chSnsQuad'); if(!c)return;
  const pts=S.posts2.filter(p=>p.rm!=null);
  const cats=[...new Set(pts.map(p=>p.cat))];
  c.setOption(baseOpt({
    grid:{left:56,right:26,top:34,bottom:44},
    legend:{top:0,textStyle:{color:TX2,fontSize:10.5},data:cats},
    xAxis:{type:'log',name:'露出倍率（対数）',nameLocation:'middle',nameGap:28,nameTextStyle:{color:MUT,fontSize:10},
      min:.5,max:200,axisLine:{lineStyle:{color:LINE2}},splitLine:{lineStyle:{color:LINE,type:[3,4]}},
      axisLabel:{color:MUT,fontSize:10,fontFamily:MONOF,formatter:v=>'×'+v}},
    yAxis:{type:'log',name:'反応倍率（対数）',nameGap:40,nameLocation:'middle',nameTextStyle:{color:MUT,fontSize:10},
      min:.5,max:200,axisLine:{show:false},splitLine:{lineStyle:{color:LINE,type:[3,4]}},
      axisLabel:{color:MUT,fontSize:10,fontFamily:MONOF,formatter:v=>'×'+v}},
    tooltip:Object.assign({},TIP,{formatter:p=>{
      const d=p.data.p;
      return `<b>${d.sns}：${d.title.slice(0,30)}…</b><br>露出 ×${d.xm>=10?Math.round(d.xm):d.xm.toFixed(2)} ・ 反応 ×${d.rm.toFixed(2)}<br><span style="color:#A5B6CE;font-size:10.5px">リアクション計 ${CM(d.rea)} ・ ${d.cat}</span>`}}),
    series:cats.map(cat=>({name:cat,type:'scatter',
      data:pts.filter(p=>p.cat===cat).map(p=>({value:[p.xm,p.rm],p,
        symbolSize:Math.max(13,Math.sqrt(p.rea)/3.2),
        label:p.xm>10?{show:true,position:'left',color:'#FFE98A',fontSize:10,fontWeight:700,formatter:'精霊馬 ×81'}:{show:false},
        itemStyle:{color:CAT_COLORS[cat],opacity:.88,borderColor:'#0A1120',borderWidth:1.5}}))})),
    graphic:[
      {type:'text',right:30,top:40,style:{text:'拡散 × 高反応（バズ）',fill:'#FFD84D',fontSize:10,fontFamily:FONT}},
      {type:'text',left:64,top:40,style:{text:'コアに刺さる（濃い反応）',fill:'#199E70',fontSize:10,fontFamily:FONT}},
      {type:'text',left:64,bottom:52,style:{text:'通常運転',fill:'#647694',fontSize:10,fontFamily:FONT}},
      {type:'text',right:30,bottom:52,style:{text:'見られたが反応薄',fill:'#647694',fontSize:10,fontFamily:FONT}}
    ]
  }));
  // 基準線 x=1, y=1
  c.setOption({series:[{markLine:{silent:true,symbol:'none',lineStyle:{color:'#3d4c66',type:'dashed'},
    data:[{xAxis:1},{yAxis:1}],label:{show:false}}}]});
}

function drawCatTable(S){
  const pts=S.posts2.filter(p=>p.rm!=null);
  const byCat={};
  pts.forEach(p=>{(byCat[p.cat]=byCat[p.cat]||[]).push(p)});
  const rows=Object.entries(byCat).map(([cat,ps])=>({cat,
    n:ps.length,
    xm:ps.reduce((a,p)=>a+p.xm,0)/ps.length,
    rm:ps.reduce((a,p)=>a+p.rm,0)/ps.length}))
    .sort((a,b)=>b.xm-a.xm);
  // YT露出のみ組も追記
  $('#catTable').innerHTML=rows.map(r=>`
    <div style="display:grid;grid-template-columns:1fr auto auto;gap:8px;align-items:center;padding:8px 4px;border-bottom:1px dashed var(--line)">
      <div style="font-size:11.8px"><span style="color:${CAT_COLORS[r.cat]}">■</span> <b>${r.cat}</b> <span style="color:var(--mut);font-size:9.5px">${r.n}本</span></div>
      <div class="num" style="font-size:11px;color:${r.xm>=2?'var(--gd)':'var(--tx2)'}">露出 ×${r.xm>=10?Math.round(r.xm):r.xm.toFixed(2)}</div>
      <div class="num" style="font-size:11px;color:${r.rm>=1.1?'var(--gn)':'var(--tx2)'}">反応 ×${r.rm>=10?Math.round(r.rm):r.rm.toFixed(2)}</div>
    </div>`).join('')+`
    <div style="display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;padding:8px 4px;border-bottom:1px dashed var(--line)">
      <div style="font-size:11.8px"><span style="color:${CAT_COLORS['感動CM（広告併用）']}">■</span> <b>感動CM</b> <span style="color:var(--mut);font-size:9.5px">1本・広告併用</span></div>
      <div class="num" style="font-size:11px;color:var(--tx2)">露出 ×1175</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;padding:8px 4px">
      <div style="font-size:11.8px"><span style="color:${CAT_COLORS['企業ニュース']}">■</span> <b>企業ニュース</b> <span style="color:var(--mut);font-size:9.5px">1本・YT</span></div>
      <div class="num" style="font-size:11px;color:var(--tx2)">露出 ×1.11</div>
    </div>`;
}

function drawSnsPower(S){
  const c=E('chSnsPower'); if(!c)return;
  const ms=[...S.power].reverse();
  const maxBlocks=Math.max(...ms.map(m=>m.blocks.length));
  const series=[];
  for(let bi=0;bi<maxBlocks;bi++){
    series.push({type:'bar',stack:'p',barWidth:15,
      data:ms.map(m=>{const b=m.blocks[bi];return b?{value:b[1],_n:b[0],_s:b[2],itemStyle:{color:m.col,opacity:.34+ .66*(1-bi/maxBlocks),borderColor:'#0A1120',borderWidth:1.2}}:0}),
      label:{show:true,position:'inside',fontSize:8.6,fontFamily:MONOF,color:'#EAF2FC',
        formatter:p=>p.data&&p.data.value>=15?`${p.data._n} ${p.data.value}`:(p.data&&p.data.value?p.data.value:'')}
    });
  }
  c.setOption(baseOpt({
    grid:{left:150,right:36,top:8,bottom:26},
    xAxis:axY({max:100,axisLabel:{formatter:v=>v+'点'}}),
    yAxis:axX({data:ms.map(m=>m.m),axisLabel:{color:TX2,fontSize:10.5,fontFamily:FONT,lineHeight:14,formatter:v=>v.replace('（','\n（')}}),
    tooltip:Object.assign({},TIP,{formatter:p=>p.data&&p.data._n?`<b>${p.name}</b><br>${p.data._n}：<b>${p.data.value}点</b><br><span style="color:#A5B6CE;font-size:10.5px">基準 ${p.data._s}</span>`:''}),
    series
  }));
}

function drawSnsDelta(S){
  const c=E('chSnsDelta'); if(!c)return;
  const rows=[
    {n:'トヨタイムズ',a:867000,b:905000,col:'#E66767'},
    {n:'Instagram',a:849000,b:851000,col:'#D55181'},
    {n:'YT ドライバーズ',a:82500,b:83000,col:'#E66767'},
    {n:'X',a:647000,b:647000,col:'#8A96A8'},
    {n:'YT ショールーム',a:291000,b:291000,col:'#E66767'},
    {n:'Facebook',a:560000,b:560000,col:'#3987E5'},
    {n:'TikTok',a:804000,b:804000,col:'#00E5C7'}
  ];
  c.setOption(baseOpt({
    grid:{left:104,right:96,top:8,bottom:26},
    xAxis:axY({axisLabel:{formatter:v=>fmtF(v)}}),
    yAxis:axX({data:rows.map(r=>r.n).reverse(),axisLabel:{color:TX2,fontSize:10.5,fontFamily:FONT}}),
    tooltip:Object.assign({},TIP,{formatter:p=>{
      const r=rows.find(x=>x.n===p.name), d=r.b-r.a;
      return `<b>${p.name}</b><br>7/29: ${fmtF(r.a)} → 8/19: <b>${fmtF(r.b)}</b><br>Δ <b style="color:${d>0?'#34D399':'#A5B6CE'}">${d>0?'+':''}${fmtF(d)||'±0'}</b>${r.n==='TikTok'?'<br><span style="font-size:10px;color:#A5B6CE">8/19取得不可のため7/29値を継続表示</span>':''}`}}),
    series:[
      {type:'bar',barWidth:12,data:rows.map(r=>r.b).reverse(),
       itemStyle:{color:p=>rows.slice().reverse()[p.dataIndex].col,opacity:.9,borderRadius:[0,4,4,0]},
       label:{show:true,position:'right',fontFamily:MONOF,fontSize:10,color:TX2,
         formatter:p=>{const r=rows.slice().reverse()[p.dataIndex];const d=r.b-r.a;
           return fmtF(r.b)+(d>0?`  ▲+${fmtF(d)}`:'')}}}
    ]
  }));
}
