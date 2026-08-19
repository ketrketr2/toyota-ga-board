/* ============ 描画エンジン 2/2：集客・オーディエンス・ラボ・計測設計 ============ */

/* ==================================================
   VIEW: 集客・広告
   ================================================== */
function renderAcq(){
  const A=GA.agg(ST.range,ST.seg);
  $('#acqSub').textContent=periodLabel(A);

  /* チャネル成績表 */
  const maxS=Math.max(...A.channels.map(c=>c.sessions));
  $('#channelTable').innerHTML=`<thead><tr>
    <th>チャネル</th><th class="num">セッション</th><th class="num">構成比</th><th class="num">前期間比</th>
    <th class="num">新規率</th><th class="num">CV</th><th class="num">CVR</th><th>種別</th></tr></thead>
    <tbody>${A.channels.map(c=>`<tr>
      <td><span style="display:inline-flex;align-items:center;gap:8px"><span class="sw" style="width:10px;height:10px;border-radius:3px;background:${c.color};display:inline-block"></span><b>${c.name}</b></span></td>
      <td class="num"><div class="tbar"><div class="bg"><i style="width:${(c.sessions/maxS*100).toFixed(0)}%;background:${c.color}"></i></div><span>${fmtJP(c.sessions)}</span></div></td>
      <td class="num">${pct(c.sessions/A.total.sessions,1)}</td>
      <td class="num">${deltaPill(c.sessions,c.prevSessions)}</td>
      <td class="num">${pct(ST.seg==='new'?1:ST.seg==='ret'?0:c.newShare,0)}</td>
      <td class="num">${CM(c.cv)}</td>
      <td class="num">${pct(c.cvr,2)}</td>
      <td>${c.paid?'<span class="tag" style="color:var(--am);background:color-mix(in srgb,var(--am) 12%,transparent)">広告</span>':'<span class="tag" style="color:var(--tx2);background:rgba(255,255,255,.06)">オーガニック等</span>'}</td>
    </tr>`).join('')}</tbody>`;

  /* キャンペーンリーグ */
  renderCampaignTable();

  /* UTMサンバースト */
  const U=GA.utmTree(ST.range);
  const cpColor=c=>c.chColor;
  E('chUtm').setOption(baseOpt({
    tooltip:Object.assign({},TIP,{formatter:p=>{
      const d=p.data;
      if(d.cp) return `<b>utm_campaign=${d.name}</b><br>${d.cp.name}<br>セッション <b>${fmtJP(d.value)}</b> ／ CV ${CM(d.cp.cv)}`;
      return `<b>utm_source=${p.name}</b><br>セッション <b>${fmtJP(p.value)}</b>`;}}),
    series:[{type:'sunburst',radius:['22%','92%'],center:['50%','48%'],
      nodeClick:false,sort:'desc',
      itemStyle:{borderColor:'#0A1120',borderWidth:2,borderRadius:4},
      label:{color:'#EAF3FC',fontSize:9.5,fontFamily:MONOF,minAngle:14,
        formatter:p=>p.name.length>13?p.name.slice(0,13)+'…':p.name},
      levels:[{},{r0:'22%',r:'52%',label:{rotate:'tangential',fontSize:10.5}},{r0:'52%',r:'92%',label:{rotate:'radial'}}],
      data:U.tree.map(s=>({name:s.name,
        itemStyle:{color:s.children[0]&&s.children[0].cp?s.children[0].cp.chColor:'#3A4556'},
        children:s.children.map(c=>({name:c.name,value:c.value,cp:c.cp,
          itemStyle:{color:c.cp?c.cp.chColor:'#3A4556'}}))}))}],
    graphic:[{type:'text',left:'center',bottom:2,style:{
      text:`広告セッションのUTM捕捉率 ${pct(U.tracked/U.paidSess,0)}（未捕捉 ${fmtJP(U.untracked)}）`,
      fill:MUT,fontSize:10.5,fontFamily:FONT}}]
  }),true);

  /* 投資対効果バブル */
  const cps=GA.campaigns(ST.range).filter(c=>c.spend>0);
  const maxSess=Math.max(...cps.map(c=>c.sessions));
  const labelSet=new Set([...cps].sort((a,b)=>b.sessions-a.sessions).slice(0,6).map(c=>c.id));
  E('chBubble').setOption(baseOpt({
    tooltip:Object.assign({},TIP,{formatter:p=>{
      const c=p.data.cp;
      return `<b>${c.name}</b><br>費用 ${yen(c.spend)} ／ CV <b>${CM(c.cv)}</b><br>CPA ${yen(c.cpa)} ／ ROAS ${c.roas.toFixed(1)}倍<br>セッション ${fmtJP(c.sessions)}`;}}),
    grid:{left:8,right:46,top:30,bottom:8,containLabel:true},
    xAxis:axY({name:'広告費用',nameTextStyle:{color:MUT,fontSize:10},axisLabel:{formatter:v=>yen(v),color:MUT,fontSize:10,fontFamily:MONOF},splitLine:{lineStyle:{color:LINE,type:[3,4]}}}),
    yAxis:axY({name:'CV',nameTextStyle:{color:MUT,fontSize:10},axisLabel:{formatter:v=>fmtJP(v),color:MUT,fontSize:10,fontFamily:MONOF}}),
    series:[{type:'scatter',
      symbolSize:(val,params)=>8+Math.sqrt((params.data.cp.sessions)/maxSess)*42,
      itemStyle:{opacity:.88,borderColor:'#0A1120',borderWidth:1.5},
      data:cps.map(c=>({value:[Math.round(c.spend),Math.round(c.cv)],cp:c,itemStyle:{color:c.chColor},
        label:{show:labelSet.has(c.id),position:'top',formatter:()=>c.name.length>11?c.name.slice(0,11)+'…':c.name,color:TX2,fontSize:9.5,fontFamily:FONT,distance:4}}))}]
  }),true);

  const best=[...cps].sort((a,b)=>b.roas-a.roas)[0];
  const worst=[...cps].sort((a,b)=>a.roas-b.roas)[0];
  $('#acqInsight').innerHTML=`<span class="it">INSIGHT — 集客・広告</span>
    <p>費用対効果の首位は <span class="hl-g">${best.name}</span>（ROAS <b class="num">${best.roas.toFixed(1)}倍</b> ／ CPA <b class="num">${yen(best.cpa)}</b>）。ただし指名検索はもともと来る顧客を刈り取る性質のため、<span class="hl-b">増分評価では一般KW・SNS の伸びしろを見るべき</span>。</p>
    <p>効率最下位は <span class="hl-r">${worst.name}</span>（CPA <b class="num">${yen(worst.cpa)}</b>）。認知目的の出稿なら「CV単価」でなく <span class="hl">車種ページ到達単価・検討ツール到達単価</span> をKPIに切り替えて評価するのが妥当。UTM捕捉率は <b class="num">${pct(U.tracked/U.paidSess,0)}</b> で、残りは計測設計タブの命名規約徹底で回収する。</p>`;
}

