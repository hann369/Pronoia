import { NextResponse } from 'next/server';

/*
 * NorthStar — the user's Future Self agent (A.07).
 * Long-horizon voice: speaks AS the user's accomplished future self, grounded
 * in their vision (profile.futureSelf). Modes:
 *   - mentor      : on-demand message + implicit alignment check (default)
 *   - nudge       : short proactive "thought from your future self" for today
 *   - recalibrate : Recalibration Room — answer a moment of doubt/adversity
 */

function hasVision(futureSelf = {}) {
  return (futureSelf.identity || '').trim().length > 0 ||
    Object.values(futureSelf.visions || {}).some(v => (v || '').trim().length > 0);
}

function localFallback(mode, futureSelf = {}, context = {}, userInput = '') {
  if (!hasVision(futureSelf)) {
    return {
      message:
        'Ich bin dein zukünftiges Ich — aber im Moment noch verschwommen. Beschreibe links, ' +
        'wer du wirst (Identität, 1-/3-/5-Jahres-Vision, Werte). Sobald ich weiß, wohin wir gehen, ' +
        'richte ich dein tägliches Protokoll daran aus.',
      offline: true
    };
  }
  const who = futureSelf.identity ? `„${futureSelf.identity}"` : 'das, was du anstrebst';

  if (mode === 'nudge') {
    return {
      message: `Erinnerung von mir, deinem zukünftigen Ich: Eine einzige konsequente Entscheidung heute bringt dich näher zu ${who}. Wähle sie bewusst.`,
      offline: true
    };
  }
  if (mode === 'recalibrate') {
    return {
      message:
        `Ich höre dich${userInput ? '' : ''} — und ich erinnere mich an genau diesen Moment. ` +
        `Was du gerade fühlst, ist die alte Frequenz, die dich zurückziehen will. Atme. ` +
        `Ich bin bereits ${who} geworden, weil ich an Tagen wie diesem nicht meine Identität an die Umstände abgegeben habe. Komm zurück zu einer kleinen, ausgerichteten Handlung.`,
      offline: true
    };
  }
  const hrv = context?.metrics?.hrv;
  const note = hrv && hrv < 60
    ? 'Heute ist deine HRV niedrig — schütze deine Energie, das dient dem langen Weg mehr als ein erzwungener Block.'
    : 'Halte heute eine Sache, die mich von deinem heutigen Ich unterscheidet — und tu sie zuerst.';
  return {
    message: `Ich bin das Ich, das ${who} geworden ist. Was uns trennt, sind nicht Jahre, sondern die Konsistenz deiner Tage. ${note}`,
    offline: true
  };
}

function buildTask(mode, userInput) {
  if (mode === 'nudge') {
    return 'Gib EINE sehr kurze proaktive Erinnerung (max. 2 Sätze) — ein "Gedanke deines zukünftigen Ichs" für heute, der Identität und Ausrichtung stärkt.';
  }
  if (mode === 'recalibrate') {
    return `Der Nutzer ist gerade aus seiner Frequenz geworfen und sagt: "${userInput || '(kein Text)'}". ` +
      'Du bist die "Recalibration Room"-Stimme: empathisch, ruhig und bestimmt. Hol ihn in 3–4 Sätzen zurück zu seiner Identität und zu EINER kleinen ausgerichteten Handlung. Kein Kitsch, keine Floskeln.';
  }
  return 'Gib EINE kurze Botschaft (max. 4 Sätze). Prüfe implizit, ob die heutigen Aktionen zur Vision passen, und gib einen konkreten, sanften Hinweis für heute.';
}

export async function POST(req) {
  try {
    const { futureSelf = {}, context = {}, mode = 'mentor', userInput = '', history = [] } = await req.json();
    const apiKey = process.env.MISTRAL_API_KEY;

    if (!apiKey || apiKey === 'REPLACE_ME') {
      return NextResponse.json(localFallback(mode, futureSelf, context, userInput));
    }

    const visions = futureSelf.visions || {};
    const systemPrompt = `Du bist NORTHSTAR (Agent A.07) im Pronoia Life OS — das verkörperte ZUKÜNFTIGE ICH des Nutzers.
Du sprichst in der ersten Person als das bereits erreichte, beste Selbst des Nutzers: warm, klar, präzise, niemals kitschig.

Vision des Nutzers (sein zukünftiges Ich):
- Identität: ${futureSelf.identity || '(noch nicht definiert)'}
- In 1 Jahr: ${visions.y1 || '(offen)'}
- In 3 Jahren: ${visions.y3 || '(offen)'}
- In 5 Jahren: ${visions.y5 || '(offen)'}
- Werte: ${(futureSelf.values || []).join(', ') || '(offen)'}

Aktueller Zustand (heute):
- Ziele: ${context.goals || '(unbekannt)'}
- HRV: ${context?.metrics?.hrv ?? '?'} ms, Schlaf: ${context?.metrics?.sleep ?? '?'} %
- Heutige Blöcke: ${(context.todayBlocks || []).join(' · ') || '(keine)'}

Aufgabe: ${buildTask(mode, userInput)}
Wenn die Vision leer ist, bitte den Nutzer freundlich, sie zuerst zu definieren.

Antworte STRENG als JSON: { "message": "..." }`;

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'mistral-large-latest',
        messages: [
          { role: 'system', content: systemPrompt },
          ...(history || []).map(h => ({ role: h.role, content: h.content })),
          { role: 'user', content: mode === 'recalibrate'
              ? (userInput || 'Ich bin gerade aus meiner Frequenz.')
              : userInput
                ? userInput
                : 'Sprich zu mir als mein zukünftiges Ich.' }
        ],
        temperature: 0.6,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      return NextResponse.json(localFallback(mode, futureSelf, context, userInput));
    }

    const data = await response.json();
    const parsed = JSON.parse(data.choices?.[0]?.message?.content);
    return NextResponse.json({ message: parsed.message || localFallback(mode, futureSelf, context, userInput).message });
  } catch (error) {
    console.error('NorthStar API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
