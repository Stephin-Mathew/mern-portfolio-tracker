import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, TrendingUp, TrendingDown } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';
import { computePortfolio, compute30dReturn } from '../utils/portfolioMetrics';
import { useWallets } from '../context/WalletContext';
import { PortfolioValueChart } from '../components/PortfolioValueChart';
import { HoldingsPanel } from '../components/HoldingsPanel';
import { WalletWeightCard } from '../components/WalletWeightCard';
import { TopMoversCard } from '../components/TopMoversCard';
import { DataHealthCard } from '../components/DataHealthCard';

// Shimmer placeholder for stat cards
function StatCardSkeleton() {
  return (
    <div className="card shimmer" style={{ minHeight: 110 }} />
  );
}

// Single stat card
function StatCard({ label, value, subLine, subIsPositive, subTrail, loading }) {
  if (loading) return <StatCardSkeleton />;
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{label}</div>
      <div
        className="stat-value"
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </div>
      {subLine != null ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 500, flexWrap: 'wrap', minHeight: 18 }}>
          {subIsPositive === true && <TrendingUp size={12} color="var(--positive)" />}
          {subIsPositive === false && <TrendingDown size={12} color="var(--negative)" />}
          <span style={{ color: subIsPositive === true ? 'var(--positive)' : subIsPositive === false ? 'var(--negative)' : 'var(--text-muted)' }}>
            {subLine}
          </span>
          {subTrail && <span style={{ color: 'var(--text-muted)' }}>{subTrail}</span>}
        </div>
      ) : (
        <div style={{ minHeight: 18 }} />
      )}
    </div>
  );
}

