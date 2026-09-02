import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  ArrowLeft,
  Calendar,
  Layers,
  Coins,
  Wallet,
  PieChart as PieIcon,
  RefreshCw,
  Award,
  Zap,
  Activity,
  Maximize2,
  Minimize2,
  Info,
  Trash2,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import api from '../api/axiosInstance';

export const AnalyticsPage = ({ holdings = [], prices = {} }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  
  const initialTf = location.state?.initialTimeframe || '30d';
  const [timeframe, setTimeframe] = useState(initialTf);
  const [historyData, setHistoryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [activeComponent, setActiveComponent] = useState('total'); // 'total' | 'crypto' | 'stock' | 'cash'
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const chartRef = useRef(null);

  const timeframes = [
    { id: '24h', label: '24 Hours' },
    { id: '7d', label: '7 Days' },
    { id: '30d', label: '30 Days' },
    { id: '90d', label: '90 Days' },
    { id: '1y', label: '1 Year' },
    { id: 'all', label: 'All Time' },
  ];

  const fetchHistory = async (tf) => {
    setLoading(true);
    try {
      const res = await api.get(`/portfolio/history?timeframe=${tf}`);
      setHistoryData(res.data);
    } catch (err) {
      console.error('Failed to load analytical chart data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
      return;
    }
    setClearing(true);
    try {
      await api.delete('/portfolio/history');
      setConfirmClear(false);
      fetchHistory(timeframe);
    } catch (err) {
      console.error('Failed to clear portfolio history:', err);
    } finally {
      setClearing(false);
    }
  };

  useEffect(() => {
    fetchHistory(timeframe);
  }, [timeframe, holdings, prices]);

  const points = historyData?.dataPoints || [];
  const summary = historyData?.summary || {};
  const isPositive = summary.isPositive !== undefined ? summary.isPositive : true;

  // Compute selected data metric values based on activeComponent filter
  const getPointValue = (p) => {
    if (!p) return 0;
    if (activeComponent === 'crypto') return p.cryptoValue || 0;
    if (activeComponent === 'stock') return p.stockValue || 0;
    if (activeComponent === 'cash') return p.cashValue || 0;
    return p.totalValue || 0;
  };

  const values = points.map((p) => getPointValue(p));
  const minVal = values.length > 0 ? Math.min(...values) : 0;
  const maxVal = values.length > 0 ? Math.max(...values) : 100;
  const valRange = maxVal - minVal || 1;

  // SVG dimensions for high-definition chart canvas
  const svgWidth = 1000;
  const svgHeight = 340;
  const paddingY = 35;
  const paddingX = 15;

  const getSvgCoords = (val, idx) => {
    const x = paddingX + (idx / Math.max(1, points.length - 1)) * (svgWidth - paddingX * 2);
    const normalizedY = (val - minVal) / valRange;
    const y = svgHeight - paddingY - normalizedY * (svgHeight - paddingY * 2);
    return { x, y };
  };

  const coords = points.map((p, i) => getSvgCoords(getPointValue(p), i));

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
      year: timeframe === 'all' || timeframe === '1y' ? 'numeric' : undefined,
      hour: timeframe === '24h' ? '2-digit' : undefined,
      minute: timeframe === '24h' ? '2-digit' : undefined,
    });
  };

  // Find Peak and Trough Points
  const peakPoint = points.length > 0 ? points.reduce((prev, curr) => (getPointValue(curr) > getPointValue(prev) ? curr : prev), points[0]) : null;
  const troughPoint = points.length > 0 ? points.reduce((prev, curr) => (getPointValue(curr) < getPointValue(prev) ? curr : prev), points[0]) : null;
  const avgValue = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;

  return (
    <div className={`space-y-6 ${isFullscreen ? 'fixed inset-0 z-50 dark:bg-slate-950 bg-slate-50 p-6 overflow-y-auto' : ''}`}>
      {/* Top Header / Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            to="/"
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 mb-2 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </Link>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold dark:text-white text-slate-900 font-heading tracking-tight">
              Portfolio Historical Analytics
            </h1>
            <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              Deep Analytics
            </span>
          </div>
          <p className="text-xs dark:text-slate-400 text-slate-600 mt-1">
            Historical portfolio valuation curve, component breakdown, peak levels, and timeframe dynamics
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => fetchHistory(timeframe)}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl dark:bg-slate-800 bg-slate-100 dark:hover:bg-slate-700 hover:bg-slate-200 border dark:border-slate-700 border-slate-300 dark:text-slate-300 text-slate-700 text-xs font-semibold transition cursor-pointer shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-500 dark:text-cyan-400' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl dark:bg-slate-800 bg-slate-100 dark:hover:bg-slate-700 hover:bg-slate-200 border dark:border-slate-700 border-slate-300 dark:text-slate-300 text-slate-700 text-xs font-semibold transition cursor-pointer shadow-sm"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
          </button>

          {/* Reset History Button */}
          <button
            onClick={handleClearHistory}
            disabled={clearing}
            title={confirmClear ? 'Click again to confirm' : 'Reset all portfolio history data'}
            className={`flex items-center space-x-1 px-3 py-2 rounded-xl border text-xs font-semibold transition cursor-pointer shadow-sm ${
              confirmClear
                ? 'bg-rose-500/15 border-rose-500/30 text-rose-500 dark:text-rose-400 hover:bg-rose-500/25'
                : 'dark:bg-slate-800/80 bg-slate-100 dark:hover:bg-slate-700 hover:bg-slate-200 dark:border-slate-700 border-slate-300 dark:text-slate-400 text-slate-500 hover:text-rose-500 dark:hover:text-rose-400'
            }`}
          >
            <Trash2 className={`w-3.5 h-3.5 ${clearing ? 'animate-spin' : ''}`} />
            <span>{confirmClear ? 'Confirm Reset?' : 'Reset History'}</span>
          </button>
        </div>
      </div>

      {/* Main Analytical Chart Card */}
      <div className="glass-card rounded-2xl p-6 border dark:border-slate-800 border-slate-200 shadow-2xl relative">
        {/* Metric Summary Header */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pb-6 border-b dark:border-slate-800/80 border-slate-200 mb-6">
          <div>
            <span className="text-[11px] font-semibold dark:text-slate-400 text-slate-500 uppercase tracking-wider block mb-1">
              {activeComponent === 'total' ? 'Valuation At Hover' : `${activeComponent.toUpperCase()} Value`}
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold dark:text-white text-slate-900 font-heading tracking-tight">
              {formatUSD(activeDisplayPoint ? getPointValue(activeDisplayPoint) : summary.currentValue)}
            </div>
            <p className="text-[11px] text-cyan-600 dark:text-cyan-400 font-semibold mt-1">
              {hoveredPoint ? formatDate(hoveredPoint.timestamp) : 'Current Live Quote'}
            </p>
          </div>

          <div>
            <span className="text-[11px] font-semibold dark:text-slate-400 text-slate-500 uppercase tracking-wider block mb-1">
              Period Change ({historyData?.label})
            </span>
            <div
              className={`text-xl font-extrabold font-heading ${
                isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {isPositive ? '+' : ''}
              {formatUSD(summary.changeAmount)} ({isPositive ? '+' : ''}
              {summary.changePercent}%)
            </div>
            <p className="text-[11px] dark:text-slate-400 text-slate-500 mt-1">
              Start Value: <span className="dark:text-slate-200 text-slate-800 font-semibold">{formatUSD(summary.startValue)}</span>
            </p>
          </div>

          <div>
            <span className="text-[11px] font-semibold dark:text-slate-400 text-slate-500 uppercase tracking-wider block mb-1">
              Timeframe Peak (ATH)
            </span>
            <div className="text-xl font-extrabold text-cyan-600 dark:text-cyan-300 font-heading">
              {formatUSD(getPointValue(peakPoint))}
            </div>
            <p className="text-[11px] dark:text-slate-400 text-slate-500 mt-1">
              Reached: {formatDate(peakPoint?.timestamp)}
            </p>
          </div>

          <div>
            <span className="text-[11px] font-semibold dark:text-slate-400 text-slate-500 uppercase tracking-wider block mb-1">
              Average Valuation
            </span>
            <div className="text-xl font-extrabold text-indigo-600 dark:text-indigo-300 font-heading">
              {formatUSD(avgValue)}
            </div>
            <p className="text-[11px] dark:text-slate-400 text-slate-500 mt-1">
              Lowest: {formatUSD(getPointValue(troughPoint))}
            </p>
          </div>
        </div>

        {/* Timeframe & Asset Component Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
          {/* Asset Component Layer Filters */}
          <div className="flex items-center space-x-1.5 dark:bg-slate-900/80 bg-slate-100 p-1.5 rounded-xl border dark:border-slate-800 border-slate-300 overflow-x-auto w-full sm:w-auto shadow-inner">
            {[
              { id: 'total', label: 'Total Portfolio', icon: Layers },
              { id: 'crypto', label: 'Crypto Only', icon: Coins },
              { id: 'stock', label: 'Stocks Only', icon: TrendingUp },
              { id: 'cash', label: 'Cash Only', icon: Wallet },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveComponent(id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                  activeComponent === id
                    ? 'dark:bg-cyan-500/20 bg-cyan-500/15 border border-cyan-500/30 text-cyan-600 dark:text-cyan-300 shadow-sm'
                    : 'dark:text-slate-400 text-slate-600 hover:text-slate-900 dark:hover:text-slate-200 dark:hover:bg-slate-800/50 hover:bg-slate-200 border border-transparent'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Timeframe Buttons */}
          <div className="flex items-center space-x-1 dark:bg-slate-900/80 bg-slate-100 p-1.5 rounded-xl border dark:border-slate-800 border-slate-300 shadow-inner">
            {timeframes.map((tf) => (
              <button
                key={tf.id}
                onClick={() => setTimeframe(tf.id)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                  timeframe === tf.id
                    ? 'bg-cyan-500 text-slate-950 shadow-md'
                    : 'dark:text-slate-400 text-slate-600 hover:text-slate-900 dark:hover:text-white dark:hover:bg-slate-800/60 hover:bg-slate-200'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>

        {/* HD SVG Canvas Graph */}
        <div className="relative w-full rounded-xl dark:bg-slate-950/60 bg-slate-50/80 p-4 border dark:border-slate-800 border-slate-200">
          {loading ? (
            <div className="h-80 flex items-center justify-center dark:text-slate-400 text-slate-600 text-sm">
              <RefreshCw className="w-6 h-6 animate-spin text-cyan-500 dark:text-cyan-400 mr-2" /> Loading detailed chart analysis...
            </div>
          ) : (
            <div className="relative w-full overflow-hidden">
              <svg
                ref={chartRef}
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-72 sm:h-80 overflow-visible"
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
                  <linearGradient id="analyticsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor={isPositive ? '#06b6d4' : '#f43f5e'}
                      stopOpacity="0.4"
                    />
                    <stop
                      offset="100%"
                      stopColor={isPositive ? '#06b6d4' : '#f43f5e'}
                      stopOpacity="0.0"
                    />
                  </linearGradient>

                  <filter id="hdGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* Grid Lines */}
                {[0.2, 0.4, 0.6, 0.8].map((ratio, i) => (
                  <line
                    key={i}
                    x1={paddingX}
                    y1={svgHeight * ratio}
                    x2={svgWidth - paddingX}
                    y2={svgHeight * ratio}
                    stroke={isDark ? '#1e293b' : '#e2e8f0'}
                    strokeDasharray="4 4"
                  />
                ))}

                {/* Area fill */}
                {areaPathD && <path d={areaPathD} fill="url(#analyticsGradient)" />}

                {/* Main line */}
                {linePathD && (
                  <path
                    d={linePathD}
                    fill="none"
                    stroke={isPositive ? '#22d3ee' : '#fb7185'}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    filter="url(#hdGlow)"
                  />
                )}

                {/* Hover Crosshair & Tooltip Marker */}
                {hoveredPoint && (
                  (() => {
                    const idx = points.findIndex((p) => p.timestamp === hoveredPoint.timestamp);
                    if (idx === -1) return null;
                    const pt = coords[idx];
                    return (
                      <g key="active-crosshair">
                        <line
                          x1={pt.x}
                          y1={paddingY}
                          x2={pt.x}
                          y2={svgHeight - paddingY}
                          stroke="#38bdf8"
                          strokeDasharray="3 3"
                          strokeWidth="1.5"
                        />
                        <circle cx={pt.x} cy={pt.y} r="7" fill="#38bdf8" className="animate-ping opacity-60" />
                        <circle cx={pt.x} cy={pt.y} r="6" fill={isDark ? '#0b0f19' : '#ffffff'} stroke="#38bdf8" strokeWidth="3" />
                      </g>
                    );
                  })()
                )}
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Analytics Insights & Performance Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Valuation Extremes */}
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center space-x-2 text-cyan-600 dark:text-cyan-400">
            <Award className="w-5 h-5" />
            <h3 className="font-heading font-bold dark:text-white text-slate-900 text-base">Valuation Extremes</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl dark:bg-slate-900/80 bg-slate-50 border dark:border-slate-800 border-slate-200 flex justify-between items-center">
              <div>
                <span className="dark:text-slate-400 text-slate-500 block">Peak Valuation (ATH)</span>
                <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                  {formatUSD(getPointValue(peakPoint))}
                </span>
              </div>
              <span className="text-[10px] dark:text-slate-500 text-slate-400">{formatDate(peakPoint?.timestamp)}</span>
            </div>

            <div className="p-3 rounded-xl dark:bg-slate-900/80 bg-slate-50 border dark:border-slate-800 border-slate-200 flex justify-between items-center">
              <div>
                <span className="dark:text-slate-400 text-slate-500 block">Lowest Valuation (ATL)</span>
                <span className="text-sm font-extrabold text-rose-600 dark:text-rose-400 font-mono">
                  {formatUSD(getPointValue(troughPoint))}
                </span>
              </div>
              <span className="text-[10px] dark:text-slate-500 text-slate-400">{formatDate(troughPoint?.timestamp)}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Cost Basis vs Return */}
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400">
            <Zap className="w-5 h-5" />
            <h3 className="font-heading font-bold dark:text-white text-slate-900 text-base">Cost Basis vs Return</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl dark:bg-slate-900/80 bg-slate-50 border dark:border-slate-800 border-slate-200 flex justify-between items-center">
              <span className="dark:text-slate-400 text-slate-500">Stock Cost Basis (Principal):</span>
              <span className="font-bold dark:text-white text-slate-900 font-mono">{formatUSD(summary.totalCost)}</span>
            </div>

            <div className="p-3 rounded-xl dark:bg-slate-900/80 bg-slate-50 border dark:border-slate-800 border-slate-200 flex justify-between items-center">
              <span className="dark:text-slate-400 text-slate-500">Period Valuation Delta:</span>
              <span className={`font-extrabold font-mono ${summary.changeAmount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {summary.changeAmount >= 0 ? '+' : ''}
                {formatUSD(summary.changeAmount)} ({summary.changeAmount >= 0 ? '+' : ''}{summary.changePercent}%)
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Chart Study Tip */}
        <div className="glass-card rounded-2xl p-6 space-y-3">
          <div className="flex items-center space-x-2 text-amber-500 dark:text-amber-400">
            <Info className="w-5 h-5" />
            <h3 className="font-heading font-bold dark:text-white text-slate-900 text-base">Study Notes</h3>
          </div>
          <p className="text-xs dark:text-slate-400 text-slate-600 leading-relaxed">
            Snapshots are automatically logged on daily intervals and live market refreshes. Switch between timeframe filters (24H to ALL) to analyze macro portfolio trend curves versus short-term market fluctuations.
          </p>
        </div>
      </div>
    </div>
  );
};
