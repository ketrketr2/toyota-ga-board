/* =====================================================
   TOYOTA GA4 COMMAND — データエンジン（デモデータ）
   すべての画面はこの単一テンソルから導出されるため、
   どの画面でも合計値・内訳が必ず一致する。
   ===================================================== */
const GA = (() => {

  /* ---------- 乱数（シード固定・決定論） ---------- */
  function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
  const R = mulberry32(20260818);
  const jit = (amp=1)=> (R()-0.5)*2*amp;          // -amp〜+amp
  const pick=(arr)=>arr[Math.floor(R()*arr.length)];

  /* ---------- カレンダー ---------- */
  const END = new Date(2026,7,18);                 // 2026-08-18（データ最終日）
  const NDAYS = 200;
  const DATES=[]; const DOW=[];
  for(let i=NDAYS-1;i>=0;i--){
    const d=new Date(END); d.setDate(d.getDate()-i);
    DATES.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);
    DOW.push(d.getDay());
  }
  const IDX = Object.fromEntries(DATES.map((s,i)=>[s,i]));

  /* ---------- マスタ：チャネル（表示順＝固定・配色順） ---------- */
  const CHANNELS=[
    {id:'org', name:'自然検索',        color:'#3987E5', share:.335, newShare:.55, paid:false},
    {id:'sem', name:'リスティング広告', color:'#D95926', share:.165, newShare:.64, paid:true},
    {id:'dsp', name:'ディスプレイ広告', color:'#199E70', share:.062, newShare:.82, paid:true},
    {id:'vid', name:'動画広告',        color:'#C98500', share:.078, newShare:.78, paid:true},
    {id:'sns', name:'SNS広告',        color:'#D55181', share:.070, newShare:.74, paid:true},
    {id:'crm', name:'メール・LINE',    color:'#008300', share:.050, newShare:.12, paid:false},
    {id:'ref', name:'外部サイト',      color:'#9085E9', share:.095, newShare:.60, paid:false},
    {id:'dir', name:'ダイレクト',      color:'#E66767', share:.145, newShare:.28, paid:false},
  ];
  const NC=CHANNELS.length;

  /* ---------- マスタ：車種 ----------
     base: 平常時の1日あたり車種ページセッション（千）
     mix: チャネル補正（1=平均）/ cvr: 見積り完了率の基準
     tool: 検討ツール到達率 / dealer: 販売店接点率 */
  const MODELS=[
    {id:'alphard', name:'アルファード',     cat:'ミニバン',   price:'510万〜', base:68, cvr:.019, tool:.24, dealer:.072, eng:.66, pps:5.8,
     mix:{org:1.15,sem:1.0,dsp:.9,vid:1.1,sns:.8,crm:1.1,ref:1.1,dir:1.2}, icon:'van'},
    {id:'voxy',    name:'ヴォクシー',       cat:'ミニバン',   price:'309万〜', base:38, cvr:.022, tool:.26, dealer:.078, eng:.63, pps:5.2,
     mix:{org:1.0,sem:1.05,dsp:1.0,vid:1.0,sns:1.35,crm:1.0,ref:.9,dir:.95}, icon:'van'},
    {id:'noah',    name:'ノア',            cat:'ミニバン',   price:'305万〜', base:30, cvr:.021, tool:.25, dealer:.076, eng:.62, pps:5.0,
     mix:{org:1.0,sem:1.05,dsp:1.0,vid:.95,sns:1.3,crm:1.0,ref:.9,dir:.95}, icon:'van'},
    {id:'sienta',  name:'シエンタ',         cat:'ミニバン',   price:'199万〜', base:42, cvr:.024, tool:.27, dealer:.082, eng:.64, pps:4.8,
     mix:{org:.95,sem:1.1,dsp:1.05,vid:.9,sns:1.5,crm:1.05,ref:.85,dir:.9}, icon:'van'},
    {id:'harrier', name:'ハリアー',         cat:'SUV',       price:'320万〜', base:56, cvr:.021, tool:.25, dealer:.070, eng:.67, pps:6.1,
     mix:{org:1.05,sem:1.1,dsp:1.15,vid:1.05,sns:1.0,crm:.9,ref:1.0,dir:1.0}, icon:'suv'},
    {id:'rav4',    name:'RAV4',           cat:'SUV',       price:'324万〜', base:33, cvr:.019, tool:.23, dealer:.068, eng:.63, pps:5.4,
     mix:{org:1.0,sem:1.0,dsp:1.05,vid:.95,sns:1.05,crm:.9,ref:1.0,dir:.95}, icon:'suv'},
    {id:'landcruiser',name:'ランドクルーザー',cat:'SUV',      price:'525万〜', base:62, cvr:.013, tool:.20, dealer:.055, eng:.70, pps:6.8,
     mix:{org:1.3,sem:.8,dsp:.7,vid:.9,sns:.7,crm:.9,ref:1.35,dir:1.3}, icon:'suv'},
    {id:'corolla', name:'カローラ',         cat:'セダン・ワゴン', price:'216万〜', base:40, cvr:.021, tool:.24, dealer:.075, eng:.60, pps:4.6,
     mix:{org:1.05,sem:1.0,dsp:.95,vid:.9,sns:.85,crm:1.15,ref:.95,dir:1.0}, icon:'sedan'},
    {id:'crown',   name:'クラウン',         cat:'セダン・ワゴン', price:'475万〜', base:34, cvr:.014, tool:.21, dealer:.058, eng:.68, pps:6.2,
     mix:{org:1.1,sem:.9,dsp:1.0,vid:1.4,sns:.8,crm:.95,ref:1.1,dir:1.1}, icon:'sedan'},
    {id:'prius',   name:'プリウス',         cat:'コンパクト・HEV', price:'275万〜', base:36, cvr:.018, tool:.23, dealer:.066, eng:.64, pps:5.3,
     mix:{org:1.1,sem:.95,dsp:.95,vid:1.0,sns:.95,crm:1.1,ref:1.05,dir:1.05}, icon:'sedan'},
    {id:'aqua',    name:'アクア',           cat:'コンパクト・HEV', price:'214万〜', base:24, cvr:.020, tool:.24, dealer:.074, eng:.59, pps:4.4,
     mix:{org:1.0,sem:1.05,dsp:1.0,vid:.85,sns:1.0,crm:1.2,ref:.85,dir:.95}, icon:'compact'},
    {id:'yaris',   name:'ヤリス',           cat:'コンパクト・HEV', price:'155万〜', base:30, cvr:.022, tool:.25, dealer:.080, eng:.58, pps:4.2,
     mix:{org:1.0,sem:1.1,dsp:1.05,vid:.85,sns:1.05,crm:1.1,ref:.85,dir:.9}, icon:'compact'},
    {id:'bz4x',    name:'bZ4X',           cat:'BEV',       price:'550万〜', base:12, cvr:.009, tool:.19, dealer:.045, eng:.61, pps:5.6,
     mix:{org:.8,sem:1.05,dsp:1.5,vid:1.6,sns:1.25,crm:.8,ref:1.0,dir:.7}, icon:'ev'},
    {id:'gr86',    name:'GR86',           cat:'スポーツ',    price:'293万〜', base:9,  cvr:.010, tool:.18, dealer:.050, eng:.72, pps:7.2,
     mix:{org:1.2,sem:.8,dsp:.7,vid:1.0,sns:1.2,crm:.8,ref:1.5,dir:1.2}, icon:'sport'},
  ];
  const NM=MODELS.length;

  /* ---------- マスタ：商材・コンバージョン ---------- */
  const GOODS=[
    {id:'new',    name:'新車',        color:'#3987E5'},
    {id:'used',   name:'認定中古車',  color:'#D95926'},
    {id:'kinto',  name:'KINTO',      color:'#199E70'},
    {id:'service',name:'点検・サービス',color:'#C98500'},
    {id:'acc',    name:'アクセサリー', color:'#D55181'},
  ];
  const GOALS=[
    {id:'estimate', name:'見積りシミュレーション完了', goods:'new',    mult:0.60,  value:8000,  ev:'estimate_complete'},
    {id:'testdrive',name:'試乗予約',                goods:'new',    mult:0.093, value:25000, ev:'test_drive_reserve'},
    {id:'visit',    name:'来店予約',                goods:'new',    mult:0.063, value:22000, ev:'dealer_visit_reserve'},
    {id:'catalog',  name:'WEBカタログ閲覧完了',      goods:'new',    mult:0.32,  value:1500,  ev:'catalog_view_complete'},
    {id:'kinto',    name:'KINTO 申込・見積り',      goods:'kinto',  mult:0.033, value:18000, ev:'kinto_apply'},
    {id:'used',     name:'中古車 在庫問合せ',        goods:'used',   mult:0.057, value:9000,  ev:'used_stock_inquiry'},
    {id:'service',  name:'点検・サービス予約',       goods:'service',mult:0.21,  value:4500,  ev:'service_reserve'},
    {id:'acc',      name:'アクセサリー購入',         goods:'acc',    mult:0.024, value:6000,  ev:'acc_purchase'},
  ];
  /* ゴール×チャネル係数（メールはサービス系に強い等） */
  const GOAL_CH={
    estimate:{org:1.15,sem:1.25,dsp:.45,vid:.55,sns:.7,crm:1.1,ref:.9,dir:1.15},
    testdrive:{org:1.1,sem:1.2,dsp:.5,vid:.65,sns:.8,crm:1.15,ref:.85,dir:1.2},
    visit:{org:1.1,sem:1.15,dsp:.5,vid:.6,sns:.75,crm:1.3,ref:.85,dir:1.25},
    catalog:{org:1.05,sem:1.1,dsp:.8,vid:.9,sns:1.0,crm:.9,ref:1.0,dir:.95},
    kinto:{org:.85,sem:1.1,dsp:.9,vid:1.15,sns:2.6,crm:.85,ref:1.0,dir:.75},
    used:{org:1.2,sem:1.15,dsp:.6,vid:.5,sns:.7,crm:.9,ref:1.1,dir:1.0},
    service:{org:.55,sem:.30,dsp:.15,vid:.15,sns:.25,crm:8.5,dir:1.2,ref:.35},
    acc:{org:1.0,sem:.9,dsp:.7,vid:.7,sns:1.2,crm:1.6,ref:.9,dir:1.1},
  };
  /* 再訪/新規のCV倍率（再訪÷新規） */
  const GOAL_RET_RATIO={estimate:3.0,testdrive:3.4,visit:3.6,catalog:1.8,kinto:2.6,used:2.4,service:5.5,acc:2.8};
  /* 車種ごとの商材関心シェア（セッション帰属・合計1） */
  function goodsShare(m){
    let s={new:.62,used:.10,kinto:.09,service:.13,acc:.06};
    if(m.id==='landcruiser'){s={new:.55,used:.20,kinto:.05,service:.13,acc:.07}}
    if(m.id==='alphard'){s={new:.58,used:.15,kinto:.08,service:.12,acc:.07}}
    if(m.cat==='コンパクト・HEV'){s={new:.58,used:.11,kinto:.12,service:.14,acc:.05}}
    if(m.id==='bz4x'){s={new:.60,used:.04,kinto:.22,service:.09,acc:.05}}
    if(m.id==='gr86'){s={new:.52,used:.22,kinto:.06,service:.10,acc:.10}}
    if(m.id==='sienta'||m.id==='voxy'||m.id==='noah'){s={new:.60,used:.10,kinto:.12,service:.12,acc:.06}}
    return s;
  }
  /* サービス予約は保有台数の多い車種で高い（cvr補正） */
  const SERVICE_W={corolla:2.6,prius:2.2,aqua:2.4,yaris:1.9,sienta:1.5,voxy:1.4,noah:1.3,alphard:1.1,harrier:1.0,rav4:.9,landcruiser:.8,crown:.9,bz4x:.4,gr86:.5};

  /* ---------- マスタ：アフィニティ／ステージ／エリア ---------- */
  const AFFINITY=[
    {id:'car',   name:'クルマ好き'},
    {id:'family',name:'ファミリー層'},
    {id:'outdoor',name:'アウトドア派'},
    {id:'tech',  name:'テクノロジー志向'},
    {id:'eco',   name:'エコ・環境志向'},
    {id:'travel',name:'旅行好き'},
    {id:'sports',name:'スポーツ観戦好き'},
    {id:'biz',   name:'ビジネス層'},
  ];
  const AFF_CVR_MULT={car:1.35,family:1.22,outdoor:1.05,tech:.95,eco:1.0,travel:.92,sports:.85,biz:1.08};
  function affShare(m){
    const base={car:.16,family:.18,outdoor:.12,tech:.11,eco:.11,travel:.12,sports:.09,biz:.11};
    const t={...base};
    const boost=(k,v)=>{t[k]*=v};
    if(m.cat==='ミニバン'){boost('family',1.8);boost('travel',1.2);boost('car',.75);boost('biz',.7)}
    if(m.cat==='SUV'){boost('outdoor',1.7);boost('car',1.15);boost('travel',1.15)}
    if(m.id==='landcruiser'){boost('outdoor',1.4);boost('car',1.3);boost('biz',1.1)}
    if(m.cat==='セダン・ワゴン'){boost('biz',1.5)}
    if(m.id==='crown'){boost('biz',1.9);boost('car',1.2);boost('family',.6)}
    if(m.cat==='コンパクト・HEV'){boost('eco',1.5);boost('family',1.1)}
    if(m.id==='bz4x'){boost('tech',2.1);boost('eco',1.9);boost('family',.7)}
    if(m.id==='gr86'){boost('car',2.6);boost('sports',1.5);boost('family',.4)}
    const sum=Object.values(t).reduce((a,b)=>a+b,0);
    Object.keys(t).forEach(k=>t[k]/=sum);
    return t;
  }
  const STAGES=[
    {id:'aware', name:'認知'},
    {id:'interest', name:'興味・比較'},
    {id:'consider', name:'検討・シミュレーション'},
    {id:'nego', name:'商談・来店'},
  ];
  const STAGE_CH={ // チャネル→ステージ構成（合計1）
    org:[.38,.30,.22,.10], sem:[.28,.30,.29,.13], dsp:[.62,.25,.10,.03], vid:[.58,.27,.11,.04],
    sns:[.52,.30,.13,.05], crm:[.10,.22,.38,.30], ref:[.44,.31,.18,.07], dir:[.22,.26,.30,.22],
  };
  const STAGE_CV_W=[.02,.10,.45,.43];     // CVのステージ帰属
  const STAGE_LOGIN=[.08,.17,.34,.55];    // ステージ別ログイン率
  const AREAS=[
    {id:'hokkaido',name:'北海道・東北'},{id:'kanto',name:'関東'},{id:'chubu',name:'中部'},
    {id:'kinki',name:'近畿'},{id:'chushi',name:'中国・四国'},{id:'kyushu',name:'九州・沖縄'},
  ];
  function areaShare(m){
    const t={hokkaido:.09,kanto:.35,chubu:.17,kinki:.19,chushi:.09,kyushu:.11};
    if(m.id==='landcruiser'){t.chubu*=1.2;t.kyushu*=1.25;t.hokkaido*=1.3;t.kanto*=.85}
    if(m.id==='crown'){t.kanto*=1.12;t.chubu*=1.1}
    if(m.id==='bz4x'){t.kanto*=1.25;t.kinki*=1.05;t.chushi*=.8;t.hokkaido*=.7}
    if(m.cat==='ミニバン'){t.kanto*=1.02;t.kyushu*=1.05}
    const s=Object.values(t).reduce((a,b)=>a+b,0);Object.keys(t).forEach(k=>t[k]/=s);
    return t;
  }

  /* ---------- 訪問回数（コンボ）・RF ---------- */
  const BUCKETS=[
    {id:'v1', name:'1回（初訪問）', share:.46, cvrMult:.42},
    {id:'v2', name:'2〜3回',      share:.27, cvrMult:.95},
    {id:'v3', name:'4〜9回',      share:.17, cvrMult:1.95},
    {id:'v4', name:'10回以上',    share:.10, cvrMult:3.20},
  ];
  const RECENCY=['当日','1〜7日前','8〜30日前','31日以上前'];
  const RF_SHARE=[ // recency×frequency(2回目以降のみ) 構成
    [.07,.05,.03],[ .16,.11,.05],[ .13,.14,.07],[ .08,.07,.04]
  ];

  /* ---------- デバイス・デモグラ ---------- */
  const DEVICES=[{id:'mob',name:'モバイル'},{id:'pc',name:'PC'},{id:'tab',name:'タブレット'}];
  const DEV_CH={org:[.71,.25,.04],sem:[.74,.22,.04],dsp:[.80,.16,.04],vid:[.83,.13,.04],sns:[.88,.09,.03],crm:[.76,.20,.04],ref:[.62,.34,.04],dir:[.58,.37,.05]};
  const AGES=['18-24','25-34','35-44','45-54','55-64','65+'];
  function ageGender(m){ // [male share by age…, female share by age…] 合計1
    let male=[.04,.12,.16,.15,.11,.08], female=[.03,.08,.09,.07,.04,.03];
    if(m.cat==='ミニバン'){male=[.03,.14,.19,.13,.07,.04];female=[.03,.13,.13,.07,.03,.01]}
    if(m.id==='crown'||m.id==='landcruiser'){male=[.02,.08,.14,.19,.16,.12];female=[.01,.04,.07,.08,.05,.04]}
    if(m.id==='gr86'){male=[.09,.19,.18,.14,.10,.05];female=[.03,.07,.07,.05,.02,.01]}
    if(m.id==='aqua'||m.id==='yaris'){male=[.05,.10,.12,.12,.11,.10];female=[.04,.08,.10,.09,.05,.04]}
    if(m.id==='bz4x'){male=[.03,.14,.20,.17,.11,.06];female=[.02,.08,.09,.06,.03,.01]}
    const s=[...male,...female].reduce((a,b)=>a+b,0);
    return {male:male.map(v=>v/s), female:female.map(v=>v/s)};
  }

  /* ---------- イベント（スパイク） ---------- */
  const EVENTS=[
    {date:'2026-05-03',model:null,      amp:1.10,dur:4, label:'GW連休'},
    {date:'2026-06-26',model:'gr86',    amp:2.4, dur:7, label:'GR86 限定車抽選 受付開始'},
    {date:'2026-07-01',model:'harrier', amp:1.9, dur:10,label:'ハリアー 特別仕様車 発表'},
    {date:'2026-07-17',model:'alphard', amp:1.8, dur:12,label:'アルファード 一部改良 発表'},
    {date:'2026-08-01',model:'crown',   amp:1.7, dur:10,label:'クラウン 一部改良 発表'},
    {date:'2026-08-07',model:'bz4x',    amp:2.2, dur:42,label:'bZ4X サマーキャンペーン 開始'},
  ];
  const WD=[1.16,.94,.90,.92,.94,1.00,1.22]; // 日〜土
  /* CV日次ノイズ（決定論・セグメント間で共通のため合計整合は維持される） */
  const DN={};
  GOALS.forEach((g,gi)=>{
    DN[g.id]=new Array(NDAYS);
    for(let d=0;d<NDAYS;d++){
      const x=Math.sin((d+3)*12.9898+gi*78.233)*43758.5453;
      DN[g.id][d]=1+((x-Math.floor(x))-0.5)*0.20;
    }
  });

  /* ---------- 基幹テンソル S[d][m][c]（車種ページセッション） ---------- */
  const S=[]; const OTHER=[]; // OTHER[d][c] 車種ページ以外
  const trendAt=(d)=> 1 + 0.0006*(d-NDAYS/2);   // ゆるやかな成長
  const eventAmp=(d,mid)=>{
    let a=1;
    for(const ev of EVENTS){
      const s=IDX[ev.date]; if(s==null||d<s||d>=s+ev.dur) continue;
      const decay = ev.dur>20 ? 1 : (1-(d-s)/ev.dur);          // 長期キャンペーンは維持
      const amp = 1+(ev.amp-1)*(ev.dur>20?(d-s<3?(d-s+1)/3:1):decay);
      if(ev.model===null) a*=amp;
      else if(ev.model===mid) a*=amp;
    }
    return a;
  };
  // チャネルミックス（車種ごと正規化）
  const MIXN = MODELS.map(m=>{
    const w=CHANNELS.map(c=>c.share*(m.mix[c.id]||1));
    const s=w.reduce((a,b)=>a+b,0);
    return w.map(v=>v/s);
  });
  for(let d=0;d<NDAYS;d++){
    const wd=WD[DOW[d]]*trendAt(d);
    const row=[];
    for(let mi=0;mi<NM;mi++){
      const m=MODELS[mi];
      const dayN = 1+jit(.055);
      const tot = m.base*1000*wd*eventAmp(d,m.id)*dayN;
      const cells=[];
      for(let c=0;c<NC;c++){
        let v=tot*MIXN[mi][c]*(1+jit(.06));
        // イベント時は広告チャネルがより増える（キャンペーン連動）
        if(eventAmp(d,m.id)>1.15 && (CHANNELS[c].paid)) v*=1.25;
        cells.push(v);
      }
      row.push(cells);
    }
    S.push(row);
    // 車種ページ以外（TOP・企業情報・サポート等）
    const oc=[];
    for(let c=0;c<NC;c++){
      const modelSum=row.reduce((a,r)=>a+r[c],0);
      const f={org:.95,sem:.30,dsp:.55,vid:.60,sns:.65,crm:1.45,ref:1.15,dir:1.35}[CHANNELS[c].id];
      oc.push(modelSum*f*.52*(1+jit(.05)));
    }
    OTHER.push(oc);
  }

  /* ---------- セグメント係数 ---------- */
  function segShare(seg,c){ // セッションに掛ける割合
    const n=CHANNELS[c].newShare;
    return seg==='new'? n : seg==='ret'? 1-n : 1;
  }
  function segCvFactor(seg,gid,c){ // CVに掛ける割合（合計が全体と一致するよう厳密に分解）
    const n=CHANNELS[c].newShare, k=GOAL_RET_RATIO[gid];
    const newF = n/(n+(1-n)*k);       // 新規が持つCVシェア
    return seg==='new'? newF : seg==='ret'? 1-newF : 1;
  }

  /* ---------- 集計（range: 日数 / seg: all|new|ret） ---------- */
  const memo={};
  function agg(range,seg){
    const key=range+'_'+seg;
    if(memo[key]) return memo[key];
    const to=NDAYS-1, from=NDAYS-range, pfrom=NDAYS-range*2, pto=from-1;
    const win=(a,b)=>({a,b});
    const cur=win(from,to), prev=win(pfrom,pto);

    function sumWindow(w){
      const byModel=MODELS.map(()=>({sessions:0,byChannel:new Array(NC).fill(0),cv:{},cvByChannel:{},daily:[]}));
      const byChannel=new Array(NC).fill(0);
      const dailySessions=[],dailyCv=[],dailyByChannel=CHANNELS.map(()=>[]);
      let other=0; const otherByChannel=new Array(NC).fill(0);
      GOALS.forEach(g=>byModel.forEach(bm=>{bm.cv[g.id]=0;bm.cvByChannel[g.id]=new Array(NC).fill(0)}));
      for(let d=w.a;d<=w.b;d++){
        let daySess=0, dayCv=0;
        const dayCh=new Array(NC).fill(0);
        for(let mi=0;mi<NM;mi++){
          const m=MODELS[mi]; let mDay=0;
          for(let c=0;c<NC;c++){
            const s0=S[d][mi][c], s=s0*segShare(seg,c);
            byModel[mi].sessions+=s; byModel[mi].byChannel[c]+=s; byChannel[c]+=s;
            daySess+=s; dayCh[c]+=s; mDay+=s;
            for(const g of GOALS){
              let rate=m.cvr*g.mult*(GOAL_CH[g.id][CHANNELS[c].id]||1);
              if(g.id==='service') rate=m.cvr*g.mult*(GOAL_CH.service[CHANNELS[c].id]||1)*(SERVICE_W[m.id]||1)*.55;
              const cv=s0*rate*segCvFactor(seg,g.id,c)*DN[g.id][d];
              byModel[mi].cv[g.id]+=cv; byModel[mi].cvByChannel[g.id][c]+=cv; dayCv+=cv;
            }
          }
          byModel[mi].daily.push(mDay);
        }
        for(let c=0;c<NC;c++){
          const o=OTHER[d][c]*segShare(seg,c);
          other+=o; otherByChannel[c]+=o; daySess+=o; dayCh[c]+=o;
          // サイト共通CV（サービス予約・アクセサリー等の一部は車種ページ外）
        }
        dailySessions.push(daySess); dailyCv.push(dayCv);
        for(let c=0;c<NC;c++) dailyByChannel[c].push(dayCh[c]);
      }
      return {byModel,byChannel,other,otherByChannel,dailySessions,dailyCv,dailyByChannel,
              dates:DATES.slice(w.a,w.b+1)};
    }

    const A=sumWindow(cur), P=sumWindow(prev);

    function totals(X){
      const modelSessions=X.byModel.reduce((a,b)=>a+b.sessions,0);
      const sessions=modelSessions+X.other;
      const cvByGoal={}; GOALS.forEach(g=>cvByGoal[g.id]=X.byModel.reduce((a,b)=>a+b.cv[g.id],0));
      const cv=Object.values(cvByGoal).reduce((a,b)=>a+b,0);
      const value=GOALS.reduce((a,g)=>a+cvByGoal[g.id]*g.value,0);
      // ユーザー数はセッション÷頻度係数（範囲が長いほど重複が増える）
      const freq= range<=7?1.32: range<=28?1.78:2.45;
      const users=sessions/freq;
      const nsAll=CHANNELS.reduce((a,c,i)=>a+(X.byChannel[i]+X.otherByChannel[i])*(seg==='all'?c.newShare:seg==='new'?1:0),0);
      const newRate= sessions? nsAll/sessions:0;
      const pv=X.byModel.reduce((a,b,i)=>a+b.sessions*MODELS[i].pps,0)+X.other*2.1;
      return {sessions,users,newRate,cv,cvByGoal,value,pv,modelSessions};
    }
    const T=totals(A), TP=totals(P);
    // エンゲージメント（車種加重）
    const engRate=A.byModel.reduce((a,b,i)=>a+MODELS[i].eng*b.sessions,0)/Math.max(1,T.modelSessions)*(seg==='ret'?1.08:seg==='new'?0.94:1);
    const avgDur=A.byModel.reduce((a,b,i)=>a+(52+MODELS[i].pps*21)*b.sessions,0)/Math.max(1,T.modelSessions);

    /* 車種オブジェクト */
    const models=MODELS.map((m,mi)=>{
      const bm=A.byModel[mi], pm=P.byModel[mi];
      const cv=GOALS.reduce((a,g)=>a+bm.cv[g.id],0);
      const cvPrev=GOALS.reduce((a,g)=>a+pm.cv[g.id],0);
      const retShare=bm.byChannel.reduce((a,v,c)=>a+v*(1-CHANNELS[c].newShare),0)/Math.max(1,bm.sessions);
      const adShare=bm.byChannel.reduce((a,v,c)=>a+(CHANNELS[c].paid?v:0),0)/Math.max(1,bm.sessions);
      return {...m, mi, sessions:bm.sessions, prevSessions:pm.sessions,
        byChannel:bm.byChannel, cvGoal:bm.cv, cvByChannel:bm.cvByChannel, cv, cvPrev,
        cvr:cv/Math.max(1,bm.sessions), retShare, adShare,
        pv:bm.sessions*m.pps, daily:bm.daily,
        toolSessions:bm.sessions*m.tool, dealerSessions:bm.sessions*m.dealer};
    });
    // ティア（セッション順位で S/A/B/C）
    const sorted=[...models].sort((a,b)=>b.sessions-a.sessions);
    sorted.forEach((m,i)=>{m.tier= i<2?'S': i<6?'A': i<10?'B':'C'; m.rank=i+1;});

    /* チャネルオブジェクト */
    const channels=CHANNELS.map((c,ci)=>{
      const sess=A.byChannel[ci]+A.otherByChannel[ci];
      const prevSess=P.byChannel[ci]+P.otherByChannel[ci];
      const cv=models.reduce((a,m)=>a+GOALS.reduce((x,g)=>x+m.cvByChannel[g.id][ci],0),0);
      return {...c, ci, sessions:sess, prevSessions:prevSess, cv, cvr:cv/Math.max(1,sess),
        daily:A.dailyByChannel[ci]};
    });

    /* ゴール・商材 */
    const goals=GOALS.map(g=>{
      const cv=T.cvByGoal[g.id], prev=TP.cvByGoal[g.id];
      const daily=A.dates.map((_,i)=>0);
      // 日次はモデル日次から比例配分（表示用の近似・合計は厳密一致）
      return {...g, cv, prev, value:cv*g.value};
    });
    const goods=GOODS.map(gd=>{
      const gs=GOALS.filter(g=>g.goods===gd.id);
      const cv=gs.reduce((a,g)=>a+T.cvByGoal[g.id],0);
      const prev=gs.reduce((a,g)=>a+TP.cvByGoal[g.id],0);
      const sessions=models.reduce((a,m)=>a+m.sessions*goodsShare(m)[gd.id],0);
      const prevSessions=MODELS.reduce((a,m,mi)=>a+P.byModel[mi].sessions*goodsShare(m)[gd.id],0);
      const value=gs.reduce((a,g)=>a+T.cvByGoal[g.id]*g.value,0);
      return {...gd, cv, prev, sessions, prevSessions, value, goals:gs.map(g=>({id:g.id,name:g.name,cv:T.cvByGoal[g.id],prev:TP.cvByGoal[g.id],value:T.cvByGoal[g.id]*g.value}))};
    });

    const out={range,seg,from:DATES[from],to:DATES[to],prevFrom:DATES[pfrom],prevTo:DATES[pto],
      dates:A.dates, dailySessions:A.dailySessions, dailyCv:A.dailyCv, dailyByChannel:A.dailyByChannel,
      prevDailySessions:P.dailySessions,
      total:{...T,engRate,avgDur}, prevTotal:TP,
      models, channels, goals, goods, otherSessions:A.other};
    memo[key]=out;
    return out;
  }

  /* ---------- クロス行列 ---------- */
  const DIMS={
    model:{name:'車種', items:()=>MODELS.map(m=>m.name)},
    channel:{name:'チャネル', items:()=>CHANNELS.map(c=>c.name)},
    goods:{name:'商材', items:()=>GOODS.map(g=>g.name)},
    affinity:{name:'アフィニティ', items:()=>AFFINITY.map(a=>a.name)},
    stage:{name:'検討ステージ', items:()=>STAGES.map(s=>s.name)},
    area:{name:'エリア', items:()=>AREAS.map(a=>a.name)},
  };
  // 車種正規化アフィニティCV倍率
  const AFF_MULT_N=MODELS.map(m=>{
    const sh=affShare(m); const denom=AFFINITY.reduce((a,af)=>a+sh[af.id]*AFF_CVR_MULT[af.id],0);
    const o={}; AFFINITY.forEach(af=>o[af.id]=AFF_CVR_MULT[af.id]/denom); return o;
  });
  function factorLen(dim){return dim==='model'?NM:dim==='channel'?NC:dim==='goods'?GOODS.length:dim==='affinity'?AFFINITY.length:dim==='stage'?STAGES.length:AREAS.length}
  // (m,c)セルのセッション/CVを 各ディメンションへ按分する係数ベクトル
  function factorVec(dim, mi, ci, kind){ // kind: 'sess' | 'cv'
    const m=MODELS[mi], cid=CHANNELS[ci].id;
    switch(dim){
      case 'model':{const v=new Array(NM).fill(0);v[mi]=1;return v}
      case 'channel':{const v=new Array(NC).fill(0);v[ci]=1;return v}
      case 'goods':{
        if(kind==='sess'){const gs=goodsShare(m);return GOODS.map(g=>gs[g.id])}
        return null; // cvはゴール直付けで扱う
      }
      case 'affinity':{
        const sh=affShare(m);
        if(kind==='sess')return AFFINITY.map(a=>sh[a.id]);
        return AFFINITY.map(a=>sh[a.id]*AFF_MULT_N[mi][a.id]);
      }
      case 'stage':{
        const st=STAGE_CH[cid];
        if(kind==='sess')return st;
        return STAGE_CV_W;
      }
      case 'area':{
        const ar=areaShare(m);return AREAS.map(a=>ar[a.id]);
      }
    }
  }
  function pairMatrix(rowDim,colDim,metric,range,seg){
    const A=agg(range,seg);
    const nr=factorLen(rowDim), nc2=factorLen(colDim);
    const sess=Array.from({length:nr},()=>new Array(nc2).fill(0));
    const cv=Array.from({length:nr},()=>new Array(nc2).fill(0));
    const news=Array.from({length:nr},()=>new Array(nc2).fill(0));
    for(let mi=0;mi<NM;mi++){
      const M=A.models[mi];
      for(let ci=0;ci<NC;ci++){
        const s=M.byChannel[ci];
        const cvCell=GOALS.reduce((a,g)=>a+M.cvByChannel[g.id][ci],0);
        const rS=factorVec(rowDim,mi,ci,'sess'), cS=factorVec(colDim,mi,ci,'sess');
        const rC=factorVec(rowDim,mi,ci,'cv')||null, cC=factorVec(colDim,mi,ci,'cv')||null;
        const nsh=CHANNELS[ci].newShare;
        for(let r=0;r<nr;r++)for(let c2=0;c2<nc2;c2++){
          sess[r][c2]+=s*rS[r]*cS[c2];
          news[r][c2]+=s*rS[r]*cS[c2]*nsh;
        }
        // CV按分：goods はゴール直付け、それ以外は係数
        const rowIsGoods=rowDim==='goods', colIsGoods=colDim==='goods';
        for(const g of GOALS){
          const gcv=M.cvByChannel[g.id][ci];
          const gi=GOODS.findIndex(x=>x.id===g.goods);
          const rV=rowIsGoods? GOODS.map((_,i)=>i===gi?1:0) : (rC||rS.map((v,i)=>rDimCvFallback(rowDim,mi,ci,i,rS)));
          const cV=colIsGoods? GOODS.map((_,i)=>i===gi?1:0) : (cC||cS.map((v,i)=>rDimCvFallback(colDim,mi,ci,i,cS)));
          for(let r=0;r<nr;r++)for(let c2=0;c2<nc2;c2++)cv[r][c2]+=gcv*rV[r]*cV[c2];
        }
      }
    }
    function rDimCvFallback(dim,mi,ci,i,sVec){return sVec[i]} // model/channel/areaはセッション按分と同じ
    const rows=DIMS[rowDim].items(), cols=DIMS[colDim].items();
    const val=Array.from({length:nr},(_,r)=>cols.map((_,c2)=>{
      if(metric==='sessions')return sess[r][c2];
      if(metric==='cv')return cv[r][c2];
      if(metric==='cvr')return cv[r][c2]/Math.max(1,sess[r][c2]);
      if(metric==='newRate')return news[r][c2]/Math.max(1,sess[r][c2]);
    }));
    return {rows,cols,val,sess,cv};
  }

  /* ---------- サンキー（動線） ---------- */
  function sankey(range,seg){
    const A=agg(range,seg);
    const chSess=A.channels.map(c=>c.sessions);
    const LP=['車種トップ','キャンペーンLP','サイトトップ','販売店検索','KINTO・中古車'];
    const LP_MIX={org:[.46,.05,.30,.09,.10],sem:[.50,.16,.14,.10,.10],dsp:[.24,.58,.10,.03,.05],vid:[.28,.54,.10,.03,.05],
      sns:[.30,.44,.12,.04,.10],crm:[.26,.16,.30,.14,.14],ref:[.38,.10,.34,.08,.10],dir:[.30,.04,.48,.10,.08]};
    const MID=['グレード・価格','見積りシミュレーター','車種比較・ギャラリー','販売店・在庫検索','離脱（回遊なし）'];
    const LP_MID=[[.26,.16,.22,.10,.26],[.20,.22,.18,.08,.32],[.14,.08,.16,.12,.50],[.10,.10,.06,.52,.22],[.16,.30,.10,.16,.28]];
    const OUT=['見積り完了','試乗・来店予約','KINTO・中古車CV','サービス予約','未CVで離脱'];
    const links=[],nodes=[];
    const nodeIdx={}; const addNode=n=>{if(nodeIdx[n]==null){nodeIdx[n]=nodes.length;nodes.push({name:n})}return nodeIdx[n]};
    const lpTotals=new Array(LP.length).fill(0);
    A.channels.forEach((c)=>{
      const mix=LP_MIX[c.id];
      LP.forEach((lp,li)=>{
        const v=c.sessions*mix[li]; lpTotals[li]+=v;
        links.push({source:addNode(c.name),target:addNode(lp),value:v});
      });
    });
    const midTotals=new Array(MID.length).fill(0);
    LP.forEach((lp,li)=>{
      MID.forEach((md,mi2)=>{
        const v=lpTotals[li]*LP_MID[li][mi2]; midTotals[mi2]+=v;
        links.push({source:addNode(lp),target:addNode(md),value:v});
      });
    });
    // 成果ノード：実CVに厳密整合
    const cvEst=A.total.cvByGoal.estimate+A.total.cvByGoal.catalog;
    const cvVisit=A.total.cvByGoal.testdrive+A.total.cvByGoal.visit;
    const cvKU=A.total.cvByGoal.kinto+A.total.cvByGoal.used;
    const cvSrv=A.total.cvByGoal.service+A.total.cvByGoal.acc;
    const outVals=[cvEst,cvVisit,cvKU,cvSrv];
    const midSum=midTotals.reduce((a,b)=>a+b,0);
    const cvSum=outVals.reduce((a,b)=>a+b,0);
    // CVの発生源構成（シミュレーター経由が最多）
    const CV_FROM=[[.30,.42,.08,.20,0],[ .22,.30,.10,.38,0],[ .30,.30,.14,.26,0],[ .30,.18,.10,.42,0]];
    MID.forEach((md,mi2)=>{
      let used=0;
      OUT.forEach((o,oi)=>{
        if(oi<4){const v=outVals[oi]*CV_FROM[oi][mi2];used+=v;links.push({source:addNode(md),target:addNode(o),value:v})}
      });
      const drop=Math.max(0,midTotals[mi2]-used);
      links.push({source:addNode(md),target:addNode('未CVで離脱'),value:drop});
    });
    return {nodes,links,lp:LP,lpTotals};
  }

  /* ---------- ステージファネル ---------- */
  function funnel(range,seg){
    const A=agg(range,seg);
    const s1=A.total.sessions;
    const s2=A.total.modelSessions;
    const s3=A.models.reduce((a,m)=>a+m.toolSessions,0);
    const s4=A.models.reduce((a,m)=>a+m.dealerSessions,0);
    const s5=A.total.cv;
    return [
      {name:'STAGE 1｜サイト流入',    v:s1, desc:'全セッション'},
      {name:'STAGE 2｜車種ページ閲覧', v:s2, desc:'いずれかの車種を閲覧'},
      {name:'STAGE 3｜検討ツール利用', v:s3, desc:'見積り・比較・シミュレーター'},
      {name:'STAGE 4｜販売店コンタクト', v:s4, desc:'販売店検索・店舗ページ'},
      {name:'CLEAR｜コンバージョン',   v:s5, desc:'8種のCV合計'},
    ];
  }

  /* ---------- 訪問回数（コンボ）・RF ---------- */
  function comboData(range){
    const A=agg(range,'all');
    const denom=BUCKETS.reduce((a,b)=>a+b.share*b.cvrMult,0);
    const baseCvr=A.total.cv/A.total.sessions;
    return BUCKETS.map(b=>({...b,
      sessions:A.total.sessions*b.share,
      cvr: baseCvr*b.cvrMult/denom,
      cv: A.total.cv*(b.share*b.cvrMult/denom),
    }));
  }
  function rfMatrix(range){
    const A=agg(range,'ret');
    const total=A.total.sessions;
    const flat=RF_SHARE.flat(); const s=flat.reduce((a,b)=>a+b,0);
    return RECENCY.map((r,ri)=>RF_SHARE[ri].map(v=>total*v/s));
  }

  /* ---------- アフィニティ集計 ---------- */
  function affinityAgg(range,seg){
    const A=agg(range,seg);
    const sess=AFFINITY.map(()=>0), cv=AFFINITY.map(()=>0);
    A.models.forEach((m,mi)=>{
      const sh=affShare(MODELS[mi]);
      AFFINITY.forEach((af,ai)=>{
        sess[ai]+=m.sessions*sh[af.id];
        cv[ai]+=m.cv*sh[af.id]*AFF_MULT_N[mi][af.id];
      });
    });
    const totS=sess.reduce((a,b)=>a+b,0), totC=cv.reduce((a,b)=>a+b,0);
    return AFFINITY.map((af,ai)=>({...af,sessions:sess[ai],cv:cv[ai],
      cvr:cv[ai]/Math.max(1,sess[ai]),
      share:sess[ai]/totS,
      idx: (cv[ai]/Math.max(1,sess[ai]))/(totC/totS)*100 }));
  }

  /* ---------- キャンペーン（広告トラッキング） ---------- */
  const CAMPAIGNS=[
    {id:'brand_go', name:'指名検索 常時運用',        ch:'sem', src:'google', med:'cpc',  utm:'always-on_brand',       from:'2026-02-01',to:'2026-08-18', share:.34, cpc:38,  q:1.35, goal:'estimate'},
    {id:'gen_go',   name:'一般KW 常時運用',          ch:'sem', src:'google', med:'cpc',  utm:'always-on_generic',     from:'2026-02-01',to:'2026-08-18', share:.27, cpc:95,  q:0.85, goal:'estimate'},
    {id:'brand_yh', name:'Yahoo!検索 指名',          ch:'sem', src:'yahoo',  med:'cpc',  utm:'always-on_brand-y',     from:'2026-02-01',to:'2026-08-18', share:.18, cpc:41,  q:1.22, goal:'estimate'},
    {id:'alp_dsp',  name:'アルファード改良 告知',     ch:'dsp', src:'dv360',  med:'display',utm:'alphard_mc_202607',   from:'2026-07-17',to:'2026-08-31', share:.30, cpc:52,  q:1.10, goal:'catalog', model:'alphard'},
    {id:'har_dsp',  name:'ハリアー特別仕様 告知',     ch:'dsp', src:'yda',    med:'display',utm:'harrier_sp_202607',   from:'2026-07-01',to:'2026-08-15', share:.24, cpc:49,  q:1.05, goal:'catalog', model:'harrier'},
    {id:'bz_dsp',   name:'bZ4X サマー ディスプレイ',  ch:'dsp', src:'gdn',    med:'display',utm:'bz4x_summer_202608',  from:'2026-08-07',to:'2026-08-18', share:.22, cpc:55,  q:0.92, goal:'estimate', model:'bz4x'},
    {id:'crown_tver',name:'クラウン改良 TVer',        ch:'vid', src:'tver',   med:'video', utm:'crown_mc_202608',      from:'2026-08-01',to:'2026-08-18', share:.30, cpc:64,  q:1.02, goal:'catalog', model:'crown'},
    {id:'bz_yt',    name:'bZ4X サマー YouTube',      ch:'vid', src:'youtube',med:'video', utm:'bz4x_summer_202608',   from:'2026-08-07',to:'2026-08-18', share:.34, cpc:58,  q:0.96, goal:'estimate', model:'bz4x'},
    {id:'kinto_meta',name:'KINTO 夏の乗り換え',       ch:'sns', src:'meta',   med:'paid_social',utm:'kinto_summer_2026',from:'2026-07-01',to:'2026-08-18', share:.36, cpc:72,  q:1.18, goal:'kinto'},
    {id:'sienta_line',name:'シエンタ ファミリー訴求',  ch:'sns', src:'line',   med:'paid_social',utm:'sienta_family_2026',from:'2026-07-01',to:'2026-08-18',share:.28, cpc:66,  q:1.08, goal:'testdrive', model:'sienta'},
    {id:'gr86_x',   name:'GR86 抽選告知',            ch:'sns', src:'x',      med:'paid_social',utm:'gr86_lottery_202606',from:'2026-06-20',to:'2026-07-10',share:.18, cpc:60,  q:0.90, goal:'catalog', model:'gr86'},
    {id:'after_crm',name:'点検・入庫促進（CRM）',     ch:'crm', src:'crm',    med:'email', utm:'aftersales_202608',    from:'2026-08-01',to:'2026-08-18', share:.44, cpc:0,   q:1.60, goal:'service'},
  ];
  function campaigns(range){
    const A=agg(range,'all');
    const chIdx=Object.fromEntries(CHANNELS.map((c,i)=>[c.id,i]));
    return CAMPAIGNS.map(cp=>{
      const w={a:Math.max(NDAYS-range,IDX[cp.from]??0), b:Math.min(NDAYS-1,IDX[cp.to]??NDAYS-1)};
      let sess=0;
      if(w.a<=w.b){
        for(let d=w.a;d<=w.b;d++){
          let chSum=0;
          for(let mi=0;mi<NM;mi++)chSum+=S[d][mi][chIdx[cp.ch]];
          chSum+=OTHER[d][chIdx[cp.ch]];
          // 車種指定キャンペーンはその車種の伸びに連動
          if(cp.model){
            const mi=MODELS.findIndex(m=>m.id===cp.model);
            sess+=S[d][mi][chIdx[cp.ch]]*2.6*cp.share;
          }else{
            sess+=chSum*cp.share;
          }
        }
      }
      const g=GOALS.find(x=>x.id===cp.goal);
      const chObj=A.channels[chIdx[cp.ch]];
      const cvr=chObj.cvr*cp.q*(cp.goal==='service'?2.4:1);
      const cv=sess*cvr;
      const spend=sess*cp.cpc;
      const value=cv*g.value*3.2;         // 商談価値換算
      return {...cp, chName:CHANNELS[chIdx[cp.ch]].name, chColor:CHANNELS[chIdx[cp.ch]].color,
        sessions:sess, cv, cvr, spend, cpa:cv>0?spend/cv:0, roas:spend>0?value/spend:null,
        active: IDX[cp.to]>=NDAYS-range};
    }).filter(c=>c.sessions>500);
  }

  /* ---------- UTMサンバースト ---------- */
  function utmTree(range){
    const cps=campaigns(range);
    const bySrc={};
    cps.forEach(c=>{
      bySrc[c.src]=bySrc[c.src]||{name:c.src,children:[],value:0,med:c.med};
      bySrc[c.src].children.push({name:c.utm,value:Math.round(c.sessions),cv:c.cv,cp:c});
      bySrc[c.src].value+=c.sessions;
    });
    const A=agg(range,'all');
    const paidSess=A.channels.filter(c=>c.paid).reduce((a,c)=>a+c.sessions,0);
    const tracked=cps.reduce((a,c)=>a+c.sessions,0);
    return {tree:Object.values(bySrc),tracked,paidSess,untracked:Math.max(0,paidSess-tracked)};
  }

  /* ---------- ミッション（8月・月次目標） ---------- */
  function missions(){
    // 8/1〜8/18 の実績
    const a=IDX['2026-08-01'], b=IDX['2026-08-18'];
    const mtd={estimate:0,testdrive:0,kinto:0,newSessions:0};
    for(let d=a;d<=b;d++){
      for(let mi=0;mi<NM;mi++){
        const m=MODELS[mi];
        for(let c=0;c<NC;c++){
          const s=S[d][mi][c];
          mtd.newSessions+=s*CHANNELS[c].newShare;
          for(const gid of ['estimate','testdrive','kinto']){
            const g=GOALS.find(x=>x.id===gid);
            mtd[gid]+=s*m.cvr*g.mult*(GOAL_CH[gid][CHANNELS[c].id]||1)*DN[gid][d];
          }
        }
      }
      for(let c=0;c<NC;c++)mtd.newSessions+=OTHER[d][c]*CHANNELS[c].newShare;
    }
    const pace=18/31;
    const defs=[
      {id:'m1',name:'見積りシミュレーション完了', target:190000, actual:mtd.estimate, unit:'件', icon:'target'},
      {id:'m2',name:'試乗予約',                target:31500, actual:mtd.testdrive, unit:'件', icon:'wheel'},
      {id:'m3',name:'KINTO 申込・見積り',       target:9200,  actual:mtd.kinto,    unit:'件', icon:'key'},
      {id:'m4',name:'新規ユーザー獲得',          target:15000000, actual:mtd.newSessions/1.06, unit:'人', icon:'user'},
    ];
    return defs.map(d=>{
      const prog=d.actual/d.target;
      const vsPace=prog/pace;
      return {...d, prog, pace, vsPace,
        status: vsPace>=1.02?'ahead': vsPace>=0.92?'ontrack':'behind'};
    });
  }
  function score(){
    const ms=missions();
    const w=[.32,.28,.16,.24];
    const s=ms.reduce((a,m,i)=>a+w[i]*Math.min(1.15,m.vsPace),0)/1.15*100;
    const tier= s>=90?'S': s>=72?'A': s>=58?'B':'C';
    return {score:s, tier, missions:ms};
  }

  /* ---------- カスタムディメンション辞書 ---------- */
  const CUSTOM_DIMS=[
    {scope:'User',  disp:'会員ランク',            param:'member_rank',        fill:.92, vals:'gold / silver / bronze / guest', note:'TOYOTAアカウント連携。CRM側IDと突合可能'},
    {scope:'User',  disp:'ログイン状態',           param:'login_status',       fill:.99, vals:'logged_in / guest', note:'全ヒットに付与。ステージ分析の基礎'},
    {scope:'User',  disp:'検討ステージ',           param:'consideration_stage',fill:.84, vals:'aware / interest / consider / nego', note:'行動スコアリングで日次更新'},
    {scope:'User',  disp:'保有車種',              param:'owned_model',        fill:.61, vals:'model_code準拠', note:'申告ベース。取得率が低く改善対象'},
    {scope:'Event', disp:'車種コード',            param:'model_code',         fill:.97, vals:'alphard / harrier / …', note:'車種ページ・見積りに付与'},
    {scope:'Event', disp:'グレードコード',         param:'grade_code',         fill:.88, vals:'Z / G / X / Executive…', note:'グレード選択以降のヒット'},
    {scope:'Event', disp:'シミュレーター結果金額',  param:'sim_price',          fill:.76, vals:'数値（万円）', note:'月額換算はkinto_plan側'},
    {scope:'Event', disp:'販売店エリア',           param:'dealer_area',        fill:.81, vals:'都道府県コード', note:'販売店検索・来店予約に付与'},
    {scope:'Event', disp:'CPパス_内部リンク',      param:'padid',              fill:.93, vals:'top_kv / cp_banner_01 / …', note:'サイト内バナー・導線の効果測定キー'},
    {scope:'Event', disp:'KINTOプラン',           param:'kinto_plan',         fill:.95, vals:'initial / solutions', note:'KINTO遷移・申込ヒット'},
    {scope:'Event', disp:'来訪目的',              param:'visit_purpose',      fill:.58, vals:'buy / maintain / browse…', note:'アンケート由来。取得率が低く改善対象'},
    {scope:'Event', disp:'フォームステップ',       param:'form_step',          fill:.96, vals:'step1〜4 / complete', note:'EFO分析用'},
  ];
  const EVENTS_DICT=[
    {ev:'page_view',            disp:'ページ表示',          scale:'pv'},
    {ev:'view_item',            disp:'車種詳細 閲覧',        scale:'modelSessions'},
    {ev:'select_grade',         disp:'グレード選択',         scale:'grade'},
    {ev:'simulation_start',     disp:'見積りシミュレーター開始', scale:'simStart'},
    {ev:'estimate_complete',    disp:'見積り完了',           goal:'estimate'},
    {ev:'test_drive_reserve',   disp:'試乗予約',            goal:'testdrive'},
    {ev:'dealer_search',        disp:'販売店検索',           scale:'dealer'},
    {ev:'catalog_view_complete',disp:'カタログ閲覧完了',      goal:'catalog'},
    {ev:'kinto_apply',          disp:'KINTO 申込・見積り',   goal:'kinto'},
    {ev:'favorite_add',         disp:'お気に入り登録',        scale:'fav'},
  ];

  /* ---------- 会員ランク・ログイン ---------- */
  function memberData(range){
    const A=agg(range,'all');
    const ranks=[
      {name:'ゴールド会員', share:.06, cvrMult:4.2},
      {name:'シルバー会員', share:.11, cvrMult:2.6},
      {name:'ブロンズ会員', share:.17, cvrMult:1.6},
      {name:'未ログイン',   share:.66, cvrMult:.62},
    ];
    const denom=ranks.reduce((a,r)=>a+r.share*r.cvrMult,0);
    const base=A.total.cv/A.total.sessions;
    return ranks.map(r=>({...r,sessions:A.total.sessions*r.share,cvr:base*r.cvrMult/denom,cv:A.total.cv*r.share*r.cvrMult/denom}));
  }

  /* ---------- デバイス・デモグラ集計 ---------- */
  function deviceAgg(range,seg){
    const A=agg(range,seg);
    const v=[0,0,0];
    A.channels.forEach(c=>{const d=DEV_CH[c.id];for(let i=0;i<3;i++)v[i]+=c.sessions*d[i]});
    return DEVICES.map((d,i)=>({...d,sessions:v[i]}));
  }
  function demoAgg(range){
    const A=agg(range,'all');
    const male=new Array(6).fill(0), female=new Array(6).fill(0);
    A.models.forEach((m,mi)=>{
      const g=ageGender(MODELS[mi]);
      for(let i=0;i<6;i++){male[i]+=m.sessions*g.male[i];female[i]+=m.sessions*g.female[i]}
    });
    return {ages:AGES,male,female};
  }
  function areaAgg(range){
    const A=agg(range,'all');
    const v=AREAS.map(()=>0);
    A.models.forEach((m,mi)=>{
      const ar=areaShare(MODELS[mi]);
      AREAS.forEach((a,ai)=>v[ai]+=m.sessions*ar[a.id]);
    });
    const other=A.otherSessions; const s=v.reduce((a,b)=>a+b,0);
    return AREAS.map((a,ai)=>({...a,sessions:v[ai]*(1+other/Math.max(1,s))}));
  }

  return {DATES,CHANNELS,MODELS,GOODS,GOALS,AFFINITY,STAGES,AREAS,BUCKETS,RECENCY,DEVICES,AGES,EVENTS,
    CUSTOM_DIMS,EVENTS_DICT,DIMS,STAGE_LOGIN,
    agg,pairMatrix,sankey,funnel,comboData,rfMatrix,affinityAgg,campaigns,utmTree,missions,score,
    memberData,deviceAgg,demoAgg,areaAgg,affShare,goodsShare,areaShare};
})();