function renderCampaignTable(){
  const cps=GA.campaigns(ST.range);
  const {key,dir}=ST.campSort;
  cps.sort((a,b)=>{
    const av=a[key]??-1,bv=b[key]??-1;
    return (av-bv)*dir;
  });
  const maxRoas=Math.max(...cps.map(c=>c.roas||0));
  const cols=[['name','キャンペーン',0],['utm','トラッキングコード',0],['chName','媒体',0],
    ['spend','費用',1],['sessions','セッション',1],['cv','CV',1],['cpa','CPA',1],['roas','ROAS',1]];
  $('#campaignTable').innerHTML=`<thead><tr><th>#</th>${cols.map(([k,l,n])=>
    `<th class="sortable ${n?'num':''}" data-k="${k}">${l}${key===k?`<span class="arrow">${dir<0?'▼':'▲'}</span>`:''}</th>`).join('')}<th>状態</th></tr></thead>
  <tbody>${cps.map((c,i)=>`<tr>
    <td>${i<3?`<span class="medal m${i+1}">${i+1}</span>`:`<span class="medal mx">${i+1}</span>`}</td>
    <td><b>${c.name}</b>${c.model?`<div style="font-size:9.5px;color:var(--mut)">対象: ${GA.MODELS.find(m=>m.id===c.model).name}</div>`:''}</td>
    <td><span class="utm">${c.src}/${c.med}<br>${c.utm}</span></td>
    <td><span class="tag" style="color:${c.chColor};background:color-mix(in srgb,${c.chColor} 13%,transparent)">${c.chName}</span></td>
    <td class="num">${c.spend>0?yen(c.spend):'<span style="color:var(--mut)">¥0（自社）</span>'}</td>
    <td class="num">${fmtJP(c.sessions)}</td>
    <td class="num">${CM(c.cv)}</td>
    <td class="num">${c.spend>0?yen(c.cpa):'—'}</td>
    <td class="num">${c.roas!=null?`<div class="tbar" style="min-width:110px"><div class="bg"><i style="width:${(c.roas/maxRoas*100).toFixed(0)}%;background:linear-gradient(90deg,var(--te),var(--cy))"></i></div><span>${c.roas.toFixed(1)}倍</span></div>`:'—'}</td>
    <td>${c.active?'<span class="tag" style="color:var(--gn);background:color-mix(in srgb,var(--gn) 12%,transparent)">● 配信中</span>':'<span class="tag" style="color:var(--mut);background:rgba(255,255,255,.05)">終了</span>'}</td>
  </tr>`).join('')}</tbody>`;
  $$('#campaignTable th.sortable').forEach(th=>th.onclick=()=>{
    const k=th.dataset.k;
    if(!['spend','sessions','cv','cpa','roas'].includes(k))return;
    if(ST.campSort.key===k)ST.campSort.dir*=-1;else ST.campSort={key:k,dir:-1};
    renderCampaignTable();
  });
}

