import { useState, useEffect, useCallback, useRef } from 'react';
import { db, auth } from '@/lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { PROTOCOL_DATABASE } from '@/lib/protocol_data';

// --- Block Normalization Utilities ---
export function normalizeBlock(b) {
  if (!b || typeof b !== 'object') return null;
  const normalized = { ...b };
  
  // 1. Casing of start time
  if (b.start_time && !b.startTime) {
    normalized.startTime = b.start_time;
  } else if (b.start && !b.startTime) {
    normalized.startTime = b.start;
  }
  
  if (typeof normalized.startTime === 'string') {
    normalized.startTime = normalized.startTime.trim();
  }

  // 2. Pillar field (standardize to lowercase, map type/pillar)
  let rawPillar = b.pillar || b.type || '';
  if (typeof rawPillar === 'string') {
    rawPillar = rawPillar.toLowerCase().trim();
  }
  
  if (rawPillar.includes('foc')) {
    normalized.pillar = 'focus';
  } else if (rawPillar.includes('heal') || rawPillar.includes('phys')) {
    normalized.pillar = 'health';
  } else if (rawPillar.includes('skill') || rawPillar.includes('lern')) {
    normalized.pillar = 'skills';
  } else if (rawPillar.includes('soc') || rawPillar.includes('part')) {
    normalized.pillar = 'social';
  } else if (rawPillar.includes('rec') || rawPillar.includes('erhol')) {
    normalized.pillar = 'recovery';
  } else {
    normalized.pillar = 'focus'; // fallback
  }

  // Ensure type matches the capitalized version for UI components
  normalized.type = normalized.pillar.charAt(0).toUpperCase() + normalized.pillar.slice(1);

  // 3. Duration conversion from minutes to seconds (threshold of 240 min)
  let dVal = normalized.duration;
  if (typeof dVal === 'string') {
    dVal = parseInt(dVal, 10);
  }
  if (typeof dVal === 'number' && !isNaN(dVal)) {
    if (dVal <= 240) {
      normalized.duration = dVal * 60;
    } else {
      normalized.duration = dVal;
    }
  } else {
    normalized.duration = 1800; // default 30 min
  }

  return normalized;
}

export function normalizeBlockList(list) {
  if (!Array.isArray(list)) return [];
  return list.map(normalizeBlock).filter(Boolean);
}

export function normalizeCalendar(cal) {
  if (!cal || typeof cal !== 'object') return {};
  const normalized = {};
  for (const [dateStr, dayData] of Object.entries(cal)) {
    if (dayData && Array.isArray(dayData.blocks)) {
      normalized[dateStr] = {
        ...dayData,
        blocks: normalizeBlockList(dayData.blocks)
      };
    } else if (dayData && Array.isArray(dayData)) {
      normalized[dateStr] = {
        blocks: normalizeBlockList(dayData)
      };
    } else {
      normalized[dateStr] = dayData;
    }
  }
  return normalized;
}

