import { PROTOCOL_DATABASE } from './protocol_data.js';
import { MistralService } from './mistral_service.js';
import { ProtocolUI } from './protocol_ui.js';
import { Telemetry } from './telemetry.js';
import { StackManager } from './stack_manager.js';
import { SkillLab } from './labs.js';

export class PronoiaAgent {
  constructor() {
    this.skillLab = new SkillLab(this);
    this.blocks = [];
    this.blockIdx = 0;
    this.timeLeft = 0;
    this.totalTime = 0;
    this.isRunning = false;
    this.interval = null;
    this.timeOffset = parseFloat(localStorage.getItem('px_time_offset')) || 0;
    this.pauseStartTime = localStorage.getItem('px_pause_start_time') ? parseInt(localStorage.getItem('px_pause_start_time')) : null;
    
    this.profile = JSON.parse(localStorage.getItem('px_profile')) || { goals: '', metrics: { hrv: 0, sleep: 0 }, skill: '', skillLevel: 1, xp: 0, nextLevelXp: 1000 };
    this.stack = JSON.parse(localStorage.getItem('px_stack')) || [];
    StackManager.init(this.stack);
    
    this.calendar = JSON.parse(localStorage.getItem('px_calendar')) || {};
    this.directives = [];
    this.sources = [];
    this.env = JSON.parse(localStorage.getItem('px_env')) || { city: 'Unknown', temp: '--', weatherDesc: '--', sun: '--', time: '--' };
    
    this.currentMonth = new Date();
    this.selectedDate = new Date();
    this.focusMode = false;
    this.notified50 = false;
    this.notified5m = false;

    this.init();
  }

  async init() {
    await this.loadState();
    this.syncTimerToRealTime();
    this.calculateReadinessScore();
  }

  syncTimerToRealTime() {
    if (this.blocks.length === 0) return;
    
    const now = new Date();
    const currentSeconds = (now.getHours() * 3600) + (now.getMinutes() * 60) + now.getSeconds();
    
    let activeIdx = -1;
    let found = false;

    for (let i = 0; i < this.blocks.length; i++) {
        const b = this.blocks[i];
        if (!b.startTime) continue;
        
        const [h, m] = b.startTime.split(':').map(Number);
        const startSec = (h * 3600) + (m * 60);
        const endSec = startSec + b.duration;

        if (currentSeconds >= startSec && currentSeconds < endSec) {
            activeIdx = i;
            this.blockIdx = i;
            this.timeLeft = Math.round(endSec - currentSeconds);
            this.totalTime = b.duration;
            found = true;
            break;
        }
    }

    if (!found) {
        for (let i = 0; i < this.blocks.length; i++) {
            const b = this.blocks[i];
            const [h, m] = b.startTime.split(':').map(Number);
            const startSec = (h * 3600) + (m * 60);
            if (startSec > currentSeconds) {
                this.blockIdx = i;
                this.timeLeft = b.duration;
                this.totalTime = b.duration;
                break;
            }
        }
    }

    if (this.pauseStartTime && !this.isRunning) {
        const savedTimeLeft = parseInt(localStorage.getItem('px_time_left'));
        if (!isNaN(savedTimeLeft)) this.timeLeft = savedTimeLeft;
    }
  }

  // --- Logic Methods ---

  start() {
    if (this.blockIdx >= this.blocks.length) return;
    if (this.pauseStartTime) {
      const pausedDuration = (Date.now() - this.pauseStartTime) / 1000;
      this.timeOffset += pausedDuration;
      this.pauseStartTime = null;
      localStorage.setItem('px_time_offset', this.timeOffset);
      localStorage.removeItem('px_pause_start_time');
    }
    this.isRunning = true;
    ProtocolUI.setAgentMsg("Protokoll aktiv. Fokus halten.");
    if (this.interval) clearInterval(this.interval);
    this.interval = setInterval(() => this.tick(), 1000);
    this.renderUI();
  }

  pause() {
    this.isRunning = false;
    clearInterval(this.interval);
    this.pauseStartTime = Date.now();
    localStorage.setItem('px_pause_start_time', this.pauseStartTime);
    localStorage.setItem('px_time_left', this.timeLeft);
    ProtocolUI.setAgentMsg("Protokoll pausiert. Zeit-Offset akkumuliert.");
    this.renderUI();
  }