/* ==================================================
   VIEW: オーディエンス
   ================================================== */
function renderAud(){
  const A=GA.agg(ST.range,'all');
  const AN=GA.agg(ST.range,'new'), AR=GA.agg(ST.range,'ret');

  /* 新規×再訪 */
  document.getElementById('chNewRet').style.minHeight='252px';
  E('chNewRet').setOption(baseOpt({
    tooltip:Object.assign({},TIP,{valueFormatter:v=>fmtJP(v)}),
    legend:{bottom:0,textStyle:{color:TX2,fontSize:11},itemWidth:11,itemHeight:11,icon:'roundRect'},
    series:[{type:'pie',radius:['50%','72%'],center:['50%','42%'],
      itemStyle:{borderColor:'#0A1120',borderWidth:2,borderRadius:5},
      label:{show:true,position:'inside',formatter:p=>pct(p.percent/100,0),color:'#04121C',fontWeight:800,fontSize:12,fontFamily:MONOF},
      data:[{name:'新規',value:Math.round(AN.total.sessions),itemStyle:{color:CAT8[0]}},
            {name:'再訪',value:Math.round(AR.total.sessions),itemStyle:{color:CAT8[1]}}]}],
    graphic:[{type:'text',left:'center',top:'37%',style:{text:'CVRは再訪が',fill:MUT,fontSize:10,fontFamily:FONT}},
      {type:'text',left:'center',top:'44%',style:{text:'×'+(AR.total.cv/AR.total.sessions/(AN.total.cv/AN.total.sessions)).toFixed(1),fill:TE,fontSize:17,fontWeight:800,fontFamily:MONOF}}]
  }),true);

  /* 再訪コンボ */
  const combo=GA.comboData(ST.range);
  const avg=A.total.cv/A.total.sessions;
  const maxCvr=Math.max(...combo.map(b=>b.cvr));
  $('#comboRow').innerHTML=combo.map((b,i)=>`
    <div class="cbox ${i>=2?'hot':''}">
      <div class="cx" style="color:${i>=2?'var(--te)':'var(--tx2)'}">COMBO ×${(b.cvr/combo[0].cvr).toFixed(1)}</div>
      <div class="cn">${b.name}</div>
      <div class="cv num" data-cu="${(b.cvr*100).toFixed(2)}" data-dec="2" data-suf="%">0</div>
      <div class="cs">CVR ／ セッション ${fmtJP(b.sessions)}（${pct(b.share,0)}）</div>
      <div class="cbar"><i style="width:${(b.cvr/maxCvr*100).toFixed(0)}%"></i></div>
    </div>`).join('')+`
    <div style="grid-column:1/-1;display:flex;align-items:center;gap:10px;font-size:11px;color:var(--mut);border-top:1px dashed var(--line);padding-top:9px;flex-wrap:wrap">
      <span>倍率＝初訪問CVR比。全体平均CVRは <b class="num" style="color:var(--tx2)">${pct(avg,2)}</b></span>
      <span style="margin-left:auto">10回以上訪問層だけで全CVの <span class="hl num">${pct(combo[3].cv/A.total.cv,0)}</span> を占める</span>
    </div>`;

  /* アフィニティ：シェア＋CVR指数（2グリッド） */
  const aff=GA.affinityAgg(ST.range,ST.seg==='all'?'all':ST.seg);
  const names=aff.map(a=>a.name);
  E('chAffinity').setOption(baseOpt({
    tooltip:Object.assign({},TIP,{formatter:p=>{
      const a=aff[p.dataIndex];
      return `<b>${a.name}</b><br>セッションシェア ${pct(a.share,1)}<br>CVR ${pct(a.cvr,2)}（指数 <b>${a.idx.toFixed(0)}</b> / 全体=100）`;}}),
    grid:[{left:8,right:'56%',top:30,bottom:6,containLabel:true},
          {left:'50%',right:30,top:30,bottom:6,containLabel:true}],
    title:[{text:'セッションシェア',left:'12%',top:0,textStyle:{color:TX2,fontSize:11,fontWeight:700,fontFamily:FONT}},
           {text:'CVR指数（全体=100）',left:'62%',top:0,textStyle:{color:TX2,fontSize:11,fontWeight:700,fontFamily:FONT}}],
    xAxis:[Object.assign(axY(),{gridIndex:0,axisLabel:{formatter:v=>Math.round(v*100)+'%',color:MUT,fontSize:9.5,fontFamily:MONOF}}),
           Object.assign(axY(),{gridIndex:1,min:-45,max:45,axisLabel:{formatter:v=>String(100+v),color:MUT,fontSize:9.5,fontFamily:MONOF}}),],
    yAxis:[Object.assign(axX({type:'category'}),{gridIndex:0,data:names.slice().reverse(),axisLabel:{color:TX2,fontSize:10.5,fontFamily:FONT}}),
           Object.assign(axX({type:'category'}),{gridIndex:1,data:names.slice().reverse(),axisLabel:{show:false}})],
    series:[
      {type:'bar',xAxisIndex:0,yAxisIndex:0,barWidth:12,
        itemStyle:{color:CAT8[0],borderRadius:[0,4,4,0]},
        label:{show:true,position:'right',formatter:p=>pct(p.value,0),color:TX2,fontSize:9.5,fontFamily:MONOF},
        data:aff.map(a=>+a.share.toFixed(4)).reverse()},
      {type:'bar',xAxisIndex:1,yAxisIndex:1,barWidth:12,
        itemStyle:{color:p=>p.value>=0?'#199E70':'#E66767',borderRadius:4},
        label:{show:true,position:p=>p.value>=0?'right':'left',formatter:p=>(100+p.value).toFixed(0),color:TX2,fontSize:9.5,fontFamily:MONOF},
        markLine:{symbol:'none',silent:true,data:[{xAxis:0}],lineStyle:{color:'#8FA3B8',type:[4,3]},label:{show:false}},
        data:aff.map(a=>+(a.idx-100).toFixed(1)).reverse()},
    ]
  }),true);

  /* RFヒート */
  const rf=GA.rfMatrix(ST.range);
  const freqLbl=['2〜3回','4〜9回','10回以上'];
  const rfData=[]; rf.forEach((row,ri)=>row.forEach((v,fi)=>rfData.push([fi,ri,Math.round(v)])));
  const rfMax=Math.max(...rfData.map(d=>d[2]));
  E('chRf').setOption(baseOpt({
    tooltip:Object.assign({},TIP,{formatter:p=>`最終訪問 <b>${GA.RECENCY[p.value[1]]}</b> × 累計 <b>${freqLbl[p.value[0]]}</b><br>${fmtJP(p.value[2])} セッション`}),
    grid:{left:8,right:14,top:8,bottom:40,containLabel:true},
    xAxis:axX({data:freqLbl,position:'top',axisLabel:{color:TX2,fontSize:11,fontFamily:FONT}}),
    yAxis:axX({type:'category',data:GA.RECENCY,inverse:true,axisLabel:{color:TX2,fontSize:10.5,fontFamily:FONT}}),
    visualMap:{min:0,max:rfMax,orient:'horizontal',left:'center',bottom:0,itemHeight:80,itemWidth:10,
      textStyle:{color:MUT,fontSize:9.5},inRange:{color:[SEQ(.06),SEQ(.55),SEQ(1)]},formatter:v=>fmtJP(v)},
    series:[{type:'heatmap',data:rfData,
      label:{show:true,formatter:p=>fmtJP(p.value[2]),color:'#EAF3FC',fontSize:10,fontFamily:MONOF},
      itemStyle:{borderColor:'#0A1120',borderWidth:2,borderRadius:5}}]
  }),true);

  /* 年齢×性別 ミラーバー */
  const D=GA.demoAgg(ST.range);
  const totD=D.male.reduce((a,b)=>a+b,0)+D.female.reduce((a,b)=>a+b,0);
  E('chDemo').setOption(baseOpt({
    tooltip:Object.assign({},TIP,{formatter:p=>{
      const v=Math.abs(p.value);
      return `<b>${p.seriesName} ${p.name}</b><br>${fmtJP(v)} セッション（${pct(v/totD,1)}）`;}}),
    legend:{top:0,textStyle:{color:TX2,fontSize:11},itemWidth:11,itemHeight:11,icon:'roundRect'},
    grid:{left:8,right:16,top:30,bottom:4,containLabel:true},
    xAxis:axY({axisLabel:{formatter:v=>fmtJP(Math.abs(v)),color:MUT,fontSize:9.5,fontFamily:MONOF}}),
    yAxis:axX({type:'category',data:D.ages,axisLabel:{color:TX2,fontSize:10.5,fontFamily:MONOF}}),
    series:[
      {name:'男性',type:'bar',stack:'d',barWidth:15,itemStyle:{color:CAT8[0],borderRadius:[4,0,0,4]},data:D.male.map(v=>-Math.round(v))},
      {name:'女性',type:'bar',stack:'d',barWidth:15,itemStyle:{color:CAT8[4],borderRadius:[0,4,4,0]},data:D.female.map(v=>Math.round(v))},
    ]
  }),true);

  /* 会員ランク */
  const mem=GA.memberData(ST.range);
  E('chMember').setOption(baseOpt({
    tooltip:Object.assign({},TIP,{formatter:p=>{
      const r=mem[p.dataIndex];
      return `<b>${r.name}</b><br>CVR <b>${pct(r.cvr,2)}</b><br>セッション ${fmtJP(r.sessions)}（${pct(r.share,0)}）`;}}),
    grid:{left:8,right:40,top:8,bottom:6,containLabel:true},
    xAxis:axY({axisLabel:{formatter:v=>v+'%',color:MUT,fontSize:10,fontFamily:MONOF}}),
    yAxis:axX({type:'category',data:mem.map(r=>r.name).reverse(),axisLabel:{color:TX2,fontSize:11,fontFamily:FONT}}),
    series:[{type:'bar',barWidth:17,
      itemStyle:{borderRadius:[0,5,5,0],color:p=>[['#3A4556'],[SEQ(.45)],[SEQ(.75)],[GD]][p.dataIndex][0]},
      label:{show:true,position:'right',formatter:p=>p.value.toFixed(2)+'%',color:TX,fontSize:10.5,fontWeight:700,fontFamily:MONOF},
      data:mem.map(r=>+(r.cvr*100).toFixed(2)).reverse()}]
  }),true);

  /* デバイス */
  const dev=GA.deviceAgg(ST.range,ST.seg);
  E('chDevice').setOption(baseOpt({
    tooltip:Object.assign({},TIP,{valueFormatter:v=>fmtJP(v)}),
    legend:{bottom:0,textStyle:{color:TX2,fontSize:10.5},itemWidth:11,itemHeight:11,icon:'roundRect'},
    series:[{type:'pie',radius:['48%','70%'],center:['50%','42%'],
      itemStyle:{borderColor:'#0A1120',borderWidth:2,borderRadius:5},
      label:{show:true,position:'inside',formatter:p=>p.percent>=8?pct(p.percent/100,0):'',color:'#04121C',fontWeight:800,fontSize:11,fontFamily:MONOF},
      data:dev.map((d,i)=>({name:d.name,value:Math.round(d.sessions),itemStyle:{color:CAT8[i]}}))}]
  }),true);

  /* エリア */
  const areas=GA.areaAgg(ST.range);
  E('chArea').setOption(baseOpt({
    tooltip:Object.assign({},TIP,{valueFormatter:v=>fmtJP(v)+' セッション'}),
    grid:{left:8,right:14,top:14,bottom:6,containLabel:true},
    xAxis:axX({data:areas.map(a=>a.name),axisLabel:{color:TX2,fontSize:10.5,fontFamily:FONT,interval:0}}),
    yAxis:axY({axisLabel:{formatter:v=>fmtJP(v),color:MUT,fontSize:10,fontFamily:MONOF}}),
    series:[{type:'bar',barWidth:34,
      itemStyle:{borderRadius:[5,5,0,0],color:{type:'linear',x:0,y:0,x2:0,y2:1,colorStops:[{offset:0,color:CY},{offset:1,color:'#1D5F8F'}]}},
      label:{show:true,position:'top',formatter:p=>fmtJP(p.value),color:TX2,fontSize:9.5,fontFamily:MONOF},
      data:areas.map(a=>Math.round(a.sessions))}]
  }),true);

  const topAff=[...aff].sort((a,b)=>b.idx-a.idx)[0];
  const combo4=combo[3];
  $('#audInsight').innerHTML=`<span class="it">INSIGHT — オーディエンス</span>
    <p>CVR指数の首位アフィニティは <span class="hl">${topAff.name}（指数 ${topAff.idx.toFixed(0)}）</span>。シェア上位セグメントとは一致せず、<span class="hl-b">量を運ぶ層（ファミリー）と決める層（クルマ好き）が別</span>という構図。広告のオーディエンス設計では前者に認知、後者に指名・リタゲを当てるのが定石。</p>
    <p><span class="hl-g">10回以上訪問のコンボ層は全体CVRの約${(combo4.cvr/avg).toFixed(1)}倍</span>。この層の多くが価格・グレードページを反復閲覧しており、値引き・納期の情報更新が再訪トリガーになっている。RFヒートで「8〜30日前×4〜9回」の塊が大きいのは、検討長期化のシグナル。</p>`;

  runCountUps($('section[data-view="aud"]'));
}

