# 006-date-calculator（年齢・日数計算ツール）

生年月日から満年齢・総日数・次の誕生日まで、2つの日付の差、基準日からN日/週/月後(前)の日付を
ブラウザ内だけで計算するツールです。

## 機能

- ①満年齢（◯歳◯ヶ月◯日）・生まれてからの総日数・次の誕生日までの日数を計算
- ②2つの日付の差（日数・週数・概算の年月）を計算（順序が逆でも絶対値で表示）
- ③基準日＋N日/週/月後(前)の結果日付と曜日（日本語）を計算
- うるう年（2/29生まれの誕生日は平年は2/28扱い）・月末（1/31+1ヶ月→2月末）を正しく処理
- 初期値はすべて今日の日付
- ダーク/ライト切替、レスポンシブ、アクセシビリティ対応
- PWA対応（manifest + sw.js + Service Worker登録）

## プライバシー

- 入力した日付（生年月日含む）は外部送信・保存しません。すべて端末内（ブラウザ）で処理します。
- localStorageに保存するのはテーマ設定のみ。

## 収益設計（プレースホルダ）

- AdSense: コンテンツ上下に2枠（`monetization.js`の`ADSENSE_CLIENT_ID`未設定）
- アフィリエイト: 「おすすめ」枠（カレンダー・手帳・記念日ギフト想定、`AFFILIATE_ITEMS`未設定）
- Stripe Pro（¥480買い切り）: 広告非表示・複数人年齢一覧管理・CSV出力等を想定（`STRIPE_PAYMENT_LINK_URL`未設定）

## 公開手順（社長作業）

1. GitHub新規リポジトリ `date-calculator` を作成し、GitHub Pagesで公開
2. `index.html`等の`canonical`/OGP URLが実際の公開URLと一致するか確認
3. `operator.html`の運営者情報・特定商取引法に基づく表記を記入
4. AdSense審査申請 → 通過後 `monetization.js`の`ADSENSE_CLIENT_ID`設定とタグ有効化
5. AdSense配信開始に伴うCookie同意（CMP）対応の検討
6. アフィリエイト提携（カレンダー・手帳・記念日ギフト等）→ `AFFILIATE_ITEMS`を実リンクに更新
7. Stripe Payment Link発行 → `STRIPE_PAYMENT_LINK_URL`設定
8. 公開前に開発用「Proフラグを切替（開発用）」ボタンの削除を検討
