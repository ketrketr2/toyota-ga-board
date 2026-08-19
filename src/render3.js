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

/* ================= SECTOR 09: JP活用実績（活動 → ボリューム → 質 → 効果） ================= */
function renderOps(){
  const J=OWNED.junction, T=OWNED.tj, root=$('#opsRoot');
  if(!SIS) SIS=sisLoad();
  const doneY=Math.round((T.tdN+T.tdI)/28*365);   // 完了ページ到達 年換算（実測）

  root.innerHTML=`
  <!-- STEP 0: 何が生まれたか -->
  <div class="card glow s12 reveal" style="border-color:color-mix(in srgb,var(--gd) 26%,transparent)">
    <div class="ct"><span class="stepLbl" style="background:var(--gd)">ACTIVITY ─ 生まれた活用</span><span class="sub">オウンドチームの提案で リクエスト完了ページに3導線を実装</span>
      <div class="r"><span style="font-size:10px;color:var(--mut)">計測: GA4実測（レポート#007 7/7〜8/5 ＋ 全体28日 7/22〜8/18）</span></div></div>
    <div class="grid" style="gap:12px">
      ${J.lines.map(l=>`
      <div class="s4" style="min-width:0"><div class="lineCard" style="background:var(--card2);border:1px solid var(--line);border-radius:12px;padding:13px 15px;height:100%">
        <span class="st ${l.state}">${l.state==='live'?'● LIVE':'◪ 外部計測'}　${l.since}</span>
        <h4>${l.name}</h4>
        <div class="d">${l.desc}</div>
        <div class="pad">${l.id==='tconnect'?`<a href="${l.url}" target="_blank" rel="noopener" style="color:var(--cy)">padid=${l.padid}</a>`:l.padid}</div>
      </div></div>`).join('')}
    </div>
  </div>

  <!-- STEP 1: ボリューム -->
  <div class="card s12 reveal">
    <div class="ct"><span class="stepLbl" style="background:var(--cy)">STEP 1 ─ VOLUME　どれだけの量に届いているか</span><span class="sub">toyota.jp GA4実測 7/22〜8/18（28日間）</span></div>
    <div class="volGrid">
      <div class="volCard" style="--vc:var(--gd)">
        <div class="vk">導線の設置面 ＝ 試乗予約 完了者<br>（完了ページ到達・28日実測）</div>
        <div class="vv"><span data-cu="${T.tdN+T.tdI}">0</span><small> 件</small></div>
        <div class="vs">日平均 <b>${((T.tdN+T.tdI)/28).toFixed(1)}件</b> → 年換算 <b>${CM(doneY)}件</b> が3導線の露出対象。通常予約${CM(T.tdN)}＋即時${T.tdI}</div>
      </div>
      <div class="volCard" style="--vc:var(--cy)">
        <div class="vk">toyota.jp 全体セッション（28日）</div>
        <div class="vv"><span data-cu="${(T.s/1e4).toFixed(0)}">0</span><small> 万</small></div>
        <div class="vs">PV <b>${fmtJP(T.pv)}</b>・ユーザー ${fmtJP(T.u)}。年換算 <b>1.26億セッション</b> の巨大な母集団の最深部に導線が立つ</div>
      </div>
      <div class="volCard" style="--vc:var(--te)">
        <div class="vk">周辺の事業KPIボリューム（28日）</div>
        <div class="vv"><span data-cu="${(T.sim/1e4).toFixed(1)}" data-dec="1">0</span><small> 万件</small></div>
        <div class="vs">見積りシミュレーション完了。6種CV複合は <b>${fmtJP(T.cv6)}件</b>、キーイベント総数 ${fmtJP(T.ke)}件</div>
      </div>
      <div class="volCard" style="--vc:#9085E9">
        <div class="vk">導線クリック（7/7〜8/5・29日）</div>
        <div class="vv"><span data-cu="7">0</span><small> セッション</small></div>
        <div class="vs">到達率 現状0.87%（レポート#007試算）。<b>量はこれからの伸びしろ</b> — 配置改善で2〜5%へ（下のシナリオ）</div>
      </div>
    </div>
    <div class="chart" id="chOpsVolume" style="height:230px;margin-top:14px"></div>
    <div style="font-size:10.5px;color:var(--mut);margin-top:4px">毎日 <b class="hl">約80人の「試乗予約を完了した高温度ユーザー」</b>の眼前に導線が表示され続けている — この面の価値がボリュームの土台。</div>
  </div>

  <!-- STEP 2: 質 -->
  <div class="card s7 reveal">
    <div class="ct"><span class="stepLbl" style="background:var(--te)">STEP 2 ─ QUALITY　どれだけ深く使われたか</span><span class="sub">クリック者 vs 非クリック者（GA4実測・秒）</span></div>
    <div id="opsLift"></div>
    <div class="insight" style="margin-top:10px">${J.liftNote}</div>
  </div>
  <div class="card s5 reveal">
    <div class="ct"><span class="bar"></span><h3>導線群 × 対照群</h3><span class="sub">7/7〜8/5 · 29日間</span></div>
    <div class="twrap"><table>
      <thead><tr><th>指標</th><th class="num">導線クリック者</th><th class="num">通常の完了者</th></tr></thead>
      <tbody>
        <tr><td>セッション</td><td class="num">7</td><td class="num">2,351</td></tr>
        <tr><td>平均継続時間</td><td class="num" style="color:var(--te)">11分27秒<div style="color:var(--mut);font-size:9.5px">完了後の純増分</div></td><td class="num">18分11秒<div style="color:var(--mut);font-size:9.5px">予約作業を含む</div></td></tr>
        <tr><td>エンゲージメント率</td><td class="num" style="color:var(--gn)">100%</td><td class="num">96.68%</td></tr>
        <tr><td>T-Connect関連 平均滞在</td><td class="num" style="color:var(--te)">1分34秒（×2.1）</td><td class="num">45秒</td></tr>
        <tr><td>ページ内イベント</td><td class="num" style="color:var(--te)">15件（×3.8）</td><td class="num">4件</td></tr>
      </tbody></table></div>
  </div>

  <!-- 閲覧箇所 × 実キャプチャ -->
  <div class="card s12 reveal">
    <div class="ct"><span class="bar"></span><h3>何を読み込んだか — 閲覧箇所と実際の画面</h3><span class="sub">滞在実測 × 実ページキャプチャ（8/19取得・クリックで拡大）</span></div>
    <div class="jpcap">
      ${[
        {img:'assets/jp/jp_tconnect.jpg',t:'T-Connect トップ',stay:'1分50秒',note:'通常45秒の2.4倍。12イベント＝スクロール読破。導線の着地点',url:J.lines[0].url},
        {img:'assets/jp/jp_aircon.jpg',t:'リモートエアコン機能ページ',stay:'1分45秒',note:'「夏の暑い時や冬の寒い時」— 真夏の試乗前に最も刺さる1機能。対応車種リストまでクリック',url:'https://toyota.jp/tconnectservice/service/remote_aircon.html'},
        {img:'assets/jp/jp_store.jpg',t:'販売店検索',stay:'1分51秒（+63%）',note:'クリック者が最も長く使う面。「どの店に行くか」＝来店直前の行動',url:'https://toyota.jp/service/store-search/dc/search'}
      ].map(c=>`<a class="capIt" href="javascript:void(0)" data-cap="${c.img}" data-t="${c.t}" data-m="${c.note}" data-u="${c.url}">
        <img src="${c.img}" alt="${c.t}" loading="lazy">
        <div class="cl"><b>${c.t}</b> — 滞在 <span style="color:var(--te);font-family:var(--mono)">${c.stay}</span><br><span style="color:var(--mut)">${c.note}</span></div></a>`).join('')}
    </div>
  </div>

  <!-- STEP 3: 効果 -->
  <div class="card glow s5 reveal" style="border-color:color-mix(in srgb,var(--gd) 30%,transparent)">
    <div class="ct"><span class="stepLbl" style="background:var(--gd)">STEP 3 ─ EFFECT　何が生まれたか</span></div>
    <div class="oneBig" style="border:none;padding:6px 8px 0;text-align:center">
      <div class="cap">CV寄与 — 実測第1号</div>
      <div class="n" data-cu="1" style="font-size:84px">0</div>
      <div class="u">件　—　導線経由の <b class="hl">オンライン来店予約 step1 到達</b></div>
      <div style="font-size:10.5px;color:var(--mut);margin:8px 0 4px">7/30 深夜0:46 実測。量産前提のカウンター — 導線・成果の追加で拡張</div>
    </div>
    <div class="oneStats" style="grid-template-columns:1fr 1fr;margin-top:8px">
      <div class="oneStat"><div class="k">1件あたり追加滞在</div><div class="v">11<small>分</small>27<small>秒</small></div><div class="s">完了後に純増で得た接触時間</div></div>
      <div class="oneStat"><div class="k">step1 到達率</div><div class="v">16.7<small> %</small></div><div class="s">クリック者のうち（通常完了者は0）</div></div>
    </div>
    <div class="tl" style="margin-top:14px">${J.timeline.slice(0,4).map((r,i)=>`
      <div class="tlr"><div class="tt">${r.t}</div><div class="te">${r.e}</div></div>`).join('')}
      ${J.timeline.slice(4).map((r,i)=>`
      <div class="tlr ${i===1?'gold':''}"><div class="tt">${r.t}</div><div class="te">${r.e}</div><div class="ts">${r.s}</div></div>`).join('')}
    </div>
  </div>

  <div class="card s7 reveal">
    <div class="ct"><span class="bar"></span><h3>年間価値シナリオ — 量を伸ばすといくらになるか</h3><span class="sub">分母＝完了ページ到達 実測（年換算 ${CM(doneY)}件）</span></div>
    <div class="chart" id="chOpsScenario" style="height:240px"></div>
    <div class="twrap" style="margin-top:8px"><table>
      <thead><tr><th>シナリオ</th><th class="num">到達率</th><th class="num">年間導線経由</th><th class="num">追加接触時間</th><th class="num">年間価値</th><th>要件</th></tr></thead>
      <tbody>${J.scenarios.map((s,i)=>`<tr>
        <td><b style="color:${i===0?'var(--tx2)':'var(--gd)'}">${s.k}</b></td>
        <td class="num">${s.r}%</td><td class="num">${CM(s.n)}件</td><td class="num">約${s.h}時間</td>
        <td class="num" style="color:${i===0?'var(--tx)':'var(--gd)'};font-weight:700">約${CM(s.v)}万円</td>
        <td style="font-size:11px;color:var(--tx2)">${s.req}</td></tr>`).join('')}</tbody></table></div>
    <div style="font-size:10.5px;color:var(--mut);margin-top:8px">前提：step1→来店30%・来店→成約20%・新車限界利益30万円/台・T-Connect寄与0.5万円/S（レポート#007）。必要な改修は<b class="hl">ブロック順序・表示・文言のみ＝開発コスト軽微</b>。</div>
    <div class="card clickable" data-logic="jp" style="margin-top:12px;padding:13px 16px;background:var(--card2)">
      <div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap"><b>JP自体の資産価値</b>
        <span class="num" style="color:var(--gd);font-weight:800;font-size:19px">28.6億円/年</span>
        <span style="font-size:11px;color:var(--tx2)">＋ 回遊価値 ${OWNED.jpAsset.kaiyu.val}億円（実測PV/S ${T.pvps.toFixed(2)}）</span>
        <span class="clickHint" style="margin-left:auto">▸ クリックで計算式</span></div>
      <div style="font-size:10.8px;color:var(--mut);margin-top:4px">この面の活用改善は、オウンド総資産の最大チャネル（JP）の価値を直接引き上げる活動 — オウンド資産ビューと同じロジックで換算。</div>
    </div>
  </div>

  <!-- 行き先・改善・施策リスト -->
  <div class="card s6 reveal">
    <div class="ct"><span class="bar"></span><h3>導線セッションの行き先</h3><span class="sub">日付別・実測</span></div>
    <div class="twrap"><table>
      <thead><tr><th>日付</th><th>着地後の経路</th><th>知ろうとしたこと</th></tr></thead>
      <tbody>${J.sessions4.map(r=>`<tr><td class="num">${r.d}</td><td style="font-size:11px;line-height:1.7">${r.path}<div style="color:var(--te);font-family:var(--mono);font-size:9.5px;margin-top:2px">${r.stay}</div></td><td style="font-size:11.3px;color:var(--tx2)">${r.want}</td></tr>`).join('')}</tbody></table></div>
  </div>
  <div class="card s6 reveal">
    <div class="ct"><span class="bar"></span><h3>クリエイティブ改善案</h3><span class="sub">完了ページ実機検証（8/5）</span></div>
    <div class="twrap"><table>
      <thead><tr><th style="width:96px">対象</th><th>改善案（滞在データが根拠）</th></tr></thead>
      <tbody>${J.improve.map(r=>`<tr><td><b>${r.t}</b></td><td style="font-size:11.4px;color:var(--tx2)">${r.to}<div style="font-size:10px;color:var(--mut);margin-top:2px">現状: ${r.now}</div></td></tr>`).join('')}</tbody></table></div>
  </div>

  <div class="card s12 reveal" id="sisCard">
    <div class="ct"><span class="bar"></span><h3>提案・進行中 施策リスト</h3><span class="sub">このブラウザに保存（localStorage）— 自由に追加・編集・削除OK</span>
      <div class="r" style="display:flex;gap:8px">
        <button class="btnG" id="sisAdd">＋ 施策を追加</button>
        <button class="btnQ" id="sisReset" title="初期リスト（8/18版・41件）に戻す">初期データに戻す</button>
      </div>
    </div>
    <div class="sisCtl" id="sisCtl"></div>
    <div class="twrap"><table class="sisTbl" id="sisTbl"></table></div>
    <div class="localnote" style="margin-top:9px">✎ 保存先はこのブラウザの localStorage。共有時は同URLを開いた各自のローカル編集となる。</div>
  </div>

  <div class="card s12 reveal"><div class="insight" style="font-size:10.5px">
    出典：全体ボリューム＝<b>GA4実測</b>（Toyota.jp プロパティ・Windsor.ai経由・7/22〜8/18取得 2026-08-19）／ 導線の質・効果＝<b>導線価値レポート#007</b>（GA4データ探索 7/7〜8/5・完了ページ実機検証 8/5）／ <a href="${J.lines[0].url}" target="_blank" rel="noopener" style="color:var(--cy)">T-Connect導線 実URL（padid付き）</a> ／ 用品UGは遷移先が別サイトのため toyota.jp 側GA4では計測不可（連携待ち）。
  </div></div>`;

  drawOpsLift(J);
  drawOpsVolume(T);
  drawOpsScenario(J);
  drawSisaku();
  // JPロジック・キャプチャ
  $$('#opsRoot [data-logic]').forEach(el=>el.onclick=()=>logicOpen(logicHTML(el.dataset.logic)));
  $$('#opsRoot [data-cap]').forEach(el=>el.onclick=()=>capOpen(el.dataset.cap,el.dataset.t,el.dataset.m,el.dataset.u));
  runCountUps(root);
}

