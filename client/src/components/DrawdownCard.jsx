import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { useCurrency } from '../context/CurrencyContext';
import api from '../api/axiosInstance';
import { ShieldAlert, TrendingDown, Award, ArrowUpRight, Activity } from 'lucide-react';

const TIMEFRAMES = [
  { id: '30d', label: '30D' },
  { id: '90d', label: '90D' },
  { id: '1y',  label: '1Y' },
  { id: 'all', label: 'All' },
];

function DrawdownTooltip({ active, payload, fmt }) {
  if (!active || !payload || !payload.length) return null;
  const pt = payload[0]?.payload;
  if (!pt) return null;

  const isAth = pt.drawdown >= 0;

  return (
    <div
      style={{
        background: 'var(--chart-tooltip-bg, #1a1a2e)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8,
        padding: '8px 12px',
        fontSize: 11,
        color: '#fff',
        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
      }}
    >
      <div style={{ color: '#9CA3AF', fontSize: 10, marginBottom: 4 }}>{pt.fullDate}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ color: '#9CA3AF' }}>Drawdown:</span>
        <span style={{ fontWeight: 600, color: isAth ? 'var(--positive, #3DD68C)' : 'var(--negative, #FF6B73)' }}>
          {isAth ? '0.00% (ATH)' : `${pt.drawdown.toFixed(2)}%`}
        </span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 2 }}>
        <span style={{ color: '#9CA3AF' }}>Value:</span>
        <span style={{ fontWeight: 600 }}>{fmt(pt.value)}</span>
      </div>
    </div>
  );
}

