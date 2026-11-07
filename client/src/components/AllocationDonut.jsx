import React, { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useCurrency } from '../context/CurrencyContext';
import { PieChart as PieIcon } from 'lucide-react';

const ASSET_TYPE_COLORS = {
  crypto: '#6366F1',
  stock: '#10B981',
  mutual_fund: '#F59E0B',
  cash: '#94A3B8',
};
const ASSET_TYPE_LABELS = {
  crypto: 'Crypto',
  stock: 'Stocks',
  mutual_fund: 'Mutual Funds',
  cash: 'Cash',
};

function TooltipContent({ active, payload, fmt }) {
  if (!active || !payload?.length) return null;
  const { name, value, pct } = payload[0].payload;
  return (
    <div style={{
      background: 'var(--chart-tooltip-bg, #1a1a2e)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 8,
      padding: '8px 12px',
      fontSize: 12,
      color: '#fff',
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    }}>
      <div style={{ fontWeight: 600, marginBottom: 2 }}>{ASSET_TYPE_LABELS[name] ?? name}</div>
      <div>{fmt(value)}</div>
      <div style={{ color: '#9CA3AF' }}>{pct.toFixed(1)}% of portfolio</div>
    </div>
  );
}

function LegendRow({ name, value, pct, color, fmt, isActive, onHover }) {
  return (
    <div
      onMouseEnter={() => onHover(name)}
      onMouseLeave={() => onHover(null)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '3px 0',
        opacity: isActive ? 1 : 0.65,
        cursor: 'default',
        transition: 'opacity 0.15s',
      }}
    >
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <div style={{ flex: 1, fontSize: 11, color: 'var(--text-secondary)' }}>
        {ASSET_TYPE_LABELS[name] ?? name}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
        {fmt(value)}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', width: 38, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
        {pct.toFixed(1)}%
      </div>
    </div>
  );
}

export function AllocationDonut({ metrics }) {
  const { fmt } = useCurrency();
  const [hoveredType, setHoveredType] = useState(null);

  if (!metrics) return null;

  // Build breakdown from perSymbol
  const breakdown = { crypto: 0, stock: 0, mutual_fund: 0, cash: 0 };
  for (const s of metrics.perSymbol ?? []) {
    if (breakdown[s.assetType] !== undefined) {
      breakdown[s.assetType] += s.valueUsd;
    }
  }

  const total = metrics.totalValue || 1;
  const slices = Object.entries(breakdown)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value, pct: (value / total) * 100, color: ASSET_TYPE_COLORS[name] ?? '#6B7280' }))
    .sort((a, b) => b.value - a.value);

  if (!slices.length) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160, color: 'var(--text-muted)', fontSize: 13 }}>
        No allocation data
      </div>
    );
  }

  const activeIndex = hoveredType ? slices.findIndex((s) => s.name === hoveredType) : -1;

  // Top 5 individual holdings
  const topHoldings = (metrics.perSymbol || [])
    .filter((s) => s.weightPct > 0)
    .slice(0, 5);

  const topHoldingsTotalPct = topHoldings.reduce((sum, h) => sum + h.weightPct, 0);

  // Dominant vs buffer stats
  const dominant = slices[0] || null;
  const nonDominantPct = dominant ? Math.max(0, 100 - dominant.pct) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <PieIcon size={15} style={{ color: 'var(--accent, #6366F1)' }} />
          <h2 className="card-title" style={{ margin: 0 }}>Asset Allocation</h2>
        </div>
        <span className="chip chip-neutral" style={{ fontSize: 11 }}>
          {slices.length} Class{slices.length !== 1 ? 'es' : ''}
        </span>
      </div>

      {/* Donut and Legend Row */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Donut */}
        <div style={{ width: 130, height: 130, flexShrink: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={slices}
                cx="50%"
                cy="50%"
                innerRadius={38}
                outerRadius={58}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {slices.map((s, i) => (
                  <Cell
                    key={s.name}
                    fill={s.color}
                    opacity={activeIndex === -1 || activeIndex === i ? 1 : 0.4}
                    style={{ cursor: 'default', outline: 'none' }}
                  />
                ))}
              </Pie>
              <Tooltip content={<TooltipContent fmt={fmt} />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div style={{ flex: 1, minWidth: 150 }}>
          {slices.map((s) => (
            <LegendRow
              key={s.name}
              {...s}
              fmt={fmt}
              isActive={!hoveredType || hoveredType === s.name}
              onHover={setHoveredType}
            />
          ))}
        </div>
      </div>

      {/* ── Top Holdings Allocation ── */}
      {topHoldings.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            paddingTop: 8,
            borderTop: '1px solid var(--divider-2)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Top Holdings Allocation
            </span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              Top {topHoldings.length} = {topHoldingsTotalPct.toFixed(1)}% of portfolio
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {topHoldings.map((h, idx) => (
              <div key={h.symbol} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', background: 'var(--shell-bg)', padding: '1px 4px', borderRadius: 3 }}>
                      #{idx + 1}
                    </span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {h.symbol}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      {fmt(h.valueUsd)}
                    </span>
                  </div>
                  <span style={{ fontWeight: 600, color: 'var(--text-secondary)', flexShrink: 0 }}>
                    {h.weightPct.toFixed(1)}%
                  </span>
                </div>
                <div style={{ height: 4, background: 'var(--divider-2)', borderRadius: 2, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min(100, h.weightPct)}%`,
                      background: ASSET_TYPE_COLORS[h.assetType] || 'var(--accent, #6366F1)',
                      borderRadius: 2,
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Portfolio Balance Summary Footer ── */}
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
          <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Dominant Class</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {dominant ? `${ASSET_TYPE_LABELS[dominant.name] || dominant.name} (${dominant.pct.toFixed(0)}%)` : '—'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Other Assets</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 1 }}>
            {nonDominantPct.toFixed(1)}%
          </div>
        </div>
        <div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Positions Tracked</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent, #6366F1)', marginTop: 1 }}>
            {metrics.positionsCount || 0} Assets
          </div>
        </div>
      </div>
    </div>
  );
}
