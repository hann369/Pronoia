/**
 * PROTOCOL_DATABASE
 * Predefined schedule patterns and block templates for the Pronoia ecosystem.
 */
export const PROTOCOL_DATABASE = {
  focus_optimization: [
    { 
      title: 'Deep Work I', duration: 90 * 60, type: 'Focus', pillar: 'focus', 
      rec: 'No Distractions. Telefon im Flugmodus. Bi-naurale Beats (40Hz).',
      insight: 'Alpha-Wellen-Dominanz in der ersten Tageshälfte maximieren.' 
    },
    { 
      title: 'Skill Acquisition', duration: 45 * 60, type: 'Skills', pillar: 'skills', 
      rec: 'Deliberate Practice. Fokus auf Fehlermuster.',
      insight: 'Neuroplastizität benötigt intensiven Fokus gefolgt von Pause.' 
    },
    { 
      title: 'Deep Work II', duration: 60 * 60, type: 'Focus', pillar: 'focus', 
      rec: 'High Intensity Tasks. Keine Emails.',
      insight: 'Zweites kognitives Fenster vor dem Nachmittags-Tief nutzen.' 
    },
    { 
      title: 'Strategic Planning', duration: 30 * 60, type: 'Focus', pillar: 'focus', 
      rec: 'Review & Planing. System-Update.',
      insight: 'Vermeidung von Entscheidungsmüdigkeit durch Vorausplanung.' 
    }
  ],
  high_performance: [
    { title: 'Morning Stack', duration: 10 * 60, type: 'Health', pillar: 'health', rec: 'Creatine + Taurine. 500ml Wasser.', insight: 'Osmolytischer Schutz.' },
    { title: 'Cold Exposure', duration: 5 * 60, type: 'Physical', pillar: 'health', rec: '2 min Kalt duschen (12°C).', insight: 'Noradrenalin-Peak.' },
    { title: 'Deep Work Block', duration: 120 * 60, type: 'Focus', pillar: 'focus', rec: 'Absolute Isolation.', insight: 'Maximaler Output.' },
    { title: 'Physical HIT', duration: 45 * 60, type: 'Physical', pillar: 'health', rec: 'Mike Mentzer Style Training.', insight: 'Mechanische Spannung.' }
  ],
  metabolic_rest: [
    { title: 'Light Movement', duration: 20 * 60, type: 'Physical', pillar: 'health', rec: 'Zone 1 Spaziergang.', insight: 'Glykogen-Management.' },
    { title: 'Recovery Stack', duration: 10 * 60, type: 'Health', pillar: 'health', rec: 'Magnesium + Glycine.', insight: 'PNS-Aktivierung.' },
    { title: 'Social Integration', duration: 60 * 60, type: 'Social', pillar: 'social', rec: 'Echte Interaktion. Kein Screen.', insight: 'Oxytocin-Release.' }
  ],
  emergency_recovery: [
    {
      title: 'Physiological Sighing', duration: 5 * 60, type: 'Recovery', pillar: 'recovery',
      rec: 'Doppeltes Einatmen, langes Ausatmen. 5 Min.',
      insight: 'Schnellster Weg zur CO2-Abfuhr und Senkung des Herzschlags.'
    },
    {
      title: 'NSDR (Non-Sleep Deep Rest)', duration: 20 * 60, type: 'Recovery', pillar: 'recovery',
      rec: 'Huberman-Protokoll oder Yoga Nidra. Liegend.',
      insight: 'Kognitive Reset ohne Schlaf-Inertia. Dopamin-Replenishment.'
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
