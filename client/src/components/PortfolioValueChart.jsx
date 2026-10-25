import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useCurrency } from '../context/CurrencyContext';
import { useTheme } from '../context/ThemeContext';
import { formatAxisLabel } from '../utils/format';
import api from '../api/axiosInstance';
import { RefreshCw } from 'lucide-react';

const RANGES = [
  { id: '24h', label: '1D', apiId: '24h', startLabel: '24h ago' },
  { id: '7d',  label: '1W', apiId: '7d',  startLabel: '7 days ago' },
  { id: '30d', label: '1M', apiId: '30d', startLabel: '30 days ago' },
  { id: '90d', label: '3M', apiId: '90d', startLabel: '90 days ago' },
  { id: '1y',  label: '1Y', apiId: '1y',  startLabel: '1 year ago' },
  { id: 'all', label: 'All', apiId: 'all', startLabel: 'at first snapshot' },
];

// SVG layout constants (matches design)
const VB_W = 780, VB_H = 290;
const PLOT_X1 = 78, PLOT_X2 = 748, PLOT_Y1 = 30, PLOT_Y2 = 230;
const AXIS_X_Y = 268;

function niceStep(range) {
  const raw = range / 5;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / p;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * p;
}

function computeYScale(values) {
  const mn = Math.min(...values);
  const mx = Math.max(...values);
  let step = niceStep(mx - mn || 1);
  let lo = Math.floor(mn / step) * step;
  let g = 0;
  while (lo + 5 * step < mx - 1e-12 && g < 12) {
    step = niceStep(step * 1.05);
    lo = Math.floor(mn / step) * step;
    g++;
  }
  return { lo, step };
}

function Ycoord(v, lo, step) {
  return PLOT_Y2 - ((v - lo) / (5 * step)) * (PLOT_Y2 - PLOT_Y1);
}

function Xcoord(i, n) {
  return PLOT_X1 + (i / Math.max(1, n - 1)) * (PLOT_X2 - PLOT_X1);
}

function formatXLabel(ts, rangeId) {
  const d = new Date(ts);
  if (rangeId === '24h') return d.toLocaleString('en-US', { hour: 'numeric', timeZone: 'UTC' });
  if (rangeId === '1y' || rangeId === 'all') return d.toLocaleString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' });
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function formatTooltipDate(ts, rangeId) {
  const d = new Date(ts);
  if (rangeId === '24h') return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'UTC' });
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

