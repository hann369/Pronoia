/**
 * financeIntelligence.js — pure, local analysis helpers for the Finance Tracker.
 * No network, no LLM: deterministic heuristics over the transaction list.
 *
 * Transaction shape: { id, amount, type: 'income'|'expense', category,
 *                      date: 'YYYY-MM-DD', description }
 */

const DAY_MS = 24 * 60 * 60 * 1000;

function normKey(tx) {
  return `${tx.type}|${tx.category}|${(tx.description || '').trim().toLowerCase()}`;
}

/**
 * Detect recurring payments / subscriptions.
 * Groups transactions by (type, category, normalized description); a group is
 * recurring when it has ≥2 entries with similar amounts (±10%) and a roughly
 * regular interval (weekly 5–9 days or monthly 26–35 days).
 *
 * Returns [{ description, category, type, amount, intervalDays, cadence,
 *            occurrences, monthlyCost, lastDate }]
 */
export function detectRecurring(transactions) {
  const groups = new Map();
  for (const tx of transactions || []) {
    if (!tx.date || !tx.amount) continue;
    const key = normKey(tx);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(tx);
  }

  const result = [];
  for (const txs of groups.values()) {
    if (txs.length < 2) continue;

    const sorted = [...txs].sort((a, b) => new Date(a.date) - new Date(b.date));
    const avgAmount = sorted.reduce((s, t) => s + t.amount, 0) / sorted.length;
    const amountsSimilar = sorted.every((t) => Math.abs(t.amount - avgAmount) <= avgAmount * 0.1);
    if (!amountsSimilar) continue;

    const intervals = [];
    for (let i = 1; i < sorted.length; i++) {
      intervals.push((new Date(sorted[i].date) - new Date(sorted[i - 1].date)) / DAY_MS);
    }
    const avgInterval = intervals.reduce((s, v) => s + v, 0) / intervals.length;

    let cadence = null;
    if (avgInterval >= 5 && avgInterval <= 9) cadence = 'weekly';
    else if (avgInterval >= 26 && avgInterval <= 35) cadence = 'monthly';
    if (!cadence) continue;

    const last = sorted[sorted.length - 1];
    result.push({
      description: last.description || last.category,
      category: last.category,
      type: last.type,
      amount: Math.round(avgAmount * 100) / 100,
      intervalDays: Math.round(avgInterval),
      cadence,
      occurrences: sorted.length,
      monthlyCost:
        Math.round((cadence === 'weekly' ? avgAmount * (30 / avgInterval) : avgAmount) * 100) / 100,
      lastDate: last.date,
    });
  }

  return result.sort((a, b) => b.monthlyCost - a.monthlyCost);
}

/** 'YYYY-MM' of a date string. */
export function monthOf(dateStr) {
  return (dateStr || '').substring(0, 7);
}

/**
 * Per-category spend for a given month vs. configured budgets.
 * budgets: { [category]: number }
 * Returns [{ category, budget, spent, ratio, over }] for categories with a budget.
 */
export function budgetStatus(transactions, budgets, month) {
  const spentByCat = {};
  for (const tx of transactions || []) {
    if (tx.type !== 'expense' || monthOf(tx.date) !== month) continue;
    spentByCat[tx.category] = (spentByCat[tx.category] || 0) + tx.amount;
  }

  return Object.entries(budgets || {})
    .filter(([, b]) => Number(b) > 0)
    .map(([category, budget]) => {
      const spent = Math.round((spentByCat[category] || 0) * 100) / 100;
      const ratio = spent / Number(budget);
      return { category, budget: Number(budget), spent, ratio, over: ratio > 1 };
    })
    .sort((a, b) => b.ratio - a.ratio);
}

/**
 * Month-over-month expense trend: current vs. previous month totals.
 * Returns { current, previous, deltaPct } (deltaPct null when no previous data).
 */
export function monthTrend(transactions, month, prevMonth) {
  let current = 0;
  let previous = 0;
  for (const tx of transactions || []) {
    if (tx.type !== 'expense') continue;
    const m = monthOf(tx.date);
    if (m === month) current += tx.amount;
    else if (m === prevMonth) previous += tx.amount;
  }
  const deltaPct = previous > 0 ? Math.round(((current - previous) / previous) * 100) : null;
  return {
    current: Math.round(current * 100) / 100,
    previous: Math.round(previous * 100) / 100,
    deltaPct,
  };
}