  toggleTimer() {
    this.isRunning ? this.pause() : this.start();
  }

  resetSync() {
    this.isRunning = false;
    this.pauseStartTime = null;
    this.timeOffset = 0;
    localStorage.removeItem('px_time_offset');
    localStorage.removeItem('px_pause_start_time');
    clearInterval(this.interval);
    this.syncTimerToRealTime();
    this.renderUI();
    ProtocolUI.triggerToast('Sync', 'Echtzeit-Synchronisation wiederhergestellt.', false);
  }

  tick() {
    if (!this.isRunning) return;
    this.timeLeft--;
    if (this.timeLeft <= 0) { this.completeBlock(); return; }
    
    localStorage.setItem('px_time_left', this.timeLeft);
    ProtocolUI.updateDisplay(this);
    
    const prog = 1 - this.timeLeft / this.totalTime;
    if (prog >= 0.5 && !this.notified50) {
      this.notified50 = true;
      ProtocolUI.triggerToast('50% Erreicht', 'Block-Halbzeit. Fokus stabil.', false);
    }
    if (this.timeLeft === 300 && !this.notified5m) {
      this.notified5m = true;
      ProtocolUI.triggerToast('5 Minuten', 'Bereite Transition vor.', false);
    }
    
    const cur = this.blocks[this.blockIdx];
    if (cur) {
      const pillar = cur.pillar || 'focus';
      let cog = 20, sns = 30;
      if (pillar === 'focus' || pillar === 'skills') {
        cog = 40 + (prog * 50); sns = 60 + (prog * 20);
      } else if (pillar === 'recovery') {
        cog = Math.max(10, 80 - (prog * 60)); sns = Math.max(10, 50 - (prog * 40));
      }
      Telemetry.updateIntelligence(cog, sns, 80); // Placeholder hydration
    }
  }

  completeBlock(manual = false) {
    this.pause();
    const current = this.blocks[this.blockIdx];
    if (current) {
      current.done = true;
      this.awardXP(current);
      
      const overlay = document.getElementById('reflection-overlay');
      if (overlay) {
        document.getElementById('refl-title').textContent = `Phase: ${current.title}`;
        overlay.style.display = 'flex';
      }
    }
    this.playTransitionCue();
    this.syncState();
  }

  awardXP(block) {
    const baseXP = Math.round(block.duration / 60);
    const multiplier = block.pillar === 'skills' ? 2 : 1;
    this.profile.xp += baseXP * multiplier;
    this.checkLevelUp();
    localStorage.setItem('px_profile', JSON.stringify(this.profile));
  }

  checkLevelUp() {
    if (this.profile.xp >= this.profile.nextLevelXp) {
      this.profile.xp -= this.profile.nextLevelXp;
      this.profile.skillLevel++;
      this.profile.nextLevelXp = Math.round(this.profile.nextLevelXp * 1.2);
      ProtocolUI.showLevelUp(this.profile.skillLevel);
    }
  }

  finishBlockRefl() {
    document.getElementById('reflection-overlay').style.display = 'none';
    this.blockIdx++;
    this.notified50 = false; this.notified5m = false;
    
    if (this.blockIdx < this.blocks.length) {
      this.timeLeft = this.blocks[this.blockIdx].duration;
      this.totalTime = this.timeLeft;
      this.renderUI();
      ProtocolUI.triggerToast('Next Block', this.blocks[this.blockIdx].title, true, () => this.start());
    } else {
      ProtocolUI.triggerToast('Finish', 'Tagesprotokoll abgeschlossen.', false);
    }
    this.syncState();
  }

  // --- External Integrations ---

  async handleCommand(raw) {
    const cmd = raw.toLowerCase().trim();
    ProtocolUI.setAgentMsg(`Verarbeite: "${raw}"…`, true);

    const isBasic = /pause|stop|weiter|resume|start|los|status|überspringen|skip|next|done/.test(cmd);
    if (!isBasic) {
      const response = await MistralService.chat(raw, `User Command: "${raw}". Handle concisely.`);
      ProtocolUI.setAgentMsg(response);
      return;
    }

    if (/pause|stop/.test(cmd)) this.pause();
    else if (/weiter|resume|start/.test(cmd)) this.start();
    else if (/skip|next/.test(cmd)) this.skipBlock();
    else if (/done|fertig/.test(cmd)) this.completeBlock(true);
  }

