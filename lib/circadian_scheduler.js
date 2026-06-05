/**
 * Circadian-Aware Peak Scheduler for Pronoia Life OS
 * Client-side rule-based scheduling algorithm (Offline-First Fallback)
 */

export function calculateCircadianPeaks(chronotype, wakeTimeStr) {
  const [wh, wm] = (wakeTimeStr || "07:00").split(":").map(Number);
  const wakeMin = wh * 60 + wm;

  // Peak ranges relative to wake time (in minutes)
  let peaks = {
    cognitive1: { start: 120, end: 330 }, // 2h to 5.5h
    physical: { start: 510, end: 690 },    // 8.5h to 11.5h
    cognitive2: { start: 780, end: 870 }   // 13h to 14.5h
  };

  if (chronotype === 'evening') {
    peaks = {
      cognitive1: { start: 180, end: 390 }, // 3h to 6.5h
      physical: { start: 540, end: 720 },    // 9h to 12h
      cognitive2: { start: 780, end: 900 }   // 13h to 15h
    };
  } else if (chronotype === 'balanced') {
    peaks = {
      cognitive1: { start: 150, end: 360 }, // 2.5h to 6h
      physical: { start: 540, end: 720 },    // 9h to 12h
      cognitive2: { start: 780, end: 870 }   // 13h to 14.5h
    };
  }

  const parseMinToTimeStr = (totalMin) => {
    const h = Math.floor((totalMin % 1440) / 60);
    const m = Math.floor(totalMin % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  return {
    cog1: {
      startMin: wakeMin + peaks.cognitive1.start,
      endMin: wakeMin + peaks.cognitive1.end,
      startTime: parseMinToTimeStr(wakeMin + peaks.cognitive1.start),
      endTime: parseMinToTimeStr(wakeMin + peaks.cognitive1.end)
    },
    phys: {
      startMin: wakeMin + peaks.physical.start,
      endMin: wakeMin + peaks.physical.end,
      startTime: parseMinToTimeStr(wakeMin + peaks.physical.start),
      endTime: parseMinToTimeStr(wakeMin + peaks.physical.end)
    },
    cog2: {
      startMin: wakeMin + peaks.cognitive2.start,
      endMin: wakeMin + peaks.cognitive2.end,
      startTime: parseMinToTimeStr(wakeMin + peaks.cognitive2.start),
      endTime: parseMinToTimeStr(wakeMin + peaks.cognitive2.end)
    }
  };
}

export function generateOptimizedDaySchedule(chronotype, wakeTimeStr, bedTimeStr, dayName, liabilitiesList, goals, showerPreference = 'morning', shoppingPreference = 'weekly') {
  const [wh, wm] = (wakeTimeStr || "07:00").split(":").map(Number);
  const [bh, bm] = (bedTimeStr || "23:00").split(":").map(Number);
  
  const wakeMin = wh * 60 + wm;
  let bedMin = bh * 60 + bm;
  if (bedMin < wakeMin) {
    bedMin += 1440; // overnight
  }

  // Filter liabilities for today
  const dailyLiabilities = (liabilitiesList || [])
    .filter(l => l.day === dayName)
    .map(l => {
      const [sh, sm] = l.startTime.split(":").map(Number);
      const [eh, em] = l.endTime.split(":").map(Number);
      let sMin = sh * 60 + sm;
      let eMin = eh * 60 + em;
      if (eMin < sMin) eMin += 1440;
      return { ...l, startMin: sMin, endMin: eMin };
    });

  // Calculate circadian peak windows
  const peaks = calculateCircadianPeaks(chronotype, wakeTimeStr);

  const finalBlocks = [];

  const addBlockIfFits = (startMin, endMin, blockData) => {
    // Check if overlaps with any liability
    let fits = true;
    let adjustedStart = startMin;
    let adjustedEnd = endMin;

    for (const l of dailyLiabilities) {
      if (adjustedStart < l.endMin && adjustedEnd > l.startMin) {
        // Overlap! Try to slide or shrink
        if (adjustedStart < l.startMin && l.startMin - adjustedStart >= 30) {
          // Fits before liability
          adjustedEnd = l.startMin;
        } else if (l.endMin < adjustedEnd && adjustedEnd - l.endMin >= 30) {
          // Fits after liability
          adjustedStart = l.endMin;
        } else {
          fits = false;
          break;
        }
      }
    }

    if (fits && (adjustedEnd - adjustedStart) >= 20) {
      const formatTime = (totalMin) => {
        const h = Math.floor((totalMin % 1440) / 60);
        const m = Math.floor(totalMin % 60);
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      };

      finalBlocks.push({
        ...blockData,
        startTime: formatTime(adjustedStart),
        duration: (adjustedEnd - adjustedStart) * 60
      });
      return true;
    }
    return false;
  };

  // 1. Add sleeping block (bedTime to wakeTime)
  // Since we render from waking up, the sleep block goes at the end of the day
  const sleepDurationMin = 1440 - bedMin + wakeMin;

  // 2. Add liabilities first
  dailyLiabilities.forEach(l => {
    finalBlocks.push({
      id: l.id,
      title: l.title,
      startTime: l.startTime,
      duration: (l.endMin - l.startMin) * 60,
      pillar: 'social',
      type: 'Social',
      liability: true,
      day: l.day,
      rec: 'Externe Blockade. Versuche dich mental abzugrenzen.',
      insight: 'Termine schränken dein circadianes Performance-Fenster ein.'
    });
  });

  // 3. Try placing Cognitive Peak I (Deep Work)
  const hasSportToday = ['Dienstag', 'Donnerstag', 'Samstag'].includes(dayName) && (goals.sportSessions || 3) > 0;
  const isDeepWorkDay = ['Montag', 'Mittwoch', 'Freitag', 'Samstag'].includes(dayName);

  if (isDeepWorkDay) {
    addBlockIfFits(peaks.cog1.startMin, peaks.cog1.endMin, {
      title: 'Deep Work (Cognitive Peak I)',
      pillar: 'focus',
      type: 'Focus',
      rec: 'Koffein + L-Theanin Stack (z. B. grüner Tee / Smart Nootropic).',
      insight: 'Deine kognitive Leistungsfähigkeit ist jetzt biologisch auf dem Höchststand.'
    });
  } else {
    addBlockIfFits(peaks.cog1.startMin, peaks.cog1.startMin + 120, {
      title: 'Skill Acquisition (Learning Block)',
      pillar: 'skills',
      type: 'Skills',
      rec: 'Alpha-GPC + Oxiracetam zur Unterstützung der Synaptischen Plastizität.',
      insight: 'Lernen in Phasen gesteigerter Neuroplastizität maximiert Behaltenskraft.'
    });
  }

  // 4. Try placing Physical Peak (Sport / Gym)
  if (hasSportToday) {
    addBlockIfFits(peaks.phys.startMin, peaks.phys.endMin, {
      title: 'Physical Training (Sport & Kraft)',
      pillar: 'health',
      type: 'Health',
      rec: 'Elektrolyte + Pre-Workout Aminosäuren Stack zur Hydration.',
      insight: 'Körpertemperatur und Muskelkoordination sind jetzt auf dem circadianen Zenit.'
    });
    if (showerPreference === 'sport') {
      addBlockIfFits(peaks.phys.endMin, peaks.phys.endMin + 30, {
        title: 'Shower & Post-Workout Recovery',
        pillar: 'recovery',
        type: 'Recovery',
        rec: 'Duschen + Proteine & Kohlenhydrate zur schnellen Regeneration.',
        insight: 'Sofortige Nährstoffzufuhr und Hygiene nach dem Training optimiert den Muskelaufbau.'
      });
    }
  } else {
    addBlockIfFits(peaks.phys.startMin, peaks.phys.startMin + 90, {
      title: 'Active Recovery (NSDR / Walking)',
      pillar: 'recovery',
      type: 'Recovery',
      rec: 'Ruhephase. Kein aktiver Stack nötig.',
      insight: 'Senkung des sympathischen Nervensystems stabilisiert deine Baseline-HRV.'
    });
  }

  // 5. Try placing Cognitive Peak II (Evening Planning & Study)
  // Adjusted to bedMin - 120 to bedMin - 60 to prevent any overlaps with the sleep wind-down
  // If evening shower is selected, shorten focus block to 30 mins to avoid overlap
  const focusEndMin = (showerPreference === 'evening') ? bedMin - 90 : bedMin - 60;
  addBlockIfFits(bedMin - 120, focusEndMin, {
    title: 'Focus II (Planung & Review)',
    pillar: 'skills',
    type: 'Skills',
    rec: 'L-Theanin Stack zur Beruhigung des Fokus vor dem Schlaf.',
    insight: 'Spätabendliche Review-Blöcke verankern den Lernerfolg während des Schlafs.'
  });

  if (showerPreference === 'evening') {
    addBlockIfFits(bedMin - 90, bedMin - 60, {
      title: 'Warm Shower & Abend-Routine',
      pillar: 'recovery',
      type: 'Recovery',
      rec: 'Warm duschen zur Absenkung der Körperkerntemperatur vor dem Schlafen.',
      insight: 'Ein warmes Bad/Dusche leitet Wärme in die Extremitäten ab und kühlt den Kern ab.'
    });
  }

  // 6. Fill in early morning routine (wake time to cog1 start)
  addBlockIfFits(wakeMin, wakeMin + 30, {
    title: 'Circadian Light Sync & Baseline Hydration',
    pillar: 'recovery',
    type: 'Recovery',
    rec: '10 Min direktes Sonnenlicht + 500ml salzhaltiges Wasser.',
    insight: 'Licht stoppt die Melatonin-Synthese und verankert den Schlaf-Wach-Rhythmus.'
  });

  if (showerPreference === 'morning' || (showerPreference === 'sport' && !hasSportToday)) {
    addBlockIfFits(wakeMin + 30, wakeMin + 60, {
      title: 'Cold Shower & Morgen-Routine',
      pillar: 'recovery',
      type: 'Recovery',
      rec: 'Kalt duschen (2-3 Min) zur Dopamin-Maximierung und ZNS-Aktivierung.',
      insight: 'Kälteexposition erhöht das zirkulierende Dopamin nachhaltig für den Tag.'
    });
  }

  addBlockIfFits(wakeMin + 60, wakeMin + 90, {
    title: 'Mahlzeit I (Frühstück & Neuro-Fuel)',
    pillar: 'health',
    type: 'Health',
    rec: 'Proteinhaltiges Frühstück mit Omega-3-Fettsäuren. Noch kein Koffein.',
    insight: 'Nahrungsaufnahme synchronisiert periphere Organuhren mit deinem ZNS.'
  });

  // 7. Mid-day and afternoon routines
  addBlockIfFits(wakeMin + 390, wakeMin + 435, {
    title: 'Mahlzeit II (Mittagessen & Zirkadianer Reset)',
    pillar: 'health',
    type: 'Health',
    rec: 'Leichte Mahlzeit zur Vermeidung des Mittagstiefs. Ggf. zweiter Stack.',
    insight: 'Ein moderates Mittagessen stützt den Blutzuckerspiegel ohne Insulinspitzen.'
  });

  if (shoppingPreference === 'weekly' && ['Dienstag', 'Freitag'].includes(dayName)) {
    addBlockIfFits(wakeMin + 720, wakeMin + 765, {
      title: 'Einkaufen & Besorgungen / Haushalt',
      pillar: 'social',
      type: 'Social',
      rec: 'Aktiver Tapetenwechsel. Erledige Besorgungen oder Hausarbeiten.',
      insight: 'Körperliche Bewegung am Spätnachmittag stabilisiert die zirkadiane Phase.'
    });
  }

  // 8. Evening dinner spacing
  addBlockIfFits(bedMin - 180, bedMin - 135, {
    title: 'Mahlzeit III (Abendessen - Zirkadianer Abstand)',
    pillar: 'health',
    type: 'Health',
    rec: 'Letzte Mahlzeit des Tages. 3 Stunden Puffer vor dem Schlaf wahren.',
    insight: 'Essen kurz vor dem Schlafen beeinträchtigt die Schlafqualität und HRV.'
  });

  // 9. Add evening wind-down (bedTime - 60 to bedTime)
  addBlockIfFits(bedMin - 60, bedMin, {
    title: 'Circadian Wind-Down & Sleep Prep',
    pillar: 'recovery',
    type: 'Recovery',
    rec: 'Magnesiumglycinat + L-Theanin + Glycin Stack zur Schlafvorbereitung.',
    insight: 'Melatonin-Spiegel steigt. Blaufilter und künstliche Lichter jetzt eliminieren.'
  });

  // Sort blocks chronologically
  finalBlocks.sort((a, b) => {
    const parseTime = (timeStr) => {
      const [h, m] = timeStr.split(':').map(Number);
      let mins = h * 60 + m;
      if (mins < wakeMin) mins += 1440; // overnight
      return mins;
    };
    return parseTime(a.startTime) - parseTime(b.startTime);
  });

  return finalBlocks;
}

export function generateCompleteWeekCalendar(chronotype, wakeTimeStr, bedTimeStr, liabilitiesList, goals, showerPreference = 'morning', shoppingPreference = 'weekly') {
  const days = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
  const weekCalendar = {};
  
  const today = new Date();
  const currentDayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday, etc.
  
  // Find the date of the upcoming Monday (or current week's Monday)
  const mondayOffset = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
  const startMonday = new Date(today);
  startMonday.setDate(today.getDate() + mondayOffset);

  days.forEach((dayName, idx) => {
    const targetDate = new Date(startMonday);
    targetDate.setDate(startMonday.getDate() + idx);
    const dateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
    
    weekCalendar[dateStr] = {
      blocks: generateOptimizedDaySchedule(chronotype, wakeTimeStr, bedTimeStr, dayName, liabilitiesList, goals, showerPreference, shoppingPreference)
    };
  });

  return weekCalendar;
}
