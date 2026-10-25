import React from 'react';
import { Link } from 'react-router-dom';
import { useCurrency } from '../context/CurrencyContext';
import { getWalletColor, WALLET_PALETTE } from '../utils/assetColors';

export function WalletWeightCard({ perWallet = [], wallets = [], totalPositions = 0 }) {
  const { fmt } = useCurrency();

  if (perWallet.length === 0) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="card-title">Wallet Weight</h2>
          <span className="chip chip-neutral">0 wallets</span>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          No wallets yet
        </div>
      </div>
    );
  }

  const largest = perWallet[0];
  const largestWallet = largest?.wallet;
  const largestPct = largest?.pct || 0;
  const largestHoldings = largest?.holdingsCount || 0;
  const hasMoreHoldings = largestHoldings === Math.max(...perWallet.map(w => w.holdingsCount));

  // Resolve colors
  const walletColors = wallets.reduce((acc, w) => {
    acc[w._id] = getWalletColor(w, wallets);
    return acc;
  }, {});

  // Stacked bar aria-label
  const barAriaLabel = perWallet
    .map(w => `${w.wallet?.name} ${w.pct.toFixed(0)}%`)
    .join(', ');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexShrink: 0 }}>
        <h2 className="card-title">Wallet Weight</h2>
        <span className="chip chip-neutral">{wallets.length} wallets</span>
      </div>

      {/* Hero: largest wallet % */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, margin: '0 0 2px', flexShrink: 0 }}>
        <span style={{ fontSize: 30, fontWeight: 500, letterSpacing: '-0.6px', color: 'var(--text-primary)' }}>
          {largestPct.toFixed(0)}%
        </span>
        <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>
          is in {largestWallet?.name || '—'}
        </span>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, flexShrink: 0 }}>
        {hasMoreHoldings
          ? `Your largest wallet, with the most holdings (${largestHoldings} of ${totalPositions})`
          : `Your largest wallet (${largestHoldings} of ${totalPositions} holdings)`}
      </div>

      {/* Stacked bar */}
      <div
        role="img"
        aria-label={`Wallet weights: ${barAriaLabel}`}
        style={{ display: 'flex', gap: 3, height: 14, marginBottom: 6, flexShrink: 0 }}
      >
        {perWallet.map((w) => {
          const color = walletColors[w.wallet?._id] || '#94A3B8';
          return (
            <div
              key={w.wallet?._id}
              style={{
                flex: Math.max(w.pct, 0.5),
                background: color,
                borderRadius: 3,
                minWidth: 2,
              }}
              title={`${w.wallet?.name}: ${w.pct.toFixed(1)}%`}
            />
          );
        })}
      </div>

      {/* Scrollable list */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          scrollbarWidth: 'thin',
          paddingRight: 6,
          marginRight: -6,
        }}
      >
        {perWallet.map((w, idx) => {
          const color = walletColors[w.wallet?._id] || '#94A3B8';
          const isLargest = idx === 0;
          return (
            <Link
              key={w.wallet?._id}
              to={`/wallets/${w.wallet?._id}`}
              style={{ textDecoration: 'none', display: 'block', padding: '12px 0', borderBottom: '1px solid var(--divider-2)' }}
            >
              {/* Name row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14, gap: 8 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, overflow: 'hidden' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  <span style={{ fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{w.wallet?.name}</span>
                  {isLargest && <span className="chip chip-positive" style={{ padding: '2px 6px', fontSize: 11, flexShrink: 0 }}>Largest</span>}
                </span>
                <span style={{ fontWeight: 500, color: 'var(--text-primary)', flexShrink: 0 }}>{w.pct.toFixed(0)}%</span>
              </div>

              {/* Sub row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 8px 20px' }}>
                <span>{w.holdingsCount} holding{w.holdingsCount !== 1 ? 's' : ''}</span>
                <span>{fmt(w.valueUsd)}</span>
              </div>

              {/* Progress bar */}
              <div style={{ height: 6, background: 'var(--wallet-track, #EEEFF2)', borderRadius: 3, overflow: 'hidden', marginLeft: 20 }}>
                <div style={{ width: `${Math.min(100, w.pct)}%`, height: 6, borderRadius: 3, background: color, transition: 'width 0.5s' }} />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
