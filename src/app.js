/* ============ アプリ制御：ナビ・フィルタ・⌘K・トースト ============ */
const RENDERERS={hq:renderHQ,garage:renderGarage,goods:renderGoods,flow:renderFlow,acq:renderAcq,aud:renderAud,lab:renderLab,dict:renderDict,ops:renderOps,sns:renderSNS};
const VIEW_LABELS={hq:'総合HQ',garage:'車種ガレージ',goods:'商材・CV',flow:'動線マップ',acq:'集客・広告',aud:'オーディエンス',lab:'クロス分析ラボ',dict:'計測設計',ops:'JP導線実績（実測）',sns:'SNS資産（実測）'};
const OWNED_VIEWS=['ops','sns'];
const rendered={};

function renderView(v){
  RENDERERS[v]();
  rendered[v]=true;
  ST.dirty[v]=false;
  requestAnimationFrame(()=>{
    Object.values(charts).forEach(c=>{try{c.resize()}catch(e){}});
    revealScan();
  });
}
function showView(v){
  ST.view=v;
  $$('.view').forEach(s=>s.classList.toggle('on',s.dataset.view===v));
  $$('#nav button').forEach(b=>b.classList.toggle('on',b.dataset.view===v));
  $('#crumbView').textContent=VIEW_LABELS[v];
  const owned=OWNED_VIEWS.includes(v);
  const dm=$('.dm'); dm.textContent=owned?'LIVE · 実測データ':'DEMO DATA'; dm.classList.toggle('live',owned);
  dm.title=owned?'公式SNSクロール実測＋GA4実測レポート#007に基づく実データ':'実データ接続前の合成デモデータで動作中';
  if(!rendered[v]||ST.dirty[v]) renderView(v);
  else requestAnimationFrame(()=>{Object.values(charts).forEach(c=>{try{c.resize()}catch(e){}});revealScan()});
  window.scrollTo({top:0,behavior:REDUCED?'auto':'smooth'});
}
function markAllDirty(){Object.keys(RENDERERS).forEach(v=>ST.dirty[v]=true)}

/* ---- ナビ ---- */
$('#nav').addEventListener('click',e=>{
  const b=e.target.closest('button[data-view]');
  if(b) showView(b.dataset.view);
});
$('#menubtn')?.addEventListener('click',()=>{
  const s=$('.side'); s.style.display=s.style.display==='flex'?'none':'flex';
  s.style.position='fixed'; s.style.zIndex='80'; s.style.width='240px';
});

/* ---- 期間・セグメント ---- */
$('#rngCtl').addEventListener('click',e=>{
  const b=e.target.closest('button[data-r]'); if(!b)return;
  ST.range=+b.dataset.r;
  $$('#rngCtl button').forEach(x=>x.classList.toggle('on',x===b));
  markAllDirty(); updatePeriod(); renderView(ST.view);
});
$('#segCtl').addEventListener('click',e=>{
  const b=e.target.closest('button[data-s]'); if(!b)return;
  ST.seg=b.dataset.s;
  $$('#segCtl button').forEach(x=>x.classList.toggle('on',x===b));
  markAllDirty(); updatePeriod(); renderView(ST.view);
});
function updatePeriod(){
  const A=GA.agg(ST.range,ST.seg);
  $('#periodLbl').textContent=`${A.from.replace(/-/g,'/')} 〜 ${A.to.replace(/-/g,'/')}　·　${SEGLBL[ST.seg]}`;
}

/* ---- トレンド切替チップ ---- */
$$('[data-tr]').forEach(c=>c.onclick=()=>{
  ST.trendMode=c.dataset.tr;
  $$('[data-tr]').forEach(x=>x.classList.toggle('on',x===c));
  renderHQ();
});

/* ---- ガレージのソート/カテゴリ ---- */
$('#garageCtl').addEventListener('click',e=>{
  const s=e.target.closest('[data-sort]'), c=e.target.closest('[data-cat]');
  if(s){ST.garage.sort=s.dataset.sort;$$('#garageCtl [data-sort]').forEach(x=>x.classList.toggle('on',x===s))}
  if(c){ST.garage.cat=c.dataset.cat;$$('#garageCtl [data-cat]').forEach(x=>x.classList.toggle('on',x===c))}
  if(s||c) renderGarage();
});

/* ---- モーダル ---- */
$('#modelModal').addEventListener('click',e=>{if(e.target.id==='modelModal')closeModal()});
$('#sisakuModal').addEventListener('click',e=>{if(e.target.id==='sisakuModal')$('#sisakuModal').classList.remove('on')});
addEventListener('keydown',e=>{if(e.key==='Escape'){closeModal();ckClose();$('#sisakuModal').classList.remove('on')}});

