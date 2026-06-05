/**
 * Pronoia Credits/Guthaben System Layer
 * 
 * This file contains the state structures, reward equations, and transaction helpers
 * for the virtual Pronoia Credits currency. It is stored here for future integration.
 */

// 1. Data Schema (User Profile / Firestore doc)
export const CREDITS_PROFILE_SCHEMA = {
  credits: 250, // Default starting balance
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
};

// 2. Credits Reward Equations & Triggers
export const CreditRewards = {
  /**
   * Calculates credits earned from standard focus block completion.
   * Baseline: 1 credit per minute of block duration + 50 flat completion bonus.
   */
  calculateBlockReward: (durationSeconds) => {
    const minutes = Math.round(durationSeconds / 60);
    const completionBonus = 50;
    return minutes + completionBonus;
  },

  /**
   * Credits rewarded when completing a high-fokus Skill Lab session.
   * Reward: 100 Credits flat.
   */
  getSkillSessionReward: () => {
    return 100;
  },

  /**
   * Credits rewarded upon leveling up profile skill level.
   * Reward: 150 Credits.
   */
  getLevelUpReward: () => {
    return 150;
  }
};

// 3. Transactions & Deductions Logic (for useProtocol hook context)
export const CreditTransactions = {
  /**
   * Checks if user has enough credits and deducts them.
   * Returns updated credits balance if successful, otherwise throws error.
   */
  spendCredits: (currentBalance, cost) => {
    if (currentBalance < cost) {
      throw new Error("Transaktion fehlgeschlagen: Nicht genügend Pronoia Credits.");
    }
    return Math.max(0, currentBalance - cost);
  },

  /**
   * Restocks stack item inventory level up to 100%.
   */
  restockSupplement: (currentStack, name, restockPercent = 100) => {
    return currentStack.map(item => {
      if (item.name.toLowerCase().includes(name.toLowerCase())) {
        return {
          ...item,
          supply: Math.min(100, (item.supply || 0) + restockPercent)
        };
      }
      return item;
    });
  }
};