/**
 * Anomalies: expenses more than 2× the average of their category
 * (needs ≥3 transactions in the category to have a meaningful baseline).
 */
export function detectAnomalies(transactions) {
  const byCat = {};
  for (const tx of transactions || []) {
    if (tx.type !== 'expense') continue;
    if (!byCat[tx.category]) byCat[tx.category] = [];
    byCat[tx.category].push(tx);
  }

  const anomalies = [];
  for (const txs of Object.values(byCat)) {
    if (txs.length < 3) continue;
    const avg = txs.reduce((s, t) => s + t.amount, 0) / txs.length;
    for (const tx of txs) {
      if (tx.amount > avg * 2) {
        anomalies.push({ ...tx, categoryAvg: Math.round(avg * 100) / 100 });
      }
    }
  }
  return anomalies.sort((a, b) => b.amount - a.amount);
}

/**
 * Automatically categorize a transaction based on description and amount.
 */
export function autoCategorize(description, type = 'expense') {
  if (type === 'income') {
    const desc = (description || '').toLowerCase();
    if (desc.includes('salary') || desc.includes('gehalt') || desc.includes('lohn')) return 'Salary';
    if (desc.includes('freelance') || desc.includes('projekt') || desc.includes('auftrag')) return 'Freelance';
    if (desc.includes('invest') || desc.includes('aktien') || desc.includes('dividende') || desc.includes('etf')) return 'Investments';
    return 'Other';
  }

  const desc = (description || '').toLowerCase();
  
  if (desc.includes('amazon') || desc.includes('ebay') || desc.includes('shopping') || desc.includes('zara') || desc.includes('h&m') || desc.includes('kaufland')) {
    return 'Shopping';
  }
  if (desc.includes('netflix') || desc.includes('spotify') || desc.includes('adobe') || desc.includes('openai') || desc.includes('chatgpt') || desc.includes('icloud') || desc.includes('github') || desc.includes('subscription') || desc.includes('abo') || desc.includes('youtube premium')) {
    return 'Abonnements';
  }
  if (desc.includes('miete') || desc.includes('vermieter') || desc.includes('strom') || desc.includes('gas') || desc.includes('insurance') || desc.includes('versicherung') || desc.includes('rundfunk')) {
    return 'Living';
  }
  if (desc.includes('rewe') || desc.includes('aldi') || desc.includes('lidl') || desc.includes('edeka') || desc.includes('restaurant') || desc.includes('lieferando') || desc.includes('wolt') || desc.includes('ubereats') || desc.includes('food') || desc.includes('cafe') || desc.includes('starbucks') || desc.includes('döner') || desc.includes('pizza') || desc.includes('bäcker')) {
    return 'Food';
  }
  if (desc.includes('uber') || desc.includes('db ') || desc.includes('bahn') || desc.includes('taxi') || desc.includes('flight') || desc.includes('lufthansa') || desc.includes('flixbus') || desc.includes('s-bahn') || desc.includes('u-bahn')) {
    return 'Travel';
  }
  if (desc.includes('pharmacy') || desc.includes('apotheke') || desc.includes('gym') || desc.includes('fitness') || desc.includes('doctor') || desc.includes('arzt') || desc.includes('supplement') || desc.includes('nootropics') || desc.includes('biotuning')) {
    return 'Health/Bio';
  }
  if (desc.includes('hosting') || desc.includes('vercel') || desc.includes('aws') || desc.includes('google cloud') || desc.includes('copilot') || desc.includes('domain') || desc.includes('github copilot')) {
    return 'Business Tools';
  }

  return 'Other';
}

/**
 * Detect financial patterns in transactions.
 */
