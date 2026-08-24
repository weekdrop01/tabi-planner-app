/* ---------------------------------------------------------
 * AI旅程生成プロキシ（Gemini API）
 * system/userプロンプトの組み立てはフロントエンドが行い、
 * ここではAPIキーを付けてGoogleへ転送するだけにしている。
 * responseMimeType:"application/json" を指定することで、
 * Geminiが確実にJSON形式で返してくれる（マークダウンの
 * コードフェンスを剥がす処理が基本的に不要になる）。
 * --------------------------------------------------------- */

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'server_not_configured', message: 'GEMINI_API_KEY is not set' });
  }

  const { system, user } = req.body || {};
  if (!system || !user) {
    return res.status(400).json({ error: 'system and user are required' });
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          maxOutputTokens: 4000,
        },
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      console.error('gemini error', data);
      return res.status(502).json({ error: 'gemini_error', detail: data });
    }
    const candidate = (data.candidates || [])[0];
    const part = candidate && candidate.content && candidate.content.parts && candidate.content.parts[0];
    if (!part || !part.text) throw new Error('no text in response');
    // 念のため、万一マークダウンのコードフェンスが混ざっていても剥がせるようにしておく
    const raw = part.text.trim()
      .replace(/^```json/i, '')
      .replace(/^```/, '')
      .replace(/```$/, '')
      .trim();
    const plan = JSON.parse(raw);
    res.status(200).json({ plan });
  } catch (e) {
    console.error('plan generation error', e);
    res.status(502).json({ error: 'plan_generation_failed', message: e.message });
  }
};

