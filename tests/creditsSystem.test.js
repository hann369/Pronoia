import { describe, it, expect } from 'vitest';
import { CreditRewards, CreditTransactions } from '@/lib/creditsSystem';

describe('CreditRewards', () => {
  it('rewards 1 credit per minute plus a 50 completion bonus', () => {
    expect(CreditRewards.calculateBlockReward(3600)).toBe(110); // 60 min + 50
    expect(CreditRewards.calculateBlockReward(0)).toBe(50);
  });

  it('has flat skill + level-up rewards', () => {
    expect(CreditRewards.getSkillSessionReward()).toBe(100);
    expect(CreditRewards.getLevelUpReward()).toBe(150);
  });
});

describe('CreditTransactions', () => {
  it('deducts when balance is sufficient', () => {
    expect(CreditTransactions.spendCredits(250, 100)).toBe(150);
  });

  it('throws when balance is insufficient', () => {
    expect(() => CreditTransactions.spendCredits(50, 100)).toThrow();
  });

  it('restocks a matching supplement up to 100%', () => {
    const stack = [{ name: 'Alpha-GPC', supply: 40 }, { name: 'Taurin', supply: 90 }];
    const out = CreditTransactions.restockSupplement(stack, 'gpc');
    expect(out[0].supply).toBe(100);
    expect(out[1].supply).toBe(90);
  });
});
