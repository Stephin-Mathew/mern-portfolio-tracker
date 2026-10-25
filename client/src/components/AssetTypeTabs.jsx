import React from 'react';
import { Layers, Coins, TrendingUp, Wallet, PieChart } from 'lucide-react';

const TABS = [
  { id: 'all', label: 'All', icon: Layers },
  { id: 'crypto', label: 'Crypto', icon: Coins },
  { id: 'stock', label: 'Stocks', icon: TrendingUp },
  { id: 'mutual_fund', label: 'Funds', icon: PieChart },
  { id: 'cash', label: 'Cash', icon: Wallet },
];

export const AssetTypeTabs = ({ activeTab, setActiveTab, counts }) => {
  return (
    <div className="seg" role="tablist" aria-label="Asset type filter" style={{ flexWrap: 'wrap' }}>
      {TABS.map(({ id, label, icon: Icon }) => {
        const isActive = activeTab === id;
        const count = counts[id] ?? 0;
        return (
          <button
            key={id}
            role="tab"
            aria-selected={isActive}
            className={`seg-btn${isActive ? ' active' : ''}`}
            onClick={() => setActiveTab(id)}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Icon size={13} strokeWidth={1.8} />
            {label}
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: '1px 6px',
                borderRadius: 20,
                background: isActive ? 'var(--card-border)' : 'transparent',
                color: isActive ? 'var(--text-secondary)' : 'var(--text-caption)',
                minWidth: 18,
                textAlign: 'center',
              }}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
};
