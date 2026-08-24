-- Supabaseの「SQL Editor」にこの内容を貼り付けて実行してください。
--
-- テーブル名に "tabi_" という接頭辞を付けています。これは、このSupabase
-- プロジェクトを他のアプリとも共有する運用（1プロジェクト内に複数アプリの
-- テーブルを同居させ、Supabaseプロジェクト数を増やさずコストを抑える方針）
-- のためです。新しいアプリを追加するときは、そのアプリ用の接頭辞
-- （例: "app2_"）を付けたテーブルを同じプロジェクト内に作ってください。

create table if not exists tabi_trips (
  id text primary key,
  user_id text not null,
  name text,
  start_date text,
  end_date text,
  trip_json jsonb not null,
  spots_json jsonb not null,
  plan_json jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_tabi_trips_user on tabi_trips(user_id);

-- Row Level Security（行単位のアクセス制御）を有効化しておく。
-- サーバーレス関数はservice_roleキーを使うためRLSをバイパスするが、
-- 万が一anonキーが漏れても直接テーブルを触られないようにする防御策。
alter table tabi_trips enable row level security;