export function PortfolioValueChart({ prices = {}, refreshKey = 0 }) {
  const { currency, fmt, fmtDelta, rates } = useCurrency();
  const { isDark } = useTheme();
  const [rangeId, setRangeId] = useState('30d');
  const [historyData, setHistoryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hovered, setHovered] = useState(null); // { idx }
  const svgRef = useRef(null);

  const fetchHistory = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/portfolio/history?timeframe=${id}`);
      setHistoryData(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory(rangeId);
  }, [rangeId, refreshKey]); // Only re-fetch on range change or explicit refresh

  const range = RANGES.find((r) => r.id === rangeId) || RANGES[2];
  const points = historyData?.dataPoints || [];
  const n = points.length;

  const lineColor = isDark ? 'var(--chart-line)' : '#131316';

  // Convert USD values to display currency
  const displayValues = points.map((p) => {
    const usd = p.totalValue || 0;
    switch (currency) {
      case 'INR': return usd * (rates.inrRate || 95.7);
      case 'BTC': return rates.btcPrice > 0 ? usd / rates.btcPrice : 0;
      case 'HYPE': return rates.hypePrice > 0 ? usd / rates.hypePrice : 0;
      default: return usd;
    }
  });

  const isConverted = currency === 'BTC' || currency === 'HYPE';

  // Y-axis scale
  const { lo, step } = n >= 2 ? computeYScale(displayValues) : { lo: 0, step: 1 };

  // Point coords
  const coords = displayValues.map((v, i) => ({
    x: Xcoord(i, n),
    y: Ycoord(v, lo, step),
  }));

  // Polyline points string
  const polyPts = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');

  // Baseline (first value)
  const baseY = n >= 1 ? Ycoord(displayValues[0], lo, step).toFixed(1) : PLOT_Y2;

  // Y-axis labels (6 levels: lo, lo+step, ... lo+5*step)
  const yLabels = Array.from({ length: 6 }, (_, i) => {
    const usdEquiv = (lo + i * step); // already in display currency
    // Reverse-convert for formatAxisLabel which expects USD
    let usdVal = usdEquiv;
    if (currency === 'INR') usdVal = usdEquiv / (rates.inrRate || 95.7);
    else if (currency === 'BTC') usdVal = usdEquiv * (rates.btcPrice || 84300);
    else if (currency === 'HYPE') usdVal = usdEquiv * (rates.hypePrice || 93.8);
    return { y: Ycoord(lo + i * step, lo, step), label: formatAxisLabel(usdVal, currency, rates) };
  });

  // X-axis labels (7 evenly spaced)
  const xLabels = n >= 2
    ? Array.from({ length: 7 }, (_, j) => {
        const idx = Math.round((j / 6) * (n - 1));
        const ts = points[idx]?.timestamp;
        const x = Xcoord(idx, n);
        return { x, label: ts ? formatXLabel(ts, rangeId) : '' };
      })
    : [];

  // Hovered point
  const activeIdx = hovered?.idx ?? (n > 0 ? n - 1 : null);
  const activePoint = activeIdx !== null ? points[activeIdx] : null;
  const activeCoord = activeIdx !== null ? coords[activeIdx] : null;
  const activeValue = activeIdx !== null ? displayValues[activeIdx] : null;

  // Tooltip position
  let tooltipX = null, tooltipY = null;
  if (activeCoord) {
    tooltipX = Math.max(84, Math.min(PLOT_X2 - 86, activeCoord.x - 85));
    tooltipY = activeCoord.y - 84 >= PLOT_Y1 + 4 ? activeCoord.y - 84 : activeCoord.y + 18;
  }

  // Legend values
  const currentUSD = n > 0 ? points[n - 1].totalValue : 0;
  const startUSD = n > 0 ? points[0].totalValue : 0;
  const deltaUSD = currentUSD - startUSD;

  // Chart subtitle
  const subtitle = `Hourly snapshots · values in ${currency}`;

  // Mouse interaction
  const handleMouseMove = (e) => {
    if (!svgRef.current || n < 2) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, (mouseX - rect.left * 0) / rect.width));
    const idx = Math.round(pct * (n - 1));
    setHovered({ idx: Math.max(0, Math.min(n - 1, idx)) });
  };

  const handleTouchMove = (e) => {
    if (!svgRef.current || n < 2) return;
    const touch = e.touches[0];
    const rect = svgRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
    const idx = Math.round(pct * (n - 1));
    setHovered({ idx: Math.max(0, Math.min(n - 1, idx)) });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
        <div>
          <h2 className="card-title">Portfolio Value Over Time</h2>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{subtitle}</div>
        </div>
        {/* Range segmented control */}
        <div className="seg" role="group" aria-label="Time range">
          {RANGES.map((r) => (
            <button
              key={r.id}
              className={`seg-btn${rangeId === r.id ? ' active' : ''}`}
              aria-pressed={rangeId === r.id}
              onClick={() => setRangeId(r.id)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Legend row */}
      {n >= 2 && (
        <div style={{ display: 'flex', gap: 18, fontSize: 13, marginBottom: 4, flexWrap: 'wrap', alignItems: 'center' }}>
          <span>• Total value <strong>{fmt(currentUSD)}</strong></span>
          <span style={{ color: 'var(--text-muted)' }}>
            – – Value {range.startLabel} <strong style={{ color: 'var(--text-primary)' }}>{fmt(startUSD)}</strong>
          </span>
          <span style={{ color: 'var(--text-muted)' }}>
            Change <strong style={{ color: deltaUSD >= 0 ? 'var(--positive)' : 'var(--negative)' }}>
              {fmtDelta(deltaUSD)}
            </strong>
          </span>
        </div>
      )}

      {/* SVG chart */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8, color: 'var(--text-muted)', fontSize: 13 }}>
            <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
            Loading chart data…
          </div>
        ) : error ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: 13 }}>
            Failed to load chart data
          </div>
        ) : n < 2 ? (
          <div
            role="img"
            aria-label="No chart data available for the selected time range"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}
          >
            Not enough data for the selected range.<br />Import holdings to start tracking your portfolio.
          </div>
        ) : (
          <svg
            ref={svgRef}
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            width="100%"
            style={{ display: 'block', overflow: 'visible', cursor: 'crosshair', touchAction: 'pan-y' }}
            role="img"
            aria-label="Line chart of total portfolio value over the selected time range"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHovered(null)}
            onTouchMove={handleTouchMove}
            onTouchEnd={() => setHovered(null)}
          >
            {/* Y-axis labels */}
            <g fontFamily="Inter,sans-serif" fontSize="12" fill="var(--text-muted)">
              {yLabels.map(({ y, label }, i) => (
                <text key={i} x={6} y={y + 4}>{label}</text>
              ))}
            </g>

            {/* X-axis labels */}
            <g fontFamily="Inter,sans-serif" fontSize="12" fill="var(--text-muted)" textAnchor="middle">
              {xLabels.map(({ x, label }, i) => (
                <text key={i} x={x} y={AXIS_X_Y}>{label}</text>
              ))}
            </g>

            {/* Dashed baseline (first value) */}
            <line
              x1={PLOT_X1} y1={baseY}
              x2={PLOT_X2} y2={baseY}
              stroke="var(--chart-baseline)"
              strokeWidth={1.4}
              strokeDasharray="4 4"
            />

            {/* Line */}
            <polyline
              points={polyPts}
              fill="none"
              stroke={lineColor}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {/* Hover crosshair + marker */}
            {activeCoord && (
              <>
                <line
                  x1={activeCoord.x} y1={activeCoord.y}
                  x2={activeCoord.x} y2={PLOT_Y2 + 6}
                  stroke="#D5D6DB"
                  strokeWidth={1}
                />
                <circle
                  cx={activeCoord.x} cy={activeCoord.y}
                  r={10}
                  fill="white"
                  stroke={lineColor}
                  strokeWidth={3}
                />

                {/* Tooltip */}
                {tooltipX !== null && activePoint && (
                  <g fontFamily="Inter,sans-serif">
                    <rect
                      x={tooltipX} y={tooltipY}
                      width={170} height={58}
                      rx={8}
                      fill="var(--chart-tooltip-bg)"
                    />
                    <text x={tooltipX + 10} y={tooltipY + 17} fontSize={10} fill="#C9CAD0">
                      {formatTooltipDate(activePoint.timestamp, rangeId)}
                    </text>
                    <text x={tooltipX + 10} y={tooltipY + 33} fontSize={11} fill="#fff">
                      Total value
                    </text>
                    <text x={tooltipX + 160} y={tooltipY + 33} fontSize={11} fill="#fff" textAnchor="end">
                      {fmt(activePoint.totalValue)}
                    </text>
                    <text x={tooltipX + 10} y={tooltipY + 48} fontSize={11} fill="#fff">
                      Since start
                    </text>
                    <text
                      x={tooltipX + 160} y={tooltipY + 48}
                      fontSize={11}
                      fill={activePoint.totalValue >= startUSD ? '#3DD68C' : '#FF6B73'}
                      textAnchor="end"
                    >
                      {fmtDelta(activePoint.totalValue - startUSD)}
                    </text>
                  </g>
                )}
              </>
            )}
          </svg>
        )}

        {/* Converted rate caption */}
        {isConverted && n >= 2 && (
          <div style={{ position: 'absolute', bottom: 0, right: 4, fontSize: 10, color: 'var(--text-caption)' }}>
            Converted at today's rate
          </div>
        )}
      </div>
    </div>
  );
}
