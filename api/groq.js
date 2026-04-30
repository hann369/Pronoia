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
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'GROQ_API_KEY not set in Vercel environment variables.' });
  }

  if (!prompt) {
    return res.status(400).json({ error: 'Missing prompt in request body.' });
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'mixtral-8x7b-32768',
        messages: [
          { role: 'system', content: systemPrompt || 'You are the Pronoia Agent.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.5,
        max_tokens: 1000
      })
    });

    const data = await response.json();

    // Groq returns { error: { message, type } } on failure
    if (data.error) {
      const errMsg = typeof data.error === 'string' ? data.error : (data.error.message || JSON.stringify(data.error));
      console.error('Groq API Error:', errMsg);
      return res.status(response.status || 500).json({ error: errMsg });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Proxy fetch error:', error);
    return res.status(500).json({ error: error.message || 'Failed to reach Groq API' });
  }
}
