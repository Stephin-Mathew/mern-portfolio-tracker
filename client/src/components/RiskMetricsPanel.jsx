import React, { useMemo } from 'react';
import { useCurrency } from '../context/CurrencyContext';
import { TrendingUp, TrendingDown, AlertTriangle, PieChart, Shield, ShieldAlert, CheckCircle2, Activity } from 'lucide-react';

/**
 * Compute risk / concentration metrics from perSymbol array.
 */
export function computeRiskMetrics(perSymbol = [], totalValue = 0) {
  if (!perSymbol.length || totalValue <= 0) return null;

  // Herfindahl-Hirschman Index (0–1). Lower = more diversified.
  const hhi = perSymbol.reduce((sum, s) => {
    const w = s.valueUsd / totalValue;
    return sum + w * w;
  }, 0);
  const diversificationScore = Math.round((1 - hhi) * 100);

  // Largest position
  const largest = perSymbol[0];
  const largestPct = largest ? (largest.valueUsd / totalValue) * 100 : 0;

  // Top 3 concentration
  const top3Pct = perSymbol.slice(0, 3).reduce((sum, s) => sum + (s.valueUsd / totalValue) * 100, 0);

  // Top 5 concentration
  const top5Pct = perSymbol.slice(0, 5).reduce((sum, s) => sum + (s.valueUsd / totalValue) * 100, 0);

  const top2to5Pct = Math.max(0, top5Pct - largestPct);
  const remainingPct = Math.max(0, 100 - top5Pct);

  // Per-asset-type exposure
  const byType = { crypto: 0, stock: 0, mutual_fund: 0, cash: 0 };
  for (const s of perSymbol) {
    if (byType[s.assetType] !== undefined) byType[s.assetType] += s.valueUsd;
  }

  const cryptoPct = (byType.crypto / totalValue) * 100;
  const equityPct = ((byType.stock + byType.mutual_fund) / totalValue) * 100;
  const stablePct = (byType.cash / totalValue) * 100;

  // Volatility buckets
  const highVolCount = perSymbol.filter((s) => Math.abs(s.change24h ?? 0) > 5).length;
  const modVolCount = perSymbol.filter((s) => Math.abs(s.change24h ?? 0) >= 2 && Math.abs(s.change24h ?? 0) <= 5).length;
  const lowVolCount = perSymbol.filter((s) => Math.abs(s.change24h ?? 0) < 2).length;

  // Advisory alert
  let alertSeverity = 'info';
  let alertMessage = 'Portfolio is broadly distributed.';

  if (largestPct > 60) {
    alertSeverity = 'warning';
    alertMessage = `High Concentration: ${largest?.symbol || 'Top asset'} accounts for ${largestPct.toFixed(1)}% of total portfolio value. Daily portfolio swings are driven almost entirely by this single asset.`;
  } else if (top3Pct > 80) {
    alertSeverity = 'warning';
    alertMessage = `Top 3 assets control ${top3Pct.toFixed(1)}% of your portfolio capital. High correlation risk.`;
  } else if (cryptoPct > 85) {
    alertSeverity = 'info';
    alertMessage = `Growth & High Beta: ${cryptoPct.toFixed(1)}% of portfolio is in crypto assets.`;
  } else {
    alertSeverity = 'positive';
    alertMessage = `Well-diversified position distribution across ${perSymbol.length} holdings.`;
  }

  return {
    diversificationScore,
    hhi,
    largest: largest ? { symbol: largest.symbol, pct: largestPct } : null,
    largestPct,
    top2to5Pct,
    remainingPct,
    top3Pct,
    top5Pct,
    cryptoPct,
    equityPct,
    stablePct,
    highVolCount,
    modVolCount,
    lowVolCount,
    positionCount: perSymbol.length,
    alertSeverity,
    alertMessage,
  };
}

function ScoreBar({ value, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: 'var(--divider-2)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(100, value)}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.4s ease' }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color, minWidth: 36, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

function MetricRow({ label, value, sub, icon, color }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '5px 0',
      borderBottom: '1px solid var(--divider-2)',
      gap: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        {icon && <span style={{ color: color ?? 'var(--text-muted)', flexShrink: 0 }}>{icon}</span>}
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{label}</div>
          {sub && <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{sub}</div>}
        </div>
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: color ?? 'var(--text-primary)', flexShrink: 0 }}>
        {value}
      </div>
    </div>
  );
}

