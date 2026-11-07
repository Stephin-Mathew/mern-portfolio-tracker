import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Trash2, TrendingUp, TrendingDown, DollarSign, BarChart2, Layers, Wallet, ShieldAlert, Target } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';
import { computePortfolio, compute30dReturn } from '../utils/portfolioMetrics';
import { useWallets } from '../context/WalletContext';
import { PortfolioValueChart } from '../components/PortfolioValueChart';
import { AllocationDonut } from '../components/AllocationDonut';
import { HoldingsPerformanceTable } from '../components/HoldingsPerformanceTable';
import { WalletBreakdownChart } from '../components/WalletBreakdownChart';
import { RiskMetricsPanel } from '../components/RiskMetricsPanel';
import { TopMoversCard } from '../components/TopMoversCard';
import { DrawdownCard } from '../components/DrawdownCard';
import { PnLContributionCard } from '../components/PnLContributionCard';
import { UnrealizedGainsCard } from '../components/UnrealizedGainsCard';
import api from '../api/axiosInstance';

/* ─── Stat Tile ─────────────────────────────────────────────────────── */
function StatTile({ label, value, sub, subColor, icon, iconColor }) {
  return (
    <div className="card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
          {label}
        </div>
        {icon && (
          <span style={{ color: iconColor ?? 'var(--text-muted)', opacity: 0.7 }}>
            {icon}
          </span>
        )}
      </div>
      <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: subColor ?? 'var(--text-muted)', marginTop: 1 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

/* ─── Section Header ────────────────────────────────────────────────── */
function SectionHeader({ title, icon }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, marginBottom: 2 }}>
      {icon && <span style={{ color: 'var(--text-muted)' }}>{icon}</span>}
      <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.01em' }}>
        {title}
      </h2>
      <div style={{ flex: 1, height: 1, background: 'var(--divider-2)', marginLeft: 8 }} />
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────────────────────── */
export const AnalyticsPage = ({ holdings = [], prices = {} }) => {
  const { wallets } = useWallets();
  const { fmt, fmtDelta } = useCurrency();
  const [refreshKey, setRefreshKey] = useState(0);
  const [clearing, setClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const metrics = computePortfolio(holdings, prices, wallets);
  const ret30d = compute30dReturn(metrics.perSymbol, prices, metrics.totalValue);

  const ch24 = metrics.change24h;
  const ch7 = metrics.change7d;

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
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error('Failed to clear portfolio history:', err);
    } finally {
      setClearing(false);
    }
  };

  /* ── Stat tile data ─────────────────────────────────────────────── */
  const statTiles = [
    {
      label: 'Total Value',
      value: fmt(metrics.totalValue),
      icon: <DollarSign size={14} />,
    },
    {
      label: "24h Change",
      value: `${ch24.pct >= 0 ? '+' : ''}${ch24.pct.toFixed(2)}%`,
      sub: fmtDelta(ch24.amount),
      subColor: ch24.amount >= 0 ? 'var(--positive)' : 'var(--negative)',
      iconColor: ch24.amount >= 0 ? 'var(--positive)' : 'var(--negative)',
      icon: ch24.amount >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />,
    },
    {
      label: "7d Change",
      value: `${ch7.pct >= 0 ? '+' : ''}${ch7.pct.toFixed(2)}%`,
      sub: fmtDelta(ch7.amount),
      subColor: ch7.amount >= 0 ? 'var(--positive)' : 'var(--negative)',
      iconColor: ch7.amount >= 0 ? 'var(--positive)' : 'var(--negative)',
      icon: ch7.amount >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />,
    },
    ...(ret30d ? [{
      label: "30d Return",
      value: `${ret30d.pct >= 0 ? '+' : ''}${ret30d.pct.toFixed(2)}%`,
      sub: fmtDelta(ret30d.amount),
      subColor: ret30d.amount >= 0 ? 'var(--positive)' : 'var(--negative)',
      iconColor: ret30d.amount >= 0 ? 'var(--positive)' : 'var(--negative)',
      icon: <TrendingUp size={14} />,
    }] : []),
    ...(metrics.unrealizedAnalysis?.hasData ? [{
      label: "Unrealized P&L",
      value: fmtDelta(metrics.unrealizedAnalysis.netPnlUsd),
      sub: `${metrics.unrealizedAnalysis.roiPct >= 0 ? '+' : ''}${metrics.unrealizedAnalysis.roiPct.toFixed(1)}% ROI`,
      subColor: metrics.unrealizedAnalysis.netPnlUsd >= 0 ? 'var(--positive)' : 'var(--negative)',
      iconColor: metrics.unrealizedAnalysis.netPnlUsd >= 0 ? 'var(--positive)' : 'var(--negative)',
      icon: metrics.unrealizedAnalysis.netPnlUsd >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />,
    }] : []),
    ...(metrics.perSymbol?.[0] ? [{
      label: "Top Asset",
      value: metrics.perSymbol[0].symbol,
      sub: `${metrics.perSymbol[0].weightPct.toFixed(1)}% (${fmt(metrics.perSymbol[0].valueUsd)})`,
      icon: <BarChart2 size={14} />,
    }] : []),
    ...(metrics.movers?.gainers?.[0] ? [{
      label: "Top Gainer",
      value: metrics.movers.gainers[0].symbol,
      sub: `+${metrics.movers.gainers[0].change24h.toFixed(1)}% today`,
      subColor: 'var(--positive)',
      iconColor: 'var(--positive)',
      icon: <TrendingUp size={14} />,
    }] : []),
    {
      label: "Positions",
      value: String(metrics.positionsCount),
      sub: `Across ${metrics.walletCount} wallet${metrics.walletCount !== 1 ? 's' : ''}`,
      icon: <Layers size={14} />,
    },
    {
      label: "Wallets",
      value: String(metrics.walletCount),
      icon: <Wallet size={14} />,
    },
  ];

  return (
    <div className="page-container analytics-page" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <Link
            to="/"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none', marginBottom: 6 }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            <ArrowLeft size={13} /> Overview
          </Link>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>Analytics</h1>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
            Historical performance, allocation &amp; risk metrics
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: '1px solid var(--card-border)', background: 'var(--shell-bg)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            <RefreshCw size={13} /> Refresh
          </button>
          <button
            onClick={handleClearHistory}
            disabled={clearing}
            title={confirmClear ? 'Click again to confirm' : 'Reset all portfolio history'}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: `1px solid ${confirmClear ? 'var(--negative-bg)' : 'var(--card-border)'}`, background: confirmClear ? 'var(--negative-bg)' : 'var(--shell-bg)', color: confirmClear ? 'var(--negative)' : 'var(--text-secondary)', fontSize: 12, fontWeight: 500, cursor: clearing ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: clearing ? 0.6 : 1 }}
          >
            <Trash2 size={13} style={{ animation: clearing ? 'spin 1s linear infinite' : 'none' }} />
            {confirmClear ? 'Confirm reset?' : 'Reset history'}
          </button>
        </div>
      </div>

      {/* ── Stat Tiles ──────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 150px), 1fr))', gap: 10 }}>
        {statTiles.map(({ label, ...rest }) => (
          <StatTile key={label} label={label} {...rest} />
        ))}
      </div>

      {/* ── Portfolio Value Chart ───────────────────────────────────── */}
      <SectionHeader title="Portfolio Value Over Time" icon={<TrendingUp size={14} />} />
      <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '16px' }}>
        <PortfolioValueChart holdings={holdings} prices={prices} refreshKey={refreshKey} />
      </div>

      {/* ── Capital & Drawdown Analytics (2-col on desktop) ─────────── */}
      <SectionHeader title="Capital &amp; Drawdown Analytics" icon={<ShieldAlert size={14} />} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 12, alignItems: 'start' }}>
        <div className="card" style={{ padding: 16 }}>
          <DrawdownCard refreshKey={refreshKey} currentLiveValue={metrics.totalValue} />
        </div>
        <div className="card" style={{ padding: 16 }}>
          <UnrealizedGainsCard metrics={metrics} />
        </div>
      </div>

      {/* ── Returns & P&L Contribution (2-col on desktop) ───────────── */}
      <SectionHeader title="Returns &amp; P&amp;L Contribution" icon={<DollarSign size={14} />} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 12, alignItems: 'start' }}>
        <div className="card" style={{ padding: 16 }}>
          <PnLContributionCard metrics={metrics} />
        </div>
        <div className="card" style={{ padding: 16 }}>
          <TopMoversCard movers={metrics.movers} metrics={metrics} />
        </div>
      </div>

      {/* ── Allocation + Risk (2-col on desktop) ───────────────────── */}
      <SectionHeader title="Allocation &amp; Risk" icon={<Layers size={14} />} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 12, alignItems: 'start' }}>
        <div className="card" style={{ padding: 16 }}>
          <AllocationDonut metrics={metrics} />
        </div>
        <div className="card" style={{ padding: 16 }}>
          <RiskMetricsPanel metrics={metrics} />
        </div>
      </div>

      {/* ── Wallet Breakdown ────────────────────────────────────────── */}
      <SectionHeader title="Wallet Breakdown" icon={<Wallet size={14} />} />
      <div className="card" style={{ padding: 16 }}>
        <WalletBreakdownChart metrics={metrics} />
      </div>

      {/* ── Holdings Performance Table ──────────────────────────────── */}
      <SectionHeader title="Holdings Performance" icon={<BarChart2 size={14} />} />
      <div className="card" style={{ padding: 16, overflowX: 'auto' }}>
        <HoldingsPerformanceTable metrics={metrics} prices={prices} />
      </div>

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
};