/* ==================================================
   VIEW: クロス分析ラボ
   ================================================== */
const LAB_PRESETS=[
  {n:'車種 × チャネル',row:'model',col:'channel',metric:'sessions'},
  {n:'車種 × アフィニティ',row:'model',col:'affinity',metric:'cvr'},
  {n:'商材 × チャネル',row:'goods',col:'channel',metric:'cv'},
  {n:'ステージ × チャネル',row:'stage',col:'channel',metric:'sessions'},
  {n:'エリア × 車種',row:'area',col:'model',metric:'sessions'},
  {n:'アフィニティ × 商材',row:'affinity',col:'goods',metric:'cvr'},
];
const METRICS={sessions:'セッション',cv:'CV',cvr:'CVR',newRate:'新規率'};
function renderLab(){
  /* コントロール構築（初回のみ） */
  if(!$('#labRow').dataset.built){
    const dims=Object.entries(GA.DIMS);
    $('#labRow').innerHTML=dims.map(([k,d])=>`<span class="chip ${k===ST.lab.row?'on':''}" data-lr="${k}">${d.name}</span>`).join('');
    $('#labCol').innerHTML=dims.map(([k,d])=>`<span class="chip ${k===ST.lab.col?'on':''}" data-lc="${k}">${d.name}</span>`).join('');
    $('#labMetric').innerHTML=Object.entries(METRICS).map(([k,n])=>`<span class="chip ${k===ST.lab.metric?'on':''}" data-lm="${k}">${n}</span>`).join('');
    $('#labPresets').innerHTML=LAB_PRESETS.map((p,i)=>`<span class="chip" data-lp="${i}">★ ${p.n}</span>`).join('');
    $('#labRow').dataset.built='1';
    const upd=()=>{
      $$('#labRow .chip').forEach(c=>c.classList.toggle('on',c.dataset.lr===ST.lab.row));
      $$('#labCol .chip').forEach(c=>c.classList.toggle('on',c.dataset.lc===ST.lab.col));
      $$('#labMetric .chip').forEach(c=>c.classList.toggle('on',c.dataset.lm===ST.lab.metric));
      drawLab();
    };
    $('#labRow').onclick=e=>{const c=e.target.closest('[data-lr]');if(!c)return;
      ST.lab.row=c.dataset.lr; if(ST.lab.row===ST.lab.col)ST.lab.col=Object.keys(GA.DIMS).find(k=>k!==ST.lab.row); upd()};
    $('#labCol').onclick=e=>{const c=e.target.closest('[data-lc]');if(!c)return;
      ST.lab.col=c.dataset.lc; if(ST.lab.row===ST.lab.col)ST.lab.row=Object.keys(GA.DIMS).find(k=>k!==ST.lab.col); upd()};
    $('#labMetric').onclick=e=>{const c=e.target.closest('[data-lm]');if(!c)return;ST.lab.metric=c.dataset.lm;upd()};
    $('#labPresets').onclick=e=>{const c=e.target.closest('[data-lp]');if(!c)return;
      const p=LAB_PRESETS[+c.dataset.lp];ST.lab={row:p.row,col:p.col,metric:p.metric};upd()};
  }
  drawLab();
  renderVs();
}
function drawLab(){
  const {row,col,metric}=ST.lab;
  const M=GA.pairMatrix(row,col,metric,ST.range,ST.seg);
  const isRate=metric==='cvr'||metric==='newRate';
  const flat=M.val.flat();
  const vmax=Math.max(...flat), vmin=Math.min(...flat);
  const data=[];
  M.val.forEach((r,ri)=>r.forEach((v,ci)=>data.push([ci,ri,isRate?+(v*100).toFixed(2):Math.round(v)])));
  const fmtV=v=> isRate? v.toFixed(metric==='cvr'?2:0)+'%' : fmtJP(v);
  E('chLab').setOption(baseOpt({
    tooltip:Object.assign({},TIP,{formatter:p=>{
      const s=M.sess[p.value[1]][p.value[0]], c=M.cv[p.value[1]][p.value[0]];
      return `<b>${M.rows[p.value[1]]}</b> × <b>${M.cols[p.value[0]]}</b><br>
        ${METRICS[metric]}: <b>${fmtV(p.value[2])}</b><br>
        <span style="color:${TX2};font-size:11px">セッション ${fmtJP(s)} ／ CV ${CM(c)} ／ CVR ${pct(c/Math.max(1,s),2)}</span>`;}}),
    grid:{left:8,right:14,top:34,bottom:44,containLabel:true},
    xAxis:axX({data:M.cols,position:'top',axisLabel:{color:TX2,fontSize:10.5,fontFamily:FONT,interval:0,rotate:M.cols.length>8?28:0}}),
    yAxis:axX({type:'category',data:M.rows,inverse:true,axisLabel:{color:TX2,fontSize:10.5,fontFamily:FONT}}),
    visualMap:{min:isRate?vmin*100:0,max:isRate?vmax*100:vmax,orient:'horizontal',left:'center',bottom:2,itemHeight:110,itemWidth:11,
      textStyle:{color:MUT,fontSize:10,fontFamily:MONOF},inRange:{color:[SEQ(.05),SEQ(.35),SEQ(.68),SEQ(1)]},
      formatter:v=>isRate?(+v).toFixed(1)+'%':fmtJP(v)},
    series:[{type:'heatmap',data,
      label:{show:M.rows.length*M.cols.length<=140,formatter:p=>fmtV(p.value[2]),color:'#EAF3FC',fontSize:9,fontFamily:MONOF},
      itemStyle:{borderColor:'#0A1120',borderWidth:2,borderRadius:4},
      emphasis:{itemStyle:{shadowBlur:10,shadowColor:'rgba(56,189,248,.55)'}}}]
  }),true);

  /* 自動インサイト */
  let bi=0,bj=0,si=0,sj=0;
  M.val.forEach((r,ri)=>r.forEach((v,ci)=>{if(v>M.val[bi][bj]){bi=ri;bj=ci}if(v<M.val[si][sj]){si=ri;sj=ci}}));
  $('#labInsight').innerHTML=`<span class="it">AUTO INSIGHT — ${GA.DIMS[row].name} × ${GA.DIMS[col].name}（${METRICS[metric]}）</span>
    <p>最大セルは <span class="hl">${M.rows[bi]} × ${M.cols[bj]}</span>（${fmtV(isRate?M.val[bi][bj]*100:M.val[bi][bj])}）、最小セルは <span class="hl-r">${M.rows[si]} × ${M.cols[sj]}</span>（${fmtV(isRate?M.val[si][sj]*100:M.val[si][sj])}）。${isRate?'率の高低はセッション量と独立に見ること（分母が小さいセルは変動が大きい）。':'絶対量のクロスなので、率で見たい場合は指標をCVRに切り替える。'}</p>`;
}

