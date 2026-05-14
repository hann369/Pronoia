/**
 * Pronoia Stack Manager
 * Handles supplement inventory, consumption, and editing.
 */
export const StackManager = {
  stack: [],

  init(initialStack) {
    this.stack = initialStack || [];
  },

  consume(idx) {
    if (!this.stack[idx]) return null;
    this.stack[idx].supply = Math.max(0, (this.stack[idx].supply || 100) - 5);
    return this.stack[idx];
  },

  updateItem(idx, key, val) {
    if (this.stack[idx]) {
      this.stack[idx][key] = val;
      return true;
    }
    return false;
  },

  addItem() {
    this.stack.push({ name: 'Neues Item', dose: '0mg', timing: 'morning', supply: 100 });
    return this.stack;
  },

  removeItem(idx) {
    this.stack.splice(idx, 1);
    return this.stack;
  },

  getLowSupplyItems() {
    return this.stack.some(s => (s.supply || 100) < 20);
  },

  getMorningItems() {
    return this.stack.filter(s => s.timing === 'morning');
  },

  getEveningItems() {
    return this.stack.filter(s => s.timing === 'evening');
  }
};
