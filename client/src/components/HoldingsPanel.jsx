import React from 'react';
import { Link } from 'react-router-dom';
import { useCurrency } from '../context/CurrencyContext';
import { getAssetColor, getAssetLetter, getAssetName } from '../utils/assetColors';

/** 3px progress bar showing weight */
function WeightBar({ pct }) {
  // width = weightPct * 2, min 2%, max 100%
  const barWidth = Math.min(100, Math.max(2, pct * 2));
  return (
    <span style={{ flex: 1, height: 3, background: 'var(--progress-track)', borderRadius: 2, display: 'inline-block', minWidth: 20 }}>
      <span style={{ display: 'block', width: `${barWidth}%`, height: 3, background: 'var(--progress-fill)', borderRadius: 2 }} />
    </span>
  );
}

/** Single holding row */
function HoldingRow({ row, prices }) {
  const { fmtPrice, fmtPct, currency } = useCurrency();
  const color = getAssetColor(row.symbol);
  const letter = getAssetLetter(row.symbol);
  const priceEntry = prices[row.symbol];
  const name = getAssetName(row.symbol, null, priceEntry);

  const ch24 = row.change24h;
  const isPos = ch24 > 0;
  const isNeg = ch24 < 0;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1.1fr) minmax(0, 0.8fr) minmax(0, 0.8fr)',
        alignItems: 'center',
        gap: 6,
        padding: '8px 0',
        borderBottom: '1px solid var(--divider-2)',
        overflow: 'hidden',
      }}
    >
      {/* Asset column */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', minWidth: 0 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 600,
            fontSize: 11,
            flexShrink: 0,
          }}
        >
          {letter}
        </div>
        <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 500,
              lineHeight: 1.25,
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={row.symbol}
          >
            {row.symbol}
          </div>
          <div
            style={{
              fontSize: 11,
              color: 'var(--text-muted)',
              fontWeight: 400,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={name}
          >
            {name}
          </div>
        </div>
      </div>

      {/* Price column */}
      <div style={{ textAlign: 'right', fontSize: 12, whiteSpace: 'nowrap', color: 'var(--text-primary)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {fmtPrice(row.price)}
      </div>

      {/* Weight column */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingLeft: 4, minWidth: 0, overflow: 'hidden' }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          {row.weightPct < 1 ? '<1%' : `${row.weightPct.toFixed(0)}%`}
        </span>
        <WeightBar pct={row.weightPct} />
      </div>

      {/* 24h chip column */}
      <div style={{ textAlign: 'right', minWidth: 0, overflow: 'hidden', flexShrink: 0 }}>
        {row.isFixed ? (
          <span className="chip chip-warning" style={{ fontSize: 11, padding: '2px 6px' }}>Fixed</span>
        ) : (
          <span className={`chip ${isPos ? 'chip-positive' : isNeg ? 'chip-negative' : 'chip-neutral'}`} style={{ fontSize: 11, padding: '2px 6px' }}>
            {isPos ? '+' : ''}{ch24.toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}

export function HoldingsPanel({ perSymbol = [], prices = {}, loading }) {
  const TOP_N = 16;
  const shown = perSymbol.slice(0, TOP_N);
  const total = perSymbol.length;

  if (loading) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="shimmer" style={{ height: 24, borderRadius: 6, width: '60%' }} />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="shimmer" style={{ height: 48, borderRadius: 8 }} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h2 className="card-title">
          Holdings{' '}
          <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)' }}>
            Top {Math.min(TOP_N, total)} of {total}
          </span>
        </h2>
        <Link
          to="/holdings"
          style={{
            fontSize: 12,
            color: 'var(--text-muted)',
            textDecoration: 'none',
            minHeight: 44,
            display: 'flex',
            alignItems: 'center',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
        >
          View all →
        </Link>
      </div>

      {/* Sticky header row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1.1fr) minmax(0, 0.8fr) minmax(0, 0.8fr)',
          gap: 6,
          padding: '0 0 8px',
          borderBottom: '1px solid var(--divider-1)',
          position: 'sticky',
          top: 0,
          background: 'var(--card-bg)',
          zIndex: 1,
        }}
      >
        {['Asset', 'Price', 'Weight', '24h'].map((h, i) => (
          <span
            key={h}
            style={{
              fontSize: 11,
              color: 'var(--text-muted)',
              textAlign: i === 1 || i === 3 ? 'right' : 'left',
              paddingLeft: i === 2 ? 4 : 0,
            }}
          >
            {h}
          </span>
        ))}
      </div>

      {/* Scrollable rows */}
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
        {total === 0 ? (
          <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            No holdings yet
          </div>
        ) : (
          shown.map((row) => (
            <HoldingRow key={row.symbol} row={row} prices={prices} />
          ))
        )}
      </div>
    </div>
  );
}
