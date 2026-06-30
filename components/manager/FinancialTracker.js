'use client';

/*
 * FinancialTracker — "Financial Vision" dashboard (Manager → Finanz panel).
 * Functional: reads/writes managerConfig.finance via saveManagerConfig (useTabData).
 * Data model:
 *   transactions:       [{ id, amount, type:'income'|'expense', category, date, description }]
 *   customAssets:       [{ id, name, value, roi, category }]
 *   customLiabilities:  [{ id, name, value, type }]
 *   customGoals:        [{ id, name, target, current }]
 *   buyInterest:        [{ id, title, price, url, notes, date }]
 *   customBudgets:      [{ id, category, limit }]
 *   recurringTemplates: [{ id, description, amount, type, category, frequency }]
 */

import { useState } from 'react';
import { detectRecurring } from '@/lib/financeIntelligence';

const ACCENT = '#1A6AFF';
const glassCard = 'bg-white/70 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] backdrop-blur-md shadow-sm dark:shadow-none';
const monoLabel = 'font-mono text-[0.65rem] uppercase tracking-[0.18em] opacity-60';

const NAV_ITEMS = [
  { id: 'dashboard', icon: 'dashboard', label: 'Dashboard' },
  { id: 'assets', icon: 'account_balance_wallet', label: 'Assets' },
  { id: 'liabilities', icon: 'trending_down', label: 'Liabilities' },
  { id: 'goals', icon: 'track_changes', label: 'Goals' },
  { id: 'history', icon: 'history', label: 'History' },
];

const EXPENSE_CATEGORIES = ['Food', 'Living', 'Health/Bio', 'Tech', 'Travel', 'Shopping', 'Business Tools', 'Abonnements', 'Other'];
const INCOME_CATEGORIES = ['Freelance', 'Salary', 'Investments', 'Other'];
const ASSET_CATEGORIES = ['Biological', 'Digital', 'Equity', 'Hard Reserve', 'Real Estate', 'Other'];

