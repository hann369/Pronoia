import { describe, it, expect } from 'vitest';
import { detectRecurring, budgetStatus, monthTrend, detectAnomalies } from '@/lib/financeIntelligence';

const tx = (date, amount, { type = 'expense', category = 'Other', description = '' } = {}) =>
  ({ id: date + description, date, amount, type, category, description });

describe('detectRecurring', () => {
  it('finds a monthly subscription with stable amount', () => {
    const txs = [
      tx('2026-03-01', 12.99, { description: 'Netflix' }),
      tx('2026-04-01', 12.99, { description: 'Netflix' }),
      tx('2026-05-01', 12.99, { description: 'Netflix' }),
    ];
    const recs = detectRecurring(txs);
    expect(recs).toHaveLength(1);
    expect(recs[0].cadence).toBe('monthly');
    expect(recs[0].monthlyCost).toBeCloseTo(12.99);
    expect(recs[0].occurrences).toBe(3);
  });

  it('finds weekly recurring and extrapolates monthly cost', () => {
    const txs = [
      tx('2026-05-01', 50, { description: 'Wocheneinkauf', category: 'Food' }),
      tx('2026-05-08', 52, { description: 'Wocheneinkauf', category: 'Food' }),
      tx('2026-05-15', 49, { description: 'Wocheneinkauf', category: 'Food' }),
    ];
    const recs = detectRecurring(txs);
    expect(recs).toHaveLength(1);
    expect(recs[0].cadence).toBe('weekly');
    expect(recs[0].monthlyCost).toBeGreaterThan(150);
  });

  it('ignores irregular amounts and one-offs', () => {
    const txs = [
      tx('2026-03-01', 10, { description: 'Misc' }),
      tx('2026-04-01', 90, { description: 'Misc' }),
      tx('2026-05-20', 500, { description: 'Laptop' }),
    ];
    expect(detectRecurring(txs)).toHaveLength(0);
  });
});

describe('budgetStatus', () => {
  it('reports spent vs budget for the given month only', () => {
    const txs = [
      tx('2026-06-02', 80, { category: 'Food' }),
      tx('2026-06-10', 40, { category: 'Food' }),
      tx('2026-05-10', 999, { category: 'Food' }), // previous month — ignored
    ];
    const status = budgetStatus(txs, { Food: 100 }, '2026-06');
    expect(status).toHaveLength(1);
    expect(status[0].spent).toBe(120);
    expect(status[0].over).toBe(true);
  });

  it('skips categories without a positive budget', () => {
    expect(budgetStatus([], { Food: 0, Tech: '' }, '2026-06')).toHaveLength(0);
  });
});

describe('monthTrend', () => {
  it('computes delta percent month over month', () => {
    const txs = [tx('2026-06-05', 150), tx('2026-05-05', 100)];
    const t = monthTrend(txs, '2026-06', '2026-05');
    expect(t.current).toBe(150);
    expect(t.previous).toBe(100);
    expect(t.deltaPct).toBe(50);
  });

  it('returns null delta without previous data', () => {
    expect(monthTrend([tx('2026-06-05', 10)], '2026-06', '2026-05').deltaPct).toBeNull();
  });
});

describe('detectAnomalies', () => {
  it('flags expenses above 2x category average', () => {
    const txs = [
      tx('2026-06-01', 10, { category: 'Food' }),
      tx('2026-06-02', 12, { category: 'Food' }),
      tx('2026-06-03', 200, { category: 'Food' }),
    ];
    const a = detectAnomalies(txs);
    expect(a).toHaveLength(1);
    expect(a[0].amount).toBe(200);
  });
});
