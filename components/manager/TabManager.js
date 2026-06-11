import React, { useState, useEffect, useRef } from 'react';
import styles from './TabManager.module.css';
import {
  detectRecurring,
  budgetStatus,
  monthTrend,
  detectAnomalies,
  autoCategorize,
  detectPatterns,
  calculatePrognosis,
  calculateSavingsPotential
} from '@/lib/financeIntelligence';


// ═══════════════════════════════════════════════════════════════════
// CUSTOM INTERACTIVE SVG CHARTS FOR FINANCE TRACKER (No libraries)
// ═══════════════════════════════════════════════════════════════════

// 1. Line Chart: Cumulative Balance Trend
function LineChart({ transactions }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  // Sort chronological
  const sorted = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
  let bal = 0;
  const points = sorted.map(tx => {
    if (tx.type === 'income') bal += tx.amount;
    else bal -= tx.amount;
    return { date: tx.date, balance: bal, amount: tx.amount, type: tx.type, category: tx.category };
  });

  if (points.length === 0) {
    return (
      <div className={styles.emptyChartState}>
        <p>Noch keine Daten vorhanden. Füge Transaktionen hinzu, um den Verlauf zu sehen.</p>
      </div>
    );
  }

  const width = 500;
  const height = 180;
  const paddingLeft = 50;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartW = width - paddingLeft - paddingRight;
  const chartH = height - paddingTop - paddingBottom;

  const balances = points.map(p => p.balance);
  const maxB = Math.max(...balances, 100);
  const minB = Math.min(...balances, -100);
  const range = maxB - minB || 1;

  const getX = (idx) => {
    if (points.length <= 1) return paddingLeft + chartW / 2;
    return paddingLeft + (idx / (points.length - 1)) * chartW;
  };

  const getY = (val) => {
    return paddingTop + chartH - ((val - minB) / range) * chartH;
  };

  let pathD = '';
  let areaD = '';
  points.forEach((p, idx) => {
    const x = getX(idx);
    const y = getY(p.balance);
    if (idx === 0) {
      pathD = `M ${x} ${y}`;
      areaD = `M ${x} ${paddingTop + chartH} L ${x} ${y}`;
    } else {
      pathD += ` L ${x} ${y}`;
      areaD += ` L ${x} ${y}`;
    }
  });
  if (points.length > 0) {
    areaD += ` L ${getX(points.length - 1)} ${paddingTop + chartH} Z`;
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="lineAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--theme-accent, #1a6aff)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--theme-accent, #1a6aff)" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((r) => {
          const val = minB + r * range;
          const y = getY(val);
          return (
            <g key={r}>
              <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="var(--border)" strokeDasharray="3 4" strokeWidth="1" />
              <text x={paddingLeft - 10} y={y + 3} fill="var(--text3)" fontSize="8" fontFamily="var(--font-mono)" textAnchor="end">
                {Math.round(val)} €
              </text>
            </g>
          );
        })}

        {/* Areas & Path */}
        <path d={areaD} fill="url(#lineAreaGrad)" />
        <path d={pathD} fill="none" stroke="var(--theme-accent, #1a6aff)" strokeWidth="2.5" />

        {/* Interactive Circles */}
        {points.map((p, idx) => {
          const x = getX(idx);
          const y = getY(p.balance);
          const isH = hoveredIdx === idx;
          return (
            <circle
              key={idx}
              cx={x}
              cy={y}
              r={isH ? 7 : 4}
              fill={isH ? "var(--theme-accent, #1a6aff)" : "var(--bg-card)"}
              stroke="var(--theme-accent, #1a6aff)"
              strokeWidth="2.5"
              style={{ cursor: 'pointer', transition: 'r 0.15s ease' }}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            />
          );
        })}
      </svg>

      {/* Tooltip */}
      {hoveredIdx !== null && points[hoveredIdx] && (
        <div
          className={styles.chartTooltip}
          style={{
            position: 'absolute',
            left: `${(getX(hoveredIdx) / width) * 100}%`,
            top: `${getY(points[hoveredIdx].balance) - 55}px`,
            transform: 'translateX(-50%)',
            zIndex: 10,
            pointerEvents: 'none'
          }}
        >
          <div className={styles.tooltipDate}>{points[hoveredIdx].date}</div>
          <div className={styles.tooltipBalance}>
            Saldo: <strong>{points[hoveredIdx].balance.toFixed(1)} €</strong>
          </div>
          <div className={styles.tooltipTx} style={{ color: points[hoveredIdx].type === 'income' ? '#00c48c' : '#ff4d4d' }}>
            {points[hoveredIdx].type === 'income' ? '+' : '-'}{points[hoveredIdx].amount} € ({points[hoveredIdx].category})
          </div>
        </div>
      )}
    </div>
  );
}

