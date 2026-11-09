# むしにわ（mushi-niwa）

子ども（4〜10歳）向けの、いろいろな昆虫をお世話する 3D ブラウザゲーム。スマホ・iPad での体験を最優先にする。
公開先: https://danishi.github.io/mushi-niwa/

## コマンド

| コマンド | 内容 |
|---|---|
| `npm run dev` | 開発サーバー（`http://localhost:5173/mushi-niwa/`。`?fps` で FPS メーター、`?speed=30` で時間を 30 倍速、`?e2e` でテスト用フック `window.__mushi`（ストア）と `window.__r3f`（three のシーン）。`?e2e` では おきゃくさんが すぐ来て、`window.__forceVisitor` で種類を指定できる。`__mushi.night.value = true` で夜にできる） |
| `npm run build` | 型チェック（tsc 7）＋本番ビルド（`dist/`） |
| `npm test` | Vitest（ロジックのユニットテスト。`src/**/*.test.ts`） |
| `npm run e2e` | Playwright（WebKit で iPhone 16 縦 / iPad Pro 11 横）。先に `npm run build` が必要 |
| `npm run icons` | PWA アイコン PNG を `scripts/gen-icons.mjs` から再生成 |

見た目の確認は、`vite preview` を起動した状態で Playwright（WebKit・iPhone 16）からスクリーンショットを撮るのが確実（Claude の Browser ペインは非表示だと描画が止まる）。

完了の条件（各フェーズ共通）: `npm run build`・`npm test`・`npm run e2e` がすべて通ること。

## 技術スタック

Vite 8 / TypeScript 7 / React 19 / three 0.187 / @react-three/fiber 9 / drei 10 / @react-three/postprocessing 3 / zustand 5 / idb-keyval / vite-plugin-pwa 2 / Vitest 5 / Playwright 1.65。
デプロイは GitHub Actions（`.github/workflows/ci.yml`）→ GitHub Pages。main への push でテスト後に自動デプロイ。

## 設計方針

