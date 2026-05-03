
    // ── SERVICES & CONFIG ──────────────────────────
    const FIREBASE_CONFIG = {
      apiKey: "AIzaSyDFu_w-MmLJRdiOOZoLii8-SQBN9FUtG60",
      authDomain: "noodrop-c9be9.firebaseapp.com",
      projectId: "noodrop-c9be9",
      storageBucket: "noodrop-c9be9.firebasestorage.app",
      messagingSenderId: "903301545011",
      appId: "1:903301545011:web:84a6c4ba643a9b255d7746"
    };

    // Initialize Firebase (Compat)
    firebase.initializeApp(FIREBASE_CONFIG);

    /* ── SYSTEM STABILIZER ──────────────────────────── */
    window.addEventListener('error', function(e) {
      if (e.filename && e.filename.includes('contentscript.js')) return true; // Ignore extensions
      if (e.message && (e.message.includes('SES_UNCAUGHT_EXCEPTION') || e.message.includes('lockdown-install.js'))) return true;
      if (e.message && e.message.includes('illegal string') && e.lineno <= 1) return true;
      return false;
    }, true);

    class MistralService {
      static async chat(prompt, systemPrompt = "You are the Pronoia Agent. Precise, imperative, proactive.") {
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

      static async generateDirective(prompt, context = "GENERAL") {
        const systemPrompt = `You are the Pronoia Agent [Context: ${context}]. Precise, imperative, scientific. Format output as beautiful HTML chunks with modern technical aesthetics.`;
        return this.chat(prompt, systemPrompt);
      }

      static getFallback(prompt) {
        const p = prompt.toLowerCase();
        if (p.includes('prüfung') || p.includes('exam') || p.includes('fokus') || p.includes('focus'))
          return "Fokus-Modus aktiviert. Alle nicht-essentiellen Blöcke verschoben.";
        if (p.includes('recovery') || p.includes('müde') || p.includes('tired'))
          return "Recovery-Modus. Reduzierte kognitive Last empfohlen.";
        if (p.includes('json') || p.includes('protokoll'))
          return '{"blocks":[{"title":"Deep Work","duration":5400,"type":"Focus","pillar":"focus","rec":"Fokus halten.","insight":"Ultradian Peak."}]}';
        if (p.includes('transition') || p.includes('block'))
          return "Block-Übergang. Kurze Pause empfohlen. Hydration prüfen.";
        if (p.includes('deliberate practice') || p.includes('theorie-modul'))
          return `
            <div class="ctx-card" style="border: 1px solid var(--border-s); padding: 1.5rem; margin-bottom: 1rem; border-radius: 4px;">
              <h3 style="font-family: var(--font-display); color: var(--cobalt-bright); margin-bottom: 0.5rem; font-size: 1.2rem;">[OFFLINE MODE] Skill Lab</h3>
              <p style="color: var(--text2); font-size: 0.85rem; margin-bottom: 1.5rem;">API nicht erreichbar. Generiere lokales Fallback-Modul für Deliberate Practice.</p>
              <div style="background: var(--bg-card); padding: 1rem; border-radius: 4px; margin-bottom: 1rem; border: 1px solid var(--border);">
                <strong style="color:var(--text); font-size: 0.9rem;">1. Theorie (Fundamentals)</strong><br>
                <span class="dim" style="font-size:0.85rem;">Zerlege die Ziel-Fähigkeit in 3 Kernkomponenten. Fokussiere dich heute ausschließlich auf die schwächste davon. Erkenne Muster in Fehlern.</span>
              </div>
              <div style="background: var(--bg-card); padding: 1rem; border-radius: 4px; margin-bottom: 1rem; border: 1px solid var(--border);">
                <strong style="color:var(--text); font-size: 0.9rem;">2. Media Integration</strong><br>
                <span class="dim" style="font-size:0.85rem;">Suche auf YouTube nach "Beginner Guide Fundamentals" für deinen Skill. Schaue maximal 10 Minuten. Keine Endlosschleife.</span>
              </div>
              <div style="background: var(--bg-card); padding: 1rem; border-radius: 4px; border: 1px solid var(--cobalt-dim);">
                <strong style="color:var(--cobalt-bright); font-size: 0.9rem;">3. Praxis</strong><br>
                <span class="dim" style="font-size:0.85rem;">Stelle einen Timer auf 20 Minuten. Führe die isolierte Kernkomponente ununterbrochen aus. Keine Ablenkung. Bei Fehlern: Sofort anhalten, analysieren und korrigieren.</span>
              </div>
            </div>`;
        return "Systemstatus stabil. Nächster Block bereit.";
      }
    }

    /* ═══════════════════════════════════════════════════
       PRONOIA AGENT CORE v2
    ═══════════════════════════════════════════════════ */

    // ── PROTOCOL TEMPLATES ─────────────────────────────
    const PROTOCOL_TEMPLATES = {
      optimal_deepwork: [
        {
          title: 'Morning Stack', duration: 5 * 60, type: 'Health', pillar: 'health',
          rec: 'Creatine 5g + Taurine 2g + Glycine 3g. Elektrolyte. Hydration vor dem ersten Block.',
          insight: 'Creatine maximiert ATP-Pool für die kommenden Fokusblöcke.'
        },
        {
          title: 'Deep Work I', duration: 90 * 60, type: 'Focus', pillar: 'focus',
          rec: 'Schließe Kommunikations-Apps. Ein Primary Task. Kein Context-Switch.',
          insight: 'Ultradian Peak I — optimales 90-Minuten-Fenster beginnt jetzt.'
        },
        {
          title: 'Metabolic Break', duration: 20 * 60, type: 'Health', pillar: 'health',
          rec: 'Draußen gehen. Kein Screen. Hydration. Sonnenlicht wenn möglich.',
          insight: 'Ultradian Rest — Adenosin-Clearance und SNS-Deaktivierung.'
        },
        {
          title: 'Deep Work II', duration: 90 * 60, type: 'Focus', pillar: 'focus',
          rec: 'Bromantane Mittagsdosis (50mg) bereits aktiv. Kontinuation oder neuer Task.',
          insight: 'Bromantane Tag 3/5 — Tyrosinhydroxylase läuft auf Hochtouren.'
        },
        {
          title: 'Skill Session', duration: 45 * 60, type: 'Skills', pillar: 'skills',
          rec: 'Deliberate Practice. Saxophon, Zeichnen, Portugiesisch — wähle eine Disziplin.',
          insight: 'Myelinisierung erfordert wiederholte, fehlerkorrigierte Ausführung.'
        },
        {
          title: 'Lunch & Social', duration: 45 * 60, type: 'Social', pillar: 'social',
          rec: 'Proteinreiche Mahlzeit. Parasympathische Aktivierung. Echter sozialer Kontakt.',
          insight: 'Vagotonus-Aktivierung nach hoher SNS-Last stärkt HRV.'
        },
        {
          title: 'Evening Stack + Wind-Down', duration: 15 * 60, type: 'Health', pillar: 'health',
          rec: 'Mg-Glycinate 400mg. D3/K2/Omega-3 falls nicht morgens genommen. Kein Screen 30 min.',
          insight: 'Magnesium senkt Cortisol-Spiegel für tiefere Schlafphasen.'
        }
      ],
      tired_balanced: [
        {
          title: 'Morning Stack (light)', duration: 5 * 60, type: 'Health', pillar: 'health',
          rec: 'Stack wie gewohnt, aber kein Bromantane heute (Recovery-Tag).',
          insight: 'Bei Schlafdefizit: Adenosin-System nicht forcieren.'
        },
        {
          title: 'Light Focus Block', duration: 50 * 60, type: 'Focus', pillar: 'focus',
          rec: 'Nur administrative Tasks. Keine kreativen Primäraufgaben. E-Mails, Planung.',
          insight: 'Reduzierte kognitive Last schont Präfrontalkortex.'
        },
        {
          title: 'Outdoor Movement', duration: 30 * 60, type: 'Health', pillar: 'health',
          rec: 'Spaziergang. Frische Luft. Zirkadiane Synchronisation durch Tageslicht.',
          insight: 'Bewegung im Freien hebt BDNF und verbessert Abendsschlaf.'
        },
        {
          title: 'Skill (low intensity)', duration: 30 * 60, type: 'Skills', pillar: 'skills',
          rec: 'Passives Lernen — Lesen, Podcast, keine aktive Performance-Session.',
          insight: 'Konsolidierung bestehenden Wissens ist bei Müdigkeit effektiver.'
        },
        {
          title: 'Early Evening Recovery', duration: 20 * 60, type: 'Health', pillar: 'health',
          rec: 'Atemübungen. Vagale Aktivierung. Leinentextur nach optionalem Kältereiz.',
          insight: 'PNS-Dominanz vor Schlafsetzung erhöht Schlaftiefe signifikant.'
        },
        {
          title: 'Evening Stack + Early Sleep', duration: 10 * 60, type: 'Health', pillar: 'health',
          rec: 'Mg-Glycinate 400mg. Schlafziel: 30 min früher als üblich.',
          insight: 'Schlaf-Debt kann nur durch frühere Schlafenszeit abgetragen werden.'
        }
      ],
      physical_training: [
        {
          title: 'Morning Stack + Pre-Training', duration: 10 * 60, type: 'Health', pillar: 'health',
          rec: 'Standard Morning Stack. 20–30 min warten, dann Training beginnen.',
          insight: 'Creatine + Taurine maximieren Muskelleistung und reduzieren Oxidativstress.'
        },
        {
          title: 'Training Block (HIT)', duration: 60 * 60, type: 'Physical', pillar: 'health',
          rec: 'Mike Mentzer HIT-Prinzip: maximale Intensität, volle Ausführung, kein Cheat.',
          insight: 'Hohe mechanische Spannung + metabolischer Stress = optimaler Reiz.'
        },
        {
          title: 'Post-Training Recovery', duration: 20 * 60, type: 'Health', pillar: 'health',
          rec: 'Proteinmahlzeit innerhalb 45 min. Aleppo-Seife. Leinenkleidung für vagale Abkühlung.',
          insight: 'Parasympathische Aktivierung nach Training beschleunigt Muskelsynthese.'
        },
        {
          title: 'Deep Work I', duration: 90 * 60, type: 'Focus', pillar: 'focus',
          rec: 'Post-Training Fokus-Fenster: Dopamin nach physischer Aktivität ist erhöht.',
          insight: 'Bromantane + natürliche post-Training Dopaminerhöhung synergistisch.'
        },
        {
          title: 'Skill Session', duration: 45 * 60, type: 'Skills', pillar: 'skills',
          rec: 'Deliberate Practice in gewählter Disziplin.',
          insight: 'Neuro-plastische Fenster nach körperlichem Training besonders offen.'
        },
        {
          title: 'Evening Stack', duration: 10 * 60, type: 'Health', pillar: 'health',
          rec: 'Mg-Glycinate 400mg kritisch nach Krafttraining. Cortisol-Regulation.',
          insight: 'Mg erhöht GH-Ausschüttung in SWS-Phasen — essenziell für Muskelregeneration.'
        }
      ],
      evening_wind_down: [
        { title: 'Sunset Walk', duration: 25 * 60, type: 'Health', pillar: 'health', rec: 'Niedrige Intensität. Kein Handy.', insight: 'Senkt Cortisol.' },
        { title: 'Light Review', duration: 20 * 60, type: 'Focus', pillar: 'focus', rec: 'Journaling. Planung für Morgen.', insight: 'Schließt offene Loops im Gehirn.' },
        { title: 'Evening Stack', duration: 10 * 60, type: 'Health', pillar: 'health', rec: 'Mg-Glycinate 400mg.', insight: 'Fördert SWS-Schlaf.' }
      ],
      night_recovery: [
        { title: 'Digital Detox', duration: 30 * 60, type: 'Recovery', pillar: 'recovery', rec: 'Kein blaues Licht. Kerzenlicht oder Rotlicht.', insight: 'Melatonin-Synthese beginnt.' },
        { title: 'Mobility / Stretching', duration: 15 * 60, type: 'Health', pillar: 'health', rec: 'Sanftes Dehnen.', insight: 'PNS-Aktivierung.' },
        { title: 'Sleep Initiation', duration: 10 * 60, type: 'Recovery', pillar: 'recovery', rec: 'Kühles Zimmer (18°C). Dunkelheit.', insight: 'Optimale Thermoregulation.' }
      ]
    };

    // ── AGENT CORE ────────────────────────────────────
    class PronoiaAgent {
      constructor() {
        this.pillarColors = {
          focus: '#1A6AFF',
          health: '#00C48C',
          skills: '#F5A623',
          social: '#FF4D4D',
          recovery: '#00A3FF',
        };
        this.defaultStack = [
          { name: 'Creatine Monohydrate', dose: '5g', timing: 'morning', supply: 100 },
          { name: 'Taurine', dose: '2g', timing: 'morning', supply: 100 },
          { name: 'Magnesium Glycinate', dose: '400mg', timing: 'evening', supply: 100 },
        ];
        
        this.timeLeft = 0;
        this.totalTime = 0;
        this.isRunning = false;
        this.focusMode = false;
        this.interval = null;
        this.notified50 = false;
        this.notified5m = false;
        this.sessionID = '';
        this.log = [];
        this.obState = { goals: '', hrv: 0, sleep: 0, energy: 7, mood: 'focused', caffeine: 'none', training: 'none' };
        this.directives = [];
        this.profile = { 
          goals: '', 
          skill: '', 
          skillLevel: 1, 
          xp: 0,
          nextLevelXp: 1000,
          metrics: { hrv: 0, sleep: 0 }, 
          location: '', 
          energy: 7, 
          mood: 'focused' 
        };
        this.env = { city: 'Unknown', temp: '--', sun: '--', time: '--', lat: null, lon: null };
        this.stack = JSON.parse(localStorage.getItem('px_stack')) || this.defaultStack;

        // Calendar state
        this.currentMonth = new Date();
        this.selectedDate = new Date();
        this.calendar = JSON.parse(localStorage.getItem('px_calendar')) || {}; // { "YYYY-MM-DD": { blocks: [...] } }

        this.sessionID = localStorage.getItem('px_session') || '';
        this.profile = JSON.parse(localStorage.getItem('px_profile')) || this.profile;
        this.env = JSON.parse(localStorage.getItem('px_env')) || this.env;
        this.sources = [];
        this.blocks = []; // Initialize blocks to prevent undefined errors in syncTimerToRealTime

        this.startClock();
        this.getEnvironment(); // Fetch weather on init
      }

      startClock() {
        setInterval(() => {
          const now = new Date();
          const timeStr = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          const headerClock = document.getElementById('header-clock');
          if (headerClock) headerClock.textContent = timeStr;
          
          this.env.time = timeStr;
          const envTimeEl = document.querySelector('#env-context div:last-child');
          if (envTimeEl && envTimeEl.textContent.includes('System Time')) {
            envTimeEl.textContent = `System Time: ${timeStr}`;
          }

          // Sync work blocks with real-time clock even if timer is paused
          if (!this.isRunning) {
            this.syncTimerToRealTime();
            this.updateDisplay();
            // Only re-render if block changed to avoid flicker
            if (this._lastSyncedIdx !== this.blockIdx) {
              this._lastSyncedIdx = this.blockIdx;
              this.renderUI();
            }
          }
        }, 1000);
      }

      // ── UTILITIES ────────────────────────────────────
      repairAndParseJSON(str) {
        let cleaned = str.replace(/```json|```/g, '').trim();
        try { return JSON.parse(cleaned); } catch(e) {}
        
        // Try common trailing truncations
        const closures = [
          '"]}', '"}', ']', '}', 
          '""}]}}', '""}]}', '"]}}', '"}}', '}}',
          '}]}', '}]}}', '"}]}', '"}]}}'
        ];
        
        for (let c of closures) {
          try { return JSON.parse(cleaned + c); } catch(e) {}
        }
        
        // If it still fails, try to strip everything after the last valid "}" and close the array/object
        try {
          const lastValidBrace = cleaned.lastIndexOf('}');
          if (lastValidBrace > 0) {
             const stripped = cleaned.substring(0, lastValidBrace + 1);
             return JSON.parse(stripped + ']}'); // For DayAI structure
          }
        } catch(e) {}
        
        throw new Error("JSON could not be repaired: " + str.substring(0, 50) + "...");
      }

      // ── DATA INGESTION ─────────────────────────────
      ingestFiles(files) {
        if (!files || files.length === 0) return;
        
        Array.from(files).forEach(file => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const content = e.target.result;
            this.sources.push({
              id: Math.random().toString(36).substr(2, 9),
              name: file.name,
              type: file.type || 'text/plain',
              size: file.size,
              content: content
            });
            this.renderSources();
            this.setAgentMsg(`QUELLE INHALIERT: ${file.name.toUpperCase()}`);
            this.generateDirective(`Neuer Kontext durch Datei: ${file.name}. Analysiere Auswirkungen auf das Protokoll.`);
          };
          
          if (file.type.match('image.*')) {
            // Future: Image analysis
            this.setAgentMsg(`BILD-DATEN ERKANNT. OCR-MODUL NOCH NICHT AKTIV.`);
          } else {
            reader.readAsText(file);
          }
        });
      }

      renderSources() {
        const list = document.getElementById('sources-list');
        if (!list) return;
        list.innerHTML = '';
        this.sources.forEach(src => {
          const chip = document.createElement('div');
          chip.className = 'source-chip';
          chip.innerHTML = `
            <span>${src.name}</span>
            <span class="remove" onclick="Agent.removeSource('${src.id}')">&times;</span>
          `;
          list.appendChild(chip);
        });
      }

      removeSource(id) {
        this.sources = this.sources.filter(s => s.id !== id);
        this.renderSources();
        this.setAgentMsg("DATENQUELLE ENTFERNT.");
      }

      // ── CALENDAR LOGIC ─────────────────────────────
      renderCalendar() {
        const grid = document.getElementById('calendar-grid');
        const monthTitle = document.getElementById('calendar-month-year');
        if (!grid || !monthTitle) return;

        grid.innerHTML = '';
        const year = this.currentMonth.getFullYear();
        const month = this.currentMonth.getMonth();
        
        const monthNames = ["JANUAR", "FEBRUAR", "MÄRZ", "APRIL", "MAI", "JUNI", "JULI", "AUGUST", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DEZEMBER"];
        monthTitle.textContent = `${monthNames[month]} ${year}`;

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        
        // Adjust for Monday start (JS 0=Sun, 1=Mon)
        let startIdx = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
        
        // Previous month padding
        const prevLastDay = new Date(year, month, 0).getDate();
        for (let i = startIdx - 1; i >= 0; i--) {
          const div = document.createElement('div');
          div.className = 'cal-day other-month';
          div.textContent = prevLastDay - i;
          grid.appendChild(div);
        }

        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        // Current month days
        for (let d = 1; d <= lastDay.getDate(); d++) {
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const div = document.createElement('div');
          div.className = 'cal-day';
          if (dateStr === todayStr) div.classList.add('today');
          if (this.calendar[dateStr]) div.classList.add('has-protocol');
          if (dateStr === this.formatDate(this.selectedDate)) div.classList.add('active');
          
          div.textContent = d;
          // Show summary if blocks exist
          if (this.calendar[dateStr] && this.calendar[dateStr].blocks) {
            const sum = document.createElement('div');
            sum.className = 'dim';
            sum.style.fontSize = '0.5rem';
            sum.style.marginTop = '0.2rem';
            sum.textContent = this.calendar[dateStr].blocks.length + ' Blöcke';
            div.appendChild(sum);
          }

          div.onclick = () => this.selectDay(new Date(year, month, d));
          grid.appendChild(div);
        }

        // Next month padding
        const totalCells = grid.children.length;
        const nextPadding = 42 - totalCells;
        for (let i = 1; i <= nextPadding; i++) {
          const div = document.createElement('div');
          div.className = 'cal-day other-month';
          div.textContent = i;
          grid.appendChild(div);
        }
      }

      formatDate(d) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }

      selectDay(date) {
        this.selectedDate = date;
        this.renderCalendar();
        this.renderDayDetail();
      }

      renderDayDetail() {
        const detail = document.getElementById('day-detail');
        const dateEl = document.getElementById('detail-date');
        const protoEl = document.getElementById('detail-protocol');
        if (!detail || !dateEl || !protoEl) return;

        const dateStr = this.formatDate(this.selectedDate);
        dateEl.textContent = this.selectedDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
        detail.style.display = 'flex';

        const data = this.calendar[dateStr];
        if (!data || !data.blocks || data.blocks.length === 0) {
          protoEl.innerHTML = '<div class="mono dim" style="font-size:.65rem; padding:1rem 0;">Kein Protokoll für diesen Tag.</div>';
          return;
        }

        protoEl.innerHTML = data.blocks.map((b, idx) => `
          <div class="detail-block" style="border-left-color: ${this.pillarColors[b.pillar] || 'var(--cobalt-bright)'}; position: relative; padding-right: 3rem;">
            <div>
              <div style="font-weight:500;">${b.title}</div>
              <div class="dim" style="font-size:.6rem;">${b.rec}</div>
            </div>
            <div class="detail-block-time">${b.startTime || '--:--'}</div>
            <div style="position: absolute; right: .5rem; top: .5rem; display: flex; gap: .25rem;">
              <button onclick="Agent.editBlock('${dateStr}', ${idx})" style="background:transparent; border:none; color:var(--text2); cursor:pointer; font-size:.8rem;">✎</button>
              <button onclick="Agent.deleteBlock('${dateStr}', ${idx})" style="background:transparent; border:none; color:var(--text2); cursor:pointer; font-size:.8rem;">✕</button>
            </div>
          </div>
        `).join('');
      }

      deleteBlock(dateStr, idx) {
        if (!this.calendar[dateStr] || !this.calendar[dateStr].blocks) return;
        this.calendar[dateStr].blocks.splice(idx, 1);
        localStorage.setItem('px_calendar', JSON.stringify(this.calendar));
        this.renderCalendar();
        this.renderDayDetail();
      }

      editBlock(dateStr, idx) {
        if (!this.calendar[dateStr] || !this.calendar[dateStr].blocks) return;
        const b = this.calendar[dateStr].blocks[idx];
        const newTitle = prompt("Neuer Titel:", b.title);
        const newTime = prompt("Neue Startzeit (HH:MM):", b.startTime || "");
        if (newTitle !== null) b.title = newTitle;
        if (newTime !== null) b.startTime = newTime;
        localStorage.setItem('px_calendar', JSON.stringify(this.calendar));
        this.renderCalendar();
        this.renderDayDetail();
      }

      addCalendarBlock() {
        const dateStr = this.formatDate(this.selectedDate);
        if (!this.calendar[dateStr]) this.calendar[dateStr] = { blocks: [] };
        const newTitle = prompt("Titel:", "Neuer Block");
        if (!newTitle) return;
        const newTime = prompt("Startzeit (HH:MM):", "12:00");
        this.calendar[dateStr].blocks.push({
          title: newTitle,
          startTime: newTime || "--:--",
          duration: 3600,
          pillar: "focus",
          rec: "",
          insight: ""
        });
        this.calendar[dateStr].blocks.sort((a,b) => (a.startTime||"").localeCompare(b.startTime||""));
        localStorage.setItem('px_calendar', JSON.stringify(this.calendar));
        this.renderCalendar();
        this.renderDayDetail();
      }

      async chatWithDayAI() {
        const input = document.getElementById('day-chat-input');
        if(!input || !input.value.trim()) return;
        const msg = input.value.trim();
        const dateStr = this.formatDate(this.selectedDate);
        
        input.value = '';
        this.triggerToast('AI Sync', 'Passe Plan an...', false, null);
        document.getElementById('agent-thinking').style.display = 'flex';
        
        const currentPlan = this.calendar[dateStr] ? JSON.stringify(this.calendar[dateStr].blocks) : "[]";
        
        const prompt = `
          Date: ${dateStr}
          Goals: ${this.profile.goals || 'Maximale Produktivität und Gesundheit'}
          Current Plan: ${currentPlan}
          User Instruction: "${msg}"
          Task: Passe den Tagesplan an die User Instruction an. Formatiere den GESAMTEN neuen Tagesplan als JSON.
          Format: { "blocks": [ {"title":"...","startTime":"HH:MM","duration":3600,"pillar":"focus","rec":"","insight":""} ] }
          WICHTIG: Halte "rec" und "insight" extrem kurz ("" falls möglich).
        `;
        
        try {
          const res = await MistralService.chat(prompt, "Du bist der Pronoia Engine. Gib NUR valides JSON zurück.");
          const data = this.repairAndParseJSON(res);
          this.calendar[dateStr] = data;
          localStorage.setItem('px_calendar', JSON.stringify(this.calendar));
          this.renderCalendar();
          this.renderDayDetail();
          this.triggerToast('Erfolg', 'Plan erfolgreich angepasst.', false, null);
        } catch(e) {
          console.error("Day Chat AI Error", e);
          this.triggerToast('Fehler', 'AI konnte Plan nicht anpassen.', true, null);
        } finally {
          document.getElementById('agent-thinking').style.display = 'none';
        }
      }

      nextMonth() {
        this.currentMonth.setMonth(this.currentMonth.getMonth() + 1);
        this.renderCalendar();
      }

      syncToActive() {
        const dateStr = this.formatDate(new Date());
        if (!this.calendar[dateStr]) {
          this.triggerToast('System', 'Kein Protokoll für heute im Kalender.', false, null);
          return;
        }
        this.blocks = JSON.parse(JSON.stringify(this.calendar[dateStr].blocks)).map((b, i) => ({ ...b, id: i + 1, done: b.done || false }));
        this.syncTimerToRealTime();
        this.renderUI();
        this.triggerToast('Sync', 'Kalender erfolgreich mit aktivem Protokoll synchronisiert.', false, null);
      }

      async generateSkillMaterials() {
        const cur = this.blocks[this.blockIdx];
        if (!cur || cur.pillar !== 'skills') return;

        this.setAgentMsg("Generiere adaptive Lernmaterialien…", true);
        document.getElementById('agent-thinking').style.display = 'flex';

        const prompt = `
          Skill: ${this.profile.skill || cur.title}
          Level: ${this.profile.skillLevel}
          Task: Erstelle Lernmaterialien für Deliberate Practice.
          WICHTIG: Das Material muss EXAKT dem Level entsprechen. Level 1 ist für absolute Anfänger, höhere Level für Fortgeschrittene.
          Struktur: 
          1. "Objective": Was heute gelernt wird.
          2. "Drills": 3 konkrete Übungen.
          3. "Resources": 2 YouTube-Link-Titel (keine echten URLs nötig, nur Beschreibungen).
          Gib die Antwort als HTML-Snippet zurück.
        `;

        try {
          const res = await MistralService.chat(prompt, "Du bist der Skill Lab Coach. Antworte in klarem, motivierendem Deutsch.");
          this.showSkillModal(res);
        } catch (e) {
          console.error("Skill Lab Error", e);
          this.setAgentMsg("Skill Lab offline. Bitte später versuchen.");
        } finally {
          document.getElementById('agent-thinking').style.display = 'none';
        }
      }

      showSkillModal(content) {
        let modal = document.getElementById('skill-lab-modal');
        if (!modal) {
          modal = document.createElement('div');
          modal.id = 'skill-lab-modal';
          modal.className = 'onboarding-overlay'; // Reuse onboarding styles for glass effect
          modal.style.display = 'none';
          modal.innerHTML = `
            <div class="onboarding-card" style="max-width: 600px;">
              <div class="ob-label">Agentic Skill Lab — Level ${this.profile.skillLevel}</div>
              <h1 class="ob-h">Deliberate Practice</h1>
              <div id="skill-content" class="ob-sub" style="text-align: left; margin-bottom: 2rem;"></div>
              <button class="ob-next" onclick="document.getElementById('skill-lab-modal').style.display='none'">Lab schließen</button>
            </div>
          `;
          document.body.appendChild(modal);
        }
        document.getElementById('skill-content').innerHTML = content;
        modal.style.display = 'flex';
      }

      prevMonth() {
        this.currentMonth.setMonth(this.currentMonth.getMonth() - 1);
        this.renderCalendar();
      }

      async generateDayAI() {
        const dateStr = this.formatDate(this.selectedDate);
        this.triggerToast('AI Sync', `Generiere Plan für ${dateStr}…`, false, null);
        
        const prompt = `
          Date: ${dateStr}
          Goals: ${this.profile.goals || 'Maximale Produktivität und Gesundheit'}
          Task: Generiere ein agentic Protokoll für den GESAMTEN Tag als JSON. 
          Plane 5-7 Blöcke von morgens (z.B. 07:00) bis abends.
          Nutze die Goals als Basis für die Aufgaben. 
          Format: { "blocks": [ { "title": "Deep Work", "startTime": "08:00", "duration": 5400, "pillar": "focus", "rec": "...", "insight": "..." } ] }
        `;

        const res = await MistralService.chat(prompt, "Du bist der Pronoia Engine. Gib NUR valides JSON zurück.");
        try {
          const data = this.repairAndParseJSON(res);
          this.calendar[dateStr] = data;
          localStorage.setItem('px_calendar', JSON.stringify(this.calendar));
          this.renderCalendar();
          this.renderDayDetail();
          this.triggerToast('Erfolg', 'Plan erfolgreich synchronisiert.', false, null);
        } catch (e) {
          console.error("Failed to parse AI response", e);
          this.triggerToast('Fehler', 'AI-Generierung fehlgeschlagen.', true, null);
        }
      }

      async generateMonthAI() {
        this.triggerToast('AI Sync', 'Generiere Pläne für fehlende Tage...', false, null);
        document.getElementById('agent-thinking').style.display = 'flex';
        
        const year = this.currentMonth.getFullYear();
        const month = this.currentMonth.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const missingDays = [];
        
        for (let i = 1; i <= daysInMonth; i++) {
          const d = new Date(year, month, i);
          const dateStr = this.formatDate(d);
          // don't generate for past days if we don't want to, but for now just missing days
          if (!this.calendar[dateStr]) {
            missingDays.push(dateStr);
          }
        }

        if (missingDays.length === 0) {
          this.triggerToast('System', 'Alle Tage haben bereits einen Plan.', false, null);
          document.getElementById('agent-thinking').style.display = 'none';
          return;
        }

        const chunk = missingDays.slice(0, 2); // generate 2 days at a time to prevent token limits
        const prompt = `
          Dates to generate: ${chunk.join(', ')}
          Goals: ${this.profile.goals || 'Maximale Produktivität und Gesundheit'}
          Task: Generiere ein agentic Protokoll für JEDEN dieser Tage.
          Plane für jeden Tag 5-7 Blöcke von morgens bis abends, passend zu den Goals.
          Format: JSON-Object mapping Datum zu Tagesplan. 
          Bsp: { "${chunk[0]}": { "blocks": [ {"title":"Deep Work","startTime":"08:00","duration":5400,"pillar":"focus","rec":"...","insight":"..."} ] } }
        `;

        try {
          const res = await MistralService.chat(prompt, "Du bist der Pronoia Engine. Gib NUR valides JSON zurück.");
          
          // Use repair JSON logic, but since it's a map of dates, the stripping might fail or we might just use the native object
          // Since generateMonthAI maps { "DATE": { ... } }, if it truncates, repairAndParseJSON might just close it like }}}}
          let data;
          try {
             data = this.repairAndParseJSON(res);
          } catch(e) {
             // For MonthAI, we can try to find valid date objects manually if standard repair fails
             console.warn("Month AI fallback repair");
             data = {};
          }
          
          if(data && typeof data === 'object') {
            for (const dateStr of Object.keys(data)) {
              if(data[dateStr] && data[dateStr].blocks) {
                this.calendar[dateStr] = data[dateStr];
              }
            }
          }
          
          localStorage.setItem('px_calendar', JSON.stringify(this.calendar));
          this.renderCalendar();
          if (this.selectedDate) this.renderDayDetail();
          this.triggerToast('Erfolg', `Pläne für ${Object.keys(data).length} Tage generiert. Klicke nochmal für mehr.`, false, null);
        } catch (e) {
          console.error("Failed to parse AI month response", e);
          this.triggerToast('Fehler', 'AI-Generierung fehlgeschlagen.', true, null);
        }
        
        document.getElementById('agent-thinking').style.display = 'none';
      }

      async getEnvironment() {
        const el = document.getElementById('env-context');
        if (location.protocol === 'file:') {
          console.warn("[Pronoia] Environment Fetch: Detected file:// protocol. Weather/GPS might be restricted.");
        }

        // Try GPS first
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              this.env.lat = pos.coords.latitude;
              this.env.lon = pos.coords.longitude;
              await this.fetchWeather(`${this.env.lat},${this.env.lon}`, el);
            },
            async (err) => {
              // Silence timeout warnings as they are common in local dev
              if (err.code !== 3) console.warn("GPS Access Denied/Error:", err.message);
              await this.fetchWeather("", el); // Fallback to IP
            },
            { timeout: 8000, enableHighAccuracy: false } // Longer timeout, less aggressive accuracy
          );
        } else {
          await this.fetchWeather("", el);
        }
      }

      async fetchWeather(loc, el) {
        try {
          // If we are on file://, fetch might be blocked. Try to handle it.
          const res = await fetch(`https://wttr.in/${loc}?format=j1`).catch(e => {
            throw new Error("Network blocked or CORS issue");
          });
          
          if (!res.ok) throw new Error(`Weather API returned ${res.status}`);
          
          const data = await res.json();
          const cur = data.current_condition[0];
          const ast = data.weather[0].astronomy[0];

          this.env = {
            ...this.env,
            city: data.nearest_area[0].region[0].value || data.nearest_area[0].areaName[0].value,
            temp: cur.temp_C + '°C',
            weatherDesc: cur.weatherDesc[0].value,
            sun: `↑ ${ast.sunrise} · ↓ ${ast.sunset}`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };

          if (el) el.innerHTML = `
            <div>Location: ${this.env.city}</div>
            <div>Weather: ${this.env.weatherDesc}, ${this.env.temp}</div>
            <div>Daylight: ${this.env.sun}</div>
            <div>System Time: ${this.env.time}</div>
          `;
          localStorage.setItem('px_env', JSON.stringify(this.env));
        } catch (err) {
          console.warn("Weather Fetch Handled:", err.message);
          // Set static defaults to avoid "offline" feel
          this.env.city = this.env.city === 'Unknown' ? 'Global' : this.env.city;
          if (el) {
             el.innerHTML = `
               <div class="dim">Location: ${this.env.city} (Cached)</div>
               <div class="dim">Weather: Status Offline</div>
               <div class="dim">Daylight: Sync Pending</div>
               <div>System Time: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
             `;
          }
        }
      }

      async saveProfile() {
        this.profile.goals = document.getElementById('profile-goals').value;
        this.profile.metrics.hrv = parseInt(document.getElementById('metric-hrv').value) || 0;
        this.profile.metrics.sleep = parseInt(document.getElementById('metric-sleep').value) || 0;
        this.profile.skill = document.getElementById('profile-skill').value;
        this.profile.skillLevel = parseInt(document.getElementById('profile-skill-level').value) || this.profile.skillLevel;

        this.calculateReadinessScore();
        localStorage.setItem('px_profile', JSON.stringify(this.profile));
        this.syncProfile();
        this.renderUI();
        this.renderDayDetail(); // Update XP bar in personal tab if needed
        this.triggerToast('Profile Saved', 'Biometrie analysiert und gesichert.', false, null);
        this.generateDirective('PROFILE_UPDATE', 'User hat Metriken aktualisiert. Bereitschaft berechnet.');
      }

      calculateReadinessScore() {
        const hrv = this.profile.metrics.hrv || 60;
        const sleep = this.profile.metrics.sleep || 75;
        const energy = this.profile.energy || 7;
        
        // Simple weighted score
        let score = (hrv * 0.4) + (sleep * 0.4) + (energy * 2);
        this.readiness = Math.min(100, Math.round(score));
        
        const el = document.getElementById('readiness-gauge');
        if (el) {
          el.textContent = this.readiness + '%';
          el.style.color = this.readiness > 70 ? 'var(--green)' : this.readiness > 40 ? 'var(--amber)' : 'var(--red)';
        }
        return this.readiness;
      }

      getBioAdaptiveTemplate() {
        const score = this.calculateReadinessScore();
        const hour = new Date().getHours();
        
        if (score < 45) {
          this.triggerToast('Bio-Alert', 'Niedrige Bereitschaft erkannt. Recovery-Protokoll empfohlen.', true, null);
          return 'evening_wind_down'; // Use a lighter template
        }
        
        if (score > 85 && (hour >= 6 && hour < 12)) {
          this.triggerToast('Performance', 'Hohe Bereitschaft! High-Performance Modus aktiv.', false, null);
          return 'optimal_deepwork';
        }

        return this.getTimeAwareTemplate();
      }

      async syncProfile() {
        if (typeof firebase === 'undefined' || !firebase.auth().currentUser) return;
        
        if (this._syncTimeout) clearTimeout(this._syncTimeout);
        
        this._syncTimeout = setTimeout(async () => {
          const uid = firebase.auth().currentUser.uid;
          console.log("[Pronoia] Syncing Profile & Stack to Firestore...");
          try {
            await firebase.firestore().collection('users').doc(uid).set({
              profile: this.profile,
              stack: this.stack,
              updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            console.log("[Pronoia] Sync Success.");
          } catch (err) {
            console.error("[Pronoia] Sync Error:", err);
            this.triggerToast('Sync Fehler', 'Firestore-Verbindung fehlgeschlagen.', true, null);
          }
        }, 1500);
      }

      // ── AGENT MESSAGING ────────────────────────────
      setAgentMsg(msg, isThinking = false) {
        const el = document.getElementById('agent-msg');
        if (el) el.textContent = msg;
        const loader = document.getElementById('agent-thinking');
        if (loader) loader.style.display = isThinking ? 'flex' : 'none';
      }

      async generatePredictiveProtocol() {
        this.setAgentMsg("Synthetisiere optimalen Tagesablauf…", true);
        document.getElementById('agent-thinking').style.display = 'flex';

        const now = new Date();
        const context = {
          goals: this.obState.goals || this.profile.goals,
          metrics: { hrv: this.obState.hrv || this.profile.metrics.hrv, sleep: this.obState.sleep || this.profile.metrics.sleep },
          env: this.env,
          date: now.toDateString(),
          time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        const prompt = `
          ERSTELLE EIN PRONOIA PROTOKOLL (JSON FORMAT) FÜR HEUTE.
          AKTUELLE UHRZEIT: ${context.time}
          Ziele: ${context.goals}
          Bio-Stack: ${this.stack.map(s => `${s.name} (${s.dose}, ${s.timing})`).join(', ')}
          Subjective Status: Energie ${this.obState.energy}/10, Mood ${this.obState.mood}, Caffeine ${this.obState.caffeine}, Training ${this.obState.training}
          Metrics: HRV ${context.metrics.hrv}, Schlaf ${context.metrics.sleep}
          Umwelt: ${context.env.city}, ${context.env.temp}, ${context.env.sun}
          
          JSON Schema: { "blocks": [ { "title": string, "startTime": "HH:MM", "duration": seconds, "type": string, "pillar": "focus"|"health"|"skills"|"social"|"recovery", "rec": string, "insight": string } ] }
          Regeln: 
          1. 4-6 Blöcke für die RESTLICHE Zeit des Tages. 
          2. STARTZEITEN (startTime) MÜSSEN REALISTISCH SEIN, beginnend ab ca. 5-10 Min nach jetzt (${context.time}).
          3. Integriere Supplemente aus dem Bio-Stack in die Empfehlungen ("rec"), wenn das Timing (morning/evening) passt.
          4. Wenn es nach 20:00 Uhr ist, plane NUR NOCH Recovery/Wind-down.
          5. Nutze Ultradiane Rhythmen (90/20).
          6. Reagiere auf die Stimmung.
        `;

        try {
          const aiResponse = await MistralService.chat(prompt, "Du bist der Pronoia Architect. Antworte NUR mit validem JSON.");
          const cleanJSON = aiResponse.replace(/```json|```/g, '').trim();
          const data = JSON.parse(cleanJSON);

          this.blocks = data.blocks.map((b, i) => ({ ...b, id: i + 1, done: false }));
          this.blockIdx = 0;
          this.timeLeft = this.blocks[0].duration;
          this.totalTime = this.timeLeft;

          this.renderResultBlocks();
          // Persist the profile data captured during onboarding
          localStorage.setItem('px_profile', JSON.stringify(this.profile));
        } catch (err) {
          console.error("AI Protocol Error:", err);
          this.loadProtocol(this.getTimeAwareTemplate());
          this.renderResultBlocks();
          localStorage.setItem('px_profile', JSON.stringify(this.profile));
        }

        document.getElementById('agent-thinking').style.display = 'none';
      }

      renderResultBlocks() {
        const container = document.getElementById('ob3-blocks');
        container.innerHTML = `
          <div id="ob3-list" style="display:flex; flex-direction:column; gap:.5rem;">
            ${this.blocks.map(b => `
              <div style="background:var(--bg-card); padding:.75rem; border:1px solid var(--border-s); border-radius:2px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:.2rem;">
                  <span style="font-family:var(--font-mono); font-size:.55rem; color:var(--cobalt-bright); text-transform:uppercase;">${b.type}</span>
                  <span style="font-family:var(--font-mono); font-size:.55rem; color:var(--text3);">${Math.round(b.duration / 60)}m</span>
                </div>
                <div style="font-size:.78rem; font-weight:500;">${b.title}</div>
              </div>
            `).join('')}
          </div>
          <button class="ob-skip" style="margin-top:1rem; opacity:.6;" onclick="Agent.generatePredictiveProtocol()">Regenerieren (AI)</button>
        `;
      }

      async syncState() {
        if (typeof firebase === 'undefined' || !firebase.auth().currentUser) return;
        const uid = firebase.auth().currentUser.uid;
        try {
          await firebase.firestore().collection('users').doc(uid).set({
            blockIdx: this.blockIdx,
            timeLeft: this.timeLeft,
            obState: this.obState,
            directives: this.directives,
            sources: this.sources || [],
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
        } catch (err) { console.error("Firestore Sync Error:", err); }
      }

      async loadState() {
        if (typeof firebase === 'undefined' || !firebase.auth().currentUser) return;
        const uid = firebase.auth().currentUser.uid;
        console.log("[Pronoia] Loading User Data...");
        const doc = await firebase.firestore().collection('users').doc(uid).get();
        if (doc.exists) {
          const data = doc.data();
          this.blockIdx = data.blockIdx || 0;
          this.obState = data.obState || this.obState;
          this.directives = data.directives || [];
          this.profile = data.profile || this.profile;
          this.stack = data.stack || this.stack;
          
          // Sync UI fields
          if (document.getElementById('profile-goals')) {
            document.getElementById('profile-goals').value = this.profile.goals || '';
            document.getElementById('metric-hrv').value = this.profile.metrics?.hrv || '';
            document.getElementById('metric-sleep').value = this.profile.metrics?.sleep || '';
            document.getElementById('profile-skill').value = this.profile.skill || '';
            document.getElementById('profile-skill-level').value = this.profile.skillLevel || 1;
          }

          // Trigger environment render if we have data
          if (this.env && this.env.city !== 'Unknown') {
            const el = document.getElementById('env-context');
            if (el) el.innerHTML = `
              <div>Location: ${this.env.city}</div>
              <div>Weather: ${this.env.weatherDesc || '--'}, ${this.env.temp}</div>
              <div>Daylight: ${this.env.sun}</div>
              <div>System Time: ${this.env.time}</div>
            `;
          }

          // Only load protocol if not already loaded
          if (this.blocks.length === 0) {
            const savedBlocks = localStorage.getItem('px_blocks');
            if (savedBlocks) {
                this.blocks = JSON.parse(savedBlocks);
            } else {
                this.loadProtocol(this.getBioAdaptiveTemplate());
            }
          }
          
          this.sources = data.sources || [];

          this.calculateReadinessScore();
          this.renderUI();
        }
      }

      async generateDirective(type, inputContext = "") {
        let sourceContext = "";
        if (this.sources && this.sources.length > 0) {
          sourceContext = "EXTERNAL DATA SOURCES:\n" + this.sources.map(s => `[FILE: ${s.name}]\n${s.content.substring(0, 1000)}`).join("\n---\n");
        }

        const prompt = `
        Type: ${type}
        Context: ${JSON.stringify(this.obState)}
        Profile: ${JSON.stringify(this.profile)}
        Current Block: ${this.blocks[this.blockIdx]?.title || 'None'}
        User Input: ${inputContext}
        
        ${sourceContext}
        
        Task: Gib eine kurze, vorausschauende Directive (max 15 Wörter). 
        Sei der Agent, der weiß was der User braucht bevor er es weiß. Nutze die Daten (HRV, Mood, Energy, Externe Quellen) für präzise Empfehlungen.
      `;
        const directive = await MistralService.chat(prompt, "Du bist der Pronoia Intelligence Engine. Deine Directives sind präzise, klinisch und vorausschauend.");
        this.directives.unshift({ text: directive, type: type, ts: new Date().toLocaleTimeString() });
        if (this.directives.length > 3) this.directives.pop();
        this.renderDirectives();
        this.syncState();
      }

      renderDirectives() {
        const feed = document.getElementById('directives-feed');
        const list = document.getElementById('directives-list');
        if (!feed || !list) return;
        if (this.directives.length === 0) {
          feed.style.display = 'none';
          return;
        }
        feed.style.display = 'block';
        list.innerHTML = this.directives.map((d, i) => `
        <div class="directive-item ${i === 0 ? 'new' : ''}">
          <span class="directive-tag">${d.type} · ${d.ts}</span>
          ${d.text}
        </div>
      `).join('');
      }

      renderStack() {
        const el = document.getElementById('stack-list');
        if (!el) return;
        el.innerHTML = '';
        const showRepl = this.stack.some(s => (s.supply || 100) < 20);
        if (document.getElementById('repl-alert')) {
          document.getElementById('repl-alert').style.display = showRepl ? 'flex' : 'none';
        }

        this.stack.forEach((s, idx) => {
          const supply = s.supply || 100;
          const supplyColor = supply < 20 ? 'supply-low' : supply < 40 ? 'supply-warn' : 'supply-ok';
          const timingLabel = s.timing === 'morning' ? 'Morgens' : s.timing === 'evening' ? 'Abends' : 'Zyklus';
          const timingColor = s.timing === 'morning' ? 'rgba(0,196,140,.12);color:var(--green)'
            : s.timing === 'evening' ? 'rgba(0,163,255,.12);color:var(--cobalt-bright)'
              : 'rgba(245,166,35,.12);color:var(--amber)';
          
          el.innerHTML += `
          <div class="stack-card">
            <div class="stack-card-row">
              <span class="stack-name">${s.name}</span>
              <span class="stack-dose">${s.dose}</span>
            </div>
            <div class="stack-card-row">
              <span class="stack-timing" style="background:${timingColor}">${timingLabel}</span>
            </div>
            <div class="stack-bar"><div class="stack-bar-fill" style="width:${supply}%"></div></div>
            <div class="stack-supply">
              <span class="${supplyColor}">${supply}% verbleibend</span>
              <span class="dim">${Math.round(supply * .3)} Tage</span>
            </div>
          </div>`;
        });
      }

      // ── STACK EDITOR LOGIC ────────────────────────
      openStackEditor() {
        const modal = document.getElementById('stack-editor');
        if (modal) {
          modal.style.display = 'flex';
          this.renderStackEditItems();
        }
      }

      renderStackEditItems() {
        const list = document.getElementById('stack-edit-list');
        if (!list) return;
        list.innerHTML = this.stack.map((s, i) => `
          <div class="stack-item-row">
            <input type="text" class="auth-input" style="padding:.4rem" value="${s.name}" onchange="Agent.updateStackItem(${i}, 'name', this.value)">
            <input type="text" class="auth-input" style="padding:.4rem" value="${s.dose}" onchange="Agent.updateStackItem(${i}, 'dose', this.value)">
            <select class="auth-input" style="padding:.4rem" onchange="Agent.updateStackItem(${i}, 'timing', this.value)">
              <option value="morning" ${s.timing === 'morning' ? 'selected' : ''}>AM</option>
              <option value="evening" ${s.timing === 'evening' ? 'selected' : ''}>PM</option>
              <option value="cycle" ${s.timing === 'cycle' ? 'selected' : ''}>Cycle</option>
            </select>
            <button class="friction-btn f-miss" style="padding:0; border:none; background:none; font-size:1.2rem; cursor:pointer;" onclick="Agent.removeStackItem(${i})">×</button>
          </div>
        `).join('');
      }

      addStackItem() {
        this.stack.push({ name: 'Neues Item', dose: '0mg', timing: 'morning', supply: 100 });
        this.renderStackEditItems();
      }

      updateStackItem(idx, key, val) {
        if (this.stack[idx]) this.stack[idx][key] = val;
      }

      removeStackItem(idx) {
        this.stack.splice(idx, 1);
        this.renderStackEditItems();
      }

      closeStackEditor() {
        const modal = document.getElementById('stack-editor');
        if (modal) modal.style.display = 'none';
        localStorage.setItem('px_stack', JSON.stringify(this.stack));
        this.renderStack();
        this.syncProfile();
      }

      async generateSkillMaterials() {
        const skill = this.profile.skill || 'Allgemeine Produktivität';
        const level = this.profile.skillLevel || 1;
        const modal = document.getElementById('skill-lab-modal');
        if (modal) modal.style.display = 'flex';
        
        document.getElementById('skill-title').textContent = `${skill} Lab`;
        document.getElementById('skill-level-badge').textContent = `Lvl ${level}`;
        document.getElementById('skill-content').innerHTML = `
          <div style="display:flex; justify-content:center; padding:3rem;">
            <div class="agent-thinking-spinner"></div>
          </div>
          <p style="text-align:center; color:var(--text3); font-size:.8rem;">Generiere personalisierte Deliberate Practice Inhalte...</p>
        `;

        const prompt = `User lernt "${skill}" auf Level ${level}/10. 
        Erstelle 3 personalisierte Lernmaterialien für eine Deliberate Practice Session:
        1. Ein Theorie-Modul (Arbeitsblatt/Konzept)
        2. Ein Video-Link (Platzhalter YouTube)
        3. Eine spezifische praktische Übung, die den aktuellen Schwierigkeitsgrad herausfordert.
        
        Antworte in einem strukturierten HTML Format mit Icons. Sei motivierend und präzise.`;

        try {
          const res = await MistralService.generateDirective(prompt, 'SKILL_LAB');
          document.getElementById('skill-content').innerHTML = res;
        } catch (e) {
          document.getElementById('skill-content').innerHTML = `
            <div class="ctx-card" style="border:1px solid var(--red); color:var(--red);">
              Fehler beim Laden der Materialien. Bitte Internetverbindung prüfen.
            </div>
          `;
        }
      }

      getTimeAwareTemplate() {
        const hour = new Date().getHours();
        const mood = this.obState.mood;

        if (hour >= 5 && hour < 10) return mood === 'tired' ? 'tired_balanced' : 'optimal_deepwork';
        if (hour >= 10 && hour < 17) return this.obState.training === 'planned' ? 'physical_training' : 'optimal_deepwork';
        if (hour >= 17 && hour < 21) return 'evening_wind_down';
        if (hour >= 21 || hour < 5) return 'night_recovery';

        return 'optimal_deepwork';
      }

      loadProtocol(templateKey) {
        const dateStr = this.formatDate(new Date());
        let sourceBlocks = [];
        if (this.calendar[dateStr] && this.calendar[dateStr].blocks && this.calendar[dateStr].blocks.length > 0) {
          sourceBlocks = this.calendar[dateStr].blocks;
        } else {
          sourceBlocks = JSON.parse(JSON.stringify(PROTOCOL_TEMPLATES[templateKey] || PROTOCOL_TEMPLATES.optimal_deepwork));
        }
        
        // If template blocks lack startTime, assign them starting from the current hour or a default
        let currentTime = new Date();
        // If we are loading a template, we might want to start from the beginning of the day or from "now"
        // Let's start from the beginning of the current hour for better alignment
        currentTime.setMinutes(0, 0, 0);

        this.blocks = sourceBlocks.map((b, i) => {
          const block = { ...b, id: i + 1, done: false };
          if (!block.startTime) {
            const h = String(currentTime.getHours()).padStart(2, '0');
            const m = String(currentTime.getMinutes()).padStart(2, '0');
            block.startTime = `${h}:${m}`;
            currentTime = new Date(currentTime.getTime() + block.duration * 1000);
          }
          return block;
        });
        
        localStorage.setItem('px_blocks', JSON.stringify(this.blocks));
        this.syncTimerToRealTime();
      }

      syncTimerToRealTime() {
        if (!this.blocks || this.blocks.length === 0) return;

        const now = new Date();
        const nowSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
        
        let foundIdx = -1;
        let foundTimeLeft = 0;
        
        for (let i = 0; i < this.blocks.length; i++) {
          const b = this.blocks[i];
          if (!b.startTime) continue;
          
          const [h, m] = b.startTime.split(':').map(Number);
          const startSeconds = h * 3600 + m * 60;
          const endSeconds = startSeconds + b.duration;
          
          if (nowSeconds >= startSeconds && nowSeconds < endSeconds) {
            foundIdx = i;
            foundTimeLeft = endSeconds - nowSeconds;
            break;
          } else if (nowSeconds < startSeconds) {
            // This is the first upcoming block
            if (foundIdx === -1) {
              foundIdx = i;
              foundTimeLeft = b.duration; // It hasn't started yet
            }
          }
        }
        
        if (foundIdx !== -1) {
          this.blockIdx = foundIdx;
          this.timeLeft = foundTimeLeft;
          this.totalTime = this.blocks[this.blockIdx].duration;
          
          // Mark previous as done
          for (let i = 0; i < foundIdx; i++) {
            this.blocks[i].done = true;
          }
        } else {
          // If past all blocks, show the last one as finished
          this.blockIdx = this.blocks.length > 0 ? this.blocks.length - 1 : 0;
          this.timeLeft = 0;
          this.totalTime = this.blocks.length > 0 ? this.blocks[this.blockIdx].duration : 0;
          if (this.blocks.length > 0) this.blocks.forEach(b => b.done = true);
        }
      }

      start() {
        if (this.blockIdx >= this.blocks.length) return;
        this.isRunning = true;
        document.getElementById('btn-toggle').textContent = 'Pause';
        document.getElementById('btn-toggle').classList.remove('btn-primary');
        document.getElementById('timer-display').classList.remove('paused');
        document.getElementById('timer-sub').textContent = 'Läuft';
        document.getElementById('agent-thinking').style.display = 'flex';
        this.interval = setInterval(() => this.tick(), 1000);
      }

      pause() {
        this.isRunning = false;
        clearInterval(this.interval);
        document.getElementById('btn-toggle').textContent = 'Fortsetzen';
        document.getElementById('btn-toggle').classList.add('btn-primary');
        document.getElementById('timer-display').classList.add('paused');
        document.getElementById('timer-sub').textContent = 'Pausiert';
        document.getElementById('agent-thinking').style.display = 'none';
        localStorage.setItem('px_time_left', this.timeLeft);
        this.setAgentMsg('Block pausiert. Tippe "weiter" oder klicke Fortsetzen.');
      }

      toggleTimer() {
        this.isRunning ? this.pause() : this.start();
      }

      tick() {
        const oldBlockIdx = this.blockIdx;
        this.syncTimerToRealTime();
        
        if (this.blockIdx !== oldBlockIdx) {
            this.renderCenter();
            this.renderQueue();
            this.notified50 = false;
            this.notified5m = false;
            
            // Trigger Skill Lab automatically if it's a skills block
            const current = this.blocks[this.blockIdx];
            if (current && current.pillar === 'skills') {
                this.generateSkillMaterials();
            }
        }

        const current = this.blocks[this.blockIdx];
        if (!current) return;

        if (this.timeLeft <= 0) { this.completeBlock(); return; }
        
        // Timer display relies on this.timeLeft being updated correctly by syncTimerToRealTime.
        localStorage.setItem('px_time_left', this.timeLeft);
        this.updateDisplay();
        this.updateTelemetry(current);

        const prog = 1 - this.timeLeft / this.totalTime;

        // Milestones
        if (prog >= .5 && !this.notified50) {
          this.notified50 = true;
          this.triggerToast('50% Erreicht', 'Kognitive Kapazität stabil. Halbzeit des Blocks.', false, null);
          this.setAgentMsg('50% des Blocks abgeschlossen. Qualität halten.');
        }
        if (this.timeLeft === 300 && !this.notified5m) {
          this.notified5m = true;
          this.triggerToast('5 Minuten', 'Transition einleiten. Aktuellen Task zu Ende bringen.', false, null);
        }
        if (this.timeLeft <= 60) {
          document.getElementById('timer-display').classList.add('ending');
        }
      }

      updateTelemetry(current) {
        const prog = 1 - (this.timeLeft / this.totalTime);
        const pillar = current.pillar || current.type?.toLowerCase() || 'focus';
        
        let targetCog = 20, targetHyd = 100, targetSns = 30, rhythmLabel = 'Peak';
        
        if (pillar === 'focus' || pillar === 'skills') {
          targetCog = 40 + (prog * 50); // cognitive load increases
          targetHyd = 100 - (prog * 15); // hydration decreases slightly
          targetSns = 60 + (prog * 20); // SNS goes up
          rhythmLabel = 'Peak (90m)';
        } else if (pillar === 'recovery' || pillar === 'health') {
          targetCog = Math.max(10, 80 - (prog * 60)); // load decreases
          targetHyd = 100; // hydrate
          targetSns = Math.max(10, 50 - (prog * 40)); // SNS relaxes
          rhythmLabel = 'Rest (20m)';
        } else if (pillar === 'social') {
          targetCog = 30;
          targetSns = 40;
          rhythmLabel = 'Integration';
        }
        
        const barCog = document.getElementById('bar-cog');
        const valCog = document.getElementById('val-cog');
        if (barCog) barCog.style.width = targetCog + '%';
        if (valCog) valCog.textContent = Math.round(targetCog) + '%';
        
        const barHyd = document.getElementById('bar-hyd');
        const valHyd = document.getElementById('val-hyd');
        if (barHyd) barHyd.style.width = targetHyd + '%';
        if (valHyd) valHyd.textContent = Math.round(targetHyd) + '%';
        
        const barSns = document.getElementById('bar-sns');
        const valSns = document.getElementById('val-sns');
        if (barSns) barSns.style.width = targetSns + '%';
        if (valSns) valSns.textContent = Math.round(targetSns) + '%';
        
        const rhythmPhase = document.getElementById('rhythm-phase');
        const rhythmFill = document.getElementById('rhythm-fill');
        const rhythmCursor = document.getElementById('rhythm-cursor');
        if (rhythmPhase) rhythmPhase.textContent = rhythmLabel;
        if (rhythmFill) rhythmFill.style.width = (prog * 100) + '%';
        if (rhythmCursor) rhythmCursor.style.left = (prog * 100) + '%';
      }

      completeBlock(manual = false) {
        this.pause();
        const current = this.blocks[this.blockIdx];
        if (current) {
          current.done = true;
          
          // Award XP
          const baseXP = Math.round(current.duration / 60);
          const multiplier = current.pillar === 'skills' ? 2 : 1;
          const totalXP = baseXP * multiplier;
          this.profile.xp = (this.profile.xp || 0) + totalXP;
          
          this.checkLevelUp();
          this.renderXP(); // Update UI
          
          // Sync back to calendar
          const dateStr = this.formatDate(new Date());
          if (this.calendar[dateStr]) {
            const calBlock = this.calendar[dateStr].blocks.find(b => b.startTime === current.startTime && b.title === current.title);
            if (calBlock) calBlock.done = true;
            localStorage.setItem('px_calendar', JSON.stringify(this.calendar));
          }
          this.triggerToast('XP Gained', `+${totalXP} XP für ${current.title}`, false, null);
        }
        if (!manual) logFriction('ok', true);

        this.playTransitionCue();

        this.blockIdx++;
        localStorage.setItem('px_block_idx', this.blockIdx);
        localStorage.setItem('px_profile', JSON.stringify(this.profile));
        this.notified50 = false; this.notified5m = false;
        document.getElementById('timer-display').classList.remove('ending');

        if (this.blockIdx < this.blocks.length) {
          this.timeLeft = this.blocks[this.blockIdx].duration;
          this.totalTime = this.timeLeft;
          localStorage.setItem('px_time_left', this.timeLeft);
          this.renderUI();
          this.triggerToast('Block Abgeschlossen',
            `Nächster Block: ${this.blocks[this.blockIdx].title}`, true,
            () => this.start());
          this.setAgentMsg(`Block ${this.blockIdx} abgeschlossen. Bereit für: ${this.blocks[this.blockIdx].title}`);
          this.generateDirective('TRANSITION');
          if (this.focusMode) this.setFocusMode(false);
        } else {
          this.renderUI();
          this.triggerToast('Protokoll Abgeschlossen', 'Alle Blöcke für heute. Exzellente Ausführung.', false, null);
          this.setAgentMsg('Heutiges Protokoll vollständig. Frühzeitiger Abend-Stack empfohlen.');
          localStorage.removeItem('px_block_idx');
          localStorage.removeItem('px_time_left');
        }
      }

      checkLevelUp() {
        if (!this.profile.nextLevelXp) this.profile.nextLevelXp = 1000;
        if (this.profile.xp >= this.profile.nextLevelXp) {
          this.profile.xp -= this.profile.nextLevelXp;
          this.profile.skillLevel++;
          this.profile.nextLevelXp = Math.round(this.profile.nextLevelXp * 1.2);
          
          this.triggerToast('LEVEL UP', `Du hast Level ${this.profile.skillLevel} erreicht!`, false, null);
          this.playLevelUpEffect();
        }
      }

      playLevelUpEffect() {
        const overlay = document.createElement('div');
        overlay.style = `
          position: fixed; top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(10,12,18,0.9); backdrop-filter: blur(20px);
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          z-index: 10000; color: white; text-align: center;
        `;
        overlay.innerHTML = `
          <h1 style="font-size: 4rem; font-weight: 900; letter-spacing: .2em; color: var(--cobalt-bright); margin-bottom: 0;">LEVEL UP</h1>
          <p style="font-size: 1.5rem; opacity: .7;">LEVEL ${this.profile.skillLevel} ERREICHT</p>
          <div style="margin-top: 2rem; font-family: 'Mono', monospace; color: var(--green);">SYSTEM-UPGRADE VOLLSTÄNDIG</div>
          <button class="btn-primary" style="margin-top: 3rem; padding: 1rem 3rem;" onclick="this.parentElement.remove()">Fortfahren</button>
        `;
        document.body.appendChild(overlay);
        gsap.from(overlay, { opacity: 0, duration: 1, ease: 'power4.out' });
        gsap.from(overlay.children, { y: 50, opacity: 0, stagger: 0.2, duration: 1, ease: 'power4.out' });
      }

      skipBlock() {
        logFriction('miss', true);
        this.completeBlock(true);
        this.setAgentMsg('Block übersprungen. Protokoll angepasst.');
        this.generateDirective('ADJUSTMENT', 'User hat Block übersprungen.');
      }

      playTransitionCue() {
        try {
          if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          if (ctx.state === 'suspended') ctx.resume();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(432, ctx.currentTime); // 432Hz calming frequency
          osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.5);
          gain.gain.setValueAtTime(0.1, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.5);
        } catch (e) {
          console.warn("Audio/Haptic cue failed", e);
        }
      }

      setFocusMode(state) {
        this.focusMode = state !== undefined ? state : !this.focusMode;
        document.body.classList.toggle('focus-mode', this.focusMode);
        document.getElementById('btn-focus').style.color = this.focusMode ? 'var(--cobalt-bright)' : '';
        this.setAgentMsg(this.focusMode
          ? 'Focus Mode aktiv. Noise unterdrückt. Vollständige Konzentration.'
          : 'Focus Mode deaktiviert. System operational.');
      }

      async handleCommand(raw) {
        const cmd = raw.toLowerCase().trim();
        this.setAgentMsg(`Analysiere Directive: "${raw}"…`);

        // Check for AI-driven intent if not a basic structural command
        const isBasic = /pause|stop|weiter|resume|start|los|status|was|überspringen|skip|next|abschließen|done|fertig/.test(cmd);

        if (!isBasic) {
          // AI Path for complex commands
          document.getElementById('agent-thinking').style.display = 'flex';
          
          // Enhanced context for Mistral
          const aiResponse = await MistralService.chat(raw, `
            User Command: "${raw}"
            Context: Goals=${this.profile.goals}, CalendarSize=${Object.keys(this.calendar).length}
            Task: Handle this command. 
            - If it's a monthly goal (e.g. "50km running this month"), say you're adding it to the plan.
            - If it's a schedule change, explain the adjustment.
            - Keep it to 1 concise sentence.
          `);
          
          this.setAgentMsg(aiResponse);
          document.getElementById('agent-thinking').style.display = 'none';

          // Special Handling: Monthly Goals / Milestones
          if (/monat|month|ziel|milestone/.test(cmd)) {
            this.triggerToast('System Update', 'Monats-Meilenstein erfasst. Integriere in Predictive Engine.', false, null);
            this.profile.goals += " | " + raw;
            this.syncProfile();
            openCalendarModal();
            return;
          }

          if (/fokus|focus|tiefer|konzentration/.test(cmd)) this.setFocusMode(true);
          if (/exit.*focus|normal|ablenkung/.test(cmd)) this.setFocusMode(false);
          if (/recovery|müde|erschöpft/.test(cmd)) {
            this.loadProtocol('tired_balanced');
            this.renderUI();
            this.generateDirective('ADAPTATION', 'User ist erschöpft.');
          }
          if (/lunch|verschieb|später/.test(cmd)) this.shiftBlock('Social');
          return;
        }

        // Structural commands (fast path)
        if (/pause|stop/.test(cmd)) {
          this.pause();
        } else if (/weiter|resume|start|los/.test(cmd)) {
          this.start();
        } else if (/status|info|was/.test(cmd)) {
          const cur = this.blocks[this.blockIdx];
          if (cur) this.setAgentMsg(`Block ${this.blockIdx + 1}/${this.blocks.length}: "${cur.title}" — ${this.formatTime(this.timeLeft)} verbleibend.`);
        } else if (/überspringen|skip|next/.test(cmd)) {
          this.skipBlock();
        } else if (/abschließen|done|fertig/.test(cmd)) {
          this.completeBlock(true);
        }
      }

      shiftBlock(type) {
        const idx = this.blocks.findIndex((b, i) => i > this.blockIdx && b.type === type);
        if (idx < 0) return;
        const [blk] = this.blocks.splice(idx, 1);
        this.blocks.splice(Math.min(this.blockIdx + 2, this.blocks.length), 0, blk);
        this.renderQueue();
      }

      reduceDuration(factor) {
        const next = this.blocks[this.blockIdx + 1];
        if (next) next.duration = Math.floor(next.duration * factor);
        this.renderQueue();
      }

      // ── DISPLAY UPDATE ──────────────────────────────
      updateDisplay() {
        const prog = 1 - this.timeLeft / this.totalTime;
        const circumf = 553;

        // Timer
        document.getElementById('timer-display').textContent = this.formatTime(this.timeLeft);

        // Ring
        document.getElementById('ring-fill').style.strokeDashoffset = circumf * (1 - prog);

        const current = this.blocks[this.blockIdx];
        if (current) this.updateTelemetry(current);
      }

      renderUI() {
        this.renderQueue();
        this.renderCenter();
        this.renderStack();
        this.renderDirectives();
        this.renderXP();
        this.renderSources();
        this.updateDisplay();
      }

      renderXP() {
        const xp = this.profile.xp || 0;
        const next = this.profile.nextLevelXp || 1000;
        const prog = (xp / next) * 100;
        const bar = document.getElementById('xp-bar-fill');
        const display = document.getElementById('xp-display');
        if (bar) bar.style.width = prog + '%';
        if (display) display.textContent = `${xp} / ${next} XP`;
      }

      renderCenter() {
        const cur = this.blocks[this.blockIdx];
        if (!cur) {
          document.getElementById('block-title').textContent = 'Protokoll Abgeschlossen';
          document.getElementById('block-label').textContent = 'Alle Blöcke ausgeführt';
          document.getElementById('btn-toggle').style.display = 'none';
          document.getElementById('btn-complete').style.display = 'none';
          document.getElementById('timer-display').textContent = '00:00';
          return;
        }
        document.getElementById('block-label').textContent =
          `Block ${this.blockIdx + 1} von ${this.blocks.length} · ${cur.type}`;
        document.getElementById('block-title').textContent = cur.title;
        document.getElementById('agent-rec').textContent = cur.rec;
        
        let stackActionHTML = '';
        if ((cur.pillar === 'health' || cur.rec.toLowerCase().includes('stack') || cur.rec.toLowerCase().includes('supplement')) && this.stack.length > 0) {
          stackActionHTML = `
            <div style="margin-top:.75rem; padding-top:.75rem; border-top:1px solid var(--border); display:flex; gap:.5rem; flex-wrap:wrap;">
              ${this.stack.map((s, i) => `
                <button class="btn-add-block" style="margin:0; padding:.3rem .6rem; background:rgba(0,196,140,0.1); border:1px solid rgba(0,196,140,0.3); color:var(--green); font-size:.7rem;" onclick="Agent.consumeStack(${i})">Log ${s.name} (${s.dose})</button>
              `).join('')}
            </div>
          `;
        }
        
        let skillActionHTML = '';
        if (cur.pillar === 'skills') {
          skillActionHTML = `
            <div style="margin-top:.75rem; padding-top:.75rem; border-top:1px solid var(--border);">
              <button class="btn-add-block" style="margin:0; width:auto; padding:.4rem 1rem; background:var(--cobalt-bright); border:none; color:white;" onclick="Agent.generateSkillMaterials()">Open Skill Lab (Level ${this.profile.skillLevel})</button>
            </div>
          `;
        }
        
        document.getElementById('agent-insight').innerHTML = (cur.insight || '') + stackActionHTML + skillActionHTML;
        document.getElementById('timer-display').textContent = this.formatTime(this.timeLeft);
        document.getElementById('timer-display').classList.add('paused');
        document.getElementById('timer-sub').textContent = 'Bereit';

        // Pillar tag
        const color = this.pillarColors[cur.pillar] || 'var(--text2)';
        document.getElementById('pillar-dot').style.background = color;
        document.getElementById('pillar-name').textContent = cur.type || cur.pillar;
        document.getElementById('pillar-tag').style.background = `${color}18`;
        document.getElementById('pillar-tag').style.color = color;
        document.getElementById('pillar-tag').style.border = `1px solid ${color}30`;
      }

      consumeStack(idx) {
        if (!this.stack[idx]) return;
        this.stack[idx].supply = Math.max(0, (this.stack[idx].supply || 100) - 5);
        localStorage.setItem('px_stack', JSON.stringify(this.stack));
        this.syncState();
        this.renderStack();
        this.triggerToast('Bio-Stack Updated', `${this.stack[idx].name} logged. Supply remaining: ${this.stack[idx].supply}%`, false, null);
      }

      renderQueue() {
        const ul = document.getElementById('queue-list');
        ul.innerHTML = '';
        this.blocks.forEach((b, i) => {
          let cls = '';
          if (i < this.blockIdx) cls = 'completed';
          if (i === this.blockIdx) cls = 'active';
          const color = this.pillarColors[b.pillar] || '#555';
          const li = document.createElement('li');
          li.className = `queue-item ${cls}`;
          li.innerHTML = `
          <div class="q-row">
            <span class="q-index">${i + 1}</span>
            <div class="q-pillar-dot" style="background:${color}"></div>
            <span class="q-title">${b.title}</span>
            <span class="q-dur">${Math.round(b.duration / 60)}m</span>
          </div>
          <div class="q-rec">${b.rec}</div>`;
          li.addEventListener('click', () => {
            if (i !== this.blockIdx) {
              this.triggerToast('Block wechseln?', `Zu "${b.title}" springen?`, true, () => {
                this.pause();
                this.blockIdx = i;
                this.timeLeft = b.duration;
                this.totalTime = b.duration;
                this.notified50 = false; this.notified5m = false;
                localStorage.setItem('px_block_idx', i);
                localStorage.setItem('px_time_left', this.timeLeft);
                this.renderUI();
              });
            }
          });
          ul.appendChild(li);
        });
        document.getElementById('queue-count').textContent =
          `${this.blockIdx} / ${this.blocks.length}`;
      }

      // ── TOASTS ─────────────────────────────────────
      triggerToast(title, msg, hasActions, acceptFn) {
        const container = document.getElementById('toast-container');
        const t = document.createElement('div');
        t.className = 'toast';
        t.innerHTML = `
        <div class="toast-header">
          <span class="toast-title">${title}</span>
          <button class="toast-close" onclick="this.closest('.toast').remove()">×</button>
        </div>
        <div class="toast-msg">${msg}</div>
        ${hasActions ? `<div class="toast-actions">
          <button class="t-accept" id="ta-${Date.now()}">Annehmen</button>
          <button onclick="this.closest('.toast').remove()">Ablehnen</button>
        </div>` : ''}`;
        container.appendChild(t);
        setTimeout(() => t.classList.add('show'), 30);
        if (hasActions && acceptFn) {
          t.querySelector('.t-accept').addEventListener('click', () => {
            acceptFn(); t.remove();
          });
        }
        if (!hasActions) setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 4500);
      }

      formatTime(s) {
        const m = Math.floor(s / 60).toString().padStart(2, '0');
        const sec = (s % 60).toString().padStart(2, '0');
        return `${m}:${sec}`;
      }

      // ── DATA SOURCES ──────────────────────────────
      async ingestFiles(fileList) {
        if (!this.sources) this.sources = [];
        
        for (let i = 0; i < fileList.length; i++) {
          const file = fileList[i];
          const reader = new FileReader();
          
          reader.onload = (e) => {
            const content = e.target.result;
            this.sources.push({
              id: Date.now() + i,
              name: file.name,
              type: file.type,
              content: content.substring(0, 5000) // Limit context size
            });
            this.renderSources();
            this.syncState();
            this.triggerToast('Source Added', `${file.name} wurde in den Kontext geladen.`, false, null);
          };
          
          if (file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.json') || file.name.endsWith('.csv') || file.name.endsWith('.js') || file.name.endsWith('.html')) {
             reader.readAsText(file);
          } else {
             this.triggerToast('Unsupported File', 'Derzeit werden nur Text/Code-Dateien unterstützt.', true, null);
          }
        }
      }

      renderSources() {
        const el = document.getElementById('sources-list');
        if (!el) return;
        if (!this.sources || this.sources.length === 0) {
            el.innerHTML = '<span class="mono dim" style="font-size:.6rem; padding: 0.5rem 0;">Keine externen Datenquellen.</span>';
            return;
        }
        el.innerHTML = this.sources.map(s => `
            <div class="ctx-chip" style="background:var(--bg-elevated); border:1px solid var(--border-s); color:var(--text); justify-content:space-between; display:flex; width:100%; align-items:center; padding-right: 0.5rem;">
                <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:85%; font-size: 0.65rem;">${s.name}</span>
                <span style="color:var(--text3); cursor:pointer; font-weight:bold; padding:0 .2rem; font-size: 1rem; line-height: 1;" onclick="Agent.removeSource(${s.id})" onmouseover="this.style.color='var(--red)'" onmouseout="this.style.color='var(--text3)'">×</span>
            </div>
        `).join('');
      }

      removeSource(id) {
          this.sources = this.sources.filter(s => s.id !== id);
          this.renderSources();
          this.syncState();
      }
    }

    // Initialize Agent globally immediately after class definition
    window.Agent = new PronoiaAgent();

    // ── HELPERS ─────────────────────────────────────
    function setTelem(id, val, color) {
      document.getElementById(`bar-${id}`).style.width = val + '%';
      document.getElementById(`bar-${id}`).style.background = color;
      document.getElementById(`val-${id}`).textContent = val + '%';
    }

    let logEntries = [];
    function logFriction(type, silent = false) {
      const icons = { ok: '✅', warn: '⚠️', miss: '❌' };
      const labels = { ok: 'Abgeschlossen', warn: 'Unterbrochen', miss: 'Verpasst' };
      const cur = Agent.blocks[Agent.blockIdx];
      const entry = {
        icon: icons[type], action: cur ? cur.title : 'Block',
        label: labels[type], time: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
      };
      logEntries.unshift(entry);
      renderLog();

      // Persist to daily calendar
      const dateStr = Agent.formatDate(Agent.selectedDate || new Date());
      if (Agent.calendar[dateStr]) {
        if (!Agent.calendar[dateStr].frictionLog) Agent.calendar[dateStr].frictionLog = [];
        Agent.calendar[dateStr].frictionLog.push(entry);
        localStorage.setItem('px_calendar', JSON.stringify(Agent.calendar));
      }

      if (!silent && type !== 'ok') {
        Agent.triggerToast('Friction Geloggt', `${entry.label}: ${entry.action}`, false, null);
      }
    }

    function renderLog() {
      const el = document.getElementById('log-list');
      if (!logEntries.length) {
        el.innerHTML = '<div class="mono dim" style="font-size:.65rem;text-align:center;padding:1rem 0;letter-spacing:.15em;">KEINE EINTRÄGE</div>';
        return;
      }
      el.innerHTML = logEntries.slice(0, 6).map(e => `
      <div class="log-item">
        <span class="log-icon">${e.icon}</span>
        <div class="log-content">
          <div class="log-action">${e.action} — <span style="color:var(--text3)">${e.label}</span></div>
          <div class="log-time">${e.time}</div>
        </div>
      </div>`).join('');
    }

    function confirmRepl() {
      Agent.triggerToast('Bestellt', 'PX-V1 Batch #002 — Versand in 48h. CoA folgt per E-Mail.', false, null);
      document.getElementById('repl-alert').style.display = 'none';
    }
    function dismissRepl() {
      document.getElementById('repl-alert').style.display = 'none';
    }
    function quickCmd(cmd) {
      document.getElementById('cmd-input').value = cmd;
      Agent.handleCommand(cmd);
      document.getElementById('cmd-input').value = '';
    }
    function addCustomBlock() {
      const title = prompt('Block-Titel:');
      if (!title) return;
      const mins = parseInt(prompt('Dauer in Minuten:') || '30');
      Agent.blocks.push({
        id: Agent.blocks.length + 1,
        title, duration: mins * 60, type: 'Custom', pillar: 'focus',
        rec: 'Manuell hinzugefügter Block.', insight: ''
      });
      Agent.renderQueue();
      Agent.triggerToast('Block Hinzugefügt', `"${title}" (${mins}min) zur Queue hinzugefügt.`, false, null);
    }

    // ── ONBOARDING (cleaned: single definition) ────

    function obFinish() {
      if (!window.Agent || typeof Agent.setAgentMsg !== 'function') {
        console.warn("[Pronoia] obFinish deferred: Agent not ready.");
        setTimeout(obFinish, 100);
        return;
      }
      // Safety: ensure protocol is loaded with time awareness
      if (Agent.blocks.length === 0) {
        Agent.loadProtocol(Agent.getBioAdaptiveTemplate());
      }
      // Explicitly save profile on finish
      localStorage.setItem('px_profile', JSON.stringify(Agent.profile));
      localStorage.setItem('px_blocks', JSON.stringify(Agent.blocks));
      
      document.getElementById('onboarding').style.opacity = '0';
      document.getElementById('onboarding').style.transition = 'opacity .5s';
      setTimeout(() => { document.getElementById('onboarding').style.display = 'none'; }, 500);
      Agent.renderUI();
      const firstBlock = Agent.blocks[0];
      Agent.setAgentMsg(`Protokoll geladen. ${firstBlock ? firstBlock.title : 'System'} bereit. Klicke Start oder tippe 'start'.`);
      Agent.generateDirective('INIT');
      localStorage.setItem('px_onboarding_done', 'true');
      Agent.syncProfile(); // Ensure initial data is synced to Firestore
      Agent.syncState();
    }

    function obSkip() {
      Agent.loadProtocol('optimal_deepwork');
      obFinish();
    }

    // ── AUTH LOGIC ─────────────────────────────────
    const Auth = {
      isLoggedIn: false,
      mode: 'login',

      init() {
        const btn = document.getElementById('btn-auth-action');
        const sw = document.getElementById('auth-switch');
        const logoutBtn = document.getElementById('btn-logout');

        btn.addEventListener('click', () => this.handleAuth());
        sw.addEventListener('click', () => this.toggleMode());
        if (logoutBtn) logoutBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.logout();
        });

        // Check for persisted session
        if (localStorage.getItem('px_auth_token')) {
          this.isLoggedIn = true;
          // Don't call success() here — Agent doesn't exist yet.
          // The INIT block below handles restoring the session.
        }
      },

      toggleMode() {
        this.mode = this.mode === 'login' ? 'signup' : 'login';
        document.getElementById('auth-title').textContent = this.mode === 'login' ? 'System Access' : 'Create Identity';
        document.getElementById('auth-sub').textContent = this.mode === 'login' ? 'Identity Verification Required' : 'Initialize New Protocol Profile';
        document.getElementById('btn-auth-action').textContent = this.mode === 'login' ? 'Initiate Session' : 'Register Profile';
        document.getElementById('auth-switch').textContent = this.mode === 'login' ? 'Create New Identity Profile' : 'Existing Profile? Sign In';
      },

      async handleAuth() {
        const email = document.getElementById('auth-email').value;
        const pass = document.getElementById('auth-password').value;

        if (!email || !pass) return;

        document.getElementById('auth-form').style.display = 'none';
        document.getElementById('auth-loading').style.display = 'block';

        if (FIREBASE_CONFIG.apiKey) {
          try {
            if (this.mode === 'login') {
              await firebase.auth().signInWithEmailAndPassword(email, pass);
            } else {
              await firebase.auth().createUserWithEmailAndPassword(email, pass);
            }
            await Agent.loadState();
            this.success();
          } catch (err) {
            alert(err.message);
            document.getElementById('auth-form').style.display = 'block';
            document.getElementById('auth-loading').style.display = 'none';
          }
        } else {
          setTimeout(() => this.success(), 1200);
        }
      },

      success() {
        this.isLoggedIn = true;
        localStorage.setItem('px_auth_token', 'px-' + Date.now());
        document.getElementById('auth-overlay').style.opacity = '0';
        setTimeout(() => {
          document.getElementById('auth-overlay').style.display = 'none';
          if (!localStorage.getItem('px_onboarding_done')) {
            document.getElementById('onboarding').style.display = 'flex';
          } else {
            obFinish();
          }
        }, 500);
      },

      logout() {
        firebase.auth().signOut().then(() => {
          localStorage.removeItem('px_auth_token');
          localStorage.removeItem('px_onboarding_done');
          localStorage.removeItem('px_block_idx');
          localStorage.removeItem('px_time_left');
          location.reload();
        });
      }
    };

    // ── INIT ────────────────────────────────────────
    // IMPORTANT: Agent is now initialized globally above.

    function obNext(step) {
      if (step === 1) {
        Agent.obState.goals = document.getElementById('ob-goals').value;
        document.getElementById('ob-1').classList.remove('active');
        document.getElementById('ob-2').classList.add('active');
      } else if (step === 2) {
        Agent.obState.hrv = parseInt(document.getElementById('ob-hrv').value) || 0;
        Agent.obState.sleep = parseInt(document.getElementById('ob-sleep').value) || 0;

        document.getElementById('ob-2').classList.remove('active');
        document.getElementById('ob-2-5').classList.add('active');
      } else if (step === 2.5) {
        Agent.obState.energy = parseInt(document.getElementById('ob-energy').value) || 7;
        Agent.obState.caffeine = document.getElementById('ob-caffeine').value;
        Agent.obState.training = document.getElementById('ob-training').value;

        Agent.profile.goals = Agent.obState.goals;
        Agent.profile.metrics.hrv = Agent.obState.hrv;
        Agent.profile.metrics.sleep = Agent.obState.sleep;

        document.getElementById('ob-2-5').classList.remove('active');
        document.getElementById('ob-3').classList.add('active');

        Agent.generatePredictiveProtocol();
      }
    }

    function selectMood(el, mood) {
      document.querySelectorAll('#ob-mood-options .ob-option').forEach(opt => opt.classList.remove('selected'));
      el.classList.add('selected');
      Agent.obState.mood = mood;
    }

    // ── LOADER DISMISS (from index.html) ──────────
    const loader = document.getElementById('loader');
    const loaderVideo = document.getElementById('loaderVideo');
    let loaderDone = false;

    function dismissLoader() {
      if (loaderDone) return;
      loaderDone = true;
      gsap.to(loader, {
        opacity: 0, duration: 1.2, ease: 'power2.inOut',
        onComplete: () => {
          loader.style.display = 'none';
          // Check if we need to show onboarding after loader
          initSessionFlow();
        }
      });
    }
    if (loaderVideo) {
      loaderVideo.addEventListener('ended', dismissLoader);
      setTimeout(dismissLoader, 8000);
    } else {
      setTimeout(dismissLoader, 100);
    }

    function initSessionFlow() {
      if (!window.Agent) {
        console.warn("[Pronoia] initSessionFlow deferred: Agent not ready.");
        setTimeout(initSessionFlow, 100);
        return;
      }
      if (Auth.isLoggedIn) {
        document.getElementById('auth-overlay').style.display = 'none';
        const hadProtocol = !!localStorage.getItem('px_block_idx');
        const didOnboarding = !!localStorage.getItem('px_onboarding_done');

        if (hadProtocol || didOnboarding) {
          if (!Agent.blocks || Agent.blocks.length === 0) {
            Agent.loadProtocol(Agent.getBioAdaptiveTemplate());
          }
          obFinish();
        } else {
          document.getElementById('onboarding').style.display = 'flex';
        }
      }
    }

    function switchTab(tab) {
      const btns = document.querySelectorAll('.panel-tab-btn');
      btns.forEach(b => b.classList.toggle('active', b.textContent.toLowerCase() === tab));

      document.getElementById('tab-queue-content').style.display = tab === 'queue' ? 'block' : 'none';
      
      const personalTab = document.getElementById('tab-personal-content');
      if (personalTab) personalTab.style.display = tab === 'personal' ? 'block' : 'none';

      if (tab === 'personal') {
        Agent.getEnvironment();
        document.getElementById('profile-goals').value = Agent.profile.goals || '';
        document.getElementById('metric-hrv').value = Agent.profile.metrics.hrv || '';
        document.getElementById('metric-sleep').value = Agent.profile.metrics.sleep || '';
        document.getElementById('profile-skill').value = Agent.profile.skill || '';
        document.getElementById('profile-skill-level').value = Agent.profile.skillLevel || 1;
      }
    }

    // Removed duplicate saveProfile definition

    function openCalendarModal() {
      document.getElementById('calendar-modal-overlay').style.display = 'flex';
      Agent.renderCalendar();
    }
    
    function closeCalendarModal() {
      document.getElementById('calendar-modal-overlay').style.display = 'none';
    }

    // Now safe to init Auth (Agent exists)
    Auth.init();

    // Theme
    const toggleTheme = () => {
      document.body.classList.toggle('light-theme');
      const isLight = document.body.classList.contains('light-theme');
      localStorage.setItem('px_theme', isLight ? 'light' : 'dark');
    };
    if (localStorage.getItem('px_theme') === 'light') {
      document.body.classList.add('light-theme');
    }
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

    // Session ID
    if (!Agent.sessionID) {
      Agent.sessionID = 'PX-' + Math.random().toString(36).substr(2, 6).toUpperCase();
      localStorage.setItem('px_session', Agent.sessionID);
    }
    document.getElementById('session-id').textContent = 'SESSION: ' + Agent.sessionID;

    // ── RESTORE SESSION (handled by loader dismiss) ──
    // Moved to initSessionFlow()

    // ── EVENT LISTENERS ──────────────────────────────
    document.getElementById('btn-toggle').addEventListener('click', () => Agent.toggleTimer());
    document.getElementById('btn-complete').addEventListener('click', () => Agent.completeBlock(true));
    document.getElementById('btn-skip').addEventListener('click', () => Agent.skipBlock());
    document.getElementById('btn-focus').addEventListener('click', () => Agent.setFocusMode());

    document.getElementById('cmd-input').addEventListener('keydown', e => {
      if (e.key === 'Enter' && e.target.value.trim()) {
        Agent.handleCommand(e.target.value.trim());
        e.target.value = '';
      }
    });

    // Context chips — map to real handleCommand patterns
    document.querySelectorAll('.ctx-chip').forEach(chip => {
      chip.addEventListener('click', function () {
        this.classList.toggle('selected');
        const cmdMap = {
          'focus': 'fokus',
          'tired': 'recovery',
          'exam': 'fokus',
          'free': 'status',
          'shift': 'lunch verschieben'
        };
        const cmd = cmdMap[this.dataset.cmd] || this.dataset.cmd;
        Agent.handleCommand(cmd);
      });
    });

    // Stage badge
    const stage = parseInt(localStorage.getItem('px_stage')) || 1;
    document.getElementById('stage-badge').textContent = `Stage 0${stage}`;

  