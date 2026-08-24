const { createClient } = require('@supabase/supabase-js');

// service_role キーはRLS(Row Level Security)を無視できる強い権限を持つ。
// サーバーレス関数（このapi/配下）の中だけで使い、絶対にフロントエンドに渡さないこと。
let client = null;

function getSupabase() {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が設定されていません');
  }
  client = createClient(url, key, {
    auth: { persistSession: false },
  });
  return client;
}

module.exports = { getSupabase };
