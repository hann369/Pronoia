/**
 * MistralService
 * Pronoia AI Orchestration Engine
 * Handles communication with AI providers (via Groq/Mistral API)
 * with robust fallbacks for offline and file:// environments.
 */
export class MistralService {
  /**
   * Chat with the AI
   * @param {string} prompt - The user prompt
   * @param {string} systemPrompt - The system context/directive
   * @returns {Promise<string>} - The AI response or fallback content
   */
  static async chat(prompt, systemPrompt = "You are the Pronoia Agent. Precise, imperative, proactive.") {
    // Check for file protocol which blocks cross-origin fetch in many browsers
    if (location.protocol === 'file:') {
      console.warn("[MistralService] Running via file:// protocol. Remote API calls are disabled by browser security. Using fallback.");
      return this.getFallback(prompt);
    }

    try {
      const response = await fetch('/api/groq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, systemPrompt })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        console.warn("Mistral API returned", response.status, errData.error || 'Unknown error');
        return this.getFallback(prompt);
      }

      const data = await response.json();

      if (data.error) {
        const errMsg = typeof data.error === 'string' ? data.error : (data.error.message || 'API Error');
        console.warn("Mistral API Error:", errMsg);
        return this.getFallback(prompt);
      }

      if (!data.choices || !data.choices[0]) {
        console.warn("Groq: No choices in response");
        return this.getFallback(prompt);
      }

      return data.choices[0].message.content;
    } catch (err) {
      console.warn("MistralService network error:", err.message);
      return this.getFallback(prompt);
    }
  }

  /**
   * Generate a directive based on context
   * @param {string} prompt 
   * @param {string} context 
   */
  static async generateDirective(prompt, context = "GENERAL") {
    const systemPrompt = `You are the Pronoia Agent [Context: ${context}]. Precise, imperative, scientific. Format output as beautiful HTML chunks with modern technical aesthetics.`;
    return this.chat(prompt, systemPrompt);
  }

  /**
   * Fallback logic for offline/local environments
   * @param {string} prompt 
   * @returns {string}
   */
  static getFallback(prompt) {
    const p = prompt.toLowerCase();
    
    // Skill Lab Fallback
    if (p.includes('skill') || p.includes('deliberate practice') || p.includes('theorie-modul')) {
      return `
        <div class="ctx-card" style="border: 1px solid var(--border-s); padding: 1.5rem; margin-bottom: 1rem; border-radius: 4px; background: var(--bg-card);">
          <h3 style="font-family: var(--font-display); color: var(--cobalt-bright); margin-bottom: 0.5rem; font-size: 1.2rem;">[OFFLINE MODE] Skill Lab</h3>
          <p style="color: var(--text2); font-size: 0.85rem; margin-bottom: 1.5rem;">AI Sync aktuell eingeschränkt. Nutze lokales Framework für Deliberate Practice.</p>
          
          <div style="background: var(--bg-card); padding: 1rem; border-radius: 4px; margin-bottom: 1rem; border: 1px solid var(--border);">
            <strong style="color:var(--text); font-size: 0.9rem;">1. Isolation</strong><br>
            <span class="dim" style="font-size:0.85rem;">Identifiziere die kleinste ausführbare Komponente deiner Ziel-Fähigkeit. Trainiere nur diese für 20 Minuten.</span>
          </div>
          
          <div style="background: var(--bg-card); padding: 1rem; border-radius: 4px; margin-bottom: 1rem; border: 1px solid var(--border);">
            <strong style="color:var(--text); font-size: 0.9rem;">2. Feedback Loop</strong><br>
            <span class="dim" style="font-size:0.85rem;">Suche Referenz-Material (Video/Text). Vergleiche deine Ausführung sofort mit dem Ideal. Korrigiere Abweichungen.</span>
          </div>
          
          <div style="background: var(--bg-card); padding: 1rem; border-radius: 4px; border: 1px solid var(--cobalt-dim);">
            <strong style="color:var(--cobalt-bright); font-size: 0.9rem;">3. High Intensity</strong><br>
            <span class="dim" style="font-size:0.85rem;">Vermeide Flow. Bleibe am Rand deiner Kapazität. Fehler sind das Ziel, nicht die Vermeidung.</span>
          </div>
        </div>`;
    }

    // Protocol Fallbacks
    if (p.includes('prüfung') || p.includes('exam') || p.includes('fokus') || p.includes('focus'))
      return "Fokus-Modus aktiviert. Alle nicht-essentiellen Blöcke verschoben.";
    
    if (p.includes('recovery') || p.includes('müde') || p.includes('tired'))
      return "Recovery-Modus. Reduzierte kognitive Last empfohlen.";
    
    if (p.includes('json') || p.includes('protokoll'))
      return '{"blocks":[{"title":"Deep Work","duration":5400,"type":"Focus","pillar":"focus","rec":"Fokus halten.","insight":"Ultradian Peak."}]}';
    
    if (p.includes('transition') || p.includes('block'))
      return "Block-Übergang. Kurze Pause empfohlen. Hydration prüfen.";

    return "Systemstatus stabil. Nächster Block bereit.";
  }

  /**
   * Helper to clean AI response (remove markdown blocks)
   * @param {string} str 
   */
  static cleanHTML(str) {
    return str.replace(/```html|```/g, '').trim();
  }
}
