/**
 * SkillLab
 * Pronoia R&D & Skill Acquisition Module
 * Manages the generation and display of deliberate practice materials.
 */
import { MistralService } from './mistral_service.js';

export class SkillLab {
  constructor(agent) {
    this.agent = agent;
    this.modalId = 'skill-lab-modal';
    this.contentId = 'skill-content';
    this.titleId = 'skill-title';
    this.badgeId = 'skill-level-badge';
  }

  /**
   * Main entry point to generate and show skill materials
   */
  async generate() {
    const skill = this.agent.profile.skill || 'Allgemeine Produktivität';
    const level = this.agent.profile.skillLevel || 1;
    
    const modal = document.getElementById(this.modalId);
    if (!modal) {
      if (this.agent.triggerToast) {
        this.agent.triggerToast('System Fehler', 'Skill Lab UI nicht gefunden.', true, null);
      }
      return;
    }
    
    modal.style.display = 'flex';
    
    const titleEl = document.getElementById(this.titleId);
    const badgeEl = document.getElementById(this.badgeId);
    const contentEl = document.getElementById(this.contentId);
    
    if (titleEl) titleEl.textContent = `${skill} Lab`;
    if (badgeEl) badgeEl.textContent = `Lvl ${level}`;
    
    if (contentEl) {
      contentEl.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:3rem; gap: 1rem;">
          <div class="agent-thinking-spinner"></div>
          <p style="text-align:center; color:var(--text3); font-size:.8rem; font-family: var(--font-mono);">
            GENERATING_NEURAL_PATHWAYS...<br>
            <span style="opacity: 0.5;">Analysiere Skill: ${skill} (Lvl ${level})</span>
          </p>
        </div>
      `;
    }

    const prompt = `User lernt "${skill}" auf Level ${level}/10. 
    Erstelle 3 personalisierte Lernmaterialien für eine Deliberate Practice Session:
    1. Ein Theorie-Modul (Arbeitsblatt/Konzept)
    2. Ein Video-Link (Platzhalter YouTube)
    3. Eine spezifische praktische Übung, die den aktuellen Schwierigkeitsgrad herausfordert.
    
    Antworte in einem strukturierten HTML Format mit Icons. Sei motivierend und präzise. 
    WICHTIG: Nutze CSS Klassen wie 'ctx-card' und 'dim' für das Styling.`;

    try {
      // Use the global MistralService module
      const res = await MistralService.chat(prompt, "Du bist der Skill Lab Coach. Antworte in klarem, motivierendem Deutsch. Gib nur valides HTML zurück, keine Markdown Blocks.");
      
      const cleanHtml = MistralService.cleanHTML(res);
      
      if (contentEl) {
        // Simple sanitization to prevent breaking the UI if AI returns garbage
        if (cleanHtml.length < 20) throw new Error("AI response too short/empty");
        contentEl.innerHTML = cleanHtml;
        
        // Add a "Complete Session" button at the end to award XP
        const completeBtn = document.createElement('button');
        completeBtn.className = 'auth-btn';
        completeBtn.style.marginTop = '2rem';
        completeBtn.style.width = '100%';
        completeBtn.textContent = 'Session Abschließen (+150 XP)';
        completeBtn.onclick = () => this.completeSession(150);
        contentEl.appendChild(completeBtn);
      }
    } catch (e) {
      console.error("[SkillLab] Error:", e);
      if (contentEl) {
        contentEl.innerHTML = `
          <div class="ctx-card" style="border:1px solid var(--red); color:var(--red); padding: 2rem; text-align: center;">
            <div style="font-size: 2rem; margin-bottom: 1rem;">⚠️</div>
            <div style="font-weight: 600; margin-bottom: 0.5rem;">Sync Error</div>
            <div style="font-size: 0.8rem; opacity: 0.8;">Materialien konnten nicht generiert werden. Bitte Internetverbindung prüfen oder Offline-Modus nutzen.</div>
            <button class="auth-btn" style="margin-top: 1.5rem; background: var(--bg-card); border-color: var(--red); color: var(--red);" onclick="Agent.skillLab.generate()">Erneut versuchen</button>
          </div>
        `;
      }
    }
  }

  /**
   * Award XP and update profile
   * @param {number} xp 
   */
  completeSession(xp) {
    if (!this.agent.profile) return;
    
    this.agent.profile.xp = (this.agent.profile.xp || 0) + xp;
    
    // Level up logic (simple)
    if (this.agent.profile.xp >= this.agent.profile.nextLevelXp) {
        this.agent.profile.xp -= this.agent.profile.nextLevelXp;
        this.agent.profile.skillLevel++;
        this.agent.profile.nextLevelXp = Math.round(this.agent.profile.nextLevelXp * 1.5);
        if (this.agent.triggerToast) {
          this.agent.triggerToast('LEVEL UP', `${this.agent.profile.skill} jetzt auf Lvl ${this.agent.profile.skillLevel}!`, false, null);
        }
    } else {
        if (this.agent.triggerToast) {
          this.agent.triggerToast('Progress', `+${xp} XP verdient. Weiter so!`, false, null);
        }
    }
    
    localStorage.setItem('px_profile', JSON.stringify(this.agent.profile));
    
    // Refresh UI
    if (this.agent.renderUI) this.agent.renderUI();
    
    // Close modal
    const modal = document.getElementById(this.modalId);
    if (modal) modal.style.display = 'none';
  }
}