- **Canvas は 1 つだけ常駐**させ、画面遷移では中身（シーン）と DOM の HUD だけを入れ替える（iOS で WebGL コンテキストを作り直さない）。画面→シーン/カメラの対応は `src/app/scenes.ts`、HUD は `src/app/App.tsx`。
- **ゲームロジックは `src/sim/` の純 TS**。React / three を import しない。固定ステップ（1 秒）で進め、描画 FPS とは独立。Vitest で検証する。
- **虫の生態データは `src/data/species/*.ts`**。ロジックに直書きしない。新しい種はデータ（＋`src/creatures/` のモデル）を足すだけで動く構造を保つ。生態の事実は `docs/species-research.md`（最初の 6 種）と `docs/species-research-2.md`（オオカマキリ・トビズムカデ・マダラサソリ・ゴマダラカミキリ）、`docs/visitors-research.md`（にわの おきゃくさん 最初の 5 種）、`docs/species-research-3.md`（オオクワガタ と おきゃくさん 8 種）の出典付き調査に基づく。ムカデ・サソリは昆虫ではないので `notInsect` を付け、ずかんで説明する。
- **むしずもう（異種対戦）**: ユーザー要望で入れる。ケガ・罰なしの押し合いミニゲーム。得意技は各種の実際の防御行動から取り、「実際には異なる種どうしは戦わない」注記を出す。
- **ケースは 6 つまで**（ユーザー判断）: いっぱいのときは「あたらしい むし」→ どの子を もりに かえすか選ぶ → 思い出カード → あいたケースで種を選ぶ。途中で送り出しても罰はない。
- **さわると いかく**: `SpeciesDef.threat`（spray / display / squeak）。かんさつモードで何度も触ると出る安全学習。生きた虫を捕まえる場面は描かず、えさは小皿の「ちいさな むし」で表す。
- **お世話の わかりやすさ**: 道具を使う間はカメラが寄り（`cinematic.kind = 'tool'`）、終わると吹き出しが よろこびに変わる（`ui.reaction`）。初回は お手本（`tutorialStep`、`settings.tutorialDone`）。吹き出しは drei の `Html` ではなく、3D 側で画面座標を計算して DOM を重ねる（`BubbleAnchor` + `WantBubble`）。
- **送り出し**: ユーザー判断で全種「もりにかえす」（物語上の表現）。現実の放虫注意は各種データの `caution` に書き、ずかんの大人向け注記で出す。
- **ミイデラゴミムシ**: 幼虫はケラの卵室で育つため家庭飼育不可。ゲームでは成虫のみ飼育し、幼虫期はずかんのコラムで紹介（ユーザー判断）。
- **罰を与えない**: 虫は死なない。お世話不足は「げんきがない」（成長が一時停止）になるだけ。寿命を終えた成虫は送り出し演出 → ずかんに思い出カード。
- **時間**: 通常は遊んでいる間だけ進む。設定の「リアルタイムモード」でのみ離席中も進む（追いつき計算は上限つき）。
- **毎フレーム変わる値は React state に入れない**（`src/state/env.ts`・`perfStats` のような可変オブジェクトを `useFrame` で読む）。
- **見た目は図鑑のような写実**（ユーザー判断で トゥーン調から変更）: 物理ベース材質 `mat()`／`SURF`（`src/three/materials.ts`）、環境マップ（RoomEnvironment を PMREM で生成）、AgX トーンマッピング、やわらかい影。テクスチャは `src/three/textures.ts` で Canvas から生成（外部画像なし）。虫の目はデフォルメせず複眼（`CompoundEye`）。脚は腿節・脛節・ふ節・つめ（`Leg` + `LegSpec`）、触角は種類別（`AntennaKind`）。
- **3〜5 歳でも遊べる操作**: 道具はタップだけ（`toolAction` → `AutoTool` が 3D で飛んでいって自動で使う。ドラッグなし）。お世話パラメータの数値・ゲージは出さず、虫の頭上の吹き出し（`WantBubble`、`wantOf()`）と、対応する道具ボタンの点滅で「してほしいこと」を伝える。画面のボタンは最小限：昼夜は空の太陽／月（`SkyToggle`）、かんさつは虫をタップ、ずかん・むしずもうは棚の前の 3D の本・切り株から入る。棚の前の入口（本・クイズの立てふだ・切り株）は 下の段のケースや「あたらしい むし」ボタンと重ならないよう、画面の縦横比で置き場所を変える（`portalLayout`）。当たり判定も見た目の大きさに合わせる。
- **横長画面の ずかん・クイズ**: 説明・選択肢は 右の 列に 出し、標本は 左半分に 見せる。カメラは `CameraShot.wide`（アスペクト比 1.2 超で 上書き）と `shiftX`（`setViewOffset` で 見た目だけ ずらすので 回転の 中心は 標本のまま）。CSS の `@media (min-aspect-ratio: 6/5)` と 対に なっている。
- **アダプティブ画質**: `src/three/quality.ts` の high / mid / low。`PerformanceMonitor` で FPS が落ちたら下げる。DPR 上限 2。影・後処理は high のみ、草の本数も画質で変える。
- **遠目の表示は軽量版**: 棚のミニケースは `LiteContext` で脚の先を省略。脚・触角・ケースの角はそれぞれ 1 ジオメトリに結合。影は主要パーツ（`castShadow` 指定）だけが落とす。
- **ドローコール削減**: マテリアルは `mat()`、ジオメトリは `GEO.*` / `sharedGeo()` でキャッシュ共有。同じ小物が多いものは `InstancedMesh`（`Scatter`）。
- **`useBodyMotion` の group には position を付けない**（毎フレーム上書きされる）。持ち上げたいときは外側に group を重ねる。
- **あきずに 遊べる しかけ**（ユーザーから「任せる」で追加）: どれも罰なし・失うものなし。
  - シールちょう: `src/data/stickers.ts`（条件はデータ）＋ `src/sim/progress.ts`（判定）＋ `src/state/progress.ts`（保存・トースト）。遊びの できごとは `playEvents`（`src/state/events.ts`）で中継し、ストアどうしは直接 import しあわない。トーストはクイズ回答中は出さない。
  - にわの おきゃくさん: `src/data/visitors.ts`（13 種。昼の虫・夜の虫（ホタル・コオロギ）・昆虫じゃない仲間（ダンゴムシ・クモ・カタツムリ））、モデルは `src/creatures/visitors.tsx`、出かたは `src/sim/visitors.ts` と `src/screens/garden/Visitors.tsx`。1 匹ずつ、まだ見つけていない子が来やすい。来る時間は データの `time`（day / night / any、`visitorsAt()`）。ジョロウグモは 奥の板に あみを はって 上から おりてくる。出る場所は手前の本・立てふだ・切り株の当たり判定と重ならない所（上の段・棚の奥板・空中）。
  - しゃしん: カメラボタン（`src/ui/CameraButton.tsx`）は お世話画面（道具の 演出中は かくす）と かんさつ画面の 右上。かんさつ画面だけだと 見つけにくかったので 両方に 置く。`src/three/snapshot.ts`（`addAfterEffect` で描画直後に読む。preserveDrawingBuffer は使わない）→ `src/state/photos.ts`（端末内、30 枚まで）。ずかんの「しゃしん」タブで見る。大人は設定で消せる。
  - むしクイズ: `src/sim/quiz.ts` が種データから 3 択を作る（手書きの問題を増やさない）。入口は にわの「？」立てふだ。画面は `quiz`。
  - ずかんは タブ（むし／おきゃくさん／シール／しゃしん）。おきゃくさんも むしと 同じく 台の 上の 3D（`GuestSpecimen`、外接箱で 大きさを そろえる）＋説明パネル（`ui.zukanGuest`）。説明パネル（`DetailSheet`）は 続きが あると 下に「↓」を 出す。
