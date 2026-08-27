import React from 'react';
import { PortfolioSummary } from '../components/PortfolioSummary';
import { PortfolioChartWidget } from '../components/PortfolioChartWidget';
import { WalletsSummaryWidget } from '../components/WalletsSummaryWidget';
import { AssetTypeTabs } from '../components/AssetTypeTabs';
import { HoldingsTable } from '../components/HoldingsTable';
import { Sparkles } from 'lucide-react';

export const DashboardPage = ({
  isAuthenticated,
  holdings,
  prices,
  loading,
  activeTab,
  setActiveTab,
  onUpdateHolding,
  onDeleteHolding,
  onEditClick,
  onOpenAuthModal,
  onOpenAddWalletModal,
  rowStatuses,
}) => {
  if (!isAuthenticated) {
    return (
      <div className="my-12 text-center max-w-3xl mx-auto space-y-6">
        <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-xs font-semibold">
          <Sparkles className="w-4 h-4 animate-pulse-slow" />
          <span>Multi-Wallet AI Portfolio Tracking</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold dark:text-white text-slate-900 tracking-tight font-heading leading-tight">
          Track All Your Wallets <br />
          <span className="bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 dark:from-cyan-400 dark:via-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
            In One Aggregated Dashboard
          </span>
        </h1>

        <p className="dark:text-slate-400 text-slate-600 text-base sm:text-lg max-w-2xl mx-auto">
          Manage Binance, Coinbase, Ledger, Robinhood, and custom wallets. Snap a screenshot or add assets manually to view overall total holdings across all your wallets.
        </p>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={onOpenAuthModal}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-extrabold text-base shadow-xl shadow-cyan-500/25 transition cursor-pointer hover:scale-105"
          >
            Get Started — Sign In / Register
          </button>
        </div>
      </div>
    );
  }

  // Filter holdings based on activeTab ('all' | 'crypto' | 'stock' | 'cash')
  const filteredHoldings = holdings.filter((h) => {
    if (activeTab === 'all') return true;
    return h.assetType === activeTab;
  });

  const tabCounts = {
    all: holdings.length,
    crypto: holdings.filter((h) => h.assetType === 'crypto').length,
    stock: holdings.filter((h) => h.assetType === 'stock').length,
    cash: holdings.filter((h) => h.assetType === 'cash').length,
  };

  return (
    <div className="space-y-6">
      {/* 1. Overall Portfolio Summary across ALL wallets */}
      <PortfolioSummary holdings={holdings} prices={prices} loading={loading} />

      {/* 2. Interactive Front Page Portfolio Value Chart (Clickable -> Study Chart Page) */}
      <PortfolioChartWidget holdings={holdings} prices={prices} />

      {/* 3. Wallets Summary Cards Breakdown */}
      <WalletsSummaryWidget holdings={holdings} prices={prices} onOpenAddWallet={onOpenAddWalletModal} />

      {/* 3. Asset Type Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <AssetTypeTabs activeTab={activeTab} setActiveTab={setActiveTab} counts={tabCounts} />

        <div className="flex items-center space-x-2 self-end sm:self-auto text-xs text-slate-400">
          <span>Tip: Click any cell in table to edit inline</span>
        </div>
      </div>

      {/* 4. Aggregated Holdings Table */}
      <HoldingsTable
        holdings={filteredHoldings}
        prices={prices}
        onUpdateHolding={onUpdateHolding}
        onDeleteHolding={onDeleteHolding}
        onEditClick={onEditClick}
        rowStatuses={rowStatuses}
      />
    </div>
  );
};