/* ---- VS モード ---- */
function renderVs(){
  const A=GA.agg(ST.range,ST.seg);
  const selA=$('#vsA'), selB=$('#vsB');
  if(!selA.dataset.built){
    const opts=GA.MODELS.map(m=>`<option value="${m.id}">${m.name}</option>`).join('');
    selA.innerHTML=opts; selB.innerHTML=opts;
    selA.value=ST.vs.a; selB.value=ST.vs.b;
    selA.onchange=()=>{ST.vs.a=selA.value;renderVs()};
    selB.onchange=()=>{ST.vs.b=selB.value;renderVs()};
    selA.dataset.built='1';
  }
  const a=A.models.find(m=>m.id===ST.vs.a), b=A.models.find(m=>m.id===ST.vs.b);
  const rows=[
    ['セッション',m=>m.sessions,v=>fmtJP(v)],
    ['前期間比',m=>m.sessions/m.prevSessions-1,v=>(v>0?'+':'')+(v*100).toFixed(1)+'%'],
    ['CVR',m=>m.cvr,v=>pct(v,2)],
    ['CV件数',m=>m.cv,v=>CM(v)],
    ['試乗予約',m=>m.cvGoal.testdrive,v=>CM(v)],
    ['再訪率',m=>m.retShare,v=>pct(v,0)],
    ['ページ/セッション',m=>m.pps,v=>v.toFixed(1)],
    ['広告依存度（低いほど強い）',m=>-m.adShare,v=>pct(-v,0)],
  ];
  const col=(m,o)=>`
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:9px">${carSvg(m.icon)}
      <div><b style="font-size:15px">${m.name}</b><div style="font-size:10px;color:var(--mut)">${m.cat} ／ ${m.price}</div></div>
      <div class="hex sm ${m.tier}" style="margin-left:auto">${m.tier}</div></div>
    ${rows.map(([l,f,fmt])=>{
      const mv=f(m),ov=f(o),win=mv>ov;
      return `<div class="vsrow ${win?'win':''}"><span>${l}${win?' 🏆':''}</span><span class="vv num">${fmt(mv)}</span></div>`;
    }).join('')}`;
  $('#vsColA').innerHTML=col(a,b);
  $('#vsColB').innerHTML=col(b,a);

  /* レーダー */
  const mx={sess:Math.max(...A.models.map(m=>m.sessions)),cvr:Math.max(...A.models.map(m=>m.cvr)),
    ret:Math.max(...A.models.map(m=>m.retShare)),pps:Math.max(...A.models.map(m=>m.pps)),
    tool:Math.max(...A.models.map(m=>m.toolSessions/m.sessions))};
  const vec=m=>[m.sessions/mx.sess,m.cvr/mx.cvr,m.retShare/mx.ret,m.pps/mx.pps,(m.toolSessions/m.sessions)/mx.tool].map(v=>+(v*100).toFixed(1));
  E('chVsRadar').setOption(baseOpt({
    tooltip:Object.assign({},TIP),
    legend:{bottom:0,textStyle:{color:TX2,fontSize:11},itemWidth:12,itemHeight:8},
    radar:{indicator:[{name:'集客力',max:100},{name:'転換力',max:100},{name:'再訪力',max:100},{name:'回遊力',max:100},{name:'検討熱量',max:100}],
      radius:'68%',center:['50%','48%'],
      axisName:{color:TX2,fontSize:11,fontFamily:FONT},
      splitArea:{areaStyle:{color:['rgba(56,189,248,.03)','rgba(56,189,248,.06)']}},
      splitLine:{lineStyle:{color:LINE2}},axisLine:{lineStyle:{color:LINE2}}},
    series:[{type:'radar',symbolSize:4,
      data:[{name:a.name,value:vec(a),lineStyle:{color:CAT8[0],width:2.4},itemStyle:{color:CAT8[0]},areaStyle:{color:CAT8[0]+'33'}},
            {name:b.name,value:vec(b),lineStyle:{color:CAT8[1],width:2.4},itemStyle:{color:CAT8[1]},areaStyle:{color:CAT8[1]+'2C'}}]}]
  }),true);
}

