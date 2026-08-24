const { getSupabase } = require('../../lib/supabase');

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

  const { id } = req.query;
  const supabase = getSupabase();

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('tabi_trips')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('trip detail error', error);
      return res.status(500).json({ error: 'db_error', message: error.message });
    }
    if (!data) return res.status(404).json({ error: 'not_found' });

    return res.status(200).json({
      id: data.id, name: data.name, start: data.start_date, end: data.end_date,
      trip: data.trip_json, spots: data.spots_json, plan: data.plan_json, savedAt: data.created_at,
    });
  }

  if (req.method === 'DELETE') {
    const { error, count } = await supabase
      .from('tabi_trips')
      .delete({ count: 'exact' })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('trip delete error', error);
      return res.status(500).json({ error: 'db_error', message: error.message });
    }
    if (!count) return res.status(404).json({ error: 'not_found' });
    return res.status(200).json({ deleted: true });
  }

  res.status(405).json({ error: 'method_not_allowed' });
};
