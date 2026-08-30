import React from 'react';
import { Link } from 'react-router-dom';
import { useWallets } from '../context/WalletContext';
import { Wallet, Plus, Edit2, Trash2, ChevronRight, Coins, Landmark, CreditCard, Vault, Shield } from 'lucide-react';

const ICON_MAP = {
  wallet: Wallet,
  coins: Coins,
  shield: Shield,
  'credit-card': CreditCard,
  landmark: Landmark,
  vault: Vault,
};

export const WalletsPage = ({
  holdings,
  prices,
  onOpenAddWallet,
  onOpenEditWallet,
  onDeleteWallet,
}) => {
  const { wallets, deleteWallet, loading } = useWallets();

  const calculateWalletStats = (walletId) => {
    let totalValue = 0;
    let totalCost = 0;
    let cryptoVal = 0;
    let stockVal = 0;
    let cashVal = 0;
    let wallet24hPnL = 0;

    const walletHoldings = holdings.filter(
      (h) => h.walletId && h.walletId.toString() === walletId.toString()
    );

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
        totalCost += cost;
        const start24 = currentPrice / (1 + ch24 / 100);
        wallet24hPnL += qty * (currentPrice - start24);
      } else if (h.assetType === 'cash') {
        cashVal += val;
      }
    });

    const startBasis = totalValue - wallet24hPnL;
    const pnlPct = startBasis > 0 ? (wallet24hPnL / startBasis) * 100 : 0;

    return {
      totalValue,
      totalCost,
      pnl: wallet24hPnL,
      pnlPct,
      count: walletHoldings.length,
      cryptoVal,
      stockVal,
      cashVal,
    };
  };

  const handleDelete = async (wallet, count) => {
    if (onDeleteWallet) {
      onDeleteWallet(wallet, count);
    } else if (window.confirm(`Are you sure you want to delete wallet "${wallet.name}"? All assets in this wallet will be deleted.`)) {
      await deleteWallet(wallet._id);
    }
  };

  const formatUSD = (num) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(num);

  if (loading) {
    return (
      <div className="space-y-4 py-6">
        <div className="h-20 glass-card rounded-2xl shimmer" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 glass-card rounded-2xl shimmer" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 py-4">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card rounded-3xl p-6 sm:p-8 relative overflow-hidden border dark:border-slate-800 border-slate-200">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl" />
        <div>
          <div className="flex items-center space-x-2 text-cyan-600 dark:text-cyan-400 text-xs font-bold uppercase tracking-wider mb-2">
            <Wallet className="w-4 h-4" />
            <span>Multi-Account Management</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold dark:text-white text-slate-900 font-heading tracking-tight">
            Your Wallets & Accounts
          </h1>
          <p className="dark:text-slate-400 text-slate-600 text-sm mt-1 max-w-xl">
            Create distinct wallets for cold storage, exchanges, brokerage accounts, and liquid cash. View dedicated metrics for each wallet.
          </p>
        </div>

        <button
          onClick={onOpenAddWallet}
          className="flex items-center justify-center space-x-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-sm shadow-lg shadow-cyan-500/20 transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-5 h-5" />
          <span>Add New Wallet</span>
        </button>
      </div>

      {/* Wallets Grid */}
      {wallets.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center border-dashed dark:border-slate-800 border-slate-300">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold dark:text-white text-slate-900 mb-2 font-heading">No Wallets Created Yet</h3>
          <p className="dark:text-slate-400 text-slate-600 text-sm max-w-md mx-auto mb-6">
            Click below to create your first wallet (e.g. Binance, MetaMask, Robinhood, or Hardware Ledger).
          </p>
          <button
            onClick={onOpenAddWallet}
            className="px-6 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm transition shadow-lg shadow-cyan-500/20 cursor-pointer"
          >
            + Create First Wallet
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {wallets.map((wallet) => {
            const IconComp = ICON_MAP[wallet.icon] || Wallet;
            const stats = calculateWalletStats(wallet._id);
            const accentColor = wallet.color || '#06b6d4';
            const isProfit = stats.pnl >= 0;

            const cryptoPct = stats.totalValue > 0 ? (stats.cryptoVal / stats.totalValue) * 100 : 0;
            const stockPct = stats.totalValue > 0 ? (stats.stockVal / stats.totalValue) * 100 : 0;
            const cashPct = stats.totalValue > 0 ? (stats.cashVal / stats.totalValue) * 100 : 0;

            return (
              <div
                key={wallet._id}
                className="glass-card rounded-3xl p-6 relative flex flex-col justify-between overflow-hidden border dark:border-slate-800/80 border-slate-200 dark:hover:border-slate-700 hover:border-slate-300 shadow-sm transition-all group"
              >
                {/* Top Accent Line */}
                <div
                  className="absolute top-0 left-0 right-0 h-1.5 transition-all"
                  style={{ backgroundColor: accentColor }}
                />

                <div>
                  {/* Top Row: Icon, Title & Action Menu */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center border shadow-md"
                        style={{
                          backgroundColor: `${accentColor}20`,
                          borderColor: `${accentColor}40`,
                        }}
                      >
                        <IconComp className="w-6 h-6" style={{ color: accentColor }} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold dark:text-white text-slate-900 font-heading tracking-tight">
                          {wallet.name}
                        </h3>
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider dark:bg-slate-800 bg-slate-200/80 dark:text-slate-300 text-slate-700">
                          {wallet.type}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => onOpenEditWallet(wallet)}
                        title="Edit Wallet"
                        className="p-2 rounded-xl dark:bg-slate-900/60 bg-slate-100 dark:hover:bg-slate-800 hover:bg-slate-200 text-slate-500 dark:text-slate-400 dark:hover:text-white hover:text-slate-900 transition cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(wallet, stats.count)}
                        title="Delete Wallet"
                        className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 dark:text-red-400 transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Description if present */}
                  {wallet.description && (
                    <p className="text-xs dark:text-slate-400 text-slate-600 mb-4 line-clamp-2">{wallet.description}</p>
                  )}

                  {/* Wallet Valuation */}
                  <div className="dark:bg-slate-900/60 bg-slate-50 rounded-2xl p-4 mb-4 border dark:border-slate-800/60 border-slate-200">
                    <div className="text-xs dark:text-slate-400 text-slate-500 mb-1">Total Valuation</div>
                    <div className="text-2xl font-extrabold dark:text-white text-slate-900 font-heading">
                      {formatUSD(stats.totalValue)}
                    </div>
                    {stats.count > 0 && (
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span className="dark:text-slate-400 text-slate-500">Unrealized P&L</span>
                        <span className={`font-mono font-bold ${isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {isProfit ? '+' : ''}
                          {formatUSD(stats.pnl)} ({isProfit ? '+' : ''}
                          {stats.pnlPct.toFixed(2)}%)
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Asset Allocation bar */}
                  {stats.totalValue > 0 && (
                    <div className="space-y-1 mb-4">
                      <div className="flex items-center justify-between text-[11px] dark:text-slate-400 text-slate-500">
                        <span>Asset Mix</span>
                        <span className="font-semibold dark:text-slate-300 text-slate-700">{stats.count} assets</span>
                      </div>
                      <div className="h-2 w-full dark:bg-slate-800 bg-slate-200 rounded-full overflow-hidden flex">
                        <div style={{ width: `${cryptoPct}%` }} className="bg-cyan-500" title={`Crypto: ${cryptoPct.toFixed(0)}%`} />
                        <div style={{ width: `${stockPct}%` }} className="bg-indigo-500" title={`Stocks: ${stockPct.toFixed(0)}%`} />
                        <div style={{ width: `${cashPct}%` }} className="bg-emerald-500" title={`Cash: ${cashPct.toFixed(0)}%`} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Action */}
                <Link
                  to={`/wallets/${wallet._id}`}
                  className="w-full py-3 rounded-2xl dark:bg-slate-800 dark:hover:bg-slate-700 bg-slate-100 hover:bg-slate-200 dark:text-white text-slate-900 text-xs font-bold flex items-center justify-center space-x-2 transition cursor-pointer border dark:border-slate-700/80 border-slate-300 shadow-xs"
                >
                  <span>View Wallet Details & Holdings</span>
                  <ChevronRight className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
