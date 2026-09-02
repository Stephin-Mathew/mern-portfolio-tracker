import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useWallets } from '../context/WalletContext';
import { HoldingsTable } from '../components/HoldingsTable';
import { ArrowLeft, Wallet, Plus, Edit2, Trash2, TrendingUp, TrendingDown, DollarSign, Coins, Landmark, CreditCard, Vault, Shield } from 'lucide-react';

const ICON_MAP = {
  wallet: Wallet,
  coins: Coins,
  shield: Shield,
  'credit-card': CreditCard,
  landmark: Landmark,
  vault: Vault,
};

export const WalletDetailPage = ({
  holdings,
  prices,
  onUpdateHolding,
  onDeleteHolding,
  onEditClick,
  onOpenAddModalWithWallet,
  onOpenEditWallet,
  onDeleteWallet,
  onClearWalletHoldings,
  onUpdatePrice,
  onResetPrice,
  rowStatuses,
}) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { wallets, deleteWallet, loading: walletsLoading } = useWallets();

  const wallet = wallets.find((w) => w._id === id);

  // Filter holdings for this specific wallet
  const walletHoldings = holdings.filter(
    (h) => h.walletId && h.walletId.toString() === id
  );

  // Calculate wallet valuation metrics
  let totalValue = 0;
  let totalStockCost = 0;
  let cryptoVal = 0;
  let stockVal = 0;
  let cashVal = 0;
  let wallet24hPnL = 0;

  walletHoldings.forEach((h) => {
    let currentPrice = 0;
    let ch24 = 0;

    if (h.assetType === 'cash') {
      currentPrice = 1;
    } else if (prices[h.symbol] !== undefined) {
      const entry = prices[h.symbol];
      if (typeof entry === 'object') {
        currentPrice = Number(entry.price || 0);
        ch24 = Number(entry.change24h || 0);
      } else {
        currentPrice = Number(entry) || 0;
      }
    } else {
      currentPrice = Number(h.avgBuyPrice) || 0;
    }

    const qty = Number(h.quantity) || 0;
    const val = qty * currentPrice;
    totalValue += val;

    if (h.assetType === 'crypto') {
      cryptoVal += val;
      const start24 = currentPrice / (1 + ch24 / 100);
      wallet24hPnL += qty * (currentPrice - start24);
    } else if (h.assetType === 'stock') {
      stockVal += val;
      const cost = qty * (Number(h.avgBuyPrice) || 0);
      totalStockCost += cost;
      const start24 = currentPrice / (1 + ch24 / 100);
      wallet24hPnL += qty * (currentPrice - start24);
    } else if (h.assetType === 'cash') {
      cashVal += val;
    }
  });

  const startBasis = totalValue - wallet24hPnL;
  const pnlPercent = startBasis > 0 ? (wallet24hPnL / startBasis) * 100 : 0;
  const isPositive = wallet24hPnL >= 0;

  const handleDeleteWallet = async () => {
    if (!wallet) return;
    if (onDeleteWallet) {
      onDeleteWallet(wallet, walletHoldings.length);
    } else if (window.confirm(`Are you sure you want to delete wallet "${wallet.name}"? All ${walletHoldings.length} assets in this wallet will be deleted.`)) {
      await deleteWallet(wallet._id);
      navigate('/wallets');
    }
  };

  const formatUSD = (num) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(num);

  if (walletsLoading) {
    return (
      <div className="space-y-6 py-6">
        <div className="h-48 glass-card rounded-3xl shimmer" />
        <div className="h-64 glass-card rounded-3xl shimmer" />
      </div>
    );
  }

  if (!wallet) {
    return (
      <div className="py-12 text-center glass-card rounded-3xl my-6 border dark:border-slate-800 border-slate-200">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-500 dark:text-rose-400 flex items-center justify-center mx-auto mb-4">
          <Wallet className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold dark:text-white text-slate-900 mb-2">Wallet Not Found</h3>
        <p className="dark:text-slate-400 text-slate-600 text-sm mb-6">The requested wallet does not exist or has been deleted.</p>
        <Link
          to="/wallets"
          className="px-6 py-3 rounded-2xl dark:bg-slate-800 bg-slate-100 dark:hover:bg-slate-700 hover:bg-slate-200 dark:text-white text-slate-900 font-bold text-xs inline-flex items-center space-x-2 transition border dark:border-slate-700 border-slate-300"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Wallets</span>
        </Link>
      </div>
    );
  }

  const IconComp = ICON_MAP[wallet.icon] || Wallet;
  const accentColor = wallet.color || '#06b6d4';

  return (
    <div className="space-y-6 py-4">
      {/* Navigation breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          to="/wallets"
          className="inline-flex items-center space-x-2 text-xs font-semibold dark:text-slate-400 text-slate-600 dark:hover:text-cyan-400 hover:text-cyan-600 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Wallets</span>
        </Link>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onOpenEditWallet(wallet)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl dark:bg-slate-800 bg-slate-100 dark:hover:bg-slate-700 hover:bg-slate-200 border dark:border-slate-700 border-slate-300 dark:text-slate-200 text-slate-800 text-xs font-semibold transition cursor-pointer shadow-xs"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit Wallet</span>
          </button>
          <button
            onClick={handleDeleteWallet}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 dark:text-red-400 text-xs font-semibold transition cursor-pointer shadow-xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Wallet Banner Card */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 relative overflow-hidden border dark:border-slate-800 border-slate-200 shadow-md">
        <div
          className="absolute top-0 left-0 right-0 h-2 transition-all"
          style={{ backgroundColor: accentColor }}
        />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Title & Metadata */}
          <div className="flex items-start space-x-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center border shadow-xl shrink-0"
              style={{
                backgroundColor: `${accentColor}25`,
                borderColor: `${accentColor}50`,
              }}
            >
              <IconComp className="w-7 h-7" style={{ color: accentColor }} />
            </div>
            <div>
              <div className="flex items-center space-x-3 mb-1">
                <h1 className="text-2xl sm:text-3xl font-extrabold dark:text-white text-slate-900 font-heading tracking-tight">
                  {wallet.name}
                </h1>
                <span
                  className="px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider border shadow-xs"
                  style={{
                    backgroundColor: `${accentColor}15`,
                    borderColor: `${accentColor}35`,
                    color: accentColor,
                  }}
                >
                  {wallet.type}
                </span>
              </div>
              <p className="dark:text-slate-400 text-slate-600 text-xs sm:text-sm">
                {wallet.description || 'Dedicated wallet account'}
              </p>
            </div>
          </div>

          {/* Quick Add Asset Button for this Wallet */}
          <button
            onClick={() => onOpenAddModalWithWallet(wallet._id)}
            className="flex items-center justify-center space-x-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-sm shadow-lg shadow-cyan-500/20 transition cursor-pointer shrink-0"
          >
            <Plus className="w-5 h-5" />
            <span>Add Asset to {wallet.name}</span>
          </button>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 pt-6 border-t dark:border-slate-800/80 border-slate-200">
          <div>
            <span className="text-xs dark:text-slate-400 text-slate-500 uppercase font-semibold">Wallet Net Worth</span>
            <div className="text-2xl sm:text-3xl font-extrabold dark:text-white text-slate-900 font-heading mt-1">
              {formatUSD(totalValue)}
            </div>
            <span className="text-[11px] dark:text-slate-400 text-slate-500">Across {walletHoldings.length} assets</span>
          </div>

          <div>
            <span className="text-xs dark:text-slate-400 text-slate-500 uppercase font-semibold">Wallet 24H Return (Yesterday)</span>
            <div className="flex items-baseline space-x-2 mt-1">
              <div className={`text-2xl sm:text-3xl font-extrabold font-heading ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {isPositive ? '+' : ''}
                {formatUSD(wallet24hPnL)}
              </div>
              <div className={`text-xs font-bold px-2 py-0.5 rounded border ${isPositive ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'}`}>
                {isPositive ? '+' : ''}
                {pnlPercent.toFixed(2)}%
              </div>
            </div>
            <span className="text-[11px] dark:text-slate-400 text-slate-500">
              {totalStockCost > 0 ? `Stock Invested: ${formatUSD(totalStockCost)}` : 'Market Live Tracking'}
            </span>
          </div>

          <div>
            <span className="text-xs dark:text-slate-400 text-slate-500 uppercase font-semibold">Asset Types</span>
            <div className="text-sm font-bold dark:text-white text-slate-900 mt-1 space-x-3 flex items-center">
              {cryptoVal > 0 && <span className="text-cyan-600 dark:text-cyan-400">{formatUSD(cryptoVal)} Crypto</span>}
              {stockVal > 0 && <span className="text-indigo-600 dark:text-indigo-400">{formatUSD(stockVal)} Stocks</span>}
              {cashVal > 0 && <span className="text-emerald-600 dark:text-emerald-400">{formatUSD(cashVal)} Cash</span>}
              {totalValue === 0 && <span className="dark:text-slate-500 text-slate-400 text-xs">No assets recorded</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Wallet Holdings Section */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold dark:text-white text-slate-900 font-heading flex items-center space-x-2">
            <span>Holdings in {wallet.name}</span>
            <span className="text-xs px-2 py-0.5 rounded-full dark:bg-slate-800 bg-slate-200 dark:text-slate-400 text-slate-700 font-mono font-bold">
              {walletHoldings.length}
            </span>
          </h2>

          {walletHoldings.length > 0 && onClearWalletHoldings && (
            <button
              onClick={() => onClearWalletHoldings(wallet, walletHoldings.length)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold transition cursor-pointer shadow-xs"
              title="Clear all holdings from this wallet"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All Holdings</span>
            </button>
          )}
        </div>

        <HoldingsTable
          holdings={walletHoldings}
          prices={prices}
          onUpdateHolding={onUpdateHolding}
          onDeleteHolding={onDeleteHolding}
          onEditClick={onEditClick}
          onUpdatePrice={onUpdatePrice}
          onResetPrice={onResetPrice}
          rowStatuses={rowStatuses}
        />
      </div>
    </div>
  );
};
