/* ---------------------------------------------------------
 * 地名検索プロキシ（現在: LocationIQ / 無料枠1日5,000リクエスト）
 * --------------------------------------------------------- */

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const q = (req.query.q || '').toString().trim();
  if (!q) return res.status(400).json({ error: 'q is required' });

  const LOCATIONIQ_KEY = process.env.LOCATIONIQ_KEY;
  if (!LOCATIONIQ_KEY) {
    return res.status(500).json({ error: 'server_not_configured', message: 'LOCATIONIQ_KEY is not set' });
  }

  try {
    const url = `https://us1.locationiq.com/v1/search?key=${LOCATIONIQ_KEY}&q=${encodeURIComponent(q)}&format=json&accept-language=ja&limit=6`;
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 404) return res.status(200).json({ results: [] });
      throw new Error('HTTP ' + response.status);
    }
    const data = await response.json();
    const results = (Array.isArray(data) ? data : []).map(d => ({
      name: d.display_name.split(',')[0],
      addr: d.display_name,
      lat: parseFloat(d.lat),
      lng: parseFloat(d.lon),
    }));
    res.status(200).json({ results });
  } catch (e) {
    console.error('geocode error', e);
    res.status(502).json({ error: 'geocode_failed', message: e.message });
  }
};