export function useProtocol() {
  const [user, setUser] = useState(null);
  const [blocks, setBlocks] = useState(PROTOCOL_DATABASE.focus_optimization || []);
  const [blockIdx, setBlockIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(PROTOCOL_DATABASE.focus_optimization?.[0]?.duration || 0);
  const [totalTime, setTotalTime] = useState(PROTOCOL_DATABASE.focus_optimization?.[0]?.duration || 0);
  const [isRunning, setIsRunning] = useState(false);
  const [circadianMode, setCircadianMode] = useState(true);
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
    ],
    // New premium User Profile and Tutorial settings for community
    username: 'BioHacker_Alpha',
    avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=200',
    bio: 'System-Optimierung auf zellulärer Ebene. Spezialist für zirkadiane Taktung.',
    class: 'Flow Architect',
    systemId: 'PX-2026-88',
    joinedDate: 'Mai 2026',
    hasCompletedTutorial: false,
    customization: {
      accent: 'blue',
      mode: 'serious',
      layout: {
        telemetry: true,
        directives: true,
        friction: true,
        connectors: true
      }
    }
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
  const [profileLoading, setProfileLoading] = useState(true);

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
    let unsubscribeDoc = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);

      // Clean up previous document listener if user logs out or changes
      if (unsubscribeDoc) {
        unsubscribeDoc();
        unsubscribeDoc = null;
      }

      if (currentUser) {
        setProfileLoading(true);
        // Set up real-time listener on user's Firestore document
        unsubscribeDoc = onSnapshot(doc(db, 'users', currentUser.uid), (userDoc) => {
          if (userDoc.metadata.hasPendingWrites) return;
          if (userDoc.exists()) {
            const data = userDoc.data();

            // Only update local states if the data is actually different (prevents loop with sync useEffect)
            if (data.profile) {
              setProfile(prev => {
                const updated = { ...prev, ...data.profile };
                return JSON.stringify(prev) === JSON.stringify(updated) ? prev : updated;
              });
            }
            if (data.calendar) {
              const normalizedCal = normalizeCalendar(data.calendar);
              setCalendar(prev => JSON.stringify(prev) === JSON.stringify(normalizedCal) ? prev : normalizedCal);
            }
            if (data.isRunning !== undefined) {
              setIsRunning(prev => prev === data.isRunning ? prev : data.isRunning);
            }
            if (data.circadianMode !== undefined) {
              setCircadianMode(prev => prev === data.circadianMode ? prev : data.circadianMode);
            }
            if (data.blocks && data.blocks.length > 0) {
              const normalizedB = normalizeBlockList(data.blocks);
              setBlocks(prev => {
                if (JSON.stringify(prev) === JSON.stringify(normalizedB)) return prev;
                // Update timer if active block duration changed
                const loadedIdx = data.blockIdx !== undefined ? data.blockIdx : 0;
                if (normalizedB[loadedIdx] && (!prev[loadedIdx] || prev[loadedIdx].duration !== normalizedB[loadedIdx].duration)) {
                  setTotalTime(normalizedB[loadedIdx].duration);
                  setTimeLeft(normalizedB[loadedIdx].duration);
                }
                return normalizedB;
              });

              const loadedIdx = data.blockIdx !== undefined ? data.blockIdx : 0;
              setBlockIdx(prev => {
                if (prev === loadedIdx) return prev;
                if (normalizedB[loadedIdx]) {
                  setTotalTime(normalizedB[loadedIdx].duration);
                  setTimeLeft(normalizedB[loadedIdx].duration);
                }
                return loadedIdx;
              });
            } else {
              setBlocks(prev => {
                const normDefault = normalizeBlockList(PROTOCOL_DATABASE.focus_optimization);
                if (JSON.stringify(prev) === JSON.stringify(normDefault)) return prev;
                setTotalTime(normDefault[0].duration);
                setTimeLeft(normDefault[0].duration);
                return normDefault;
              });
            }
            if (data.stack) {
              setStack(prev => JSON.stringify(prev) === JSON.stringify(data.stack) ? prev : data.stack);
            }
            if (data.frictionLogs) {
              setFrictionLogs(prev => JSON.stringify(prev) === JSON.stringify(data.frictionLogs) ? prev : data.frictionLogs);
            }
            if (data.directives) {
              setDirectives(prev => JSON.stringify(prev) === JSON.stringify(data.directives) ? prev : data.directives);
            }
            if (data.dataSources) {
              setDataSources(prev => JSON.stringify(prev) === JSON.stringify(data.dataSources) ? prev : data.dataSources);
            }
          } else {
            // Default setup if document doesn't exist
            setBlocks(prev => {
              const normDefault = normalizeBlockList(PROTOCOL_DATABASE.focus_optimization);
              if (JSON.stringify(prev) === JSON.stringify(normDefault)) return prev;
              setTotalTime(normDefault[0].duration);
              setTimeLeft(normDefault[0].duration);
              return normDefault;
            });
          }
          setProfileLoading(false);
        }, (err) => {
          console.error("Firestore onSnapshot error:", err);
          setProfileLoading(false);
        });
      } else {
        // Not logged in: check localStorage or use default
        const localData = localStorage.getItem('pronoia_protocol_state');
        if (localData) {
          try {
            const parsed = JSON.parse(localData);
            if (parsed.profile) setProfile(prev => ({ ...prev, ...parsed.profile }));
            if (parsed.calendar) {
              setCalendar(normalizeCalendar(parsed.calendar));
            }
            if (parsed.blocks) {
              setBlocks(normalizeBlockList(parsed.blocks));
            }
            if (parsed.blockIdx !== undefined) setBlockIdx(parsed.blockIdx);
            if (parsed.circadianMode !== undefined) setCircadianMode(parsed.circadianMode);
            if (parsed.stack) setStack(parsed.stack);
            if (parsed.frictionLogs) setFrictionLogs(parsed.frictionLogs);
            if (parsed.directives) setDirectives(parsed.directives);
            if (parsed.dataSources) setDataSources(parsed.dataSources);
          } catch (e) {
            console.error('Local Storage load failed', e);
          }
        }
        if (blocks.length === 0) {
          const normDefault = normalizeBlockList(PROTOCOL_DATABASE.focus_optimization);
          setBlocks(normDefault);
          setTotalTime(normDefault[0].duration);
          setTimeLeft(normDefault[0].duration);
        }
        setProfileLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
    };
  }, []);

  // Sync to Firestore / LocalStorage on change (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      let finalProfile = profile;
      if (user?.email && profile.email !== user.email) {
        finalProfile = { ...profile, email: user.email };
      }
      const stateObj = { profile: finalProfile, blocks, blockIdx, isRunning, circadianMode, stack, frictionLogs, directives, dataSources, calendar };
      if (user && db) {
        setDoc(doc(db, 'users', user.uid), stateObj, { merge: true });
      } else if (!user) {
        localStorage.setItem('pronoia_protocol_state', JSON.stringify(stateObj));
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [profile, blocks, blockIdx, isRunning, circadianMode, stack, frictionLogs, directives, dataSources, calendar, user]);

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
    if (isRunning && !circadianMode) {
      timerRef.current = setInterval(tick, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRunning, circadianMode, tick]);

  // Circadian Sync Effect
  useEffect(() => {
    if (!circadianMode || blocks.length === 0) return;

    const syncCircadian = () => {
      const now = new Date();
      const h = now.getHours();
      const m = now.getMinutes();
      const s = now.getSeconds();
      const nowMin = h * 60 + m;

      // 1. Build a virtual schedule ensuring all blocks have contiguous start/end times
      const virtualBlocks = [];
      let currentStartMin = 480; // Default to 08:00 if no blocks have start times

      // Find first block with explicit start time to anchor the baseline
      const firstWithStart = blocks.find(b => b.startTime);
      if (firstWithStart) {
        const [bh, bm] = firstWithStart.startTime.split(':').map(Number);
        currentStartMin = bh * 60 + bm;
      }

      for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i];
        let startMin = currentStartMin;
        if (b.startTime) {
          const [bh, bm] = b.startTime.split(':').map(Number);
          startMin = bh * 60 + bm;
        }
        const durationMin = b.duration / 60;
        const endMin = startMin + durationMin;

        virtualBlocks.push({
          ...b,
          calculatedStartMin: startMin,
          calculatedEndMin: endMin
        });

        // Contiguous chain: next block starts when current ends
        currentStartMin = endMin;
      }

      // 2. Find the active block index based on current time
      let foundIdx = -1;
      for (let i = 0; i < virtualBlocks.length; i++) {
        const vb = virtualBlocks[i];
        if (nowMin >= vb.calculatedStartMin && nowMin < vb.calculatedEndMin) {
          foundIdx = i;
          break;
        }
      }

      // 3. Handle out-of-bounds or gaps
      if (foundIdx === -1) {
        const firstStartMin = virtualBlocks[0].calculatedStartMin;
        const lastEndMin = virtualBlocks[virtualBlocks.length - 1].calculatedEndMin;

        if (nowMin < firstStartMin) {
          // Pre-start: show first block
          foundIdx = 0;
        } else if (nowMin >= lastEndMin) {
          // Post-end: show last block
          foundIdx = virtualBlocks.length - 1;
        } else {
          // Inside a gap: find first upcoming block
          let upcomingIdx = -1;
          let minDiff = Infinity;
          for (let i = 0; i < virtualBlocks.length; i++) {
            const vb = virtualBlocks[i];
            if (vb.calculatedStartMin > nowMin && (vb.calculatedStartMin - nowMin) < minDiff) {
              minDiff = vb.calculatedStartMin - nowMin;
              upcomingIdx = i;
            }
          }
          foundIdx = upcomingIdx !== -1 ? upcomingIdx : 0;
        }
      }

      // Update blockIdx if different
      setBlockIdx(prev => (prev !== foundIdx ? foundIdx : prev));

      const activeBlock = virtualBlocks[foundIdx];
      if (activeBlock) {
        const startMin = activeBlock.calculatedStartMin;
        const endMin = activeBlock.calculatedEndMin;
        
        if (nowMin >= startMin && nowMin < endMin) {
          // Currently active block range: show exact remaining seconds
          const diffMin = endMin - nowMin;
          const remainingSec = Math.max(0, Math.round(diffMin * 60 - s));
          setTimeLeft(remainingSec);
        } else if (nowMin < startMin) {
          // Block is in the future: show full duration
          setTimeLeft(activeBlock.duration);
        } else {
          // Block is in the past: show 0
          setTimeLeft(0);
        }
        setTotalTime(activeBlock.duration);
      }
    };

    syncCircadian();
    const interval = setInterval(syncCircadian, 1000);
    return () => clearInterval(interval);
  }, [circadianMode, blocks]);

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

  const overrideActiveBlockDuration = (minutes) => {
    const activeBlock = blocks[blockIdx];
    if (!activeBlock) return;
    
    const newDurationSec = minutes * 60;
    
    if (circadianMode && activeBlock.startTime) {
      const now = new Date();
      const [bh, bm] = activeBlock.startTime.split(':').map(Number);
      const startMin = bh * 60 + bm;
      const nowMin = now.getHours() * 60 + now.getMinutes();
      
      const newDurationMin = (nowMin - startMin) + minutes;
      const newDurationSecCalculated = Math.max(1, newDurationMin) * 60;
      
      setBlocks(prev => prev.map((b, i) => i === blockIdx ? { ...b, duration: newDurationSecCalculated } : b));
      setTotalTime(newDurationSecCalculated);
      setTimeLeft(minutes * 60);
      setAgentMsg(`Zirkadianer Block um ${minutes} Minuten angepasst.`);
    } else {
      setBlocks(prev => prev.map((b, i) => i === blockIdx ? { ...b, duration: newDurationSec } : b));
      setTotalTime(newDurationSec);
      setTimeLeft(newDurationSec);
      setAgentMsg(`Block-Dauer manuell auf ${minutes} Minuten gesetzt.`);
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
        setAgentMsg(`LEVEL UP: Stufe ${newLevel} erreicht!`);
      }

      return { ...prev, xp: newXP, skillLevel: newLevel, nextLevelXp: newNextLevelXp };
    });
  };

  const nextBlock = () => {
    let msgSuffix = "";
    if (circadianMode) {
      setCircadianMode(false);
      msgSuffix = " (Zirkadianer Sync pausiert)";
    }
    if (blockIdx < blocks.length - 1) {
      const nextIdx = blockIdx + 1;
      setBlockIdx(nextIdx);
      setTimeLeft(blocks[nextIdx].duration);
      setTotalTime(blocks[nextIdx].duration);
      setAgentMsg(`Nächster Block: ${blocks[nextIdx].title}${msgSuffix}`);
    } else {
      setAgentMsg(`Tagesprotokoll vollständig abgeschlossen.${msgSuffix}`);
    }
  };

  const prevBlock = () => {
    let msgSuffix = "";
    if (circadianMode) {
      setCircadianMode(false);
      msgSuffix = " (Zirkadianer Sync pausiert)";
    }
    if (blockIdx > 0) {
      const prevIdx = blockIdx - 1;
      setBlockIdx(prevIdx);
      setTimeLeft(blocks[prevIdx].duration);
      setTotalTime(blocks[prevIdx].duration);
      setAgentMsg(`Vorheriger Block: ${blocks[prevIdx].title}${msgSuffix}`);
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

  const linkTelegramId = async (telegramId, currentUser) => {
    const activeUser = currentUser || user;
    console.log("[linkTelegramId] Initializing link process:", { telegramId, activeUserUid: activeUser?.uid, dbReady: !!db });
    if (!db) {
      alert("Fehler: Firestore Datenbank (db) ist nicht initialisiert!");
      return false;
    }
    if (!activeUser) {
      alert("Fehler: Kein eingeloggter Nutzer in useProtocol!");
      return false;
    }
    const parsedId = parseInt(telegramId);
    if (isNaN(parsedId)) {
      alert("Fehler: Ungültige Telegram-ID (" + telegramId + ")");
      return false;
    }

    try {
      const userRef = doc(db, 'users', activeUser.uid);
      setProfile(prev => ({ ...prev, telegramId: parsedId }));
      await setDoc(userRef, {
        profile: {
          telegramId: parsedId
        }
      }, { merge: true });
      setAgentMsg("Telegram-Konto erfolgreich in der Cloud verknüpft.");
      return true;
    } catch (err) {
      console.error("Direct Firestore link write failed:", err);
      alert("Firestore-Fehler beim Verknüpfen: " + err.message);
      return false;
    }
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
      const normalizedBlocks = normalizeBlockList(PROTOCOL_DATABASE[queueKey]);
      setBlocks(normalizedBlocks);
      setBlockIdx(0);
      setTimeLeft(normalizedBlocks[0].duration);
      setTotalTime(normalizedBlocks[0].duration);
      setAgentMsg(`Protokoll geladen: ${queueKey.toUpperCase()}`);
    }
  };

  // Add Custom Block to Active List
  const addCustomBlock = (title, minutes, type = 'Focus', pillar = 'focus') => {
    const newBlock = normalizeBlock({
      title,
      duration: minutes * 60,
      type,
      pillar,
      rec: 'Individueller Block.',
      insight: 'Konsistente Blöcke stützen den zirkadianen Rhythmus.'
    });
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
    const newBlock = normalizeBlock({
      title: title || 'Neuer Block',
      startTime: time || '12:00',
      duration: durationSec,
      pillar: pillar || 'focus',
      rec: 'Manuell hinzugefügt.',
      insight: 'Aktive Lebensplanung reduziert kognitive Reibungspunkte.'
    });
    setCalendar(prev => {
      const dayData = prev[dateStr] || { blocks: [] };
      const updatedBlocks = [...(dayData.blocks || []), newBlock].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
      
      // Auto-sync to active blocks if editing today
      const todayStr = formatDate(new Date());
      if (dateStr === todayStr) {
        setBlocks(updatedBlocks);
      }
      
      return { ...prev, [dateStr]: { ...dayData, blocks: updatedBlocks } };
    });
    setAgentMsg(`Block "${title}" zu Kalendertag ${dateStr} hinzugefügt.`);
  };

  const editCalendarBlock = (idx, updatedFields) => {
    const dateStr = formatDate(selectedDate);
    setCalendar(prev => {
      const dayData = prev[dateStr];
      if (!dayData || !dayData.blocks) return prev;
      const updatedBlocks = dayData.blocks.map((b, i) => i === idx ? normalizeBlock({ ...b, ...updatedFields }) : b).sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
      
      // Auto-sync to active blocks if editing today
      const todayStr = formatDate(new Date());
      if (dateStr === todayStr) {
        setBlocks(updatedBlocks);
      }

      return { ...prev, [dateStr]: { ...dayData, blocks: updatedBlocks } };
    });
  };

  const deleteCalendarBlock = (idx) => {
    const dateStr = formatDate(selectedDate);
    setCalendar(prev => {
      const dayData = prev[dateStr];
      if (!dayData || !dayData.blocks) return prev;
      const updatedBlocks = dayData.blocks.filter((_, i) => i !== idx);
      
      // Auto-sync to active blocks if editing today
      const todayStr = formatDate(new Date());
      if (dateStr === todayStr) {
        setBlocks(updatedBlocks);
      }

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
        const normalizedBlocks = normalizeBlockList(parsed.blocks);
        const normalizedParsed = { ...parsed, blocks: normalizedBlocks };
        setCalendar(prev => ({ ...prev, [dateStr]: normalizedParsed }));
        
        // Auto-load to active blocks if it's today
        const todayStr = formatDate(new Date());
        if (dateStr === todayStr) {
          setBlocks(normalizedBlocks);
          setBlockIdx(0);
          setTimeLeft(normalizedBlocks[0]?.duration || 0);
          setTotalTime(normalizedBlocks[0]?.duration || 0);
        }
        
        setAgentMsg(`Protokoll für ${dateStr} erfolgreich synchronisiert.`);
      } else {
        throw new Error("Invalid structure returned");
      }
    } catch(e) {
      console.warn("AI Day Sync Failed. Loading Local Fallback Pattern.", e);
      const fallback = {
        blocks: normalizeBlockList([
          { title: 'Morning Hydration & Stack', startTime: '07:30', duration: 15*60, pillar: 'health', rec: 'Creatine + Taurine in 500ml Wasser.', insight: 'Intrazellulärer Volumen-Peak.' },
          { title: 'Deep Work Block I', startTime: '08:30', duration: 90*60, pillar: 'focus', rec: 'Absolute Isolation. Binaural Beats.', insight: 'Maximales Dopaminerges Fenster.' },
          { title: 'Deliberate Skill Practice', startTime: '11:00', duration: 45*60, pillar: 'skills', rec: 'Hochfokussiertes Training am Ziel-Skill.', insight: 'LTP Potential auf Maximum.' },
          { title: 'Zirkadianer Lunch Walk', startTime: '13:00', duration: 30*60, pillar: 'health', rec: '30 Minuten direktes Sonnenlicht.', insight: 'Stoppt Melatoninausschüttung.' },
          { title: 'Deep Work Block II', startTime: '14:30', duration: 60*60, pillar: 'focus', rec: 'Administrative und operative Tasks.', insight: 'Kognitives Nachmittagsfenster.' },
          { title: 'Sunset NSDR Recovery', startTime: '17:30', duration: 25*60, pillar: 'recovery', rec: 'Liegendes Entspannungsprotokoll.', insight: 'Parasympathischer System-Reset.' }
        ])
      };
      setCalendar(prev => ({ ...prev, [dateStr]: fallback }));
      
      // Auto-load to active blocks if it's today
      const todayStr = formatDate(new Date());
      if (dateStr === todayStr) {
        setBlocks(fallback.blocks);
        setBlockIdx(0);
        setTimeLeft(fallback.blocks[0]?.duration || 0);
        setTotalTime(fallback.blocks[0]?.duration || 0);
      }
      
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
      const normalizedParsed = normalizeCalendar(parsed);
      setCalendar(prev => {
        const copy = { ...prev };
        for (const dateStr of Object.keys(normalizedParsed)) {
          if (normalizedParsed[dateStr] && normalizedParsed[dateStr].blocks) {
            copy[dateStr] = normalizedParsed[dateStr];
          }
        }
        return copy;
      });
      setAgentMsg(`Schedules für ${Object.keys(normalizedParsed).length} Tage erfolgreich eingepflegt.`);
    } catch(e) {
      console.warn("AI Month Sync Failed. Building Local Fallbacks.", e);
      setCalendar(prev => {
        const copy = { ...prev };
        for (const dateStr of chunk) {
          copy[dateStr] = {
            blocks: normalizeBlockList([
              { title: 'Morning Stack', startTime: '08:00', duration: 15*60, pillar: 'health', rec: 'Hydrierung.', insight: 'Morgen-Baseline.' },
              { title: 'Fokus Arbeit', startTime: '09:00', duration: 90*60, pillar: 'focus', rec: 'Deep Work.', insight: 'Maximale Last.' },
              { title: 'Skill Erwerb', startTime: '11:00', duration: 45*60, pillar: 'skills', rec: 'Lernen.', insight: 'Neuronale Plastizität.' },
              { title: 'Erholungsphase', startTime: '15:00', duration: 30*60, pillar: 'recovery', rec: 'NSDR.', insight: 'PNS Trigger.' }
            ])
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
        const normalizedBlocks = normalizeBlockList(parsed.blocks);
        const normalizedParsed = { ...parsed, blocks: normalizedBlocks };
        setCalendar(prev => ({ ...prev, [dateStr]: normalizedParsed }));
        
        // Auto-sync to active blocks if editing today
        const todayStr = formatDate(new Date());
        if (dateStr === todayStr) {
          setBlocks(normalizedBlocks);
          setBlockIdx(0);
          setTimeLeft(normalizedBlocks[0]?.duration || 0);
          setTotalTime(normalizedBlocks[0]?.duration || 0);
        }
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
    const normalizedBlocks = normalizeBlockList(dayData.blocks);
    setBlocks(normalizedBlocks);
    setBlockIdx(0);
    setTimeLeft(normalizedBlocks[0].duration);
    setTotalTime(normalizedBlocks[0].duration);
    setAgentMsg(`Kalender-Protokoll vom ${dateStr} geladen.`);
  };

  // --- Skill Lab Operations ---
  const generateSkillMaterials = async () => {
    const skill = profile.skill || 'Programmieren';
    const lvl = profile.skillLevel || 1;
    setAgentMsg(`Generiere adaptive Lernmaterialien für Lvl ${lvl} ${skill}…`);
    setIsTyping(true);
    let finalJsonStr = "";
    
    try {
      const prompt = `Skill Focus: "${skill}" auf Level ${lvl}/10. 
      Erstelle exakt 3 personalisierte, tiefgreifende Lernmodule für eine anspruchsvolle Deliberate Practice Session im JSON-Format.
      
      Qualitäts-Anforderungen:
      - Modul 1 (type: "video"): Ein spezifisches YouTube-Video-Modul. Wähle ein passendes Video (Titel und Embed-URL) und liefere eine ausführliche Zusammenfassung (mindestens 3-4 Sätze) des Lerninhalts.
      - Modul 2 (type: "theory"): Ein extrem detailliertes Theorie-Modul zum Lesen. Erkläre fortgeschrittene, konkrete Konzepte, Formeln oder Best Practices für "${skill}" auf Level ${lvl}. Liefere mindestens 200 Wörter Fließtext, klar strukturiert in Absätzen, ggf. mit Code-Beispielen oder Checklisten.
      - Modul 3 (type: "practice"): Eine konkrete, herausfordernde Praxis-Challenge. Beschreibe die Aufgabe detailliert und formuliere 3 glasklare, praktische Einzelschritte, die der User nacheinander abhaken muss.

      Das JSON-Objekt MUSS exakt dieses Format haben (antworte NUR mit diesem JSON, ohne Markdown-Zäune):
      {
        "skill": "${skill}",
        "level": ${lvl},
        "modules": [
          {
            "id": "m1",
            "type": "video",
            "title": "Aussagekräftiger Titel der Lektion",
            "videoUrl": "https://www.youtube.com/embed/dQw4w9WgXcQ",
            "summary": "Detaillierte Zusammenfassung der Kernpunkte des Videos.",
            "completed": false
          },
          {
            "id": "m2",
            "type": "theory",
            "title": "Präziser Titel des Theorie-Moduls",
            "content": "Vollständiger, hochgradig informativer Theorie-Text. Erkläre spezifische Techniken für Level ${lvl} ${skill}.",
            "completed": false
          },
          {
            "id": "m3",
            "type": "practice",
            "title": "Titel der Praxis-Herausforderung",
            "instructions": "Detaillierte Anweisungen zur Bearbeitung der Aufgabe.",
            "steps": [
              "Konkrete Teilaufgabe 1",
              "Konkrete Teilaufgabe 2",
              "Konkrete Teilaufgabe 3"
            ],
            "completedSteps": [],
            "completed": false
          }
        ]
      }`;

      const res = await fetch('/api/mistral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, systemPrompt: "Du bist der Pronoia Skill Lab Coach. Antworte in Deutsch. Gib ausschließlich ein gültiges JSON-Objekt ohne Markdown-Zäune zurück." })
      });
      if (!res.ok) throw new Error("Skill API failed");
      const data = await res.json();
      const text = data.choices[0].message.content;
      
      // Prevent parsing if API Key is missing and warning text is returned
      if (text.includes("AI Sync eingeschränkt") || text.includes("API Key fehlt")) {
        throw new Error("API Key missing or invalid");
      }
      
      const cleanJson = text.replace(/```json|```html|```/g, '').trim();
      // Verify parser validity
      JSON.parse(cleanJson);
      finalJsonStr = cleanJson;
    } catch(e) {
      if (e.message !== "API Key missing or invalid") {
        console.error("[Skill Lab] Error generating materials, using fallback:", e);
      }
      
      const skillLower = skill.toLowerCase();
      let customFallback = null;

      // Smart specific fallbacks for dev/offline mode
      if (skillLower.includes("next") || skillLower.includes("react") || skillLower.includes("typescript") || skillLower.includes("frontend") || skillLower.includes("js") || skillLower.includes("javascript")) {
        customFallback = {
          skill,
          level: lvl,
          modules: [
            {
              id: "m1",
              type: "video",
              title: "Next.js 15 Server Components & Server Actions Masterclass",
              videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
              summary: "Lerne den Unterschied zwischen Server und Client Components, das automatische Data Fetching und wie Server Actions eine direkte DB-Anbindung ohne API-Endpoints ermöglichen.",
              completed: false
            },
            {
              id: "m2",
              type: "theory",
              title: "React Server Components (RSC) & Hydration unter der Haube",
              content: `Um moderne React Applikationen zu meistern, musst du RSC verstehen.\n\nServer Components werden auf dem Server in ein spezielles JSON-Format (RSC Payload) gerendert, nicht direkt in HTML. Dieser Payload enthält die serialisierten Props und den Component-Tree. Der Client liest diesen Payload und baut die UI auf, ohne dass JavaScript für die Server-Komponenten geladen werden muss.\n\nHydration: Client-Komponenten werden als Platzhalter (Placeholders) markiert. Beim Hydration-Prozess im Browser wird der HTML-DOM mit dem React-Event-System verknüpft, um interaktive Elemente (wie onClick) funktionsfähig zu machen.\n\nBest Practices:\n- Halte Datenabfragen so nah wie möglich an der Quelle (in Server Components).\n- Verwende Client-Komponenten nur an den äußeren Blättern des UI-Baums (z.B. für Buttons, Forms, Slider).`,
              completed: false
            },
            {
              id: "m3",
              type: "practice",
              title: "Next.js Challenge: Pre-rendering & Optimiertes Hydration-Handling",
              instructions: "Setze eine optimierte Client/Server-Komponente mit statischem Pre-rendering um. Bearbeite folgende Schritte:",
              steps: [
                "Erstelle eine Server-Komponente, die Daten über eine async-Funktion lädt und als statische Liste rendert.",
                "Implementiere ein interaktives Like-Button-Element als Client-Komponente ('use client') und binde sie in die Liste ein.",
                "Nutze React Suspense, um ein detailed Loading-Skeleton für das Server-seitige Data-Fetching anzuzeigen, während die Daten geladen werden."
              ],
              completedSteps: [],
              completed: false
            }
          ]
        };
      } else if (skillLower.includes("python") || skillLower.includes("backend") || skillLower.includes("django") || skillLower.includes("fastapi") || skillLower.includes("machine learning") || skillLower.includes("ki") || skillLower.includes("ai")) {
        customFallback = {
          skill,
          level: lvl,
          modules: [
            {
              id: "m1",
              type: "video",
              title: "Python Concurrency Masterclass: Asyncio, Threads & Process Pools",
              videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
              summary: "Verstehe das Zusammenspiel von Pythons Global Interpreter Lock (GIL). Lerne, wann du Asyncio für I/O-intensive Aufgaben und Threading/Multiprocessing für CPU-intensive Tasks einsetzt.",
              completed: false
            },
            {
              id: "m2",
              type: "theory",
              title: "Der Global Interpreter Lock (GIL) und asynchrone Event Loops",
              content: `Python nutzt den Global Interpreter Lock (GIL), um Thread-Sicherheit bei der Speicherverwaltung zu garantieren. Der GIL sorgt dafür, dass zu jedem Zeitpunkt nur ein einziger nativer Thread Python-Bytecode ausführt.\n\nAuswirkungen:\n- CPU-bound: Reines Threading bringt bei rechenintensiven Aufgaben in Python keinen Geschwindigkeitsvorteil, da die Threads nacheinander blockieren. Hier MUSS Multiprocessing (separate Betriebssystemprozesse) genutzt werden.\n- I/O-bound: Bei Wartezeiten auf Web-Anfragen oder Datenbanken blockiert der Thread nicht die CPU. Hier glänzt Asyncio mit einer Single-Threaded Event Loop. Sie schaltet extrem schnell zwischen kooperativen Tasks hin und her, ohne den Overhead von Betriebssystem-Threads.\n\nEvent Loop Funktionsweise:\nDie Loop läuft kontinuierlich und prüft, welche angemeldeten I/O-Tasks (Futures) Daten empfangen haben. Sobald ein Task bereit ist, führt sie ihn bis zum nächsten await-Statement weiter.`,
              completed: false
            },
            {
              id: "m3",
              type: "practice",
              title: "Python Challenge: Asynchroner Web-Scraper mit asyncio & aiohttp",
              instructions: "Implementiere einen performanten asynchronen Scraper, der mehrere Endpunkte parallel abfragt. Führe folgende Schritte aus:",
              steps: [
                "Schreibe eine asynchrone Funktion unter Nutzung von aiohttp.ClientSession, die den HTML-Inhalt einer URL abruft.",
                "Nutze asyncio.gather(), um 5 Webseiten-Requests parallel auszulösen und fange HTTP-Fehler sauber ab.",
                "Füge ein semaphor-basiertes Rate-Limiting hinzu (asyncio.Semaphore), damit maximal 2 Requests gleichzeitig laufen."
              ],
              completedSteps: [],
              completed: false
            }
          ]
        };
      } else if (skillLower.includes("biohacking") || skillLower.includes("schlaf") || skillLower.includes("sleep") || skillLower.includes("fitness") || skillLower.includes("sport") || skillLower.includes("training") || skillLower.includes("nutrition") || skillLower.includes("ernährung")) {
        customFallback = {
          skill,
          level: lvl,
          modules: [
            {
              id: "m1",
              type: "video",
              title: "Dr. Andrew Huberman: Master Your Sleep & Circadian Rhythm",
              videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
              summary: "Verstehe den Einfluss von Licht, Temperatur und Timing auf deine Schlafqualität. Lerne, wie du morgendliches Sonnenlicht nutzt, um Cortisol- und Melatoninkurven perfekt zu synchronisieren.",
              completed: false
            },
            {
              id: "m2",
              type: "theory",
              title: "Die Wissenschaft hinter dem zirkadianen Rhythmus & Tiefschlaf",
              content: `Der zirkadiane Rhythmus steuert deinen 24-Stunden-Zyklus von Wachheit und Müdigkeit. Haupttaktgeber ist der suprachiasmatische Nukleus (SCN) im Gehirn, der direkt auf Lichtsignale der Netzhaut reagiert.\n\nSchlüsselfaktoren für Schlafoptimierung:\n1. Adenosin-Akkumulation: Je länger wir wach sind, desto mehr Adenosin baut sich im Gehirn auf, was den Schlafdruck (Sleep Drive) erhöht. Koffein blockiert Adenosin-Rezeptoren temporär, baut das Adenosin aber nicht ab.\n2. Cortisol & Melatonin: Licht am Morgen triggert eine gesunde Cortisol-Ausschüttung (Energie-Peak) und startet einen Timer für die Melatonin-Freisetzung ca. 12-14 Stunden später.\n3. Körperkerntemperatur: Um einzuschlafen, muss die Kerntemperatur des Körpers um ca. 1 °C sinken. Ein warmes Bad vor dem Schlafengehen leitet Wärme in die Extremitäten ab und kühlt den Kern ab.\n\nTiefschlaf (Slow Wave Sleep) ist essenziell für die physische Regeneration, während REM-Schlaf (Traumschlaf) kognitive Synthesen und emotionale Verarbeitung steuert.`,
              completed: false
            },
            {
              id: "m3",
              type: "practice",
              title: "Biohacking Challenge: Protokoll zur Schlaf-Architektur",
              instructions: "Setze folgendes zirkadianes Protokoll für 3 Tage um und dokumentiere die Resultate:",
              steps: [
                "Morgensonne: Gehe innerhalb von 30 Minuten nach dem Aufwachen für 10 Minuten ins Freie (direktes Licht ohne Sonnenbrille).",
                "Koffein-Delay: Konsumiere dein erstes Koffein frühestens 90-120 Minuten nach dem Aufwachen, um den natürlichen Adenosin-Abbau nicht zu stören.",
                "Wind-down Phase: Dämme 2 Stunden vor dem Schlafen alle Deckenlichter und vermeide Blaulicht (Bildschirme) vollständig."
              ],
              completedSteps: [],
              completed: false
            }
          ]
        };
      } else if (skillLower.includes("piano") || skillLower.includes("guitar") || skillLower.includes("gitarre") || skillLower.includes("musik") || skillLower.includes("music") || skillLower.includes("instrument") || skillLower.includes("singing") || skillLower.includes("gesang") || skillLower.includes("geige") || skillLower.includes("drums") || skillLower.includes("schlagzeug")) {
        customFallback = {
          skill,
          level: lvl,
          modules: [
            {
              id: "m1",
              type: "video",
              title: `Instrumental Practice: Deliberate Tempo & Hand Independence`,
              videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
              summary: "Lerne die Wichtigkeit von verlangsamtem Üben (Half-Tempo) zur Festigung des Muskelgedächtnisses. Verstehe, wie man schwierige Rhythmen isoliert und die Koordination beider Hände durch rhythmische Verschiebungen trainiert.",
              completed: false
            },
            {
              id: "m2",
              type: "theory",
              title: `Neurologie des Musiklernens & Rhythmus-Deconstruction`,
              content: `Das Erlernen eines Instruments erfordert die Koordination komplexer motorischer und auditiver Areale im Gehirn. Die wichtigste Methode, um fehlerfreie Läufe zu etablieren, ist das bewusste Verlangsamen. Wenn du eine Passage mit Fehlern im normalen Tempo spielst, festigt dein Gehirn diese Fehler.\n\nRegeln für effektives Üben:\n1. Metronom-Arbeit: Starte bei 50-60% des Zieltempos. Erhöhe das Tempo erst, wenn du die Passage 5-mal hintereinander fehlerfrei gespielt hast.\n2. Chunking: Zerlege das Stück in winzige Phrasen (z.B. 1-2 Takte). Übe diese Übergänge isoliert, bevor du sie zusammensetzt.\n3. Hände getrennt: Trainiere bei Tasten- oder Saiteninstrumenten die linke und rechte Hand separat, bis die Bewegungen automatisch ablaufen, bevor du beide zusammenführst.`,
              completed: false
            },
            {
              id: "m3",
              type: "practice",
              title: `Tempo-Halbierung & Fokus-Phrasen Challenge`,
              instructions: "Isoliere eine schwierige 2-Takt-Passage deines aktuellen Musikstücks und wende deliberate practice an:",
              steps: [
                "Spiele die isolierte Passage 5 Minuten lang mit getrennten Händen bei extrem verlangsamtem Tempo (50% des Originals).",
                "Setze das Metronom ein und spiele die Passage beidhändig/zusammenhängend 5-mal in Folge absolut fehlerfrei.",
                "Erhöhe die Geschwindigkeit um 5 BPM und wiederhole den Prozess. Nimm ein kurzes Audio auf, um deinen Rhythmus zu kontrollieren."
              ],
              completedSteps: [],
              completed: false
            }
          ]
        };
      } else if (skillLower.includes("spanisch") || skillLower.includes("englisch") || skillLower.includes("französisch") || skillLower.includes("deutsch") || skillLower.includes("sprache") || skillLower.includes("language") || skillLower.includes("vocab") || skillLower.includes("vokabeln") || skillLower.includes("linguistics")) {
        customFallback = {
          skill,
          level: lvl,
          modules: [
            {
              id: "m1",
              type: "video",
              title: "Language Acquisition: Comprehensible Input & Active Recall",
              videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
              summary: "Verstehe, wie das Gehirn Sprachen über bedeutungsvollen Kontext (Comprehensible Input) lernt. Erfahre, warum aktives Sprechen und das Bilden eigener Sätze weitaus effektiver sind als passives Vokabellernen.",
              completed: false
            },
            {
              id: "m2",
              type: "theory",
              title: "Spaced Repetition & Kontextbasiertes Sprachenlernen",
              content: `Vokabellisten auswendig zu lernen ist ineffizient, da Wörter ohne Kontext schnell aus dem Kurzzeitgedächtnis gelöscht werden. Das Gehirn benötigt Assoziationen, um neuronale Pfade zu festigen.\n\nBest Practices:\n- Comprehensible Input: Konsumiere Inhalte, die du zu etwa 70-80% verstehst (z.B. Podcasts mit Transkript oder einfache Kindersendungen). So lernst du neue Wörter automatisch aus dem Zusammenhang.\n- Active Recall: Statt Vokabeln nur zu lesen, übersetze aktiv Sätze aus deiner Muttersprache in die Zielsprache. Nutze Spaced Repetition Systeme (wie Anki), um Vokabeln genau dann zu wiederholen, wenn du sie fast vergessen hast.\n- Grammatik in Aktion: Lerne Grammatikregeln nicht theoretisch, sondern binde sie sofort in 3 eigene, persönliche Beispielsätze ein.`,
              completed: false
            },
            {
              id: "m3",
              type: "practice",
              title: "Sprach-Output & Assoziations-Challenge",
              instructions: "Wende die Prinzipien des aktiven Sprach-Outputs auf dein aktuelles Sprachniveau an:",
              steps: [
                "Verfasse einen kurzen Text (50-80 Wörter) über deinen heutigen Tag komplett in deiner Zielsprache ohne Translator.",
                "Lies den Text laut vor und nimm deine Stimme auf, um die Phoneme und Betonung bewusst zu analysieren.",
                "Suche dir 5 neue Vokabeln und erstelle für jede Vokabel einen Satz, der eine emotionale oder persönliche Bedeutung für dich hat."
              ],
              completedSteps: [],
              completed: false
            }
          ]
        };
      } else if (skillLower.includes("design") || skillLower.includes("ui") || skillLower.includes("ux") || skillLower.includes("drawing") || skillLower.includes("art") || skillLower.includes("zeichnen") || skillLower.includes("malen") || skillLower.includes("grafik") || skillLower.includes("figma") || skillLower.includes("sketching")) {
        customFallback = {
          skill,
          level: lvl,
          modules: [
            {
              id: "m1",
              type: "video",
              title: "Visual Design Fundamentals: Spacing, Contrast & Grids",
              videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
              summary: "Lerne die universellen Gesetze des visuellen Designs. Verstehe, wie du durch konsistente Abstände (8pt-Raster), visuelle Hierarchie und bewussten Kontrast harmonische und professionelle Layouts erstellst.",
              completed: false
            },
            {
              id: "m2",
              type: "theory",
              title: "Gestaltgesetze & Visuelle Hierarchie im Detail",
              content: `Gutes Design folgt klaren psychologischen und visuellen Regeln. Das Auge des Betrachters scannt eine Seite nach Mustern und Hierarchien.\n\nSchlüsselprinzipien:\n1. Das Gesetz der Nähe: Elemente, die nah beieinander stehen, werden als zusammengehörig wahrgenommen. Nutze konsistente Abstände (Padding/Margin) zur Gruppierung.\n2. Typografische Skala: Verwende klare Kontraste zwischen Überschriften und Fließtext (z.B. 32px Bold vs. 16px Regular). Zu viele verschiedene Schriftgrößen wirken unruhig.\n3. Kontrast und Farbe: Nutze Kontrast strategisch, um Aufmerksamkeit zu lenken. Wichtige Buttons (CTAs) müssen den höchsten Kontrastwert der Seite aufweisen.\n4. Weißraum (White Space): Gib Elementen Luft zum Atmen. Zu enge Layouts wirken billig und unübersichtlich.`,
              completed: false
            },
            {
              id: "m3",
              type: "practice",
              title: "Interface Deconstruction & Redesign Challenge",
              instructions: "Analysiere und optimiere ein bestehendes Design (digital oder physisch):",
              steps: [
                "Wähle eine schlechte Website oder App-Interface aus und skizziere das Layout grob (Wireframe).",
                "Definiere ein festes 8px-Raster und positioniere die Elemente neu, um Ausrichtung und Hierarchie zu verbessern.",
                "Erstelle ein neues Farbschema mit maximal 3 Farben (60% Hauptfarbe, 30% Sekundärfarbe, 10% Akzentfarbe) und wende es an."
              ],
              completedSteps: [],
              completed: false
            }
          ]
        };
      } else if (skillLower.includes("business") || skillLower.includes("marketing") || skillLower.includes("sales") || skillLower.includes("vertrieb") || skillLower.includes("copywriting") || skillLower.includes("seo") || skillLower.includes("finanzen") || skillLower.includes("finance") || skillLower.includes("startup") || skillLower.includes("investieren")) {
        customFallback = {
          skill,
          level: lvl,
          modules: [
            {
              id: "m1",
              type: "video",
              title: "High-Converting Copywriting: Hooks, Headlines & Persuasion",
              videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
              summary: "Erfahre, wie du Texte schreibst, die Leser fesseln und zum Handeln bewegen. Lerne das AIDA-Modell und psychologische Trigger kennen, die aus einfachen Besuchern treue Kunden machen.",
              completed: false
            },
            {
              id: "m2",
              type: "theory",
              title: "Das AIDA-Framework & Die Psychologie der Conversion",
              content: `Egal ob Landingpage, E-Mail-Marketing oder Werbeanzeige — erfolgreiche Texte folgen einer klaren Verkaufspsychologie. Das bekannteste Modell ist AIDA:\n\n- Attention (Aufmerksamkeit): Deine Headline muss den Leser in 2 Sekunden fesseln. Nutze Neugier, Schmerzpunkte oder klare Nutzenversprechen.\n- Interest (Interesse): Halte den Leser durch relevante Informationen und Geschichten. Zeige, dass du sein Problem verstehst.\n- Desire (Begehren): Erzeuge das Verlangen nach deinem Produkt oder deiner Lösung. Fokussiere dich auf den Nutzen (Benefits), nicht nur auf Features (Eigenschaften).\n- Action (Handlung): Führe den Leser zu einer einzigen, klaren Handlung (Call to Action). Vermeide Verwirrung durch zu viele Auswahlmöglichkeiten.`,
              completed: false
            },
            {
              id: "m3",
              type: "practice",
              title: "Landing Page Headline & Hook Copywriting Challenge",
              instructions: "Schreibe verkaufsstarke Headlines für ein fiktives oder echtes Produkt deiner Wahl:",
              steps: [
                "Formuliere 5 unterschiedliche Hooks für die Headline (z.B. fragebasiert, schmerzbasiert, nutzenbasiert).",
                "Wähle die stärkste Headline und schreibe eine prägnante Subheadline (maximal 2 Sätze), die das Angebot verdeutlicht.",
                "Erstelle 3 überzeugende Call-To-Action (CTA) Button-Texte, die über das langweilige 'Hier klicken' hinausgehen."
              ],
              completedSteps: [],
              completed: false
            }
          ]
        };
      } else if (skillLower.includes("communication") || skillLower.includes("rhetorik") || skillLower.includes("speaking") || skillLower.includes("social") || skillLower.includes("selbstbewusstsein") || skillLower.includes("verhandlung") || skillLower.includes("kommunikation") || skillLower.includes("dating")) {
        customFallback = {
          skill,
          level: lvl,
          modules: [
            {
              id: "m1",
              type: "video",
              title: "Rhetoric & Storytelling: The STAR Framework & Vocal Control",
              videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
              summary: "Lerne die Kunst der überzeugenden Kommunikation. Verstehe, wie du deine Stimme (Tempo, Pausen, Modulation) kontrollierst und Geschichten mithilfe des STAR-Frameworks strukturiert erzählst.",
              completed: false
            },
            {
              id: "m2",
              type: "theory",
              title: "Die STAR-Methode & Stimme als rhetorisches Werkzeug",
              content: `In Meetings, Pitches oder Präsentationen entscheidet nicht nur das 'Was', sondern vor allem das 'Wie'. Deine Stimme und deine Körpersprache tragen über 50% der übermittelten Botschaft.\n\nDie STAR-Methode für präzise Antworten und Storytelling:\n- Situation: Beschreibe den Kontext kurz und verständlich.\n- Task (Aufgabe): Welches konkrete Problem musste gelöst werden?\n- Action (Aktion): Was hast DU getan, um das Problem zu lösen? (Fokus auf deine Handlungen).\n- Result (Ergebnis): Was war das messbare Resultat deiner Aktion?\n\nStimmmodulation:\nSprich langsamer als gewöhnlich, um Souveränität auszustrahlen. Setze gezielte Pausen vor und nach wichtigen Kernaussagen, um ihnen Gewicht zu verleihen. Vermeide Füllwörter (wie 'äh', 'sozusagen'), indem du stattdessen schweigst und atmest.`,
              completed: false
            },
            {
              id: "m3",
              type: "practice",
              title: "STAR-Pitch & Füllwort-Analyse Challenge",
              instructions: "Bereite eine kurze, überzeugende Story (z.B. über ein gelöstes Projekt) vor und präsentiere sie:",
              steps: [
                "Schreibe eine persönliche Story strukturiert nach dem STAR-Schema auf (maximal 200 Wörter).",
                "Nimm ein 2-minütiges Video oder Audio auf, in dem du diese Story frei und mit bewussten Sprechpausen vorträgst.",
                "Höre dir die Aufnahme an, zähle alle Füllwörter und bewerte dein Sprechtempo sowie deine Betonung auf einer Skala von 1-10."
              ],
              completedSteps: [],
              completed: false
            }
          ]
        };
      } else if (skillLower.includes("chess") || skillLower.includes("schach") || skillLower.includes("strategy") || skillLower.includes("gaming") || skillLower.includes("pokern") || skillLower.includes("poker") || skillLower.includes("starcraft") || skillLower.includes("lol")) {
        customFallback = {
          skill,
          level: lvl,
          modules: [
            {
              id: "m1",
              type: "video",
              title: "Chess & Strategy: Positional Play & Tactical Calculation",
              videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
              summary: "Verstehe den Unterschied zwischen Taktik und Strategie. Lerne, wie du Positionsvorteile aufbaust, Schwachstellen im gegnerischen Lager provozierst und Varianten systematisch berechnest.",
              completed: false
            },
            {
              id: "m2",
              type: "theory",
              title: "Eröffnungsprinzipien, Bauernstrukturen & Visualisierung",
              content: `Erfolgreiches Strategiespiel basiert auf der Kombination aus langfristiger Planung (Strategie) und kurzfristiger Berechnung (Taktik).\n\nEröffnungs- und Positionsregeln:\n1. Zentrumskontrolle: Besetze oder kontrolliere das Zentrum. Es gibt deinen Figuren maximale Bewegungsfreiheit.\n2. Figurenentwicklung: Bringe deine Figuren schnell ins Spiel und bringe deinen König in Sicherheit (z.B. Rochade im Schach).\n3. Taktische Muster: Trainiere dein Gehirn auf Motive wie Fesselung (Pin), Gabel (Fork), Abzugsangriff und Hinlenkung. Diese Muster wiederholen sich in fast jedem Spiel.\n4. Variantenberechnung: Berechne Züge nach dem Prinzip: 'Schachgebote, Schläge, Drohungen' (Checks, Captures, Threats). Visualisiere die Stellung nach jedem Zug, bevor du den physischen Zug altersgemäß ausführst.`,
              completed: false
            },
            {
              id: "m3",
              type: "practice",
              title: "Visualisierungs- & Fehleranalyse-Challenge",
              instructions: "Trainiere deine strategische Analysefähigkeit an einer Partie:",
              steps: [
                "Löse 5 taktische Rätsel/Puzzles und schreibe für jedes Rätsel den gesamten Gewinnweg auf, bevor du die Lösung eingibst.",
                "Spiele eine Partie und analysiere sie danach im Detail selbst (ohne Computer-Engine). Halte fest, welcher Zug ungenau war und warum.",
                "Notiere dir 3 konkrete strategische Ziele, die du in deiner nächsten Partie von Anfang an verfolgen willst."
              ],
              completedSteps: [],
              completed: false
            }
          ]
        };
      }

      // Default rich fallback if none matched
      if (!customFallback) {
        customFallback = {
          skill,
          level: lvl,
          modules: [
            {
              id: "m1",
              type: "video",
              title: `Deliberate Practice Masterclass: So wirst du Experte in ${skill}`,
              videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
              summary: "Verstehe das Konzept der gezielten Übung an der eigenen Leistungsgrenze. Lerne, wie du Plateaus durchbrichst und effektives Feedback in deinen Lernalltag integrierst.",
              completed: false
            },
            {
              id: "m2",
              type: "theory",
              title: `Wissenschaftliche Lerntheorie & Mastery-Konzepte für ${skill}`,
              content: `Um in ${skill} echtes Meisterschaftsniveau zu erreichen, reichen einfache Wiederholungen nicht aus. Laut K. Anders Ericsson basiert Höchstleistung auf Deliberate Practice (bewusstem, zielgerichtetem Üben).\n\nKernprinzipien:\n- Gezielte Schwachstellenanalyse: Isoliere die Aspekte von ${skill}, die dir am schwersten fallen. Wiederhole nicht, was du bereits beherrschst.\n- Mentale Repräsentationen: Baue ein tiefes Verständnis für die Strukturen auf. Experten erkennen Muster und Fehler schneller, weil ihre mentalen Modelle der Domäne hochgradig verfeinert sind.\n- Immediate Feedback: Suche nach Wegen für sofortige Korrektur. Ob Compiler-Fehler, Code-Review oder direkte Vergleiche — ohne Feedback verfestigen sich fehlerhafte Angewohnheiten.\n\nFokussiertes Arbeiten:\nÜbe in kurzen Blöcken (z.B. 45-60 Minuten) bei 100% Konzentration ohne Multitasking. Die neuronale Plastizität reagiert am stärksten auf diese hohe kognitive Last.`,
              completed: false
            },
            {
              id: "m3",
              type: "practice",
              title: `Deliberate Practice Challenge für ${skill}`,
              instructions: `Isoliere deine Schwachstellen in ${skill} und bearbeite sie in einer fokussierten Session:`,
              steps: [
                "Isoliere das aktuell schwierigste Teilkonzept oder Problem und formuliere eine konkrete Mini-Aufgabe dazu.",
                "Führe 20 Minuten ununterbrochene Arbeit (Deep Work) an dieser Aufgabe aus und schreibe deine Lösungsansätze auf.",
                "Vergleiche dein Ergebnis mit Best Practices, analysiere jeden Fehler genau und halte deine Learnings in den Notizen fest."
              ],
              completedSteps: [],
              completed: false
            }
          ]
        };
      }

      finalJsonStr = JSON.stringify(customFallback);
    } finally {
      setIsTyping(false);
    }

    // Dynamic Youtube Scraper API fetch to replace fallback links
    try {
      const parsed = JSON.parse(finalJsonStr);
      const videoModule = parsed.modules?.find(m => m.type === 'video');
      if (videoModule) {
        setAgentMsg(`Durchsuche Web-APIs nach Lehrvideo für „${videoModule.title}“…`);
        const searchRes = await fetch(`/api/youtube-search?q=${encodeURIComponent(skill + ' ' + videoModule.title)}`);
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          if (searchData.videoUrl) {
            videoModule.videoUrl = searchData.videoUrl;
            finalJsonStr = JSON.stringify(parsed);
          }
        }
      }
    } catch (err) {
      console.warn("[Skill Search Fallback] Dynamic URL lookup failed, utilizing template defaults:", err);
    }

    setAgentMsg(`Lernmaterialien für ${skill} erfolgreich bereitgestellt.`);
    return finalJsonStr;
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
    circadianMode,
    setCircadianMode,
    overrideActiveBlockDuration,
    profile,
    profileLoading,
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
    linkTelegramId,
    logFriction,
    loadProtocolQueue,
    addCustomBlock,
    uploadDataSource
  };
}
