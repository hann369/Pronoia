import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { prompt, systemPrompt, tools, tool_choice } = await req.json();

    const apiKey = process.env.MISTRAL_API_KEY;
    
    if (!apiKey || apiKey === 'REPLACE_ME') {
      return NextResponse.json({ 
        choices: [{ message: { content: "AI Sync eingeschränkt (API Key fehlt). Systemstatus stabil." } }] 
      });
    }

    const payload = {
      model: 'mistral-large-latest',
      messages: [
        { role: 'system', content: systemPrompt || "You are the Pronoia Agent. Precise, imperative, proactive." },
        { role: 'user', content: prompt }
      ]
    };

    if (tools) {
      payload.tools = tools;
      payload.tool_choice = tool_choice || 'auto';
    }

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Mistral API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
