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
