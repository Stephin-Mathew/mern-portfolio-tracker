import React, { useState } from 'react';
import { useCurrency } from '../context/CurrencyContext';
import { TrendingUp, DollarSign, Layers, PieChart as PieIcon } from 'lucide-react';

const ASSET_COLORS = {
  crypto: '#6366F1',
  stock: '#10B981',
  mutual_fund: '#F59E0B',
  cash: '#94A3B8',
};

const ASSET_NAMES = {
  crypto: 'Crypto',
  stock: 'Stocks',
  mutual_fund: 'Mutual Funds',
  cash: 'Cash & Stable',
};

export function PnLContributionCard({ metrics }) {
  const { fmt, fmtDelta } = useCurrency();
  const [period, setPeriod] = useState('24h'); // '24h' | '7d'

  const breakdown = metrics?.assetClassBreakdown || {};

  const totalDeltaUsd = period === '24h' ? (metrics?.change24h?.amount || 0) : (metrics?.change7d?.amount || 0);
  const totalDeltaPct = period === '24h' ? (metrics?.change24h?.pct || 0) : (metrics?.change7d?.pct || 0);

  const assetList = ['crypto', 'stock', 'mutual_fund', 'cash']
    .map((type) => breakdown[type])
    .filter((a) => a && a.valueUsd > 0);

  // Best performing class by percentage
  const bestClass = [...assetList]
    .filter((a) => a.type !== 'cash')
    .sort((a, b) => (period === '24h' ? b.return24hPct - a.return24hPct : b.return7dPct - a.return7dPct))[0] || null;

  // Largest dollar contributor
  const largestDollarClass = [...assetList]
    .sort((a, b) => (period === '24h' ? b.pnl24hUsd - a.pnl24hUsd : b.pnl7dUsd - a.pnl7dUsd))[0] || null;

  // Calculate positive contribution shares for the segmented bar
  const positiveClasses = assetList.filter((a) => (period === '24h' ? a.pnl24hUsd : a.pnl7dUsd) > 0);
  const sumPosPnl = positiveClasses.reduce((sum, a) => sum + (period === '24h' ? a.pnl24hUsd : a.pnl7dUsd), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Header with 24h / 7d toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <DollarSign size={15} style={{ color: 'var(--accent, #6366F1)' }} />
          <h2 className="card-title" style={{ margin: 0 }}>Return &amp; P&amp;L Contribution</h2>
        </div>

        <div style={{ display: 'flex', background: 'var(--shell-bg)', borderRadius: 8, padding: 2, border: '1px solid var(--divider-2)' }}>
          <button
            onClick={() => setPeriod('24h')}
            style={{
              background: period === '24h' ? 'var(--card-bg)' : 'transparent',
              color: period === '24h' ? 'var(--text-primary)' : 'var(--text-muted)',
              border: 'none',
              borderRadius: 6,
              padding: '2px 8px',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            24 Hours
          </button>
          <button
            onClick={() => setPeriod('7d')}
            style={{
              background: period === '7d' ? 'var(--card-bg)' : 'transparent',
              color: period === '7d' ? 'var(--text-primary)' : 'var(--text-muted)',
              border: 'none',
              borderRadius: 6,
              padding: '2px 8px',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            7 Days
          </button>
        </div>
      </div>

      {/* Total period summary bar */}
      <div
        style={{
          background: 'var(--shell-bg)',
          borderRadius: 8,
          padding: '8px 12px',
          border: '1px solid var(--divider-2)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Net {period === '24h' ? '24h' : '7d'} Portfolio Impact</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: totalDeltaUsd >= 0 ? 'var(--positive)' : 'var(--negative)', marginTop: 1 }}>
            {fmtDelta(totalDeltaUsd)}
          </div>
        </div>
        <div className={`chip ${totalDeltaPct >= 0 ? 'chip-positive' : 'chip-negative'}`} style={{ fontSize: 11, padding: '3px 7px' }}>
          {totalDeltaPct >= 0 ? '+' : ''}{totalDeltaPct.toFixed(2)}%
        </div>
      </div>

      {/* ── Relative Gain Share Segmented Bar ── */}
      {sumPosPnl > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, background: 'var(--shell-bg)', padding: '6px 10px', borderRadius: 8, border: '1px solid var(--divider-2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)' }}>
            <span>Positive Gains Distribution</span>
            <span>{fmtDelta(sumPosPnl)} total</span>
          </div>
          <div style={{ height: 5, background: 'var(--divider-2)', borderRadius: 2, display: 'flex', overflow: 'hidden' }}>
            {positiveClasses.map((item) => {
              const pnl = period === '24h' ? item.pnl24hUsd : item.pnl7dUsd;
              const share = sumPosPnl > 0 ? (pnl / sumPosPnl) * 100 : 0;
              return (
                <div
                  key={item.type}
                  style={{ width: `${share}%`, background: ASSET_COLORS[item.type], transition: 'width 0.4s ease' }}
                  title={`${ASSET_NAMES[item.type]}: ${share.toFixed(1)}%`}
                />
              );
            })}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 9, color: 'var(--text-muted)' }}>
            {positiveClasses.map((item) => {
              const pnl = period === '24h' ? item.pnl24hUsd : item.pnl7dUsd;
              const share = sumPosPnl > 0 ? (pnl / sumPosPnl) * 100 : 0;
              return (
                <span key={item.type} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: ASSET_COLORS[item.type] }} />
                  {ASSET_NAMES[item.type]}: <strong>{share.toFixed(0)}%</strong>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Asset Class Contribution Rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 5 }}>
          <Layers size={12} />
          Asset Class Contribution
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {assetList.length === 0 ? (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '6px 0' }}>No assets tracked</div>
          ) : (
            assetList.map((item) => {
              const deltaUsd = period === '24h' ? item.pnl24hUsd : item.pnl7dUsd;
              const retPct = period === '24h' ? item.return24hPct : item.return7dPct;
              const col = ASSET_COLORS[item.type] || '#94A3B8';

              return (
                <div
                  key={item.type}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    borderRadius: 7,
                    background: 'var(--shell-bg)',
                    border: '1px solid var(--divider-2)',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 100 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: col, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {ASSET_NAMES[item.type] || item.type}
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>
                        {fmt(item.valueUsd)} ({item.weightPct.toFixed(1)}%)
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, textAlign: 'right' }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: deltaUsd >= 0 ? 'var(--positive)' : 'var(--negative)' }}>
                        {item.type === 'cash' ? '$0.00' : fmtDelta(deltaUsd)}
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>
                        {item.type === 'cash' ? 'Stable' : `${retPct >= 0 ? '+' : ''}${retPct.toFixed(2)}%`}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Performance Drivers Footer */}
      <div
        style={{
          paddingTop: 8,
          borderTop: '1px solid var(--divider-2)',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 6,
        }}
      >
        <div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Top Class %</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--positive)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {bestClass ? `${ASSET_NAMES[bestClass.type]} (+${(period === '24h' ? bestClass.return24hPct : bestClass.return7dPct).toFixed(1)}%)` : '—'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Top Dollar Driver</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: (largestDollarClass?.pnl24hUsd || 0) >= 0 ? 'var(--positive)' : 'var(--negative)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {largestDollarClass ? `${ASSET_NAMES[largestDollarClass.type]} (${fmtDelta(period === '24h' ? largestDollarClass.pnl24hUsd : largestDollarClass.pnl7dUsd)})` : '—'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Classes</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent, #6366F1)', marginTop: 1 }}>
            {assetList.length} Tracked
          </div>
        </div>
      </div>
    </div>
  );
}
