/* ---------------------------------------------------------
 * 地名検索プロキシ（現在: OpenStreetMap Nominatim / 無料）
 *
 * 【将来Google Placesに切り替える場合】
 * このエンドポイントの入出力（?q=... → {results:[{name,addr,lat,lng}]}）は
 * そのままに、中身の実装だけをPlaces APIの呼び出しに差し替えればよい。
 * フロントエンド（index.html）は変更不要。
 * --------------------------------------------------------- */

// Vercelのサーバーレス関数はリクエストごとに新しいプロセスで実行されうるため、
// モジュールスコープの変数によるレート制限はインスタンス内でしか効かない。
// 本格運用する場合はUpstash Redis等の共有ストアに置き換えるのが望ましい。
let lastNominatimCall = 0;

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const q = (req.query.q || '').toString().trim();
  if (!q) return res.status(400).json({ error: 'q is required' });

  const now = Date.now();
  const wait = Math.max(0, 1000 - (now - lastNominatimCall));
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastNominatimCall = Date.now();

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&accept-language=ja&q=${encodeURIComponent(q)}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'tabi-planner-mvp/0.1 (contact: set-your-email@example.com)' }
    });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const data = await response.json();
    const results = data.map(d => ({
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
