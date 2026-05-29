import { useState, useEffect, useCallback, useRef } from 'react';
import { db, auth } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { PROTOCOL_DATABASE } from '@/lib/protocol_data';

export function useProtocol() {
  const [user, setUser] = useState(null);
  const [blocks, setBlocks] = useState(PROTOCOL_DATABASE.focus_optimization || []);
  const [blockIdx, setBlockIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(PROTOCOL_DATABASE.focus_optimization?.[0]?.duration || 0);
  const [totalTime, setTotalTime] = useState(PROTOCOL_DATABASE.focus_optimization?.[0]?.duration || 0);
  const [isRunning, setIsRunning] = useState(false);
  const [profile, setProfile] = useState({
    xp: 0,
    skill: 'Programmieren',
    skillLevel: 1,
    nextLevelXp: 1000,
    goals: 'System-Performance maximieren.',
    metrics: { hrv: 72, sleep: 84 },
    weeklyGoals: [
      { text: '3x Deep Work Blöcke vollenden', completed: false },
      { text: 'Bio-Stack-Compliance > 90%', completed: false },
      { text: 'SNS Aktivierung unter 65 halten', completed: false }
    ]
  });

  const [stack, setStack] = useState([
    { name: 'Bromantane', dose: '50mg', timing: 'morning', supply: 85 },
    { name: 'Oxiracetam', dose: '750mg', timing: 'pre-focus', supply: 40 },
    { name: 'Alpha-GPC', dose: '300mg', timing: 'focus I', supply: 90 },
    { name: 'Mg-Threonate', dose: '400mg', timing: 'evening', supply: 60 },
    { name: 'L-Theanine', dose: '200mg', timing: 'mid-day', supply: 95 }
  ]);

  const [frictionLogs, setFrictionLogs] = useState([
    { ts: '10:14:22', status: 'ok', blockTitle: 'Deep Work I' },
    { ts: '11:45:00', status: 'warn', blockTitle: 'Skill Acquisition' }
  ]);

  const [dataSources, setDataSources] = useState([
    { name: 'cortisol_saliva_q3.csv', size: '24 KB', date: 'Vor 2 Tagen' },
    { name: 'hrv_sleep_trends_2026.json', size: '142 KB', date: 'Gestern' }
  ]);

  const [agentMsg, setAgentMsg] = useState("System initialisiert. Bio-Kognitive Überwachung aktiv.");
  const [isTyping, setIsTyping] = useState(false);
  const [directives, setDirectives] = useState([]);

  // Date-Based Calendar States
  const [calendar, setCalendar] = useState({});
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const timerRef = useRef(null);

  // Date Formatter Helper (YYYY-MM-DD)
  const formatDate = useCallback((d) => {
    if (!d) return '';
    const dateObj = new Date(d);
    return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
  }, []);

  // Auth & Load State
  useEffect(() => {
    if (!auth) return;
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Load from Firestore
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.profile) setProfile(prev => ({ ...prev, ...data.profile }));
          if (data.calendar) setCalendar(data.calendar);
          if (data.blocks && data.blocks.length > 0) {
            setBlocks(data.blocks);
            const loadedIdx = data.blockIdx !== undefined ? data.blockIdx : 0;
            setBlockIdx(loadedIdx);
            if (data.blocks[loadedIdx]) {
              setTotalTime(data.blocks[loadedIdx].duration);
              setTimeLeft(data.blocks[loadedIdx].duration);
            }
          } else {
            // Default blocks
            setBlocks(PROTOCOL_DATABASE.focus_optimization);
            setTotalTime(PROTOCOL_DATABASE.focus_optimization[0].duration);
            setTimeLeft(PROTOCOL_DATABASE.focus_optimization[0].duration);
          }
          if (data.stack) setStack(data.stack);
          if (data.frictionLogs) setFrictionLogs(data.frictionLogs);
          if (data.directives) setDirectives(data.directives);
          if (data.dataSources) setDataSources(data.dataSources);
        } else {
          // Default setup
          setBlocks(PROTOCOL_DATABASE.focus_optimization);
          setTotalTime(PROTOCOL_DATABASE.focus_optimization[0].duration);
          setTimeLeft(PROTOCOL_DATABASE.focus_optimization[0].duration);
        }
      } else {
        // Not logged in: check localStorage or use default
        const localData = localStorage.getItem('pronoia_protocol_state');
        if (localData) {
          try {
            const parsed = JSON.parse(localData);
            if (parsed.profile) setProfile(prev => ({ ...prev, ...parsed.profile }));
            if (parsed.calendar) setCalendar(parsed.calendar);
            if (parsed.blocks) setBlocks(parsed.blocks);
            if (parsed.blockIdx !== undefined) setBlockIdx(parsed.blockIdx);
            if (parsed.stack) setStack(parsed.stack);
            if (parsed.frictionLogs) setFrictionLogs(parsed.frictionLogs);
            if (parsed.directives) setDirectives(parsed.directives);
            if (parsed.dataSources) setDataSources(parsed.dataSources);
          } catch (e) {
            console.error('Local Storage load failed', e);
          }
        }
        if (blocks.length === 0) {
          setBlocks(PROTOCOL_DATABASE.focus_optimization);
          setTotalTime(PROTOCOL_DATABASE.focus_optimization[0].duration);
          setTimeLeft(PROTOCOL_DATABASE.focus_optimization[0].duration);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Sync to Firestore / LocalStorage on change (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      const stateObj = { profile, blocks, blockIdx, stack, frictionLogs, directives, dataSources, calendar };
      if (user && db) {
        setDoc(doc(db, 'users', user.uid), stateObj, { merge: true });
      } else if (!user) {
        localStorage.setItem('pronoia_protocol_state', JSON.stringify(stateObj));
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [profile, blocks, blockIdx, stack, frictionLogs, directives, dataSources, calendar, user]);

  // Timer Logic
  const tick = useCallback(() => {
    setTimeLeft((prev) => {
      if (prev <= 1) {
        completeBlock();
        return 0;
      }
      return prev - 1;
    });
  }, [blockIdx, blocks]);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(tick, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRunning, tick]);

  const start = () => setIsRunning(true);
  const pause = () => setIsRunning(false);
  const toggleTimer = () => setIsRunning(!isRunning);

  const completeBlock = () => {
    setIsRunning(false);
    const current = blocks[blockIdx];
    if (current) {
      const baseXP = Math.round(current.duration / 60);
      const multiplier = current.pillar === 'skills' ? 2 : 1;
      awardXP(baseXP * multiplier);
      setAgentMsg(`Block "${current.title}" abgeschlossen! (+${baseXP * multiplier} XP)`);
    }
  };

  const awardXP = (amount) => {
    setProfile(prev => {
      let newXP = (prev.xp || 0) + amount;
      let newLevel = prev.skillLevel || 1;
      let newNextLevelXp = prev.nextLevelXp || 1000;

      if (newXP >= newNextLevelXp) {
        newXP -= newNextLevelXp;
        newLevel++;
        newNextLevelXp = Math.round(newNextLevelXp * 1.25);
        setAgentMsg(`LEVEL UP: Stufe ${newLevel} erreicht! (+150 Bonus-Einheit)`);
      }

      return { ...prev, xp: newXP, skillLevel: newLevel, nextLevelXp: newNextLevelXp };
    });
  };

  const nextBlock = () => {
    if (blockIdx < blocks.length - 1) {
      const nextIdx = blockIdx + 1;
      setBlockIdx(nextIdx);
      setTimeLeft(blocks[nextIdx].duration);
      setTotalTime(blocks[nextIdx].duration);
      setAgentMsg(`Nächster Block: ${blocks[nextIdx].title}`);
    } else {
      setAgentMsg("Tagesprotokoll vollständig abgeschlossen.");
    }
  };

  const prevBlock = () => {
    if (blockIdx > 0) {
      const prevIdx = blockIdx - 1;
      setBlockIdx(prevIdx);
      setTimeLeft(blocks[prevIdx].duration);
      setTotalTime(blocks[prevIdx].duration);
      setAgentMsg(`Vorheriger Block: ${blocks[prevIdx].title}`);
    }
  };

  const skipBlock = () => {
    nextBlock();
  };

  // Stack management
  const consumeStackItem = (idx) => {
    setStack(prev => prev.map((item, i) => {
      if (i === idx) {
        const newSupply = Math.max(0, item.supply - 5);
        setAgentMsg(`${item.name} konsumiert. Verbleibender Vorrat: ${newSupply}%`);
        return { ...item, supply: newSupply };
      }
      return item;
    }));
  };

  const addStackItem = () => {
    setStack(prev => [...prev, { name: 'Neues Supplement', dose: '0mg', timing: 'morning', supply: 100 }]);
    setAgentMsg("Neues Stack-Element hinzugefügt.");
  };

  const removeStackItem = (idx) => {
    setStack(prev => prev.filter((_, i) => i !== idx));
    setAgentMsg("Stack-Element entfernt.");
  };

  const updateStackItem = (idx, key, val) => {
    setStack(prev => prev.map((item, i) => {
      if (i === idx) {
        return { ...item, [key]: val };
      }
      return item;
    }));
  };

  // Profile / Goals Management
  const saveProfile = (updatedProfile) => {
    setProfile(prev => ({
      ...prev,
      ...updatedProfile
    }));
    setAgentMsg("Profil-Parameter erfolgreich aktualisiert.");
  };

  // Friction Logs
  const logFriction = (status) => {
    const currentBlock = blocks[blockIdx];
    const newLog = {
      ts: new Date().toLocaleTimeString(),
      status, // 'ok', 'warn', 'miss'
      blockTitle: currentBlock ? currentBlock.title : 'Freier Block'
    };
    setFrictionLogs(prev => [newLog, ...prev].slice(0, 15));
    setAgentMsg(`Fokus-Qualität erfasst: ${status.toUpperCase()}`);
  };

  // Calendar switches (predefined queues)
  const loadProtocolQueue = (queueKey) => {
    if (PROTOCOL_DATABASE[queueKey]) {
      setBlocks(PROTOCOL_DATABASE[queueKey]);
      setBlockIdx(0);
      setTimeLeft(PROTOCOL_DATABASE[queueKey][0].duration);
      setTotalTime(PROTOCOL_DATABASE[queueKey][0].duration);
      setAgentMsg(`Protokoll geladen: ${queueKey.toUpperCase()}`);
    }
  };

  // Add Custom Block to Active List
  const addCustomBlock = (title, minutes, type = 'Focus', pillar = 'focus') => {
    const newBlock = {
      title,
      duration: minutes * 60,
      type,
      pillar,
      rec: 'Individueller Block.',
      insight: 'Konsistente Blöcke stützen den zirkadianen Rhythmus.'
    };
    setBlocks(prev => {
      const nextList = [...prev, newBlock];
      if (prev.length === 0) {
        setTimeLeft(newBlock.duration);
        setTotalTime(newBlock.duration);
      }
      return nextList;
    });
    setAgentMsg(`Block hinzugefügt: ${title}`);
  };

  // Data Sources Ingestion
  const uploadDataSource = (file) => {
    const newSrc = {
      name: file.name,
      size: `${(file.size / 1024).toFixed(1)} KB`,
      date: 'Gerade eben'
    };
    setDataSources(prev => [newSrc, ...prev]);
    setAgentMsg(`Datensatz ${file.name} erfolgreich erfasst.`);
  };

  // --- Date-Based Calendar Operations ---
  const selectDate = (date) => {
    setSelectedDate(date);
  };

  const prevMonth = () => {
    setCurrentMonth(prev => {
      const copy = new Date(prev);
      copy.setMonth(copy.getMonth() - 1);
      return copy;
    });
  };

  const nextMonth = () => {
    setCurrentMonth(prev => {
      const copy = new Date(prev);
      copy.setMonth(copy.getMonth() + 1);
      return copy;
    });
  };

  const addCalendarBlock = (title, time, durationSec = 3600, pillar = 'focus') => {
    const dateStr = formatDate(selectedDate);
    const newBlock = {
      title: title || 'Neuer Block',
      startTime: time || '12:00',
      duration: durationSec,
      pillar: pillar || 'focus',
      rec: 'Manuell hinzugefügt.',
      insight: 'Aktive Lebensplanung reduziert kognitive Reibungspunkte.'
    };
    setCalendar(prev => {
      const dayData = prev[dateStr] || { blocks: [] };
      const updatedBlocks = [...(dayData.blocks || []), newBlock].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
      return { ...prev, [dateStr]: { ...dayData, blocks: updatedBlocks } };
    });
    setAgentMsg(`Block "${title}" zu Kalendertag ${dateStr} hinzugefügt.`);
  };

  const editCalendarBlock = (idx, updatedFields) => {
    const dateStr = formatDate(selectedDate);
    setCalendar(prev => {
      const dayData = prev[dateStr];
      if (!dayData || !dayData.blocks) return prev;
      const updatedBlocks = dayData.blocks.map((b, i) => i === idx ? { ...b, ...updatedFields } : b).sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
      return { ...prev, [dateStr]: { ...dayData, blocks: updatedBlocks } };
    });
  };

  const deleteCalendarBlock = (idx) => {
    const dateStr = formatDate(selectedDate);
    setCalendar(prev => {
      const dayData = prev[dateStr];
      if (!dayData || !dayData.blocks) return prev;
      const updatedBlocks = dayData.blocks.filter((_, i) => i !== idx);
      return { ...prev, [dateStr]: { ...dayData, blocks: updatedBlocks } };
    });
    setAgentMsg(`Block entfernt.`);
  };

  const generateDayAI = async () => {
    const dateStr = formatDate(selectedDate);
    setAgentMsg(`Generiere optimales Tagesprotokoll für ${dateStr}…`);
    setIsTyping(true);
    try {
      const prompt = `Selected Date: ${dateStr}. Weekly Goals: ${profile.goals || 'Maximale Leistung'}. HRV: ${profile.metrics?.hrv || 72}ms, Schlaf: ${profile.metrics?.sleep || 84}. 
      Task: Generiere ein optimales Bio-Kognitives Tagesprotokoll mit 5 bis 7 chronologischen Blöcken.
      Schema: { "blocks": [ { "title": string, "startTime": "HH:MM", "duration": number (seconds), "pillar": "focus"|"health"|"skills"|"social"|"recovery", "rec": string, "insight": string } ] }
      Wichtig: Antworte AUSSCHLIESSLICH mit dem validen JSON-Objekt. Kein Markdown-Fencing, kein Text davor oder danach!`;
      
      const res = await fetch('/api/mistral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, systemPrompt: "Du bist der Pronoia Protocol Architect. Antworte ausschließlich in validem JSON." })
      });
      if (!res.ok) throw new Error("Mistral request failed");
      const data = await res.json();
      const text = data.choices[0].message.content;
      const cleaned = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (parsed && parsed.blocks) {
        setCalendar(prev => ({ ...prev, [dateStr]: parsed }));
        setAgentMsg(`Protokoll für ${dateStr} erfolgreich synchronisiert.`);
      } else {
        throw new Error("Invalid structure returned");
      }
    } catch(e) {
      console.warn("AI Day Sync Failed. Loading Local Fallback Pattern.", e);
      const fallback = {
        blocks: [
          { title: 'Morning Hydration & Stack', startTime: '07:30', duration: 15*60, pillar: 'health', rec: 'Creatine + Taurine in 500ml Wasser.', insight: 'Intrazellulärer Volumen-Peak.' },
          { title: 'Deep Work Block I', startTime: '08:30', duration: 90*60, pillar: 'focus', rec: 'Absolute Isolation. Binaural Beats.', insight: 'Maximales Dopaminerges Fenster.' },
          { title: 'Deliberate Skill Practice', startTime: '11:00', duration: 45*60, pillar: 'skills', rec: 'Hochfokussiertes Training am Ziel-Skill.', insight: 'LTP Potential auf Maximum.' },
          { title: 'Zirkadianer Lunch Walk', startTime: '13:00', duration: 30*60, pillar: 'health', rec: '30 Minuten direktes Sonnenlicht.', insight: 'Stoppt Melatoninausschüttung.' },
          { title: 'Deep Work Block II', startTime: '14:30', duration: 60*60, pillar: 'focus', rec: 'Administrative und operative Tasks.', insight: 'Kognitives Nachmittagsfenster.' },
          { title: 'Sunset NSDR Recovery', startTime: '17:30', duration: 25*60, pillar: 'recovery', rec: 'Liegendes Entspannungsprotokoll.', insight: 'Parasympathischer System-Reset.' }
        ]
      };
      setCalendar(prev => ({ ...prev, [dateStr]: fallback }));
      setAgentMsg(`Tagesprotokoll für ${dateStr} geladen (Heuristisches Backup).`);
    } finally {
      setIsTyping(false);
    }
  };

  const generateMonthAI = async () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    setAgentMsg("Analysiere Lücken im Monatskalender...");
    setIsTyping(true);

    const missingDays = [];
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      const dateStr = formatDate(d);
      if (!calendar[dateStr]) {
        missingDays.push(dateStr);
      }
    }

    if (missingDays.length === 0) {
      setAgentMsg("Alle Tage in diesem Monat sind bereits synchronisiert.");
      setIsTyping(false);
      return;
    }

    const chunk = missingDays.slice(0, 3); // limit to 3 days per invocation
    try {
      const prompt = `Dates: ${chunk.join(', ')}. Goals: ${profile.goals || 'Bio-kognitive Exzellenz'}.
      Task: Generiere ein strukturiertes JSON-Objekt, das diese Daten auf individuelle Tagespläne mappt. Jeder Plan enthält 4-6 Blöcke.
      Format: { "${chunk[0]}": { "blocks": [ {"title":"Deep Work","startTime":"08:00","duration":3600,"pillar":"focus","rec":"","insight":""} ] } }
      Gib AUSSCHLIESSLICH das valide JSON-Objekt aus.`;

      const res = await fetch('/api/mistral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, systemPrompt: "Du bist der Pronoia Protocol Architect. Antworte ausschließlich in validem JSON." })
      });
      if (!res.ok) throw new Error("Mistral failed");
      const data = await res.json();
      const text = data.choices[0].message.content;
      const cleaned = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      setCalendar(prev => {
        const copy = { ...prev };
        for (const dateStr of Object.keys(parsed)) {
          if (parsed[dateStr] && parsed[dateStr].blocks) {
            copy[dateStr] = parsed[dateStr];
          }
        }
        return copy;
      });
      setAgentMsg(`Schedules für ${Object.keys(parsed).length} Tage erfolgreich eingepflegt.`);
    } catch(e) {
      console.warn("AI Month Sync Failed. Building Local Fallbacks.", e);
      setCalendar(prev => {
        const copy = { ...prev };
        for (const dateStr of chunk) {
          copy[dateStr] = {
            blocks: [
              { title: 'Morning Stack', startTime: '08:00', duration: 15*60, pillar: 'health', rec: 'Hydrierung.', insight: 'Morgen-Baseline.' },
              { title: 'Fokus Arbeit', startTime: '09:00', duration: 90*60, pillar: 'focus', rec: 'Deep Work.', insight: 'Maximale Last.' },
              { title: 'Skill Erwerb', startTime: '11:00', duration: 45*60, pillar: 'skills', rec: 'Lernen.', insight: 'Neuronale Plastizität.' },
              { title: 'Erholungsphase', startTime: '15:00', duration: 30*60, pillar: 'recovery', rec: 'NSDR.', insight: 'PNS Trigger.' }
            ]
          };
        }
        return copy;
      });
      setAgentMsg(`Kalenderlücken heuristisch überbrückt.`);
    } finally {
      setIsTyping(false);
    }
  };

  const chatWithDayAI = async (msg) => {
    if (!msg || !msg.trim()) return;
    const dateStr = formatDate(selectedDate);
    setAgentMsg(`Passe Tagesprotokoll für ${dateStr} an…`);
    setIsTyping(true);
    const currentPlan = calendar[dateStr] ? JSON.stringify(calendar[dateStr].blocks) : "[]";
    try {
      const prompt = `Date: ${dateStr}. Goals: ${profile.goals || 'Performance'}. Current Plan: ${currentPlan}. Instructions: "${msg}".
      Task: Passe den bestehenden Plan gemäß den Anweisungen an. Gib den VOLLSTÄNDIGEN neuen Tagesplan im JSON Format zurück.
      Schema: { "blocks": [ {"title":"...","startTime":"HH:MM","duration":3600,"pillar":"focus"|"health"|"skills"|"social"|"recovery","rec":"","insight":""} ] }
      Wichtig: Antworte AUSSCHLIESSLICH mit dem validen JSON. Keine Markdown-Zeichen.`;

      const res = await fetch('/api/mistral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, systemPrompt: "Du bist der Pronoia Protocol Architect. Antworte ausschließlich in validem JSON." })
      });
      const data = await res.json();
      const text = data.choices[0].message.content;
      const cleaned = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (parsed && parsed.blocks) {
        setCalendar(prev => ({ ...prev, [dateStr]: parsed }));
        setAgentMsg(`Plan erfolgreich angepasst.`);
      }
    } catch(e) {
      console.error(e);
      setAgentMsg("AI Plan-Zuschnitt fehlgeschlagen. Block manuell editieren.");
    } finally {
      setIsTyping(false);
    }
  };

  const syncToActive = () => {
    const dateStr = formatDate(selectedDate);
    const dayData = calendar[dateStr];
    if (!dayData || !dayData.blocks || dayData.blocks.length === 0) {
      setAgentMsg("Kein fertiges Protokoll für diesen Tag im Kalender vorhanden.");
      return;
    }
    setBlocks(dayData.blocks);
    setBlockIdx(0);
    setTimeLeft(dayData.blocks[0].duration);
    setTotalTime(dayData.blocks[0].duration);
    setAgentMsg(`Kalender-Protokoll vom ${dateStr} geladen.`);
  };

  // --- Skill Lab Operations ---
  const generateSkillMaterials = async () => {
    const skill = profile.skill || 'Programmieren';
    const lvl = profile.skillLevel || 1;
    setAgentMsg(`Generiere adaptive Lernmaterialien für Lvl ${lvl} ${skill}…`);
    setIsTyping(true);
    try {
      const prompt = `Skill Focus: "${skill}" auf Level ${lvl}/10. 
      Erstelle 3 personalisierte, delikate Lernmaterialien für eine Deliberate Practice Session:
      1. Ein prägnantes Theorie-Modul (Konzept & Verständnis)
      2. Ein Video-Modul (YouTube-Beschreibung als Platzhalter mit Video-Symbol)
      3. Eine spezifische praktische Übung, die den aktuellen Schwierigkeitsgrad herausfordert.
      
      Antworte in einem wunderschön strukturierten HTML-Snippet. Sei hochgradig motivierend und präzise. 
      Wichtig: Verwende stilvolles HTML ohne Markdown-Zäune. Nutze Klassen des Pronoia Layouts (z.B. style-spezifische Inline-Tags oder CSS-Klassen).`;

      const res = await fetch('/api/mistral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, systemPrompt: "Du bist der Pronoia Skill Lab Coach. Antworte in Deutsch. Gib ausschließlich HTML ohne Markdown-Fencing zurück." })
      });
      if (!res.ok) throw new Error("Skill API failed");
      const data = await res.json();
      const text = data.choices[0].message.content;
      const cleanHtml = text.replace(/```html|```/g, '').trim();
      return cleanHtml;
    } catch(e) {
      console.error(e);
      return `
        <div style="padding: 1.5rem; border: 1px solid rgba(213, 184, 147, 0.2); border-radius: 4px; font-family: monospace; font-size: 0.75rem;">
          <h3 style="color: var(--tan); margin-bottom: 0.5rem;">[OFFLINE BASELINE RECOVERY]</h3>
          <p style="opacity:0.8;">Theorie: Deliberate Practice erfordert bewussten Fokus an der Leistungsgrenze.</p>
          <h4 style="color: var(--tan); margin-top: 1rem;">Übung:</h4>
          <p style="opacity:0.8;">Isoliere dein schwierigstes Teilproblem für 20 Minuten und bearbeite es ohne Ablenkung.</p>
        </div>
      `;
    } finally {
      setIsTyping(false);
    }
  };

  const completeSkillSession = (xp = 150) => {
    let leveledUp = false;
    let newLvl = profile.skillLevel || 1;
    let newXp = (profile.xp || 0) + xp;
    let newNextXp = profile.nextLevelXp || 1000;

    if (newXp >= newNextXp) {
      newXp -= newNextXp;
      newLvl++;
      newNextXp = Math.round(newNextXp * 1.3);
      leveledUp = true;
      setAgentMsg(`LEVEL UP: ${profile.skill} jetzt auf Lvl ${newLvl}!`);
    } else {
      setAgentMsg(`+${xp} XP für Skill Lab gesammelt!`);
    }

    const updated = {
      ...profile,
      xp: newXp,
      skillLevel: newLvl,
      nextLevelXp: newNextXp
    };
    setProfile(updated);
    return { leveledUp, newLvl };
  };

  // --- Multilingual Command Input Handler ---
  const handleCommand = async (raw) => {
    const cmd = raw.toLowerCase().trim();
    setAgentMsg("Analysiere Befehl… / Analyzing command…");
    setIsTyping(true);

    // Multilingual Action Matching
    const isPause = /pause|pausiere|pausieren|stop|stoppe|stoppen|halt|anhalten|detener|arrête|arrêter|fermer/.test(cmd);
    const isStart = /weiter|resume|start|starte|starten|fortfahren|los|commencer|continuer|reprendre|iniciar/.test(cmd);
    const isSkip = /skip|next|nächster|nächste|weiterer|suivant|siguiente|saltar|sauter|überspringen|überspringe/.test(cmd);
    const isDone = /done|finish|fertig|beenden|beende|terminer|terminé|completado|finalizar/.test(cmd);

    if (isPause) {
      pause();
      setAgentMsg("Protokoll pausiert. / Protocol paused.");
      setIsTyping(false);
      return;
    }
    if (isStart) {
      start();
      setAgentMsg("Protokoll gestartet. / Protocol active.");
      setIsTyping(false);
      return;
    }
    if (isSkip) {
      skipBlock();
      setIsTyping(false);
      return;
    }
    if (isDone) {
      completeBlock();
      setIsTyping(false);
      return;
    }

    // Block replacement multilingual
    const replaceMatch = cmd.match(/(?:replace|change|ersetze|ändere|reemplazar|cambiar|remplacer|changer)\s+block\s+(?:with|by|durch|in|con|a|par|en)?\s*(.+?)(?:\s+(?:for|mit|durante|de|pendant)?\s*(\d+)\s*(?:min|m|minuten|minutes|minutos)?)?$/i);
    if (replaceMatch) {
      const newTitle = replaceMatch[1].trim();
      const durationMin = replaceMatch[2] ? parseInt(replaceMatch[2]) : 30;
      const durationSec = durationMin * 60;

      setBlocks(prev => prev.map((b, idx) => {
        if (idx === blockIdx) {
          return {
            ...b,
            title: newTitle,
            duration: durationSec,
            rec: 'Durch Chat-Befehl angepasst. / Adjusted via chat command.',
            insight: 'Kognitive Flexibilität unterstützt die ZNS-Erholung. / Cognitive flexibility supports CNS recovery.'
          };
        }
        return b;
      }));
      setTimeLeft(durationSec);
      setTotalTime(durationSec);
      setAgentMsg(`Block ${blockIdx + 1} -> "${newTitle}" (${durationMin}m).`);
      setIsTyping(false);
      return;
    }

    // Multilingual block jumping
    const startBlockMatch = cmd.match(/(?:start|starte|starten|iniciar|commencer|activate|aktiviere|go\s+to|gehe\s+zu|ir\s+a|aller\s+à)\s+block\s+(\d+)/i);
    if (startBlockMatch) {
      const targetIdx = parseInt(startBlockMatch[1]) - 1;
      if (targetIdx >= 0 && targetIdx < blocks.length) {
        setBlockIdx(targetIdx);
        setTimeLeft(blocks[targetIdx].duration);
        setTotalTime(blocks[targetIdx].duration);
        start();
        setAgentMsg(`Block ${targetIdx + 1} "${blocks[targetIdx].title}" gestartet. / Started Block ${targetIdx + 1}.`);
        setIsTyping(false);
        return;
      }
    }

    // Set biometrics multilingual
    const hrvMatch = cmd.match(/(?:set|setze|update|actualizar|mettre)\s+hrv\s+(?:to|auf|a|à)?\s*(\d+)/i);
    if (hrvMatch) {
      const hrvVal = parseInt(hrvMatch[1]);
      const updatedProfile = { ...profile, metrics: { ...profile.metrics, hrv: hrvVal } };
      setProfile(updatedProfile);
      saveProfile(updatedProfile);
      setAgentMsg(`HRV aktualisiert auf: ${hrvVal} ms.`);
      setIsTyping(false);
      return;
    }

    const sleepMatch = cmd.match(/(?:set|setze|update|actualizar|mettre)\s+(?:sleep|schlaf|sueño|sommeil)\s+(?:to|auf|a|à)?\s*(\d+)/i);
    if (sleepMatch) {
      const sleepVal = parseInt(sleepMatch[1]);
      const updatedProfile = { ...profile, metrics: { ...profile.metrics, sleep: sleepVal } };
      setProfile(updatedProfile);
      saveProfile(updatedProfile);
      setAgentMsg(`Sleep Score aktualisiert auf: ${sleepVal}.`);
      setIsTyping(false);
      return;
    }

    // Jump to block by title query
    const startTitleMatch = cmd.match(/(?:start|starte|iniciar|commencer|activate|aktiviere|go\s+to|gehe\s+zu)\s+(.+)/i);
    if (startTitleMatch) {
      const titleQuery = startTitleMatch[1].trim().toLowerCase();
      if (!/block|pause|stop|weiter|resume|next|skip|done|fertig|ersetze|replace/.test(titleQuery)) {
        const foundIdx = blocks.findIndex(b => b.title.toLowerCase().includes(titleQuery));
        if (foundIdx !== -1) {
          setBlockIdx(foundIdx);
          setTimeLeft(blocks[foundIdx].duration);
          setTotalTime(blocks[foundIdx].duration);
          start();
          setAgentMsg(`Block "${blocks[foundIdx].title}" gestartet.`);
          setIsTyping(false);
          return;
        }
      }
    }

    // Fallback to Mistral Chat
    try {
      const res = await fetch('/api/mistral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: raw,
          systemPrompt: `Du bist der Pronoia AI Agent. Du kontrollierst das Bio-Performance-System. 
          Aktueller Zustand: Block: "${blocks[blockIdx]?.title || 'Keiner'}", HRV: ${profile.metrics.hrv}, Sleep: ${profile.metrics.sleep}. 
          Antworte präzise, kurz und direkt in der Sprache des Nutzers (deutsch, englisch, französisch, spanisch etc., max 18 Wörter). / Answer concisely in the user's language (max 18 words).`
        })
      });

      if (!res.ok) throw new Error("API failed");
      const data = await res.json();
      if (data.error || !data.choices?.[0]?.message?.content) {
        throw new Error("Mistral response error");
      }
      const answer = data.choices[0].message.content;
      setAgentMsg(answer);
      setDirectives(prev => [{
        text: answer,
        type: 'AI-Direct',
        ts: new Date().toLocaleTimeString()
      }, ...prev].slice(0, 3));

    } catch (err) {
      // Local Heuristic fallback based on keywords (Multilingual)
      let answer = "Consensus bestätigt: Systemstatus nominal. / System status nominal.";
      const hrvVal = profile?.metrics?.hrv || 72;

      if (/status|system|bereit|active|bereit|nominal/.test(cmd)) {
        answer = `Status: Nominal. HRV: ${hrvVal}ms. Alle 6 Subsysteme synchronisiert. / All subsystems sync'd.`;
      } else if (/focus|arbeit|deep|concentration|travail|trabajo/.test(cmd)) {
        answer = `A.01 Flow Architect: Kognitiver Fokus bei 94% Effizienz. / Cognitive focus at 94% efficiency.`;
      } else if (/stack|supplement|px|pill|dose|kapsel/.test(cmd)) {
        answer = `A.02 Fuel Scheduler: PX-V1 Peak-Absorption aktiv. Stoffwechsel nominal. / Absorption active.`;
      } else if (/schlaf|sleep|night|sunset|lit|sueno/.test(cmd)) {
        answer = `A.03 Circadian Guardian: Sunset-Rhythmus synchronisiert. Licht: Rotbereich. / Red spectrum sync.`;
      } else if (/hrv|recovery|pulse|regeneration|nsdr|pause/.test(cmd)) {
        answer = `A.04 Load Balancer: PNS-Dominanz bei ${hrvVal}ms HRV. Systemüberlastung gesperrt. / PNS active.`;
      } else if (/gewohnheit|habit|log|friction|vertrag|contract/.test(cmd)) {
        answer = `A.05 Habit Enforcer: Adhärenz bei 100%. Verhaltensvertrag stabil. / Adherence stable.`;
      } else {
        answer = `Orchestrator: Lokale Heuristik erfolgreich berechnet. / Local heuristics calculated.`;
      }

      setAgentMsg(answer);
      setDirectives(prev => [{
        text: answer,
        type: 'Local-Analytic',
        ts: new Date().toLocaleTimeString()
      }, ...prev].slice(0, 3));
    } finally {
      setIsTyping(false);
    }
  };

  return {
    blocks,
    blockIdx,
    timeLeft,
    totalTime,
    isRunning,
    profile,
    stack,
    frictionLogs,
    dataSources,
    agentMsg,
    isTyping,
    directives,
    calendar,
    selectedDate,
    currentMonth,
    formatDate,
    selectDate,
    prevMonth,
    nextMonth,
    addCalendarBlock,
    editCalendarBlock,
    deleteCalendarBlock,
    generateDayAI,
    generateMonthAI,
    chatWithDayAI,
    syncToActive,
    generateSkillMaterials,
    completeSkillSession,
    start,
    pause,
    toggleTimer,
    nextBlock,
    prevBlock,
    skipBlock,
    handleCommand,
    setAgentMsg,
    consumeStackItem,
    addStackItem,
    removeStackItem,
    updateStackItem,
    saveProfile,
    logFriction,
    loadProtocolQueue,
    addCustomBlock,
    uploadDataSource
  };
}