/* ============ OWNED OPS：オウンドチーム実績データ（実測・2026-08-19 JST 取得） ============ */
const OWNED = {
  asof: '2026-08-19',
  crawledAt: '2026-08-19 16:55-17:05 JST',

  /* ---------- SECTOR 08: JP導線実績（出典: 導線価値レポート#007 = GA4実測 7/7〜8/5 ＋ 完了ページ実機検証 8/5） ---------- */
  junction: {
    heroCV: 1,                       // 来店予約 step1 到達（成果第1号・7/30深夜セッション）
    lines: [
      {id:'tconnect', name:'T-Connect（コネクティッド）', state:'live', since:'7/27〜',
       url:'https://toyota.jp/tconnectservice/?padid=from_service_request_done_260727',
       padid:'from_service_request_done_260727',
       desc:'リクエスト（試乗予約等）完了ページ下部トピックスからT-Connectサービスへ', kpi:'滞在1分50秒（通常45秒）'},
      {id:'auuq', name:'au / UQ mobile', state:'live', since:'8/4〜',
       url:'https://toyota.jp/service/request/done/', padid:'au/UQ枠 8/4追加',
       desc:'クルマもスマホもトヨタのお店でまとめてサポート訴求', kpi:'第1号ユーザーはTコネ機能ページへ回遊'},
      {id:'ug', name:'用品UG（アップグレードファクトリー）', state:'ext', since:'稼働中',
       url:'https://toyota.jp/', padid:'外部サイト',
       desc:'純正装備の後付け訴求。遷移先が別サイト（KINTO側）のため toyota.jp のGA4では効果計測不可', kpi:'計測は先方GA4連携待ち'}
    ],
    // 群比較（GA4実測）
    group: {
      line:{s:7, pv:32, pvps:4.6, stay:687, eng:1.0,   evps:13.6},
      ctrl:{s:2351, pv:29803, u:2199, pvps:12.7, stay:1091, eng:0.9668, evps:42.6}
    },
    addStay: 687,             // 追加滞在 11分27秒/件（予約完了後に純増で得た時間）
    step1Rate: .167,          // 来店予約step1到達 16.7%
    // 同一ページ滞在の差（秒）: 導線経由 vs 通常完了者
    lift: [
      {p:'店舗検索', a:111, b:68,  d:'+63%',  hot:1},
      {p:'地図検索', a:161, b:110, d:'+46%',  hot:1},
      {p:'T-Connect関連平均', a:94, b:45, d:'×2.1', hot:1},
      {p:'ページ内イベント数', a:15, b:4, d:'×3.8', hot:1, unit:'件'},
      {p:'ラインアップ', a:22, b:50, d:'−56%', hot:0},
      {p:'車種ページ', a:31, b:136, d:'−77%', hot:0}
    ],
    liftNote: '車種ページが短い＝車種は決定済み。次の関心は「どの店に行くか」— 導線が来店行動の直前に位置する証拠',
    // 年間価値シナリオ（分母=完了ページ 79.3S/日 → 28,961件/年 実測）
    scenarios: [
      {k:'現状',  r:.87, n:253,  h:48,  v:200,  req:'—'},
      {k:'Step1', r:2,   n:579,  h:110, v:460,  req:'完了文直下へ配置＋3本全表示'},
      {k:'Step2', r:3,   n:869,  h:166, v:720,  req:'＋見出し・コピーの具体化'},
      {k:'Step3', r:5,   n:1448, h:276, v:1200, req:'＋ボタン化・車種パーソナライズ'}
    ],
    denom: {perDay:79.3, perYear:28961},
    // 7/30 深夜の第1号タイムライン
    timeline: [
      {t:'0:42:05', e:'導線をクリックしてT-Connectに着地', s:'深夜0時台・予約完了直後'},
      {t:'0:42:45', e:'店舗検索へ移動（計1分51秒）', s:'「どの店に行くか」を探し始める'},
      {t:'0:42:52', e:'スクロール・リンククリック', s:'検索結果を絞り込む'},
      {t:'0:43:15', e:'ラインアップ（全ボディタイプ）を展開', s:'SUV等を順にスクロール'},
      {t:'0:45:44', e:'クラウン（エステート）を選択', s:'車種選択で具体名を指定（31秒閲覧）'},
      {t:'0:46:07', e:'オンライン来店予約 step1 に到達', s:'さらに来店予約フローへ進入 ← 成果第1号'},
      {t:'0:46:48', e:'リンククリックで終了', s:'4分43秒・20ページ・37イベント＝7.6秒に1アクション'}
    ],
    sessions4: [
      {d:'7/27', path:'WEBカタログ（ビジネスカー）→ ダイナカーゴ2t → 販売店詳細', stay:'カタログ関連9イベント', want:'商用車の詳細スペック（カタログ比較段階）'},
      {d:'7/30', path:'店舗検索 → ラインアップ → クラウンエステート → 来店予約step1', stay:'店舗検索 1分51秒', want:'どの店に行くか／次に見る車種'},
      {d:'8/1',  path:'T-Connect動画 → 地図で店舗検索 → My TOYOTAメッセージ', stay:'地図検索 2分41秒', want:'サービスの中身（動画）と行ける店の位置'},
      {d:'8/4',  path:'auショップ → リモートエアコン機能 → 対応車種リスト', stay:'機能ページ 1分45秒', want:'具体的な機能と自分の車で使えるか'}
    ],
    tconnect: [
      {p:'/tconnectservice/（トップ）', stay:'1分50秒', read:'サービス全体像。12イベント＝スクロールしながら読破'},
      {p:'紹介動画の再生（video_start→progress×3）', stay:'完走傾向', read:'テキストで足りず映像で理解'},
      {p:'/service/remote_aircon.html', stay:'1分45秒', read:'特定機能の使い方。真夏の試乗前に最も想像しやすい便益'},
      {p:'「対応車種リスト」クリック', stay:'—', read:'自分の候補車で使えるかの確認＝購入後の自分を想像'}
    ],
    improve: [
      {t:'配置', now:'完了文→連絡先→「トピックス」横送りカルーセル（2枚目以降は要スワイプ）', to:'「試乗当日までに、できること」3本を縦積み・全表示'},
      {t:'T-Connectコピー', now:'24時間365日、クルマが通信で…（抽象）', to:'「乗る前にスマホでエアコンON。当日ぜひお試しください →対応車種を見る」'},
      {t:'用品UGコピー', now:'純正装備を後付け', to:'「試乗車と同じ純正アイテムを見る（トヨタ純正／別サイトへ）」'},
      {t:'au/UQコピー', now:'クルマもスマホも、トヨタのお店でまとめてサポート！', to:'「来店のついでに、スマホもまとめて相談」を主見出しへ'},
      {t:'次の一手', now:'—', to:'店舗情報の併置／予約車種名の差し込み／CTAボタン化／商用車の出し分け／季節連動（夏=リモートエアコン）'}
    ]
  },

  /* ---------- SECTOR 09: SNS資産（実測クロール 8/19 ＋ 単価・活性ロジック 7/29版） ---------- */
  sns: {
    value: {total:46.5, stock:9.8, flow:36.7, floor:24.0, q:1.0, base:540,
      formula:'資産価値 = (STOCK + FLOW) × Q ／ STOCK = アクティブ基盤 × 獲得単価 ／ FLOW = 年間露出 × 広告単価 ／ Q = 自社ER÷業界平均ER（今回1.0）',
      floorNote:'全単価を下限 × 露出・配信半減でも 24.0億円'},
    channels: [
      {id:'jp',  name:'toyota.jp', icon:'JP', stock:0,    flow:28.6, unit:'検索経由50% × 加重CPC60円', basis:'年9,525万UU（GA・進捗95%）', active:null},
      {id:'yt',  name:'YouTube 3ch合算', icon:'YT', stock:1.74, flow:2.79, unit:'CPF200円 / CPV7円×自然分50%', basis:'86.8万人（124.1万×70%）・年7,975万再生', active:.70},
      {id:'mail',name:'メルマガ', icon:'ML', stock:2.70, flow:1.46, unit:'リスト200円 / 号外5円/通', basis:'135万件（150万×有効90%）・年2,700万通＋JP誘導9.5万件', active:.90},
      {id:'line',name:'LINE', icon:'LN', stock:1.91, flow:1.08, unit:'友だち150円 / 従量3円/通', basis:'127.5万人（150万×非ブロック85%）・年3,600万通', active:.85},
      {id:'ig',  name:'Instagram', icon:'IG', stock:1.19, flow:1.03, unit:'CPF200円 / CPM2,200円', basis:'59.4万人（85万×70%）・年4,075万imp', active:.70},
      {id:'tt',  name:'TikTok', icon:'TT', stock:0.96, flow:1.17, unit:'CPF150円 / CPM1,000円・ER4%', basis:'64.3万人（80.4万×80%）・年3,088万再生', active:.80},
      {id:'x',   name:'X', icon:'X',  stock:0.58, flow:0.56, unit:'CPF150円 / CPM700円・ER0.45%', basis:'38.8万人（64.7万×60%）・年7,600万imp', active:.60},
      {id:'fb',  name:'Facebook', icon:'FB', stock:0.70, flow:0.06, unit:'CPF250円 / CPM800円', basis:'28.0万人（56万×50%）・年430万リーチ', active:.50}
    ],
    accounts: [
      {id:'x',  sns:'X', name:'@TOYOTA_PR', url:'https://x.com/TOYOTA_PR',
       f:647000, fPrev:647000, posts:'7.5万ポスト', asof:'8/19実測', col:'#8A96A8',
       note:'2011年3月開設・101フォロー中', val:1.14},
      {id:'ig', sns:'Instagram', name:'@toyota_jp', url:'https://www.instagram.com/toyota_jp/',
       f:851000, fPrev:849000, posts:'3,213投稿', asof:'8/19実測', col:'#D55181',
       note:'#トヨタグラム 写真募集企画を常設', val:2.22},
      {id:'tt', sns:'TikTok', name:'@toyota_pr_japan', url:'https://www.tiktok.com/@toyota_pr_japan',
       f:804000, fPrev:804000, posts:'累計いいね630万', asof:'7/29実測', col:'#00E5C7',
       note:'8/19はクロール不可（アクセス制限）→ 7/29公開値', val:2.14},
      {id:'fb', sns:'Facebook', name:'TOYOTA / トヨタ自動車株式会社', url:'https://www.facebook.com/ToyotaMotorCorporation',
       f:560000, fPrev:560000, posts:'since 2011/4/20', asof:'8/19実測', col:'#3987E5',
       note:'レビュー515件・74%がおすすめ', val:0.76},
      {id:'ytsr', sns:'YouTube', name:'トヨタ YouTubeショールーム', url:'https://www.youtube.com/@toyotajpchannel',
       f:291000, fPrev:291000, posts:'427本・総再生4.20億回', asof:'8/19実測', col:'#E66767',
       note:'2011年開設。商品紹介・TVCM置き場', val:null},
      {id:'yttm', sns:'YouTube', name:'トヨタイムズ', url:'https://www.youtube.com/@toyotatimes',
       f:905000, fPrev:867000, posts:'871本・総再生1.83億回', asof:'8/19実測', col:'#E66767',
       note:'3週間で +3.8万人（新体制報道・ウーブンシティ効果）', val:null},
      {id:'ytdr', sns:'YouTube', name:'トヨタドライバーズチャンネル', url:'https://www.youtube.com/@toyotadriverschannel',
       f:83000, fPrev:82500, posts:'322本・総再生1.18億回', asof:'8/19実測', col:'#E66767',
       note:'2022年開設。精霊馬バズの受け皿に', val:null}
    ],
    ytTotal:{f:1279000, fPrev:1240500, val:4.53},
    posts: [
      {sns:'IG', title:'お盆の帰省ラッシュ。もしご先祖様も渋滞に巻き込まれていたら？（精霊馬・CV:ファイルーズあい）', d:'8/13',
       main:89000, mainL:'いいね', sub:'コメント463・シェア4,802', url:'https://www.instagram.com/p/Db83dLLgc-i/', tag:'バズ', tagc:'#FFD84D'},
      {sns:'YT', title:'【福祉】あなたを愛してくれた人が困っているかも（ショールーム）', d:'8月上旬',
       main:7050000, mainL:'回視聴', sub:'通常投稿の約700倍 → 広告配信併用と推定', url:'https://www.youtube.com/@toyotajpchannel/videos', tag:'広告ブースト', tagc:'#9085E9'},
      {sns:'YT', title:'【前代未聞】帰省ラッシュで精霊馬が大渋滞（ドライバーズch・CV:ファイルーズあい）', d:'8/13',
       main:300000, mainL:'回視聴', sub:'ch通常比 約600倍。IG版と同時展開', url:'https://www.youtube.com/@toyotadriverschannel/videos', tag:'バズ', tagc:'#FFD84D'},
      {sns:'X', title:'＼モット！トヨタオス！／ エンジンブレーキ篇（8/12カギ音篇を引用）', d:'8/17',
       main:52000, mainL:'imp', sub:'いいね133・RP12・返信6', url:'https://x.com/TOYOTA_PR', tag:'シリーズ', tagc:'#38BDF8'},
      {sns:'X', title:'ｶｯｶｯｶｯ…バッテリー上がりの打音【本当にあったヤバい兆し】', d:'8/14',
       main:57000, mainL:'imp', sub:'いいね152・RP18・返信8', url:'https://x.com/TOYOTA_PR', tag:'シリーズ', tagc:'#38BDF8'},
      {sns:'X', title:'福島県三春町 水素ワークショップ（SAMURAI BLUE クラウンFCEV）', d:'8/16',
       main:32000, mainL:'imp', sub:'いいね210・RP21・返信3', url:'https://x.com/TOYOTA_PR', tag:'活動報告', tagc:'#199E70'},
      {sns:'IG', title:'トヨタオス道場「カギ音の正体」篇', d:'8/13',
       main:1240, mainL:'いいね', sub:'リール・コメントに質問系が発生', url:'https://www.instagram.com/p/Db7JyBRFISK/', tag:'シリーズ', tagc:'#38BDF8'},
      {sns:'IG', title:'トヨタオス道場「エンジンブレーキ」篇', d:'8/18',
       main:1038, mainL:'いいね', sub:'コメントでHV機構の技術議論が発生', url:'https://www.instagram.com/p/DcIBp7lkhOX/', tag:'シリーズ', tagc:'#38BDF8'},
      {sns:'IG', title:'ゾッとする前に。バッテリー打音篇【本当にあったヤバい兆し】', d:'8/15',
       main:978, mainL:'いいね', sub:'X版5.7万impと同時展開', url:'https://www.instagram.com/p/DcATpx-AhoP/', tag:'シリーズ', tagc:'#38BDF8'},
      {sns:'FB', title:'三春町 水素ワークショップ（とびchan.）', d:'8/17',
       main:492, mainL:'いいね', sub:'コメント3・シェア9', url:'https://www.facebook.com/ToyotaMotorCorporation', tag:'活動報告', tagc:'#199E70'},
      {sns:'YT', title:'【新体制】豊田大輔SVP帰任｜月イチ！ウーブン・シティ#6（トヨタイムズ）', d:'8/17',
       main:20000, mainL:'回視聴', sub:'登録者は3週で+3.8万人', url:'https://www.youtube.com/@toyotatimes/videos', tag:'ニュース', tagc:'#C98500'}
    ],
    units: [
      {m:'X',        cpf:'150', cpfR:'100〜200', cpm:'700', cpmR:'400〜1,500', cpe:'70', cpeR:'40〜100'},
      {m:'Instagram',cpf:'200', cpfR:'100〜500', cpm:'2,200', cpmR:'2,000〜3,000', cpe:'100', cpeR:'50〜150'},
      {m:'TikTok',   cpf:'150', cpfR:'100〜300', cpm:'1,000', cpmR:'800〜1,500', cpe:'80', cpeR:'50〜120'},
      {m:'Facebook', cpf:'250', cpfR:'100〜500', cpm:'800', cpmR:'500〜1,500', cpe:'80', cpeR:'50〜150'}
    ],
    power: [
      {m:'X（会話・拡散型）', col:'#8A96A8', blocks:[['基礎エンゲージ率',25,'加重ER 6.0で満点'],['会話成立',20,'返信率30%'],['能動アクション',20,'プロフC等 1.0%'],['動画視聴',15,'50%視聴 30%'],['初速',10,'2h imp÷24h 50%'],['健全性',10,'月次純増減']]},
      {m:'Instagram（シェア・保存型）', col:'#D55181', blocks:[['基礎エンゲージ',15,'加重 5.0'],['シェア(×4)',25,'0.8%で満点'],['保存(×3)',15,'1.5%'],['リール視聴',20,'保持50%'],['リーチ',15,'フォロワー比30%'],['新規率',10,'非フォロワー40%']]},
      {m:'TikTok（完視聴型)', col:'#00E5C7', blocks:[['エンゲージ密度',30,'5.0%で満点'],['完視聴率',35,'30%（70%=拡散閾値）'],['平均視聴時間',15,'保持50%'],['おすすめ流入',10,'70%'],['再視聴率',10,'10%']]},
      {m:'Facebook（交流の質型）', col:'#3987E5', blocks:[['シェア(×30)',30,'0.5%で満点'],['コメ・いいね',15,'加重5.0'],['反応内訳',10,'超いいね0.5%'],['リーチ',35,'フォロワー比10%'],['ネガFB',10,'月次純増減']]},
      {m:'YouTube（視聴維持型）', col:'#E66767', blocks:[['基礎エンゲージ',15,'4.0%で満点'],['クリック率',20,'CTR5%'],['視聴維持率',25,'40%'],['ブラウズ流入',15,'50%'],['満足度',15,'高評価95%'],['登録転換',10,'0.1%']]}
    ],
    powerNote: 'ロジック出典: X=公式GitHub公開コード(2023) / IG=公式Ranking Explained / TikTok=内部文書「Algo 101」報道 / FB=Facebook Papers / YT=Google推薦論文+How YouTube Works。基準値は Rival IQ・Socialinsider ベンチマーク。まず配点＝伸びしろ地図として使い、管理画面データが届き次第スコア化',
    insights: {
      win: [
        {t:'キャラ×季節文脈×声優の三段掛け', d:'精霊馬×お盆×CV:ファイルーズあい は IG 8.9万いいね・シェア4,802・YT30万回。通常投稿の約70倍。「日本のお盆らしさ」への共感コメントが海外からも発生', m:'IG精霊馬 8.9万いいね'},
        {t:'ホラー演出の実用啓発（ヤバい兆し）', d:'点検啓発を怪談仕立てにした瞬間、X 5.7万imp・保存性の高い実用ネタに。「怖くない話」というツッコミコメントまで含めて会話が回る', m:'X 5.7万imp'},
        {t:'道場シリーズの会話誘発力', d:'トヨタオス道場はいいね数こそ通常帯だが、コメント欄に「HVでもエンブレ効く？」等の技術質問が集まり会話成立率が高い。Xのアルゴリズムはリプライを最重視（加重13.5倍）', m:'質問コメント多発'},
        {t:'クロスプラットフォーム同時展開', d:'精霊馬は IG リール＋YT ドライバーズch＋X で同時展開し、プラットフォーム別の伸びを比較可能にした。最大反応は IG（シェア4,802が拡散を牽引）', m:'3面同時展開'}
      ],
      lose: [
        {t:'商品紹介の単発置き', d:'SIENTA商品紹介・機能訴求シリーズは1,841〜1.8万回視聴に留まる。カタログ的な網羅投稿はストック価値はあるがフロー拡散なし', m:'YT 数千回帯'},
        {t:'イベント告知の事前投稿', d:'TOYOTA SOCIAL FES 告知は922〜1,398回。開催後の「体験レポート型」（三春町WSはX 3.2万imp）の方が数字も会話も出る', m:'YT 922回'},
        {t:'海外向け転載の国内投下', d:'Life with a COROLLA 各国篇は3,925〜6,214回。国内文脈（納期・維持費・車中泊等）への翻訳がないと伸びない', m:'YT 4千回帯'}
      ],
      boost: 'ALPHARD PHEV 3本（650〜769万回）と【福祉】篇（705万回）はオーガニック比 約100〜700倍 → 広告配信の併用と推定。資産価値のFLOW計算では自然分のみ50%換算で保守化済み'
    },
    captures: [
      {img:'assets/sns/ig_viral.jpg', t:'IG 精霊馬の帰省ラッシュ — 8.9万いいね・シェア4,802', u:'https://www.instagram.com/p/Db83dLLgc-i/'},
      {img:'assets/sns/x_profile.jpg', t:'X @TOYOTA_PR — フォロワー64.7万', u:'https://x.com/TOYOTA_PR'},
      {img:'assets/sns/ig_profile.jpg', t:'IG @toyota_jp — フォロワー85.1万・3,213投稿', u:'https://www.instagram.com/toyota_jp/'},
      {img:'assets/sns/ig_reel.jpg', t:'IG トヨタオス道場 エンジンブレーキ篇 — 1,038いいね', u:'https://www.instagram.com/p/DcIBp7lkhOX/'},
      {img:'assets/sns/x_post_h2.jpg', t:'X 三春町 水素WS（SAMURAI BLUE クラウンFCEV）— 3.2万imp', u:'https://x.com/TOYOTA_PR'},
      {img:'assets/sns/fb_post.jpg', t:'FB 水素WS投稿 — いいね492・シェア9', u:'https://www.facebook.com/ToyotaMotorCorporation'},
      {img:'assets/sns/yt_sr.jpg', t:'YT ショールーム — 登録29.1万・427本', u:'https://www.youtube.com/@toyotajpchannel'},
      {img:'assets/sns/fb_page.jpg', t:'FB公式ページ — フォロワー56万・74%がおすすめ', u:'https://www.facebook.com/ToyotaMotorCorporation'}
    ],
    sources: [
      ['各SNS実測クロール（2026-08-19 16:55-17:05 JST・Mac mini Chrome）','https://x.com/TOYOTA_PR'],
      ['単価・アクティブ率・資産ロジック（オウンドKPI共有資料 2026-07-30版）',''],
      ['導線価値レポート#007（GA4実測 7/7〜8/5）','']
    ]
  }
};
const SISAKU_INIT = [{"id":"I-08-01","prod":"T-connect","ch":"toyota.jp","type":"LP制作","name":"車種別コネクティッドベネフィット訴求LPの作成（既存車種ページのコネクティッドサービスページ見直し含む）","st":"再提案準備中","kbn":"","tgt":"宣伝部TQP","own":"中井"},{"id":"I-08-02","prod":"T-connect","ch":"SNS","type":"SNS","name":"スマホ向けコネナビ無料CP訴求","st":"再提案準備中","kbn":"","tgt":"宣伝部TQP","own":"中井"},{"id":"I-08-03","prod":"T-connect","ch":"toyota.jp","type":"サイト改修","name":"リクエスト完了ページでのコネクティッドサービス訴求","st":"初動報告","kbn":"本命","tgt":"宣伝部TQP","own":"中井"},{"id":"I-08-04","prod":"T-connect","ch":"toyota.jp/メルマガ","type":"サイト改修","name":"オーナーズボイスマニュアルへの導線強化","st":"保留","kbn":"本命","tgt":"宣伝部TQP","own":"中井"},{"id":"I-08-05","prod":"T-connect","ch":"toyota.jp/メルマガ/MyTOYOTA+","type":"LP制作","name":"季節別おすすめ機能訴求LP（制作＋誘導）","st":"保留","kbn":"本命","tgt":"宣伝部TQP","own":"中井"},{"id":"I-08-06","prod":"T-connect","ch":"メルマガ/MyTOYOTA+","type":"メルマガ","name":"購入直後のオンボーディング施策","st":"保留","kbn":"本命","tgt":"宣伝部TQP","own":"中井"},{"id":"I-08-07","prod":"T-connect","ch":"SNS","type":"SNS","name":"盗難プロvsマイカーセキュリティ ホコタテ対決","st":"再提案準備中","kbn":"チャレンジ","tgt":"宣伝部TQP","own":"中井"},{"id":"I-08-08","prod":"T-connect","ch":"toyota.jp","type":"サイト改修","name":"既存ページのGEO対策（AIが引用しやすい構造に改修）","st":"保留","kbn":"チャレンジ","tgt":"宣伝部TQP","own":"中井"},{"id":"I-08-09","prod":"T-connect","ch":"toyota.jp","type":"サイト改修","name":"t-connect.jpとtoyota.jpの統合","st":"保留","kbn":"","tgt":"対象外 代理店TQP","own":"—"},{"id":"I-08-10","prod":"T-connect","ch":"SNS","type":"SNS","name":"SNSカーライフコンテンツ（トヨタオス）でのリモートスタート機能訴求","st":"初動報告","kbn":"本命","tgt":"宣伝部TQP","own":"中井"},{"id":"I-19-01","prod":"水素","ch":"toyota.jp","type":"コンテンツ制作","name":"車種ページ（FCバス、FCタクシー、FCトラック）","st":"合意済","kbn":"","tgt":"宣伝部TQP","own":"矢田"},{"id":"I-19-02","prod":"水素","ch":"toyota.jp","type":"コンテンツ制作","name":"防災価値ページ","st":"合意済","kbn":"","tgt":"宣伝部TQP","own":"矢田"},{"id":"I-19-03","prod":"水素","ch":"toyota.jp","type":"コンテンツ制作","name":"自治体補助金一覧ページ","st":"合意済","kbn":"","tgt":"宣伝部TQP","own":"矢田"},{"id":"I-19-04","prod":"水素","ch":"toyota.jp","type":"コンテンツ制作","name":"自治体・公共団体タイアップページ H2 Tokyo等","st":"提案済み（返答待ち）","kbn":"","tgt":"対象外 代理店TQP","own":"矢田"},{"id":"I-19-05","prod":"水素","ch":"toyota.jp","type":"コンテンツ制作","name":"水素社会実現へ向けた機運醸成ページ （国策としての水素）","st":"提案済み（返答待ち）","kbn":"","tgt":"対象外 代理店TQP","own":"矢田"},{"id":"I-09-01","prod":"通信","ch":"toyota.jp","type":"サイト改修","name":"リクエスト完了ページでの通信訴求","st":"初動報告","kbn":"","tgt":"宣伝部TQP","own":"渡邉"},{"id":"I-27-01","prod":"用品","ch":"SNS","type":"PR","name":"インフルエンサーを活用したPR","st":"見送り","kbn":"","tgt":"宣伝部TQP","own":"高橋"},{"id":"I-27-02","prod":"用品","ch":"SNS","type":"SNS","name":"ショート動画を用いた用品訴求 優先度①","st":"保留","kbn":"","tgt":"宣伝部TQP","own":"高橋"},{"id":"I-27-03","prod":"用品","ch":"toyota.jp","type":"サイト改修","name":"トヨタアップグレードファクトリーサイトとtoyota.jpの統合","st":"見送り","kbn":"","tgt":"対象外 代理店TQP","own":"—"},{"id":"I-27-04","prod":"用品","ch":"広告","type":"その他","name":"膨大な低リテラシー層へのリーチ創出 優先度①？","st":"合意済","kbn":"","tgt":"対象外 代理店TQP","own":"高橋"},{"id":"I-27-05","prod":"用品","ch":"メルマガ/LINE","type":"メルマガ","name":"定期CR・入庫誘致時の気づき喚起","st":"見送り","kbn":"","tgt":"宣伝部TQP","own":"高橋"},{"id":"I-27-06","prod":"用品","ch":"新規サイト","type":"その他","name":"トヨタ公式用品メディアの組成","st":"見送り","kbn":"","tgt":"対象外 代理店TQP","own":"高橋"},{"id":"I-27-07","prod":"用品","ch":"Gazoo中古車/JP-U","type":"LP制作","name":"中古車サイトへのUG掲載に合わせ、用品プラスオンの選択肢を周知開始 優先度②？","st":"合意済","kbn":"","tgt":"対象外 代理店TQP","own":"高橋"},{"id":"I-27-08","prod":"用品","ch":"toyota.jp","type":"サイト改修","name":"自メイク仕入強化への貢献(トヨタのクルマ買取改修)","st":"見送り","kbn":"","tgt":"対象外 代理店TQP","own":"高橋"},{"id":"I-27-09","prod":"用品","ch":"toyota.jp","type":"サイト改修","name":"下取SIM等の代替予備軍に対する用品想起 手離れ予定客への用品メリット想起 優先度③？","st":"合意済","kbn":"","tgt":"対象外 代理店TQP","own":"高橋"},{"id":"I-27-10","prod":"用品","ch":"toyota.jp","type":"サイト改修","name":"見積SIM棄却者への選択肢提示","st":"見送り","kbn":"","tgt":"対象外 代理店TQP","own":"高橋"},{"id":"I-27-11","prod":"用品","ch":"toyota.jp","type":"サイト改修","name":"アクセサリーページ改修","st":"見送り","kbn":"","tgt":"宣伝部TQP","own":"高橋"},{"id":"I-27-12","prod":"用品","ch":"用品適合WEB","type":"サイト改修","name":"用品適合WEB改修 優先度②","st":"見送り","kbn":"","tgt":"対象外 代理店TQP","own":"高橋"},{"id":"I-27-13","prod":"用品","ch":"toyota.jp","type":"サイト改修","name":"toyota.jp側からのCV導線強化 優先度② 用品適合WEB 導線","st":"合意済","kbn":"","tgt":"宣伝部TQP","own":"高橋"},{"id":"I-27-14","prod":"用品","ch":"toyota.jp","type":"サイト改修","name":"納車前コミュニケーション","st":"見送り","kbn":"","tgt":"対象外 代理店TQP","own":"高橋"},{"id":"I-27-15","prod":"用品","ch":"toyota.jp","type":"サイト改修","name":"リクエスト完了ページでの用品訴求","st":"初動報告","kbn":"","tgt":"宣伝部TQP","own":"高橋"},{"id":"I-33-01","prod":"マリン","ch":"マリンサイト","type":"サイト改修","name":"Google品質チェックでの指摘事項対応","st":"見送り","kbn":"","tgt":"対象外 代理店TQP","own":"渡邉"},{"id":"I-33-02","prod":"マリン","ch":"マリンサイト","type":"サイト改修","name":"製品カタログのPDFダウンロード対応","st":"見送り","kbn":"","tgt":"対象外 代理店TQP","own":"渡邉"},{"id":"I-33-03","prod":"マリン","ch":"マリンサイト","type":"サイト改修","name":"購入までの導線設計見直し","st":"見送り","kbn":"","tgt":"対象外 代理店TQP","own":"渡邉"},{"id":"I-33-04","prod":"マリン","ch":"マリンサイト","type":"サイト改修","name":"トップページの情報設計見直し","st":"見送り","kbn":"","tgt":"対象外 代理店TQP","own":"渡邉"},{"id":"I-33-05","prod":"マリン","ch":"マリンサイト","type":"サイト改修","name":"操船技術の訴求コンテンツ見直し","st":"見送り","kbn":"","tgt":"対象外 代理店TQP","own":"渡邉"},{"id":"I-33-06","prod":"マリン","ch":"マリンサイト","type":"サイト改修","name":"商品ページの1ページ統合","st":"見送り","kbn":"","tgt":"対象外 代理店TQP","own":"渡邉"},{"id":"I-33-07","prod":"マリン","ch":"マリンサイト","type":"サイト改修","name":"販売店一覧ページの見直し","st":"見送り","kbn":"","tgt":"対象外 代理店TQP","own":"渡邉"},{"id":"I-33-08","prod":"マリン","ch":"マリンサイト/マリンSNS","type":"サイト改修","name":"初心者向けコンテンツの企画・制作","st":"保留","kbn":"","tgt":"対象外 代理店TQP","own":"渡邉"},{"id":"I-33-09","prod":"マリン","ch":"マリンサイト/マリンSNS","type":"サイト改修","name":"定期的な情報発信の仕組みづくり","st":"保留","kbn":"","tgt":"対象外 代理店TQP","own":"渡邉"},{"id":"I-33-10","prod":"マリン","ch":"SNS","type":"SNS","name":"トヨタ公式SNSでのマリン事業訴求","st":"制作中","kbn":"","tgt":"宣伝部TQP","own":"岩本・岸上"}];
