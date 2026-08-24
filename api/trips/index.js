const { getSupabase } = require('../../lib/supabase');
const crypto = require('crypto');

/* ---------------------------------------------------------
 * 匿名ユーザーID: 本格的なログインの代わりに、ブラウザが送る
 * X-User-Id ヘッダーで「誰の旅行記録か」を区別する簡易実装。
 * 実運用でアカウント間の共有・引き継ぎをしたい場合は、Supabase Auth
 * などの本物の認証に置き換える。
 * --------------------------------------------------------- */
function requireUserId(req, res) {
  const userId = req.headers['x-user-id'];
  if (!userId || typeof userId !== 'string' || userId.length > 100) {
    res.status(400).json({ error: 'X-User-Id header is required' });
    return null;
  }
  return userId;
}

module.exports = async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const supabase = getSupabase();

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('tabi_trips')
      .select('id, name, start_date, end_date, spots_json, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('trips list error', error);
      return res.status(500).json({ error: 'db_error', message: error.message });
    }

    const trips = data.map(r => ({
      id: r.id, name: r.name, start: r.start_date, end: r.end_date,
      spotCount: Array.isArray(r.spots_json) ? r.spots_json.length : 0,
      spotNames: Array.isArray(r.spots_json) ? r.spots_json.slice(0, 8).map(s => s.name) : [],
      savedAt: r.created_at,
    }));
    return res.status(200).json({ trips });
  }

  if (req.method === 'POST') {
    const { name, start, end, trip, spots, plan } = req.body || {};
    if (!trip || !spots || !plan) {
      return res.status(400).json({ error: 'trip, spots, plan are required' });
    }
    const id = 't_' + crypto.randomBytes(8).toString('hex');
    const createdAt = new Date().toISOString();

    const { error } = await supabase.from('tabi_trips').insert({
      id, user_id: userId, name: name || '', start_date: start || '', end_date: end || '',
      trip_json: trip, spots_json: spots, plan_json: plan, created_at: createdAt,
    });

    if (error) {
      console.error('trips insert error', error);
      return res.status(500).json({ error: 'db_error', message: error.message });
    }
    return res.status(201).json({ id, savedAt: createdAt });
  }

  res.status(405).json({ error: 'method_not_allowed' });
};
