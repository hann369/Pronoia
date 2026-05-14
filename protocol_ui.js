/**
 * Pronoia Protocol UI Controller
 * Manages all DOM rendering, interactive elements, and UI state updates.
 */
export const ProtocolUI = {
  pillarColors: {
    focus: 'var(--cobalt-bright)',
    health: 'var(--green)',
    skills: 'var(--tan)',
    social: 'var(--amber)',
    recovery: 'var(--green)'
  },

  renderUI(agent) {
    this.renderQueue(agent);
    this.renderCenter(agent);
    this.renderStack(agent.stack);
    this.renderDirectives(agent.directives);
    this.renderXP(agent.profile);
    this.renderSources(agent.sources);
  },

  renderQueue(agent) {
    const ul = document.getElementById('queue-list');
    if (!ul) return;
    ul.innerHTML = '';
    agent.blocks.forEach((b, i) => {
      let cls = '';
      if (i < agent.blockIdx) cls = 'completed';
      if (i === agent.blockIdx) cls = 'active';
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
        if (i !== agent.blockIdx) {
          this.triggerToast('Block wechseln?', `Zu "${b.title}" springen?`, true, () => {
            agent.jumpToBlock(i);
          });
        }
      });
      ul.appendChild(li);
    });
    const countEl = document.getElementById('queue-count');
    if (countEl) countEl.textContent = `${agent.blockIdx} / ${agent.blocks.length}`;
  },

  renderCenter(agent) {
    const cur = agent.blocks[agent.blockIdx];
    const blockTitle = document.getElementById('block-title');
    const blockLabel = document.getElementById('block-label');
    const agentRec = document.getElementById('agent-rec');
    const agentInsight = document.getElementById('agent-insight');
    const timerDisplay = document.getElementById('timer-display');
    const timerSub = document.getElementById('timer-sub');
    const btnToggle = document.getElementById('btn-toggle');
    const btnComplete = document.getElementById('btn-complete');
    const pillarDot = document.getElementById('pillar-dot');
    const pillarName = document.getElementById('pillar-name');
    const pillarTag = document.getElementById('pillar-tag');

    if (!cur) {
      if (blockTitle) blockTitle.textContent = 'Protokoll Abgeschlossen';
      if (blockLabel) blockLabel.textContent = 'Alle Blöcke ausgeführt';
      if (btnToggle) btnToggle.style.display = 'none';
      if (btnComplete) btnComplete.style.display = 'none';
      if (timerDisplay) timerDisplay.textContent = '00:00';
      return;
    }

    if (blockLabel) blockLabel.textContent = `Block ${agent.blockIdx + 1} von ${agent.blocks.length} · ${cur.type}`;
    if (blockTitle) blockTitle.textContent = cur.title;
    if (agentRec) agentRec.textContent = cur.rec;
    
    // Actions logic
    let actionsHTML = '';
    if ((cur.pillar === 'health' || cur.rec.toLowerCase().includes('stack')) && agent.stack.length > 0) {
      actionsHTML += `
        <div class="stack-actions" style="margin-top:.75rem; padding-top:.75rem; border-top:1px solid var(--border); display:flex; gap:.5rem; flex-wrap:wrap;">
          ${agent.stack.map((s, i) => `
            <button class="btn-add-block" style="margin:0; padding:.3rem .6rem; background:rgba(0,196,140,0.1); border:1px solid rgba(0,196,140,0.3); color:var(--green); font-size:.7rem;" onclick="Agent.consumeStack(${i})">Log ${s.name}</button>
          `).join('')}
        </div>`;
    }
    
    if (cur.pillar === 'skills') {
      actionsHTML += `
        <div style="margin-top:.75rem; padding-top:.75rem; border-top:1px solid var(--border);">
          <button class="btn-add-block" style="margin:0; width:auto; padding:.4rem 1rem; background:var(--cobalt-bright); border:none; color:white;" onclick="Agent.generateSkillMaterials()">Open Skill Lab</button>
        </div>`;
    }
    
    // Neuro insight
    let neuroInsight = '';
    const hour = new Date().getHours();
    if (cur.pillar === 'focus') {
      neuroInsight = hour < 11 
        ? `<div class="neuro-note" style="color:var(--cobalt-bright); font-size:.7rem; margin-top:.5rem; border-left:2px solid var(--cobalt-bright); padding-left:.5rem;"><b>Priming:</b> Dopamin-Baseline durch helles Licht stabilisieren.</div>`
        : `<div class="neuro-note" style="color:var(--cobalt-bright); font-size:.7rem; margin-top:.5rem; border-left:2px solid var(--cobalt-bright); padding-left:.5rem;"><b>Plastizität:</b> Nutze 90m Zyklen für maximale LTP.</div>`;
    } else if (cur.pillar === 'recovery') {
      neuroInsight = `<div class="neuro-note" style="color:var(--green); font-size:.7rem; margin-top:.5rem; border-left:2px solid var(--green); padding-left:.5rem;"><b>Neurogenese:</b> Aktive Erholung fördert die Konsolidierung.</div>`;
    }

    if (agentInsight) agentInsight.innerHTML = (cur.insight || '') + actionsHTML + neuroInsight;
    
    // Timer state
    if (timerDisplay) {
      timerDisplay.textContent = agent.formatTime(agent.timeLeft);
      if (!agent.isRunning && !agent.pauseStartTime) {
        timerDisplay.classList.add('paused');
        if (timerSub) timerSub.textContent = 'Synchronisiert';
      } else if (agent.pauseStartTime) {
        timerDisplay.classList.add('paused');
        if (timerSub) timerSub.textContent = 'Pausiert';
      } else {
        timerDisplay.classList.remove('paused');
        if (timerSub) timerSub.textContent = agent.timeOffset > 60 ? 'Offset Aktiv' : 'Läuft';
      }
    }

    // Pillar tag
    const color = this.pillarColors[cur.pillar] || 'var(--text2)';
    if (pillarDot) pillarDot.style.background = color;
    if (pillarName) pillarName.textContent = cur.type || cur.pillar;
    if (pillarTag) {
      pillarTag.style.background = `${color}18`;
      pillarTag.style.color = color;
      pillarTag.style.border = `1px solid ${color}30`;
    }
  },

  renderStack(stack) {
    const el = document.getElementById('stack-list');
    if (!el) return;
    el.innerHTML = '';
    const showRepl = stack.some(s => (s.supply || 100) < 20);
    const alert = document.getElementById('repl-alert');
    if (alert) alert.style.display = showRepl ? 'flex' : 'none';

    stack.forEach((s) => {
      const supply = s.supply || 100;
      const colorCls = supply < 20 ? 'supply-low' : supply < 40 ? 'supply-warn' : 'supply-ok';
      const label = s.timing === 'morning' ? 'Morgens' : s.timing === 'evening' ? 'Abends' : 'Zyklus';
      const style = s.timing === 'morning' ? 'rgba(0,196,140,.12);color:var(--green)'
                  : s.timing === 'evening' ? 'rgba(0,163,255,.12);color:var(--cobalt-bright)'
                  : 'rgba(245,166,35,.12);color:var(--amber)';
      
      el.innerHTML += `
      <div class="stack-card">
        <div class="stack-card-row"><span class="stack-name">${s.name}</span><span class="stack-dose">${s.dose}</span></div>
        <div class="stack-card-row"><span class="stack-timing" style="background:${style}">${label}</span></div>
        <div class="stack-bar"><div class="stack-bar-fill" style="width:${supply}%"></div></div>
        <div class="stack-supply"><span class="${colorCls}">${supply}% verbleibend</span><span class="dim">${Math.round(supply * .3)} Tage</span></div>
      </div>`;
    });
  },

  renderDirectives(directives) {
    const feed = document.getElementById('directives-feed');
    const list = document.getElementById('directives-list');
    if (!feed || !list) return;
    if (directives.length === 0) { feed.style.display = 'none'; return; }
    feed.style.display = 'block';
    list.innerHTML = directives.map((d, i) => `
      <div class="directive-item ${i === 0 ? 'new' : ''}">
        <span class="directive-tag">${d.type} · ${d.ts}</span>
        ${d.text}
      </div>`).join('');
  },

  renderXP(profile) {
    const xp = profile.xp || 0;
    const next = profile.nextLevelXp || 1000;
    const bar = document.getElementById('xp-bar-fill');
    const display = document.getElementById('xp-display');
    if (bar) bar.style.width = (xp / next * 100) + '%';
    if (display) display.textContent = `${xp} / ${next} XP`;
  },

  renderSources(sources) {
    const el = document.getElementById('sources-list');
    if (!el) return;
    if (!sources || sources.length === 0) {
      el.innerHTML = `<div style="text-align:center; padding:1rem; opacity:0.5;"><span class="mono" style="font-size:.6rem;">Keine Quellen gefunden.</span><br><a href="vault.html" style="color:var(--cobalt-bright); font-size:.6rem; text-decoration:none;">Vault öffnen →</a></div>`;
      return;
    }
    el.innerHTML = `<div style="display:flex; flex-direction:column; gap:.5rem;">
      ${sources.map(s => `
        <div class="source-item" style="background:rgba(255,255,255,0.03); border:1px solid var(--border); padding:.5rem; border-radius:4px; display:flex; justify-content:space-between; align-items:center;">
          <div style="overflow:hidden; flex:1; margin-right:.5rem;">
            <div style="font-size:.7rem; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${s.title || 'Untitled'}</div>
            <div style="font-size:.55rem; color:var(--text3); font-family:var(--font-mono); text-transform:uppercase;">${s.type || 'FILE'}</div>
          </div>
          <button onclick="Agent.deleteSource('${s.id}')" style="background:none; border:none; color:var(--text3); cursor:pointer;">×</button>
        </div>`).join('')}
      <a href="vault.html" class="btn-add-block" style="text-align:center; margin-top:.5rem; text-decoration:none; font-size:.6rem;">Vault Verwalten</a>
    </div>`;
  },

  formatTime(s) {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  },

  triggerToast(title, msg, hasActions, acceptFn) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = `
      <div class="toast-header"><span class="toast-title">${title}</span><button class="toast-close" onclick="this.closest('.toast').remove()">×</button></div>
      <div class="toast-msg">${msg}</div>
      ${hasActions ? `<div class="toast-actions"><button class="t-accept" id="ta-${Date.now()}">Annehmen</button><button onclick="this.closest('.toast').remove()">Ablehnen</button></div>` : ''}`;
    container.appendChild(t);
    setTimeout(() => t.classList.add('show'), 30);
    if (hasActions && acceptFn) {
      t.querySelector('.t-accept').addEventListener('click', () => { acceptFn(); t.remove(); });
    }
    if (!hasActions) setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 4500);
  },

  setAgentMsg(msg, isThinking = false) {
    const el = document.getElementById('agent-msg');
    const loader = document.getElementById('agent-thinking');
    if (!el) return;
    if (this._typeInterval) clearInterval(this._typeInterval);
    if (loader) loader.style.display = isThinking ? 'flex' : 'none';
    if (isThinking) { el.textContent = msg; return; }
    
    el.textContent = '';
    let i = 0;
    this._typeInterval = setInterval(() => {
      if (i < msg.length) { el.textContent += msg.charAt(i); i++; }
      else clearInterval(this._typeInterval);
    }, 15);
  },

  updateDisplay(agent) {
    const prog = 1 - agent.timeLeft / agent.totalTime;
    const ring = document.getElementById('ring-fill');
    const timer = document.getElementById('timer-display');
    if (timer) timer.textContent = agent.formatTime(agent.timeLeft);
    if (ring) ring.style.strokeDashoffset = 553 * (1 - prog);
    
    const current = agent.blocks[agent.blockIdx];
    if (current) {
      this.updateRhythmUI(prog, current);
    }
  },

  updateRhythmUI(prog, current) {
    const phase = document.getElementById('rhythm-phase');
    const fill = document.getElementById('rhythm-fill');
    const cursor = document.getElementById('rhythm-cursor');
    const pillar = current.pillar || 'focus';
    
    let label = 'Peak';
    if (pillar === 'recovery' || pillar === 'health') label = 'Rest';
    else if (pillar === 'social') label = 'Integration';

    if (phase) phase.textContent = label;
    if (fill) fill.style.width = (prog * 100) + '%';
    if (cursor) cursor.style.left = (prog * 100) + '%';
  },

  showLevelUp(level) {
    const overlay = document.createElement('div');
    overlay.className = 'level-up-overlay';
    overlay.style = `position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(10,12,18,0.9);backdrop-filter:blur(20px);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:10000;color:white;text-align:center;`;
    overlay.innerHTML = `
      <h1 style="font-size:4rem;font-weight:900;letter-spacing:.2em;color:var(--cobalt-bright);margin-bottom:0;">LEVEL UP</h1>
      <p style="font-size:1.5rem;opacity:.7;">LEVEL ${level} ERREICHT</p>
      <div style="margin-top:2rem;font-family:'Mono',monospace;color:var(--green);">SYSTEM-UPGRADE VOLLSTÄNDIG</div>
      <button class="btn-primary" style="margin-top:3rem;padding:1rem 3rem;" onclick="this.parentElement.remove()">Fortfahren</button>`;
    document.body.appendChild(overlay);
    if (window.gsap) {
      gsap.from(overlay, { opacity: 0, duration: 1 });
      gsap.from(overlay.children, { y: 50, opacity: 0, stagger: 0.2, duration: 1 });
    }
  }
};
