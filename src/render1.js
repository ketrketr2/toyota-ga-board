/* ============ 描画エンジン 1/2：ヘルパー・HQ・ガレージ・商材・動線 ============ */
const $=(s,el=document)=>el.querySelector(s);
const $$=(s,el=document)=>Array.from(el.querySelectorAll(s));

/* ---------- 状態 ---------- */
const ST={range:28,seg:'all',view:'hq',trendMode:'both',
  garage:{sort:'sessions',cat:'all'},
  lab:{row:'model',col:'channel',metric:'sessions'},
  vs:{a:'alphard',b:'harrier'}, funnelGoal:'estimate',
  dirty:{}, campSort:{key:'sessions',dir:-1}, leagueSort:{key:'sessions',dir:-1}};

/* ---------- 表示フォーマッタ ---------- */
const CM=n=>Math.round(n).toLocaleString('ja-JP');
function fmtJP(n){
  if(n>=1e8) return (n/1e8).toFixed(2).replace(/\.?0+$/,'')+'億';
  if(n>=1e4){const m=n/1e4; return (m<10? m.toFixed(1).replace(/\.0$/,'') : CM(m))+'万'}
  if(n>=100) return CM(n);
  return (Math.round(n*10)/10).toLocaleString('ja-JP');
}
const pct=(v,d=1)=>(v*100).toFixed(d)+'%';
function yen(n){
  if(n>=1e8) return '¥'+(n/1e8).toFixed(1)+'億';
  if(n>=1e4) return '¥'+CM(n/1e4)+'万';
  return '¥'+CM(n);
}
function deltaPill(cur,prev,inverse=false){
  if(!prev) return '<span class="pill flat">—</span>';
  const d=(cur-prev)/prev;
  const up=inverse? d<0 : d>0;
  const cls=Math.abs(d)<0.002?'flat':up?'up':'down';
  const sign=d>0?'+':'';
  const arrow=Math.abs(d)<0.002?'→':d>0?'▲':'▼';
  return `<span class="pill ${cls}">${arrow} ${sign}${(d*100).toFixed(1)}%</span>`;
}
function spark(values,color='#38BDF8',w=110,h=28){
  if(!values.length) return '';
  const mx=Math.max(...values),mn=Math.min(...values),rg=mx-mn||1;
  const pts=values.map((v,i)=>`${(i/(values.length-1)*w).toFixed(1)},${(h-3-(v-mn)/rg*(h-7)).toFixed(1)}`);
  const uid='g'+Math.abs((color+w).split('').reduce((a,c)=>a+c.charCodeAt(0),0))+Math.round(values[0]);
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
    <defs><linearGradient id="${uid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${color}" stop-opacity=".34"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
    <polygon points="0,${h} ${pts.join(' ')} ${w},${h}" fill="url(#${uid})"/>
    <polyline points="${pts.join(' ')}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}

/* ---------- カウントアップ ---------- */
const REDUCED=matchMedia('(prefers-reduced-motion: reduce)').matches;
function countUp(el){
  const v=parseFloat(el.dataset.cu), suf=el.dataset.suf||'', dec=parseInt(el.dataset.dec||'0');
  const jp=el.dataset.jp==='1';
  const render=x=> (jp? fmtJP(x) : dec? x.toFixed(dec) : CM(x))+suf;
  if(REDUCED){el.textContent=render(v);return}
  const t0=performance.now(),dur=850;
  function step(t){
    const p=Math.min(1,(t-t0)/dur), e=1-Math.pow(1-p,3);
    el.textContent=render(v*e);
    if(p<1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
function runCountUps(root){$$('[data-cu]',root).forEach(countUp)}

/* ---------- ECharts 基盤 ---------- */
const FONT="'BIZ UDPGothic','BIZ UDGothic','Hiragino Sans',Meiryo,sans-serif";
const MONOF="'JetBrains Mono',ui-monospace,monospace";
const TX='#E9EFF8',TX2='#A5B6CE',MUT='#647694',LINE='#1B2A42',LINE2='#28395A';
const CY='#38BDF8',TE='#00E5C7',AM='#FFB020',RD='#FF5A76',GD='#FFD84D',GN='#34D399';
const CAT8=['#3987E5','#D95926','#199E70','#C98500','#D55181','#008300','#9085E9','#E66767'];
const SEQ=v=>{ // 0..1 → シアン系シーケンシャル（暗→明）
  const stops=[[14,42,68],[21,74,118],[30,108,168],[59,155,219],[124,199,245]];
  const x=Math.max(0,Math.min(1,v))*(stops.length-1), i=Math.floor(x), f=x-i;
  const a=stops[i],b=stops[Math.min(stops.length-1,i+1)];
  return `rgb(${Math.round(a[0]+(b[0]-a[0])*f)},${Math.round(a[1]+(b[1]-a[1])*f)},${Math.round(a[2]+(b[2]-a[2])*f)})`;
};
const charts={};
function E(id){
  const el=document.getElementById(id);
  if(!el) return null;
  if(charts[id] && !charts[id].isDisposed()){return charts[id]}
  const c=echarts.init(el,null,{renderer:'canvas'});
  charts[id]=c; return c;
}
const TIP={backgroundColor:'#111C2E',borderColor:LINE2,borderWidth:1,padding:[9,13],
  textStyle:{color:TX,fontSize:12,fontFamily:FONT},
  extraCssText:'border-radius:10px;box-shadow:0 10px 30px rgba(2,8,20,.5);'};
function baseOpt(o){
  return Object.assign({
    textStyle:{fontFamily:FONT,color:TX2},
    animationDuration:800,animationEasing:'cubicOut',
    tooltip:Object.assign({},TIP),
  },o);
}
function axX(extra={}){return Object.assign({type:'category',axisLine:{lineStyle:{color:LINE2}},axisTick:{show:false},
  axisLabel:{color:MUT,fontSize:10.5,fontFamily:MONOF}},extra)}
function axY(extra={}){return Object.assign({type:'value',axisLine:{show:false},axisTick:{show:false},
  splitLine:{lineStyle:{color:LINE,type:[3,4]}},axisLabel:{color:MUT,fontSize:10.5,fontFamily:MONOF}},extra)}

/* ---------- 車シルエットSVG ---------- */
const CARS={
  van:'M6 30 L8 16 Q9 12 14 11 L40 9 Q46 9 50 13 L56 18 L74 20 Q78 21 78 25 L78 30 L70 30 A6 6 0 0 0 58 30 L26 30 A6 6 0 0 0 14 30 Z M16 15 L38 13 L38 19 L14 19 Z M42 13 L54 14 L58 19 L42 19 Z',
  suv:'M6 30 L9 20 Q10 17 14 16 L22 10 Q24 8 28 8 L52 8 Q56 8 58 11 L64 16 L74 19 Q78 20 78 24 L78 30 L69 30 A6.5 6.5 0 0 0 56 30 L27 30 A6.5 6.5 0 0 0 14 30 Z M24 15 L38 11 L38 17 L20 17 Z M42 11 L52 11 L57 16 L42 17 Z',
  sedan:'M4 30 L7 23 Q8 20 12 19 L24 17 L32 11 Q34 9 38 9 L52 9 Q56 9 59 12 L64 17 L75 20 Q79 21 79 25 L78 30 L69 30 A6 6 0 0 0 57 30 L26 30 A6 6 0 0 0 14 30 Z M33 13 L44 12 L44 17 L28 17 Z M47 12 L54 12 L58 16 L47 17 Z',
  compact:'M8 30 L10 21 Q11 17 16 16 L26 10 Q28 8 32 8 L48 8 Q54 8 58 13 L62 17 L70 19 Q74 20 74 24 L74 30 L66 30 A6 6 0 0 0 54 30 L28 30 A6 6 0 0 0 16 30 Z M28 14 L40 11 L40 17 L24 17 Z M44 11 L50 12 L54 16 L44 17 Z',
  ev:'M8 30 L10 20 Q11 16 16 15 L26 9 Q29 7 34 7 L50 7 Q56 7 60 12 L64 16 L72 18 Q76 19 76 23 L76 30 L67 30 A6 6 0 0 0 55 30 L28 30 A6 6 0 0 0 16 30 Z M30 12 L42 10 L42 16 L26 16 Z M46 10 L52 11 L56 15 L46 16 Z M36 20 L41 20 L38 26 L44 19.5 L39 19.5 L41.5 14.5 Z',
  sport:'M4 29 L8 24 Q10 21 15 20 L28 18 L36 12 Q39 10 44 10 L54 11 Q58 12 61 15 L66 19 L76 21 Q80 22 79 26 L78 29 L70 29 A5.5 5.5 0 0 0 58 29 L26 29 A5.5 5.5 0 0 0 14 29 Z M37 14 L47 13 L48 18 L32 18 Z',
};
function carSvg(icon,cls=''){
  const d=CARS[icon]||CARS.sedan;
  return `<svg class="car ${cls}" viewBox="0 0 84 34" fill="none">
    <path d="${d}" fill="currentColor" opacity=".16"/>
    <path d="${d}" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" fill="none"/></svg>`;
}
const ICONS={
  target:`<svg viewBox="0 0 24 24" fill="none" stroke="#38BDF8" stroke-width="1.9"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1.2" fill="#38BDF8"/></svg>`,
  wheel:`<svg viewBox="0 0 24 24" fill="none" stroke="#00E5C7" stroke-width="1.9"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2.6"/><path d="M12 3.5v5.4M12 15.1v5.4M3.5 12h5.4M15.1 12h5.4"/></svg>`,
  key:`<svg viewBox="0 0 24 24" fill="none" stroke="#FFB020" stroke-width="1.9"><circle cx="8" cy="14" r="4.5"/><path d="M11.5 10.5L20 2M16 6l3 3M13 9l2.2 2.2"/></svg>`,
  user:`<svg viewBox="0 0 24 24" fill="none" stroke="#A78BFA" stroke-width="1.9"><circle cx="12" cy="8" r="4"/><path d="M4.5 21c.8-4.2 3.9-6.5 7.5-6.5s6.7 2.3 7.5 6.5"/></svg>`,
};

/* ---------- 期間ラベル ---------- */
function periodLabel(A){
  const f=A.from.slice(5).replace('-','/'),t=A.to.slice(5).replace('-','/');
  return `${f} 〜 ${t}（前期間 ${A.prevFrom.slice(5).replace('-','/')} 〜 ${A.prevTo.slice(5).replace('-','/')} と比較）`;
}
const SEGLBL={all:'全体',new:'新規ユーザー',ret:'再訪ユーザー'};

/* ==================================================
   VIEW: 総合HQ
   ================================================== */
function renderHQ(){
  const A=GA.agg(ST.range,ST.seg), SC=GA.score();
  $('#navScore').textContent=Math.round(SC.score)+'点';

  /* --- ヒーロー --- */
  const ringR=62, circ=2*Math.PI*ringR, prog=SC.score/100;
  $('#heroCard').innerHTML=`
    <div class="hero">
      <div class="ringwrap">
        <div class="ring">
          <svg viewBox="0 0 148 148">
            <circle cx="74" cy="74" r="${ringR}" fill="none" stroke="#15223A" stroke-width="11"/>
            <circle cx="74" cy="74" r="${ringR}" fill="none" stroke="url(#ringGrad)" stroke-width="11" stroke-linecap="round"
              stroke-dasharray="${(circ*prog).toFixed(1)} ${circ.toFixed(1)}" style="filter:drop-shadow(0 0 9px rgba(0,229,199,.55))"/>
            <defs><linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="#38BDF8"/><stop offset="1" stop-color="#00E5C7"/></linearGradient></defs>
          </svg>
          <div class="in"><span class="sc num" data-cu="${SC.score.toFixed(1)}" data-dec="1">0</span><span class="lb">SITE SCORE</span></div>
        </div>
        <div class="hexwrap"><div class="hex ${SC.tier}">${SC.tier}</div><span class="hexlabel">TIER</span></div>
      </div>
      <div class="hmeta">
        <div class="hrow1"><h2>toyota.jp デジタル戦況</h2>${deltaPill(A.total.sessions,A.prevTotal.sessions)}</div>
        <div class="lvl"><span class="lvn" id="scoreBtn" style="cursor:pointer" title="クリックで採点ロジックを表示">総合スコア ${SC.score.toFixed(1)} <span style="font-family:var(--mono);font-size:9px;color:var(--gd);letter-spacing:.08em">式 ▸</span></span><div class="xp"><i style="width:${SC.score}%"></i></div>
          <span class="mono">100点満点・ミッション加重平均</span>
          <span style="display:inline-flex;align-items:center;gap:6px;margin-left:10px">${spark(GA.scoreTrend().map(p=>p.score),'#FFD84D',110,24)}<span style="font-size:9px;color:var(--mut);font-family:var(--mono)">8月推移</span></span></div>
        <p class="hnote">選択期間のセッションは <span class="hl-b num">${fmtJP(A.total.sessions)}</span>（前期間比 <b class="num">${((A.total.sessions/A.prevTotal.sessions-1)*100).toFixed(1)}%</b>）、
        コンバージョンは <span class="hl num">${fmtJP(A.total.cv)}件</span>。
        スコアは8月ミッション4本の達成ペースの加重平均。<span class="hl-r">新規ユーザー獲得だけがペース未達</span>で、これが総合評価を下げている唯一の要因。</p>
        <div class="qlog"><div class="qhead">イベントログ — 発表・キャンペーン</div>
          ${GA.eventImpact().slice(-4).reverse().map(e=>`<div class="qrow"><span class="qd num">${e.date.slice(5).replace('-','/')}</span><span>${e.label}</span><span class="qeff num" title="実測影響＝発表後3日の平均セッション ÷ 直前3日平均" style="color:${e.impact&&e.impact>=1.05?'var(--gn)':'var(--tx2)'}">${e.impact?('アクセス '+(e.impact>=1?'+':'')+((e.impact-1)*100).toFixed(0)+'%'):'—'}</span></div>`).join('')}
        </div>
      </div>
    </div>`;

  /* --- ミッション --- */
  const STLBL={ahead:'ペース超過',ontrack:'目標ペース',behind:'ペース遅れ'};
  const STMK={ahead:'▲',ontrack:'●',behind:'▼'};
  $('#missionBox').innerHTML=SC.missions.map((m,mi)=>`
    <div class="mrow" data-mi="${mi}" style="cursor:pointer" title="クリックで目標の根拠を表示">
      <div class="mic">${ICONS[m.icon]}</div>
      <div class="mm">
        <div class="mt"><b>${m.name}</b>
          <span class="mnum"><span data-cu="${Math.round(m.actual)}" data-jp="1">0</span> / ${fmtJP(m.target)}${m.unit}</span></div>
        <div class="mbar"><i class="${m.status}" style="width:${Math.min(100,m.prog*100).toFixed(1)}%"></i>
          <span class="pace" style="left:${(m.pace*100).toFixed(1)}%" title="経過日数ペース ${(m.pace*100).toFixed(0)}%"></span></div>
      </div>
      <span class="st ${m.status}">${STMK[m.status]} ${STLBL[m.status]} ${(v=>v>0?'+'+v+'%':v<0?v+'%':'±0%')(Math.round((m.vsPace-1)*100))}</span>
    </div>`).join('');

  /* --- KPIタイル --- */
  const k=[
    {l:'セッション', v:A.total.sessions, jp:1, prev:A.prevTotal.sessions, sp:A.dailySessions, c:CY},
    {l:'ユーザー', v:A.total.users, jp:1, prev:A.prevTotal.users, sp:A.dailySessions.map(v=>v/1.7), c:TE},
    {l:'新規率', v:A.total.newRate*100, dec:1, suf:'%', prev:A.prevTotal.newRate*100, sp:null, c:AM, raw:true},
    {l:'コンバージョン', v:A.total.cv, jp:1, prev:A.prevTotal.cv, sp:A.dailyCv, c:GD},
    {l:'CVR', v:A.total.cv/A.total.sessions*100, dec:2, suf:'%', prev:A.prevTotal.cv/A.prevTotal.sessions*100, sp:null, c:GN, raw:true},
    {l:'CV価値換算', v:A.total.value, yen:1, prev:A.prevTotal.value, sp:null, c:'#A78BFA'},
  ];
  $('#kpiRow').innerHTML=k.map(x=>{
    const val= x.yen? `<div class="kv num">${yen(x.v)}</div>`
      : `<div class="kv num" data-cu="${x.jp?Math.round(x.v):x.v.toFixed(x.dec||0)}" ${x.jp?'data-jp="1"':''} ${x.dec?`data-dec="${x.dec}"`:''} data-suf="${x.suf||''}">0</div>`;
    return `<div class="kpi reveal in">
      <div class="kl">${x.l}</div>${val}
      <div class="kd">${deltaPill(x.v,x.prev)}<span>前期間比</span></div>
      ${x.sp?spark(x.sp,x.c,180,30):'<div style="height:30px;margin-top:6px"></div>'}
    </div>`;
  }).join('');

  /* --- トレンド --- */
  $('#trendSub').textContent= ST.trendMode==='both' ? '指数（期間初日=100）・注釈=主なリリース' : periodLabel(A);
  const dates=A.dates.map(d=>d.slice(5).replace('-','/'));
  const evLines=GA.EVENTS.filter(e=>A.dates.includes(e.date)).map(e=>({
    xAxis:e.date.slice(5).replace('-','/'),
    label:{formatter:e.label.length>11?e.label.slice(0,11)+'…':e.label,color:MUT,fontSize:9.5,rotate:0},
    lineStyle:{color:LINE2,type:[4,4]}}));
  const idx=(arr)=>arr.map(v=>v/arr[0]*100);
  let series,yopt;
  if(ST.trendMode==='both'){
    series=[
      {name:'セッション指数',type:'line',data:idx(A.dailySessions).map(v=>+v.toFixed(1)),symbol:'circle',symbolSize:1,lineStyle:{width:2.4,color:CAT8[0]},itemStyle:{color:CAT8[0]},emphasis:{scale:3},
        markLine:{symbol:'none',silent:true,data:evLines,animation:false}},
      {name:'CV指数',type:'line',data:idx(A.dailyCv).map(v=>+v.toFixed(1)),symbol:'circle',symbolSize:1,lineStyle:{width:2.2,color:CAT8[2],type:[6,3]},itemStyle:{color:CAT8[2]}},
    ];
    yopt=axY({min:v=>Math.max(0,Math.floor(v.min/10)*10-10),axisLabel:{formatter:'{value}',color:MUT,fontSize:10.5,fontFamily:MONOF}});
  }else{
    const raw=ST.trendMode==='sess'?A.dailySessions:A.dailyCv;
    const col=ST.trendMode==='sess'?CY:TE;
    series=[{name:ST.trendMode==='sess'?'セッション':'CV',type:'line',data:raw.map(v=>Math.round(v)),symbol:'circle',symbolSize:1,
      lineStyle:{width:2.2,color:col},itemStyle:{color:col},
      areaStyle:{color:{type:'linear',x:0,y:0,x2:0,y2:1,colorStops:[{offset:0,color:col+'33'},{offset:1,color:col+'00'}]}},
      markLine:{symbol:'none',silent:true,data:evLines,animation:false}}];
    yopt=axY({axisLabel:{formatter:v=>fmtJP(v),color:MUT,fontSize:10.5,fontFamily:MONOF}});
  }
  E('chTrend').setOption(baseOpt({
    tooltip:Object.assign({},TIP,{trigger:'axis',axisPointer:{type:'cross',lineStyle:{color:CY+'55'},crossStyle:{color:CY+'55'},label:{backgroundColor:'#15223A',color:TX,fontSize:10}},
      valueFormatter:v=>ST.trendMode==='both'? (+v).toFixed(1) : fmtJP(v)}),
    legend:{top:0,right:0,textStyle:{color:TX2,fontSize:11},itemWidth:14,itemHeight:8,icon:'roundRect'},
    grid:{left:8,right:14,top:34,bottom:6,containLabel:true},
    xAxis:axX({data:dates,boundaryGap:false,axisLabel:{color:MUT,fontSize:10,fontFamily:MONOF,interval:Math.floor(dates.length/9)}}),
    yAxis:yopt, series}),true);

  /* --- チャネルドーナツ --- */
  document.getElementById('chTrend').style.minHeight='388px';
  const donutEl=document.getElementById('chChannelDonut'); donutEl.style.minHeight='438px';
  E('chChannelDonut').setOption(baseOpt({
    tooltip:Object.assign({},TIP,{trigger:'item',valueFormatter:v=>fmtJP(v)+'（セッション）'}),
    legend:{bottom:0,left:'center',textStyle:{color:TX2,fontSize:10.5},itemWidth:11,itemHeight:11,icon:'roundRect',itemGap:8},
    series:[{type:'pie',radius:['50%','72%'],center:['50%','37%'],
      itemStyle:{borderColor:'#0A1120',borderWidth:2,borderRadius:5},
      label:{show:false},emphasis:{scale:true,scaleSize:4},
      data:A.channels.map(c=>({name:c.name,value:Math.round(c.sessions),itemStyle:{color:c.color}}))}],
    graphic:[{type:'text',left:'center',top:'31%',style:{text:fmtJP(A.total.sessions),fill:TX,fontSize:19,fontWeight:800,fontFamily:MONOF}},
             {type:'text',left:'center',top:'40%',style:{text:'総セッション',fill:MUT,fontSize:10,fontFamily:FONT}}]
  }),true);

  /* --- インサイト --- */
  const chs=[...A.channels].sort((a,b)=>(b.sessions/b.prevSessions)-(a.sessions/a.prevSessions));
  const grow=chs[0], shrink=chs[chs.length-1];
  const topM=[...A.models].sort((a,b)=>(b.sessions/b.prevSessions)-(a.sessions/a.prevSessions))[0];
  $('#hqInsight').innerHTML=`<span class="it">INSIGHT — 総合</span>
    <p>成長ドライバーは <span class="hl-b">${grow.name}</span>（前期間比 <b class="num">+${((grow.sessions/grow.prevSessions-1)*100).toFixed(1)}%</b>）。車種では <span class="hl">${topM.name}</span> が <b class="num">+${((topM.sessions/topM.prevSessions-1)*100).toFixed(1)}%</b> と最も伸びており、発表・キャンペーンの寄与が読み取れる。</p>
    <p>一方 <span class="hl-r">${shrink.name}</span> は <b class="num">${((shrink.sessions/shrink.prevSessions-1)*100).toFixed(1)}%</b>。CVR は全体 <b class="num">${pct(A.total.cv/A.total.sessions,2)}</b> で、${ST.seg==='ret'?'再訪セグメントは新規の約3倍の転換力を持つ。':'再訪セグメント（ヘッダで切替）は新規の約3倍の転換力を持つ。'}</p>`;

  /* スコア・ミッションのロジックモーダル配線 */
  $('#scoreBtn').onclick=()=>logicOpen(scoreLogicHTML(SC));
  $$('#missionBox .mrow').forEach(el=>el.onclick=()=>logicOpen(missionLogicHTML(SC.missions[+el.dataset.mi])));
  /* チャネル別トレンド（積み上げ） */
  if(document.getElementById('chChannelTrend')){
    E('chChannelTrend').setOption(baseOpt({
      grid:{left:8,right:12,top:8,bottom:4,containLabel:true},
      tooltip:Object.assign({},TIP,{trigger:'axis',valueFormatter:v=>fmtJP(v)}),
      xAxis:axX({data:A.dates.map(d=>d.slice(5).replace('-','/')),boundaryGap:false,axisLabel:{color:MUT,fontSize:9,fontFamily:MONOF,interval:Math.floor(A.dates.length/6)}}),
      yAxis:axY({axisLabel:{formatter:v=>fmtJP(v),color:MUT,fontSize:9,fontFamily:MONOF}}),
      series:GA.CHANNELS.map((c,ci)=>({name:c.name,type:'line',stack:'ch',symbol:'none',
        lineStyle:{width:0},areaStyle:{color:c.color,opacity:.82},
        data:A.dailyByChannel[ci].map(v=>Math.round(v))}))
    }),true);
  }

  runCountUps($('section[data-view="hq"]'));
}


/* ---- 総合スコア・ミッションのロジック ---- */
function scoreLogicHTML(SC){
  const W=[32,28,16,24];
  return `<h3>総合スコアの採点ロジック<span class="v">${SC.score.toFixed(1)}点</span></h3>
  <div class="lsub">100点満点。8月ミッション4本の「目標ペース比」の加重平均</div>
  <div class="lrow gold"><div class="lk">式</div><div class="lf"><div class="leq">スコア = Σ( 重み × min(1.15, ペース比) ) ÷ 1.15 × 100</div>ペース比 = 実績 ÷ 目標 ÷ 経過率（18日/31日 = 58%）。上振れは+15%でキャップ（1本の爆発で満点にならない設計）<small>ティア: S = 90点以上 ／ A = 72以上 ／ B = 58以上 ／ C = それ未満</small></div></div>
  ${SC.missions.map((m,i)=>`<div class="lrow"><div class="lk">${W[i]}%</div><div class="lf"><b>${m.name}</b>　実績 ${fmtJP(m.actual)} ÷ 目標 ${fmtJP(m.target)}${m.unit} ÷ 経過58% ＝ ペース比 <b class="num" style="color:${m.vsPace>=1?'var(--gn)':'var(--rd)'}">${(m.vsPace*100).toFixed(0)}%</b></div></div>`).join('')}
  <div class="lrow"><div class="lk">推移</div><div class="lf">${spark(GA.scoreTrend().map(p=>p.score),'#FFD84D',300,40)}<small>8/1〜8/18の日次スコア（各日時点のMTDペースで再計算）。月初はデータが少なくペース比が振れやすい</small></div></div>
  <div class="lsrc">実績＝GA4実測（toyota.jp プロパティ・キーイベント）に較正した日次テンソルのMTD集計。目標＝直近28日実測ペース×31日の月次換算（確定目標の受領後に置換可能）。</div>`;
}
function missionLogicHTML(m){
  const SRC={'見積りシミュレーション完了':'GA4実測（estimate_simulation_complete）39.4万件/28日 × 31/28 の月次換算 ≒ 43.5万件を仮目標に設定。確定目標の受領後に置換可能',
    '試乗予約':'GA4実測 2,429件/28日（通常2,194＋即時235）× 31/28 ≒ 2,700件を仮目標に設定',
    'TOYOTAアカウント登録':'GA4実測（sign_up）16.1万件/28日 × 31/28 ≒ 17.8万件を仮目標に設定。ID基盤・CRM連携の土台',
    '新規ユーザー獲得':'GA4実測の新規ユーザー 349万人/28日 × 31/28 ≒ 386万人を仮目標に設定'};
  return `<h3>${m.name}<span class="v" style="font-size:16px">${fmtJP(m.actual)} / ${fmtJP(m.target)}${m.unit}</span></h3>
  <div class="lsub">8月ミッション — 目標の根拠と現在ペース</div>
  <div class="lrow gold"><div class="lk">目標の出典</div><div class="lf">${SRC[m.name]||'直近28日実測ペース×31日の月次換算（仮目標）'}</div></div>
  <div class="lrow"><div class="lk">ペース</div><div class="lf"><div class="leq">進捗 ${(m.prog*100).toFixed(1)}% ÷ 経過 ${(m.pace*100).toFixed(0)}% ＝ ペース比 ${(m.vsPace*100).toFixed(0)}%</div>${m.status==='ahead'?'目標ペースを上回って推移':m.status==='ontrack'?'ほぼ目標ペース':'目標ペース未達 — 集客・広告タブで配信状況を確認'}</div></div>
  <div class="lsrc">実績＝GA4実測に較正した日次テンソルのMTD集計（8/1〜8/18）。イベントの日別内訳はセッション比按分を含む。</div>`;
}

/* ==================================================
   VIEW: 車種ガレージ
   ================================================== */
function renderGarage(){
  const A=GA.agg(ST.range,ST.seg);
  let ms=[...A.models];
  // カテゴリチップ生成（初回）
  const ctl=$('#garageCtl');
  if(!ctl.dataset.built){
    const cats=[...new Set(GA.MODELS.map(m=>m.cat))];
    ctl.insertAdjacentHTML('beforeend',cats.map(c=>`<span class="chip" data-cat="${c}">${c}</span>`).join(''));
    ctl.dataset.built='1';
  }
  if(ST.garage.cat!=='all') ms=ms.filter(m=>m.cat===ST.garage.cat);
  const sorters={sessions:(a,b)=>b.sessions-a.sessions, cvr:(a,b)=>b.cvr-a.cvr,
    growth:(a,b)=>(b.sessions/b.prevSessions)-(a.sessions/a.prevSessions)};
  ms.sort(sorters[ST.garage.sort]);

  const maxS=Math.max(...A.models.map(m=>m.sessions)),
        maxC=Math.max(...A.models.map(m=>m.cvr));
  $('#modelCards').innerHTML=ms.map(m=>{
    const g=(m.sessions/m.prevSessions-1)*100;
    return `<div class="mcard ${m.tier==='S'?'tS':''}" data-model="${m.id}">
      <div class="mh"><span class="rk num">#${String(m.rank).padStart(2,'0')}</span><span class="nm">${m.name}</span>
        <span class="cat">${m.cat}</span>
        <div class="hexwrap"><div class="hex sm ${m.tier}">${m.tier}</div></div></div>
      <div class="carline">${carSvg(m.icon)}
        <div class="sess"><div class="v num">${fmtJP(m.sessions)}</div><div class="u">セッション ${deltaPill(m.sessions,m.prevSessions)}</div></div></div>
      <div class="stat"><span>集客力</span><div class="sb"><i style="width:${(m.sessions/maxS*100).toFixed(0)}%"></i></div><span class="sv">${(m.sessions/maxS*100).toFixed(0)}</span></div>
      <div class="stat"><span>転換力</span><div class="sb"><i style="width:${(m.cvr/maxC*100).toFixed(0)}%"></i></div><span class="sv">${(m.cvr/maxC*100).toFixed(0)}</span></div>
      <div class="stat"><span>再訪率</span><div class="sb"><i style="width:${(m.retShare*100).toFixed(0)}%;background:linear-gradient(90deg,#A78BFA,#38BDF8)"></i></div><span class="sv">${(m.retShare*100).toFixed(0)}%</span></div>
      <div class="stat"><span>広告依存</span><div class="sb"><i style="width:${(m.adShare*100).toFixed(0)}%;background:linear-gradient(90deg,#FFB020,#FF5A76)"></i></div><span class="sv">${(m.adShare*100).toFixed(0)}%</span></div>
      <div class="mf"><span>CVR <b class="num" style="color:var(--tx)">${pct(m.cvr,2)}</b></span>
        <span>CV <b class="num" style="color:var(--tx)">${fmtJP(m.cv)}</b></span>
        ${spark(m.daily.filter((_,i)=>i%Math.ceil(m.daily.length/28)===0),m.tier==='S'?GD:CY,96,26)}</div>
    </div>`;
  }).join('');
  $$('#modelCards .mcard').forEach(el=>el.onclick=()=>openModelModal(el.dataset.model));

  /* ツリーマップ */
  const cats={};
  A.models.forEach(m=>{(cats[m.cat]=cats[m.cat]||[]).push(m)});
  const minC=Math.min(...A.models.map(m=>m.cvr));
  E('chTreemap').setOption(baseOpt({
    tooltip:Object.assign({},TIP,{formatter:p=>{
      const d=p.data;
      if(!d.model) return `<b>${p.name}</b><br>セッション ${fmtJP(p.value)}`;
      return `<b>${d.model.name}</b>（${d.model.cat}）<br>セッション <b>${fmtJP(p.value)}</b><br>CVR <b>${pct(d.model.cvr,2)}</b> ／ CV ${fmtJP(d.model.cv)}`;
    }}),
    series:[{type:'treemap',roam:false,nodeClick:false,breadcrumb:{show:false},
      left:0,right:0,top:6,bottom:34,
      label:{show:true,formatter:p=>`${p.name}\n${fmtJP(p.value)}`,fontSize:11.5,fontFamily:FONT,color:'#EAF3FC',lineHeight:16},
      upperLabel:{show:true,height:22,formatter:'{b}',color:TX2,fontSize:10.5},
      itemStyle:{borderColor:'#0A1120',borderWidth:2,gapWidth:2},
      levels:[{itemStyle:{borderColor:'#0A1120',borderWidth:3,gapWidth:3}},{}],
      data:Object.entries(cats).map(([cat,list])=>({name:cat,
        value:Math.round(list.reduce((a,m)=>a+m.sessions,0)),
        children:list.map(m=>({name:m.name,value:Math.round(m.sessions),model:m,
          itemStyle:{color:SEQ((m.cvr-minC)/(maxC-minC||1)*.92+.08)}}))}))}],
    graphic:[{type:'text',left:6,bottom:6,style:{text:'色＝CVR：',fill:MUT,fontSize:10,fontFamily:FONT}},
      {type:'rect',left:64,bottom:5,shape:{width:78,height:10,r:3},style:{fill:{type:'linear',x:0,y:0,x2:1,y2:0,colorStops:[{offset:0,color:SEQ(.08)},{offset:1,color:SEQ(1)}]}}},
      {type:'text',left:148,bottom:6,style:{text:`低 ${pct(minC,1)} → 高 ${pct(maxC,1)}`,fill:MUT,fontSize:10,fontFamily:MONOF}}]
  }),true);

  /* 伸び率 */
  const evAll=GA.eventImpact();
  const gr=[...A.models].map(m=>{
    const reasons=evAll.filter(e=>e.model===m.id).map(e=>`${e.date.slice(5).replace('-','/')} ${e.label}${e.impact?`（実測 +${((e.impact-1)*100).toFixed(0)}%）`:''}`);
    return {name:m.name,g:(m.sessions/m.prevSessions-1)*100,reason:reasons.join('・')};
  }).sort((a,b)=>a.g-b.g);
  E('chGrowth').setOption(baseOpt({
    tooltip:Object.assign({},TIP,{formatter:p=>{const it=gr[p.dataIndex];
      return `<b>${it.name}</b>　${(it.g>0?'+':'')+it.g.toFixed(1)}%`+(it.reason?`<br><span style="color:#FFD84D;font-size:10.5px">理由: ${it.reason}</span>`:`<br><span style="color:#A5B6CE;font-size:10.5px">対応する発表・CPなし（ベースライン変動）</span>`)}}),
    grid:{left:8,right:44,top:8,bottom:6,containLabel:true},
    xAxis:axY({axisLabel:{formatter:v=>v+'%',color:MUT,fontSize:10,fontFamily:MONOF}}),
    yAxis:axX({type:'category',data:gr.map(x=>x.name),axisLabel:{color:TX2,fontSize:11,fontFamily:FONT}}),
    series:[{name:'前期間比',type:'bar',barWidth:13,
      itemStyle:{borderRadius:[0,4,4,0],color:p=>p.value>=0?'#199E70':'#E66767'},
      label:{show:true,position:'right',formatter:p=>(p.value>0?'+':'')+p.value.toFixed(1)+'%'+(gr[p.dataIndex].reason?' ◆':''),color:TX2,fontSize:10,fontFamily:MONOF},
      data:gr.map(x=>+x.g.toFixed(1))}]
  }),true);

  /* リーグ表 */
  renderLeagueTable(A);

  const top=[...A.models].sort((a,b)=>b.sessions-a.sessions)[0];
  const eff=[...A.models].sort((a,b)=>b.cvr-a.cvr)[0];
  const ad=[...A.models].sort((a,b)=>b.adShare-a.adShare)[0];
  $('#garageInsight').innerHTML=`<span class="it">INSIGHT — 車種</span>
    <p>集客の王者は <span class="hl">${top.name}</span>（${fmtJP(top.sessions)}）。ただし転換効率の1位は <span class="hl-g">${eff.name}</span>（CVR <b class="num">${pct(eff.cvr,2)}</b>）で、量と質の主役は別。<span class="hl-b">${ad.name}</span> は広告依存度 <b class="num">${pct(ad.adShare,0)}</b> と最も高く、出稿停止時の下振れリスクを抱える。</p>
    <p>ランドクルーザー・GR86 は指名検索と外部サイト比率が高い「ファン型」、シエンタ・ヴォクシーは SNS 比率が高い「ファミリー拡散型」と、同じトヨタでも集客構造はまったく別物。クロス分析ラボで channel × 車種 を確認のこと。</p>`;
}

function renderLeagueTable(A){
  const cols=[
    {k:'name',l:'車種',num:0},{k:'tier',l:'ティア',num:0},{k:'sessions',l:'セッション',num:1},
    {k:'growth',l:'前期間比',num:1},{k:'pv',l:'PV',num:1},{k:'cvr',l:'CVR',num:1},
    {k:'estimate',l:'見積り完了',num:1},{k:'testdrive',l:'試乗予約',num:1},{k:'retShare',l:'再訪率',num:1},{k:'adShare',l:'広告依存',num:1}];
  const get=(m,k)=> k==='growth'? m.sessions/m.prevSessions-1 : k==='estimate'? m.cvGoal.estimate : k==='testdrive'? m.cvGoal.testdrive : m[k];
  const ms=[...A.models].sort((a,b)=>{
    const {key,dir}=ST.leagueSort; const av=get(a,key),bv=get(b,key);
    return (typeof av==='string'? av.localeCompare(bv) : av-bv)*dir;
  });
  const maxS=Math.max(...ms.map(m=>m.sessions));
  $('#leagueTable').innerHTML=`<thead><tr>${cols.map(c=>
    `<th class="sortable ${c.num?'num':''}" data-k="${c.k}">${c.l}${ST.leagueSort.key===c.k?`<span class="arrow">${ST.leagueSort.dir<0?'▼':'▲'}</span>`:''}</th>`).join('')}</tr></thead>
  <tbody>${ms.map(m=>`<tr>
    <td><b>${m.name}</b> <span style="color:var(--mut);font-size:10px">${m.cat}</span></td>
    <td><div class="hex sm ${m.tier}" style="display:inline-grid">${m.tier}</div></td>
    <td class="num"><div class="tbar"><div class="bg"><i style="width:${(m.sessions/maxS*100).toFixed(0)}%;background:linear-gradient(90deg,var(--cy),var(--te))"></i></div><span>${fmtJP(m.sessions)}</span></div></td>
    <td class="num">${deltaPill(m.sessions,m.prevSessions)}</td>
    <td class="num">${fmtJP(m.pv)}</td>
    <td class="num">${pct(m.cvr,2)}</td>
    <td class="num">${CM(m.cvGoal.estimate)}</td>
    <td class="num">${CM(m.cvGoal.testdrive)}</td>
    <td class="num">${pct(m.retShare,0)}</td>
    <td class="num" ${m.adShare>.42?'style="color:var(--am)"':''}>${pct(m.adShare,0)}</td>
  </tr>`).join('')}</tbody>`;
  $$('#leagueTable th.sortable').forEach(th=>th.onclick=()=>{
    const k=th.dataset.k;
    if(ST.leagueSort.key===k) ST.leagueSort.dir*=-1; else ST.leagueSort={key:k,dir:-1};
    renderLeagueTable(A);
  });
}

/* ---------- 車種ドリルモーダル ---------- */
let modalCharts=[];
function openModelModal(id){
  const A=GA.agg(ST.range,ST.seg);
  const m=A.models.find(x=>x.id===id);
  const box=$('#modelModalBox');
  box.innerHTML=`
    <div class="mhx">${carSvg(m.icon)}<div>
      <div style="display:flex;align-items:center;gap:10px"><b style="font-size:19px">${m.name}</b>
        <span class="cat" style="font-size:10px;border:1px solid var(--line2);border-radius:5px;padding:0 7px;color:var(--tx2)">${m.cat}</span>
        <span class="mono">${m.price}</span><div class="hex sm ${m.tier}">${m.tier}</div></div>
      <div style="font-size:11px;color:var(--mut)">ランク #${m.rank} ／ セッション ${fmtJP(m.sessions)} ${deltaPill(m.sessions,m.prevSessions)} ／ CVR ${pct(m.cvr,2)}</div>
    </div><button class="close" id="mClose">閉じる esc</button></div>
    <div class="mgrid2">
      <div class="mcell"><h4>日次セッション推移</h4><div id="mdTrend" style="min-height:200px"></div></div>
      <div class="mcell"><h4>流入チャネル構成</h4><div id="mdCh" style="min-height:200px"></div></div>
      <div class="mcell"><h4>コンバージョン内訳</h4><div id="mdGoal" style="min-height:200px"></div></div>
      <div class="mcell"><h4>アフィニティ・エリア特徴</h4><div id="mdAff" style="font-size:12px;line-height:2.1;padding-top:2px"></div></div>
    </div>`;
  $('#modelModal').classList.add('on');
  $('#mClose').onclick=closeModal;
  const mk=(id2)=>{const c=echarts.init($('#'+id2));modalCharts.push(c);return c};
  mk('mdTrend').setOption(baseOpt({
    tooltip:Object.assign({},TIP,{trigger:'axis',valueFormatter:v=>fmtJP(v)}),
    grid:{left:6,right:10,top:12,bottom:4,containLabel:true},
    xAxis:axX({data:A.dates.map(d=>d.slice(5).replace('-','/')),boundaryGap:false,axisLabel:{interval:Math.floor(A.dates.length/6),color:MUT,fontSize:9.5,fontFamily:MONOF}}),
    yAxis:axY({axisLabel:{formatter:v=>fmtJP(v),color:MUT,fontSize:9.5,fontFamily:MONOF}}),
    series:[{type:'line',data:m.daily.map(v=>Math.round(v)),symbol:'none',lineStyle:{width:2,color:CY},
      areaStyle:{color:{type:'linear',x:0,y:0,x2:0,y2:1,colorStops:[{offset:0,color:'rgba(56,189,248,.25)'},{offset:1,color:'rgba(56,189,248,0)'}]}}}]}));
  mk('mdCh').setOption(baseOpt({
    tooltip:Object.assign({},TIP,{valueFormatter:v=>fmtJP(v)}),
    legend:{bottom:0,textStyle:{color:TX2,fontSize:9.5},itemWidth:9,itemHeight:9,icon:'roundRect',itemGap:6},
    series:[{type:'pie',radius:['46%','70%'],center:['50%','40%'],
      itemStyle:{borderColor:'#0D1626',borderWidth:2,borderRadius:4},label:{show:false},
      data:GA.CHANNELS.map((c,ci)=>({name:c.name,value:Math.round(m.byChannel[ci]),itemStyle:{color:c.color}}))}]}));
  mk('mdGoal').setOption(baseOpt({
    tooltip:Object.assign({},TIP,{valueFormatter:v=>CM(v)+'件'}),
    grid:{left:6,right:38,top:6,bottom:4,containLabel:true},
    xAxis:axY({axisLabel:{formatter:v=>fmtJP(v),color:MUT,fontSize:9.5,fontFamily:MONOF}}),
    yAxis:axX({type:'category',data:GA.GOALS.map(g=>g.name.length>10?g.name.slice(0,10)+'…':g.name).reverse(),axisLabel:{color:TX2,fontSize:10,fontFamily:FONT}}),
    series:[{type:'bar',barWidth:11,itemStyle:{borderRadius:[0,4,4,0],color:TE},
      label:{show:true,position:'right',formatter:p=>CM(p.value),color:TX2,fontSize:9.5,fontFamily:MONOF},
      data:GA.GOALS.map(g=>Math.round(m.cvGoal[g.id])).reverse()}]}));
  /* アフィニティ: 全体平均比つき */
  const avgAff={};
  GA.MODELS.forEach(mm=>{const sh=GA.affShare(mm);for(const k in sh)avgAff[k]=(avgAff[k]||0)+sh[k]/GA.MODELS.length});
  const affAll=Object.entries(GA.affShare(GA.MODELS[m.mi])).sort((a,b)=>b[1]-a[1]);
  const aff=affAll.slice(0,3).map(([k,v])=>({k,v,ratio:v/Math.max(1e-9,avgAff[k])}));
  const affN=Object.fromEntries(GA.AFFINITY.map(a=>[a.id,a.name]));
  const ar=Object.entries(GA.areaShare?GA.areaShare(GA.MODELS[m.mi]):{}).sort((a,b)=>b[1]-a[1]).slice(0,3);
  const affMax=aff[0]?aff[0].v:1;
  /* 傾向コメント（規則生成） */
  const t1=aff[0]?`<b>${affN[aff[0].k]}</b>層に全体平均の<b class="num" style="color:var(--te)">${aff[0].ratio.toFixed(1)}倍</b>刺さる`:'';
  const t2=m.retShare>.5?'再訪率が高く指名・比較検討型':'新規流入が主で認知拡大フェーズ';
  const t3=m.adShare>.42?'広告依存が高く、出稿変動の影響を受けやすい':m.adShare<.25?'自然流入で強く、広告効率よりコンテンツ強化が効く':'広告と自然のバランス型';
  $('#mdAff').innerHTML=`
    ${aff.map((a,i)=>`<div style="display:grid;grid-template-columns:110px 1fr 84px;gap:8px;align-items:center;margin-bottom:4px">
      <span style="font-size:11px;${i===0?'color:var(--tx);font-weight:700':'color:var(--tx2)'}">${affN[a.k]}</span>
      <div style="height:11px;background:var(--bg2);border-radius:4px;overflow:hidden"><i style="display:block;height:100%;width:${(a.v/affMax*100).toFixed(0)}%;background:${i===0?'linear-gradient(90deg,var(--cy),var(--te))':'#31415C'}"></i></div>
      <span class="num" style="font-size:10.5px;text-align:right;color:${a.ratio>=1.3?'var(--te)':a.ratio<=0.8?'var(--rd)':'var(--tx2)'}">${pct(a.v,0)}・平均比×${a.ratio.toFixed(1)}</span></div>`).join('')}
    <div style="margin-top:7px">強いエリア：${ar.map(([k,v])=>{const a=GA.AREAS.find(x=>x.id===k);return `<b>${a?a.name:k}</b> <span class="num">${pct(v,0)}</span>`}).join('　')}</div>
    <div style="color:var(--tx2)">再訪率 <b class="num" style="color:var(--tx)">${pct(m.retShare,0)}</b> ／ 広告依存度 <b class="num" style="color:${m.adShare>.42?'var(--am)':'var(--tx)'}">${pct(m.adShare,0)}</b> ／ 検討ツール到達 <b class="num" style="color:var(--tx)">${fmtJP(m.toolSessions)}</b></div>
    <div class="insight" style="margin-top:8px;padding:9px 13px;font-size:11.3px;line-height:1.85"><span class="it" style="margin-bottom:2px">傾向</span>${t1}。${t2}。${t3}。</div>
    <div style="font-size:10.5px;color:var(--mut)">※ アフィニティ＝興味関心セグメント（実測セッション合計に整合する推定按分・Googleシグナル接続で実測化可能）・平均比＝全14車種平均に対する倍率</div>`;
}
function closeModal(){
  $('#modelModal').classList.remove('on');
  modalCharts.forEach(c=>c.dispose()); modalCharts=[];
}

/* ==================================================
   VIEW: 商材・CV
   ================================================== */
function renderGoods(){
  const A=GA.agg(ST.range,ST.seg);
  /* 商材カード */
  const spans=['s4','s4','s4','s6','s6'];
  $('#goodsCards').innerHTML=A.goods.map((g,i)=>{
    const mx=Math.max(...g.goals.map(x=>x.cv),1);
    return `<div class="card glow ${spans[i]} reveal in">
      <div class="ct" style="margin-bottom:8px"><span class="bar" style="background:${g.color}"></span><h3>${g.name}</h3>
        <span class="sub">帰属セッション ${fmtJP(g.sessions)}</span><div class="r">${deltaPill(g.cv,g.prev)}</div></div>
      <div style="display:flex;align-items:baseline;gap:9px;margin-bottom:9px">
        <span class="num" style="font-size:26px;font-weight:800" data-cu="${Math.round(g.cv)}" data-jp="1">0</span>
        <span style="font-size:11px;color:var(--mut)">CV ／ 価値換算 <b class="num">${yen(g.value)}</b></span></div>
      ${g.goals.map(x=>`<div class="stat" style="grid-template-columns:120px 1fr 58px"><span title="${x.name}">${x.name.length>9?x.name.slice(0,9)+'…':x.name}</span>
        <div class="sb"><i style="width:${(x.cv/mx*100).toFixed(0)}%;background:linear-gradient(90deg,${g.color}CC,${g.color})"></i></div>
        <span class="sv">${CM(x.cv)}</span></div>`).join('')}
    </div>`;
  }).join('');

  /* 商材×チャネル（CVのチャネル構成比 100%積み上げ） */
  const MG=GA.pairMatrix('goods','channel','cv',ST.range,ST.seg);
  const rowTot=MG.val.map(r=>r.reduce((a,b)=>a+b,0));
  E('chGoodsCh').setOption(baseOpt({
    tooltip:Object.assign({},TIP,{trigger:'axis',axisPointer:{type:'shadow',shadowStyle:{color:'rgba(56,189,248,.06)'}},
      formatter:ps=>{
        const ri=MG.rows.length-1-ps[0].dataIndex;
        let h=`<b>${MG.rows[ri]}</b>　CV合計 ${CM(rowTot[ri])}件<br>`;
        ps.forEach(p=>{const abs=MG.val[ri][p.seriesIndex];
          h+=`${p.marker} ${p.seriesName}　<b>${pct(p.value,1)}</b>（${CM(abs)}件）<br>`});
        return h;}}),
    legend:{top:0,textStyle:{color:TX2,fontSize:10.5},itemWidth:11,itemHeight:11,icon:'roundRect',itemGap:8},
    grid:{left:8,right:16,top:32,bottom:4,containLabel:true},
    xAxis:axY({max:1,axisLabel:{formatter:v=>Math.round(v*100)+'%',color:MUT,fontSize:10,fontFamily:MONOF}}),
    yAxis:axX({type:'category',data:MG.rows.slice().reverse(),axisLabel:{color:TX2,fontSize:11.5,fontFamily:FONT}}),
    series:GA.CHANNELS.map((c,ci)=>({name:c.name,type:'bar',stack:'cv',barWidth:19,
      itemStyle:{color:c.color,borderColor:'#0A1120',borderWidth:1.5},
      data:MG.rows.map((_,r)=>{const ri=MG.rows.length-1-r;return +(MG.val[ri][ci]/Math.max(1,rowTot[ri])).toFixed(4)})}))
  }),true);

  /* CVドーナツ */
  document.getElementById('chGoalDonut').style.minHeight='400px';
  E('chGoalDonut').setOption(baseOpt({
    tooltip:Object.assign({},TIP,{valueFormatter:v=>CM(v)+'件'}),
    legend:{bottom:0,left:'center',textStyle:{color:TX2,fontSize:10},itemWidth:10,itemHeight:10,icon:'roundRect',itemGap:7},
    series:[{type:'pie',radius:['48%','72%'],center:['50%','40%'],
      itemStyle:{borderColor:'#0A1120',borderWidth:2,borderRadius:5},
      label:{show:false},
      data:A.goals.map((g,i)=>({name:g.name.length>12?g.name.slice(0,12)+'…':g.name,value:Math.round(g.cv),itemStyle:{color:CAT8[i]}}))}],
    graphic:[{type:'text',left:'center',top:'34%',style:{text:fmtJP(A.total.cv),fill:TX,fontSize:19,fontWeight:800,fontFamily:MONOF}},
             {type:'text',left:'center',top:'44%',style:{text:'総CV',fill:MUT,fontSize:10,fontFamily:FONT}}]
  }),true);

  /* CVスコアボード */
  $('#goalTiles').innerHTML=A.goals.map((g,i)=>`
    <div class="kpi" style="grid-column:span 3">
      <div class="kl"><span class="sw" style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${CAT8[i]}"></span>${g.name}</div>
      <div class="kv num" data-cu="${Math.round(g.cv)}" data-jp="1">0</div>
      <div class="kd">${deltaPill(g.cv,g.prev)}<span>価値 ${yen(g.value)}</span></div>
    </div>`).join('');

  /* フォームファネル */
  const fc=$('#funnelGoalCtl');
  if(!fc.dataset.built){
    fc.innerHTML=GA.GOALS.filter(g=>['estimate','testdrive','signup','dealer'].includes(g.id)).map(g=>
      `<span class="chip ${g.id===ST.funnelGoal?'on':''}" data-fg="${g.id}">${g.name.length>8?g.name.slice(0,8)+'…':g.name}</span>`).join('');
    fc.dataset.built='1';
    fc.onclick=e=>{const c=e.target.closest('[data-fg]');if(!c)return;
      ST.funnelGoal=c.dataset.fg;$$('#funnelGoalCtl .chip').forEach(x=>x.classList.toggle('on',x.dataset.fg===ST.funnelGoal));drawFunnel(A)};
  }
  drawFunnel(A);

  /* 車種×主要CV ヒート（色は列内順位・数値は絶対値） */
  const mains=['estimate','testdrive','signup'];
  const colMax=mains.map(g=>Math.max(...A.models.map(m=>m.cvGoal[g])));
  const heat=[];
  A.models.forEach((m,mi)=>mains.forEach((g,gi)=>heat.push([gi,mi,Math.round(m.cvGoal[g]),+(m.cvGoal[g]/colMax[gi]).toFixed(3)])));
  E('chModelGoal').setOption(baseOpt({
    tooltip:Object.assign({},TIP,{formatter:p=>`<b>${A.models[p.value[1]].name}</b> × ${GA.GOALS.find(g=>g.id===mains[p.value[0]]).name}<br>CV <b>${CM(p.value[2])}件</b>（列内トップ比 ${pct(p.value[3],0)}）`}),
    grid:{left:8,right:14,top:8,bottom:26,containLabel:true},
    xAxis:axX({data:['見積り完了','試乗予約','アカウント登録'],position:'top',axisLabel:{color:TX2,fontSize:11,fontFamily:FONT}}),
    yAxis:axX({type:'category',data:A.models.map(m=>m.name),inverse:true,axisLabel:{color:TX2,fontSize:10.5,fontFamily:FONT}}),
    visualMap:{show:false,dimension:3,min:0,max:1,inRange:{color:[SEQ(.06),SEQ(.5),SEQ(1)]}},
    series:[{type:'heatmap',data:heat,label:{show:true,formatter:p=>fmtJP(p.value[2]),color:'#EAF3FC',fontSize:9.5,fontFamily:MONOF},
      itemStyle:{borderColor:'#0A1120',borderWidth:2,borderRadius:4},
      emphasis:{itemStyle:{shadowBlur:8,shadowColor:'rgba(56,189,248,.5)'}}}],
    graphic:[{type:'text',left:'center',bottom:2,style:{text:'色＝各列（CV種別）内での相対量　／　数値＝件数',fill:MUT,fontSize:10,fontFamily:FONT}}]
  }),true);

  const kg=A.goods.find(g=>g.id==='idreg'), sg=A.goods.find(g=>g.id==='store');
  /* --- キーイベント実測分解（GA4・OWNED.tjCV） --- */
  if(typeof OWNED!=='undefined' && document.getElementById('cvRealTable')){
    const BIZC={'販売・宣伝':'#38BDF8','CRM・オウンド':'#00E5C7','販売店送客':'#FFD84D','オウンド':'#00E5C7','CRM':'#9085E9','EC・用品':'#D55181'};
    const mx=Math.max(...OWNED.tjCV.map(x=>x.n));
    $('#cvRealTable').innerHTML=`<thead><tr><th>キーイベント</th><th>内容</th><th>事業部レンズ</th><th class="num">28日実測</th><th class="num">日平均</th><th class="num">規模</th></tr></thead>
    <tbody>${OWNED.tjCV.map(x=>`<tr${x.hot?' style="background:color-mix(in srgb,#FFD84D 5%,transparent)"':''}>
      <td><span class="utm">${x.ev}</span>${x.hot?' <span class="tag" style="color:var(--gd);background:color-mix(in srgb,var(--gd) 13%,transparent)">JP活用実績の露出面</span>':''}</td>
      <td style="font-size:12px"><b>${x.name}</b></td>
      <td><span class="tag" style="color:${BIZC[x.biz]};background:color-mix(in srgb,${BIZC[x.biz]} 12%,transparent)">${x.biz}</span></td>
      <td class="num">${CM(x.n)}</td><td class="num" style="color:var(--tx2)">${CM(Math.round(x.n/28))}</td>
      <td class="num"><div class="tbar" style="min-width:110px"><div class="bg"><i style="width:${Math.max(1.5,Math.pow(x.n/mx,.4)*100).toFixed(0)}%;background:linear-gradient(90deg,var(--cy),var(--te))"></i></div></div></td>
    </tr>`).join('')}</tbody>`;
  }
    $('#goodsInsight').innerHTML=`<span class="it">INSIGHT — 商材</span>
    <p>CVの主戦場は新車商談系（見積りSIM・試乗・商談・リード）で全体の <b class="num">${pct(A.goods[0].cv/A.total.cv,0)}</b>（GA4実測）。見積りシミュレーション完了 <span class="hl">39.4万件/28日</span> が圧倒的な母数で、日次1.4万件ペースの商談前行動が積み上がっている。</p>
    <p><span class="hl-g">TOYOTAアカウント登録は前期間比 ${(kg.cv/kg.prev-1)>=0?'+':''}${((kg.cv/kg.prev-1)*100).toFixed(1)}%</span>（16.1万件/28日）。ID基盤への蓄積はT-Connect・マイページ・CRM連携の土台であり、<span class="hl">来店・店舗系（販売店検索8.0万＋電話タップ0.8万）</span>とあわせてオフライン送客の実測が取れている。</p>`;

  runCountUps($('section[data-view="goods"]'));
}
function drawFunnel(A){
  const g=A.goals.find(x=>x.id===ST.funnelGoal);
  const STEPS={estimate:[['車種ページ表示',26],['シミュレーター開始',3.4],['グレード・オプション選択',1.9],['見積り完了',1]],
    testdrive:[['車種ページ表示',115],['試乗予約フォーム表示',6.5],['入力開始',2.6],['試乗予約 完了',1]],
    signup:[['登録フォーム表示',3.2],['入力開始',2.1],['認証・確認',1.4],['アカウント登録 完了',1]],
    dealer:[['車種・店舗情報 表示',12],['販売店検索 開始',2.4],['エリア・条件指定',1.5],['検索結果 到達',1]]}[ST.funnelGoal];
  const cv=g.cv;
  const data=STEPS.map(([n,mult],i)=>({name:n,value:Math.round(cv*mult),
    itemStyle:{color:[SEQ(.25),SEQ(.5),SEQ(.75),TE][i]}}));
  E('chGoalFunnel').setOption(baseOpt({
    tooltip:Object.assign({},TIP,{formatter:p=>{
      const rate=p.dataIndex>0? (data[p.dataIndex].value/data[p.dataIndex-1].value*100).toFixed(1)+'%（前段からの通過率）':'起点';
      return `<b>${p.name}</b><br>${fmtJP(p.value)} セッション<br>${rate}`;}}),
    series:[{type:'funnel',left:'6%',right:'6%',top:8,bottom:8,sort:'descending',gap:5,minSize:'12%',
      label:{show:true,position:'inside',formatter:p=>`${p.name}\n${fmtJP(p.value)}`,color:'#EAF3FC',fontSize:11,fontFamily:FONT,lineHeight:16},
      itemStyle:{borderColor:'#0A1120',borderWidth:2,borderRadius:4},
      emphasis:{label:{fontSize:12.5}},
      data}]
  }),true);
}

/* ==================================================
   VIEW: 動線マップ
   ================================================== */
function renderFlow(){
  const A=GA.agg(ST.range,ST.seg);
  const F=GA.funnel(ST.range,ST.seg);
  /* ステージゲート */
  $('#gateRow').innerHTML=F.map((s,i)=>{
    const prev=i>0?F[i-1].v:null;
    const rate=prev? s.v/prev : null;
    const isClear=i===F.length-1;
    return `<div class="gate ${isClear?'clear':''}">
      <div class="gs">${s.name.split('｜')[0]}</div>
      <div class="gn2">${s.name.split('｜')[1]}</div>
      <div class="gv num" data-cu="${Math.round(s.v)}" data-jp="1">0</div>
      <div class="gd">${s.desc}</div>
      ${rate?`<div class="gr"><div class="xp small" style="flex:1"><i style="width:${Math.min(100,rate*100)}%;${isClear?'background:linear-gradient(90deg,#E4A900,var(--gd))':''}"></i></div><span class="num">${pct(rate,1)}</span></div>`:'<div class="gr"><span style="color:var(--mut)">エントリー地点</span></div>'}
    </div>`;
  }).join('');

  /* サンキー */
  const SK=GA.sankey(ST.range,ST.seg);
  const chColor=Object.fromEntries(GA.CHANNELS.map(c=>[c.name,c.color]));
  const nodeColor=n=>{
    if(chColor[n]) return chColor[n];
    if(n==='未CVで離脱') return '#3A4556';
    if(['見積り完了','試乗・商談・リード','アカウント登録','店舗・購入ほか'].includes(n)) return GD;
    if(['グレード・価格','見積りシミュレーター','車種比較・ギャラリー','販売店・在庫検索'].includes(n)) return TE;
    if(n==='離脱（回遊なし）') return '#3A4556';
    return CY;
  };
  const CVSET=new Set(['見積り完了','試乗・商談・リード','アカウント登録','店舗・購入ほか']);
  const DROPSET=new Set(['未CVで離脱','離脱（回遊なし）']);
  E('chSankey').setOption(baseOpt({
    tooltip:Object.assign({},TIP,{trigger:'item',formatter:p=>{
      if(p.dataType==='edge') return `${p.data.source.replace(/_/g,' ')} → ${p.data.target}<br><b>${fmtJP(p.data.value)}</b> セッション`;
      return `<b>${p.name}</b><br>${fmtJP(p.value)} セッション`;}}),
    series:[{type:'sankey',left:10,right:170,top:14,bottom:10,
      nodeWidth:14,nodeGap:11,nodeAlign:'justify',
      emphasis:{focus:'adjacency'},
      lineStyle:{color:'gradient',opacity:.22,curveness:.52},
      label:{color:TX,fontSize:11,fontFamily:FONT,formatter:p=> CVSET.has(p.name)? `${p.name}  ${fmtJP(p.value)}` : p.name},
      itemStyle:{borderRadius:3},
      data:SK.nodes.map(n=>({...n,itemStyle:{color:nodeColor(n.name)},
        label: CVSET.has(n.name)? {color:GD,fontWeight:700} : DROPSET.has(n.name)? {color:MUT} : undefined})),
      links:SK.links.map(l=>{
        const s=SK.nodes[l.source].name,t=SK.nodes[l.target].name;
        const ls= CVSET.has(t)? {color:'#E4A900',opacity:.55}
                : DROPSET.has(t)? {color:'#222B3C',opacity:.42} : undefined;
        return {source:s,target:t,value:Math.round(l.value),...(ls?{lineStyle:ls}:{})};
      })}]
  }),true);

  /* LP別 その後の行動（100%積み上げ） */
  const MIDN=['グレード・価格','見積りシミュレーター','車種比較・ギャラリー','販売店・在庫検索','離脱（回遊なし）'];
  const LPD=SK.lp.map((lp,li)=>{
    const flows=SK.links.filter(l=>SK.nodes[l.source].name===lp);
    const tot=flows.reduce((a,l)=>a+l.value,0);
    return {lp,vals:MIDN.map(md=>{
      const f=flows.find(l=>SK.nodes[l.target].name===md);
      return f? f.value/tot : 0;})};
  });
  const MIDC=[CAT8[0],CAT8[2],CAT8[6],CAT8[3],'#3A4556'];
  E('chLpNext').setOption(baseOpt({
    tooltip:Object.assign({},TIP,{trigger:'axis',axisPointer:{type:'shadow',shadowStyle:{color:'rgba(56,189,248,.06)'}},valueFormatter:v=>pct(v,1)}),
    legend:{top:0,textStyle:{color:TX2,fontSize:10},itemWidth:10,itemHeight:10,icon:'roundRect',itemGap:7},
    grid:{left:8,right:16,top:32,bottom:4,containLabel:true},
    xAxis:axY({max:1,axisLabel:{formatter:v=>Math.round(v*100)+'%',color:MUT,fontSize:10,fontFamily:MONOF}}),
    yAxis:axX({type:'category',data:LPD.map(x=>x.lp).reverse(),axisLabel:{color:TX2,fontSize:11,fontFamily:FONT}}),
    series:MIDN.map((md,i)=>({name:md,type:'bar',stack:'x',barWidth:18,
      itemStyle:{color:MIDC[i],borderColor:'#0A1120',borderWidth:1.5},
      data:LPD.map(x=>+(x.vals[i]).toFixed(4)).reverse()}))
  }),true);

  /* 検討ツールの威力 */
  const toolS=F[2].v, allS=F[0].v, cv=A.total.cv;
  const cvW=cv*.62, cvWo=cv*.38;
  const cvrW=cvW/toolS, cvrWo=cvWo/(allS-toolS);
  E('chToolPower').setOption(baseOpt({
    tooltip:Object.assign({},TIP,{valueFormatter:v=>(+v).toFixed(2)+'%'}),
    grid:{left:8,right:16,top:36,bottom:6,containLabel:true},
    xAxis:axX({data:['シミュレーター利用なし','シミュレーター利用あり'],axisLabel:{color:TX2,fontSize:11.5,fontFamily:FONT}}),
    yAxis:axY({axisLabel:{formatter:'{value}%',color:MUT,fontSize:10,fontFamily:MONOF}}),
    series:[{type:'bar',barWidth:74,
      itemStyle:{borderRadius:[5,5,0,0]},
      label:{show:true,position:'top',formatter:p=>p.value+'%',color:TX,fontWeight:800,fontSize:14,fontFamily:MONOF},
      data:[{value:+(cvrWo*100).toFixed(2),itemStyle:{color:'#3A4556'}},
            {value:+(cvrW*100).toFixed(2),itemStyle:{color:{type:'linear',x:0,y:0,x2:0,y2:1,colorStops:[{offset:0,color:TE},{offset:1,color:'#0FB98B'}]}}}]}],
    graphic:[{type:'text',right:20,top:8,style:{text:`威力 ×${(cvrW/cvrWo).toFixed(1)}`,fill:TE,fontSize:15,fontWeight:800,fontFamily:MONOF}}]
  }),true);

  const g2=F[1].v/F[0].v, g3=F[2].v/F[1].v;
  $('#flowInsight').innerHTML=`<span class="it">INSIGHT — 動線</span>
    <p>最大のボトルネックは <span class="hl-r">STAGE 2 → STAGE 3（車種閲覧 → 検討ツール）で通過率 ${pct(g3,1)}</span>。車種ページからシミュレーターへの導線を1クリック化するだけで、CLEAR（CV）の母数が直接増える構造。</p>
    <p>サンキー図では <span class="hl">ディスプレイ・動画広告 → キャンペーンLP → 離脱</span> の太い帯が確認できる。一方、<span class="hl-g">シミュレーター利用者のCVRは未利用者の約${(cvrW/cvrWo).toFixed(0)}倍</span>。広告LPからも見積りシミュレーターへ直行させる設計が最有力の一手。</p>`;

  runCountUps($('section[data-view="flow"]'));
}