/* ---- ⌘K コマンドパレット ---- */
let ckItems=[],ckSel=0;
function buildCk(){
  ckItems=[
    ...Object.entries(VIEW_LABELS).map(([v,l])=>({t:l,k:'ビュー',act:()=>showView(v)})),
    ...GA.MODELS.map(m=>({t:m.name,k:'車種 → 詳細カルテ',act:()=>{showView('garage');setTimeout(()=>openModelModal(m.id),80)}})),
    ...GA.campaigns(90).map(c=>({t:c.name,k:'キャンペーン → 広告リーグ',act:()=>showView('acq')})),
    {t:'クロス：車種×アフィニティ（CVR）',k:'ラボ',act:()=>{ST.lab={row:'model',col:'affinity',metric:'cvr'};$('#labRow').dataset.built='';showView('lab');ST.dirty.lab=true;renderView('lab')}},
  ];
}
function ckOpen(){
  if(!ckItems.length)buildCk();
  $('#cmdk').classList.add('on');
  const inp=$('#ckInput'); inp.value=''; inp.focus(); ckSel=0; ckFilter('');
}
function ckClose(){$('#cmdk').classList.remove('on')}
function ckFilter(q){
  const list=ckItems.filter(i=>i.t.toLowerCase().includes(q.toLowerCase())).slice(0,12);
  $('#ckList').innerHTML=list.map((i,ix)=>`<div class="ckitem ${ix===ckSel?'sel':''}" data-ix="${ix}">${i.t}<span class="k">${i.k}</span></div>`).join('')||'<div class="ckitem">該当なし</div>';
  $$('#ckList .ckitem').forEach(el=>el.onclick=()=>{const it=list[+el.dataset.ix];if(it){ckClose();it.act()}});
  return list;
}
$('#kbtn').onclick=ckOpen;
$('#cmdk').addEventListener('click',e=>{if(e.target.id==='cmdk')ckClose()});
$('#ckInput').addEventListener('input',e=>{ckSel=0;ckFilter(e.target.value)});
$('#ckInput').addEventListener('keydown',e=>{
  const list=ckFilter($('#ckInput').value);
  if(e.key==='ArrowDown'){ckSel=Math.min(list.length-1,ckSel+1);ckFilter($('#ckInput').value)}
  if(e.key==='ArrowUp'){ckSel=Math.max(0,ckSel-1);ckFilter($('#ckInput').value)}
  if(e.key==='Enter'&&list[ckSel]){ckClose();list[ckSel].act()}
});
addEventListener('keydown',e=>{
  if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();ckOpen()}
});

/* ---- トースト ---- */
function toast(html,cls='',dur=6500){
  const el=document.createElement('div');
  el.className='toast '+cls; el.innerHTML=html;
  $('#toasts').appendChild(el);
  setTimeout(()=>{el.classList.add('out');setTimeout(()=>el.remove(),450)},dur);
}

/* ---- ライブカウンター（デモ） ---- */
function liveTick(){
  const h=new Date().getHours()+new Date().getMinutes()/60;
  const curve=Math.max(.22,Math.sin((h-3)/24*Math.PI*2)*.5+.62);
  const n=Math.round(9200*curve*(1+Math.sin(Date.now()/9000)*.05+(Math.random()-.5)*.04));
  $('#liveN').textContent=n.toLocaleString('ja-JP');
}

/* ---- リビール（描画時ステガー・確実表示） ---- */
function revealScan(){
  $$('.view.on .reveal:not(.in)').forEach((el,i)=>{
    el.style.transitionDelay=(Math.min(i,8)*70)+'ms';
    requestAnimationFrame(()=>requestAnimationFrame(()=>{el.classList.add('in');
      setTimeout(()=>{el.style.transitionDelay=''},900)}));
  });
}

/* ---- リサイズ ---- */
let rzT;addEventListener('resize',()=>{clearTimeout(rzT);rzT=setTimeout(()=>Object.values(charts).forEach(c=>{try{c.resize()}catch(e){}}),160)});

/* ---- 起動 ---- */
(function init(){
  updatePeriod();
  renderView('hq');
  liveTick(); setInterval(liveTick,3200);
  const SC=GA.score();
  setTimeout(()=>{
    if(OWNED_VIEWS.includes(ST.view))return; // 実測ビュー閲覧中はデモ用トーストを出さない
    const behind=SC.missions.find(m=>m.status==='behind');
    const ahead=[...SC.missions].sort((a,b)=>b.vsPace-a.vsPace)[0];
    toast(`<b>ミッション更新</b>：「${ahead.name}」が目標ペース <b>+${((ahead.vsPace-1)*100).toFixed(0)}%</b> で進行中`);
    if(behind)setTimeout(()=>toast(`<b>要注意</b>：「${behind.name}」がペース <b>${((behind.vsPace-1)*100).toFixed(0)}%</b>。集客・広告タブで新規向け配信を確認`,'warn',8000),1700);
    setTimeout(()=>toast(`<b>⌘K</b>（Ctrl+K）で車種・キャンペーンを横断検索できます`,'',7000),3600);
  },1200);
})();
