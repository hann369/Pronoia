export default async function handler(req, res) {
  // CORS headers for cross-origin requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, systemPrompt } = req.body || {};
  // Prioritize MISTRAL_API_KEY, fallback to GROQ_API_KEY if the user hasn't renamed it yet in Vercel
  const apiKey = process.env.MISTRAL_API_KEY || process.env.GROQ_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'MISTRAL_API_KEY not set in Vercel environment variables.' });
  }

  if (!prompt) {
    return res.status(400).json({ error: 'Missing prompt in request body.' });
  }

  try {
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        messages: [
          { role: 'system', content: systemPrompt || 'You are the Pronoia Agent.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    const data = await response.json();

    if (data.error) {
      const errMsg = typeof data.error === 'string' ? data.error : (data.error.message || JSON.stringify(data.error));
      console.error('Mistral API Error:', errMsg);
      return res.status(response.status || 500).json({ error: errMsg });
    }

    // Mistral format is already OpenAI-compatible { choices: [...] }
    return res.status(200).json(data);
  } catch (error) {
    console.error('Proxy fetch error:', error);
    return res.status(500).json({ error: error.message || 'Failed to reach Mistral API' });
  }
}
