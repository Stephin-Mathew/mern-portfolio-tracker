import React, { useState } from 'react';
import { useCurrency } from '../context/CurrencyContext';
import { TrendingUp, TrendingDown, Activity, DollarSign, Percent } from 'lucide-react';

function MoverRow({ symbol, name, valueText, subText, isGainer, isMarketClosed }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '5px 0',
        borderBottom: '1px solid var(--divider-2)',
        gap: 6,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 500, lineHeight: 1.2, minWidth: 0, flex: 1 }}>
        <div style={{ color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{symbol}</div>
        <div style={{ fontSize: 9, fontWeight: 400, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0, gap: 1 }}>
        <span className={`chip ${isGainer ? 'chip-positive' : 'chip-negative'}`} style={{ fontSize: 10, padding: '2px 5px' }}>
          {valueText}
        </span>
        {subText && (
          <span style={{ fontSize: 8, color: 'var(--text-muted)', fontWeight: 400 }}>{subText}</span>
        )}
      </div>
    </div>
  );
}

export function TopMoversCard({ movers = {}, metrics = {} }) {
  const { fmtDelta } = useCurrency();
  const [metricMode, setMetricMode] = useState('pct'); // 'pct' | 'usd'

  const { gainers = [], losers = [] } = movers;
  const dollarMovers = metrics?.dollarMovers || {};

  // Check if any stock movers have their market closed
  const hasClosedStocks = [...gainers, ...losers].some((m) => m.isMarketClosed);

  // Market Breadth computation across non-cash portfolio holdings
  const nonCash = (metrics?.perSymbol || []).filter((s) => s.assetType !== 'cash');
  const advancing = nonCash.filter((s) => (s.change24h || 0) > 0);
  const declining = nonCash.filter((s) => (s.change24h || 0) < 0);
  const totalActive = advancing.length + declining.length;

  const advancePct = totalActive > 0 ? (advancing.length / totalActive) * 100 : 50;
  const declinePct = totalActive > 0 ? (declining.length / totalActive) * 100 : 50;

  // Average move
  const avgGainerChange = advancing.length > 0
    ? advancing.reduce((sum, s) => sum + (s.change24h || 0), 0) / advancing.length
    : 0;
  const avgLoserChange = declining.length > 0
    ? declining.reduce((sum, s) => sum + (s.change24h || 0), 0) / declining.length
    : 0;

  // Selected movers list based on mode (% vs $)
  const activeGainers = metricMode === 'pct'
    ? gainers.slice(0, 5).map((m) => ({
      symbol: m.symbol,
      name: m.name,
      valueText: `${m.change24h >= 0 ? '+' : ''}${m.change24h.toFixed(1)}%`,
      subText: m.isMarketClosed ? 'last session' : null,
      isGainer: true,
    }))
    : (dollarMovers.gainers24h || []).slice(0, 5).map((m) => ({
      symbol: m.symbol,
      name: m.name,
      valueText: `+${fmtDelta(m.pnl24hUsd).replace('+', '')}`,
      subText: `+${m.change24h?.toFixed(1)}%`,
      isGainer: true,
    }));

  const activeLosers = metricMode === 'pct'
    ? losers.slice(0, 5).map((m) => ({
      symbol: m.symbol,
      name: m.name,
      valueText: `${m.change24h.toFixed(1)}%`,
      subText: m.isMarketClosed ? 'last session' : null,
      isGainer: false,
    }))
    : (dollarMovers.losers24h || []).slice(0, 5).map((m) => ({
      symbol: m.symbol,
      name: m.name,
      valueText: fmtDelta(m.pnl24hUsd),
      subText: `${m.change24h?.toFixed(1)}%`,
      isGainer: false,
    }));

  // Extremes
  const topGainer = gainers[0];
  const deepestLoser = losers[0];
  const spread = (topGainer && deepestLoser) ? (topGainer.change24h - deepestLoser.change24h) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Header with % vs $ toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Activity size={15} style={{ color: 'var(--accent, #6366F1)' }} />
          <h2 className="card-title" style={{ margin: 0 }}>Top Movers</h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ display: 'flex', background: 'var(--shell-bg)', borderRadius: 8, padding: 2, border: '1px solid var(--divider-2)' }}>
            <button
              onClick={() => setMetricMode('pct')}
              style={{
                background: metricMode === 'pct' ? 'var(--card-bg)' : 'transparent',
                color: metricMode === 'pct' ? 'var(--text-primary)' : 'var(--text-muted)',
                border: 'none',
                borderRadius: 6,
                padding: '2px 7px',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                transition: 'all 0.15s ease',
              }}
            >
              <Percent size={10} /> % Return
            </button>
            <button
              onClick={() => setMetricMode('usd')}
              style={{
                background: metricMode === 'usd' ? 'var(--card-bg)' : 'transparent',
                color: metricMode === 'usd' ? 'var(--text-primary)' : 'var(--text-muted)',
                border: 'none',
                borderRadius: 6,
                padding: '2px 7px',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                transition: 'all 0.15s ease',
              }}
            >
              <DollarSign size={10} /> $ Impact
            </button>
          </div>

          <span className="chip chip-neutral" style={{ fontSize: 10, padding: '2px 6px' }}>
            {hasClosedStocks ? 'Last Session' : 'Today'}
          </span>
        </div>
      </div>

      {/* ── Market Breadth & Sentiment Indicator ── */}
      {nonCash.length > 0 && (
        <div
          style={{
            background: 'var(--shell-bg)',
            borderRadius: 8,
            padding: '7px 12px',
            border: '1px solid var(--divider-2)',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
            <span style={{ color: 'var(--positive)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
              <TrendingUp size={11} /> {advancing.length} Advancing ({advancePct.toFixed(0)}%)
            </span>
            <span style={{ color: 'var(--negative)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
              <TrendingDown size={11} /> {declining.length} Declining ({declinePct.toFixed(0)}%)
            </span>
          </div>

          <div style={{ height: 4, background: 'var(--divider-2)', borderRadius: 2, display: 'flex', overflow: 'hidden' }}>
            <div style={{ width: `${advancePct}%`, background: 'var(--positive)', transition: 'width 0.4s ease' }} />
            <div style={{ width: `${declinePct}%`, background: 'var(--negative)', transition: 'width 0.4s ease' }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)' }}>
            <span>Avg Gainer: <strong style={{ color: 'var(--positive)' }}>+{avgGainerChange.toFixed(1)}%</strong></span>
            <span>Avg Loser: <strong style={{ color: 'var(--negative)' }}>{avgLoserChange.toFixed(1)}%</strong></span>
          </div>
        </div>
      )}

      {/* ── Two-column grid for Gainers & Losers ── */}
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
          {/* Gainers caption */}
          <div className="text-caption" style={{ color: 'var(--positive)', paddingBottom: 3, fontWeight: 600 }}>
            {metricMode === 'pct' ? 'Top Gainers (%)' : 'Top Money Makers ($)'}
          </div>
          {/* Losers caption */}
          <div className="text-caption" style={{ color: 'var(--negative)', paddingBottom: 3, fontWeight: 600 }}>
            {metricMode === 'pct' ? 'Top Losers (%)' : 'Top Money Drags ($)'}
          </div>

          {/* Gainers column */}
          <div>
            {activeGainers.length === 0 ? (
              <div style={{ padding: '8px 0', fontSize: 11, color: 'var(--text-muted)' }}>No gainers</div>
            ) : (
              activeGainers.map((m) => (
                <MoverRow
                  key={m.symbol}
                  symbol={m.symbol}
                  name={m.name}
                  valueText={m.valueText}
                  subText={m.subText}
                  isGainer
                />
              ))
            )}
          </div>

          {/* Losers column */}
          <div>
            {activeLosers.length === 0 ? (
              <div style={{ padding: '8px 0', fontSize: 11, color: 'var(--text-muted)' }}>No losers</div>
            ) : (
              activeLosers.map((m) => (
                <MoverRow
                  key={m.symbol}
                  symbol={m.symbol}
                  name={m.name}
                  valueText={m.valueText}
                  subText={m.subText}
                  isGainer={false}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Session Extremes & Highlights Footer ── */}
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
          <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Top Performer</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--positive)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {topGainer ? `${topGainer.symbol} (+${topGainer.change24h.toFixed(1)}%)` : '—'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Deepest Drag</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--negative)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {deepestLoser ? `${deepestLoser.symbol} (${deepestLoser.change24h.toFixed(1)}%)` : '—'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Session Spread</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 1 }}>
            {spread !== null ? `${spread.toFixed(1)}%` : '—'}
          </div>
        </div>
      </div>
    </div>
  );
}