export function RiskMetricsPanel({ metrics }) {
  const risk = useMemo(() => computeRiskMetrics(metrics?.perSymbol, metrics?.totalValue), [metrics]);

  if (!risk) {
    return (
      <div>
        <h2 className="card-title" style={{ marginBottom: 10 }}>Risk &amp; Concentration</h2>
        <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '24px 0', textAlign: 'center' }}>No data</div>
      </div>
    );
  }

  // Colour the diversification score
  const scoreColor = risk.diversificationScore >= 70
    ? 'var(--positive)'
    : risk.diversificationScore >= 40
      ? '#F59E0B'
      : 'var(--negative)';

  const scoreLabel = risk.diversificationScore >= 70 ? 'Well diversified'
    : risk.diversificationScore >= 40 ? 'Moderately concentrated'
      : 'Highly concentrated';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Shield size={15} style={{ color: scoreColor }} />
          <h2 className="card-title" style={{ margin: 0 }}>Risk &amp; Concentration</h2>
        </div>
        <span className="chip chip-neutral" style={{ fontSize: 10, padding: '2px 6px', color: scoreColor }}>
          Score: {risk.diversificationScore}/100
        </span>
      </div>

      {/* Diversification score bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 5 }}>
          <span style={{ color: 'var(--text-secondary)' }}>Diversification Score</span>
          <span style={{ color: scoreColor, fontWeight: 600 }}>{scoreLabel}</span>
        </div>
        <ScoreBar value={risk.diversificationScore} color={scoreColor} />
      </div>

      {/* ── Concentration Spectrum Bar (Top 1 vs Top 2-5 vs Rest) ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, background: 'var(--shell-bg)', padding: '7px 10px', borderRadius: 8, border: '1px solid var(--divider-2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)' }}>
          <span>Concentration Distribution</span>
          <span>{risk.positionCount} Assets Total</span>
        </div>
        <div style={{ height: 6, background: 'var(--divider-2)', borderRadius: 3, display: 'flex', overflow: 'hidden' }}>
          <div style={{ width: `${risk.largestPct}%`, background: '#6366F1', transition: 'width 0.4s ease' }} title={`Top 1: ${risk.largestPct.toFixed(1)}%`} />
          <div style={{ width: `${risk.top2to5Pct}%`, background: '#F59E0B', transition: 'width 0.4s ease' }} title={`Top 2-5: ${risk.top2to5Pct.toFixed(1)}%`} />
          <div style={{ width: `${risk.remainingPct}%`, background: '#10B981', transition: 'width 0.4s ease' }} title={`Rest: ${risk.remainingPct.toFixed(1)}%`} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text-muted)' }}>
          <span style={{ color: 'var(--text-primary)' }}>Top 1 ({risk.largest?.symbol}): <strong>{risk.largestPct.toFixed(1)}%</strong></span>
          <span>Next 4: <strong>{risk.top2to5Pct.toFixed(1)}%</strong></span>
          <span>Other {Math.max(0, risk.positionCount - 5)}: <strong>{risk.remainingPct.toFixed(1)}%</strong></span>
        </div>
      </div>

      {/* ── Metric rows in 2-column grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))', gap: '0 14px' }}>
        <MetricRow
          label="Largest Position"
          sub={risk.largest?.symbol}
          value={`${risk.largest?.pct.toFixed(1)}%`}
          icon={<PieChart size={12} />}
          color={risk.largest?.pct > 50 ? 'var(--negative)' : risk.largest?.pct > 30 ? '#F59E0B' : 'var(--text-primary)'}
        />
        <MetricRow
          label="Crypto Exposure"
          value={`${risk.cryptoPct.toFixed(1)}%`}
          icon={<TrendingUp size={12} />}
          color={risk.cryptoPct > 80 ? '#F59E0B' : 'var(--text-primary)'}
        />
        <MetricRow
          label="Top 3 Concentration"
          sub="Share of top 3 positions"
          value={`${risk.top3Pct.toFixed(1)}%`}
          icon={<AlertTriangle size={12} />}
          color={risk.top3Pct > 80 ? 'var(--negative)' : risk.top3Pct > 60 ? '#F59E0B' : 'var(--text-primary)'}
        />
        <MetricRow
          label="Equity Exposure"
          sub="Stocks + Mutual Funds"
          value={`${risk.equityPct.toFixed(1)}%`}
          icon={<TrendingUp size={12} />}
        />
        <MetricRow
          label="Top 5 Concentration"
          value={`${risk.top5Pct.toFixed(1)}%`}
          icon={<AlertTriangle size={12} />}
        />
        <MetricRow
          label="High-Volatility Positions"
          sub="|24h change| > 5%"
          value={`${risk.highVolCount} / ${risk.positionCount}`}
          icon={<Activity size={12} />}
          color={risk.highVolCount > risk.positionCount / 2 ? '#F59E0B' : 'var(--text-primary)'}
        />
      </div>

      {/* ── Risk Assessment Advisory Alert Banner ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 8,
          padding: '8px 10px',
          borderRadius: 8,
          background: risk.alertSeverity === 'warning' ? 'rgba(245, 158, 11, 0.08)' : 'rgba(99, 102, 241, 0.08)',
          border: `1px solid ${risk.alertSeverity === 'warning' ? 'rgba(245, 158, 11, 0.25)' : 'rgba(99, 102, 241, 0.25)'}`,
          fontSize: 11,
          lineHeight: 1.4,
          color: 'var(--text-secondary)',
        }}
      >
        <ShieldAlert size={14} style={{ color: risk.alertSeverity === 'warning' ? '#F59E0B' : 'var(--accent, #6366F1)', flexShrink: 0, marginTop: 1 }} />
        <div>
          <strong style={{ color: 'var(--text-primary)', display: 'block', fontSize: 10, textTransform: 'uppercase', marginBottom: 1 }}>
            Risk Advisory
          </strong>
          {risk.alertMessage}
        </div>
      </div>
    </div>
  );
}
