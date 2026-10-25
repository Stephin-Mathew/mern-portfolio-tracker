import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Trash2 } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';
import { useTheme } from '../context/ThemeContext';
import { computePortfolio } from '../utils/portfolioMetrics';
import { useWallets } from '../context/WalletContext';
import { PortfolioValueChart } from '../components/PortfolioValueChart';
import api from '../api/axiosInstance';

export const AnalyticsPage = ({ holdings = [], prices = {} }) => {
  const { wallets } = useWallets();
  const { fmt } = useCurrency();
  const [refreshKey, setRefreshKey] = useState(0);
  const [clearing, setClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const metrics = computePortfolio(holdings, prices, wallets);

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

  return (
    <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              color: 'var(--text-muted)',
              textDecoration: 'none',
              marginBottom: 6,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            <ArrowLeft size={13} />
            Overview
          </Link>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 500, color: 'var(--text-primary)' }}>Analytics</h1>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
            Historical portfolio valuation and performance metrics
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 10,
              border: '1px solid var(--card-border)',
              background: 'var(--shell-bg)',
              color: 'var(--text-secondary)',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <RefreshCw size={13} />
            Refresh
          </button>

          <button
            onClick={handleClearHistory}
            disabled={clearing}
            title={confirmClear ? 'Click again to confirm deletion' : 'Reset all portfolio history'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 10,
              border: `1px solid ${confirmClear ? 'var(--negative-bg)' : 'var(--card-border)'}`,
              background: confirmClear ? 'var(--negative-bg)' : 'var(--shell-bg)',
              color: confirmClear ? 'var(--negative)' : 'var(--text-secondary)',
              fontSize: 12,
              fontWeight: 500,
              cursor: clearing ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              opacity: clearing ? 0.6 : 1,
            }}
          >
            <Trash2 size={13} style={{ animation: clearing ? 'spin 1s linear infinite' : 'none' }} />
            {confirmClear ? 'Confirm reset?' : 'Reset history'}
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {[
          { label: 'Total Value', value: fmt(metrics.totalValue) },
          { label: "Today's Change", value: `${metrics.change24h.pct >= 0 ? '+' : ''}${metrics.change24h.pct.toFixed(2)}%` },
          { label: 'Positions', value: String(metrics.positionsCount) },
        ].map(({ label, value }) => (
          <div key={label} className="card" style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 500, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="card" style={{ height: 460, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <PortfolioValueChart prices={prices} refreshKey={refreshKey} />
      </div>

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
};
