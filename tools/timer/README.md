# タイマー＆ストップウォッチ（products/010-timer-stopwatch）

第10号製品。タイマー（カウントダウン）・ストップウォッチ・ポモドーロタイマーを
1つにまとめたツールです。完全クライアントサイド・サーバー不要・オフライン動作（PWA対応）。

## 主な機能

- タブで3機能を切替
  - **タイマー**: 時・分・秒を指定してカウントダウン。一時停止/リセット、
    プリセット（1/3/5/10分）、終了時にビープ音＋タブタイトル点滅で通知
  - **ストップウォッチ**: 開始/停止、ラップ記録一覧（各ラップ時間＋合計時間）
  - **ポモドーロ**: 作業25分/休憩5分のサイクルを自動進行。完了した作業セッション回数を表示
- 時間計測は`Date.now()`基準でドリフト補正（`setInterval`の誤差を蓄積させない）
- アラーム音はWeb Audio APIで生成（音声ファイル不要）。自動再生制限に配慮し、
  「開始」ボタン押下時にAudioContextを有効化
- 終了時はビープ音に加えてタブタイトルの点滅でも通知（タブをアクティブにすると停止）
- 大きく見やすい時間表示（レスポンシブ）
- ダーク/ライトテーマ切替
- アクセシビリティ対応（タブのaria属性、ライブリージョン、キーボード操作、コントラスト）
- レスポンシブ・モバイルファースト
- PWA対応（ホーム画面に追加・オフライン動作）

## プライバシー設計

- すべての計測・通知処理は端末内のみで行われ、**外部送信は一切行いません。**
- localStorageには「テーマ設定・Proフラグ」のみを保存します（キー: `tf_theme` / `tf_pro`）。

## 収益設計（現状はすべてプレースホルダ）

| レール | 実装箇所 | 状態 |
| --- | --- | --- |
| AdSense | `index.html` の `.ad-slot--top` / `.ad-slot--bottom`、`monetization.js` の `ADSENSE_CLIENT_ID` | プレースホルダ。Pro時は非表示 |
| アフィリエイト | `monetization.js` の `AFFILIATE_ITEMS`（集中・作業グッズ関連） | プレースホルダURL、[PR]表記・`rel="sponsored nofollow noopener"`設定済み |
| Stripe (Pro ¥480買い切り) | `monetization.js` の `STRIPE_PAYMENT_LINK_URL`、`#pro-button` | 未設定時は「準備中」アラート表示 |

Pro動作確認用に、画面下部の「Proフラグを切替（開発用）」ボタンでlocalStorageの
`tf_pro`フラグを切り替えられます（広告非表示の挙動を確認できます）。

## 公開手順（社長がやるキー登録一覧）

1. Googleアドセンスの審査申請・通過後、`monetization.js`の`ADSENSE_CLIENT_ID`と
   `index.html`内のコメントアウトされたAdSenseスクリプト・`<ins>`タグを有効化する
2. アフィリエイト提携（集中タイマー・作業グッズ等）の承認後、`monetization.js`の
   `AFFILIATE_ITEMS`を実際のリンクに置き換える
3. Stripeで「タイマー＆ストップウォッチ Pro ¥480」のPayment Linkを発行し、
   `monetization.js`の`STRIPE_PAYMENT_LINK_URL`に設定する
4. `operator.html`の運営者情報・特定商取引法に基づく表記のTODOを埋める
5. 公開先リポジトリ（timer-stopwatch）でGitHub Pagesを設定し、`canonical`/OGPのURL
   （`https://ai-kaihatsubu.github.io/timer-stopwatch/`）が実URLと一致していることを確認する
6. 開発用「Proフラグを切替」ボタンは公開前に削除またはコメントアウトを検討する
7. リーガル/リスクチェック（`approval-queue/pending/010-timer-stopwatch/`）と社長承認を経て公開する

## ファイル構成

- `index.html` … ページ本体（SEO・タブUI・タイマー/ストップウォッチ/ポモドーロ・広告枠・アフィリ枠・Pro案内・使い方/FAQ）
- `style.css` … 共通スタイル＋本ツール固有のコンポーネント
- `app.js` … 各機能のロジック（Date.nowベースのドリフト補正、WebAudioビープ音、タブ点滅通知）・テーマ切替
- `monetization.js` … 収益3レールの設定・レンダリング
- `manifest.webmanifest` / `sw.js` / `icons/` … PWA関連
- `privacy.html` / `terms.html` / `operator.html` … 法務ページ
