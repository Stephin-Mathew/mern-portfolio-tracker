import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, Maximize2, ExternalLink, Calendar, RefreshCw } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import api from '../api/axiosInstance';

export const PortfolioChartWidget = ({ holdings = [], prices = {} }) => {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [timeframe, setTimeframe] = useState('30d');
  const [historyData, setHistoryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const chartRef = useRef(null);

  const timeframes = [
    { id: '24h', label: '24H' },
    { id: '7d', label: '7D' },
    { id: '30d', label: '30D' },
    { id: '90d', label: '90D' },
    { id: '1y', label: '1Y' },
    { id: 'all', label: 'ALL' },
  ];

  const fetchHistory = async (tf) => {
    setLoading(true);
    try {
      const res = await api.get(`/portfolio/history?timeframe=${tf}`);
      setHistoryData(res.data);
    } catch (err) {
      console.error('Failed to load portfolio history chart data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(timeframe);
  }, [timeframe, holdings, prices]);

  const handleChartClick = () => {
    navigate('/analytics', { state: { initialTimeframe: timeframe } });
  };

  const points = historyData?.dataPoints || [];
  const summary = historyData?.summary || {};
  const isPositive = summary.isPositive !== undefined ? summary.isPositive : true;

  // Compute SVG SVG coordinate paths
  const svgWidth = 800;
  const svgHeight = 220;
  const paddingY = 25;
  const paddingX = 10;

  const values = points.map((p) => p.totalValue);
  const minVal = values.length > 0 ? Math.min(...values) : 0;
  const maxVal = values.length > 0 ? Math.max(...values) : 100;
  const valRange = maxVal - minVal || 1;

  const getSvgCoords = (val, idx) => {
    const x = paddingX + (idx / Math.max(1, points.length - 1)) * (svgWidth - paddingX * 2);
    const normalizedY = (val - minVal) / valRange;
    const y = svgHeight - paddingY - normalizedY * (svgHeight - paddingY * 2);
    return { x, y };
  };

  // Build SVG Path Smooth Curves
  const coords = points.map((p, i) => getSvgCoords(p.totalValue, i));
  
  let linePathD = '';
  let areaPathD = '';

  if (coords.length > 0) {
    linePathD = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const current = coords[i];
      const next = coords[i + 1];
      const controlX = (current.x + next.x) / 2;
      linePathD += ` C ${controlX} ${current.y}, ${controlX} ${next.y}, ${next.x} ${next.y}`;
    }

    const first = coords[0];
    const last = coords[coords.length - 1];
    areaPathD = `${linePathD} L ${last.x} ${svgHeight} L ${first.x} ${svgHeight} Z`;
  }

  const activeDisplayPoint = hoveredPoint || (points.length > 0 ? points[points.length - 1] : null);

  const formatUSD = (num) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(num || 0);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: timeframe === '24h' ? '2-digit' : undefined,
      minute: timeframe === '24h' ? '2-digit' : undefined,
    });
  };

  return (
    <div className="glass-card rounded-2xl p-6 relative overflow-hidden border dark:border-slate-800 border-slate-200 shadow-xl transition-all duration-300 group hover:border-cyan-500/30">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold uppercase tracking-wider dark:text-slate-400 text-slate-500">
              Portfolio Performance Chart
            </span>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              Live Interactive
            </span>
          </div>

          <div className="flex items-baseline space-x-3 mt-1">
            <span className="text-2xl sm:text-3xl font-extrabold dark:text-white text-slate-900 font-heading tracking-tight">
              {formatUSD(activeDisplayPoint ? activeDisplayPoint.totalValue : summary.currentValue)}
            </span>

            <div
              className={`flex items-center space-x-1 text-xs font-bold px-2.5 py-1 rounded-lg border ${
                isPositive
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
              }`}
            >
              {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              <span>
                {isPositive ? '+' : ''}
                {formatUSD(summary.changeAmount)} ({isPositive ? '+' : ''}
                {summary.changePercent}%)
              </span>
            </div>
          </div>

          <p className="text-[11px] dark:text-slate-400 text-slate-500 mt-1">
            {hoveredPoint ? (
              <span className="text-cyan-600 dark:text-cyan-300 font-semibold">Snapshot: {formatDate(hoveredPoint.timestamp)}</span>
            ) : (
              <span>Overall valuation history over {historyData?.label || '30 days'}</span>
            )}
          </p>
        </div>

        {/* Timeframe Selectors & Expand Page Action Button */}
        <div className="flex items-center space-x-2">
          {/* Timeframe Selector Pill */}
          <div className="flex items-center dark:bg-slate-900/90 bg-slate-100 border dark:border-slate-800 border-slate-300 rounded-xl p-1 shadow-inner">
            {timeframes.map((tf) => (
              <button
                key={tf.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setTimeframe(tf.id);
                }}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                  timeframe === tf.id
                    ? 'bg-cyan-500 text-slate-950 shadow-md'
                    : 'dark:text-slate-400 text-slate-600 hover:text-slate-900 dark:hover:text-white dark:hover:bg-slate-800/60 hover:bg-slate-200'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          {/* Dedicated Study Page Button */}
          <button
            onClick={handleChartClick}
            title="Open Detailed Chart Study Page"
            className="flex items-center space-x-1 px-3 py-2 rounded-xl dark:bg-slate-800/80 bg-slate-100 dark:hover:bg-slate-700 hover:bg-slate-200 border dark:border-slate-700 border-slate-300 dark:text-slate-200 text-slate-800 hover:text-cyan-600 dark:hover:text-white text-xs font-semibold transition cursor-pointer shadow-sm group/btn"
          >
            <span>Study Chart</span>
            <ExternalLink className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition" />
          </button>
        </div>
      </div>

      {/* SVG Interactive Area Chart Canvas */}
      <div
        onClick={handleChartClick}
        className="relative w-full cursor-pointer rounded-xl dark:bg-slate-950/40 bg-slate-50/80 p-2 border dark:border-slate-800/60 border-slate-200 group/chart"
        title="Click graph to open detailed study page"
      >
        {/* Subtle Overlay Badge on Hover */}
        <div className="absolute top-3 right-3 z-10 opacity-0 group-hover/chart:opacity-100 transition-opacity dark:bg-slate-900/90 bg-white/95 border dark:border-slate-700 border-slate-300 text-cyan-600 dark:text-cyan-300 text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center space-x-1 shadow-lg pointer-events-none">
          <Maximize2 className="w-3 h-3 text-cyan-500 dark:text-cyan-400" />
          <span>Click to Study Chart in Full Page ↗</span>
        </div>

        {loading ? (
          <div className="h-52 flex items-center justify-center text-slate-500 text-xs">
            <RefreshCw className="w-5 h-5 animate-spin text-cyan-400 mr-2" /> Loading portfolio history curve...
          </div>
        ) : (
          <div className="relative w-full overflow-hidden">
            <svg
              ref={chartRef}
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-48 sm:h-56 overflow-visible"
              onMouseLeave={() => setHoveredPoint(null)}
              onMouseMove={(e) => {
                if (!chartRef.current || points.length === 0) return;
                const rect = chartRef.current.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const pct = Math.max(0, Math.min(1, mouseX / rect.width));
                const index = Math.round(pct * (points.length - 1));
                if (points[index]) {
                  setHoveredPoint(points[index]);
                }
              }}
            >
              <defs>
                {/* Area Gradient */}
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={isPositive ? '#06b6d4' : '#f43f5e'}
                    stopOpacity="0.35"
                  />
                  <stop
                    offset="100%"
                    stopColor={isPositive ? '#06b6d4' : '#f43f5e'}
                    stopOpacity="0.0"
                  />
                </linearGradient>

                {/* Line Glow Filter */}
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Horizontal Grid Baseline Guidelines */}
              <line
                x1={paddingX}
                y1={paddingY}
                x2={svgWidth - paddingX}
                y2={paddingY}
                stroke={isDark ? '#1e293b' : '#e2e8f0'}
                strokeDasharray="4 4"
              />
              <line
                x1={paddingX}
                y1={svgHeight / 2}
                x2={svgWidth - paddingX}
                y2={svgHeight / 2}
                stroke={isDark ? '#1e293b' : '#e2e8f0'}
                strokeDasharray="4 4"
              />
              <line
                x1={paddingX}
                y1={svgHeight - paddingY}
                x2={svgWidth - paddingX}
                y2={svgHeight - paddingY}
                stroke={isDark ? '#1e293b' : '#e2e8f0'}
                strokeDasharray="4 4"
              />

              {/* Fill Gradient Area */}
              {areaPathD && <path d={areaPathD} fill="url(#chartGradient)" />}

              {/* Main Curve Line */}
              {linePathD && (
                <path
                  d={linePathD}
                  fill="none"
                  stroke={isPositive ? '#22d3ee' : '#fb7185'}
                  strokeWidth="3"
                  strokeLinecap="round"
                  filter="url(#glow)"
                />
              )}

              {/* Hover Indicator Crosshair Dot */}
              {hoveredPoint && (
                (() => {
                  const idx = points.findIndex((p) => p.timestamp === hoveredPoint.timestamp);
                  if (idx === -1) return null;
                  const pt = coords[idx];
                  return (
                    <g key="hover-marker">
                      <line
                        x1={pt.x}
                        y1={paddingY}
                        x2={pt.x}
                        y2={svgHeight - paddingY}
                        stroke="#38bdf8"
                        strokeDasharray="2 2"
                        strokeWidth="1.5"
                      />
                      <circle cx={pt.x} cy={pt.y} r="6" fill="#38bdf8" className="animate-ping opacity-75" />
                      <circle cx={pt.x} cy={pt.y} r="5" fill={isDark ? '#0b0f19' : '#ffffff'} stroke="#38bdf8" strokeWidth="2.5" />
                    </g>
                  );
                })()
              )}
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};