export function detectPatterns(transactions) {
  const patterns = [];
  const expenses = (transactions || []).filter(t => t.type === 'expense');
  if (expenses.length === 0) return patterns;

  // 1. Friday restaurat/food spending check
  const fridayFood = expenses.filter(t => {
    if (!t.date || t.category !== 'Food') return false;
    const dateObj = new Date(t.date);
    return dateObj.getDay() === 5; // 5 = Friday
  });
  if (fridayFood.length >= 2) {
    const totalFriday = fridayFood.reduce((sum, t) => sum + t.amount, 0);
    const avgFriday = totalFriday / fridayFood.length;
    if (avgFriday > 15) {
      patterns.push({
        id: 'pat_friday_food',
        type: 'warning',
        title: 'Ausgabenmuster am Freitag erkannt',
        message: `Du hast Freitags durchschnittlich ${avgFriday.toFixed(2)} € für Verpflegung ausgegeben. Achte auf Restaurant- und Lieferdienst-Spitzen vor dem Wochenende.`
      });
    }
  }

  // 2. Start of month spending check (Days 1-5)
  const startOfMonthExpenses = expenses.filter(t => {
    if (!t.date) return false;
    const day = parseInt(t.date.split('-')[2]);
    return day >= 1 && day <= 5;
  });
  if (startOfMonthExpenses.length > 0) {
    const startTotal = startOfMonthExpenses.reduce((sum, t) => sum + t.amount, 0);
    const totalExp = expenses.reduce((sum, t) => sum + t.amount, 0);
    const ratio = startTotal / totalExp;
    if (ratio > 0.35 && totalExp > 200) {
      patterns.push({
        id: 'pat_month_start',
        type: 'info',
        title: 'Erhöhte Aktivität zu Monatsbeginn',
        message: `Über ${Math.round(ratio * 100)}% deiner monatlichen Ausgaben (${startTotal.toFixed(2)} €) fallen in den ersten 5 Tagen an.`
      });
    }
  }

  // 3. High merchant frequency check
  const merchantCounts = {};
  expenses.forEach(t => {
    const desc = (t.description || '').trim();
    if (desc) {
      merchantCounts[desc] = (merchantCounts[desc] || 0) + 1;
    }
  });
  const frequentMerchants = Object.entries(merchantCounts)
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1]);

  if (frequentMerchants.length > 0) {
    const [merchant, count] = frequentMerchants[0];
    patterns.push({
      id: 'pat_merchant_freq',
      type: 'info',
      title: 'Häufiger Händler identifiziert',
      message: `Du hast diesen Monat bereits ${count} Transaktionen bei "${merchant}" getätigt. Eventuell lässt sich hier ein Pauschaltarif oder Abo vereinbaren.`
    });
  }

  return patterns;
}

/**
 * Calculate month-end financial prognosis.
 */
export function calculatePrognosis(transactions, currentBalance) {
  const now = new Date();
  const currentDay = now.getDate();
  const currentMonth = now.toISOString().substring(0, 7);

  const thisMonthExpenses = (transactions || [])
    .filter(t => t.type === 'expense' && monthOf(t.date) === currentMonth)
    .reduce((sum, t) => sum + t.amount, 0);

  if (thisMonthExpenses === 0 || currentDay === 0) {
    return { projectedRemaining: currentBalance, status: 'stable' };
  }

  const dailyRate = thisMonthExpenses / currentDay;
  const projectedEOMExpenses = dailyRate * 30;
  const currentMonthIncome = (transactions || [])
    .filter(t => t.type === 'income' && monthOf(t.date) === currentMonth)
    .reduce((sum, t) => sum + t.amount, 0);

  const projectedRemaining = currentBalance + (currentMonthIncome - projectedEOMExpenses);
  const status = projectedRemaining < 200 ? 'critical' : projectedRemaining < 500 ? 'warning' : 'stable';

  return {
    projectedRemaining: Math.max(0, Math.round(projectedRemaining * 100) / 100),
    projectedExpenses: Math.round(projectedEOMExpenses * 100) / 100,
    dailyRate: Math.round(dailyRate * 100) / 100,
    status
  };
}

/**
 * Calculate savings potential on delivery services and subscription creep.
 */
export function calculateSavingsPotential(transactions) {
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * DAY_MS);

  const deliverySpend = (transactions || []).filter(t => {
    if (t.type !== 'expense' || !t.date) return false;
    const txDate = new Date(t.date);
    if (txDate < ninetyDaysAgo) return false;
    const desc = (t.description || '').toLowerCase();
    return desc.includes('lieferando') || desc.includes('wolt') || desc.includes('ubereats') || desc.includes('pizza') || desc.includes('döner') || desc.includes('restaurant');
  }).reduce((sum, t) => sum + t.amount, 0);

  const quarterlySavings = deliverySpend * 0.25;
  const annualSavings = quarterlySavings * 4;

  return {
    deliverySpend: Math.round(deliverySpend * 100) / 100,
    quarterlySavings: Math.round(quarterlySavings * 100) / 100,
    annualSavings: Math.round(annualSavings * 100) / 100
  };
}

