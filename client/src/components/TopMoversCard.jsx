import React from 'react';
import { getAssetName } from '../utils/assetColors';

function MoverRow({ symbol, name, change24h, isGainer }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 0',
        borderBottom: '1px solid var(--divider-2)',
        gap: 6,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.2, minWidth: 0, flex: 1 }}>
        <div style={{ color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{symbol}</div>
        <div style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
      </div>
      <span className={`chip ${isGainer ? 'chip-positive' : 'chip-negative'}`} style={{ flexShrink: 0, fontSize: 11, padding: '2px 6px' }}>
        {change24h >= 0 ? '+' : ''}{change24h.toFixed(1)}%
      </span>
    </div>
  );
}

export function TopMoversCard({ movers = {} }) {
  const { gainers = [], losers = [] } = movers;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexShrink: 0 }}>
        <h2 className="card-title">Top Movers</h2>
        <span className="chip chip-neutral">Today</span>
      </div>

      {/* Two-column scrollable grid */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          scrollbarWidth: 'thin',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
          {/* Gainers caption */}
          <div className="text-caption" style={{ color: 'var(--positive)', paddingBottom: 4, position: 'sticky', top: 0, background: 'var(--card-bg)', zIndex: 1 }}>
            Gainers
          </div>
          {/* Losers caption */}
          <div className="text-caption" style={{ color: 'var(--negative)', paddingBottom: 4, position: 'sticky', top: 0, background: 'var(--card-bg)', zIndex: 1 }}>
            Losers
          </div>

          {/* Gainers column */}
          <div>
            {gainers.length === 0 ? (
              <div style={{ padding: '12px 0', fontSize: 12, color: 'var(--text-muted)' }}>No gainers today</div>
            ) : (
              gainers.map((m) => (
                <MoverRow
                  key={m.symbol}
                  symbol={m.symbol}
                  name={m.name}
                  change24h={m.change24h}
                  isGainer
                />
              ))
            )}
          </div>

          {/* Losers column */}
          <div>
            {losers.length === 0 ? (
              <div style={{ padding: '12px 0', fontSize: 12, color: 'var(--text-muted)' }}>No losers today</div>
            ) : (
              losers.map((m) => (
                <MoverRow
                  key={m.symbol}
                  symbol={m.symbol}
                  name={m.name}
                  change24h={m.change24h}
                  isGainer={false}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
