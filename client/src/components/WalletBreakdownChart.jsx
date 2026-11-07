import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList,
} from 'recharts';
import { useCurrency } from '../context/CurrencyContext';
import { getWalletColor } from '../utils/assetColors';
import { useWallets } from '../context/WalletContext';
import { useNavigate } from 'react-router-dom';

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
      <div style={{ fontWeight: 600, marginBottom: 2 }}>{name}</div>
      <div>{fmt(value)}</div>
      <div style={{ color: '#9CA3AF' }}>{pct.toFixed(1)}% of portfolio</div>
    </div>
  );
}

export function WalletBreakdownChart({ metrics }) {
  const { fmt } = useCurrency();
  const { wallets } = useWallets();
  const navigate = useNavigate();

  if (!metrics?.perWallet?.length) return null;

  const data = metrics.perWallet
    .filter((r) => r.valueUsd > 0)
    .slice(0, 10)
    .map((r) => ({
      id:    r.wallet?._id,
      name:  r.wallet?.name ?? 'Unknown',
      value: r.valueUsd,
      pct:   r.pct,
      color: getWalletColor(r.wallet, wallets),
      holdingsCount: r.holdingsCount,
    }));

  if (!data.length) return null;

  const barHeight = 36;
  const chartHeight = Math.max(140, data.length * barHeight + 40);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 className="card-title">Wallet Breakdown</h2>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{data.length} wallet{data.length !== 1 ? 's' : ''}</span>
      </div>

      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 60, left: 0, bottom: 0 }}
          barCategoryGap="30%"
        >
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            width={90}
            tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<TooltipContent fmt={fmt} />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Bar
            dataKey="value"
            radius={[0, 4, 4, 0]}
            onClick={(d) => d.id && navigate(`/wallets/${d.id}`)}
            style={{ cursor: 'pointer' }}
          >
            {data.map((entry, i) => (
              <Cell key={`cell-${i}`} fill={entry.color} />
            ))}
            <LabelList
              dataKey="pct"
              position="right"
              formatter={(v) => `${v.toFixed(1)}%`}
              style={{ fill: 'var(--text-muted)', fontSize: 11 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

