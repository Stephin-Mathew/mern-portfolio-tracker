import React, { useState, useMemo } from 'react';
import { useCurrency } from '../context/CurrencyContext';
import { getAssetColor } from '../utils/assetColors';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

// NOTE: Unrealised P&L is omitted because holdings like crypto airdrops do not have an actual buy price/cost basis.
// Performance is tracked via 24h & 7d market price changes.

const TYPE_LABEL = {
  crypto:      'Crypto',
  stock:       'Stock',
  mutual_fund: 'Fund',
  cash:        'Cash',
};
const TYPE_COLOR = {
  crypto:      { bg: 'rgba(99,102,241,0.12)',  text: '#818CF8' },
  stock:       { bg: 'rgba(16,185,129,0.12)',  text: '#34D399' },
  mutual_fund: { bg: 'rgba(245,158,11,0.12)',  text: '#FBBF24' },
  cash:        { bg: 'rgba(148,163,184,0.12)', text: '#94A3B8' },
};

function SortIcon({ col, sortCol, sortDir }) {
  if (col !== sortCol) return <ChevronsUpDown size={12} style={{ opacity: 0.3, marginLeft: 2 }} />;
  return sortDir === 'desc'
    ? <ChevronDown size={12} style={{ marginLeft: 2 }} />
    : <ChevronUp   size={12} style={{ marginLeft: 2 }} />;
}

function ChangeCell({ value, pct }) {
  if (value === null || value === undefined) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
  const col = value >= 0 ? 'var(--positive)' : 'var(--negative)';
  return (
    <span style={{ color: col, fontVariantNumeric: 'tabular-nums' }}>
      {value >= 0 ? '+' : ''}{(pct ?? 0).toFixed(2)}%
    </span>
  );
}

export function HoldingsPerformanceTable({ metrics, prices = {} }) {
  const { fmt } = useCurrency();
  const [sortCol, setSortCol] = useState('valueUsd');
  const [sortDir, setSortDir] = useState('desc');
  const [filterType, setFilterType] = useState('all');

  if (!metrics?.perSymbol?.length) {
    return (
      <div>
        <h2 className="card-title" style={{ marginBottom: 12 }}>Holdings Performance</h2>
        <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '24px 0', textAlign: 'center' }}>
          No holdings data
        </div>
      </div>
    );
  }

  const perSymbol = metrics.perSymbol;
  const totalValue = metrics.totalValue || 1;

  const handleSort = (col) => {
    if (sortCol === col) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    else { setSortCol(col); setSortDir('desc'); }
  };

  const rows = useMemo(() => {
    const filtered = filterType === 'all'
      ? perSymbol
      : perSymbol.filter((s) => s.assetType === filterType);

    return [...filtered].sort((a, b) => {
      let va = a[sortCol] ?? 0;
      let vb = b[sortCol] ?? 0;
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortDir === 'desc' ? 1 : -1;
      if (va > vb) return sortDir === 'desc' ? -1 : 1;
      return 0;
    });
  }, [perSymbol, sortCol, sortDir, filterType]);

  const types = [...new Set(perSymbol.map((s) => s.assetType))];

  const thStyle = {
    padding: '8px 10px',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-muted)',
    textAlign: 'left',
    letterSpacing: '0.03em',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    userSelect: 'none',
    borderBottom: '1px solid var(--divider-2)',
  };
  const tdStyle = {
    padding: '9px 10px',
    fontSize: 12,
    color: 'var(--text-secondary)',
    borderBottom: '1px solid var(--divider-2)',
    whiteSpace: 'nowrap',
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <h2 className="card-title">Holdings Performance</h2>
        {/* Type filter tabs */}
        <div className="seg seg-sm" role="group" style={{ padding: 2 }}>
          {['all', ...types].map((t) => (
            <button
              key={t}
              className={`seg-btn${filterType === t ? ' active' : ''}`}
              onClick={() => setFilterType(t)}
              style={{ fontSize: 11, padding: '0 8px', minHeight: 26, textTransform: 'capitalize' }}
            >
              {t === 'all' ? 'All' : TYPE_LABEL[t] ?? t}
            </button>
          ))}
        </div>
      </div>

      <div style={{ overflowX: 'auto', borderRadius: 8 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {[
                { col: 'symbol',    label: 'Asset' },
                { col: 'assetType', label: 'Type' },
                { col: 'price',     label: 'Price' },
                { col: 'change24h', label: '24h %' },
                { col: 'change7d',  label: '7d %' },
                { col: 'valueUsd',  label: 'Value' },
                { col: 'weightPct', label: 'Weight' },
              ].map(({ col, label }) => (
                <th key={col} style={thStyle} onClick={() => handleSort(col)}>
                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                    {label}
                    <SortIcon col={col} sortCol={sortCol} sortDir={sortDir} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => {
              const color = getAssetColor(s.symbol);
              const typeStyle = TYPE_COLOR[s.assetType] ?? { bg: 'rgba(100,100,100,0.1)', text: 'var(--text-muted)' };

              return (
                <tr key={s.symbol} style={{ transition: 'background 0.1s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--row-hover, rgba(255,255,255,0.03))'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}
                >
                  {/* Asset */}
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 6,
                        background: color, color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700, flexShrink: 0,
                      }}>
                        {s.symbol.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 12 }}>{s.symbol}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {s.name && s.name !== s.symbol ? s.name : ''}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Type badge */}
                  <td style={tdStyle}>
                    <span style={{
                      background: typeStyle.bg,
                      color: typeStyle.text,
                      borderRadius: 4,
                      padding: '2px 7px',
                      fontSize: 10,
                      fontWeight: 600,
                    }}>
                      {TYPE_LABEL[s.assetType] ?? s.assetType}
                    </span>
                  </td>

                  {/* Price */}
                  <td style={{ ...tdStyle, fontVariantNumeric: 'tabular-nums' }}>
                    {s.price > 0 ? `$${s.price < 0.01 ? s.price.toFixed(6) : s.price < 1 ? s.price.toFixed(4) : s.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                  </td>

                  {/* 24h % */}
                  <td style={tdStyle}>
                    <ChangeCell value={s.change24h} pct={s.change24h} />
                  </td>

                  {/* 7d % */}
                  <td style={tdStyle}>
                    <ChangeCell value={s.change7d} pct={s.change7d} />
                  </td>

                  {/* Value */}
                  <td style={{ ...tdStyle, fontWeight: 500, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(s.valueUsd)}
                  </td>

                  {/* Weight */}
                  <td style={{ ...tdStyle, minWidth: 80 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ flex: 1, height: 4, background: 'var(--divider-2)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(100, s.weightPct)}%`, height: '100%', background: color, borderRadius: 2 }} />
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 34, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {s.weightPct.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

