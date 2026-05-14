/**
 * Pronoia Telemetry Service
 * Handles real-time biometric tracking, sparkline rendering, and neural trace visualization.
 */
export const Telemetry = {
  updateIntelligence(cog, sns, hyd) {
    // Update bars
    const bc = document.getElementById('bar-cog');
    const bs = document.getElementById('bar-sns');
    const bh = document.getElementById('bar-hyd');
    const vc = document.getElementById('val-cog');
    const vs = document.getElementById('val-sns');
    const vh = document.getElementById('val-hyd');
    
    if (bc) bc.style.width = cog + '%';
    if (bs) bs.style.width = sns + '%';
    if (bh) bh.style.width = hyd + '%';
    if (vc) vc.textContent = Math.round(cog) + '%';
    if (vs) vs.textContent = Math.round(sns) + '%';
    if (vh) vh.textContent = Math.round(hyd) + '%';

    // Update Sparklines & Trace
    this.updateNeuralTrace(cog, sns);
    this.updateSparklines(cog, sns, hyd);
  },

  updateSparklines(cog, sns, hyd) {
    if (!this._sparks) this._sparks = { cog: [], sns: [], hyd: [] };
    
    ['cog', 'sns', 'hyd'].forEach(type => {
      const canvas = document.getElementById(`spark-${type}`);
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const val = type === 'cog' ? cog : (type === 'sns' ? sns : hyd);
      
      this._sparks[type].push(val);
      if (this._sparks[type].length > 30) this._sparks[type].shift();

      const w = canvas.width = 60;
      const h = canvas.height = 30;
      ctx.clearRect(0, 0, w, h);
      
      ctx.beginPath();
      ctx.strokeStyle = type === 'cog' ? '#007aff' : (type === 'sns' ? '#d4a574' : '#00c48c');
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      this._sparks[type].forEach((v, i) => {
        const x = (i / 29) * w;
        const y = h - (v / 100) * (h - 4) - 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    });
  },

  updateNeuralTrace(cog, sns) {
    if (!this._neuralPoints) this._neuralPoints = [];
    this._neuralPoints.push({ cog, sns });
    if (this._neuralPoints.length > 50) this._neuralPoints.shift();

    const canvas = document.getElementById('neural-trace');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Draw Cog Trace
    ctx.beginPath();
    ctx.strokeStyle = 'var(--cobalt-bright)';
    ctx.lineWidth = 1.5;
    this._neuralPoints.forEach((p, i) => {
      const x = (i / 49) * w;
      const y = h - (p.cog / 100) * h;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw SNS Trace
    ctx.beginPath();
    ctx.strokeStyle = 'var(--amber)';
    ctx.setLineDash([2, 2]);
    ctx.lineWidth = 1;
    this._neuralPoints.forEach((p, i) => {
      const x = (i / 49) * w;
      const y = h - (p.sns / 100) * h;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.setLineDash([]);
  },

  calculateReadiness(metrics, energy) {
    const hrv = metrics.hrv || 60;
    const sleep = metrics.sleep || 75;
    const eng = energy || 7;
    
    let score = (hrv * 0.4) + (sleep * 0.4) + (eng * 2);
    const readiness = Math.min(100, Math.round(score));
    
    const el = document.getElementById('readiness-gauge');
    if (el) {
      el.textContent = readiness + '%';
      el.style.color = readiness > 70 ? 'var(--green)' : readiness > 40 ? 'var(--amber)' : 'var(--red)';
    }
    return readiness;
  }
};