export function DrawdownCard({ refreshKey = 0, currentLiveValue = 0 }) {
  const { fmt, fmtDelta } = useCurrency();
  const [timeframe, setTimeframe] = useState('all');
  const [history, setHistory]     = useState(null);
  const [loading, setLoading]     = useState(true);

  const fetchDrawdownData = useCallback(async (tf) => {
    setLoading(true);
    try {
      const res = await api.get(`/portfolio/history?timeframe=${tf}`);
      setHistory(res.data);
    } catch (err) {
      console.error('Failed to fetch drawdown analytics:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDrawdownData(timeframe);
  }, [timeframe, refreshKey, fetchDrawdownData]);

  const summary = history?.summary || {};
  const dataPoints = history?.dataPoints || [];

  // Anchor to live portfolio value if higher or available
  const effectiveCurrent = currentLiveValue > 0 ? currentLiveValue : (summary.currentValue || 0);

  // Derive ATH across snapshots + live value
  const highestSnapshot = summary.highestValue || 0;
  const athValue = Math.max(highestSnapshot, effectiveCurrent);

  // Find when peak occurred
  let athDate = summary.ath?.timestamp ? new Date(summary.ath.timestamp) : null;
  if (effectiveCurrent >= highestSnapshot && effectiveCurrent > 0) {
    athDate = new Date();
  }

  const daysSinceAth = athDate
    ? Math.max(0, Math.floor((Date.now() - athDate.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  // Current drawdown
  const currentDrawdownUsd = effectiveCurrent - athValue;
  const currentDrawdownPct = athValue > 0 ? (currentDrawdownUsd / athValue) * 100 : 0;
  const isAtAth = Math.abs(currentDrawdownPct) < 0.05;

  // Max historical drawdown in this timeframe
  let maxDdAmt = summary.maxDrawdown?.amount ?? 0;
  let maxDdPct = summary.maxDrawdown?.pct ?? 0;

  // Fallback calculation across dataPoints if server didn't compute
  if (maxDdPct === 0 && dataPoints.length > 1) {
    let peak = 0;
    for (const pt of dataPoints) {
      if (pt.totalValue > peak) {
        peak = pt.totalValue;
      } else if (peak > 0) {
        const dd = ((pt.totalValue - peak) / peak) * 100;
        if (dd < maxDdPct) {
          maxDdPct = dd;
          maxDdAmt = pt.totalValue - peak;
        }
      }
    }
  }

  // Trough (lowest point)
  const lowestValue = summary.lowestValue ?? 0;
  const bounceFromLowPct = (lowestValue > 0 && effectiveCurrent > lowestValue)
    ? ((effectiveCurrent - lowestValue) / lowestValue) * 100
    : 0;

  // Preserved capital percentage (e.g. 96.5% of peak)
  const preservedPct = athValue > 0 ? Math.min(100, Math.max(0, (effectiveCurrent / athValue) * 100)) : 100;

  // Build Underwater Drawdown curve data points
  const chartPoints = useMemo(() => {
    if (!dataPoints || dataPoints.length === 0) return [];

    let runningPeak = 0;
    const pts = dataPoints.map((pt) => {
      const val = Number(pt.totalValue || 0);
      if (val > runningPeak) runningPeak = val;
      const dd = runningPeak > 0 ? ((val - runningPeak) / runningPeak) * 100 : 0;
      const d = new Date(pt.timestamp || Date.now());
      return {
        timestamp: pt.timestamp,
        date: d.toLocaleDateString([], { month: 'short', day: 'numeric' }),
        fullDate: d.toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        drawdown: Number(dd.toFixed(2)),
        value: val,
      };
    });

    // If only 1 point, synthesize a start point so a line can render
    if (pts.length === 1) {
      return [{ ...pts[0], date: 'Start' }, pts[0]];
    }

    return pts;
  }, [dataPoints]);

  const hasChart = chartPoints.length >= 2;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12 }}>
      {/* Header with Timeframe selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <ShieldAlert size={16} style={{ color: isAtAth ? 'var(--positive)' : 'var(--accent, #6366F1)' }} />
          <h2 className="card-title" style={{ margin: 0 }}>ATH &amp; Drawdown</h2>
        </div>

        <div style={{ display: 'flex', background: 'var(--shell-bg)', borderRadius: 8, padding: 2, border: '1px solid var(--divider-2)' }}>
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.id}
              onClick={() => setTimeframe(tf.id)}
              style={{
                background: timeframe === tf.id ? 'var(--card-bg)' : 'transparent',
                color: timeframe === tf.id ? 'var(--text-primary)' : 'var(--text-muted)',
                border: 'none',
                borderRadius: 6,
                padding: '3px 8px',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {loading && !history ? (
        <div style={{ padding: '36px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          Calculating drawdown metrics...
        </div>
      ) : (
        <>
          {/* Main Hero Metrics: ATH vs Current Drawdown */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {/* All Time High Tile */}
            <div
              style={{
                background: 'var(--shell-bg)',
                borderRadius: 10,
                padding: '10px 12px',
                border: '1px solid var(--divider-2)',
                display: 'flex',
                flexDirection: 'column',
                gap: 3,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Peak Value (ATH)
                </span>
                <Award size={13} style={{ color: '#F59E0B' }} />
              </div>
              <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
                {fmt(athValue)}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                {isAtAth ? 'Current ATH' : `${daysSinceAth}d ago • ${athDate ? athDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : ''}`}
              </div>
            </div>

            {/* Current Drawdown Tile */}
            <div
              style={{
                background: isAtAth ? 'rgba(61, 214, 140, 0.08)' : 'rgba(255, 107, 115, 0.08)',
                borderRadius: 10,
                padding: '10px 12px',
                border: `1px solid ${isAtAth ? 'rgba(61, 214, 140, 0.25)' : 'rgba(255, 107, 115, 0.25)'}`,
                display: 'flex',
                flexDirection: 'column',
                gap: 3,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 10, color: isAtAth ? 'var(--positive)' : 'var(--negative)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Current Drawdown
                </span>
                <TrendingDown size={13} style={{ color: isAtAth ? 'var(--positive)' : 'var(--negative)' }} />
              </div>
              <div style={{ fontSize: 17, fontWeight: 700, color: isAtAth ? 'var(--positive)' : 'var(--negative)', letterSpacing: '-0.3px' }}>
                {isAtAth ? '0.00%' : `${currentDrawdownPct.toFixed(2)}%`}
              </div>
              <div style={{ fontSize: 10, color: isAtAth ? 'var(--positive)' : 'var(--negative)' }}>
                {isAtAth ? 'At All-Time High' : fmtDelta(currentDrawdownUsd)}
              </div>
            </div>
          </div>

          {/* Preserved Capital Meter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Capital Preserved from Peak</span>
              <span style={{ fontWeight: 600, color: preservedPct >= 95 ? 'var(--positive)' : preservedPct >= 80 ? '#F59E0B' : 'var(--negative)' }}>
                {preservedPct.toFixed(1)}%
              </span>
            </div>
            <div style={{ height: 6, background: 'var(--divider-2)', borderRadius: 3, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${preservedPct}%`,
                  background: isAtAth ? 'var(--positive)' : preservedPct >= 90 ? 'var(--accent, #6366F1)' : '#FF6B73',
                  borderRadius: 3,
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
          </div>

          {/* Secondary stats row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 8,
              paddingTop: 4,
              borderTop: '1px solid var(--divider-2)',
            }}
          >
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Max Period Dip</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: maxDdPct < 0 ? 'var(--negative)' : 'var(--text-primary)', marginTop: 2 }}>
                {maxDdPct < 0 ? `${maxDdPct.toFixed(2)}%` : '0.00%'}
              </div>
              {maxDdAmt < 0 && (
                <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{fmtDelta(maxDdAmt)}</div>
              )}
            </div>

            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Period Low</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
                {fmt(lowestValue)}
              </div>
              {bounceFromLowPct > 0 && (
                <div style={{ fontSize: 9, color: 'var(--positive)', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ArrowUpRight size={10} /> +{bounceFromLowPct.toFixed(1)}% bounce
                </div>
              )}
            </div>

            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Distance to ATH</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: isAtAth ? 'var(--positive)' : 'var(--text-primary)', marginTop: 2 }}>
                {isAtAth ? '0.00%' : `+${(Math.abs(currentDrawdownUsd) / (effectiveCurrent || 1) * 100).toFixed(2)}%`}
              </div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>
                {isAtAth ? 'At peak' : `Need ${fmt(Math.abs(currentDrawdownUsd))}`}
              </div>
            </div>
          </div>

          {/* ── Underwater Drawdown Curve (Fills the visual gap with high-value chart) ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 2 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Activity size={12} /> Underwater Drawdown Curve
              </span>
              <span style={{ fontSize: 10, color: 'var(--positive)', fontWeight: 500 }}>
                0.0% ATH Baseline
              </span>
            </div>

            {hasChart ? (
              <div style={{ height: 125, width: '100%', marginTop: 2 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartPoints} margin={{ top: 8, right: 6, left: -22, bottom: 0 }}>
                    <defs>
                      <linearGradient id="drawdownUnderwaterGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FF6B73" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#FF6B73" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 9, fill: 'var(--text-muted)' }}
                      axisLine={false}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 9, fill: 'var(--text-muted)' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `${v.toFixed(0)}%`}
                      domain={['dataMin - 1', 0]}
                    />
                    <Tooltip content={<DrawdownTooltip fmt={fmt} />} />
                    <ReferenceLine y={0} stroke="var(--positive)" strokeDasharray="3 3" opacity={0.7} />
                    <Area
                      type="monotone"
                      dataKey="drawdown"
                      stroke="#FF6B73"
                      strokeWidth={1.5}
                      fill="url(#drawdownUnderwaterGrad)"
                      dot={false}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div
                style={{
                  height: 100,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--shell-bg)',
                  borderRadius: 8,
                  border: '1px dashed var(--divider-2)',
                  color: 'var(--text-muted)',
                  fontSize: 11,
                }}
              >
                More snapshots will render the historical drawdown curve here
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