// 2. Bar Chart: Category totals
function BarChart({ data, total }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  if (data.length === 0) {
    return (
      <div className={styles.emptyChartState}>
        <p>Keine Transaktionen für diese Auswertung gefunden.</p>
      </div>
    );
  }

  const width = 500;
  const height = 180;
  const paddingLeft = 50;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartW = width - paddingLeft - paddingRight;
  const chartH = height - paddingTop - paddingBottom;

  const maxVal = Math.max(...data.map(d => d.value), 50);

  const getX = (idx) => {
    const space = chartW / data.length;
    return paddingLeft + idx * space + space / 2;
  };

  const colors = ['#1a6aff', '#00c48c', '#f5a623', '#ff4d4d', '#6c5ce7', '#e17055', '#00cec9', '#fd79a8'];

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((r) => {
          const val = r * maxVal;
          const y = paddingTop + chartH - r * chartH;
          return (
            <g key={r}>
              <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="var(--border)" strokeDasharray="3 4" strokeWidth="1" />
              <text x={paddingLeft - 10} y={y + 3} fill="var(--text3)" fontSize="8" fontFamily="var(--font-mono)" textAnchor="end">
                {Math.round(val)} €
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((item, idx) => {
          const x = getX(idx);
          const barW = Math.min(26, chartW / data.length - 12);
          const barH = (item.value / maxVal) * chartH;
          const y = paddingTop + chartH - barH;
          const isH = hoveredIdx === idx;
          const color = colors[idx % colors.length];

          return (
            <g key={item.category}>
              <rect
                x={x - barW / 2}
                y={y}
                width={barW}
                height={Math.max(0, barH)}
                rx="4"
                fill={color}
                opacity={hoveredIdx === null || isH ? 0.85 : 0.5}
                style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
              <text x={x} y={paddingTop + chartH + 13} fill="var(--text2)" fontSize="8" fontFamily="var(--font-mono)" textAnchor="middle">
                {item.category.substring(0, 6)}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {hoveredIdx !== null && data[hoveredIdx] && (
        <div
          className={styles.chartTooltip}
          style={{
            position: 'absolute',
            left: `${(getX(hoveredIdx) / width) * 100}%`,
            top: `${paddingTop + chartH - (data[hoveredIdx].value / maxVal) * chartH - 45}px`,
            transform: 'translateX(-50%)',
            zIndex: 10,
            pointerEvents: 'none'
          }}
        >
          <div className={styles.tooltipDate}>{data[hoveredIdx].category}</div>
          <div className={styles.tooltipBalance}>
            Gesamt: <strong>{data[hoveredIdx].value.toFixed(1)} €</strong>
          </div>
          <div className={styles.tooltipTx}>
            {((data[hoveredIdx].value / (total || 1)) * 100).toFixed(1)}% des Gesamtbetrags
          </div>
        </div>
      )}
    </div>
  );
}

// 3. Doughnut Chart: Split circular percentages
function DoughnutChart({ data, total }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  if (data.length === 0) {
    return (
      <div className={styles.emptyChartState}>
        <p>Keine Transaktionen für diese Auswertung gefunden.</p>
      </div>
    );
  }

  const radius = 50;
  const circ = 2 * Math.PI * radius; // ~314.16
  const centerX = 80;
  const centerY = 80;
  let accumulatedPercent = 0;

  const colors = ['#1a6aff', '#00c48c', '#f5a623', '#ff4d4d', '#6c5ce7', '#e17055', '#00cec9', '#fd79a8'];

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' }}>
      <svg width="160" height="160" viewBox="0 0 160 160" style={{ overflow: 'visible' }}>
        <g transform="rotate(-90 80 80)">
          {data.map((item, idx) => {
            const percent = total > 0 ? item.value / total : 0;
            const strokeL = percent * circ;
            const rotation = accumulatedPercent * 360;
            accumulatedPercent += percent;
            const color = colors[idx % colors.length];
            const isH = hoveredIdx === idx;

            return (
              <circle
                key={item.category}
                cx={centerX}
                cy={centerY}
                r={radius}
                fill="transparent"
                stroke={color}
                strokeWidth={isH ? 16 : 12}
                strokeDasharray={`${strokeL} ${circ}`}
                strokeDashoffset={0}
                transform={`rotate(${rotation} ${centerX} ${centerY})`}
                style={{
                  transition: 'stroke-width 0.2s ease, filter 0.2s ease',
                  cursor: 'pointer',
                  filter: isH ? `drop-shadow(0 0 5px ${color})` : 'none'
                }}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            );
          })}
          {/* Central hole for glassmorphism */}
          <circle cx={centerX} cy={centerY} r={38} fill="var(--bg-card)" style={{ backdropFilter: 'blur(10px)' }} />
        </g>
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', minWidth: '180px' }}>
        {data.map((item, idx) => {
          const color = colors[idx % colors.length];
          const percent = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
          const isH = hoveredIdx === idx;

          return (
            <div
              key={item.category}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                opacity: hoveredIdx === null || isH ? 1 : 0.5,
                transition: 'opacity 0.2s ease',
                fontSize: '0.75rem',
                fontFamily: 'var(--font-mono)'
              }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: color, display: 'inline-block' }} />
              <span style={{ color: 'var(--text)' }}>{item.category}:</span>
              <strong style={{ marginLeft: 'auto', color: 'var(--text2)' }}>
                {item.value.toFixed(1)} € ({percent}%)
              </strong>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN TAB MANAGER COMPONENT
// ═══════════════════════════════════════════════════════════════════
export default function TabManager({
  profile,
  saveProfile,
  blocks = [],
  blockIdx = 0,
  timeLeft = 0,
  totalTime = 0,
  managerHistory = [],
  setManagerHistory,
  setAgentMsg
}) {
  const [activeSubTab, setActiveSubTab] = useState('command'); // 'command' | 'links' | 'research' | 'focus' | 'notes' | 'finance'

  // Settings & Mappings state
  const [pattern, setPattern] = useState('');
  const [url, setUrl] = useState('');

  // Outlier Research state
  const [researchTitle, setResearchTitle] = useState('');
  const [researchCategory, setResearchCategory] = useState('YouTube'); // 'YouTube' | 'Skill' | 'Competitor' | 'Other'
  const [researchUrl, setResearchUrl] = useState('');
  const [researchNotes, setResearchNotes] = useState('');
  const [selectedResearch, setSelectedResearch] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [playingVideoId, setPlayingVideoId] = useState(null);

  // Finance state
  const [finAmount, setFinAmount] = useState('');
  const [finType, setFinType] = useState('expense'); // 'income' | 'expense'
  const [finCategory, setFinCategory] = useState('Food');
  const [finDate, setFinDate] = useState(new Date().toISOString().substring(0, 10));
  const [finDesc, setFinDesc] = useState('');
  const [selectedChartType, setSelectedChartType] = useState('line'); // 'line' | 'bar' | 'doughnut'
  const [doughnutFocusType, setDoughnutFocusType] = useState('expense');
  const [financeSearch, setFinanceSearch] = useState('');
  const [selectedDrillDownCategory, setSelectedDrillDownCategory] = useState(null);


  // Focus Mode state
  const [focusTimeLeft, setFocusTimeLeft] = useState(1500); // 25 min in seconds
  const [focusDuration, setFocusDuration] = useState(1500);
  const [focusRunning, setFocusRunning] = useState(false);
  const [focusPreset, setFocusPreset] = useState(25); // 25 | 45 | 60 | 'custom'

  // Quick Notes state
  const [newNote, setNewNote] = useState('');

  // Reset video player when active research target changes
  useEffect(() => {
    setPlayingVideoId(null);
  }, [selectedResearch]);

  // Extract config with fallbacks
  const config = profile?.managerConfig || {
    autoOpenEnabled: true,
    mappings: [],
    research: [],
    notes: [],
    completedSessions: 0,
    finance: { transactions: [] }
  };
  const mappings = config.mappings || [];
  const autoOpenEnabled = config.autoOpenEnabled ?? true;
  const researchList = config.research || [];
  const notesList = config.notes || [];
  const completedSessions = config.completedSessions || 0;
  const financeConfig = config.finance || { transactions: [] };
  const transactions = financeConfig.transactions || [];

  // Active Block details
  const activeBlock = blocks[blockIdx] || { title: 'Kein aktiver Block', start: '00:00', end: '00:00' };
  const blockProg = totalTime > 0 ? Math.min(100, Math.max(0, (1 - timeLeft / totalTime) * 100)) : 0;

  // Timer formatted
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Adjust categories automatically when type changes
  const expenseCategories = ['Food', 'Living', 'Health/Bio', 'Tech', 'Travel', 'Shopping', 'Business Tools', 'Abonnements', 'Other'];
  const incomeCategories = ['Freelance', 'Salary', 'Investments', 'Other'];


  const handleTypeChange = (type) => {
    setFinType(type);
    if (type === 'income') {
      setFinCategory(incomeCategories[0]);
    } else {
      setFinCategory(expenseCategories[0]);
    }
  };
  
  const handleDescChange = (val) => {
    setFinDesc(val);
    const suggested = autoCategorize(val, finType);
    if (suggested && suggested !== 'Other') {
      setFinCategory(suggested);
    }
  };


  // Auto-Open toggler
  const handleToggleAutoOpen = () => {
    const updated = {
      ...config,
      autoOpenEnabled: !autoOpenEnabled
    };
    saveProfile({ managerConfig: updated });
    setAgentMsg(`Automatisches Öffnen von Tabs ${!autoOpenEnabled ? 'aktiviert' : 'deaktiviert'}.`);
  };

  // Add Link Mapping
  const handleAddMapping = (e) => {
    e.preventDefault();
    if (!pattern.trim() || !url.trim()) return;

    let formattedUrl = url.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl;
    }

    const newMapping = {
      id: `map_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      pattern: pattern.trim(),
      url: formattedUrl
    };

    const updated = {
      ...config,
      mappings: [...mappings, newMapping]
    };

    saveProfile({ managerConfig: updated });
    setPattern('');
    setUrl('');
    setAgentMsg(`Link-Zuordnung für "${pattern.trim()}" hinzugefügt.`);
  };

  const handleDeleteMapping = (id) => {
    const updated = {
      ...config,
      mappings: mappings.filter((m) => m.id !== id)
    };
    saveProfile({ managerConfig: updated });
    setAgentMsg('Link-Zuordnung entfernt.');
  };

  const handleTestMapping = (mapping) => {
    try {
      window.open(mapping.url, '_blank');
      setAgentMsg(`Test-Öffnen von ${mapping.url} initiiert.`);
    } catch (e) {
      setAgentMsg(`Browser blockiert Popup: ${e.message}`);
    }
  };

  // --- Outlier Research Log ---
  const handleAddResearch = (e) => {
    e.preventDefault();
    if (!researchTitle.trim()) return;

    let formattedUrl = researchUrl.trim();
    if (formattedUrl && !/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl;
    }

    const newItem = {
      id: `res_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: researchTitle.trim(),
      category: researchCategory,
      url: formattedUrl,
      notes: researchNotes.trim(),
      date: new Date().toLocaleDateString('de-DE'),
      analysisReport: null,
      analysisData: null
    };

    const updated = {
      ...config,
      research: [newItem, ...researchList]
    };

    saveProfile({ managerConfig: updated });
    setResearchTitle('');
    setResearchUrl('');
    setResearchNotes('');
    setAgentMsg(`Forschungsziel "${newItem.title}" erfolgreich hinzugefügt.`);
  };

  const handleDeleteResearch = (id, e) => {
    e?.stopPropagation();
    const updated = {
      ...config,
      research: researchList.filter((r) => r.id !== id)
    };
    if (selectedResearch?.id === id) {
      setSelectedResearch(null);
    }
    saveProfile({ managerConfig: updated });
    setAgentMsg('Forschungsziel gelöscht.');
  };

  // Outlier analysis loading sequence steps
  const analysisSteps = [
    'Initialisiere Outlier-Crawler-Engine...',
    'Analysiere historische Durchschnittswerte & Benchmarks...',
    'Scanne YouTube-Videos & Content-Katalog...',
    'Analysiere Titel-Hooks, CTR-Treiber und Thumbnail-Konzepte...',
    'Synthetisiere strategische Erkenntnisse...'
  ];

  // Upgraded runOutlierAnalysis: calls real search API and populates rich data
  const runOutlierAnalysis = async (item, targetChannelId = null) => {
    if (!item) return;
    setAnalysisLoading(true);
    setAnalysisStep(0);
    setAgentMsg(`Starte Outlier-Recherche für "${item.title}"...`);

    try {
      setAnalysisStep(1);
      await new Promise(r => setTimeout(r, 600));
      setAnalysisStep(2);
      await new Promise(r => setTimeout(r, 600));
      setAnalysisStep(3);
      
      let queryUrl = `/api/youtube-search?q=${encodeURIComponent(item.title)}`;
      if (targetChannelId) {
        queryUrl = `/api/youtube-search?channelId=${targetChannelId}`;
      } else if (item.url) {
        const handleMatch = item.url.match(/youtube\.com\/(@[a-zA-Z0-9_-]+)/);
        const idMatch = item.url.match(/youtube\.com\/channel\/([a-zA-Z0-9_-]+)/);
        if (idMatch) {
          queryUrl = `/api/youtube-search?channelId=${idMatch[1]}`;
        } else if (handleMatch) {
          queryUrl = `/api/youtube-search?q=${encodeURIComponent(handleMatch[1])}`;
        }
      }

      const res = await fetch(queryUrl);
      if (!res.ok) {
        throw new Error(`YouTube API returned HTTP status ${res.status}`);
      }
      
      const searchData = await res.json();
      setAnalysisStep(4);
      await new Promise(r => setTimeout(r, 400));

      if (searchData.error) {
        throw new Error(searchData.error);
      }

      let report = '';
      if (searchData.mode === 'channel') {
        const chan = searchData.channel || { title: item.title, subscribersText: 'N/A' };
        const videoListText = searchData.videos.map((v, idx) => 
          `${idx + 1}. **${v.title}**\n   - Aufrufe: ${v.viewsText || 'N/A'} | Veröffentlicht: ${v.publishedText || 'N/A'}\n   - Link: ${v.watchUrl}`
        ).join('\n');
        
        report = `### 🚀 OUTLIER ANALYSE: KANAL PERFORMANCE FÜR "${chan.title}"
**Abonnenten:** ${chan.subscribersText || 'N/A'} ${chan.verified ? '✓ (Verifiziert)' : ''}
**Kanal-URL:** https://youtube.com/${chan.handle || ''}
**Analyse-Datum:** ${new Date().toLocaleDateString('de-DE')}

#### Die 5 neuesten Videos des Kanals (chronologisch geordnet):
${videoListText}

#### Content- & Nischen-Erkenntnisse:
- Kanäle wie "${chan.title}" skalieren durch konsistente Branding-Muster und starke visuelle CTR-Driver.
- Die neuesten Uploads zeigen die aktuelle Themen-Ausrichtung des Creators. Analysiere Titel-Formate und Upload-Zyklen.`;
      } else if (searchData.mode === 'keyword' || searchData.mode === 'uncertain') {
        const videoListText = searchData.videos.slice(0, 5).map((v, idx) => 
          `${idx + 1}. **${v.title}**\n   - Aufrufe: ${v.viewsText || 'N/A'} | Veröffentlicht: ${v.publishedText || 'N/A'}\n   - Link: ${v.watchUrl}`
        ).join('\n');

        report = `### 🔍 OUTLIER THEMEN-ANALYSE FÜR "${item.title}"
**Kategorie:** ${item.category}
**Analyse-Datum:** ${new Date().toLocaleDateString('de-DE')}

#### Relevante Top-Videos in dieser Nische:
${videoListText}

#### Nischen-Outlier-Metriken:
- Suchbegriffe wie "${item.title}" besitzen hohe organische Suchanfragen.
- Videos mit exakter Keyword-Platzierung am Titelanfang erzielen signifikant höhere organische Einstiegs-CTR.`;
      } else if (searchData.mode === 'multiple_channels') {
        report = `### ⚠️ MEHRERE KANÄLE GEFUNDEN FÜR "${item.title}"
Bitte wähle den gewünschten Kanal in der Auswahlliste aus, um die detaillierte Outlier-Analyse zu starten.`;
      }

      const updatedResearch = researchList.map((r) => {
        if (r.id === item.id) {
          return { ...r, analysisReport: report, analysisData: searchData };
        }
        return r;
      });

      const updated = {
        ...config,
        research: updatedResearch
      };

      saveProfile({ managerConfig: updated });
      const updatedItem = { ...item, analysisReport: report, analysisData: searchData };
      setSelectedResearch(updatedItem);
      setAnalysisLoading(false);
      setAgentMsg(`Outlier Analyse für "${item.title}" erfolgreich abgeschlossen.`);

    } catch (err) {
      console.error("[YouTube Search] Analysis failed:", err);
      const errorReport = `### ❌ FEHLER BEI DER ANALYSE FÜR "${item.title}"
Es ist ein Fehler bei der Kontaktaufnahme mit den YouTube/Web-Diensten aufgetreten.

**Details:** ${err.message || 'Rate-Limit erreicht oder Netzwerkfehler.'}

Bitte versuche es in wenigen Minuten erneut.`;

      const updatedResearch = researchList.map((r) => {
        if (r.id === item.id) {
          return { ...r, analysisReport: errorReport, analysisData: { mode: 'error', error: err.message } };
        }
        return r;
      });

      const updated = {
        ...config,
        research: updatedResearch
      };

      saveProfile({ managerConfig: updated });
      setSelectedResearch({ ...item, analysisReport: errorReport, analysisData: { mode: 'error', error: err.message } });
      setAnalysisLoading(false);
      setAgentMsg(`Fehler bei der Outlier Analyse: ${err.message}`);
    }
  };

  // --- Focus Mode Timer ---
  useEffect(() => {
    let timerId = null;
    if (focusRunning && focusTimeLeft > 0) {
      timerId = setInterval(() => {
        setFocusTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (focusTimeLeft === 0 && focusRunning) {
      setFocusRunning(false);
      setAgentMsg('Focus-Session erfolgreich beendet! Nimm dir eine kurze Pause. ☕');
      
      const updated = {
        ...config,
        completedSessions: completedSessions + 1
      };
      saveProfile({ managerConfig: updated });

      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification('Pronoia Focus Mode', {
            body: 'Deine Focus-Session ist abgeschlossen! Zeit für eine Pause.',
            icon: '/favicon.ico'
          });
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission();
        }
      }
    }
    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [focusRunning, focusTimeLeft]);

  const handleStartPauseFocus = () => {
    setFocusRunning(!focusRunning);
  };

  const handleResetFocus = () => {
    setFocusRunning(false);
    setFocusTimeLeft(focusDuration);
  };

  const handlePresetSelect = (minutes) => {
    setFocusPreset(minutes);
    setFocusDuration(minutes * 60);
    setFocusTimeLeft(minutes * 60);
    setFocusRunning(false);
  };

  const strokeDashoffset = focusDuration > 0
    ? 502 - (502 * (focusDuration - focusTimeLeft)) / focusDuration
    : 502;

  // --- Quick Notes ---
  const handleAddNote = (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    const noteItem = {
      id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      blockTitle: activeBlock.title,
      text: newNote.trim(),
      time: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    };

    const updated = {
      ...config,
      notes: [noteItem, ...notesList]
    };

    saveProfile({ managerConfig: updated });
    setNewNote('');
    setAgentMsg('Notiz zum aktiven Block hinzugefügt.');
  };

  const handleDeleteNote = (id) => {
    const updated = {
      ...config,
      notes: notesList.filter((n) => n.id !== id)
    };
    saveProfile({ managerConfig: updated });
    setAgentMsg('Notiz entfernt.');
  };

  // --- Finance Log Handlers ---
  const handleAddTransaction = (e) => {
    e.preventDefault();
    if (!finAmount || isNaN(parseFloat(finAmount)) || parseFloat(finAmount) <= 0) return;

    const newTx = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      amount: parseFloat(finAmount),
      type: finType,
      category: finCategory,
      date: finDate || new Date().toISOString().substring(0, 10),
      description: finDesc.trim()
    };

    const updated = {
      ...config,
      finance: {
        ...financeConfig,
        transactions: [newTx, ...transactions]
      }
    };

    saveProfile({ managerConfig: updated });
    setFinAmount('');
    setFinDesc('');
    setAgentMsg(`Transaktion über ${newTx.amount.toFixed(2)} € hinzugefügt.`);
  };

  const handleDeleteTransaction = (id) => {
    const updated = {
      ...config,
      finance: {
        ...financeConfig,
        transactions: transactions.filter(tx => tx.id !== id)
      }
    };
    saveProfile({ managerConfig: updated });
    setAgentMsg('Transaktion gelöscht.');
  };

  // Grouped metrics for finance panel
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, c) => acc + c.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, c) => acc + c.amount, 0);
  const netBalance = totalIncome - totalExpense;

  // --- Finance Intelligence (local heuristics, see lib/financeIntelligence) ---
  const budgets = financeConfig.budgets || {};
  const nowDate = new Date();
  const currentMonthStr = nowDate.toISOString().substring(0, 7);
  const prevMonthDate = new Date(nowDate.getFullYear(), nowDate.getMonth() - 1, 15);
  const prevMonthStr = prevMonthDate.toISOString().substring(0, 7);

  const recurringItems = detectRecurring(transactions).filter(r => r.type === 'expense');
  const recurringMonthlySum = recurringItems.reduce((s, r) => s + r.monthlyCost, 0);
  const budgetRows = budgetStatus(transactions, budgets, currentMonthStr);
  const expenseTrend = monthTrend(transactions, currentMonthStr, prevMonthStr);
  const anomalies = detectAnomalies(transactions).slice(0, 3);

  // New Upgraded Features Calculations
  const savingsPotential = calculateSavingsPotential(transactions);
  const prognosis = calculatePrognosis(transactions, netBalance);
  const patterns = detectPatterns(transactions);
  const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0;

  // Intelligent Search filter and stats
  const searchedTransactions = transactions.filter(t => {
    const q = financeSearch.toLowerCase().trim();
    if (!q) return true;
    return (t.description || '').toLowerCase().includes(q) || (t.category || '').toLowerCase().includes(q);
  });
  const searchTotal = searchedTransactions.reduce((s, t) => s + t.amount, 0);
  const searchAvg = searchedTransactions.length > 0 ? searchTotal / searchedTransactions.length : 0;

  // Financial Goals
  const defaultGoals = [
    { id: 'goal_emergency', name: 'Notgroschen', target: 10000, current: Math.max(0, Math.round(netBalance * 0.4 * 100) / 100) },
    { id: 'goal_vacation', name: 'Urlaubskasse', target: 3000, current: Math.max(0, Math.round(netBalance * 0.1 * 100) / 100) },
    { id: 'goal_etf', name: 'ETF Sparziel', target: 50000, current: Math.max(0, Math.round(netBalance * 0.3 * 100) / 100) }
  ];
  const goals = financeConfig.goals || defaultGoals;

  const handleUpdateGoal = (id, currentVal) => {
    const num = parseFloat(currentVal);
    if (isNaN(num)) return;
    const updatedGoals = goals.map(g => g.id === id ? { ...g, current: num } : g);
    saveProfile({
      managerConfig: {
        ...config,
        finance: { ...financeConfig, goals: updatedGoals }
      }
    });
  };

  const handleSetBudget = (category, value) => {
    const num = parseFloat(value);
    const updatedBudgets = { ...budgets };
    if (!value || isNaN(num) || num <= 0) {
      delete updatedBudgets[category];
    } else {
      updatedBudgets[category] = num;
    }
    saveProfile({
      managerConfig: {
        ...config,
        finance: { ...financeConfig, budgets: updatedBudgets }
      }
    });
  };


  // Aggregate category values for selected type (income/expense)
  const categoryTotalsMap = {};
  transactions
    .filter(t => t.type === doughnutFocusType)
    .forEach(t => {
      categoryTotalsMap[t.category] = (categoryTotalsMap[t.category] || 0) + t.amount;
    });

  const chartCategoryData = Object.keys(categoryTotalsMap).map(cat => ({
    category: cat,
    value: categoryTotalsMap[cat]
  })).sort((a, b) => b.value - a.value);

  const doughnutTotal = chartCategoryData.reduce((acc, c) => acc + c.value, 0);

  // Filter research targets
  const filteredResearchList = researchList.filter((r) => {
    if (filterCategory === 'ALL') return true;
    return r.category.toUpperCase() === filterCategory.toUpperCase();
  });

  return (
    <div className={styles.container}>
      <div className={styles.bgMesh} />

      {/* Premium Header */}
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <div>
              <h2 className={styles.title}>System App Command Center</h2>
              <div className={styles.subtitle}>Manager Node v3.5 // Live telemetry active</div>
            </div>
          </div>

          {/* Current block indicator */}
          <div className={styles.liveTicker}>
            <span className={styles.liveIndicator} />
            <span className={styles.tickerText} title={activeBlock.title}>
              AKTIV: {activeBlock.title}
            </span>
          </div>
        </div>
      </div>

      {/* Sub Navigation */}
      <div className={styles.subNav}>
        <button
          type="button"
          onClick={() => setActiveSubTab('command')}
          className={`${styles.subNavTab} ${activeSubTab === 'command' ? styles.subNavTabActive : ''}`}
        >
          Cockpit
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('links')}
          className={`${styles.subNavTab} ${activeSubTab === 'links' ? styles.subNavTabActive : ''}`}
        >
          Block Links
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('research')}
          className={`${styles.subNavTab} ${activeSubTab === 'research' ? styles.subNavTabActive : ''}`}
        >
          Outlier Research
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('finance')}
          className={`${styles.subNavTab} ${activeSubTab === 'finance' ? styles.subNavTabActive : ''}`}
        >
          Finanzen
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('focus')}
          className={`${styles.subNavTab} ${activeSubTab === 'focus' ? styles.subNavTabActive : ''}`}
        >
          Focus Mode
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('notes')}
          className={`${styles.subNavTab} ${activeSubTab === 'notes' ? styles.subNavTabActive : ''}`}
        >
          Notizen
        </button>
      </div>


      {/* Main Tab Panels */}
      <div className={styles.content}>
        {activeSubTab === 'command' && (
          <div className={styles.commandGrid}>
            {/* Active Block Card */}
            <div className={styles.activeBlockHero}>
              <div className={styles.blockTimerRing}>
                <div className={styles.blockTimerInner}>
                  <span className={styles.blockTimerValue}>
                    {timeLeft > 0 ? Math.ceil(timeLeft / 60) : 0}
                  </span>
                  <span className={styles.blockTimerLabel}>Min</span>
                </div>
              </div>
              <div className={styles.blockDetails}>
                <div className={styles.blockLabel}>Aktueller Zeitblock</div>
                <h3 className={styles.blockName}>{activeBlock.title}</h3>
                <div className={styles.blockTimeRange}>
                  Zeit: {activeBlock.start} - {activeBlock.end}
                </div>

                <div className={styles.blockProgressBar}>
                  <div className={styles.blockProgressFill} style={{ width: `${blockProg}%` }} />
                </div>
              </div>
            </div>

            {/* Metrics cards */}
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Verknüpfte Auto-Links</span>
              <span className={styles.statValue}>{mappings.length}</span>
              <span className={styles.statSub}>Aktive Trigger-Muster</span>
            </div>

            <div className={styles.statCard}>
              <span className={styles.statLabel}>Autom. Geöffnete Links</span>
              <span className={styles.statValue}>{managerHistory.length}</span>
              <span className={styles.statSub}>In dieser Web-Session</span>
            </div>

            <div className={styles.statCard}>
              <span className={styles.statLabel}>Forschungsziele</span>
              <span className={styles.statValue}>{researchList.length}</span>
              <span className={styles.statSub}>Outlier-Analysen gespeichert</span>
            </div>

            <div className={styles.statCard}>
              <span className={styles.statLabel}>Focus Sessions</span>
              <span className={styles.statValue}>{completedSessions}</span>
              <span className={styles.statSub}>Erfolgreich absolviert</span>
            </div>
          </div>
        )}

        {activeSubTab === 'links' && (
          <div className={styles.linksLayout}>
            {/* Left side: config & add form */}
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Auto-Open Einstellungen</h3>


              <div className={styles.controlRow}>
                <div className={styles.controlInfo}>
                  <span className={styles.controlLabel}>Auto-Open aktivieren</span>
                  <span className={styles.controlDesc}>Tabs automatisch im Hintergrund öffnen</span>
                </div>
                <button
                  type="button"
                  className={`${styles.toggleBtn} ${autoOpenEnabled ? styles.toggleActive : ''}`}
                  onClick={handleToggleAutoOpen}
                >
                  {autoOpenEnabled ? 'AKTIVIERT' : 'DEAKTIVIERT'}
                </button>
              </div>

              <form onSubmit={handleAddMapping} className={styles.mappingForm}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Wenn Blocktitel enthält (z.B. "Französisch")</label>
                  <input
                    type="text"
                    placeholder="z.B. Französisch"
                    className={styles.input}
                    value={pattern}
                    onChange={(e) => setPattern(e.target.value)}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Diesen Link im Browser öffnen</label>
                  <input
                    type="text"
                    placeholder="z.B. https://duolingo.com"
                    className={styles.input}
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className={styles.submitBtn}>
                  Zuordnung Hinzufügen ✦
                </button>
              </form>

              <div className={styles.infoAlert}>
                <div className={styles.alertContent}>
                  <strong>Popup-Blocker Hinweis:</strong> Stelle sicher, dass du in deiner Browser-Adressleiste Popups für diese App zugelassen hast.
                </div>
              </div>

            </div>

            {/* Right side: Mappings & History */}
            <div className={styles.rightColumn}>
              <div className={styles.card}>
                <h3 className={styles.cardTitle}>Aktive Zuordnungen ({mappings.length})</h3>

                <div className={styles.mappingsList}>
                  {mappings.map((m) => (
                    <div key={m.id} className={styles.mappingRow}>
                      <div className={styles.mappingInfo}>
                        <span className={styles.mappingPattern}>{m.pattern}</span>
                        <span className={styles.mappingUrl} title={m.url}>{m.url}</span>
                      </div>
                      <div className={styles.mappingActions}>
                        <button
                          type="button"
                          className={styles.testBtn}
                          onClick={() => handleTestMapping(m)}
                          title="Link testen"
                        >
                          ↗
                        </button>
                        <button
                          type="button"
                          className={styles.deleteBtn}
                          onClick={() => handleDeleteMapping(m.id)}
                          title="Löschen"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                  {mappings.length === 0 && (
                    <div className={styles.emptyState}>
                      <p className={styles.emptyText}>Keine Zuordnungen hinterlegt. Erstelle links eine neue Verknüpfung.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.card}>
                <h3 className={styles.cardTitle}>Verlauf (Aktuelle Session)</h3>
                <div className={styles.historyList}>
                  {managerHistory.map((h) => (
                    <div key={h.id} className={styles.historyRow}>
                      <span className={styles.historyTime}>{h.time}</span>
                      <div className={styles.historyContent}>
                        <span>Block <strong>{h.blockTitle}</strong> aktiv</span>
                        <a href={h.url} target="_blank" rel="noopener noreferrer" className={styles.historyUrl}>
                          Geöffnet: {h.url}
                        </a>
                      </div>
                    </div>
                  ))}
                  {managerHistory.length === 0 && (
                    <div className={styles.emptyState}>
                      <p className={styles.emptyText}>Noch keine Tabs automatisch geöffnet.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'research' && (
          <div className={styles.researchLayout}>
            {/* Outlier search form */}
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Outlier Research Hub & Explorer</h3>

              <p className={styles.desc} style={{ marginTop: '-0.5rem', marginBottom: '0.5rem' }}>
                Finde "Outlier" (extrem überdurchschnittlich erfolgreiche Ansätze, Videos oder Techniken) für bestimmte Nischen oder Skills.
              </p>

              <form onSubmit={handleAddResearch} className={styles.mappingForm}>
                <div className={styles.researchTopBar}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Forschungs-Thema / Nische / Kanal</label>
                    <input
                      type="text"
                      placeholder="z.B. @MrBeast, Rust Web Assembly, Figma Tricks..."
                      className={styles.input}
                      value={researchTitle}
                      onChange={(e) => setResearchTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className={styles.formGroup} style={{ maxWidth: '180px' }}>
                    <label className={styles.formLabel}>Kategorie</label>
                    <select
                      className={styles.input}
                      value={researchCategory}
                      onChange={(e) => setResearchCategory(e.target.value)}
                    >
                      <option value="YouTube">YouTube</option>
                      <option value="Skill">Skill / Lernen</option>
                      <option value="Competitor">Mitbewerber</option>
                      <option value="Other">Sonstiges</option>
                    </select>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Referenz-URL (Optional)</label>
                  <input
                    type="text"
                    placeholder="https://youtube.com/c/..."
                    className={styles.input}
                    value={researchUrl}
                    onChange={(e) => setResearchUrl(e.target.value)}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Notizen / Beobachtungen</label>
                  <textarea
                    placeholder="Spezifische Fragen oder erste Hypothesen hinterlegen..."
                    className={styles.textarea}
                    value={researchNotes}
                    onChange={(e) => setResearchNotes(e.target.value)}
                  />
                </div>

                <button type="submit" className={styles.submitBtn}>
                  Forschungsziel Hinzufügen ✦
                </button>
              </form>
            </div>

            {/* List and report section */}
            <div className={styles.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h3 className={styles.cardTitle}>Gespeicherte Forschungsziele ({filteredResearchList.length})</h3>

                <div className={styles.categoryTabs}>
                  {['ALL', 'YOUTUBE', 'SKILL', 'COMPETITOR', 'OTHER'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      className={`${styles.categoryTab} ${filterCategory === cat ? styles.categoryTabActive : ''}`}
                      onClick={() => setFilterCategory(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.researchGrid}>
                {filteredResearchList.map((item) => (
                  <div
                    key={item.id}
                    className={`${styles.researchCard} ${selectedResearch?.id === item.id ? styles.researchCardSelected : ''}`}
                    onClick={() => setSelectedResearch(item)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className={styles.researchCardHeader}>
                      <span className={styles.researchCardTitle}>{item.title}</span>
                      <span className={styles.researchCardCategory}>{item.category}</span>
                    </div>
                    {item.notes && <p className={styles.researchCardBody}>{item.notes}</p>}
                    <div className={styles.researchCardFooter}>
                      <span className={styles.researchDate}>Erstellt: {item.date}</span>
                      <div className={styles.researchCardActions}>
                        <button
                          type="button"
                          className={styles.researchActionBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            runOutlierAnalysis(item);
                          }}
                          disabled={analysisLoading}
                        >
                          {item.analysisReport ? 'Re-Analyse ↻' : 'Analyse Starten ✦'}
                        </button>
                        <button
                          type="button"
                          className={styles.researchActionBtn}
                          style={{ borderColor: 'rgba(255, 77, 77, 0.3)', color: 'var(--red)' }}
                          onClick={(e) => handleDeleteResearch(item.id, e)}
                        >
                          Löschen
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredResearchList.length === 0 && (
                  <div className={styles.emptyState} style={{ gridColumn: '1 / -1' }}>
                    <p className={styles.emptyText}>Keine Forschungsziele in dieser Kategorie gefunden.</p>
                    <p className={styles.emptyText} style={{ opacity: 0.65, fontSize: '0.85em', marginTop: '0.35rem' }}>
                      Lege oben ein Ziel an (YouTube-Kanal, Skill oder Competitor) und starte die Analyse.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* UPGRADED Analysis report viewer with rich data dashboards & selector */}
            {selectedResearch && (
              <div className={styles.card} style={{ borderLeft: '4px solid var(--theme-accent, #1a6aff)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 className={styles.cardTitle}>Analyse: {selectedResearch.title}</h3>

                  <button
                    type="button"
                    className={styles.deleteBtn}
                    onClick={() => setSelectedResearch(null)}
                  >
                    ✕
                  </button>
                </div>

                {analysisLoading ? (
                  <div style={{ padding: '2rem 0', textSelf: 'center', textAlign: 'center' }}>
                    <div className={styles.spinner} />
                    <p style={{ marginTop: '1rem', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--theme-accent, #1a6aff)' }}>
                      {analysisSteps[analysisStep]}
                    </p>
                  </div>
                ) : selectedResearch.analysisData ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    
                    {/* Inline video player */}
                    {playingVideoId && (
                      <div className={styles.videoPlayerContainer}>
                        <iframe
                          src={`https://www.youtube.com/embed/${playingVideoId}?autoplay=1`}
                          title="YouTube video player"
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                          className={styles.videoPlayerIframe}
                        />
                        <button className={styles.videoPlayerClose} onClick={() => setPlayingVideoId(null)}>✕</button>
                      </div>
                    )}

                    {/* Mode 2: Multi-channels found */}
                    {selectedResearch.analysisData.mode === 'multiple_channels' && (
                      <div className={styles.pickerContainer}>
                        <h4 className={styles.pickerTitle}>Mehrere Kanäle gefunden. Welchen meintest du?</h4>
                        <div className={styles.pickerGrid}>
                          {selectedResearch.analysisData.channels.map(chan => (
                            <div key={chan.channelId} className={styles.pickerCard}>
                              <img src={chan.thumbnail || '/avatar-placeholder.png'} className={styles.pickerAvatar} alt={chan.title} />
                              <div className={styles.pickerInfo}>
                                <div className={styles.pickerName}>
                                  {chan.title} {chan.verified && <span className={styles.verifiedCheck}>✓</span>}
                                </div>
                                <div className={styles.pickerMeta}>{chan.subscribersText || 'Keine Angabe'}</div>
                              </div>
                              <button
                                className={styles.pickerSelectBtn}
                                onClick={() => runOutlierAnalysis(selectedResearch, chan.channelId)}
                              >
                                Auswählen
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Mode 2: Single Channel Dashboard */}
                    {selectedResearch.analysisData.mode === 'channel' && (
                      <div className={styles.channelDashboard}>
                        <div className={styles.channelHeaderCard}>
                          {selectedResearch.analysisData.channel && (
                            <>
                              <img src={selectedResearch.analysisData.channel.thumbnail || '/avatar-placeholder.png'} className={styles.channelAvatar} alt="" />
                              <div className={styles.channelInfo}>
                                <h4 className={styles.channelName}>
                                  {selectedResearch.analysisData.channel.title}
                                  {selectedResearch.analysisData.channel.verified && <span className={styles.verifiedBadge} title="Verifiziert">✓</span>}
                                </h4>
                                <div className={styles.channelSubscribers}>{selectedResearch.analysisData.channel.subscribersText}</div>
                                <a href={`https://youtube.com/${selectedResearch.analysisData.channel.handle}`} target="_blank" rel="noopener noreferrer" className={styles.channelLink}>
                                  Kanal ansehen ↗
                                </a>
                              </div>
                            </>
                          )}
                        </div>

                        <h4 className={styles.sectionHeader}>Die 5 neuesten Videos des Kanals:</h4>
                        <div className={styles.videoGrid}>
                          {selectedResearch.analysisData.videos && selectedResearch.analysisData.videos.map(vid => (
                            <div key={vid.videoId} className={styles.videoCard} onClick={() => setPlayingVideoId(vid.videoId)}>
                              <div className={styles.videoThumbContainer}>
                                <img src={vid.thumbnail} alt="" className={styles.videoThumb} />
                                <div className={styles.playIconOverlay}>
                                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M8 5v14l11-7z" />
                                  </svg>
                                </div>
                              </div>
                              <div className={styles.videoTitle} title={vid.title}>{vid.title}</div>
                              <div className={styles.videoMeta}>
                                <span>{vid.viewsText}</span>
                                <span>•</span>
                                <span>{vid.publishedText}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Mode 1: Keyword dashboard & Uncertain Fallback */}
                    {(selectedResearch.analysisData.mode === 'keyword' || selectedResearch.analysisData.mode === 'uncertain') && (
                      <div className={styles.keywordDashboard}>
                        <h4 className={styles.sectionHeader}>Suchergebnisse für Nische:</h4>
                        <div className={styles.videoList}>
                          {selectedResearch.analysisData.videos && selectedResearch.analysisData.videos.map(vid => (
                            <div key={vid.videoId} className={styles.videoListRow} onClick={() => setPlayingVideoId(vid.videoId)}>
                              <img src={vid.thumbnail} className={styles.videoRowThumb} alt="" />
                              <div className={styles.videoRowInfo}>
                                <div className={styles.videoRowTitle}>{vid.title}</div>
                                <div className={styles.videoRowMeta}>{vid.viewsText} • {vid.publishedText}</div>
                              </div>
                              <button className={styles.videoRowPlayBtn}>Abspielen</button>
                            </div>
                          ))}
                        </div>

                        {/* Suggestions for uncertain channel matching */}
                        {selectedResearch.analysisData.mode === 'uncertain' && selectedResearch.analysisData.suggestedChannels && (
                          <div className={styles.pickerContainer} style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
                            <h4 className={styles.pickerTitle} style={{ fontSize: '0.8rem' }}>Meintest du einen dieser Kanäle?</h4>
                            <div className={styles.pickerGrid}>
                              {selectedResearch.analysisData.suggestedChannels.map(chan => (
                                <div key={chan.channelId} className={styles.pickerCard} style={{ padding: '0.5rem 0.75rem' }}>
                                  <img src={chan.thumbnail || '/avatar-placeholder.png'} className={styles.pickerAvatar} style={{ width: '30px', height: '30px' }} alt="" />
                                  <div className={styles.pickerInfo}>
                                    <div className={styles.pickerName} style={{ fontSize: '0.75rem' }}>{chan.title}</div>
                                    <div className={styles.pickerMeta} style={{ fontSize: '0.65rem' }}>{chan.subscribersText}</div>
                                  </div>
                                  <button
                                    className={styles.pickerSelectBtn}
                                    style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem' }}
                                    onClick={() => runOutlierAnalysis(selectedResearch, chan.channelId)}
                                  >
                                    Analysieren
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Markdown Report viewer */}
                    <div className={styles.reportViewer}>
                      <h4 className={styles.sectionHeader} style={{ marginBottom: '0.5rem' }}>Strategische Auswertung:</h4>
                      <div className={styles.reportContent}>{selectedResearch.analysisReport}</div>
                    </div>

                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    <p className={styles.emptyText}>Noch keine Outlier-Analyse für dieses Ziel durchgeführt.</p>
                    <button
                      type="button"
                      className={styles.submitBtn}
                      style={{ marginTop: '0.5rem' }}
                      onClick={() => runOutlierAnalysis(selectedResearch)}
                    >
                      Outlier Analyse starten
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeSubTab === 'finance' && (

          <div className={styles.financeLayout}>
            {/* Top Dashboard Metrics */}
            <div className={styles.financeSummary}>
              <div className={styles.finStatCard}>
                <span className={styles.finStatLabel}>Einnahmen</span>
                <span className={styles.finStatValue} style={{ color: '#00c48c' }}>{totalIncome.toFixed(2)} €</span>
              </div>
              <div className={styles.finStatCard}>
                <span className={styles.finStatLabel}>Ausgaben</span>
                <span className={styles.finStatValue} style={{ color: '#ff4d4d' }}>{totalExpense.toFixed(2)} €</span>
              </div>
              <div className={styles.finStatCard}>
                <span className={styles.finStatLabel}>Saldo</span>
                <span className={styles.finStatValue} style={{ color: netBalance >= 0 ? '#007aff' : '#ff4d4d' }}>
                  {netBalance >= 0 ? '+' : ''}{netBalance.toFixed(2)} €
                </span>
              </div>
              <div className={styles.finStatCard}>
                <span className={styles.finStatLabel}>Sparquote</span>
                <span className={styles.finStatValue}>{savingsRate}%</span>
              </div>
              <div className={styles.finStatCard}>
                <span className={styles.finStatLabel}>Prognose Monatsende</span>
                <span className={styles.finStatValue} style={{ color: prognosis.status === 'critical' ? '#ff4d4d' : prognosis.status === 'warning' ? '#f5a623' : '#00c48c' }}>
                  {prognosis.projectedRemaining.toFixed(2)} €
                </span>
              </div>
            </div>

            {/* AI Insights & Alerts Area (No emojis) */}
            <div className={styles.insightsSection}>
              <div className={styles.card}>
                <h3 className={styles.cardTitle}>Finanzielle Erkenntnisse</h3>
                <div className={styles.insightsGrid}>
                  {patterns.map((pat, i) => (
                    <div key={i} className={`${styles.insightCard} ${pat.type === 'warning' ? styles.insightWarning : styles.insightInfo}`}>
                      <div className={styles.insightHeader}>
                        <span className={styles.insightBadge}>{pat.type === 'warning' ? 'Hinweis' : 'Info'}</span>
                        <h4 className={styles.insightTitle}>{pat.title}</h4>
                      </div>
                      <p className={styles.insightText}>{pat.message}</p>
                    </div>
                  ))}
                  
                  {savingsPotential.deliverySpend > 0 && (
                    <div className={`${styles.insightCard} ${styles.insightSavings}`}>
                      <div className={styles.insightHeader}>
                        <span className={styles.insightBadge}>Sparpotenzial</span>
                        <h4 className={styles.insightTitle}>Optimierung Lieferdienste</h4>
                      </div>
                      <p className={styles.insightText}>
                        Du hast in den letzten 90 Tagen {savingsPotential.deliverySpend.toFixed(2)} € für Restaurants und Lieferdienste ausgegeben. 
                        Eine Reduktion um 25% spart jährlich ca. {savingsPotential.annualSavings.toFixed(2)} € ein.
                      </p>
                    </div>
                  )}

                  {patterns.length === 0 && savingsPotential.deliverySpend === 0 && (
                    <p className={styles.emptyText} style={{ fontSize: '0.75rem', opacity: 0.65 }}>
                      Derzeit liegen keine auffälligen Ausgabenmuster oder Anomalien vor.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Financial Goals & Subscriptions Panel */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              {/* Recurring Subscriptions (No emojis) */}
              <div className={styles.card}>
                <h3 className={styles.cardTitle}>Wiederkehrende Abonnements</h3>
                {recurringItems.length === 0 ? (
                  <p style={{ fontSize: '0.75rem', color: 'var(--text3, #6a7890)', margin: 0 }}>
                    Keine wiederkehrenden Abonnements automatisch erkannt.
                  </p>
                ) : (
                  <>
                    <div className={styles.subscriptionList}>
                      {recurringItems.map((r, i) => (
                        <div key={i} className={styles.subscriptionRow}>
                          <span className={styles.subscriptionName}>
                            {r.description}
                            <span className={styles.subscriptionCadence}>
                              {r.cadence === 'weekly' ? 'wöchentlich' : 'monatlich'}
                            </span>
                          </span>
                          <span className={styles.subscriptionCost}>
                            −{r.monthlyCost.toFixed(2)} €/M
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className={styles.subscriptionTotal}>
                      <span>Fixkosten gesamt</span>
                      <span>−{recurringMonthlySum.toFixed(2)} €/Monat</span>
                    </div>
                  </>
                )}
              </div>

              {/* Financial Goals (No emojis) */}
              <div className={styles.card}>
                <h3 className={styles.cardTitle}>Finanzielle Ziele</h3>
                <div className={styles.goalsList}>
                  {goals.map((g) => {
                    const ratio = g.target > 0 ? g.current / g.target : 0;
                    const pct = Math.round(ratio * 100);
                    return (
                      <div key={g.id} className={styles.goalRow}>
                        <div className={styles.goalMeta}>
                          <span className={styles.goalName}>{g.name}</span>
                          <span className={styles.goalValues}>
                            {g.current.toFixed(0)} € / {g.target.toFixed(0)} €
                          </span>
                        </div>
                        <div className={styles.progressBar}>
                          <div className={styles.progressFill} style={{ width: `${Math.min(100, pct)}%` }} />
                        </div>
                        <div className={styles.goalPercent}>
                          <span>Fortschritt: {pct}%</span>
                          <input
                            type="number"
                            placeholder="Anpassen"
                            className={styles.goalInput}
                            defaultValue={g.current}
                            onBlur={(e) => handleUpdateGoal(g.id, e.target.value)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Input Form & Visualization Column Split */}
            <div className={styles.financeGrid}>
              {/* Form to log transaction */}
              <div className={styles.card}>
                <h3 className={styles.cardTitle}>Transaktion protokollieren</h3>
                <form onSubmit={handleAddTransaction} className={styles.mappingForm}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className={`${styles.typeToggleBtn} ${finType === 'expense' ? styles.typeToggleActiveRed : ''}`}
                      onClick={() => handleTypeChange('expense')}
                      style={{ flex: 1 }}
                    >
                      Ausgabe
                    </button>
                    <button
                      type="button"
                      className={`${styles.typeToggleBtn} ${finType === 'income' ? styles.typeToggleActiveGreen : ''}`}
                      onClick={() => handleTypeChange('income')}
                      style={{ flex: 1 }}
                    >
                      Einnahme
                    </button>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Betrag (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className={styles.input}
                      value={finAmount}
                      onChange={(e) => setFinAmount(e.target.value)}
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Kategorie</label>
                    <select
                      className={styles.input}
                      value={finCategory}
                      onChange={(e) => setFinCategory(e.target.value)}
                    >
                      {finType === 'expense'
                        ? expenseCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)
                        : incomeCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)
                      }
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Datum</label>
                    <input
                      type="date"
                      className={styles.input}
                      value={finDate}
                      onChange={(e) => setFinDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Beschreibung</label>
                    <input
                      type="text"
                      placeholder="z.B. Amazon Einkauf, OpenAI Abo, Gehalt..."
                      className={styles.input}
                      value={finDesc}
                      onChange={(e) => handleDescChange(e.target.value)}
                    />
                  </div>

                  <button type="submit" className={styles.submitBtn}>
                    Hinzufügen
                  </button>
                </form>
              </div>

              {/* Chart Visualizer */}
              <div className={styles.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <h3 className={styles.cardTitle}>Visualisierung</h3>
                  <div className={styles.categoryTabs}>
                    {['line', 'bar', 'doughnut'].map((t) => (
                      <button
                        key={t}
                        type="button"
                        className={`${styles.categoryTab} ${selectedChartType === t ? styles.categoryTabActive : ''}`}
                        onClick={() => setSelectedChartType(t)}
                        style={{ textTransform: 'capitalize' }}
                      >
                        {t === 'line' ? 'Verlauf' : t === 'bar' ? 'Kategorien' : 'Verteilung'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.chartArea}>
                  {selectedChartType === 'line' && (
                    <LineChart transactions={transactions} />
                  )}

                  {selectedChartType === 'bar' && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <button
                          type="button"
                          className={`${styles.typeToggleBtn} ${doughnutFocusType === 'expense' ? styles.typeToggleActiveRed : ''}`}
                          style={{ padding: '0.2rem 0.6rem', fontSize: '0.65rem' }}
                          onClick={() => setDoughnutFocusType('expense')}
                        >
                          Ausgaben
                        </button>
                        <button
                          type="button"
                          className={`${styles.typeToggleBtn} ${doughnutFocusType === 'income' ? styles.typeToggleActiveGreen : ''}`}
                          style={{ padding: '0.2rem 0.6rem', fontSize: '0.65rem' }}
                          onClick={() => setDoughnutFocusType('income')}
                        >
                          Einnahmen
                        </button>
                      </div>
                      <BarChart data={chartCategoryData} total={doughnutTotal} />
                    </>
                  )}

                  {selectedChartType === 'doughnut' && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <button
                          type="button"
                          className={`${styles.typeToggleBtn} ${doughnutFocusType === 'expense' ? styles.typeToggleActiveRed : ''}`}
                          style={{ padding: '0.2rem 0.6rem', fontSize: '0.65rem' }}
                          onClick={() => setDoughnutFocusType('expense')}
                        >
                          Ausgaben
                        </button>
                        <button
                          type="button"
                          className={`${styles.typeToggleBtn} ${doughnutFocusType === 'income' ? styles.typeToggleActiveGreen : ''}`}
                          style={{ padding: '0.2rem 0.6rem', fontSize: '0.65rem' }}
                          onClick={() => setDoughnutFocusType('income')}
                        >
                          Einnahmen
                        </button>
                      </div>
                      <DoughnutChart data={chartCategoryData} total={doughnutTotal} />
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Intelligent Search bar & Stats */}
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Intelligente Transaktionssuche</h3>
              <div className={styles.searchBarContainer} style={{ marginBottom: '1rem' }}>
                <input
                  type="text"
                  placeholder="Empfänger, Händler oder Kategorie eingeben..."
                  className={styles.input}
                  value={financeSearch}
                  onChange={(e) => setFinanceSearch(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', fontSize: '0.85rem' }}
                />
                {financeSearch && (
                  <div className={styles.searchStats} style={{ marginTop: '0.5rem', display: 'flex', gap: '1.5rem', fontSize: '0.75rem', color: 'var(--text2)' }}>
                    <span>Einträge: <strong>{searchedTransactions.length}</strong></span>
                    <span>Umsatz: <strong>{searchTotal.toFixed(2)} €</strong></span>
                    <span>Schnitt: <strong>{searchAvg.toFixed(2)} €</strong></span>
                  </div>
                )}
              </div>
            </div>

            {/* Drill-down Detail Panel */}
            {selectedDrillDownCategory && (
              <div className={styles.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h3 className={styles.cardTitle}>Details: {selectedDrillDownCategory}</h3>
                  <button
                    type="button"
                    className={styles.subNavTab}
                    onClick={() => setSelectedDrillDownCategory(null)}
                    style={{ padding: '0.25rem 0.75rem', fontSize: '0.7rem' }}
                  >
                    Details ausblenden
                  </button>
                </div>
                {(() => {
                  const catTxs = transactions.filter(t => t.category === selectedDrillDownCategory);
                  const catTotal = catTxs.reduce((sum, t) => sum + t.amount, 0);
                  const catBudget = budgets[selectedDrillDownCategory] || 0;
                  return (
                    <div className={styles.drillDownContent}>
                      <div className={styles.drillDownMetrics} style={{ display: 'flex', gap: '1.5rem', marginBottom: '0.75rem', fontSize: '0.8rem' }}>
                        <span>Ausgegeben: <strong>{catTotal.toFixed(2)} €</strong></span>
                        {catBudget > 0 && <span>Budget: <strong>{catBudget.toFixed(2)} €</strong></span>}
                        {catBudget > 0 && (
                          <span>Verbleibend: <strong style={{ color: catBudget - catTotal < 0 ? '#ff4d4d' : '#00c48c' }}>{(catBudget - catTotal).toFixed(2)} €</strong></span>
                        )}
                      </div>
                      <div className={styles.timelineList}>
                        {catTxs.map(t => (
                          <div key={t.id} className={styles.timelineRow} style={{ cursor: 'default' }}>
                            <div className={styles.timelineLeft}>
                              <span className={styles.timelineDate}>{t.date}</span>
                              <span className={styles.timelineDesc}>{t.description || 'Pronoia Transaktion'}</span>
                            </div>
                            <div className={styles.timelineRight}>
                              <span className={t.type === 'income' ? styles.timelineIncome : styles.timelineExpense}>
                                {t.type === 'income' ? '+' : '-'}{t.amount.toFixed(2)} €
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Timeline Activity View (Heute, Gestern, Letzte Woche, Älter) */}
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Aktivität</h3>
              <div className={styles.timelineContainer}>
                {searchedTransactions.length === 0 ? (
                  <div className={styles.emptyState}>
                    <p className={styles.emptyText}>Keine passenden Transaktionen gelistet.</p>
                  </div>
                ) : (
                  (() => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const yesterday = new Date(today);
                    yesterday.setDate(yesterday.getDate() - 1);
                    const lastWeek = new Date(today);
                    lastWeek.setDate(lastWeek.getDate() - 7);

                    const sections = {
                      heute: [],
                      gestern: [],
                      letzteWoche: [],
                      aelter: []
                    };

                    searchedTransactions.forEach(t => {
                      if (!t.date) {
                        sections.aelter.push(t);
                        return;
                      }
                      const tDate = new Date(t.date);
                      tDate.setHours(0, 0, 0, 0);
                      if (tDate.getTime() === today.getTime()) {
                        sections.heute.push(t);
                      } else if (tDate.getTime() === yesterday.getTime()) {
                        sections.gestern.push(t);
                      } else if (tDate.getTime() >= lastWeek.getTime()) {
                        sections.letzteWoche.push(t);
                      } else {
                        sections.aelter.push(t);
                      }
                    });

                    return Object.entries(sections).map(([key, list]) => {
                      if (list.length === 0) return null;
                      const title = key === 'heute' ? 'Heute' : key === 'gestern' ? 'Gestern' : key === 'letzteWoche' ? 'Letzte Woche' : 'Älter';
                      return (
                        <div key={key} className={styles.timelineSection} style={{ marginBottom: '1rem' }}>
                          <h4 className={styles.timelineSectionHeader} style={{ fontSize: '0.75rem', color: 'var(--text3)', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.25rem', marginBottom: '0.5rem' }}>
                            {title}
                          </h4>
                          <div className={styles.timelineList} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            {list.map(t => (
                              <div
                                key={t.id}
                                className={styles.timelineRow}
                                onClick={() => setSelectedDrillDownCategory(t.category)}
                                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', borderRadius: '6px', background: 'rgba(255,255,255,0.02)', cursor: 'pointer', transition: 'background 0.2s' }}
                              >
                                <div className={styles.timelineLeft} style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span className={styles.timelineDesc} style={{ fontSize: '0.8rem', fontWeight: 500 }}>{t.description || 'Pronoia Transaktion'}</span>
                                  <span className={styles.timelineCategory} style={{ fontSize: '0.65rem', color: 'var(--text3)', marginTop: '0.1rem' }}>{t.category}</span>
                                </div>
                                <div className={styles.timelineRight} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                  <span className={t.type === 'income' ? styles.timelineIncome : styles.timelineExpense} style={{ fontSize: '0.8rem', fontWeight: 'bold', color: t.type === 'income' ? '#00c48c' : 'var(--text)' }}>
                                    {t.type === 'income' ? '+' : '-'}{t.amount.toFixed(2)} €
                                  </span>
                                  <button
                                    type="button"
                                    className={styles.deleteBtn}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteTransaction(t.id);
                                    }}
                                    title="Löschen"
                                    style={{ fontSize: '0.7rem', opacity: 0.5 }}
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    });
                  })()
                )}
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'focus' && (

          <div className={styles.focusLayout}>
            <div className={styles.focusTimerContainer}>
              <div className={styles.focusRing}>
                <svg className={styles.focusRingSvg}>
                  <circle className={styles.focusRingBg} cx="90" cy="90" r="80" />
                  <circle
                    className={styles.focusRingFill}
                    cx="90"
                    cy="90"
                    r="80"
                    strokeDasharray="502"
                    strokeDashoffset={strokeDashoffset}
                  />
                </svg>
                <div className={styles.focusTimeDisplay}>
                  <span className={styles.focusMinutes}>{formatTime(focusTimeLeft)}</span>
                  <span className={styles.focusSeconds}>ÜBRIG</span>
                </div>
              </div>

              <div className={styles.focusModeLabel}>
                {focusRunning ? 'FOCUS AKTIV' : 'PAUSIERT'}
              </div>

              <div className={styles.focusPresets}>
                {[25, 45, 60].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    className={`${styles.focusPresetBtn} ${focusPreset === mins ? styles.focusPresetActive : ''}`}
                    onClick={() => handlePresetSelect(mins)}
                  >
                    {mins} Min
                  </button>
                ))}
              </div>

              <div className={styles.focusControls}>
                <button
                  type="button"
                  className={`${styles.focusControlBtn} ${styles.focusStartBtn}`}
                  onClick={handleStartPauseFocus}
                >
                  {focusRunning ? 'Pause' : 'Start'}
                </button>
                <button
                  type="button"
                  className={styles.focusControlBtn}
                  onClick={handleResetFocus}
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'notes' && (
          <div className={styles.notesLayout}>
            {/* Create note card */}
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Session Notizen</h3>
              <p className={styles.desc} style={{ marginTop: '-0.5rem' }}>
                Halte wichtige Erkenntnisse oder Aufgaben während deines aktuellen Blocks <strong>"{activeBlock.title}"</strong> fest.
              </p>

              <form onSubmit={handleAddNote} className={styles.mappingForm}>
                <div className={styles.formGroup}>
                  <textarea
                    placeholder="Notizen zum aktiven Block verfassen..."
                    className={styles.textarea}
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className={styles.submitBtn}>
                  Notiz Speichern
                </button>
              </form>
            </div>

            {/* List notes */}
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Verlauf Notizen ({notesList.length})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {notesList.map((n) => (
                  <div key={n.id} className={styles.noteEntry}>
                    <div className={styles.noteHeader}>
                      <span className={styles.noteBlock}>Block: {n.blockTitle}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className={styles.noteTime}>{n.time}</span>
                        <button
                          type="button"
                          className={styles.noteDeleteBtn}
                          onClick={() => handleDeleteNote(n.id)}
                        >
                          Löschen
                        </button>
                      </div>
                    </div>
                    <p className={styles.noteText}>{n.text}</p>
                  </div>
                ))}

                {notesList.length === 0 && (
                  <div className={styles.emptyState}>
                    <p className={styles.emptyText}>Noch keine Notizen verfasst.</p>
                    <p className={styles.emptyText} style={{ opacity: 0.65, fontSize: '0.85em', marginTop: '0.35rem' }}>
                      Halte Gedanken aus deinen Fokus-Blöcken fest — Notizen bleiben über Sessions erhalten.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
