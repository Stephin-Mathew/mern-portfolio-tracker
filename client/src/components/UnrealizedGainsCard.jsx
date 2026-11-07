import React, { useState } from 'react';
import { useCurrency } from '../context/CurrencyContext';
import { TrendingUp, TrendingDown, Target, CheckCircle2, XCircle, ChevronDown, ChevronUp } from 'lucide-react';

export function UnrealizedGainsCard({ metrics }) {
  const { fmt, fmtDelta } = useCurrency();
  const [showAll, setShowAll] = useState(false);

  const analysis = metrics?.unrealizedAnalysis || {};
  const {
    hasData,
    totalCostUsd = 0,
    totalValueUsd = 0,
    netPnlUsd = 0,
    roiPct = 0,
    profitableCount = 0,
    lossCount = 0,
    totalCount = 0,
    bestRoi = null,
    bestDollar = null,
    worstDollar = null,
    positions = [],
  } = analysis;

  if (!hasData || totalCount === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Target size={16} style={{ color: 'var(--accent, #6366F1)' }} />
          <h2 className="card-title" style={{ margin: 0 }}>Unrealized Capital Gains</h2>
        </div>
        <div style={{
          padding: '28px 16px',
          textAlign: 'center',
          background: 'var(--shell-bg)',
          borderRadius: 10,
          border: '1px solid var(--divider-2)',
          color: 'var(--text-muted)',
          fontSize: 12,
          lineHeight: 1.6,
        }}>
          No buy prices recorded yet. Add buy prices to your stocks, funds, or crypto to unlock unrealized profit, ROI tracking, and cost basis analytics.
        </div>
      </div>
    );
  }

  const isNetPositive = netPnlUsd >= 0;
  const winRatePct = totalCount > 0 ? (profitableCount / totalCount) * 100 : 0;
  const lossRatePct = totalCount > 0 ? (lossCount / totalCount) * 100 : 0;

  const displayedPositions = showAll ? positions : positions.slice(0, 4);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 14 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Target size={16} style={{ color: isNetPositive ? 'var(--positive)' : 'var(--negative)' }} />
          <h2 className="card-title" style={{ margin: 0 }}>Unrealized Capital Gains</h2>
        </div>
        <span className="chip chip-neutral" style={{ fontSize: 11 }}>
          {totalCount} Position{totalCount !== 1 ? 's' : ''} Tracked
        </span>
      </div>

      {/* Main Net Gain & Cost vs Value Hero */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {/* Net Unrealized P&L */}
        <div
          style={{
            background: isNetPositive ? 'rgba(61, 214, 140, 0.08)' : 'rgba(255, 107, 115, 0.08)',
            borderRadius: 10,
            padding: '10px 12px',
            border: `1px solid ${isNetPositive ? 'rgba(61, 214, 140, 0.25)' : 'rgba(255, 107, 115, 0.25)'}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10, color: isNetPositive ? 'var(--positive)' : 'var(--negative)', fontWeight: 600, textTransform: 'uppercase' }}>
              Net Unrealized P&amp;L
            </span>
            {isNetPositive ? <TrendingUp size={13} style={{ color: 'var(--positive)' }} /> : <TrendingDown size={13} style={{ color: 'var(--negative)' }} />}
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: isNetPositive ? 'var(--positive)' : 'var(--negative)', letterSpacing: '-0.3px' }}>
            {fmtDelta(netPnlUsd)}
          </div>
          <div style={{ fontSize: 10, color: isNetPositive ? 'var(--positive)' : 'var(--negative)' }}>
            {roiPct >= 0 ? '+' : ''}{roiPct.toFixed(2)}% Overall ROI
          </div>
        </div>

        {/* Invested Cost vs Current Value */}
        <div
          style={{
            background: 'var(--shell-bg)',
            borderRadius: 10,
            padding: '10px 12px',
            border: '1px solid var(--divider-2)',
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
          }}
        >
          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Cost Basis vs Value
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
            {fmt(totalValueUsd)}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            Invested: <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{fmt(totalCostUsd)}</span>
          </div>
        </div>
      </div>

      {/* Win / Loss Position Bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--positive)' }}>
            <CheckCircle2 size={12} /> {profitableCount} Profitable ({winRatePct.toFixed(0)}%)
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: lossCount > 0 ? 'var(--negative)' : 'var(--text-muted)' }}>
            <XCircle size={12} /> {lossCount} In Loss ({lossRatePct.toFixed(0)}%)
          </div>
        </div>

        <div style={{ height: 6, background: 'var(--divider-2)', borderRadius: 3, display: 'flex', overflow: 'hidden' }}>
          <div style={{ width: `${winRatePct}%`, background: 'var(--positive)', transition: 'width 0.4s ease' }} />
          <div style={{ width: `${lossRatePct}%`, background: 'var(--negative)', transition: 'width 0.4s ease' }} />
        </div>
      </div>

      {/* Key Outliers: Best ROI vs Top $ Gain vs Biggest Drag */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 8,
          paddingTop: 4,
          borderTop: '1px solid var(--divider-2)',
        }}
      >
        {bestRoi && (
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Top ROI %</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {bestRoi.symbol}
            </div>
            <div style={{ fontSize: 10, color: 'var(--positive)', fontWeight: 600 }}>
              +{bestRoi.roiPct.toFixed(1)}% ({fmtDelta(bestRoi.unrealizedPnlUsd)})
            </div>
          </div>
        )}

        {bestDollar && bestDollar.unrealizedPnlUsd > 0 && (
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Top $ Profit</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {bestDollar.symbol}
            </div>
            <div style={{ fontSize: 10, color: 'var(--positive)', fontWeight: 600 }}>
              +{fmtDelta(bestDollar.unrealizedPnlUsd)}
            </div>
          </div>
        )}

        {worstDollar ? (
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Largest Drag</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {worstDollar.symbol}
            </div>
            <div style={{ fontSize: 10, color: 'var(--negative)', fontWeight: 600 }}>
              {fmtDelta(worstDollar.unrealizedPnlUsd)} ({worstDollar.roiPct.toFixed(1)}%)
            </div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Loss Drag</div>
            <div style={{ fontSize: 11, color: 'var(--positive)', fontWeight: 500, marginTop: 2 }}>
              Zero losing positions
            </div>
          </div>
        )}
      </div>

      {/* Positions Breakdown Table / List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 2 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Cost Basis Positions
          </span>
          {positions.length > 3 && (
            <button
              onClick={() => setShowAll((s) => !s)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--accent, #6366F1)',
                fontSize: 10,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                padding: 0,
              }}
            >
              {showAll ? 'Show Top 3' : `View All (${positions.length})`}
              {showAll ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </button>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 125, overflowY: 'auto', scrollbarWidth: 'thin' }}>
          {displayedPositions.map((pos) => {
            const isPos = pos.unrealizedPnlUsd >= 0;
            return (
              <div
                key={pos.symbol}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '5px 8px',
                  borderRadius: 6,
                  background: 'var(--shell-bg)',
                  border: '1px solid var(--divider-2)',
                  fontSize: 11,
                }}
              >
                <div style={{ minWidth: 0, flex: 1, marginRight: 8 }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {pos.symbol}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Cost: {fmt(pos.costUsd)} • Val: {fmt(pos.valueUsd)}
                  </div>
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontWeight: 600, color: isPos ? 'var(--positive)' : 'var(--negative)', fontSize: 11 }}>
                    {fmtDelta(pos.unrealizedPnlUsd)}
                  </div>
                  <div style={{ fontSize: 9, color: isPos ? 'var(--positive)' : 'var(--negative)' }}>
                    {pos.roiPct >= 0 ? '+' : ''}{pos.roiPct.toFixed(1)}% ROI
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