  skipBlock() {
    this.completeBlock(true);
    ProtocolUI.setAgentMsg("Block übersprungen.");
  }

  async generateDirective(type, input = "") {
    const prompt = `Type: ${type}. Context: ${JSON.stringify(this.profile)}. Tasks: 15 words max directive.`;
    const text = await MistralService.chat(prompt, "Du bist der Pronoia Intelligence Engine.");
    this.directives.unshift({ text, type, ts: new Date().toLocaleTimeString() });
    if (this.directives.length > 3) this.directives.pop();
    this.renderUI();
  }

  consumeStack(idx) {
    const item = StackManager.consume(idx);
    if (item) {
      this.stack = StackManager.stack;
      this.renderUI();
      ProtocolUI.triggerToast('Logged', `${item.name} konsumiert.`);
      this.syncProfile();
    }
  }

  calculateReadinessScore() {
    return Telemetry.calculateReadiness(this.profile.metrics, this.profile.energy);
  }

  // --- Data Persistence ---

  async syncState() {
    if (window.firebase && firebase.auth().currentUser) {
      const uid = firebase.auth().currentUser.uid;
      await firebase.firestore().collection('users').doc(uid).set({
        blockIdx: this.blockIdx,
        timeLeft: this.timeLeft,
        directives: this.directives,
        profile: this.profile,
        stack: this.stack
      }, { merge: true });
    }
    localStorage.setItem('px_block_idx', this.blockIdx);
    localStorage.setItem('px_time_left', this.timeLeft);
  }

  async loadState() {
    if (window.firebase && firebase.auth().currentUser) {
        const uid = firebase.auth().currentUser.uid;
        const doc = await firebase.firestore().collection('users').doc(uid).get();
        if (doc.exists) {
            const data = doc.data();
            this.blockIdx = data.blockIdx || 0;
            this.directives = data.directives || [];
        }
    }
  }

  // --- Calendar & Profile ---