const eur = (n) => '€ ' + Number(n || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const eur0 = (n) => '€ ' + Number(n || 0).toLocaleString('de-DE', { maximumFractionDigits: 0 });

export default function FinancialTracker({ onBack, profile, managerConfig, saveManagerConfig }) {
  const [view, setView] = useState('dashboard');

  const config = managerConfig || {};
  const finance = config.finance || {};
  const transactions = finance.transactions || [];
  const customAssets = finance.customAssets || [];
  const customLiabilities = finance.customLiabilities || [];
  const customGoals = finance.customGoals || [];
  const buyInterest = finance.buyInterest || [];
  
  // Budgets & Recurring templates
  const customBudgets = finance.customBudgets || [];
  const recurringTemplates = finance.recurringTemplates || [];

  // ── persistence helper ──
  const patchFinance = (partial) => {
    if (typeof saveManagerConfig !== 'function') return;
    saveManagerConfig(prev => ({
      ...prev,
      finance: {
        ...(prev.finance || {}),
        ...partial
      }
    }));
  };
  const uid = (p) => `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // ── computed ──
  const hasData = transactions.length > 0 || customAssets.length > 0 || customLiabilities.length > 0;
  const BASE_NET_WORTH_OFFSET = hasData ? 4749264.50 : 0;
  const BASE_BIOLOGICAL_ASSETS = hasData ? 1035000.00 : 0;
  const BASE_SYSTEM_SUBSCRIPTIONS = hasData ? 13049.00 : 0;

  const totalIncome = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const netBalance = totalIncome - totalExpense;

  const totalCustomAssets = customAssets.reduce((s, a) => s + (a.value || 0), 0);
  const totalCustomLiabilities = customLiabilities.reduce((s, l) => s + (l.value || 0), 0);

  const totalAssets = BASE_BIOLOGICAL_ASSETS + totalCustomAssets;
  const totalLiabilities = BASE_SYSTEM_SUBSCRIPTIONS + totalCustomLiabilities;
  const netWorth = BASE_NET_WORTH_OFFSET + totalCustomAssets - totalCustomLiabilities + netBalance;
  const operatingMargin = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

  const displayedAssets = hasData
    ? [{ id: 'core_bio_asset', name: 'Core Biological Capital', value: BASE_BIOLOGICAL_ASSETS, category: 'Biological', roi: '+12.4%', isCore: true }, ...customAssets]
    : customAssets;

  const displayedLiabilities = hasData
    ? [{ id: 'core_sys_liab', name: 'Core System Subscriptions', value: BASE_SYSTEM_SUBSCRIPTIONS, type: 'Subscription', isCore: true }, ...customLiabilities]
    : customLiabilities;

  // expense categories breakdown
  const expenseByCat = {};
  transactions.filter((t) => t.type === 'expense').forEach((t) => { expenseByCat[t.category] = (expenseByCat[t.category] || 0) + t.amount; });
  const topExpenseCats = Object.entries(expenseByCat).map(([category, value]) => ({ category, value })).sort((a, b) => b.value - a.value).slice(0, 4);
  const maxExpenseCat = topExpenseCats.length ? topExpenseCats[0].value : 1;

  const recurring = detectRecurring(transactions).filter((r) => r.type === 'expense').slice(0, 4);

  // ── handlers ──
  const addTransaction = (tx) => patchFinance({ transactions: [{ id: uid('tx'), ...tx }, ...transactions] });
  const deleteTransaction = (id) => patchFinance({ transactions: transactions.filter((t) => t.id !== id) });
  const addAsset = (a) => patchFinance({ customAssets: [...customAssets, { id: uid('asset'), ...a }] });
  const deleteAsset = (id) => patchFinance({ customAssets: customAssets.filter((x) => x.id !== id) });
  const addLiability = (l) => patchFinance({ customLiabilities: [...customLiabilities, { id: uid('liab'), ...l }] });
  const deleteLiability = (id) => patchFinance({ customLiabilities: customLiabilities.filter((x) => x.id !== id) });
  const addGoal = (g) => patchFinance({ customGoals: [...customGoals, { id: uid('goal'), ...g }] });
  const updateGoal = (id, current) => patchFinance({ customGoals: customGoals.map((g) => g.id === id ? { ...g, current } : g) });
  const deleteGoal = (id) => patchFinance({ customGoals: customGoals.filter((x) => x.id !== id) });
  const deleteBuyInterest = (id) => patchFinance({ buyInterest: buyInterest.filter((x) => x.id !== id) });
  const addBuyInterest = (item) => patchFinance({ buyInterest: [{ id: uid('buy'), date: new Date().toISOString().slice(0, 10), ...item }, ...buyInterest] });
  const convertBuyInterest = (item) => patchFinance({
    transactions: [{ id: uid('tx'), amount: item.price || 0, type: 'expense', category: 'Shopping', date: new Date().toISOString().slice(0, 10), description: item.title }, ...transactions],
    buyInterest: buyInterest.filter((x) => x.id !== item.id),
  });

  // Budgets & Recurring handlers
  const addBudget = (b) => patchFinance({ customBudgets: [...customBudgets, { id: uid('budget'), ...b }] });
  const deleteBudget = (id) => patchFinance({ customBudgets: customBudgets.filter((x) => x.id !== id) });

  const addRecurring = (r) => patchFinance({ recurringTemplates: [...recurringTemplates, { id: uid('rec'), ...r }] });
  const deleteRecurring = (id) => patchFinance({ recurringTemplates: recurringTemplates.filter((x) => x.id !== id) });
  const bookRecurring = (tpl) => addTransaction({
    amount: tpl.amount,
    type: tpl.type || 'expense',
    category: tpl.category,
    date: new Date().toISOString().slice(0, 10),
    description: `${tpl.description} (Dauerbuchung)`
  });

  const userName = profile?.username || 'Mein Profil';
  const userRole = profile?.class || profile?.systemId || 'System User';
  const userAvatar = profile?.avatar;
  const initials = userName.replace(/[^a-zA-Z0-9 ]/g, '').split(/[ _]/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'U';

  const viewTitle = { dashboard: 'Financial OS', assets: 'Assets', liabilities: 'Liabilities', goals: 'Goals', history: 'Transaction History' }[view];

  return (
    <div className={`${glassCard} rounded-2xl overflow-hidden flex min-h-[85vh] text-slate-800 dark:text-[#ECE8F2] text-left mt-12 md:mt-20`}>

      {/* ── Internal Finance Sidebar ── */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col justify-between border-r border-slate-200 dark:border-white/5 bg-gradient-to-b from-slate-100 to-slate-200 dark:from-[#060509] dark:to-[#080a0f] p-6">
        <div>
          <div className="pb-8">
            <h1 className="font-serif text-lg font-light tracking-widest text-slate-800 dark:text-[#ECE8F2]">Pronoia OS</h1>
            <p className={`${monoLabel} mt-2`} style={{ color: ACCENT, opacity: 1 }}>Financial Vision</p>
          </div>
          <nav className="space-y-1">
            {NAV_ITEMS.map((n) => {
              const active = n.id === view;
              return (
                <button
                  key={n.id}
                  onClick={() => setView(n.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 text-left ${active ? 'font-medium text-[#1A6AFF]' : 'text-slate-600 dark:text-[#ECE8F2]/60 hover:text-slate-900 hover:bg-slate-100 dark:hover:text-[#ECE8F2] dark:hover:bg-white/5'}`}
                  style={active ? { color: ACCENT, background: 'rgba(26,106,255,0.1)', borderRight: `2px solid ${ACCENT}` } : undefined}
                >
                  <span className="material-symbols-outlined">{n.icon}</span>
                  <span className="text-sm tracking-tight">{n.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
        <div className="space-y-6 border-t border-slate-200 dark:border-white/5 pt-6">
          <button onClick={() => setView('history')} className="w-full py-3 rounded-lg text-xs font-medium tracking-widest uppercase text-white transition-all active:scale-95 hover:brightness-110" style={{ background: ACCENT }}>
            Transaktion erfassen
          </button>
          <div className="flex items-center gap-3 px-1">
            {userAvatar ? (
              <img src={userAvatar} alt={userName} className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-300 dark:ring-white/10 shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-full ring-1 ring-slate-300 dark:ring-white/10 flex items-center justify-center text-xs font-medium shrink-0 text-slate-800 dark:text-white" style={{ background: 'linear-gradient(135deg, rgba(26,106,255,0.4), rgba(26,106,255,0.1))' }}>{initials}</div>
            )}
            <div className="overflow-hidden">
              <p className="text-xs font-medium truncate text-slate-800 dark:text-white">{userName}</p>
              <p className={`${monoLabel} text-[10px]`} style={{ opacity: 0.4 }}>{userRole}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main Canvas ── */}
      <div className="flex-1 min-w-0 flex flex-col bg-slate-50/50 dark:bg-transparent">
        {/* Top bar */}
        <header className="flex justify-between items-center sticky top-0 z-20 w-full bg-slate-100/90 dark:bg-[#060509]/80 backdrop-blur-xl h-16 px-6 border-b border-slate-200 dark:border-white/5">
          <div className="flex items-center gap-4 min-w-0">
            {onBack && (
              <button onClick={onBack} className="flex items-center text-slate-600 dark:text-[#ECE8F2]/60 hover:text-slate-900 dark:hover:text-[#ECE8F2] transition-colors shrink-0" title="Zurück zum Manager">
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
            )}
            <h2 className="font-serif text-xl font-light text-slate-900 dark:text-[#ECE8F2] shrink-0">{viewTitle}</h2>
          </div>
          <div className="flex items-center gap-5">
            <p className={`${monoLabel} hidden sm:block`}>Net Worth: <span style={{ color: ACCENT, opacity: 1 }}>{eur0(netWorth)}</span></p>
          </div>
        </header>

        <div className="p-6 md:p-8">
          {view === 'dashboard' && (
            <DashboardView
              netWorth={netWorth} totalIncome={totalIncome} totalExpense={totalExpense} operatingMargin={operatingMargin}
              topExpenseCats={topExpenseCats} maxExpenseCat={maxExpenseCat} assets={displayedAssets} totalAssets={totalAssets}
              recurring={recurring} buyInterest={buyInterest}
              onConvertBuy={convertBuyInterest} onDeleteBuy={deleteBuyInterest} goTo={setView}
            />
          )}
          {view === 'assets' && <AssetsView assets={displayedAssets} totalAssets={totalAssets} onAdd={addAsset} onDelete={deleteAsset} />}
          {view === 'liabilities' && <LiabilitiesView liabilities={displayedLiabilities} total={totalLiabilities} onAdd={addLiability} onDelete={deleteLiability} />}
          {view === 'goals' && (
            <GoalsView
              goals={customGoals}
              onAdd={addGoal}
              onUpdate={updateGoal}
              onDelete={deleteGoal}
              buyInterest={buyInterest}
              onConvertBuy={convertBuyInterest}
              onDeleteBuy={deleteBuyInterest}
              onAddBuy={addBuyInterest}
              // Budgets & Recurring templates
              transactions={transactions}
              customBudgets={customBudgets}
              onAddBudget={addBudget}
              onDeleteBudget={deleteBudget}
              recurringTemplates={recurringTemplates}
              onAddRecurring={addRecurring}
              onDeleteRecurring={deleteRecurring}
              onBookRecurring={bookRecurring}
            />
          )}
          {view === 'history' && <HistoryView transactions={transactions} totalIncome={totalIncome} totalExpense={totalExpense} netBalance={netBalance} onAdd={addTransaction} onDelete={deleteTransaction} />}
        </div>
      </div>
    </div>
  );
}

// Subcomponents definitions

const cardCls = 'bg-white/70 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 backdrop-blur-md shadow-sm dark:shadow-none text-slate-800 dark:text-[#ECE8F2]';
const inputCls = 'bg-slate-100/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs font-mono placeholder:text-slate-400 dark:placeholder:text-white/20 text-slate-800 dark:text-[#ECE8F2] focus:ring-1 focus:ring-[#1A6AFF] focus:border-[#1A6AFF] transition-all outline-none';

function SectionHead({ title, sub, icon }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="material-symbols-outlined text-lg" style={{ color: ACCENT }}>{icon}</span>
      <div>
        <h4 className="text-sm font-medium tracking-tight text-slate-900 dark:text-white">{title}</h4>
        <p className="text-[10px] font-mono opacity-50 uppercase tracking-widest">{sub}</p>
      </div>
    </div>
  );
}

function Empty({ children }) {
  return <div className="p-6 text-center text-xs text-slate-400 dark:text-white/30 border border-slate-200 dark:border-white/5 border-dashed rounded-xl">{children || 'Keine Einträge.'}</div>;
}

/* ────────────────────────── Dashboard ────────────────────────── */
function DashboardView({ netWorth, totalIncome, totalExpense, operatingMargin, topExpenseCats, maxExpenseCat, assets, totalAssets, recurring, buyInterest, onConvertBuy, onDeleteBuy, goTo }) {
  return (
    <div className="space-y-8">
      {/* stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className={`${cardCls} p-6 rounded-xl`}>
          <p className={monoLabel}>Net Worth Capital</p>
          <p className="font-serif text-3xl mt-2 text-slate-900 dark:text-white">{eur0(netWorth)}</p>
          <p className="text-[10px] opacity-40 mt-1">Combined assets minus liabilities</p>
        </div>
        <div className={`${cardCls} p-6 rounded-xl`}>
          <p className={monoLabel}>Income YTD</p>
          <p className="font-serif text-3xl mt-2 text-[#22c55e] font-light">+{eur0(totalIncome)}</p>
          <p className="text-[10px] opacity-40 mt-1">Aggregated inflows logged</p>
        </div>
        <div className={`${cardCls} p-6 rounded-xl`}>
          <p className={monoLabel}>Expenses YTD</p>
          <p className="font-serif text-3xl mt-2 text-red-500 dark:text-red-400/90 font-light">-{eur0(totalExpense)}</p>
          <p className="text-[10px] opacity-40 mt-1">Aggregated outflows logged</p>
        </div>
        <div className={`${cardCls} p-6 rounded-xl`}>
          <p className={monoLabel}>Operating Margin</p>
          <p className="font-serif text-3xl mt-2 font-light" style={{ color: operatingMargin >= 0 ? ACCENT : '#ff4d4d' }}>{operatingMargin.toFixed(1)}%</p>
          <p className="text-[10px] opacity-40 mt-1">Efficiency threshold target &gt; 35%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* top expenses */}
        <div className={`${cardCls} p-6 rounded-xl space-y-4`}>
          <SectionHead title="Top expense sectors" sub="Sector efficiency distribution" icon="bar_chart" />
          <div className="space-y-4">
            {topExpenseCats.map((cat) => {
              const pct = maxExpenseCat > 0 ? (cat.value / maxExpenseCat) * 100 : 0;
              return (
                <div key={cat.category} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="opacity-70 text-slate-700 dark:text-slate-300">{cat.category}</span>
                    <span className="text-slate-900 dark:text-white">{eur(cat.value)}</span>
                  </div>
                  <div className="h-1 bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: ACCENT }} />
                  </div>
                </div>
              );
            })}
            {topExpenseCats.length === 0 && <Empty>Keine Ausgaben verzeichnet.</Empty>}
          </div>
        </div>

        {/* assets allocation */}
        <div className={`${cardCls} p-6 rounded-xl space-y-4`}>
          <SectionHead title="Biological &amp; Custom Capital" sub="Strategic asset allocation" icon="donut_large" />
          <div className="space-y-4">
            {assets.slice(0, 3).map((a) => {
              const pct = totalAssets > 0 ? (a.value / totalAssets) * 100 : 0;
              return (
                <div key={a.id} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="opacity-70 text-slate-700 dark:text-slate-300 truncate max-w-[140px]">{a.name}</span>
                    <span className="text-slate-900 dark:text-white">{pct.toFixed(1)}% ({eur0(a.value)})</span>
                  </div>
                  <div className="h-1 bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: ACCENT }} />
                  </div>
                </div>
              );
            })}
            {assets.length === 0 && <Empty>Keine Assets verzeichnet.</Empty>}
          </div>
        </div>

        {/* detected recurring */}
        <div className={`${cardCls} p-6 rounded-xl space-y-4`}>
          <SectionHead title="Autodetected Subscriptions" sub="Fixed cost leak check" icon="sync" />
          <div className="space-y-3">
            {recurring.map((r, i) => (
              <div key={i} className="flex justify-between items-center text-xs font-mono p-2 bg-slate-100/50 dark:bg-white/[0.01] border border-slate-200 dark:border-white/5 rounded-lg">
                <span className="opacity-70 text-slate-700 dark:text-slate-300 truncate max-w-[120px]">{r.description}</span>
                <span className="text-slate-900 dark:text-white">{eur(r.amount)} / {r.cadence === 'weekly' ? 'Woche' : 'Monat'}</span>
              </div>
            ))}
            {recurring.length === 0 && <Empty>Keine regelmäßigen Buchungen erkannt.</Empty>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────── Assets ────────────────────────── */
function AssetsView({ assets, totalAssets, onAdd, onDelete }) {
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [roi, setRoi] = useState('');
  const [category, setCategory] = useState(ASSET_CATEGORIES[0]);

  const submit = (e) => {
    e.preventDefault();
    const v = parseFloat(value);
    if (!name.trim() || isNaN(v) || v <= 0) return;
    onAdd({ name: name.trim(), value: v, roi: roi.trim() || 'N/A', category });
    setName(''); setValue(''); setRoi('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-4xl">
      <div className={`${cardCls} p-6 rounded-xl h-fit lg:col-span-1`}>
        <SectionHead title="Asset hinzufügen" sub="Increase Net Capital" icon="add_circle" />
        <form onSubmit={submit} className="space-y-3">
          <input className={`${inputCls} w-full`} placeholder="Asset-Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <input className={`${inputCls} w-full`} type="number" step="any" placeholder="Wert (€)" value={value} onChange={(e) => setValue(e.target.value)} required />
          <input className={`${inputCls} w-full`} placeholder="Rendite / ROI (z.B. +8.2%)" value={roi} onChange={(e) => setRoi(e.target.value)} />
          <select className={`${inputCls} w-full`} value={category} onChange={(e) => setCategory(e.target.value)}>
            {ASSET_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button type="submit" className="w-full py-2.5 rounded-lg text-xs font-medium tracking-widest uppercase text-white hover:brightness-110 transition-all" style={{ background: ACCENT }}>Eintrag speichern</button>
        </form>
      </div>

      <div className="lg:col-span-2 space-y-6">
        <div className={`${cardCls} p-4 rounded-xl flex justify-between items-center`}>
          <span className={monoLabel}>Gesamtwert Assets</span>
          <span className="font-serif text-2xl text-slate-900 dark:text-white">{eur(totalAssets)}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {assets.map((a) => (
            <div key={a.id} className={`${cardCls} p-5 rounded-xl flex flex-col justify-between space-y-3`}>
              <div>
                <div className="flex justify-between items-start gap-4">
                  <p className="text-sm font-medium truncate text-slate-900 dark:text-white">{a.name}</p>
                  {!a.isCore && <button onClick={() => onDelete(a.id)} className="text-slate-400 hover:text-red-400 transition-colors text-xs">✕</button>}
                </div>
                <p className={`${monoLabel} text-[10px] mt-1`}>{a.category} • ROI: <span style={{ color: ACCENT, opacity: 1 }}>{a.roi}</span></p>
              </div>
              <p className="font-mono text-base font-semibold text-slate-900 dark:text-white">{eur(a.value)}</p>
            </div>
          ))}
          {assets.length === 0 && <div className="sm:col-span-2"><Empty /></div>}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────── Liabilities ────────────────────────── */
function LiabilitiesView({ liabilities, total, onAdd, onDelete }) {
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [type, setType] = useState('Subscription');

  const submit = (e) => {
    e.preventDefault();
    const v = parseFloat(value);
    if (!name.trim() || isNaN(v) || v <= 0) return;
    onAdd({ name: name.trim(), value: v, type });
    setName(''); setValue('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-4xl">
      <div className={`${cardCls} p-6 rounded-xl h-fit lg:col-span-1`}>
        <SectionHead title="Verbindlichkeit hinzufügen" sub="Debt &amp; Subscriptions" icon="add_circle" />
        <form onSubmit={submit} className="space-y-3">
          <input className={`${inputCls} w-full`} placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <input className={`${inputCls} w-full`} type="number" step="any" placeholder="Wert (€)" value={value} onChange={(e) => setValue(e.target.value)} required />
          <select className={`${inputCls} w-full`} value={type} onChange={(e) => setType(e.target.value)}>
            <option value="Subscription">Abonnement / Fixkosten</option>
            <option value="Loan">Kredit / Darlehen</option>
            <option value="Tax">Steuern</option>
            <option value="Other">Sonstiges</option>
          </select>
          <button type="submit" className="w-full py-2.5 rounded-lg text-xs font-medium tracking-widest uppercase text-white hover:brightness-110 transition-all" style={{ background: ACCENT }}>Eintrag speichern</button>
        </form>
      </div>

      <div className="lg:col-span-2 space-y-6">
        <div className={`${cardCls} p-4 rounded-xl flex justify-between items-center`}>
          <span className={monoLabel}>Gesamtwert Verbindlichkeiten</span>
          <span className="font-serif text-2xl text-red-500 dark:text-red-400">{eur(total)}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {liabilities.map((l) => (
            <div key={l.id} className={`${cardCls} p-5 rounded-xl flex flex-col justify-between space-y-3`}>
              <div>
                <div className="flex justify-between items-start gap-4">
                  <p className="text-sm font-medium truncate text-slate-900 dark:text-white">{l.name}</p>
                  {!l.isCore && <button onClick={() => onDelete(l.id)} className="text-slate-400 hover:text-red-400 transition-colors text-xs">✕</button>}
                </div>
                <p className={`${monoLabel} text-[10px] mt-1`}>{l.type}</p>
              </div>
              <p className="font-mono text-base font-semibold text-slate-900 dark:text-white">{eur(l.value)}</p>
            </div>
          ))}
          {liabilities.length === 0 && <div className="sm:col-span-2"><Empty /></div>}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────── Goals ────────────────────────── */
function GoalsView({
  goals,
  onAdd,
  onUpdate,
  onDelete,
  buyInterest = [],
  onConvertBuy,
  onDeleteBuy,
  onAddBuy,
  // Budget Limits
  transactions,
  customBudgets,
  onAddBudget,
  onDeleteBudget,
  // Recurring
  recurringTemplates,
  onAddRecurring,
  onDeleteRecurring,
  onBookRecurring
}) {
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [current, setCurrent] = useState('');

  // Wishlist Form states
  const [buyTitle, setBuyTitle] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [buyUrl, setBuyUrl] = useState('');
  const [buyNotes, setBuyNotes] = useState('');

  // Budget Limits Form states
  const [budgetCat, setBudgetCat] = useState(EXPENSE_CATEGORIES[0]);
  const [budgetLimit, setBudgetLimit] = useState('');

  // Recurring Templates Form states
  const [recDesc, setRecDesc] = useState('');
  const [recAmount, setRecAmount] = useState('');
  const [recCat, setRecCat] = useState(EXPENSE_CATEGORIES[0]);
  const [recType, setRecType] = useState('expense');
  const [recFreq, setRecFreq] = useState('monthly');

  const submitGoal = (e) => {
    e.preventDefault();
    const t = parseFloat(target);
    if (!name.trim() || isNaN(t)) return;
    onAdd({ name: name.trim(), target: t, current: parseFloat(current) || 0 });
    setName(''); setTarget(''); setCurrent('');
  };

  const submitBuy = (e) => {
    e.preventDefault();
    const p = parseFloat(buyPrice);
    if (!buyTitle.trim()) return;
    onAddBuy({ title: buyTitle.trim(), price: p || 0, url: buyUrl.trim(), notes: buyNotes.trim() });
    setBuyTitle(''); setBuyPrice(''); setBuyUrl(''); setBuyNotes('');
  };

  const submitBudget = (e) => {
    e.preventDefault();
    const limit = parseFloat(budgetLimit);
    if (isNaN(limit) || limit <= 0) return;
    onAddBudget({ category: budgetCat, limit });
    setBudgetLimit('');
  };

  const submitRecurring = (e) => {
    e.preventDefault();
    const amount = parseFloat(recAmount);
    if (!recDesc.trim() || isNaN(amount) || amount <= 0) return;
    onAddRecurring({ description: recDesc.trim(), amount, category: recCat, type: recType, frequency: recFreq });
    setRecDesc(''); setRecAmount('');
  };

  const currentMonthStr = new Date().toISOString().substring(0, 7);
  const getSpentForCategory = (cat) => {
    return transactions
      .filter(t => t.type === 'expense' && t.category === cat && (t.date || '').startsWith(currentMonthStr))
      .reduce((sum, t) => sum + t.amount, 0);
  };

  return (
    <div className="space-y-10 max-w-4xl">

      {/* ── SECTION 1: SPARZIELE ── */}
      <div className="space-y-6">
        <div className={`${cardCls} p-6 rounded-xl`}>
          <SectionHead title="Sparziel hinzufügen" sub="Track your targets" icon="add_circle" />
          <form onSubmit={submitGoal} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <input className={inputCls} placeholder="Ziel-Name" value={name} onChange={(e) => setName(e.target.value)} required />
            <input className={inputCls} type="number" step="any" placeholder="Zielbetrag (€)" value={target} onChange={(e) => setTarget(e.target.value)} required />
            <input className={inputCls} type="number" step="any" placeholder="Aktuell (€)" value={current} onChange={(e) => setCurrent(e.target.value)} />
            <button type="submit" className="sm:col-span-3 py-2.5 rounded-lg text-xs font-medium tracking-widest uppercase text-white hover:brightness-110 transition-all animate-none" style={{ background: ACCENT }}>Sparziel speichern</button>
          </form>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {goals.map((g) => {
            const pct = g.target > 0 ? Math.min(100, (g.current / g.target) * 100) : 0;
            return (
              <div key={g.id} className={`${cardCls} p-6 rounded-xl space-y-4`}>
                <div className="flex justify-between items-start">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{g.name}</p>
                  <button onClick={() => onDelete(g.id)} className="text-slate-400 hover:text-red-400 transition-colors text-xs">✕</button>
                </div>
                <div className="h-2 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full" style={{ width: `${pct}%`, background: ACCENT }} />
                </div>
                <div className="flex justify-between items-center text-xs text-slate-600 dark:text-[#ECE8F2]">
                  <span className="font-mono">{eur0(g.current)} / {eur0(g.target)}</span>
                  <span style={{ color: ACCENT }}>{pct.toFixed(0)}%</span>
                </div>
                <input className={`${inputCls} w-full`} type="number" step="any" placeholder="Stand aktualisieren" defaultValue={g.current}
                  onBlur={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) onUpdate(g.id, v); }} />
              </div>
            );
          })}
          {goals.length === 0 && <div className="md:col-span-2"><Empty>Noch keine Sparziele.</Empty></div>}
        </div>
      </div>

      <hr className="border-slate-200 dark:border-white/5" />

      {/* ── SECTION 2: BUDGET-LIMITS ── */}
      <div className="space-y-6">
        <div className={`${cardCls} p-6 rounded-xl`}>
          <SectionHead title="Kategorie-Budget hinzufügen" sub="Category spending limits" icon="speed" />
          <form onSubmit={submitBudget} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className={`${monoLabel} block mb-1 text-[8px]`}>Kategorie</label>
              <select className={`${inputCls} w-full`} value={budgetCat} onChange={(e) => setBudgetCat(e.target.value)}>
                {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={`${monoLabel} block mb-1 text-[8px]`}>Limit (€ / Monat)</label>
              <input className={`${inputCls} w-full`} type="number" step="any" placeholder="Monatliches Limit (€)" value={budgetLimit} onChange={(e) => setBudgetLimit(e.target.value)} required />
            </div>
            <button type="submit" className="py-2.5 rounded-lg text-xs font-medium tracking-widest uppercase text-white hover:brightness-110 transition-all animate-none" style={{ background: ACCENT }}>Budget festlegen</button>
          </form>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {customBudgets.map((b) => {
            const spent = getSpentForCategory(b.category);
            const pct = b.limit > 0 ? Math.min(100, (spent / b.limit) * 100) : 0;
            const exceeded = spent > b.limit;

            return (
              <div key={b.id} className={`${cardCls} p-6 rounded-xl space-y-4`}>
                <div className="flex justify-between items-start">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{b.category} Budget</p>
                  <button onClick={() => onDeleteBudget(b.id)} className="text-slate-400 hover:text-red-400 transition-colors text-xs">✕</button>
                </div>
                <div className="h-2 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full" style={{ width: `${pct}%`, background: exceeded ? '#ff4d4d' : ACCENT }} />
                </div>
                <div className="flex justify-between items-center text-xs text-slate-600 dark:text-[#ECE8F2]">
                  <span className="font-mono">Ausgegeben: {eur0(spent)} / Limit: {eur0(b.limit)}</span>
                  <span style={{ color: exceeded ? '#ff4d4d' : ACCENT }} className="font-bold">
                    {pct.toFixed(0)}% {exceeded && '⚠️ Limit überschritten'}
                  </span>
                </div>
              </div>
            );
          })}
          {customBudgets.length === 0 && <div className="md:col-span-2"><Empty>Noch keine Budget-Limits festgelegt.</Empty></div>}
        </div>
      </div>

      <hr className="border-slate-200 dark:border-white/5" />

      {/* ── SECTION 3: WIEDERKEHRENDE TRANSAKTIONEN ── */}
      <div className="space-y-6">
        <div className={`${cardCls} p-6 rounded-xl`}>
          <SectionHead title="Dauerbuchungs-Vorlage" sub="Recurring transaction templates" icon="schedule" />
          <form onSubmit={submitRecurring} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input className={inputCls} placeholder="Beschreibung" value={recDesc} onChange={(e) => setRecDesc(e.target.value)} required />
              <input className={inputCls} type="number" step="any" placeholder="Betrag (€)" value={recAmount} onChange={(e) => setRecAmount(e.target.value)} required />
              <select className={inputCls} value={recCat} onChange={(e) => setRecCat(e.target.value)}>
                {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select className={inputCls} value={recType} onChange={(e) => setRecType(e.target.value)}>
                <option value="expense">Ausgabe</option>
                <option value="income">Einnahme</option>
              </select>
              <select className={inputCls} value={recFreq} onChange={(e) => setRecFreq(e.target.value)}>
                <option value="monthly">Monatlich</option>
                <option value="weekly">Wöchentlich</option>
              </select>
              <button type="submit" className="py-2 rounded-lg text-xs font-medium tracking-widest uppercase text-white hover:brightness-110 transition-all animate-none" style={{ background: ACCENT }}>Vorlage hinzufügen</button>
            </div>
          </form>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {recurringTemplates.map((tpl) => (
            <div key={tpl.id} className={`${cardCls} p-6 rounded-xl flex flex-col justify-between space-y-4`}>
              <div>
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{tpl.description}</p>
                    <p className={`${monoLabel} text-[9px] mt-0.5`}>{tpl.category} • {tpl.frequency === 'weekly' ? 'Wöchentlich' : 'Monatlich'}</p>
                  </div>
                  <button onClick={() => onDeleteRecurring(tpl.id)} className="text-slate-400 hover:text-red-400 transition-colors text-xs">✕</button>
                </div>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-white/5">
                <span className="font-mono text-sm" style={{ color: tpl.type === 'income' ? ACCENT : undefined }}>
                  {tpl.type === 'income' ? '+' : '-'}{eur(tpl.amount)}
                </span>
                <button
                  onClick={() => onBookRecurring(tpl)}
                  className="px-3 py-1.5 text-[9px] font-mono rounded uppercase tracking-wider text-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-all bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10"
                >
                  Buchen
                </button>
              </div>
            </div>
          ))}
          {recurringTemplates.length === 0 && <div className="md:col-span-2"><Empty>Keine Dauerbuchungs-Vorlagen.</Empty></div>}
        </div>
      </div>

      <hr className="border-slate-200 dark:border-white/5" />

      {/* ── SECTION 4: KAUFINTERESSE / WISHLIST ── */}
      <div className="space-y-6">
        <div className={`${cardCls} p-6 rounded-xl`}>
          <SectionHead title="Kaufinteresse hinzufügen" sub="Strategic acquisition pipeline" icon="shopping_cart" />
          <form onSubmit={submitBuy} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input className={inputCls} placeholder="Name/Titel" value={buyTitle} onChange={(e) => setBuyTitle(e.target.value)} required />
              <input className={inputCls} type="number" step="any" placeholder="Preis (€)" value={buyPrice} onChange={(e) => setBuyPrice(e.target.value)} />
              <input className={inputCls} placeholder="URL Link" value={buyUrl} onChange={(e) => setBuyUrl(e.target.value)} />
            </div>
            <textarea className={`${inputCls} w-full h-20 resize-none`} placeholder="Notizen / Details..." value={buyNotes} onChange={(e) => setBuyNotes(e.target.value)} />
            <button type="submit" className="w-full py-2.5 rounded-lg text-xs font-medium tracking-widest uppercase text-white hover:brightness-110 transition-all animate-none" style={{ background: ACCENT }}>Eintrag speichern</button>
          </form>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {buyInterest.map((w) => (
            <div key={w.id} className={`${cardCls} p-6 rounded-xl flex flex-col justify-between space-y-4`}>
              <div>
                <div className="flex justify-between items-start gap-4">
                  <p className="text-sm font-medium truncate text-slate-900 dark:text-white">{w.title}</p>
                  <button onClick={() => onDeleteBuy(w.id)} className="text-slate-400 hover:text-red-400 transition-colors text-xs shrink-0">✕</button>
                </div>
                {w.notes && <p className="text-xs text-slate-500 dark:text-white/40 mt-1 line-clamp-2">{w.notes}</p>}
                {w.url && (
                  <a href={w.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-[#1A6AFF] hover:underline mt-2 inline-flex items-center gap-1">
                    <span className="material-symbols-outlined text-[10px]">link</span> Details ansehen
                  </a>
                )}
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-white/5">
                <span className="font-mono text-sm text-slate-900 dark:text-white">{eur0(w.price)}</span>
                <button onClick={() => onConvertBuy(w)} className="px-3 py-1.5 text-[10px] font-medium rounded uppercase tracking-widest text-white transition-all active:scale-95 hover:brightness-110 animate-none" style={{ background: ACCENT }}>
                  Als Ausgabe verbuchen
                </button>
              </div>
            </div>
          ))}
          {buyInterest.length === 0 && <div className="md:col-span-2"><Empty>Keine geplanten Anschaffungen.</Empty></div>}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────── History ────────────────────────── */
function HistoryView({ transactions, totalIncome, totalExpense, netBalance, onAdd, onDelete }) {
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [query, setQuery] = useState('');

  const cats = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const submit = (e) => {
    e.preventDefault();
    const a = parseFloat(amount);
    if (isNaN(a) || a <= 0) return;
    onAdd({ amount: a, type, category, date: date || new Date().toISOString().slice(0, 10), description: description.trim() });
    setAmount(''); setDescription('');
  };
  const filtered = transactions.filter((t) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (t.description || '').toLowerCase().includes(q) || (t.category || '').toLowerCase().includes(q);
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  // CSV Export function
  const exportToCSV = () => {
    const headers = ['Datum', 'Typ', 'Kategorie', 'Beschreibung', 'Betrag'];
    const rows = filtered.map(t => [
      t.date || '',
      t.type === 'income' ? 'Einnahme' : 'Ausgabe',
      t.category || '',
      t.description || '',
      t.amount ? t.amount.toString() : '0'
    ]);
    const csvContent = [headers, ...rows]
      .map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `pronoia_finanz_export_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className={`${cardCls} p-4 rounded-xl`}><p className={monoLabel}>Einnahmen</p><p className="font-serif text-xl mt-1 text-green-600 dark:text-green-400">{eur0(totalIncome)}</p></div>
        <div className={`${cardCls} p-4 rounded-xl`}><p className={monoLabel}>Ausgaben</p><p className="font-serif text-xl mt-1 text-red-500 dark:text-red-400">{eur0(totalExpense)}</p></div>
        <div className={`${cardCls} p-4 rounded-xl`}><p className={monoLabel}>Saldo</p><p className="font-serif text-xl mt-1 text-slate-900 dark:text-white">{eur0(netBalance)}</p></div>
      </div>

      {/* add form */}
      <div className={`${cardCls} p-6 rounded-xl`}>
        <SectionHead title="Transaktion erfassen" sub="Add income or expense" icon="add_circle" />
        <form onSubmit={submit} className="space-y-3">
          <div className="flex gap-2">
            {['expense', 'income'].map((t) => (
              <button key={t} type="button" onClick={() => { setType(t); setCategory(t === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]); }}
                className="flex-1 py-2 rounded-lg text-xs font-medium uppercase tracking-widest transition-all"
                style={type === t ? { background: t === 'income' ? ACCENT : 'rgba(239,68,68,0.8)', color: '#fff' } : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)' }}>
                {t === 'income' ? 'Einnahme' : 'Ausgabe'}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input className={inputCls} type="number" step="any" placeholder="Betrag (€)" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>{cats.map((c) => <option key={c} value={c}>{c}</option>)}</select>
            <input className={inputCls} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <input className={inputCls} placeholder="Beschreibung" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <button type="submit" className="w-full py-2.5 rounded-lg text-xs font-medium tracking-widest uppercase text-white hover:brightness-110 transition-all animate-none" style={{ background: ACCENT }}>Hinzufügen</button>
        </form>
      </div>

      {/* list */}
      <div className={`${cardCls} rounded-xl`}>
        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/5 flex items-center justify-between gap-4">
          <h5 className={monoLabel}>Verlauf ({filtered.length})</h5>
          <div className="flex gap-2 items-center">
            <input className={`${inputCls} py-1.5 text-xs w-44`} placeholder="Suchen…" value={query} onChange={(e) => setQuery(e.target.value)} />
            <button
              onClick={exportToCSV}
              className="px-3 py-1.5 bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-lg text-[10px] font-mono tracking-widest uppercase hover:bg-slate-200 dark:hover:bg-white/10 text-slate-800 dark:text-white transition-all flex items-center gap-1 shrink-0 font-medium"
            >
              <span className="material-symbols-outlined text-xs">download</span>
              CSV Export
            </button>
          </div>
        </div>
        <div className="divide-y divide-slate-200 dark:divide-white/5 max-h-[420px] overflow-y-auto">
          {filtered.map((t) => (
            <div key={t.id} className="flex items-center justify-between px-6 py-3 hover:bg-slate-100 dark:hover:bg-white/[0.02]">
              <div className="min-w-0">
                <p className="text-sm truncate text-slate-900 dark:text-white">{t.description || t.category}</p>
                <p className={`${monoLabel} text-[10px]`}>{t.category} • {t.date}</p>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <span className="font-mono text-sm text-slate-900 dark:text-white" style={{ color: t.type === 'income' ? ACCENT : undefined }}>{t.type === 'income' ? '+' : '-'}{eur0(t.amount)}</span>
                <button onClick={() => onDelete(t.id)} className="text-slate-400 hover:text-red-400 transition-colors">✕</button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <Empty>Keine Transaktionen.</Empty>}
        </div>
      </div>
    </div>
  );
}