function drawOpsLift(J){
  const box=$('#opsLift');
  const mx=Math.max(...J.lift.map(r=>Math.max(r.a,r.b)));
  box.innerHTML=J.lift.map(r=>{
    const unit=r.unit||'秒';
    return `<div class="liftRow">
      <div class="t"><b>${r.p}</b><span class="pill ${r.hot?'up':'down'}">${r.d}</span></div>
      <div class="bars">
        <div class="bwrap"><span>導線経由</span><div><div class="bar2" style="width:${r.a/mx*100}%;background:linear-gradient(90deg,${r.hot?'var(--te)':'#5B6B84'},${r.hot?'var(--cy)':'#3d4c66'})"></div></div><span class="val">${r.a}${unit}</span></div>
        <div class="bwrap"><span>通常完了者</span><div><div class="bar2" style="width:${r.b/mx*100}%;background:#31415C"></div></div><span class="val">${r.b}${unit}</span></div>
      </div></div>`;
  }).join('');
}

function drawOpsVolume(T){
  const c=E('chOpsVolume'); if(!c)return;
  const ds=T.daily, days=[...Array(28)].map((_,i)=>{
    const d=new Date('2026-07-22'); d.setDate(d.getDate()+i);
    return `${d.getMonth()+1}/${d.getDate()}`;
  });
  c.setOption(baseOpt({
    grid:{left:46,right:60,top:32,bottom:26},
    legend:{top:0,textStyle:{color:TX2,fontSize:10.5},data:['試乗予約 完了（設置面到達）','見積りSIM完了']},
    xAxis:axX({data:days,axisLabel:{color:MUT,fontSize:9,fontFamily:MONOF,interval:3}}),
    yAxis:[axY({name:'予約完了/日',nameTextStyle:{color:MUT,fontSize:9}}),
           axY({name:'見積SIM/日',position:'right',splitLine:{show:false},nameTextStyle:{color:MUT,fontSize:9},axisLabel:{formatter:v=>fmtJP(v)}})],
    series:[
      {name:'試乗予約 完了（設置面到達）',type:'bar',data:ds.map(r=>r[1]),barWidth:'55%',
       itemStyle:{color:{type:'linear',x:0,y:0,x2:0,y2:1,colorStops:[{offset:0,color:'#FFE98A'},{offset:1,color:'#C98500'}]},borderRadius:[3,3,0,0]}},
      {name:'見積りSIM完了',type:'line',yAxisIndex:1,data:ds.map(r=>r[2]),symbol:'none',lineStyle:{color:CY,width:2},smooth:.3}
    ]
  }));
}

