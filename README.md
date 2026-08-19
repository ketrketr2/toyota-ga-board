# TOYOTA GA4 COMMAND — toyota.jp デジタル計測ボード

トヨタ（toyota.jp想定）の GA4 データを **車種 × 商材 × 動線 × 再訪 × アフィニティ × カスタムディメンション × 広告トラッキング** でクロス分析する、ゲームUIのダッシュボード。

**▶ 公開URL: https://ketrketr2.github.io/toyota-ga-board/**

姉妹ボード：[AI Visibility KPI Board（GEO）](https://github.com/ketrketr2/toyota-geo-board) — 本ボードはその「GA4版・ゲーム強化版」。

> ⚠️ SECTOR 00〜07 は **合成デモデータ** で動作（`DEMO DATA` バッジ表示）。**SECTOR 08・09（OWNED OPS）は実測データ**：公式SNSクロール（2026-08-19）と GA4 実測レポート#007（7/7〜8/5）に基づく。

---

## 10のセクター

| # | ビュー | 見えるもの |
|---|---|---|
| 00 | **総合HQ** | サイトスコア（Lv・ティア）／8月ミッションボード（目標×ペース判定）／KPI HUD／セッション・CV指数トレンド（発表・キャンペーン注釈つき）／チャネル構成 |
| 01 | **車種ガレージ** | 14車種のキャラカード（ティアS〜C・集客力/転換力/再訪率/広告依存のステータスバー・スパークライン）→ クリックで詳細カルテ／ツリーマップ（面積=流入・色=CVR）／伸び率ランキング／リーグ表（ソート可） |
| 02 | **商材・CV** | 新車・認定中古車・KINTO・点検サービス・アクセサリーの5商材／8種CVスコアボード／商材×チャネル構成比／フォーム到達ファネル／車種×主要CVヒート |
| 03 | **動線マップ** | STAGE1〜CLEARのステージクリア型ファネル／サンキー図（流入→LP→回遊→CV。CVへ向かう金色の帯）／LP別回遊内訳／シミュレーター利用×CVR |
| 04 | **集客・広告** | チャネル成績表／キャンペーンリーグ（🥇メダル・UTMコード・CPA・ROASソート）／utm_source→campaign サンバースト／広告費×CVバブル |
| 05 | **オーディエンス** | 新規×再訪／再訪コンボ（訪問回数でCVR ×1.0→×7.6）／RFヒート／アフィニティ8セグメント（シェア＋CVR指数）／年齢×性別／会員ランク×CVR／エリア |
| 06 | **クロス分析ラボ** | 6ディメンション（車種・チャネル・商材・アフィニティ・ステージ・エリア）× 4指標（セッション・CV・CVR・新規率）を自由にクロスするヒートマップ＋自動インサイト／車種対戦モード（VSレーダー） |
| 07 | **計測設計** | カスタムディメンション台帳（`member_rank` `consideration_stage` `padid` 等12本・取得率アラート）／イベント辞書／UTM命名規約 |
| 08 | **JP導線実績 🟡実測** | リクエスト完了ページのコネクティッド／au・UQ導線のGA4実測（レポート#007）。成果第1号「1件」ヒーロー・クリック者vs非クリック者の滞在リフト（店舗検索+63%）・7/30深夜の全行動タイムライン・年間価値シナリオ（200万→1,200万円）・**編集できる施策リスト**（localStorage・追加/編集/削除/フィルタ） |
| 09 | **SNS資産 🟡実測** | 公式SNS実測クロール（X 64.7万・IG 85.1万・YouTube 3ch 127.9万・FB 56万 ほか）／メディア資産価値 **46.5億円**（STOCK+FLOW×Q）の内訳と採用単価／最新投稿ランキング（IG精霊馬 8.9万いいね等）／アカウントパワー100点配点マップ／刺さる・刺さらない分析／実画面キャプチャ |

共通操作：**期間（7日/28日/90日）× セグメント（全体/新規/再訪）** をヘッダで切替 → 全ビュー再計算。**⌘K / Ctrl+K** で車種・キャンペーン横断ジャンプ。

## 数値が絶対にズレない設計

すべての画面は `src/data.js` の単一テンソル `S[日][車種][チャネル]`（200日分）から**その場で集計**して描画される。

- 前期比＝同じテンソルの直前同日数ウィンドウ
- 新規/再訪＝チャネル別新規率で厳密分解（新規＋再訪＝全体が常に成立）
- CV＝車種×ゴール×チャネル係数で導出（商材・ステージ・アフィニティへの按分も周辺和を保存）
- クロス表の行計・列計は必ず他画面の合計と一致（起動時に Node で検算済み）

## GA4への接続（本番化）

demoデータ層を GA4 Data API（`runReport`）に差し替える設計。対応関係：

| ボード上の軸 | GA4側 |
|---|---|
| チャネル | `sessionDefaultChannelGroup` |
| 車種・グレード | カスタムディメンション `model_code` / `grade_code` |
| 商材・ステージ | カスタムディメンション `consideration_stage` ほか |
| アフィニティ | Googleシグナル `brandingInterest`（アフィニティカテゴリ） |
| 再訪コンボ | `newVsReturning` + セッション数バケット |
| 広告 | `sessionSource / sessionMedium / sessionCampaignName`（UTM） |
| CV | キーイベント（`estimate_complete` 等8種） |

## 開発

```bash
python3 build.py                  # src/ → index.html を組み立て
python3 -m http.server 8901       # http://localhost:8901
```

```
index.html            ← 成果物（単一ファイル・これだけで動く）
assets/echarts.min.js ← Apache ECharts 5.6.0（vendored）
src/
  data.js     データエンジン（シード固定・決定論）
  style.css   デザインシステム（ダークHUD / BIZ UDPGothic / 検証済みカテゴリカル8色）
  render1.js  HQ・ガレージ・商材・動線
  render2.js  集客・オーディエンス・ラボ・計測設計
  app.js      ナビ・フィルタ・⌘K・トースト
build.py      組み立てスクリプト
```

配色はカラーユニバーサル検証（CVD ΔE・コントラスト・明度バンド）を全チェック通過したカテゴリカル8色を使用。フォントは BIZ UDPGothic + JetBrains Mono。

## デプロイ

GitHub Pages（`main` ブランチ / root）。`index.html` と `assets/` を置くだけで動く。

---

出典・定義：[GA4 Data API](https://developers.google.com/analytics/devguides/reporting/data/v1?hl=ja) ／ [GA4 ディメンションと指標](https://support.google.com/analytics/answer/9143382?hl=ja) ／ [アフィニティカテゴリ](https://support.google.com/analytics/answer/2819950?hl=ja)
