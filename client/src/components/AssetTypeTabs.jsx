import React from 'react';
import { Layers, Coins, TrendingUp, Wallet } from 'lucide-react';

export const AssetTypeTabs = ({ activeTab, setActiveTab, counts }) => {
  const tabs = [
    { id: 'all', label: 'All Holdings', icon: Layers, count: counts.all },
    { id: 'crypto', label: 'Crypto', icon: Coins, count: counts.crypto },
    { id: 'stock', label: 'Stocks', icon: TrendingUp, count: counts.stock },
    { id: 'cash', label: 'Cash & Fiat', icon: Wallet, count: counts.cash },
  ];

  return (
    <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto pb-2 border-b dark:border-slate-800 border-slate-200">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer whitespace-nowrap ${
              isActive
                ? 'dark:bg-cyan-500/15 bg-cyan-50 border dark:border-cyan-500/30 border-cyan-500/40 text-cyan-600 dark:text-cyan-400 shadow-sm shadow-cyan-500/10'
                : 'dark:text-slate-400 text-slate-600 dark:hover:text-slate-200 hover:text-slate-900 dark:hover:bg-slate-800/60 hover:bg-slate-100 border border-transparent'
            }`}
          >
            <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-500 dark:text-cyan-400' : 'text-slate-400 dark:text-slate-500'}`} />
            <span>{tab.label}</span>
            <span
              className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                isActive
                  ? 'dark:bg-cyan-500/20 bg-cyan-500/15 text-cyan-600 dark:text-cyan-300'
                  : 'dark:bg-slate-800 bg-slate-200/70 dark:text-slate-400 text-slate-600'
              }`}
            >
              {tab.count}
            </span>
          </button>
        );
      })}
    </div>
  );
};

