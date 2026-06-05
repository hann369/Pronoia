import { NextResponse } from 'next/server';

const LOCAL_CONSENSUS_FALLBACK = (hrv, sleep, frictionLogs = []) => {
  const lastFriction = frictionLogs[0]?.status || 'ok';
  
  let leader = "A.01";
  let A01 = { status: "ACTIVE", text: "Zirkadiane Phase stabil. Fokus-Fenster eingehalten." };
  let A02 = { status: "ACTIVE", text: `Schlafwert bei ${sleep}%: Erholungs-Phase nominal.` };
  let A03 = { status: "ACTIVE", text: `HRV bei ${hrv}ms: ZNS-Spannung im grünen Bereich.` };
  let A04 = { status: "ACTIVE", text: "Stack-Compliance nominal. Nootropika-Zufuhr synchron." };
  let A05 = { status: "ACTIVE", text: "Geringe Reibung im aktuellen Ablauf blockiert." };
  let A06 = { status: "LEADING", text: "Alle kognitiven Subsysteme synchronisiert. System nominal." };

  let directive = "Alle kognitiven Subsysteme nominal. Zirkadianer Fokus wird fortgesetzt.";

  if (hrv < 55) {
    leader = "A.03";
    A03 = { status: "ALERT", text: `Kritischer HRV-Abfall auf ${hrv}ms! Erhöhter Stress-Pegel.` };
    A02 = { status: "ACTIVE", text: "Erholungs-Fenster verlängern, ZNS entlasten." };
    A06 = { status: "LEADING", text: "HRV-Alarm aktiv. Somnus und Path empfehlen Reduktion kognitiver Last." };
    directive = "A.06 Orchestrator: Warnung vor ZNS-Überlastung (HRV niedrig). Reduziere den nächsten Deep Work Block um 30 Min.";
  } else if (lastFriction === 'warn' || lastFriction === 'miss') {
    leader = "A.05";
    A05 = { status: "ALERT", text: "Friction-Log signalisiert erhöhten Widerstand im Fokus-Block!" };
    A04 = { status: "ACTIVE", text: "Ggf. L-Theanin Dosis erhöhen, um Koffein-Spitzen zu glätten." };
    A06 = { status: "LEADING", text: "Ablauf-Reibung detektiert. Friction-Agent übernimmt Führung." };
    directive = "A.06 Orchestrator: Erhöhte Reibung erfasst. A.05 Friction rät zu einer kurzen 10-minütigen Atemübung (Box Breathing).";
  } else if (sleep < 70) {
    leader = "A.02";
    A02 = { status: "ALERT", text: `Schlechter Schlafwert (${sleep}%). ZNS-Regeneration unvollständig.` };
    A01 = { status: "ACTIVE", text: "Tagesstruktur anpassen, früheres Schlaf-Window forcieren." };
    A06 = { status: "LEADING", text: "Schlafdefizit erfasst. Somnus empfiehlt verringerte Reizdichte." };
    directive = "A.06 Orchestrator: Schlafdefizit detektiert. A.02 Somnus rät, blaues Licht ab sofort zu meiden und Magnesiumglycinat auf 600mg zu erhöhen.";
  }

  return {
    leader,
    directive,
    agentStatuses: {
      "A.01": A01,
      "A.02": A02,
      "A.03": A03,
      "A.04": A04,
      "A.05": A05,
      "A.06": A06
    }
  };
};

export async function POST(req) {
  try {
    const { hrv, sleep, frictionLogs = [], activeBlock = 'Focus' } = await req.json();

    const apiKey = process.env.MISTRAL_API_KEY;

    if (!apiKey || apiKey === 'REPLACE_ME') {
      const fallback = LOCAL_CONSENSUS_FALLBACK(hrv, sleep, frictionLogs);
      return NextResponse.json(fallback);
    }

    const lastFrictionStr = frictionLogs.length > 0 
      ? `Kürzliche Reibung: ${frictionLogs.slice(0, 3).map(l => `${l.ts}: ${l.status} (${l.blockTitle})`).join(', ')}`
      : 'Keine kürzliche Reibung.';

    const systemPrompt = `Du bist A.06 Orchestrator, der Consensus-Broker des Pronoia Life OS.
Deine Aufgabe ist es, die Stimmen der 6 kognitiven Sub-Agenten zu koordinieren:
- A.01 Chronos (Circadian Alignment)
- A.02 Somnus (Sleep & Recovery)
- A.03 Path (Biometric HRV Interpreter)
- A.04 Stack (Supplementation Optimizer)
- A.05 Friction (Task Friction Analyst)
- A.06 Orchestrator (Leader & Consensus Broker)

Basierend auf den Werten des Nutzers:
- HRV: ${hrv} ms
- Schlaf: ${sleep} %
- Friction-Logs: ${lastFrictionStr}
- Aktiver Block: ${activeBlock}

Simuliere eine kurze Diskussion der Agenten und gib den finalen Status jedes Agenten sowie die zusammenfassende System-Direktive aus.
Die Tonalität soll extrem präzise, kühl, klinisch und lösungsorientiert sein (Pronoia Labs Aura).

Antworte STRENG im folgenden JSON-Format:
{
  "leader": "A.01" | "A.02" | "A.03" | "A.04" | "A.05" | "A.06",
  "directive": "Eindeutige Handlungsanweisung von A.06 Orchestrator (z. B. 'A.06 Orchestrator: HRV niedrig. Somnus empfiehlt 10 Min NSDR und Reduktion des kognitiven Blocks.')",
  "agentStatuses": {
    "A.01": { "status": "ACTIVE" | "LEADING" | "ALERT", "text": "Statusbeschreibung von A.01" },
    "A.02": { "status": "ACTIVE" | "LEADING" | "ALERT", "text": "Statusbeschreibung von A.02" },
    "A.03": { "status": "ACTIVE" | "LEADING" | "ALERT", "text": "Statusbeschreibung von A.03" },
    "A.04": { "status": "ACTIVE" | "LEADING" | "ALERT", "text": "Statusbeschreibung von A.04" },
    "A.05": { "status": "ACTIVE" | "LEADING" | "ALERT", "text": "Statusbeschreibung von A.05" },
    "A.06": { "status": "ACTIVE" | "LEADING" | "ALERT", "text": "Statusbeschreibung von A.06" }
  }
}`;

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'mistral-large-latest',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Berechne den aktuellen Konsens und die Direktive.' }
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      console.warn("Mistral API failed for consensus, using fallback");
      const fallback = LOCAL_CONSENSUS_FALLBACK(hrv, sleep, frictionLogs);
      return NextResponse.json(fallback);
    }

    const data = await response.json();
    const parsed = JSON.parse(data.choices?.[0]?.message?.content);
    return NextResponse.json(parsed);

  } catch (error) {
    console.error('Consensus API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