- **リロードで最新版になる**（ユーザー要望）: Service Worker は index.html を 先に取りおかず、ページは NetworkFirst（`cache: 'no-cache'`、4 秒で オフライン用の 保存版に 切りかえ）。js/css は ハッシュ付きなので precache。新しい SW は skipWaiting / clientsClaim で すぐ入れかわるが、遊んでいる最中の 自動再読みこみは しない（タイトル画面のときだけ。`src/app/pwa.ts`）。アプリに もどったときにも 更新を確かめる。設定画面に 版（`__APP_VERSION__`、CI では コミットの 先頭 7 文字）を出す。
- **3D アセットは外部に頼らない**: 虫・ジオラマはプリミティブとプロシージャル生成のみ。音も Web Audio で合成（`src/audio/audio.ts`）。外部フォント・外部リクエストなし。

## 規約

- 子ども向けの文言はひらがな中心。漢字は `{漢字|かんじ}` 記法で書き、`<Ruby text>` で表示、`speak()` で読み上げ（`src/text/`）。大人向けの設定画面だけは通常表記。
- 操作はアイコン（`src/ui/Icon.tsx`）・音・動きで伝える。ボタンは `IconButton`（64px、最低 56px）。ホバー前提の UI やドラッグ操作は作らない。
- E2E 用に主要要素へ `data-testid` を付ける。
- 設定画面はペアレンタルゲート（歯車 2.5 秒長押し → 漢数字の順番タップ）の先に置く。
- 広告・課金・外部トラッキング・個人情報の取得はしない。保存は端末内（IndexedDB → localStorage → メモリの順に退避）。
- コミットメッセージは英語・命令形・1 行目 72 文字以内。フェーズごとに動く状態でコミットする。

## ディレクトリ

```
src/app/          App・World(Canvas)・画面レジストリ・PWA 登録
src/screens/      title / garden / care / observe / zukan / battle / quiz / settings（各画面のシーンと HUD）
src/three/        共有 3D（写実マテリアル・Canvas テクスチャ、カメラリグ、ライト、画質、ジオラマ、パーティクル）
src/creatures/    虫のプロシージャルモデルとアニメーション
src/sim/          純 TS のゲームロジック
src/data/species/ 種ごとの生態データ
src/state/        zustand ストア（game / settings / ui）と env
src/save/         端末内ストレージ
src/audio/        効果音・BGM の合成
src/ui/           HUD 部品（Icon、IconButton、ParentalGate、FpsMeter）
src/text/         ルビ・読み上げ
tests/e2e/        Playwright スモークテスト
docs/             調査資料
```

## ローカル環境メモ（Claude Code のサンドボックス）

- npm キャッシュに書けないときは `npm_config_cache=$TMPDIR/npm-cache` を付ける。
- Playwright のブラウザは `PLAYWRIGHT_BROWSERS_PATH=/tmp/claude-501/ms-playwright`。`vite preview` のポート待ち受けはサンドボックス外で実行する必要がある。