export function OverviewPage({
  isAuthenticated,
  holdings = [],
  prices = {},
  loading,
  onUpdateHolding,
  onDeleteHolding,
  onEditClick,
  onUpdatePrice,
  onResetPrice,
  onOpenAuthModal,
  onOpenAddWalletModal,
  onRefreshPrices,
  rowStatuses,
}) {
  const { fmt, fmtDelta, fmtPct, currency } = useCurrency();
  const { wallets } = useWallets();

  const metrics = useMemo(
    () => computePortfolio(holdings, prices, wallets),
    [holdings, prices, wallets]
  );

  const return30d = useMemo(
    () => compute30dReturn(metrics.perSymbol, prices, metrics.totalValue),
    [metrics.perSymbol, prices, metrics.totalValue]
  );

  // 30-day date label
  const since30Label = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  })();

  if (!isAuthenticated) {
    return (
      <div style={{ padding: '48px 24px', maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 14px',
          borderRadius: 20,
          background: 'var(--neutral-chip-bg)',
          fontSize: 12,
          fontWeight: 500,
          color: 'var(--text-secondary)',
          marginBottom: 24,
        }}>
          <Sparkles size={14} />
          Multi-Wallet AI Portfolio Tracking
        </div>

        <h1 style={{ fontSize: 36, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16, lineHeight: 1.2 }}>
          Track All Your Wallets<br />In One Dashboard
        </h1>

        <p style={{ fontSize: 15, color: 'var(--text-muted)', marginBottom: 32, lineHeight: 1.6 }}>
          Manage Binance, Coinbase, Ledger, Robinhood, and custom wallets. Snap a screenshot or add assets manually to track your total portfolio.
        </p>

        <button className="btn-primary" onClick={onOpenAuthModal} style={{ margin: '0 auto', fontSize: 15 }}>
          Get Started — Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="page-container overview-page" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Row 1: 5 stat cards ────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 16,
        }}
        className="stats-grid"
      >
        {/* 1. Total Value */}
        <StatCard
          label="Total Value"
          loading={loading}
          value={fmt(metrics.totalValue, true)}
          subLine={`${metrics.change24h.pct >= 0 ? '↑' : '↓'} ${fmtPct(metrics.change24h.pct)}`}
          subIsPositive={metrics.change24h.pct >= 0}
          subTrail="Today"
        />

        {/* 2. Today's Change */}
        <StatCard
          label="Today's Change"
          loading={loading}
          value={fmtDelta(metrics.change24h.amount, true)}
          subLine={`${metrics.change24h.pct >= 0 ? '↑' : '↓'} ${fmtPct(metrics.change24h.pct)}`}
          subIsPositive={metrics.change24h.pct >= 0}
          subTrail="vs yesterday"
        />

        {/* 3. 30-Day Return */}
        {return30d ? (
          <StatCard
            label="30-Day Return"
            loading={loading}
            value={`${return30d.pct >= 0 ? '+' : ''}${return30d.pct.toFixed(1)}%`}
            subLine={`${return30d.pct >= 0 ? '↑' : '↓'} ${fmtDelta(return30d.amount, true)}`}
            subIsPositive={return30d.pct >= 0}
            subTrail={`Since ${since30Label}`}
          />
        ) : (
          <StatCard
            label="30-Day Change"
            loading={loading}
            value="—"
            subLine={null}
          />
        )}

        {/* 4. Stocks & Funds P&L */}
        {metrics.stockFundPnl.cost > 0 ? (
          <StatCard
            label="Stocks & Funds P&L"
            loading={loading}
            value={fmtDelta(metrics.stockFundPnl.amount, true)}
            subLine={`${metrics.stockFundPnl.pct >= 0 ? '↑' : '↓'} ${fmtPct(metrics.stockFundPnl.pct)}`}
            subIsPositive={metrics.stockFundPnl.pct >= 0}
            subTrail="vs buy price"
          />
        ) : (
          <StatCard
            label="Stocks & Funds P&L"
            loading={loading}
            value="—"
            subLine={null}
          />
        )}

        {/* 5. Holdings */}
        <StatCard
          label="Holdings"
          loading={loading}
          value={String(metrics.positionsCount)}
          subLine={`Across ${metrics.walletCount} wallet${metrics.walletCount !== 1 ? 's' : ''}`}
          subIsPositive={undefined}
        />
      </div>

      {/* ── Row 2: Chart (flex 2.1) + Holdings panel (flex 1.05) ── */}
      <div className="r1" style={{ display: 'flex', gap: 16 }}>
        <div className="card r1-chart-card" style={{ flex: 2.1, minWidth: 0, height: 380, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <PortfolioValueChart prices={prices} />
        </div>
        <div className="card r1-holdings-card" style={{ flex: 1.05, minWidth: 0, height: 380, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <HoldingsPanel
            perSymbol={metrics.perSymbol}
            prices={prices}
            loading={loading}
          />
        </div>
      </div>

      {/* ── Row 3: three equal cards ────────────────────────────── */}
      <div className="r3" style={{ display: 'flex', gap: 16 }}>
        <div className="card r3-wallet-card" style={{ flex: 1, minWidth: 0, height: 330, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <WalletWeightCard
            perWallet={metrics.perWallet}
            wallets={wallets}
            totalPositions={metrics.positionsCount}
          />
        </div>
        <div className="card r3-movers-card" style={{ flex: 1, minWidth: 0, height: 330, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <TopMoversCard movers={metrics.movers} />
        </div>
        <div className="card r3-health-card" style={{ flex: 1, minWidth: 0, height: 330, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <DataHealthCard prices={prices} onRefreshPrices={onRefreshPrices} />
        </div>
      </div>

      <style>{`
        @media (max-width: 1099px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; }
          .stats-grid > div:first-child { grid-column: 1 / -1 !important; }
          .stats-grid > div:first-child .stat-value { font-size: 26px !important; }
          .r1, .r3 { flex-direction: column !important; gap: 12px !important; }
          .r1 > *, .r3 > * { height: auto !important; }
          .r1-holdings-card { height: 380px !important; }
          .r3-wallet-card { height: 340px !important; }
        }
      `}</style>
    </div>
  );
}
