/* ---------------------------------------------------------
 * 地名検索プロキシ（現在: Photon by Komoot / 無料、OpenStreetMapデータ）
 *
 * 元々Nominatimを使っていたが、クラウド/サーバーレス環境からの
 * アクセスが403で拒否されるケースが確認されたため、同じくOSMデータを
 * 使う別の無料ジオコーダーであるPhotonに切り替えた。
 *
 * 【将来Google Placesに切り替える場合】
 * このエンドポイントの入出力（?q=... → {results:[{name,addr,lat,lng}]}）は
 * そのままに、中身の実装だけをPlaces APIの呼び出しに差し替えればよい。
 * フロントエンド（index.html）は変更不要。
 * --------------------------------------------------------- */

let lastCall = 0;

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const q = (req.query.q || '').toString().trim();
  if (!q) return res.status(400).json({ error: 'q is required' });

  // Photonの利用規約に沿って、簡易的なスロットリングをかけておく
  const now = Date.now();
  const wait = Math.max(0, 1000 - (now - lastCall));
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastCall = Date.now();

  try {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6&lang=ja`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const data = await response.json();
    const results = (data.features || []).map(f => {
      const p = f.properties || {};
      const nameParts = [p.name, p.city, p.state, p.country].filter(Boolean);
      return {
        name: p.name || nameParts[0] || q,
        addr: nameParts.join(', '),
        lat: f.geometry.coordinates[1],
        lng: f.geometry.coordinates[0],
      };
    });
    res.status(200).json({ results });
  } catch (e) {
    console.error('geocode error', e);
    res.status(502).json({ error: 'geocode_failed', message: e.message });
  }
};