  renderCalendar() {
    const el = document.getElementById('calendar-grid');
    const my = document.getElementById('calendar-month-year');
    if (!el || !my) return;
    el.innerHTML = '';
    
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    const months = ["JANUAR", "FEBRUAR", "MÄRZ", "APRIL", "MAI", "JUNI", "JULI", "AUGUST", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DEZEMBER"];
    my.textContent = `${months[month]} ${year}`;

    const first = new Date(year, month, 1).getDay();
    const days = new Date(year, month + 1, 0).getDate();
    const start = first === 0 ? 6 : first - 1;

    for (let i = 0; i < start; i++) el.innerHTML += `<div class="calendar-day empty"></div>`;
    for (let d = 1; d <= days; d++) {
      const dateStr = `${d.toString().padStart(2,'0')}.${(month+1).toString().padStart(2,'0')}.${year}`;
      const hasProto = !!this.calendar[dateStr];
      const isToday = new Date().toDateString() === new Date(year, month, d).toDateString();
      const div = document.createElement('div');
      div.className = `calendar-day ${hasProto ? 'has-protocol' : ''} ${isToday ? 'today' : ''}`;
      div.innerHTML = `<span>${d}</span>`;
      div.onclick = () => this.showDayDetail(dateStr);
      el.appendChild(div);
    }
  }

  showDayDetail(date) {
    this.selectedDate = date;
    const detail = document.getElementById('day-detail');
    const label = document.getElementById('detail-date');
    const protoEl = document.getElementById('detail-protocol');
    if (!detail || !label || !protoEl) return;
    
    detail.style.display = 'flex';
    label.textContent = date;
    const dayData = this.calendar[date] || [];
    
    if (dayData.length === 0) {
      protoEl.innerHTML = `<div style="text-align:center; padding:2rem; opacity:0.5; font-size:.7rem;">Kein Protokoll für diesen Tag.<br>Nutze AI Sync für Optimierung.</div>`;
    } else {
      protoEl.innerHTML = dayData.map((b, i) => `
        <div class="q-row" style="padding:.5rem; border-bottom:1px solid var(--border); font-size:.7rem;">
          <span style="color:var(--text3); width:35px;">${b.startTime || '--:--'}</span>
          <span style="flex:1; font-weight:600;">${b.title}</span>
          <span class="dim">${Math.round(b.duration/60)}m</span>
        </div>
      `).join('');
    }
  }

  prevMonth() { this.currentMonth.setMonth(this.currentMonth.getMonth() - 1); this.renderCalendar(); }
  nextMonth() { this.currentMonth.setMonth(this.currentMonth.getMonth() + 1); this.renderCalendar(); }

  async generateDayAI() {
    if (!this.selectedDate) return;
    ProtocolUI.setAgentMsg("Analysiere Zirkadiane Rhythmik für " + this.selectedDate + "...", true);
    const prompt = `Generiere ein optimales Tagesprotokoll für den ${this.selectedDate}. Berücksichtige: Goals: ${this.profile.goals}. Metrics: HRV ${this.profile.metrics.hrv}. Gib NUR ein JSON Array von Blöcken zurück.`;
    const resp = await MistralService.chat(prompt, "Du bist der Pronoia Intelligence Engine. Output NUR JSON.");
    try {
      const clean = MistralService.cleanHTML(resp);
      const blocks = JSON.parse(clean);
      this.calendar[this.selectedDate] = blocks;
      localStorage.setItem('px_calendar', JSON.stringify(this.calendar));
      this.showDayDetail(this.selectedDate);
      this.renderCalendar();
      ProtocolUI.setAgentMsg("Protokoll für " + this.selectedDate + " erstellt.");
    } catch(e) {
      ProtocolUI.setAgentMsg("Fehler bei AI Generierung.");
    }
  }

  syncToActive() {
    const dayData = this.calendar[this.selectedDate];
    if (!dayData || dayData.length === 0) return;
    this.blocks = dayData;
    this.blockIdx = 0;
    this.timeLeft = this.blocks[0].duration;
    this.totalTime = this.timeLeft;
    localStorage.setItem('px_blocks', JSON.stringify(this.blocks));
    this.syncState();
    this.renderUI();
    ProtocolUI.triggerToast('Sync', 'Protokoll vom ' + this.selectedDate + ' aktiviert.', false);
  }

  saveProfile() {
    this.profile.goals = document.getElementById('profile-goals').value;
    this.profile.metrics.hrv = parseInt(document.getElementById('metric-hrv').value) || 0;
    this.profile.metrics.sleep = parseInt(document.getElementById('metric-sleep').value) || 0;
    this.profile.skill = document.getElementById('profile-skill').value;
    this.profile.skillLevel = parseInt(document.getElementById('profile-skill-level').value) || 1;
    localStorage.setItem('px_profile', JSON.stringify(this.profile));
    ProtocolUI.triggerToast('Profil', 'Daten synchronisiert.', false);
  }

  getBioAdaptiveTemplate() {
    const hrv = this.profile.metrics.hrv || 0;
    const sleep = this.profile.metrics.sleep || 0;
    if (hrv < 40 || sleep < 6) return PROTOCOL_DATABASE.emergency_recovery;
    if (this.profile.training === 'hit') return PROTOCOL_DATABASE.physical_training;
    return PROTOCOL_DATABASE.focus_optimization;
  }

  loadProtocol(blocks) {
    this.blocks = JSON.parse(JSON.stringify(blocks));
    this.blockIdx = 0;
    this.timeLeft = this.blocks[0].duration;
    this.totalTime = this.timeLeft;
    localStorage.setItem('px_blocks', JSON.stringify(this.blocks));
    this.renderUI();
  }

  setFocusMode() {
    this.focusMode = !this.focusMode;
    document.body.classList.toggle('focus-active', this.focusMode);
    ProtocolUI.triggerToast('Focus Mode', this.focusMode ? 'Aktiviert. Alle Ablenkungen blockiert.' : 'Deaktiviert.', false);
  }

  async getEnvironment() {
    // Placeholder for weather/location logic
    this.env.time = new Date().toLocaleTimeString();
    localStorage.setItem('px_env', JSON.stringify(this.env));
    this.renderUI();
  }

  // --- UI Bridge ---
  renderUI() { ProtocolUI.renderUI(this); }
  formatTime(s) { return ProtocolUI.formatTime ? ProtocolUI.formatTime(s) : `${Math.floor(s/60)}:${s%60}`; }
  
  playTransitionCue() {
    try {
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(432, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 0.5);
    } catch(e) {}
  }

  generateSkillMaterials() {
    if (this.skillLab) this.skillLab.generate();
  }
}
