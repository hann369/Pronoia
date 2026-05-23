'use client';

import { useState, useEffect, useRef } from 'react';

export default function TelemetryVisualizer({ timeLeft, totalTime, pillar }) {
  const [hydration, setHydration] = useState(80);
  const [cogHistory, setCogHistory] = useState([]);
  const [snsHistory, setSnsHistory] = useState([]);
  const [hydHistory, setHydHistory] = useState([]);
  const [neuralHistory, setNeuralHistory] = useState([]);

  const sparkCogRef = useRef(null);
  const sparkSnsRef = useRef(null);
  const sparkHydRef = useRef(null);
  const neuralTraceRef = useRef(null);

  // Compute active metrics
  const prog = totalTime > 0 ? 1 - timeLeft / totalTime : 0;
  let cog = 20;
  let sns = 30;

  if (pillar === 'focus' || pillar === 'skills') {
    cog = Math.min(100, Math.round(40 + prog * 50));
    sns = Math.min(100, Math.round(60 + prog * 20));
  } else if (pillar === 'recovery') {
    cog = Math.min(100, Math.round(Math.max(10, 80 - prog * 60)));
    sns = Math.min(100, Math.round(Math.max(10, 50 - prog * 40)));
  }

  // Hydration decay
  useEffect(() => {
    const interval = setInterval(() => {
      setHydration(prev => Math.max(10, prev - 1));
    }, 15000); // decay every 15s
    return () => clearInterval(interval);
  }, []);

  const simulateDrink = () => {
    setHydration(100);
  };

  // Update history arrays
  useEffect(() => {
    const timer = setInterval(() => {
      setCogHistory(prev => [...prev, cog].slice(-30));
      setSnsHistory(prev => [...prev, sns].slice(-30));
      setHydHistory(prev => [...prev, hydration].slice(-30));
      setNeuralHistory(prev => [...prev, { cog, sns }].slice(-50));
    }, 2000); // Update every 2 seconds for smooth tracing

    return () => clearInterval(timer);
  }, [cog, sns, hydration]);

  // Draw Sparklines
  useEffect(() => {
    const drawSparkline = (canvas, data, color) => {
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const w = (canvas.width = 60);
      const h = (canvas.height = 30);
      ctx.clearRect(0, 0, w, h);

      if (data.length < 2) return;

      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      data.forEach((v, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = h - (v / 100) * (h - 4) - 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    };

    drawSparkline(sparkCogRef.current, cogHistory, '#007aff');
    drawSparkline(sparkSnsRef.current, snsHistory, '#d4a574');
    drawSparkline(sparkHydRef.current, hydHistory, '#00c48c');
  }, [cogHistory, snsHistory, hydHistory]);

  // Draw Neural Trace
  useEffect(() => {
    const canvas = neuralTraceRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = (canvas.width = canvas.parentElement.clientWidth);
    const h = (canvas.height = 100);
    ctx.clearRect(0, 0, w, h);

    if (neuralHistory.length < 2) return;

    // Draw Cog Trace
    ctx.beginPath();
    ctx.strokeStyle = '#1A6AFF'; // var(--cobalt-bright)
    ctx.lineWidth = 1.5;
    neuralHistory.forEach((p, i) => {
      const x = (i / (neuralHistory.length - 1)) * w;
      const y = h - (p.cog / 100) * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw SNS Trace
    ctx.beginPath();
    ctx.strokeStyle = '#d4a574'; // var(--amber)
    ctx.setLineDash([2, 2]);
    ctx.lineWidth = 1;
    neuralHistory.forEach((p, i) => {
      const x = (i / (neuralHistory.length - 1)) * w;
      const y = h - (p.sns / 100) * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.setLineDash([]);
  }, [neuralHistory]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      {/* Rhythm Bar */}
      <div style={{ padding: '0 1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text2)', marginBottom: '0.4rem' }}>
          <span>Ultradian Rhythmus</span>
          <span>{pillar === 'recovery' ? 'Rest / BRAC' : 'Peak I'}</span>
        </div>
        <div style={{ position: 'relative', height: '3px', background: 'var(--border)', borderRadius: '2px' }}>
          <div style={{ height: '100%', borderRadius: '2px', background: 'linear-gradient(to right, var(--cobalt), var(--cobalt-bright))', width: `${prog * 100}%`, transition: 'width 1s linear' }} />
          <div style={{ position: 'absolute', top: '-4px', width: '11px', height: '11px', borderRadius: '50%', background: 'var(--cobalt-bright)', left: `${prog * 100}%`, transform: 'translateX(-50%)', transition: 'left 1s linear' }} />
        </div>
      </div>

      {/* Telemetry Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        {/* Cog */}
        <div style={{ padding: '0.875rem 1rem', borderRight: '1px solid var(--border)', position: 'relative', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <canvas ref={sparkCogRef} style={{ position: 'absolute', top: 0, right: 0, width: '60px', height: '100%', opacity: 0.15, pointerEvents: 'none' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', textTransform: 'uppercase', color: 'var(--text2)' }}>Kognitive Last</span>
          <div style={{ height: '2px', background: 'var(--border)', borderRadius: '1px', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: '#1A6AFF', width: `${cog}%` }} />
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text)' }}>{cog}%</span>
        </div>

        {/* Hydration / Stability */}
        <div style={{ padding: '0.875rem 1rem', borderRight: '1px solid var(--border)', position: 'relative', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <canvas ref={sparkHydRef} style={{ position: 'absolute', top: 0, right: 0, width: '60px', height: '100%', opacity: 0.15, pointerEvents: 'none' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', textTransform: 'uppercase', color: 'var(--text2)' }}>System Stability</span>
          <div style={{ height: '2px', background: 'var(--border)', borderRadius: '1px', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: '#00c48c', width: `${hydration}%` }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.2rem' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text)' }}>{hydration}%</span>
            <button onClick={simulateDrink} style={{ margin: 0, padding: '0 0.4rem', fontSize: '0.5rem', height: '14px', background: 'rgba(0,196,140,0.1)', borderColor: '#00c48c', color: '#00c48c', border: '1px solid', cursor: 'pointer', borderRadius: '2px', fontFamily: 'var(--font-mono)' }}>+ SIPS</button>
          </div>
        </div>

        {/* SNS */}
        <div style={{ padding: '0.875rem 1rem', position: 'relative', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <canvas ref={sparkSnsRef} style={{ position: 'absolute', top: 0, right: 0, width: '60px', height: '100%', opacity: 0.15, pointerEvents: 'none' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', textTransform: 'uppercase', color: 'var(--text2)' }}>SNS Aktivierung</span>
          <div style={{ height: '2px', background: 'var(--border)', borderRadius: '1px', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: '#d4a574', width: `${sns}%` }} />
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text)' }}>{sns}%</span>
        </div>
      </div>

      {/* Live Neural Trace */}
      <div style={{ background: 'var(--bg-card, #111)', border: '1px solid var(--border)', padding: '1rem', position: 'relative', height: '120px', overflow: 'hidden', borderRadius: '4px' }}>
        <div style={{ position: 'absolute', top: '0.5rem', left: '0.75rem', fontSize: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.2em', zIndex: 5, fontFamily: 'var(--font-mono)', color: 'var(--text2)' }}>Live Neural Trace</div>
        <canvas ref={neuralTraceRef} style={{ width: '100%', height: '100%', opacity: 0.8 }} />
      </div>
    </div>
  );
}