function drawOpsScenario(J){
  const c=E('chOpsScenario'); if(!c)return;
  const ks=J.scenarios.map(s=>`${s.k}\n${s.r}%`);
  c.setOption(baseOpt({
    grid:{left:52,right:56,top:34,bottom:34},
    legend:{top:0,textStyle:{color:TX2,fontSize:10.5},itemWidth:14,data:['年間導線経由（件）','年間価値（万円）']},
    xAxis:axX({data:ks,axisLabel:{color:MUT,fontSize:10,fontFamily:MONOF,interval:0,lineHeight:15}}),
    yAxis:[axY({name:'件',nameTextStyle:{color:MUT,fontSize:9}}),
           axY({name:'万円',position:'right',splitLine:{show:false},nameTextStyle:{color:MUT,fontSize:9}})],
    series:[
      {name:'年間導線経由（件）',type:'bar',data:J.scenarios.map((s,i)=>({value:s.n,itemStyle:{color:i===0?'#31415C':{type:'linear',x:0,y:0,x2:0,y2:1,colorStops:[{offset:0,color:'#FFE98A'},{offset:1,color:'#C98500'}]},borderRadius:[5,5,0,0]}})),
       barWidth:34,label:{show:true,position:'top',color:TX2,fontFamily:MONOF,fontSize:10,formatter:p=>CM(p.value)}},
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

/* ================= SECTOR 10: SNSパフォーマンス ================= */
const POST_CAPS={   // 投稿 → 実画面キャプチャ
  'Db83dLLgc-i':{img:'assets/sns/ig_viral.jpg'},
  'DcIBp7lkhOX':{img:'assets/sns/ig_reel.jpg'},
  'DcATpx-AhoP':{img:'assets/sns/ig_battery.jpg'},
  'Db7JyBRFISK':{img:'assets/sns/ig_key.jpg'},
  'x_suiso':{img:'assets/sns/x_post_h2.jpg'},
  'fb_suiso':{img:'assets/sns/fb_post.jpg'},
  'yt_seirei':{img:'assets/sns/yt_dr.jpg'},
  'yt_fukushi':{img:'assets/sns/yt_sr.jpg'}
};
function postCapKey(p){
  const m=p.url.match(/\/p\/([^/]+)\//); if(m)return m[1];
  if(p.title.includes('水素')&&p.sns==='X')return 'x_suiso';
  if(p.title.includes('水素')&&p.sns==='FB')return 'fb_suiso';
  if(p.title.includes('精霊馬')&&p.sns==='YT')return 'yt_seirei';
  if(p.title.includes('福祉'))return 'yt_fukushi';
  return null;
}
const ACC_CAPS={x:'assets/sns/x_profile.jpg',ig:'assets/sns/ig_profile.jpg',fb:'assets/sns/fb_page.jpg',ytsr:'assets/sns/yt_sr.jpg',ytdr:'assets/sns/yt_dr.jpg'};

function renderSNS(){
  const S=OWNED.sns, root=$('#snsRoot');
  const ac=S.accounts;
  const totalF=647000+851000+804000+560000+S.ytTotal.f;

  root.innerHTML=`
  <!-- 実測ヘッダ -->
  <div class="card glow s12 reveal">
    <div class="ct"><span class="bar" style="background:var(--gd);box-shadow:0 0 8px rgba(255,216,77,.5)"></span><h3>公式アカウント 実測ボード</h3><span class="sub">クロール ${OWNED.crawledAt}（Δは7/29実測比）— カードクリックで実画面</span>
      <div class="r"><span style="font-size:11px;color:var(--tx2)">総フォロワー・登録 <b class="num" style="color:var(--tx);font-size:14px">${fmtF(totalF)}</b>　·　資産換算は<a href="javascript:void(0)" id="goAssets" style="color:var(--gd)">オウンド資産</a>へ</span></div></div>
    <div class="snsGrid">${ac.map(a=>{
      const d=a.f-a.fPrev;
      const cap=ACC_CAPS[a.id];
      return `<div class="snsCard ${cap?'clickable':''}" style="--ac:${a.col}" ${cap?`data-cap="${cap}" data-t="${a.sns} ${a.name}" data-m="取得 ${OWNED.crawledAt}" data-u="${a.url}"`:''}>
      <div class="h"><span class="snsn">${a.sns}</span><span class="asof">${a.asof}</span></div>
      <div class="nm">${a.name}</div>
      <div class="fv">${fmtF(a.f)}<small> ${a.sns==='YouTube'?'登録者':'フォロワー'}</small>
        ${d>0?`<span class="pill up" style="font-size:10px">▲ +${fmtF(d)}</span>`:d===0?`<span class="pill flat" style="font-size:10px">→ ±0</span>`:''}</div>
      <div class="sub2">${a.posts}<br>${a.note}</div>
      <div class="foot2">${cap?'<span class="hasCap">実画面 ▸</span>':'<span></span>'}<a class="lnk" href="${a.url}" target="_blank" rel="noopener" onclick="event.stopPropagation()">開く ↗</a></div>
    </div>`}).join('')}</div>
  </div>

  <!-- 投稿パフォーマンス（媒体タブ + ランキング） -->
  <div class="card s7 reveal">
    <div class="ct"><span class="bar"></span><h3>投稿パフォーマンス ランキング</h3><span class="sub">実測 8/19 — 投稿をクリックすると実画面キャプチャ</span></div>
    <div class="mtab" id="snsTabCtl"></div>
    <div id="snsPosts"></div>
    <div id="snsTabNote" style="font-size:10.5px;color:var(--mut);margin-top:8px"></div>
  </div>

  <!-- 刺さる/刺さらない -->
  <div class="card s5 reveal">
    <div class="ct"><span class="bar"></span><h3>何が刺さるのか</h3><span class="sub">直近2週間の実測から — 事例クリックで実画面</span></div>
    <div class="wl">${S.insights.win.map((w,i)=>{
      const capMap=['assets/sns/ig_viral.jpg','assets/sns/ig_battery.jpg','assets/sns/ig_reel.jpg','assets/sns/yt_dr.jpg'];
      return `<div class="wlIt clickable" data-cap="${capMap[i]}" data-t="◎ ${w.t}" data-m="${w.d}" data-u=""><div class="t">◎ ${w.t}<span class="m">${w.m}</span></div><div class="d">${w.d}</div></div>`}).join('')}</div>
    <div class="wl" style="margin-top:10px">${S.insights.lose.map(w=>`<div class="wlIt lose"><div class="t">△ ${w.t}<span class="m">${w.m}</span></div><div class="d">${w.d}</div></div>`).join('')}</div>
    <div class="insight warn" style="margin-top:10px;font-size:10.8px">${S.insights.boost}</div>
  </div>

  <!-- フォロワー動向 + パワー -->
  <div class="card s5 reveal">
    <div class="ct"><span class="bar"></span><h3>3週間のフォロワー動向</h3><span class="sub">7/29 実測 → 8/19 実測</span></div>
    <div class="chart" id="chSnsDelta" style="height:270px"></div>
  </div>
  <div class="card s7 reveal">
    <div class="ct"><span class="bar"></span><h3>アカウントパワー 100点採点式 — 配点マップ</h3><span class="sub">各媒体アルゴリズムの公開情報に基づく配点。管理画面データ受領後にスコア化</span></div>
    <div class="chart" id="chSnsPower" style="height:270px"></div>
    <div style="font-size:10.3px;color:var(--mut);margin-top:6px;line-height:1.8">${S.powerNote}</div>
  </div>

  <div class="card s12 reveal"><div class="insight" style="font-size:10.5px">
    出典：フォロワー・投稿数値＝各公式アカウント実測クロール（<a href="https://x.com/TOYOTA_PR" target="_blank" rel="noopener" style="color:var(--cy)">X</a>・<a href="https://www.instagram.com/toyota_jp/" target="_blank" rel="noopener" style="color:var(--cy)">Instagram</a>・<a href="https://www.facebook.com/ToyotaMotorCorporation" target="_blank" rel="noopener" style="color:var(--cy)">Facebook</a>・<a href="https://www.youtube.com/@toyotajpchannel" target="_blank" rel="noopener" style="color:var(--cy)">YouTube SR</a>・<a href="https://www.youtube.com/@toyotatimes" target="_blank" rel="noopener" style="color:var(--cy)">トヨタイムズ</a>・<a href="https://www.youtube.com/@toyotadriverschannel" target="_blank" rel="noopener" style="color:var(--cy)">ドライバーズch</a>）2026-08-19 JST。TikTokのみアクセス制限のため7/29公開値。SNS→JP流入の実数はGA4のセッション参照元で計測設計中（メルマガ誘導は9.5万件/年・UTM実績）。金額換算はすべて「オウンド資産」ビューに集約。
  </div></div>`;

  drawSnsTabs();
  drawSnsPower(S);
  drawSnsDelta(S);
  $('#goAssets').onclick=()=>showView('assets');
  $$('#snsRoot [data-cap]').forEach(el=>el.onclick=()=>capOpen(el.dataset.cap,el.dataset.t,el.dataset.m,el.dataset.u));
  runCountUps(root);
}

function drawSnsTabs(){
  const S=OWNED.sns;
  const tabs=[['all','すべて'],['YT','YouTube'],['IG','Instagram'],['X','X'],['FB','Facebook']];
  const PFC={X:'#8A96A8',IG:'#D55181',YT:'#E66767',FB:'#3987E5',TT:'#00E5C7'};
  const counts={all:S.posts.length}; S.posts.forEach(p=>counts[p.sns]=(counts[p.sns]||0)+1);
  $('#snsTabCtl').innerHTML=tabs.map(([k,l])=>`<span class="chip ${ST.snsTab===k?'on':''}" data-tab="${k}">${k!=='all'?`<span class="sw" style="background:${PFC[k]}"></span>`:''}${l} <b>${counts[k]||0}</b></span>`).join('');
  $$('#snsTabCtl .chip').forEach(c=>c.onclick=()=>{ST.snsTab=c.dataset.tab;drawSnsTabs()});

  let posts=[...S.posts].sort((a,b)=>b.main-a.main);
  if(ST.snsTab!=='all') posts=posts.filter(p=>p.sns===ST.snsTab);
  $('#snsPosts').innerHTML=posts.map((p,i)=>{
    const key=postCapKey(p), cap=key&&POST_CAPS[key];
    return `
    <div class="postR ${i<3&&ST.snsTab==='all'?'top':''}" ${cap?`data-cap="${cap.img}"`:''} data-t="${p.sns}：${p.title.replace(/"/g,'')}" data-m="${p.d} 投稿 ・ ${p.mainL} ${fmtJP(p.main)} ・ ${p.sub}" data-u="${p.url}">
      <div class="rk">${i+1}</div>
      <div class="pf" style="color:${PFC[p.sns]};background:color-mix(in srgb,${PFC[p.sns]} 13%,transparent)">${p.sns}</div>
      <div><div class="ttl">${p.title}<span class="ptag" style="color:${p.tagc};background:color-mix(in srgb,${p.tagc} 13%,transparent)">${p.tag}</span>${cap?'<span class="hasCap">実画面 ▸</span>':''}</div>
        <div class="meta2">${p.d} 投稿 ・ ${p.sub}</div></div>
      <div class="mv"><b>${fmtJP(p.main)}</b><span>${p.mainL}</span></div>
    </div>`}).join('');
  // 媒体別の注釈
  const notes={
    all:'単位は媒体準拠（imp / 回視聴 / いいね）のため、媒体をまたぐ順位は「その媒体でどれだけ跳ねたか」の目安。',
    YT:'ドライバーズchの通常帯は数百〜数千回 → 精霊馬30万回は約600倍。ショールーム705万回は広告配信併用と推定。',
    IG:'通常帯は1,000前後のいいね → 精霊馬8.9万は約70倍。シェア4,802が拡散を牽引。',
    X:'直近4投稿のimpは1.8万〜5.7万。「ヤバい兆し」ホラー演出シリーズが上位。',
    FB:'リーチ率が構造的に低い媒体（自然到達〜10%）。活動報告のストック置き場として機能。'
  };
  $('#snsTabNote').textContent=notes[ST.snsTab]||'';
  $$('#snsPosts .postR').forEach(el=>{
    el.onclick=()=>{
      if(el.dataset.cap) capOpen(el.dataset.cap,el.dataset.t,el.dataset.m,el.dataset.u);
      else if(el.dataset.u) window.open(el.dataset.u,'_blank','noopener');
    };
  });
}

function drawSnsPower(S){
  const c=E('chSnsPower'); if(!c)return;
  const ms=[...S.power].reverse();
  const maxBlocks=Math.max(...ms.map(m=>m.blocks.length));
  const series=[];
  for(let bi=0;bi<maxBlocks;bi++){
    series.push({type:'bar',stack:'p',barWidth:17,
      data:ms.map(m=>{const b=m.blocks[bi];return b?{value:b[1],_n:b[0],_s:b[2],itemStyle:{color:m.col,opacity:.34+ .66*(1-bi/maxBlocks),borderColor:'#0A1120',borderWidth:1.2}}:0}),
      label:{show:true,position:'inside',fontSize:8.8,fontFamily:MONOF,color:'#EAF2FC',
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
      {type:'bar',barWidth:13,data:rows.map(r=>r.b).reverse(),
       itemStyle:{color:p=>rows.slice().reverse()[p.dataIndex].col,opacity:.9,borderRadius:[0,4,4,0]},
       label:{show:true,position:'right',fontFamily:MONOF,fontSize:10,color:TX2,
         formatter:p=>{const r=rows.slice().reverse()[p.dataIndex];const d=r.b-r.a;
           return fmtF(r.b)+(d>0?`  ▲+${fmtF(d)}`:'')}}}
    ]
  }));
}
