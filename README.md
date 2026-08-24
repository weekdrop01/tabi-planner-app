# TABIKUMI — AI旅行プランナー（Vercel + Supabase構成）

Claudeアーティファクトのプロトタイプを、GitHub + Supabase + Vercel で実際にデプロイできる形にしたものです。

```
tabi-planner-app/
├── index.html              静的フロントエンド（ルート直下、Vercelがそのまま配信）
├── api/                    Vercelサーバーレス関数
│   ├── geocode.js            地名検索プロキシ（Nominatim）
│   ├── plan.js                AI旅程生成プロキシ（Claude API）
│   └── trips/
│       ├── index.js           旅行記録の一覧・作成
│       └── [id].js            旅行記録の詳細・削除
├── lib/
│   └── supabase.js         Supabaseクライアントの共通初期化
├── supabase/
│   └── schema.sql          Supabase側で実行するテーブル定義
├── package.json
└── .env.local.example      ローカル開発用の環境変数テンプレート
```

## なぜこの構成か

| 項目 | 選択 | 理由 |
|---|---|---|
| ホスティング | Vercel | 静的ファイル＋サーバーレス関数を無料枠でホスティングでき、GitHub連携で自動デプロイされる |
| DB | Supabase（Postgres） | 無料枠あり、将来的にログイン機能（Supabase Auth）へ拡張しやすい |
| APIキーの扱い | サーバーレス関数内の環境変数のみ | フロントエンドには一切渡さない |

## セットアップ手順

### 1. Supabaseプロジェクトを作る（または既存プロジェクトに相乗りする）

**コストを抑えるため、Supabaseプロジェクトはアプリごとに新規作成せず、1つのプロジェクトに複数アプリのテーブルを同居させる運用を推奨します。** Supabaseの無料枠はプロジェクト数が2個までという制限がある一方、1プロジェクトあたりのデータベース容量（500MB）やMAU（5万人）にはかなり余裕があるため、個人のMVP規模のアプリなら複数個を同居させても問題になりにくいです。

このアプリのテーブルには `tabi_` という接頭辞を付けています（例: `tabi_trips`）。次に別のアプリを同じSupabaseプロジェクトに追加するときは、そのアプリ用の接頭辞（例: `app2_xxx`）を付けたテーブルを作ってください。テーブル名さえ衝突しなければ、同じプロジェクト内に何個でもアプリを同居させられます。

1. 既存のSupabaseプロジェクト（または新規プロジェクト）を用意
2. 左メニューの「SQL Editor」を開き、`supabase/schema.sql` の内容を貼り付けて実行（`tabi_trips`テーブルが作られます）
3. 左メニューの「Settings」→「API」から以下をメモ：
   - **Project URL**（`SUPABASE_URL`になる）
   - **service_role key**（`SUPABASE_SERVICE_ROLE_KEY`になる。**anonキーではない方**。このキーは強い権限を持つので取り扱い注意）

### 2. Gemini APIキーを取得する

https://aistudio.google.com/apikey で発行（`GEMINI_API_KEY`になる）。使用モデルは `GEMINI_MODEL`（省略時は `gemini-2.5-flash`）で指定できます。

### 3. GitHubにpushする

```bash
git init
git add .
git commit -m "first commit"
# GitHubでリポジトリを作成した後
git remote add origin https://github.com/あなたのアカウント/tabi-planner-app.git
git push -u origin main
```

⚠️ `.env.local`ファイルは`.gitignore`で除外済みです。誤ってコミットしないよう注意してください。

### 4. Vercelにデプロイする

1. https://vercel.com にGitHubアカウントでログイン
2. 「Add New」→「Project」→さっき作ったリポジトリを選択してImport
3. 設定画面の「Environment Variables」に、以下の3つを追加：
   - `GEMINI_API_KEY`
   - `GEMINI_MODEL`（任意。省略時は`gemini-2.5-flash`）
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. 「Deploy」をクリック

デプロイが終わると `https://あなたのプロジェクト名.vercel.app` のようなURLが発行され、そこでアプリが動きます。

### ローカルで動作確認したい場合

```bash
npm install -g vercel   # Vercel CLI（初回のみ）
cd tabi-planner-app
cp .env.local.example .env.local
# .env.local を実際の値で埋める
vercel dev
```

`http://localhost:3000` で動作確認できます（`vercel dev`初回起動時はVercelアカウントとの連携を求められます）。

## 地図・地名検索プロバイダについて

現状は **OpenStreetMap（無料）+ Nominatim（無料の地名検索）+ Leaflet** を採用しています。

**将来Google Mapsに切り替える場合、`index.html`のフロントエンド部分は基本的に変更不要です。** 地名検索は`/api/geocode`というサーバー独自のエンドポイント経由にしてあるので、`api/geocode.js`の中身をPlaces API呼び出しに差し替えるだけで済みます。地図タイル表示（Leaflet部分）だけはフロント側の変更が必要です。

## 次にやると良いこと（優先度順）

1. **本物のログイン機能** — 今は匿名ID（ブラウザのlocalStorage）で旅行記録を区別している。Supabase Authを使えば、メールログイン/Googleログインへの移行は比較的スムーズにできる構成にしてある
2. **地名検索・ルーティングをGoogle Mapsへ切り替え** — 上記「地図・地名検索プロバイダについて」を参照
3. **`/api/plan`のレート制限** — Gemini APIの課金が発生しうるエンドポイントなので、同一ユーザー/IPからの連打を防ぐ対策を入れる（Vercelなら`@vercel/edge-config`やUpstash Redisと組み合わせるのが一般的）
4. **Nominatimのレート制限対策** — `api/geocode.js`内のスロットリングはサーバーレス関数のインスタンスごとにしか効かないため、アクセスが増えてきたら共有ストア（Upstash Redis等）でのレート制御に置き換える

## 動作確認の状況

このリポジトリのコードはサンドボックス環境で構文チェック・ロジックの単体テストは実施済みですが、実際のSupabaseプロジェクト・Vercel環境での動作確認はできていません（実際のAPIキー・プロジェクトが必要なため）。デプロイ後、まずは以下を一通り試してください：

1. スポットを登録してAIプランを生成できるか
2. 「旅の記録に保存する」→「過去の旅行」一覧に反映されるか
3. ブラウザを変えると別ユーザー扱いになる（＝過去の旅行が見えなくなる）ことを確認 — これは現状の簡易的な匿名ID方式の仕様です
