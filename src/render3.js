/* ============ 描画エンジン 3：OWNED OPS（JP導線実績・SNS資産）— 実測データ ============ */
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

const mmss=s=>`${Math.floor(s/60)}分${String(Math.round(s%60)).padStart(2,'0')}秒`;
const fmtF=n=> n>=1e4 ? ((n/1e4).toFixed(1).replace(/\.0$/,''))+'万' : CM(n); // フォロワー用（小数1桁維持）

/* ================= SECTOR 08: JP導線実績 ================= */
function renderOps(){
  const J=OWNED.junction, root=$('#opsRoot');
  if(!SIS) SIS=sisLoad();

  root.innerHTML=`
  <!-- 1件ヒーロー -->
  <div class="card glow s12 reveal" style="border-color:color-mix(in srgb,var(--gd) 30%,transparent)">
    <div class="oneHero">
      <div class="oneBig">
        <div class="cap">CONVERSION 寄与 — 実測第1号</div>
        <div class="n" data-cu="${J.heroCV}">0</div>
        <div class="u">件<span style="color:var(--mut)">　—　導線経由の <b class="hl">オンライン来店予約 step1 到達</b></span></div>
        <div style="font-size:10.5px;color:var(--mut);margin-top:7px">7/30 深夜 0:46 実測（下のタイムライン参照）。<br>量産前提のカウンター — 導線・成果の追加で拡張。</div>
      </div>
      <div>
        <div class="oneStats">
          <div class="oneStat"><div class="k">導線クリック（29日間）</div><div class="v"><span data-cu="7">0</span><small> セッション</small></div><div class="s">対照群 2,351S の完了者から発生</div></div>
          <div class="oneStat"><div class="k">1件あたり追加滞在</div><div class="v">11<small>分</small>27<small>秒</small></div><div class="s">予約完了後に<b class="hlc">純増で得た接触時間</b></div></div>
          <div class="oneStat"><div class="k">来店予約 step1 到達率</div><div class="v"><span data-cu="16.7" data-dec="1">0</span><small> %</small></div><div class="s">クリック者のうち。通常完了者は0秒（非到達）</div></div>
          <div class="oneStat"><div class="k">店舗検索 滞在リフト</div><div class="v">+<span data-cu="63">0</span><small> %</small></div><div class="s">1分51秒 vs 通常1分08秒</div></div>
        </div>
        <div style="margin-top:11px;font-size:11.3px;color:var(--tx2);line-height:1.8">クリックした人は「<b class="hl">どの店に行くか</b>」を探し、通常の完了者の <b>2.1倍</b> 深くT-Connectを読み込む — 単なる回遊ではなく<b>来店直前の予習行動</b>。</div>
      </div>
    </div>
  </div>

  <!-- 3導線カード -->
  ${J.lines.map(l=>`
  <div class="card s4 reveal"><div class="lineCard">
    <span class="st ${l.state}">${l.state==='live'?'● LIVE':'◪ 外部計測'}　${l.since}</span>
    <h4>${l.name}</h4>
    <div class="d">${l.desc}</div>
    <div class="kpi">▸ ${l.kpi}</div>
    <div class="pad">${l.id==='tconnect'?`<a href="${l.url}" target="_blank" rel="noopener" style="color:var(--cy)">padid=${l.padid}</a>`:l.padid}</div>
  </div></div>`).join('')}

  <!-- リフト比較 -->
  <div class="card s7 reveal">
    <div class="ct"><span class="bar"></span><h3>クリック者 vs 非クリック者 — 同一ページ滞在リフト</h3><span class="sub">GA4実測・秒</span></div>
    <div id="opsLift"></div>
    <div class="insight" style="margin-top:10px">${J.liftNote}</div>
  </div>

  <!-- 群比較 -->
  <div class="card s5 reveal">
    <div class="ct"><span class="bar"></span><h3>導線群 × 対照群</h3><span class="sub">7/7〜8/5 · 29日間</span></div>
    <div class="twrap"><table>
      <thead><tr><th>指標</th><th class="num">導線クリック者</th><th class="num">通常の完了者</th></tr></thead>
      <tbody>
        <tr><td>セッション</td><td class="num">7</td><td class="num">2,351</td></tr>
        <tr><td>ページビュー</td><td class="num">32</td><td class="num">29,803</td></tr>
        <tr><td>PV / セッション</td><td class="num">4.6</td><td class="num">12.7 <span style="color:var(--mut);font-size:10px">予約フロー込み</span></td></tr>
        <tr><td>平均継続時間</td><td class="num" style="color:var(--te)">11分27秒<div style="color:var(--mut);font-size:9.5px">完了後の純増分</div></td><td class="num">18分11秒<div style="color:var(--mut);font-size:9.5px">予約作業を含む</div></td></tr>
        <tr><td>エンゲージメント率</td><td class="num" style="color:var(--gn)">100%</td><td class="num">96.68%</td></tr>
        <tr><td>T-Connect関連 平均滞在</td><td class="num" style="color:var(--te)">1分34秒（×2.1）</td><td class="num">45秒</td></tr>
        <tr><td>ページ内イベント</td><td class="num" style="color:var(--te)">15件（×3.8）</td><td class="num">4件</td></tr>
      </tbody></table></div>
  </div>

  <!-- 成果第1号タイムライン -->
  <div class="card s5 reveal">
    <div class="ct"><span class="bar"></span><h3>成果第1号の全行動 — 7/30（木）深夜</h3><span class="sub">4分43秒 · 20ページ · 37イベント</span></div>
    <div class="tl">${J.timeline.map((r,i)=>`
      <div class="tlr ${i===5?'gold':''}"><div class="tt">${r.t}</div><div class="te">${r.e}</div><div class="ts">${r.s}</div></div>`).join('')}
    </div>
  </div>

  <!-- 年間価値シナリオ -->
  <div class="card s7 reveal">
    <div class="ct"><span class="bar"></span><h3>年間価値シナリオ — 到達率を上げるといくらになるか</h3><span class="sub">分母＝完了ページ 79.3S/日 → 28,961件/年（実測）</span></div>
    <div class="chart" id="chOpsScenario" style="height:250px"></div>
    <div class="twrap" style="margin-top:8px"><table>
      <thead><tr><th>シナリオ</th><th class="num">到達率</th><th class="num">年間導線経由</th><th class="num">追加滞在の総量</th><th class="num">年間価値</th><th>要件</th></tr></thead>
      <tbody>${J.scenarios.map((s,i)=>`<tr>
        <td><b style="color:${i===0?'var(--tx2)':'var(--gd)'}">${s.k}</b></td>
        <td class="num">${s.r}%</td><td class="num">${CM(s.n)}件</td><td class="num">約${s.h}時間</td>
        <td class="num" style="color:${i===0?'var(--tx)':'var(--gd)'};font-weight:700">約${CM(s.v)}万円</td>
        <td style="font-size:11px;color:var(--tx2)">${s.req}</td></tr>`).join('')}</tbody></table></div>
    <div style="font-size:10.5px;color:var(--mut);margin-top:8px">歩留まり：step1→来店30%・来店→成約20%・新車限界利益30万円/台・T-Connect寄与0.5万円/S（レポート#007の前提を継承）。必要な改修は<b class="hl">ブロック順序・表示・文言のみ＝開発コスト軽微</b>。</div>
  </div>

  <!-- 何を知ろうとしたか -->
  <div class="card s6 reveal">
    <div class="ct"><span class="bar"></span><h3>クリック後、何を知ろうとしたか</h3><span class="sub">T-Connect内の閲覧箇所と滞在</span></div>
    <div class="twrap"><table>
      <thead><tr><th>見たページ / 行動</th><th class="num">滞在</th><th>読み取れる関心</th></tr></thead>
      <tbody>${J.tconnect.map(r=>`<tr><td style="font-family:var(--mono);font-size:11px">${r.p}</td><td class="num" style="color:var(--te)">${r.stay}</td><td style="font-size:11.3px;color:var(--tx2)">${r.read}</td></tr>`).join('')}</tbody></table></div>
  </div>

  <!-- 4セッションの関心 -->
  <div class="card s6 reveal">
    <div class="ct"><span class="bar"></span><h3>導線セッションの行き先</h3><span class="sub">日付別・実測</span></div>
    <div class="twrap"><table>
      <thead><tr><th>日付</th><th>着地後の経路</th><th>知ろうとしたこと</th></tr></thead>
      <tbody>${J.sessions4.map(r=>`<tr><td class="num">${r.d}</td><td style="font-size:11px;line-height:1.7">${r.path}<div style="color:var(--te);font-family:var(--mono);font-size:9.5px;margin-top:2px">${r.stay}</div></td><td style="font-size:11.3px;color:var(--tx2)">${r.want}</td></tr>`).join('')}</tbody></table></div>
  </div>

  <!-- 改善バックログ -->
  <div class="card s12 reveal">
    <div class="ct"><span class="bar"></span><h3>クリエイティブ改善案</h3><span class="sub">完了ページ実機検証（8/5・実際に試乗予約を送信して確認）</span></div>
    <div class="twrap"><table>
      <thead><tr><th style="width:110px">対象</th><th>現状</th><th>改善案（滞在データが根拠）</th></tr></thead>
      <tbody>${J.improve.map(r=>`<tr><td><b>${r.t}</b></td><td style="font-size:11.3px;color:var(--mut)">${r.now}</td><td style="font-size:11.6px;color:var(--tx2)">${r.to}</td></tr>`).join('')}</tbody></table></div>
  </div>

  <!-- 施策リスト（編集可能） -->
  <div class="card s12 reveal" id="sisCard">
    <div class="ct"><span class="bar"></span><h3>提案・進行中 施策リスト</h3><span class="sub">このブラウザに保存（localStorage）— 自由に追加・編集・削除OK</span>
      <div class="r" style="display:flex;gap:8px">
        <button class="btnG" id="sisAdd">＋ 施策を追加</button>
        <button class="btnQ" id="sisReset" title="初期リスト（8/18版・41件）に戻す">初期データに戻す</button>
      </div>
    </div>
    <div class="sisCtl" id="sisCtl"></div>
    <div class="twrap"><table class="sisTbl" id="sisTbl"></table></div>
    <div class="localnote" style="margin-top:9px">✎ 保存先はこのブラウザの localStorage。共有時は同URLを開いた各自のローカル編集となる（サーバー同期はGA4接続フェーズで実装余地）。</div>
  </div>

  <div class="card s12 reveal"><div class="insight" id="opsSrc" style="font-size:10.5px">
    出典：<b>導線価値レポート#007</b>（GA4データ探索 7/7〜8/5 実測・完了ページ実機検証 2026/8/5）／ T-Connect導線 <a href="${J.lines[0].url}" target="_blank" rel="noopener" style="color:var(--cy)">toyota.jp/tconnectservice（padid付き実URL）</a> ／ au・UQ導線は8/4追加、用品UGは遷移先が別サイトのため toyota.jp 側GA4では計測不可（連携待ち）。年間価値は本文明示の前提による概算。
  </div></div>`;

  drawOpsLift(J);
  drawOpsScenario(J);
  drawSisaku();
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
function sisCounts(){
  const c={}; SIS.forEach(s=>c[s.st]=(c[s.st]||0)+1); return c;
}
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

/* ================= SECTOR 09: SNS資産 ================= */
function renderSNS(){
  const S=OWNED.sns, root=$('#snsRoot');
  const ac=S.accounts;
  const totalF=647000+851000+804000+560000+S.ytTotal.f;

  root.innerHTML=`
  <!-- 価値ヒーロー -->
  <div class="card glow s12 reveal" style="border-color:color-mix(in srgb,var(--gd) 30%,transparent)">
    <div class="oneHero" style="grid-template-columns:auto 1fr">
      <div class="oneBig">
        <div class="cap">MEDIA ASSET VALUE — 年換算</div>
        <div class="n" style="font-size:72px"><span data-cu="46.5" data-dec="1">0</span><span style="font-size:30px">億円</span></div>
        <div class="u">= ( STOCK <b class="num">9.8億</b> + FLOW <b class="num">36.7億</b>/年 ) × Q<span style="color:var(--mut)">1.0</span></div>
        <div style="font-size:10.5px;color:var(--mut);margin-top:7px">保守ケース（全単価下限×露出半減）でも <b style="color:var(--tx2)">24.0億円</b></div>
      </div>
      <div>
        <div class="oneStats">
          <div class="oneStat"><div class="k">アクティブ基盤（形骸化除外後）</div><div class="v"><span data-cu="540">0</span><small> 万人</small></div><div class="s">総フォロワーでなく活性分のみ計上</div></div>
          <div class="oneStat"><div class="k">総フォロワー・登録（5媒体）</div><div class="v"><span data-cu="${(totalF/10000).toFixed(0)}">0</span><small> 万</small></div><div class="s">X+IG+TikTok+FB+YT3ch 実測</div></div>
          <div class="oneStat"><div class="k">今週のバズ最大値</div><div class="v"><span data-cu="8.9" data-dec="1">0</span><small> 万いいね</small></div><div class="s">IG「精霊馬の帰省ラッシュ」8/13</div></div>
          <div class="oneStat"><div class="k">JP誘導（メルマガUTM実績）</div><div class="v"><span data-cu="9.5" data-dec="1">0</span><small> 万件/年</small></div><div class="s">SNS→JP流入はGA4連携後に自動反映</div></div>
        </div>
        <div style="margin-top:11px;font-size:11.3px;color:var(--tx2);line-height:1.8">基盤は「<b class="hl">アクティブのみ</b>」・露出は「<b class="hl">実測とGA</b>」— 形骸化した数字を除いて資産を語る。impの60%（実際に見られた分）だけをFLOW計上する保守設計。</div>
      </div>
    </div>
  </div>

  <!-- アカウントカード -->
  <div class="card s12 reveal">
    <div class="ct"><span class="bar"></span><h3>公式アカウント 実測ボード</h3><span class="sub">クロール ${OWNED.crawledAt}（Δは7/29実測比）</span></div>
    <div class="snsGrid">${ac.map(a=>{
      const d=a.f-a.fPrev;
      return `<div class="snsCard" style="--ac:${a.col}">
      <div class="h"><span class="snsn">${a.sns}</span><span class="asof">${a.asof}</span></div>
      <a href="${a.url}" target="_blank" rel="noopener"><div class="nm">${a.name}</div></a>
      <div class="fv">${fmtF(a.f)}<small> ${a.sns==='YouTube'?'登録者':'フォロワー'}</small>
        ${d>0?`<span class="pill up" style="font-size:10px">▲ +${fmtF(d)}</span>`:d===0?`<span class="pill flat" style="font-size:10px">→ ±0</span>`:''}</div>
      <div class="sub2">${a.posts}<br>${a.note}</div>
      <div class="foot2">${a.val?`<span class="valv">資産 ${a.val}億円</span>`:'<span class="valv" style="color:var(--mut)">3ch合算 4.53億円</span>'}<a class="lnk" href="${a.url}" target="_blank" rel="noopener">開く ↗</a></div>
    </div>`}).join('')}</div>
  </div>

  <!-- 資産価値の内訳 -->
  <div class="card s7 reveal">
    <div class="ct"><span class="bar"></span><h3>資産価値 46.5億円の内訳</h3><span class="sub">STOCK（基盤）× FLOW（年間活動）— 8チャネル</span></div>
    <div class="chart" id="chSnsValue" style="height:300px"></div>
  </div>
  <div class="card s5 reveal">
    <div class="ct"><span class="bar"></span><h3>採用単価（市場実勢の中央値）</h3><span class="sub">下段＝実勢レンジ・円</span></div>
    <div class="twrap"><table>
      <thead><tr><th>媒体</th><th class="num">CPF<div style="font-size:9px;color:var(--mut)">フォロワー獲得</div></th><th class="num">CPM<div style="font-size:9px;color:var(--mut)">1,000imp</div></th><th class="num">CPE<div style="font-size:9px;color:var(--mut)">1エンゲージ</div></th></tr></thead>
      <tbody>${S.units.map(u=>`<tr><td><b>${u.m}</b></td>
        <td class="num">${u.cpf}<div style="font-size:9.5px;color:var(--mut)">${u.cpfR}</div></td>
        <td class="num">${u.cpm}<div style="font-size:9.5px;color:var(--mut)">${u.cpmR}</div></td>
        <td class="num">${u.cpe}<div style="font-size:9.5px;color:var(--mut)">${u.cpeR}</div></td></tr>`).join('')}</tbody></table></div>
    <div style="font-size:10.3px;color:var(--mut);margin-top:9px;line-height:1.8">YouTube=CPF200円/CPV7円×自然分50%・JP=検索経由50%×加重CPC60円（指名70%×30円+一般30%×130円）・メルマガ=リスト200円/号外5円/通・LINE=友だち150円/従量3円/通</div>
  </div>

  <!-- 最新投稿ランキング -->
  <div class="card s7 reveal">
    <div class="ct"><span class="bar"></span><h3>最新投稿パフォーマンス ランキング</h3><span class="sub">実測 8/19 — 数値単位は媒体準拠（imp / 視聴 / いいね）</span></div>
    <div id="snsPosts"></div>
  </div>

  <!-- 刺さる/刺さらない -->
  <div class="card s5 reveal">
    <div class="ct"><span class="bar"></span><h3>何が刺さるのか</h3><span class="sub">直近2週間の実測から</span></div>
    <div class="wl">${S.insights.win.map(w=>`<div class="wlIt"><div class="t">◎ ${w.t}<span class="m">${w.m}</span></div><div class="d">${w.d}</div></div>`).join('')}</div>
    <div class="wl" style="margin-top:10px">${S.insights.lose.map(w=>`<div class="wlIt lose"><div class="t">△ ${w.t}<span class="m">${w.m}</span></div><div class="d">${w.d}</div></div>`).join('')}</div>
    <div class="insight warn" style="margin-top:10px;font-size:10.8px">${S.insights.boost}</div>
  </div>

  <!-- アカウントパワー -->
  <div class="card s7 reveal">
    <div class="ct"><span class="bar"></span><h3>アカウントパワー 100点採点式 — 配点マップ</h3><span class="sub">各媒体アルゴリズムの公開情報に基づく配点。管理画面データ受領後にスコア化</span></div>
    <div class="chart" id="chSnsPower" style="height:280px"></div>
    <div style="font-size:10.3px;color:var(--mut);margin-top:6px;line-height:1.8">${S.powerNote}</div>
  </div>

  <!-- フォロワー動向 -->
  <div class="card s5 reveal">
    <div class="ct"><span class="bar"></span><h3>3週間のフォロワー動向</h3><span class="sub">7/29 実測 → 8/19 実測</span></div>
    <div class="chart" id="chSnsDelta" style="height:280px"></div>
  </div>

  <!-- キャプチャ -->
  <div class="card s12 reveal">
    <div class="ct"><span class="bar"></span><h3>実際の画面 — 取得キャプチャ</h3><span class="sub">2026-08-19 16:55〜17:05 JST・クリックで実ページへ</span></div>
    <div class="capGrid">${S.captures.map(c=>`
      <a class="capIt" href="${c.u}" target="_blank" rel="noopener"><img src="${c.img}" alt="${c.t}" loading="lazy"><div class="cl">${c.t.replace(/—(.+)$/,'— <b>$1</b>')}</div></a>`).join('')}</div>
  </div>

  <div class="card s12 reveal"><div class="insight" style="font-size:10.5px">
    出典：フォロワー・投稿数値＝各公式アカウント実測クロール（<a href="https://x.com/TOYOTA_PR" target="_blank" rel="noopener" style="color:var(--cy)">X</a>・<a href="https://www.instagram.com/toyota_jp/" target="_blank" rel="noopener" style="color:var(--cy)">Instagram</a>・<a href="https://www.facebook.com/ToyotaMotorCorporation" target="_blank" rel="noopener" style="color:var(--cy)">Facebook</a>・<a href="https://www.youtube.com/@toyotajpchannel" target="_blank" rel="noopener" style="color:var(--cy)">YouTube SR</a>・<a href="https://www.youtube.com/@toyotatimes" target="_blank" rel="noopener" style="color:var(--cy)">トヨタイムズ</a>・<a href="https://www.youtube.com/@toyotadriverschannel" target="_blank" rel="noopener" style="color:var(--cy)">ドライバーズch</a>）2026-08-19 JST。TikTokのみアクセス制限のため7/29公開値。単価・アクティブ率・計算式＝オウンドKPI共有資料（7/30版）：<a href="https://www.meltwater.com/jp" target="_blank" rel="noopener" style="color:var(--cy)">Meltwater</a>・ホットリンク・アドエビス等の実勢レンジ中央値。impの60%のみFLOW計上・二次拡散やJPコンテンツ資産は未計上（上振れ余地）。
  </div></div>`;

  drawSnsValue(S);
  drawSnsPosts(S);
  drawSnsPower(S);
  drawSnsDelta(S);
  runCountUps(root);
}

function drawSnsValue(S){
  const c=E('chSnsValue'); if(!c)return;
  const chs=[...S.channels].reverse();
  c.setOption(baseOpt({
    grid:{left:110,right:74,top:30,bottom:26},
    legend:{top:0,textStyle:{color:TX2,fontSize:10.5},data:['STOCK（基盤資産）','FLOW（年間活動価値）']},
    xAxis:axY({axisLabel:{formatter:v=>v+'億'}}),
    yAxis:axX({data:chs.map(x=>x.name),axisLabel:{color:TX2,fontSize:10.5,fontFamily:FONT}}),
    tooltip:Object.assign({},TIP,{formatter:p=>{
      const ch=S.channels.find(x=>x.name===p.name);
      return `<b>${p.name}</b><br>${p.seriesName}: <b>${p.value}億円</b><br><span style="color:#A5B6CE;font-size:10.5px">${ch.basis}<br>単価: ${ch.unit}</span>`}}),
    series:[
      {name:'STOCK（基盤資産）',type:'bar',stack:'v',data:chs.map(x=>x.stock),itemStyle:{color:'#3987E5',borderRadius:[3,0,0,3]},barWidth:15},
      {name:'FLOW（年間活動価値）',type:'bar',stack:'v',data:chs.map(x=>x.flow),itemStyle:{color:'#00E5C7',borderRadius:[0,3,3,0]},
       label:{show:true,position:'right',color:TX2,fontFamily:MONOF,fontSize:10.5,formatter:p=>{const ch=chs[p.dataIndex];return (ch.stock+ch.flow).toFixed(2).replace(/0$/,'')+'億'}}}
    ]
  }));
}

function drawSnsPosts(S){
  const box=$('#snsPosts');
  const posts=[...S.posts].sort((a,b)=>b.main-a.main);
  const PFC={X:'#8A96A8',IG:'#D55181',YT:'#E66767',FB:'#3987E5',TT:'#00E5C7'};
  box.innerHTML=posts.map((p,i)=>`
    <div class="postR ${i<3?'top':''}">
      <div class="rk">${i+1}</div>
      <div class="pf" style="color:${PFC[p.sns]};background:color-mix(in srgb,${PFC[p.sns]} 13%,transparent)">${p.sns}</div>
      <div><div class="ttl"><a href="${p.url}" target="_blank" rel="noopener">${p.title}</a><span class="ptag" style="color:${p.tagc};background:color-mix(in srgb,${p.tagc} 13%,transparent)">${p.tag}</span></div>
        <div class="meta2">${p.d} 投稿 ・ ${p.sub}</div></div>
      <div class="mv"><b>${fmtJP(p.main)}</b><span>${p.mainL}</span></div>
    </div>`).join('');
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
    grid:{left:104,right:86,top:8,bottom:26},
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
