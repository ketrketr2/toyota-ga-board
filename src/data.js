/* =====================================================
   TOYOTA GA4 COMMAND — データエンジン（GA4実測キャリブレーション済み）
   日次トラフィック・チャネル構成・車種別ボリューム・CVイベント・
   デバイス・エリア・年齢性別・キャンペーンは toyota.jp GA4
   （プロパティ 324699885 / Windsor.ai経由 2026-08-19取得）の実測値。
   実測ディメンションが存在しない内訳（アフィニティ・検討ステージ・
   訪問回数・チャネル×車種ミックス等）は実測合計に整合する推定按分。
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

  /* ---------- マスタ：チャネル（GA4デフォルトチャネルグループ実測・7/22〜8/18） ---------- */
  /* share・newShare＝実測。GA4グループを8束に集約：
     org=Organic Search / sem=Paid Search+Cross-network+Paid Other / dsp=Display /
     vid=Paid Video+Organic Video / sns=Organic Social+Paid Social / crm=Email /
     ref=Referral+AI Assistant / dir=Direct+Unassigned */
  const CHANNELS=[
    {id:'org', name:'自然検索',            color:'#3987E5', share:.4907, newShare:.347, paid:false},
    {id:'sem', name:'検索広告',            color:'#D95926', share:.0106, newShare:.559, paid:true},
    {id:'dsp', name:'ディスプレイ広告',     color:'#199E70', share:.0594, newShare:.743, paid:true},
    {id:'vid', name:'動画',               color:'#C98500', share:.0008, newShare:.579, paid:true},
    {id:'sns', name:'SNS',               color:'#D55181', share:.0037, newShare:.573, paid:false},
    {id:'crm', name:'メール',             color:'#008300', share:.0044, newShare:.157, paid:false},
    {id:'ref', name:'外部サイト・AI経由',   color:'#9085E9', share:.1264, newShare:.258, paid:false},
    {id:'dir', name:'ダイレクト',          color:'#E66767', share:.3040, newShare:.356, paid:false},
  ];
  const NC=CHANNELS.length;

  /* ---------- マスタ：車種（実測上位14ライン・7/22〜8/18） ----------
     base: 1日あたり車種ページ群セッション（千）＝GA4実測
     （/車種/ 直下＋grade/usability/design/performance等の下層ページ計÷28日）
     mix: チャネル補正 / cvr・tool・dealer・eng・pps: 実測合計に整合する推定按分 */
  const MODELS=[
    {id:'sienta',  name:'シエンタ',         cat:'ミニバン', price:'199万〜', base:9.94, cvr:.022, tool:.26, dealer:.080, eng:.64, pps:4.8,
     mix:{org:.95,sem:1.1,dsp:1.05,vid:.9,sns:1.5,crm:1.05,ref:.85,dir:.9}, icon:'van'},
    {id:'rav4',    name:'RAV4',            cat:'SUV',     price:'—',      base:9.91, cvr:.019, tool:.24, dealer:.068, eng:.66, pps:5.5,
     mix:{org:1.05,sem:1.0,dsp:1.05,vid:.95,sns:1.05,crm:.9,ref:1.0,dir:.95}, icon:'suv'},
    {id:'harrier', name:'ハリアー',         cat:'SUV',     price:'312万〜', base:9.77, cvr:.020, tool:.25, dealer:.070, eng:.67, pps:6.1,
     mix:{org:1.05,sem:1.1,dsp:1.15,vid:1.05,sns:1.0,crm:.9,ref:1.0,dir:1.0}, icon:'suv'},
    {id:'alphard', name:'アルファード',     cat:'ミニバン', price:'555万〜', base:9.59, cvr:.017, tool:.24, dealer:.070, eng:.67, pps:5.8,
     mix:{org:1.1,sem:1.0,dsp:.95,vid:1.1,sns:.85,crm:1.1,ref:1.1,dir:1.15}, icon:'van'},
    {id:'corollacross',name:'カローラクロス',cat:'SUV',    price:'218万〜', base:9.58, cvr:.021, tool:.25, dealer:.074, eng:.63, pps:5.2,
     mix:{org:1.0,sem:1.05,dsp:1.0,vid:.95,sns:1.1,crm:1.0,ref:.9,dir:.95}, icon:'suv'},
    {id:'yariscross',name:'ヤリスクロス',   cat:'SUV',     price:'190万〜', base:7.52, cvr:.021, tool:.25, dealer:.076, eng:.61, pps:4.9,
     mix:{org:1.0,sem:1.1,dsp:1.05,vid:.9,sns:1.1,crm:1.05,ref:.85,dir:.9}, icon:'suv'},
    {id:'noah',    name:'ノア',            cat:'ミニバン', price:'267万〜', base:6.28, cvr:.021, tool:.25, dealer:.076, eng:.62, pps:5.0,
     mix:{org:1.0,sem:1.05,dsp:1.0,vid:.95,sns:1.3,crm:1.0,ref:.9,dir:.95}, icon:'van'},
    {id:'voxy',    name:'ヴォクシー',       cat:'ミニバン', price:'309万〜', base:6.23, cvr:.021, tool:.26, dealer:.078, eng:.63, pps:5.2,
     mix:{org:1.0,sem:1.05,dsp:1.0,vid:1.0,sns:1.35,crm:1.0,ref:.9,dir:.95}, icon:'van'},
    {id:'landcruiser300',name:'ランドクルーザー300',cat:'SUV',price:'510万〜', base:5.95, cvr:.012, tool:.20, dealer:.055, eng:.70, pps:6.8,
     mix:{org:1.25,sem:.8,dsp:.7,vid:.9,sns:.7,crm:.9,ref:1.3,dir:1.3}, icon:'suv'},
    {id:'prius',   name:'プリウス',         cat:'コンパクト・HEV', price:'275万〜', base:5.69, cvr:.018, tool:.23, dealer:.066, eng:.64, pps:5.3,
     mix:{org:1.1,sem:.95,dsp:.95,vid:1.0,sns:.95,crm:1.1,ref:1.05,dir:1.05}, icon:'sedan'},
    {id:'landcruiser250',name:'ランドクルーザー250',cat:'SUV',price:'545万〜', base:5.69, cvr:.013, tool:.21, dealer:.058, eng:.69, pps:6.5,
     mix:{org:1.2,sem:.85,dsp:.75,vid:.95,sns:.8,crm:.9,ref:1.25,dir:1.25}, icon:'suv'},
    {id:'landcruiserfj',name:'ランドクルーザーFJ',cat:'SUV', price:'—',     base:5.56, cvr:.011, tool:.19, dealer:.050, eng:.71, pps:6.9,
     mix:{org:1.2,sem:.8,dsp:.8,vid:1.1,sns:1.1,crm:.8,ref:1.35,dir:1.15}, icon:'suv'},
    {id:'raize',   name:'ライズ',           cat:'SUV',     price:'171万〜', base:5.33, cvr:.022, tool:.25, dealer:.080, eng:.59, pps:4.4,
     mix:{org:1.0,sem:1.1,dsp:1.05,vid:.85,sns:1.05,crm:1.1,ref:.85,dir:.9}, icon:'suv'},
    {id:'aqua',    name:'アクア',           cat:'コンパクト・HEV', price:'214万〜', base:5.02, cvr:.020, tool:.24, dealer:.074, eng:.59, pps:4.4,
     mix:{org:1.0,sem:1.05,dsp:1.0,vid:.85,sns:1.0,crm:1.2,ref:.85,dir:.95}, icon:'compact'},
  ];
  const NM=MODELS.length;

  /* ---------- マスタ：商材レンズ・コンバージョン（GA4キーイベント実測・7/22〜8/18） ---------- */
  const GOODS=[
    {id:'shodan', name:'新車商談',     color:'#3987E5'},
    {id:'store',  name:'来店・店舗',   color:'#D95926'},
    {id:'idreg',  name:'会員・ID',     color:'#199E70'},
    {id:'ec',     name:'EC・購入',     color:'#C98500'},
    {id:'fb',     name:'サイト改善',   color:'#D55181'},
  ];
  /* real: GA4実測の28日発生数。mult は生成テンソルの28日合計が real に一致するよう
     後段 calibrateGoals() で自動決定（value＝1件あたりの想定価値・円） */
  const GOALS=[
    {id:'estimate', name:'見積りシミュレーション完了', goods:'shodan', mult:1, real:393556, value:8000,  ev:'estimate_simulation_complete'},
    {id:'testdrive',name:'試乗予約',                goods:'shodan', mult:1, real:2429,   value:25000, ev:'test_drive_complete（通常+即時）'},
    {id:'consult',  name:'商談・購入相談予約',        goods:'shodan', mult:1, real:775,    value:30000, ev:'purchase_consultation'},
    {id:'lead',     name:'リード獲得',              goods:'shodan', mult:1, real:3209,   value:15000, ev:'lead'},
    {id:'dealer',   name:'販売店検索',              goods:'store',  mult:1, real:79579,  value:3000,  ev:'dealer_search'},
    {id:'tel',      name:'電話発信タップ',           goods:'store',  mult:1, real:7559,   value:12000, ev:'tel'},
    {id:'signup',   name:'TOYOTAアカウント登録',     goods:'idreg',  mult:1, real:161185, value:2500,  ev:'sign_up'},
    {id:'purchase', name:'購入手続き完了',           goods:'ec',     mult:1, real:2960,   value:20000, ev:'purchase'},
    {id:'improve',  name:'サイト改善フィードバック',  goods:'fb',     mult:1, real:5104,   value:300,   ev:'jp_improvement'},
  ];
  /* ゴール×チャネル係数（チャネル別の出やすさ・実測合計に整合する推定按分） */
  const GOAL_CH={
    estimate:{org:1.15,sem:1.25,dsp:.45,vid:.55,sns:.7,crm:1.1,ref:.9,dir:1.15},
    testdrive:{org:1.1,sem:1.2,dsp:.5,vid:.65,sns:.8,crm:1.15,ref:.85,dir:1.2},
    consult:{org:1.1,sem:1.15,dsp:.5,vid:.6,sns:.75,crm:1.3,ref:.85,dir:1.25},
    lead:{org:1.05,sem:1.2,dsp:.6,vid:.7,sns:.9,crm:1.1,ref:.9,dir:1.1},
    dealer:{org:1.1,sem:1.1,dsp:.5,vid:.6,sns:.8,crm:1.0,ref:.85,dir:1.2},
    tel:{org:1.05,sem:1.1,dsp:.4,vid:.5,sns:.7,crm:1.0,ref:.8,dir:1.35},
    signup:{org:.9,sem:.9,dsp:.7,vid:.8,sns:1.1,crm:1.5,ref:1.1,dir:1.3},
    purchase:{org:.9,sem:.8,dsp:.5,vid:.5,sns:.8,crm:2.2,ref:.9,dir:1.4},
    improve:{org:1.0,sem:1.0,dsp:.8,vid:.8,sns:1.0,crm:1.0,ref:1.0,dir:1.0},
  };
  /* 再訪/新規のCV倍率（再訪÷新規・推定） */
  const GOAL_RET_RATIO={estimate:3.0,testdrive:3.4,consult:3.6,lead:2.8,dealer:2.2,tel:2.6,signup:1.4,purchase:4.5,improve:1.6};
  /* 車種ごとの商材レンズ関心シェア（セッション帰属・合計1・推定按分） */
  function goodsShare(m){
    let s={shodan:.56,store:.16,idreg:.18,ec:.05,fb:.05};
    if(m.id==='landcruiser300'||m.id==='landcruiser250'||m.id==='landcruiserfj'){s={shodan:.60,store:.14,idreg:.16,ec:.05,fb:.05}}
    if(m.id==='alphard'){s={shodan:.58,store:.15,idreg:.17,ec:.05,fb:.05}}
    if(m.cat==='コンパクト・HEV'){s={shodan:.54,store:.17,idreg:.19,ec:.05,fb:.05}}
    if(m.id==='sienta'||m.id==='voxy'||m.id==='noah'){s={shodan:.56,store:.16,idreg:.18,ec:.05,fb:.05}}
    return s;
  }

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
    if(m.id==='landcruiser300'||m.id==='landcruiser250'||m.id==='landcruiser70'){boost('outdoor',1.4);boost('car',1.3);boost('biz',1.1)}
    if(m.id==='landcruiserfj'){boost('outdoor',1.6);boost('car',1.4);boost('tech',1.1)}
    if(m.id==='alphard'){boost('biz',1.5)}
    if(m.cat==='コンパクト・HEV'){boost('eco',1.5);boost('family',1.1)}
    if(m.id==='raize'||m.id==='yariscross'){boost('eco',1.15);boost('family',1.15)}
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
    /* ベース＝GA4実測の都道府県セッションを6エリアに集約（7/22〜8/18） */
    const t={hokkaido:.1254,kanto:.3921,chubu:.1710,kinki:.1495,chushi:.1078,kyushu:.0543};
    if(m.id==='landcruiser300'||m.id==='landcruiser250'||m.id==='landcruiserfj'){t.chubu*=1.15;t.kyushu*=1.2;t.hokkaido*=1.2;t.kanto*=.9}
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
  /* 実測デバイス比（7/22〜8/18）: mobile 76.2% / desktop 22.5% / tablet 1.3%。
     チャネル別の傾斜は推定・全体は実測比に整合 */
  const DEV_CH={org:[.78,.205,.015],sem:[.80,.187,.013],dsp:[.86,.128,.012],vid:[.85,.138,.012],sns:[.90,.09,.01],crm:[.82,.168,.012],ref:[.66,.328,.012],dir:[.755,.230,.015]};
  const AGES=['18-24','25-34','35-44','45-54','55-64','65+'];
  function ageGender(m){ // [male share by age…, female share by age…] 合計1
    /* ベース＝GA4実測（Googleシグナル取得分・7/22〜8/18）：
       男性 9.3/19.0/18.6/14.6/7.0/3.9% ・ 女性 3.2/7.5/8.5/4.6/2.3/1.6% */
    let male=[.0930,.1896,.1858,.1464,.0698,.0390], female=[.0315,.0746,.0852,.0464,.0228,.0159];
    if(m.cat==='ミニバン'){male=[.07,.21,.21,.13,.06,.03];female=[.03,.10,.10,.04,.02,.01]}
    if(m.id==='landcruiser300'||m.id==='landcruiser250'||m.id==='landcruiserfj'){male=[.05,.15,.19,.19,.11,.06];female=[.02,.05,.07,.06,.03,.02]}
    if(m.id==='aqua'||m.id==='raize'){male=[.08,.16,.16,.14,.09,.06];female=[.04,.09,.10,.06,.03,.02]}
    const s=[...male,...female].reduce((a,b)=>a+b,0);
    return {male:male.map(v=>v/s), female:female.map(v=>v/s)};
  }

  /* ---------- イベント（スパイク・GA4実測の実発生日） ----------
     日付・規模＝実測日次セッションから検出した実スパイク（要因ラベルは中立表記）。
     日次合計は後段で実測値に較正されるため amp/dur は形状の初期値。 */
  const EVENTS=[
    {date:'2026-02-19',model:null, amp:1.30,dur:7, label:'アクセス増加期 ①（実測 78〜82万S/日）'},
    {date:'2026-04-10',model:null, amp:1.45,dur:3, label:'アクセス急増 ②（実測 峰64.6万S/日）'},
    {date:'2026-05-14',model:null, amp:1.75,dur:4, label:'アクセス急増 ③（実測 峰86.5万S/日・期間最大）'},
    {date:'2026-07-25',model:null, amp:1.24,dur:2, label:'週末アクセス増 ④（実測 峰42万S/日）'},
    {date:'2026-08-01',model:null, amp:1.20,dur:3, label:'月初アクセス増 ⑤（実測 峰41.9万S/日）'},
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
    // 車種ページ以外（見積り・T-Connect・マイページ・TOP・サポート等）
    // 係数2.31 → 車種ページ群シェアが実測 29.5%（車種ライン別ページ実測合計 285.8万S/28日）に一致
    const oc=[];
    for(let c=0;c<NC;c++){
      const modelSum=row.reduce((a,r)=>a+r[c],0);
      const f={org:.95,sem:.30,dsp:.55,vid:.60,sns:.65,crm:1.45,ref:1.15,dir:1.35}[CHANNELS[c].id];
      oc.push(modelSum*f*2.31*(1+jit(.05)));
    }
    OTHER.push(oc);
  }

  /* ========== 実測キャリブレーション（GA4: toyota.jp 324699885 / 2026-08-19 Windsor.ai経由取得） ========== */
  /* REAL_DAILY[d] = [sessions, totalUsers, newUsers]  2026-01-31〜2026-08-18 の200日・GA4実測値 */
  const REAL_DAILY=[[592730,466769,224047],[657658,523435,260892],[566364,475723,234716],[664960,541037,246490],[617726,521731,246718],[576288,491115,241802],[589731,489542,243500],[679211,538931,273933],[662241,545047,268927],[536161,448615,219714],[528896,433088,218491],[625437,505542,258106],[606625,480455,224531],[633969,515535,275139],[727266,588581,327080],[766740,619774,344040],[639268,535779,305988],[614789,514520,289334],[668040,576372,326627],[822129,681550,400969],[784674,670496,369210],[823163,667744,366460],[798116,676422,373262],[753239,645657,354811],[771952,634580,338784],[764944,648484,345646],[675019,548454,279191],[628915,539386,267914],[688632,566920,290065],[676068,553707,287783],[655811,579269,314184],[684844,600092,331446],[674958,568200,305367],[671493,570406,305023],[640055,539937,279109],[690109,586634,313020],[720781,597969,321586],[643299,536161,277867],[710438,602283,333590],[681029,562098,302996],[642561,549726,275158],[546359,454965,222262],[547800,450404,221827],[543879,441574,218659],[482565,399826,192655],[441497,370234,174106],[455323,370248,171046],[445859,363388,162657],[487596,388209,185426],[479233,393629,188968],[513633,420198,200466],[470912,387804,169516],[415767,348536,158487],[433203,349163,161424],[458238,375098,171203],[440723,359203,163944],[489212,397872,189887],[506199,413598,201436],[414126,342987,158933],[413388,334999,152509],[410954,334620,146466],[502327,413366,200931],[494621,409538,185257],[542613,430864,200704],[520041,411968,193497],[427905,353548,160083],[440921,356555,157193],[412849,341137,151410],[434244,356976,159898],[637061,483431,221140],[646193,490488,222261],[608433,479312,217236],[506695,423041,175317],[532193,416374,166563],[593651,475018,191027],[553512,442075,187554],[513367,407576,191401],[582002,454652,214654],[593603,474793,230242],[460777,391922,183795],[466102,384238,183071],[479709,388719,183143],[467685,388030,180776],[472203,385798,180234],[559563,437530,212364],[577522,455887,224470],[484931,396098,191843],[440101,360029,170649],[476449,385581,186139],[439670,354900,171329],[423516,348575,171875],[404390,338150,166562],[409383,339505,181242],[403222,334775,170173],[386314,325006,166525],[431414,360967,180325],[479349,388769,183573],[502732,404151,190703],[555078,435015,206014],[536676,429485,203282],[448391,375552,176577],[516160,425267,209501],[560583,447125,211794],[865187,660225,333066],[753307,599954,290850],[707515,551541,268873],[703864,545622,260880],[552821,454561,222892],[535853,447811,218801],[524803,424730,198206],[547329,449670,214844],[554135,446721,204072],[631604,488816,234249],[659220,520934,245766],[498387,415738,192864],[458865,389737,182674],[584625,476560,235643],[573581,471271,235781],[433032,351311,158768],[446658,355193,165139],[430936,347394,158032],[374083,303554,137009],[349789,286291,129098],[450201,356632,162349],[400481,331762,145877],[384744,320287,143911],[432570,354579,168221],[469352,364521,174267],[331496,270967,116445],[308101,254483,104894],[333021,267124,112594],[338159,268900,119566],[333588,271524,117907],[398014,315087,145573],[413203,324631,151940],[308739,255599,115469],[301268,251168,112171],[334778,271855,118567],[350229,285497,129558],[337148,278553,113898],[405224,326347,147825],[414148,322307,147224],[338546,277591,128956],[331150,271804,121184],[368496,296650,124431],[353646,292264,129820],[324039,264890,112392],[402974,314137,139335],[419277,324738,142453],[303415,257461,107562],[282214,229525,99640],[415162,333874,145810],[394879,316462,134782],[359314,294772,121684],[409246,322577,143460],[426668,340446,150766],[336129,274785,118463],[306747,257421,109625],[335928,274060,113600],[342336,274361,114788],[340733,272903,114709],[395653,307944,136800],[415798,326366,143943],[336356,273078,120316],[329236,260406,114278],[344474,278168,117164],[338095,273243,117204],[334074,271268,116375],[398745,302899,136148],[409253,320500,146069],[357080,286604,125891],[314551,261794,113348],[366511,289442,116876],[356926,288287,116552],[335402,270615,115146],[420440,324071,143340],[411293,323757,146400],[336563,271683,118334],[296136,244931,102932],[307721,249185,105828],[327969,262900,109778],[336396,270935,115029],[390692,309510,136757],[418714,331843,146446],[390661,298147,128963],[371067,293607,127277],[345173,282611,120360],[358328,280869,121120],[347910,279419,119719],[387981,306222,139416],[389902,315169,146982],[319744,260232,122588],[316761,255739,122553],[305131,252998,123290],[295473,251159,126879],[286956,248597,125498],[300852,242778,118837],[304939,249554,121710],[332354,270550,126563],[324805,271145,125173]];
  (function calibrate(){
    if(REAL_DAILY.length!==NDAYS) return;
    // (a) チャネル構成を実測シェアへ（直近28日の現行構成→実測構成の係数を全期間に適用）
    const target=CHANNELS.map(c=>c.share);
    const cur=new Array(NC).fill(0);
    for(let d=NDAYS-28;d<NDAYS;d++){
      for(let c=0;c<NC;c++){
        for(let mi=0;mi<NM;mi++)cur[c]+=S[d][mi][c];
        cur[c]+=OTHER[d][c];
      }
    }
    const tot=cur.reduce((a,b)=>a+b,0);
    const cAdj=target.map((t,c)=>t/Math.max(1e-9,cur[c]/tot));
    for(let d=0;d<NDAYS;d++)for(let c=0;c<NC;c++){
      for(let mi=0;mi<NM;mi++)S[d][mi][c]*=cAdj[c];
      OTHER[d][c]*=cAdj[c];
    }
    // (b) 日次合計を実測セッションへ
    for(let d=0;d<NDAYS;d++){
      let curD=0;
      for(let mi=0;mi<NM;mi++)for(let c=0;c<NC;c++)curD+=S[d][mi][c];
      for(let c=0;c<NC;c++)curD+=OTHER[d][c];
      const k=REAL_DAILY[d][0]/Math.max(1,curD);
      for(let mi=0;mi<NM;mi++)for(let c=0;c<NC;c++)S[d][mi][c]*=k;
      for(let c=0;c<NC;c++)OTHER[d][c]*=k;
    }
    // (c) CVイベント量を実測へ：mult を「生成28日合計 = GA4実測28日」となるよう決定
    GOALS.forEach(g=>{
      let raw=0;
      for(let d=NDAYS-28;d<NDAYS;d++)for(let mi=0;mi<NM;mi++){
        const m=MODELS[mi];
        for(let c=0;c<NC;c++)raw+=S[d][mi][c]*m.cvr*(GOAL_CH[g.id][CHANNELS[c].id]||1)*DN[g.id][d];
      }
      g.mult=g.real/Math.max(1e-9,raw);
    });
  })();
  /* PV・エンゲージ率・平均滞在の較正係数（直近28日実測に一致させる） */
  const CAL={pvps:3.3146, eng:0.6682, dur:265.21};   // GA4実測（7/22〜8/18）
  const CALF=(function(){
    let mSess=0,oSess=0,pvRaw=0,engRaw=0,durRaw=0;
    for(let d=NDAYS-28;d<NDAYS;d++){
      for(let mi=0;mi<NM;mi++){let s=0;for(let c=0;c<NC;c++)s+=S[d][mi][c];
        mSess+=s;pvRaw+=s*MODELS[mi].pps;engRaw+=s*MODELS[mi].eng;durRaw+=s*(52+MODELS[mi].pps*21)}
      for(let c=0;c<NC;c++)oSess+=OTHER[d][c];
    }
    pvRaw+=oSess*2.1;
    const sess=mSess+oSess;
    return {pv:CAL.pvps*sess/Math.max(1,pvRaw), eng:CAL.eng/(engRaw/Math.max(1,mSess)), dur:CAL.dur/(durRaw/Math.max(1,mSess))};
  })();

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
              const rate=m.cvr*g.mult*(GOAL_CH[g.id][CHANNELS[c].id]||1);
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
      // ユーザー数はセッション÷頻度係数＝GA4実測（期間セッション÷期間ユニークユーザー）
      const freq= range<=7?1.4289: range<=28?1.7765:1.9735;
      const users=sessions/freq;
      const nsAll=CHANNELS.reduce((a,c,i)=>a+(X.byChannel[i]+X.otherByChannel[i])*(seg==='all'?c.newShare:seg==='new'?1:0),0);
      const newRate= sessions? nsAll/sessions:0;
      const pv=(X.byModel.reduce((a,b,i)=>a+b.sessions*MODELS[i].pps,0)+X.other*2.1)*CALF.pv;  // ×較正 → 実測 PV/S 3.315（GA4 28日）
      return {sessions,users,newRate,cv,cvByGoal,value,pv,modelSessions};
    }
    const T=totals(A), TP=totals(P);
    // エンゲージメント（車種加重・×較正 → 実測 66.8%／平均265秒＝GA4 28日）
    const engRate=A.byModel.reduce((a,b,i)=>a+MODELS[i].eng*b.sessions,0)/Math.max(1,T.modelSessions)*(seg==='ret'?1.08:seg==='new'?0.94:1)*CALF.eng;
    const avgDur=A.byModel.reduce((a,b,i)=>a+(52+MODELS[i].pps*21)*b.sessions,0)/Math.max(1,T.modelSessions)*CALF.dur;

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
    const LP=['車種ページ','見積り・T-Connect系','サイトトップ','販売店検索','マイページ・会員'];
    const LP_MIX={org:[.46,.05,.30,.09,.10],sem:[.50,.16,.14,.10,.10],dsp:[.24,.58,.10,.03,.05],vid:[.28,.54,.10,.03,.05],
      sns:[.30,.44,.12,.04,.10],crm:[.26,.16,.30,.14,.14],ref:[.38,.10,.34,.08,.10],dir:[.30,.04,.48,.10,.08]};
    const MID=['グレード・価格','見積りシミュレーター','車種比較・ギャラリー','販売店・在庫検索','離脱（回遊なし）'];
    const LP_MID=[[.26,.16,.22,.10,.26],[.20,.22,.18,.08,.32],[.14,.08,.16,.12,.50],[.10,.10,.06,.52,.22],[.16,.30,.10,.16,.28]];
    const OUT=['見積り完了','試乗・商談・リード','アカウント登録','店舗・購入ほか','未CVで離脱'];
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
    // 成果ノード：実CVに厳密整合（GA4キーイベント9種を4束に集約）
    const cvEst=A.total.cvByGoal.estimate;
    const cvVisit=A.total.cvByGoal.testdrive+A.total.cvByGoal.consult+A.total.cvByGoal.lead;
    const cvKU=A.total.cvByGoal.signup;
    const cvSrv=A.total.cvByGoal.dealer+A.total.cvByGoal.tel+A.total.cvByGoal.purchase+A.total.cvByGoal.improve;
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
      {name:'CLEAR｜コンバージョン',   v:s5, desc:'9種のキーイベント合計（GA4実測）'},
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

  /* ---------- キャンペーン（GA4 utm_campaign 実測・7/22〜8/18） ----------
     sessions＝GA4実測。CV＝チャネル平均CVRからの推定按分（広告費・媒体レポートは未連携のため非表示） */
  const CAMPAIGNS=[
    {id:'toyou',    name:'toyou ブランド訴求（常時）',        ch:'dsp', utm:'toyou_brand_2606_tq',        real:486980, since:'2026-06', active:true},
    {id:'smc',      name:'smc 常時計測タグ',                 ch:'dir', utm:'smc_2305_tqa',               real:85230,  since:'2023-05', active:true},
    {id:'tt2607',   name:'トヨタイムズ ブランド（7月）',       ch:'sem', utm:'toyotatimes_brand_2607_tq',  real:77536,  since:'2026-07', active:false},
    {id:'crown',    name:'クラウンシリーズ 販売促進',          ch:'dsp', utm:'crownseries_sales_2604_tq',  real:28878,  since:'2026-04', active:true},
    {id:'pdf',      name:'PDF資料からの誘導',                ch:'crm', utm:'pdf_doc',                    real:21267,  since:'常時',    active:true},
    {id:'tt2608',   name:'トヨタイムズ ブランド（8月）',       ch:'sem', utm:'toyotatimes_brand_2608_tq',  real:19794,  since:'2026-08', active:true},
    {id:'tacct',    name:'TOYOTAアカウント経由',             ch:'dir', utm:'toyotaaccount',              real:19702,  since:'常時',    active:true},
    {id:'alp_mmc',  name:'アルファード 一部改良 告知',         ch:'sns', utm:'alphard_mmc_2606_tq',        real:16163,  since:'2026-06', active:true, model:'alphard'},
    {id:'ml2608',   name:'マンスリーメール 8月号',            ch:'crm', utm:'monthly260807_always_2608_dp',real:6863,  since:'2026-08', active:true},
    {id:'tgram',    name:'トヨタグラム ブランド',             ch:'dsp', utm:'toyotagram_brand_2602_tq',   real:6039,   since:'2026-02', active:true},
    {id:'ml2607',   name:'マンスリーメール 7月号',            ch:'crm', utm:'monthly260731_always_2607_dp',real:5608,  since:'2026-07', active:false},
    {id:'welcab',   name:'ウェルキャブ・C+walks 常時',        ch:'sem', utm:'welcab-cwalks_always_2204_tq',real:4991,  since:'2022-04', active:true},
    {id:'meta_id',  name:'SNS広告（ID管理キャンペーン）',      ch:'sns', utm:'120252578260050729',         real:3852,   since:'—',       active:true},
  ];
  function campaigns(range){
    const A=agg(range,'all');
    const chIdx=Object.fromEntries(CHANNELS.map((c,i)=>[c.id,i]));
    // 28日実測を基準に、選択期間のチャネル実測比でスケール
    const A28=agg(28,'all');
    return CAMPAIGNS.map(cp=>{
      const ci=chIdx[cp.ch];
      const scale=A.channels[ci].sessions/Math.max(1,A28.channels[ci].sessions);
      const sess=cp.real*scale;
      const cvr=A.channels[ci].cvr;
      const cv=sess*cvr;
      return {...cp, src:CHANNELS[ci].name, med:'utm_campaign', chName:CHANNELS[ci].name, chColor:CHANNELS[ci].color,
        sessions:sess, cv, cvr, spend:0, cpa:null, roas:null, active:cp.active};
    });
  }

  /* ---------- UTMサンバースト（チャネル → utm_campaign・実測） ---------- */
  function utmTree(range){
    const cps=campaigns(range);
    const bySrc={};
    cps.forEach(c=>{
      bySrc[c.chName]=bySrc[c.chName]||{name:c.chName,children:[],value:0};
      bySrc[c.chName].children.push({name:c.utm,value:Math.round(c.sessions),cv:c.cv,cp:c});
      bySrc[c.chName].value+=c.sessions;
    });
    const A=agg(range,'all');
    const paidSess=A.channels.filter(c=>c.paid).reduce((a,c)=>a+c.sessions,0);
    const tracked=cps.filter(c=>CHANNELS.find(x=>x.id===c.ch).paid).reduce((a,c)=>a+c.sessions,0);
    return {tree:Object.values(bySrc),tracked,paidSess,untracked:Math.max(0,paidSess-tracked)};
  }

  /* ---------- ミッション（8月・月次目標＝直近28日実測ペース×31日の仮置き） ---------- */
  function missions(){
    // 8/1〜8/18 の実績
    const a=IDX['2026-08-01'], b=IDX['2026-08-18'];
    const mtd={estimate:0,testdrive:0,signup:0,newSessions:0};
    for(let d=a;d<=b;d++){
      for(let mi=0;mi<NM;mi++){
        const m=MODELS[mi];
        for(let c=0;c<NC;c++){
          const s=S[d][mi][c];
          mtd.newSessions+=s*CHANNELS[c].newShare;
          for(const gid of ['estimate','testdrive','signup']){
            const g=GOALS.find(x=>x.id===gid);
            mtd[gid]+=s*m.cvr*g.mult*(GOAL_CH[gid][CHANNELS[c].id]||1)*DN[gid][d];
          }
        }
      }
      for(let c=0;c<NC;c++)mtd.newSessions+=OTHER[d][c]*CHANNELS[c].newShare;
    }
    const pace=18/31;
    /* 目標値＝GA4実測（7/22〜8/18）の28日実績×31/28（月次換算）を丸めた仮置き。
       確定目標の受領後に置換可能 */
    const defs=[
      {id:'m1',name:'見積りシミュレーション完了', target:435000, actual:mtd.estimate, unit:'件', icon:'target'},
      {id:'m2',name:'試乗予約',                target:2700,  actual:mtd.testdrive, unit:'件', icon:'wheel'},
      {id:'m3',name:'TOYOTAアカウント登録',      target:178000, actual:mtd.signup,  unit:'件', icon:'key'},
      {id:'m4',name:'新規ユーザー獲得',          target:3860000, actual:mtd.newSessions, unit:'人', icon:'user'},
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
    return {score:s, tier, missions:ms, weights:w};
  }
  /* スコアの日次推移（8/1〜最終日: 各日時点のMTDペースで再計算） */
  function scoreTrend(){
    const a=IDX['2026-08-01'], b=IDX['2026-08-18'];
    const w=[.32,.28,.16,.24];
    const out=[];
    const mtd={estimate:0,testdrive:0,signup:0,newSessions:0};
    const targets=[435000,2700,178000,3860000];
    for(let d=a;d<=b;d++){
      for(let mi=0;mi<NM;mi++){
        const m=MODELS[mi];
        for(let c=0;c<NC;c++){
          const sv=S[d][mi][c];
          mtd.newSessions+=sv*CHANNELS[c].newShare;
          for(const gid of ['estimate','testdrive','signup']){
            const g=GOALS.find(x=>x.id===gid);
            mtd[gid]+=sv*m.cvr*g.mult*(GOAL_CH[gid][CHANNELS[c].id]||1)*DN[gid][d];
          }
        }
      }
      for(let c=0;c<NC;c++)mtd.newSessions+=OTHER[d][c]*CHANNELS[c].newShare;
      const pace=(d-a+1)/31;
      const acts=[mtd.estimate,mtd.testdrive,mtd.signup,mtd.newSessions];
      const sc=acts.reduce((acc,v,i)=>acc+w[i]*Math.min(1.15,(v/targets[i])/pace),0)/1.15*100;
      out.push({date:DATES[d], score:sc});
    }
    return out;
  }
  /* イベントの実測影響：期間平均セッション vs 直前同日数平均 */
  function eventImpact(){
    const dayTotal=d=>{let t=0;for(let mi=0;mi<NM;mi++)for(let c=0;c<NC;c++)t+=S[d][mi][c];for(let c=0;c<NC;c++)t+=OTHER[d][c];return t};
    return EVENTS.map(ev=>{
      const s0=IDX[ev.date]; if(s0==null)return {...ev,impact:null};
      const len=Math.min(ev.dur,3);  // 初動3日の押し上げで評価
      let cur=0,prev=0,n=0;
      for(let i=0;i<len;i++){ if(s0+i<NDAYS){cur+=dayTotal(s0+i);n++} }
      for(let i=1;i<=n;i++){ if(s0-i>=0)prev+=dayTotal(s0-i) }
      const ratio= prev>0? (cur/n)/(prev/n) : null;
      return {...ev, impact:ratio};
    });
  }

  /* ---------- カスタムディメンション台帳（GA4プロパティに実登録されている定義・Windsor.aiフィールド一覧より） ---------- */
  const CUSTOM_DIMS=[
    {scope:'User',  disp:'会員種別',              param:'membership_type',    fill:null, vals:'会員区分', note:'TOYOTAアカウント連携の会員区分'},
    {scope:'User',  disp:'TOYOTAユニークID ①〜③', param:'toyota_unique_id1-3',fill:null, vals:'ハッシュID', note:'CRM側IDとの突合キー（3系統）'},
    {scope:'User',  disp:'カスタムクライアントID',  param:'custom_client_id',   fill:null, vals:'ハッシュID', note:'デバイス横断の紐付け補助（2系統）'},
    {scope:'User',  disp:'カラーモード',           param:'color_mode',         fill:null, vals:'light / dark', note:'表示設定。UI改善分析用'},
    {scope:'Event', disp:'ページ名',              param:'page_name',          fill:null, vals:'正規化ページ名', note:'ページ分析の主キー'},
    {scope:'Event', disp:'ページ種別',             param:'page_type',          fill:null, vals:'car / estimate / member / …', note:'テンプレート単位の集計キー'},
    {scope:'Event', disp:'ページディレクトリ ①〜③', param:'page_directory1-3',  fill:null, vals:'URL階層', note:'車種・機能単位のドリルダウン'},
    {scope:'Event', disp:'正規化ページURL',        param:'page_location_normalized', fill:null, vals:'URL', note:'パラメータ除去済みURL'},
    {scope:'Event', disp:'ページ参照元',           param:'page_referrer',      fill:null, vals:'URL', note:'遷移元の把握'},
    {scope:'Event', disp:'販売店コード×チャネル',   param:'dealer_code_and_channel_data', fill:null, vals:'販売店コード', note:'販売店送客の効果測定キー'},
    {scope:'Event', disp:'キャンペーンフォームID',  param:'campaign_form_id',   fill:null, vals:'フォームID', note:'CP応募フォームの識別'},
    {scope:'Event', disp:'利用種別',              param:'usage_type',         fill:null, vals:'用途区分', note:'来訪目的の分類'},
    {scope:'Event', disp:'エラーメッセージ',        param:'error_message',      fill:null, vals:'テキスト', note:'フォーム離脱要因の特定'},
    {scope:'Event', disp:'送信元識別子',           param:'sender_source',      fill:null, vals:'識別子', note:'通知・メール経由の識別'},
  ];
  /* イベント辞書（GA4実測・7/22〜8/18の実発生数） */
  const EVENTS_DICT=[
    {ev:'page_view',                    disp:'ページ表示',                n0:32153037},
    {ev:'estimate_simulation',          disp:'見積りシミュレーター操作',    n0:13803090},
    {ev:'custom_link_click',            disp:'リンククリック',            n0:6600744},
    {ev:'select_content',               disp:'コンテンツ選択',            n0:3215909},
    {ev:'conversion_6types_complete',   disp:'6種CV束（参考・重複含む）',  n0:463785},
    {ev:'estimate_simulation_complete', disp:'見積りシミュレーション完了',  n0:393556, cv:true},
    {ev:'maker_estimate_complete',      disp:'メーカー希望小売価格 見積り完了', n0:328160, cv:true},
    {ev:'video_start',                  disp:'動画再生開始',              n0:181650},
    {ev:'sign_up',                      disp:'TOYOTAアカウント登録',      n0:161185, cv:true},
    {ev:'dealer_search',                disp:'販売店検索',                n0:79579, cv:true},
    {ev:'dealer_estimate_complete',     disp:'販売店見積り 完了',          n0:65601, cv:true},
    {ev:'tel',                          disp:'電話発信タップ',            n0:7559, cv:true},
    {ev:'jp_improvement',               disp:'サイト改善フィードバック',    n0:5104},
    {ev:'lead',                         disp:'リード獲得',                n0:3209, cv:true},
    {ev:'purchase',                     disp:'購入手続き完了',            n0:2960, cv:true},
    {ev:'test_drive（通常+即時）',       disp:'試乗予約',                 n0:2429, cv:true},
    {ev:'purchase_consultation',        disp:'商談・購入相談予約',         n0:775, cv:true},
  ];
  const REAL_S28=9700436;  // 28日実測セッション（イベント数の期間スケール基準）

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
    CUSTOM_DIMS,EVENTS_DICT,REAL_S28,DIMS,STAGE_LOGIN,
    agg,pairMatrix,sankey,funnel,comboData,rfMatrix,affinityAgg,campaigns,utmTree,missions,score,scoreTrend,eventImpact,
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

/* ============ OWNED 拡張（2026-08-19 改修版）：実GA4接続・資産スナップショット・回遊ロジック ============ */
/* Toyota.jp 実測（GA4 プロパティ 324699885 / Windsor.ai 経由 / 2026-07-22〜08-18 の28日間） */
OWNED.tj = {
  period:'7/22〜8/18（28日間・GA4実測）', asof:'2026-08-19',
  s:9700436, u:5460490, nu:3490346, pv:32153037, ke:1515823,
  tdN:2194, tdI:235, sim:393556, cv6:463785,
  dailyStart:'2026-07-22',
  daily:[[366511,61,12585],[356926,65,12161],[335402,50,11830],[420440,114,14562],[411293,122,16470],[336563,100,13052],[296136,90,12415],[307721,64,12119],[327969,66,12200],[336396,46,12121],[390692,73,13703],[418714,104,15637],[390661,99,15695],[371067,80,14856],[345173,53,13436],[358328,59,13849],[347910,57,12925],[387981,78,14802],[389902,83,15878],[319744,57,13549],[316761,90,15641],[305131,71,15086],[295473,69,14688],[286956,69,14284],[300852,71,15019],[304939,131,16681],[332354,87,14463],[324805,85,13849]]
};
OWNED.tj.pvps = OWNED.tj.pv / OWNED.tj.s;                       // PV/セッション 実測
OWNED.tj.addPVy = (OWNED.tj.pv - OWNED.tj.s) / 28 * 365;        // 年間追加閲覧（2ページ目以降）
/* JP 資産ロジック：本体＝流入価値（KPI資料準拠）／回遊＝実測PV/Sから算出する上振れ分 */
OWNED.jpAsset = {
  flowMain:28.6, uuY:95250000, searchShare:.5, cpc:60,
  cpcNote:'加重CPC60円＝指名70%×30円＋一般30%×130円（自動車実勢）',
  uuNote:'年間UU 9,525万＝年間目標1.00億 × 進捗95%（GA・現行シート）',
  kaiyu:{ eff:.6, cpm:700,
    val: Math.round((OWNED.tj.pv-OWNED.tj.s)/28*365 * .6 * .7 /1e6)/100,   // 億円
    note:'回遊価値＝年間追加閲覧（PV−S・実測PV/S '+(OWNED.tj.pv/OWNED.tj.s).toFixed(2)+'）× 有効閲覧60% × ディスプレイ相当CPM700円' }
};
/* SNS 基盤スナップショット（アクティブ率×CPFでSTOCKを算出。FLOWは露出ロジック7/29版で固定） */
OWNED.snapDefs = { x:{a:.60,cpf:150,n:'X'}, ig:{a:.70,cpf:200,n:'Instagram'}, tt:{a:.80,cpf:150,n:'TikTok'}, fb:{a:.50,cpf:250,n:'Facebook'}, yt:{a:.70,cpf:200,n:'YouTube 3ch'} };
OWNED.snaps = [
  { d:'2026-07-29', f:{x:647000,ig:849000,tt:804000,fb:560000,yt:1240500}, src:'初回実測（KPI共有資料 7/30版）' },
  { d:'2026-08-19', f:{x:647000,ig:851000,tt:804000,fb:560000,yt:1279000}, src:'定例クロール（TikTokは7/29値を継続）' }
];
OWNED.fixedStock = { mail:2.70, line:1.91 };  // 会員系は月次実績で更新
OWNED.flowFixed  = { yt:2.79, mail:1.46, line:1.08, ig:1.03, tt:1.17, x:0.56, fb:0.06 }; // 億円/年（露出7/29版）
OWNED.calcStock = snap => {                                     // SNS STOCK 実額（円）
  const D=OWNED.snapDefs; let t=0, by={};
  for(const k in D){ by[k]=snap.f[k]*D[k].a*D[k].cpf; t+=by[k]; }
  return { total:t, by };
};
OWNED.assetAt = snap => {                                       // 総資産（億円）
  const st=OWNED.calcStock(snap).total/1e8 + OWNED.fixedStock.mail + OWNED.fixedStock.line;
  const fl=28.6 + Object.values(OWNED.flowFixed).reduce((a,b)=>a+b,0);
  return { stock:st, flow:fl, total:st+fl };
};

/* ============ OWNED 再構築データ（2026-08-19 v3）：活動台帳・投稿統一テーブル・四象限 ============ */
/* --- JP活用実績：活動台帳（行クリック → 何が変わったか） --- */
OWNED.junction.activities = [
  { id:'A-01', name:'T-Connect バナー実装', target:'リクエスト（試乗予約）完了ページ', since:'2026-07-27', state:'live',
    what:'完了ページ下部「トピックス」枠にT-Connect訴求バナーを新設。padid付き実URLで個別計測',
    url:'https://toyota.jp/tconnectservice/?padid=from_service_request_done_260727',
    vol:{ exposure:'予約完了者 2,429件/28日（GA4実測）の眼前に常時表示', clicks:'クリック 7セッション（7/7〜8/5・29日）', note:'到達率 現状0.87%' },
    fx:[ ['CV寄与','来店予約step1 到達 1件（7/30深夜・実測第1号）'],
         ['追加滞在','11分27秒/件 — 予約完了後に純増で得た接触時間'],
         ['回遊の深さ','T-Connect滞在 ×2.1（1分34秒 vs 通常45秒）・ページ内行動 ×3.8'],
         ['来店行動','店舗検索滞在 +63%（1分51秒）・地図検索 +46%'] ],
    before:'完了文 → 販売店連絡先 → 横スクロールのカルーセル（2枚目以降はスワイプ必須）',
    after:'T-Connectバナーが完了ページに常設。クリック者は「試乗当日の予習」（リモートエアコン1分45秒・対応車種リスト確認）に回遊',
    timeline:true,
    next:'完了文直下へ配置＋3本全表示（レポート#007改善案）→ 到達率2%で年579件・460万円へ' },
  { id:'A-02', name:'au / UQ mobile バナー実装', target:'リクエスト（試乗予約）完了ページ', since:'2026-08-04', state:'live',
    what:'同トピックス枠に「クルマもスマホもトヨタのお店でまとめてサポート」バナーを追加',
    url:'https://toyota.jp/service/request/',
    vol:{ exposure:'予約完了者 2,429件/28日（GA4実測）の眼前に常時表示', clicks:'第1号ユーザーを 8/4 実測（稼働2週間）', note:'クリック蓄積はこれから' },
    fx:[ ['回遊','第1号はauの回線案内でなくT-Connectリモートエアコン機能へ回遊（1分45秒読了）'],
         ['示唆','「来店のついでにスマホも相談」文脈が自然 — 回線訴求より“来店時にできること”が刺さる'] ],
    before:'au/UQの接点は完了ページに存在せず',
    after:'完了ページからauショップ関連へ導線が開通。8/4に第1号回遊を確認',
    next:'主見出しを「来店のついでに、スマホもまとめて相談」へ（画像内文言の昇格）' },
  { id:'A-03', name:'用品UG（アップグレードファクトリー）バナー', target:'同・完了ページ', since:'稼働中', state:'ext',
    what:'純正装備の後付け訴求。遷移先が別サイト（KINTO側）',
    url:'https://toyota.jp/',
    vol:{ exposure:'同上の露出面', clicks:'toyota.jp側GA4では計測不可', note:'先方GA4連携待ち' },
    fx:[ ['計測','効果計測は連携後に追加（このボードに行が増える建て付け）'] ],
    before:'—', after:'—', next:'KINTO側GA4との計測連携を提案中' }
];

/* --- SNS：投稿統一テーブル（列分離・ソート用）＋カテゴリ＋媒体内倍率 --- */
/* mult: 媒体・チャンネル通常帯に対する倍率（露出xm / リアクションrm）。基準値はnorm参照 */
OWNED.sns.norm = { X:{exp:42000, rea:170, expL:'imp中央値4.2万（直近4投稿実測）', reaL:'いいね+RP+返信 通常計170'},
  IG:{exp:1100, rea:1120, expL:'いいね通常帯1,100（リーチ非公開のため代理・注記）', reaL:'総リアクション通常帯1,120'},
  FB:{exp:450, rea:460, expL:'想定リーチ4.5万×ER1%＝450', reaL:'同460'},
  YTSR:{exp:6000}, YTDR:{exp:500}, YTTM:{exp:18000} };
OWNED.sns.posts2 = [
  {sns:'IG', ch:'@toyota_jp', title:'お盆の帰省ラッシュ。もしご先祖様も渋滞に巻き込まれていたら？（精霊馬・CV:ファイルーズあい）', d:'8/13', cat:'キャラ×季節',
   exp:null, likes:89000, rts:4802, com:463, rea:94265, xm:80.9, rm:84.2, url:'https://www.instagram.com/p/Db83dLLgc-i/', cap:'assets/sns/ig_viral.jpg', buzz:1},
  {sns:'YT', ch:'ドライバーズch', title:'【前代未聞】帰省ラッシュで精霊馬が大渋滞（CV:ファイルーズあい）', d:'8/13', cat:'キャラ×季節',
   exp:300000, likes:null, rts:null, com:null, rea:null, xm:600, rm:null, url:'https://www.youtube.com/@toyotadriverschannel/videos', cap:'assets/sns/yt_dr.jpg', buzz:1},
  {sns:'YT', ch:'ショールーム', title:'【福祉】あなたを愛してくれた人が困っているかも', d:'8月上旬', cat:'感動CM（広告併用）',
   exp:7050000, likes:null, rts:null, com:null, rea:null, xm:1175, rm:null, url:'https://www.youtube.com/@toyotajpchannel/videos', cap:'assets/sns/yt_sr.jpg', ad:1},
  {sns:'X', ch:'@TOYOTA_PR', title:'ｶｯｶｯｶｯ…バッテリー上がりの打音【本当にあったヤバい兆し】', d:'8/14', cat:'実用ホラー',
   exp:57000, likes:152, rts:18, com:8, rea:178, xm:1.36, rm:1.05, url:'https://x.com/TOYOTA_PR'},
  {sns:'X', ch:'@TOYOTA_PR', title:'＼モット！トヨタオス！／ エンジンブレーキ篇', d:'8/17', cat:'道場シリーズ',
   exp:52000, likes:133, rts:12, com:6, rea:151, xm:1.24, rm:0.89, url:'https://x.com/TOYOTA_PR'},
  {sns:'X', ch:'@TOYOTA_PR', title:'福島県三春町 水素ワークショップ（SAMURAI BLUE クラウンFCEV）', d:'8/16', cat:'活動報告',
   exp:32000, likes:210, rts:21, com:3, rea:234, xm:0.76, rm:1.38, url:'https://x.com/TOYOTA_PR', cap:'assets/sns/x_post_h2.jpg'},
  {sns:'IG', ch:'@toyota_jp', title:'トヨタオス道場「カギ音の正体」篇', d:'8/13', cat:'道場シリーズ',
   exp:null, likes:1241, rts:15, com:4, rea:1260, xm:1.13, rm:1.13, url:'https://www.instagram.com/p/Db7JyBRFISK/', cap:'assets/sns/ig_key.jpg'},
  {sns:'IG', ch:'@toyota_jp', title:'トヨタオス道場「エンジンブレーキ」篇', d:'8/18', cat:'道場シリーズ',
   exp:null, likes:1038, rts:null, com:10, rea:1048, xm:0.94, rm:0.94, url:'https://www.instagram.com/p/DcIBp7lkhOX/', cap:'assets/sns/ig_reel.jpg'},
  {sns:'IG', ch:'@toyota_jp', title:'ゾッとする前に。バッテリー打音篇【ヤバい兆し】', d:'8/15', cat:'実用ホラー',
   exp:null, likes:978, rts:20, com:9, rea:1007, xm:0.89, rm:0.90, url:'https://www.instagram.com/p/DcATpx-AhoP/', cap:'assets/sns/ig_battery.jpg'},
  {sns:'FB', ch:'TOYOTA公式', title:'三春町 水素ワークショップ（とびchan.）', d:'8/17', cat:'活動報告',
   exp:null, likes:492, rts:9, com:3, rea:504, xm:1.09, rm:1.10, url:'https://www.facebook.com/ToyotaMotorCorporation', cap:'assets/sns/fb_post.jpg'},
  {sns:'YT', ch:'トヨタイムズ', title:'【新体制】豊田大輔SVP帰任｜月イチ！ウーブン・シティ#6', d:'8/17', cat:'企業ニュース',
   exp:20000, likes:null, rts:null, com:null, rea:null, xm:1.11, rm:null, url:'https://www.youtube.com/@toyotatimes/videos'}
];
/* --- 媒体別 最新投稿＋分析コメント --- */
OWNED.sns.media = [
  {id:'X', name:'X @TOYOTA_PR', col:'#8A96A8', f:'64.7万', asof:'8/19実測', cap:'assets/sns/x_profile.jpg', url:'https://x.com/TOYOTA_PR',
   latest:{t:'＼モット！トヨタオス！／ エンジンブレーキ篇', d:'8/17', exp:'5.2万 imp', likes:133, rts:'RP 12', com:'返信 6'},
   note:'実用ホラー（ヤバい兆し）が通常帯の1.4倍impと安定して跳ねる。活動報告（水素WS）はimpこそ0.8倍だが反応率1.4倍＝コア層に濃く刺さる。会話（返信）を最重視するXアルゴと道場シリーズの質問誘発が好相性'},
  {id:'IG', name:'Instagram @toyota_jp', col:'#D55181', f:'85.1万', asof:'8/19実測', cap:'assets/sns/ig_profile.jpg', url:'https://www.instagram.com/toyota_jp/',
   latest:{t:'トヨタオス道場「エンジンブレーキ」篇', d:'8/18', exp:'リーチ非公開', likes:1038, rts:'リポスト —', com:'コメント 10'},
   note:'精霊馬が通常帯の81倍いいね・シェア4,802で圧勝 — シェアを最重視するIGアルゴの勝ち筋そのもの。通常投稿は1,000いいね前後で安定。リール保持率・保存数（管理画面）が届けば伸びしろの特定が可能'},
  {id:'YT', name:'YouTube 3ch', col:'#E66767', f:'127.9万', asof:'8/19実測', cap:'assets/sns/yt_dr.jpg', url:'https://www.youtube.com/@toyotadriverschannel',
   latest:{t:'精霊馬が大渋滞（ドライバーズch）', d:'8/13', exp:'30万回視聴', likes:null, rts:'ch通常比 600倍', com:'—'},
   note:'チャンネルごとに通常帯が2桁違う（SR 6千・TM 1.8万・DR 500）。精霊馬はDR通常比600倍でチャンネルの天井を突破 — バズ企画の受け皿をDRに固定するとチャンネル成長が歪むため、キャラ企画は本体chへの同時投稿を推奨'},
  {id:'FB', name:'Facebook TOYOTA公式', col:'#3987E5', f:'56万', asof:'8/19実測', cap:'assets/sns/fb_page.jpg', url:'https://www.facebook.com/ToyotaMotorCorporation',
   latest:{t:'三春町 水素ワークショップ', d:'8/17', exp:'リーチ非公開', likes:492, rts:'シェア 9', com:'コメント 3'},
   note:'自然リーチが構造的に低い媒体（想定リーチ率8%）だが、活動報告のストック置き場として機能。シェア×30の重み付けを持つFBアルゴに対し、地域・共催者のシェアを誘発する「タグ付け設計」が最小工数の改善'}
];

/* ============ OWNED v4（2026-08-19）：目的起点KPI・効果額積み上げ・CV実測分解・媒体別直近5件 ============ */
/* JP実測ベースの導線シナリオ再計算（分母=完了 年換算31,663件・1件あたり価値7,905円=レポート#007の 200万円÷253件 から逆算） */
OWNED.junction.perClickYen = 7905;
OWNED.junction.scenarios = [
  {k:'実測ペース', r:.28, n:92,   h:18,  v:73,   req:'現状の配置のまま（クリック7件/29日 実測）'},
  {k:'Step1',     r:2,   n:633,  h:121, v:500,  req:'完了文直下へ配置＋3本全表示'},
  {k:'Step2',     r:3,   n:950,  h:181, v:751,  req:'＋見出し・コピーの具体化'},
  {k:'Step3',     r:5,   n:1583, h:302, v:1251, req:'＋ボタン化・車種パーソナライズ'}
];
OWNED.junction.denom.perYear = 31663;
/* 活動 v2：目的 → 目的から設計したKPI → 効果額 */
OWNED.junction.activities[0].purpose = 'CVが起きた直後のHOTなユーザーに、コネクティッド（T-Connect）を知ってもらう';
OWNED.junction.activities[0].kpis = [
  {k:'表示（露出）', v:'2,516', u:'件/29日', s:'完了ページ表示＝試乗予約完了数（GA4実測）'},
  {k:'クリック', v:'7', u:'件', s:'padid実測（7/7〜8/5）'},
  {k:'クリック率', v:'0.28', u:'%', s:'7 ÷ 2,516'},
  {k:'クリック後 滞在', v:'11:27', u:'/件', s:'予約完了後の純増接触時間'},
  {k:'クリック後 回遊', v:'×2.1', u:'', s:'T-Connect滞在 1分34秒 vs 通常45秒'}
];
OWNED.junction.activities[0].money = {now:73, pot:1251, note:'年92件（実測ペース0.28%×分母31,663件）× 7,905円/件。改修後5%なら1,251万円'};
OWNED.junction.activities[1].purpose = '同じHOTなユーザーに「トヨタのお店でスマホもまとめて相談できる」ことを知ってもらう';
OWNED.junction.activities[1].kpis = [
  {k:'表示（露出）', v:'2,516', u:'件/29日', s:'同・完了ページ'},
  {k:'クリック', v:'計測1件〜', u:'', s:'8/4 第1号を実測（稼働2週間・蓄積中）'},
  {k:'クリック率', v:'集計中', u:'', s:'次回GA4集計で確定'},
  {k:'クリック後 回遊', v:'1:45', u:'', s:'第1号はリモートエアコン機能ページを読了'}
];
OWNED.junction.activities[1].money = {now:null, pot:null, note:'クリック蓄積後にA-01と同ロジックで算出（自動で積み上がる建て付け）'};
OWNED.junction.activities[2].purpose = '同ユーザーに純正アップグレード用品を知ってもらう（遷移先が外部サイト）';
OWNED.junction.activities[2].kpis = [
  {k:'表示（露出）', v:'2,516', u:'件/29日', s:'同・完了ページ'},
  {k:'クリック', v:'計測不可', u:'', s:'toyota.jp側GA4では遷移後を追えない'}
];
OWNED.junction.activities[2].money = {now:null, pot:null, note:'KINTO側GA4との連携合意後に計測開始'};

/* 商材・CV：キーイベント実測分解（GA4・7/22〜8/18） */
OWNED.tjCV = [
  {ev:'estimate_simulation_complete', name:'見積りシミュレーション完了', n:393556, biz:'販売・宣伝'},
  {ev:'maker_estimate_complete',      name:'メーカー見積り完了',        n:328160, biz:'販売・宣伝'},
  {ev:'sign_up',                      name:'会員登録（TOYOTAアカウント）', n:161185, biz:'CRM・オウンド'},
  {ev:'dealer_search',                name:'販売店検索',                n:79579,  biz:'販売店送客'},
  {ev:'tel',                          name:'電話タップ',                n:7559,   biz:'販売店送客'},
  {ev:'jp_improvement_cv_no_tell',    name:'JP改善CV（電話除く）',       n:5104,   biz:'オウンド'},
  {ev:'lead_complete',                name:'リード獲得 完了',            n:3209,   biz:'CRM'},
  {ev:'purchase',                     name:'purchase（EC系）',          n:2960,   biz:'EC・用品'},
  {ev:'test_drive_normal_reserve',    name:'試乗予約（通常）',           n:2194,   biz:'販売店送客', hot:1},
  {ev:'purchase_consultation',        name:'購入相談 完了',              n:775,    biz:'販売店送客'},
  {ev:'test_drive_instant_reserve',   name:'試乗予約（即時）',           n:235,    biz:'販売店送客', hot:1}
];

/* SNS 媒体別 直近5件（実測クロール 8/19。※印＝投稿から間もない時点の値） */
OWNED.sns.media[0].last5 = [
  {d:'8/19', t:'トヨタの改善で畜産（トヨタイムズ引用）', exp:'1.8万', likes:55, rt:'RP3', com:'—', note:'※投稿4時間時点'},
  {d:'8/17', t:'トヨタオス道場 エンジンブレーキ篇', exp:'5.2万', likes:133, rt:'RP12', com:'返信6'},
  {d:'8/16', t:'三春町 水素ワークショップ', exp:'3.2万', likes:210, rt:'RP21', com:'返信3'},
  {d:'8/14', t:'バッテリー打音【ヤバい兆し】', exp:'5.7万', likes:152, rt:'RP18', com:'返信8'},
  {d:'8/12', t:'カギ音の正体（トヨタオス）', exp:'未取得', likes:null, rt:'—', com:'—', na:1}
];
OWNED.sns.media[1].last5 = [
  {d:'8/18', t:'トヨタオス道場 エンジンブレーキ篇', exp:'非公開', likes:1038, rt:'—', com:'コメ10', naExp:1},
  {d:'8/15', t:'バッテリー打音篇【ヤバい兆し】', exp:'非公開', likes:978, rt:'RP20', com:'コメ9', naExp:1},
  {d:'8/13', t:'精霊馬の帰省ラッシュ 🎉', exp:'非公開', likes:89000, rt:'シェア4,802', com:'コメ463', naExp:1, buzz:1},
  {d:'8/13', t:'カギ音の正体（トヨタオス）', exp:'非公開', likes:1241, rt:'RP15', com:'コメ4', naExp:1},
  {d:'8/11頃', t:'エアコン篇【ヤバい兆し】', exp:'未取得', likes:null, rt:'—', com:'—', na:1}
];
OWNED.sns.media[2].last5 = [
  {d:'8/17', t:'ウーブン・シティ#6（トヨタイムズ）', exp:'2万回', likes:null, rt:'—', com:'—', naRea:1},
  {d:'8/13', t:'精霊馬が大渋滞（ドライバーズch）🎉', exp:'30万回', likes:null, rt:'ch通常比600倍', com:'—', naRea:1, buzz:1},
  {d:'8月上旬', t:'【福祉】愛してくれた人が困っているかも（SR）', exp:'705万回', likes:null, rt:'広告併用と推定', com:'—', naRea:1},
  {d:'2週間前', t:'SIENTA 商品紹介 乗降性/居住性（SR）', exp:'6,227回', likes:null, rt:'—', com:'—', naRea:1},
  {d:'2週間前', t:'TOYOTA SOCIAL FES!! 旭川（SR）', exp:'1,398回', likes:null, rt:'—', com:'—', naRea:1}
];
OWNED.sns.media[3].last5 = [
  {d:'8/17', t:'三春町 水素ワークショップ（とびchan.）', exp:'非公開', likes:492, rt:'シェア9', com:'コメ3', naExp:1},
  {d:'—', t:'過去投稿は次回クロールで蓄積', exp:'', likes:null, rt:'', com:'', na:1}
];
OWNED.sns.naHints = {
  igReach:'Instagramインサイト（管理画面）の閲覧権限共有、または Meta Business Suite 連携で取得できるようになります',
  ytRea:'YouTube Studio の閲覧権限共有（またはAPI連携）で高評価・コメント・CTR・視聴維持率まで取得できるようになります',
  fbReach:'Meta Business Suite 連携で投稿別リーチ・リアクション内訳が取得できるようになります',
  notYet:'次回定例クロール（または該当投稿の個別クロール）で取得予定です'
};
