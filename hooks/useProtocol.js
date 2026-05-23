import { useState, useEffect, useCallback, useRef } from 'react';
import { db, auth } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { PROTOCOL_DATABASE } from '@/lib/protocol_data';

export function useProtocol() {
  const [user, setUser] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [blockIdx, setBlockIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [profile, setProfile] = useState({
    xp: 0,
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

  const timerRef = useRef(null);

  // Auth & Load State
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Load from Firestore
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.profile) setProfile(data.profile);
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
            if (parsed.profile) setProfile(parsed.profile);
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
      const stateObj = { profile, blocks, blockIdx, stack, frictionLogs, directives, dataSources };
      if (user) {
        setDoc(doc(db, 'users', user.uid), stateObj, { merge: true });
      } else {
        localStorage.setItem('pronoia_protocol_state', JSON.stringify(stateObj));
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [profile, blocks, blockIdx, stack, frictionLogs, directives, dataSources, user]);

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
      let newXP = prev.xp + amount;
      let newLevel = prev.skillLevel;
      let newNextLevelXp = prev.nextLevelXp;

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

  // Calendar switches
  const loadProtocolQueue = (queueKey) => {
    if (PROTOCOL_DATABASE[queueKey]) {
      setBlocks(PROTOCOL_DATABASE[queueKey]);
      setBlockIdx(0);
      setTimeLeft(PROTOCOL_DATABASE[queueKey][0].duration);
      setTotalTime(PROTOCOL_DATABASE[queueKey][0].duration);
      setAgentMsg(`Protokoll geladen: ${queueKey.toUpperCase()}`);
    }
  };

  // Add Custom Block
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

  // Command input handler with Mistral Integration
  const handleCommand = async (raw) => {
    const cmd = raw.toLowerCase().trim();
    setAgentMsg("Analysiere Befehl...");
    setIsTyping(true);

    if (/pause|stop/.test(cmd)) {
      pause();
      setAgentMsg("Pausiert.");
      setIsTyping(false);
      return;
    }
    if (/weiter|resume|start/.test(cmd)) {
      start();
      setAgentMsg("Gestartet.");
      setIsTyping(false);
      return;
    }
    if (/skip|next/.test(cmd)) {
      skipBlock();
      setIsTyping(false);
      return;
    }
    if (/done|fertig/.test(cmd)) {
      completeBlock();
      setIsTyping(false);
      return;
    }

    try {
      const res = await fetch('/api/mistral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: raw, 
          systemPrompt: `Du bist der Pronoia AI Agent. Du kontrollierst das Bio-Performance-System. 
Aktueller Zustand: Block: "${blocks[blockIdx]?.title || 'Keiner'}", HRV: ${profile.metrics.hrv}, Sleep: ${profile.metrics.sleep}. 
Antworte präzise, kurz und imperial (deutsch, max 18 Wörter).` 
        })
      });
      const data = await res.json();
      const answer = data.choices[0].message.content;
      setAgentMsg(answer);
      
      setDirectives(prev => [{
        text: answer,
        type: 'AI-Direct',
        ts: new Date().toLocaleTimeString()
      }, ...prev].slice(0, 3));

    } catch (err) {
      setAgentMsg("Fehler bei AI-Kopplung. Lokale Analyse aktiv.");
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

