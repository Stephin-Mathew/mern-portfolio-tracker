import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutGrid, List, Wallet, BarChart2, Sparkles } from 'lucide-react';

const TABS = [
  { to: '/', label: 'Overview', icon: LayoutGrid, end: true },
  { to: '/holdings', label: 'Holdings', icon: List, end: true },
  { to: '/wallets', label: 'Wallets', icon: Wallet, end: false },
  { to: '/analytics', label: 'Analytics', icon: BarChart2, end: true },
];

export function BottomTabBar({ onOpenUploadModal }) {
  return (
    <div className="bottom-tab-bar" role="navigation" aria-label="Mobile navigation">
      {TABS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => `btab${isActive ? ' active' : ''}`}
          aria-label={label}
        >
          <Icon size={22} strokeWidth={1.6} />
          <span>{label}</span>
        </NavLink>
      ))}

      {/* Import shortcut */}
      <button
        className="btab"
        onClick={onOpenUploadModal}
        aria-label="Import with AI"
        title="Import with AI"
      >
        <Sparkles size={22} strokeWidth={1.6} />
        <span>Import</span>
      </button>
    </div>
  );
}