/* ==================================================
   VIEW: 計測設計
   ================================================== */
function renderDict(){
  const A=GA.agg(ST.range,'all');
  /* カスタムディメンション台帳 */
  $('#cdTable').innerHTML=`<thead><tr><th>スコープ</th><th>表示名</th><th>パラメータ名</th><th class="num">取得率</th><th>主な値</th><th>メモ</th></tr></thead>
  <tbody>${GA.CUSTOM_DIMS.map(d=>{
    const warn=d.fill<.8;
    return `<tr>
      <td><span class="tag" style="color:${d.scope==='User'?'var(--pu)':'var(--cy)'};background:color-mix(in srgb,${d.scope==='User'?'var(--pu)':'var(--cy)'} 12%,transparent)">${d.scope}</span></td>
      <td><b>${d.disp}</b></td>
      <td><span class="utm">${d.param}</span></td>
      <td class="num"><div class="tbar"><div class="bg"><i style="width:${(d.fill*100).toFixed(0)}%;background:${warn?'linear-gradient(90deg,var(--am),var(--rd))':'linear-gradient(90deg,var(--cy),var(--te))'}"></i></div><span style="${warn?'color:var(--am)':''}">${pct(d.fill,0)}${warn?' ⚠':''}</span></div></td>
      <td class="mono">${d.vals}</td>
      <td style="font-size:11px;color:var(--tx2)">${d.note}</td>
    </tr>`}).join('')}</tbody>`;

  /* イベント辞書 */
  const F=GA.funnel(ST.range,'all');
  const evCount=e=>{
    if(e.goal) return A.total.cvByGoal[e.goal];
    switch(e.scale){
      case 'pv':return A.total.pv;
      case 'modelSessions':return A.total.modelSessions;
      case 'grade':return F[2].v*1.65;
      case 'simStart':return F[2].v*.62;
      case 'dealer':return F[3].v;
      case 'fav':return A.total.modelSessions*.021;
      default:return 0;}
  };
  const evs=GA.EVENTS_DICT.map(e=>({...e,n:evCount(e)}));
  const evMax=Math.max(...evs.map(e=>e.n));
  $('#evTable').innerHTML=`<thead><tr><th>イベント名</th><th>内容</th><th class="num">発生数</th><th class="num">規模</th></tr></thead>
  <tbody>${evs.map(e=>`<tr>
    <td><span class="utm">${e.ev}</span>${e.goal?' <span class="tag" style="color:var(--gd);background:color-mix(in srgb,var(--gd) 12%,transparent)">CV</span>':''}</td>
    <td>${e.disp}</td>
    <td class="num">${fmtJP(e.n)}</td>
    <td class="num"><div class="tbar" style="min-width:90px"><div class="bg"><i style="width:${Math.max(1.2,Math.pow(e.n/evMax,.4)*100).toFixed(0)}%;background:${e.goal?'linear-gradient(90deg,#E4A900,var(--gd))':'linear-gradient(90deg,var(--cy),var(--te))'}"></i></div></div></td>
  </tr>`).join('')}</tbody>`;

  /* UTM規約 */
  $('#utmRules').innerHTML=`
    <p style="color:var(--tx2)">形式：<span class="utm">{施策}_{車種/商材}_{yyyymm}</span></p>
    <p><b>utm_source</b>：<span class="mono">google / yahoo / meta / line / x / youtube / tver / dv360 / crm</span></p>
    <p><b>utm_medium</b>：<span class="mono">cpc / display / video / paid_social / email</span></p>
    <p><b>utm_campaign</b> 例：<span class="utm">bz4x_summer_202608</span>　<span class="utm">alphard_mc_202607</span></p>
    <p style="font-size:11px;color:var(--mut)">・大文字/日本語/スペース禁止（表記ゆれは自動でチャネル不明に落ちる）<br>・社内リンクにUTMを付けない（セッション断絶の原因）。サイト内バナーは <span class="utm">padid</span> を使用</p>`;

  const low=GA.CUSTOM_DIMS.filter(d=>d.fill<.8).sort((a,b)=>a.fill-b.fill);
  $('#dictInsight').innerHTML=`<span class="it">CHECK — 計測負債</span>
    <p>取得率80%未満のカスタムディメンションが <span class="hl-r">${low.length}本</span>：${low.map(d=>`<b>${d.disp}</b>（<span class="num">${pct(d.fill,0)}</span>）`).join('、')}。特に <span class="hl">保有車種と来訪目的</span> はオーディエンス分析・サービス送客の精度に直結するため、ログイン導線でのプロフィール補完キャンペーンを推奨。</p>
    <p>UTM捕捉率は広告セッションの <b class="num">${pct(GA.utmTree(ST.range).tracked/GA.utmTree(ST.range).paidSess,0)}</b>【検証済み：選択期間の有料チャネル対象】。未捕捉分は媒体側の自動タグ（gclid等）で補完されるが、命名規約の徹底が第一。</p>`;
}
