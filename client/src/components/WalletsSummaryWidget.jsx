import React from 'react';
import { Link } from 'react-router-dom';
import { useWallets } from '../context/WalletContext';
import { Wallet, Plus, ChevronRight, Coins, Landmark, CreditCard, Vault, Shield } from 'lucide-react';

const ICON_MAP = {
  wallet: Wallet,
  coins: Coins,
  shield: Shield,
  'credit-card': CreditCard,
  landmark: Landmark,
  vault: Vault,
};

export const WalletsSummaryWidget = ({ holdings, prices, onOpenAddWallet }) => {
  const { wallets, loading } = useWallets();

  // Calculate USD valuation per wallet
  const calculateWalletValue = (walletId) => {
    let value = 0;
    holdings.forEach((h) => {
      if (h.walletId && h.walletId.toString() === walletId.toString()) {
        let currentPrice = 0;
        if (h.assetType === 'cash') {
          currentPrice = 1;
        } else if (prices[h.symbol] !== undefined) {
          currentPrice = typeof prices[h.symbol] === 'object' ? prices[h.symbol].price : prices[h.symbol];
        } else {
          currentPrice = Number(h.avgBuyPrice) || 0;
        }
        value += (Number(h.quantity) || 0) * currentPrice;
      }
    });
    return value;
  };

  // Calculate total portfolio value across all holdings
  let totalPortfolioValue = 0;
  holdings.forEach((h) => {
    let currentPrice = 0;
    if (h.assetType === 'cash') {
      currentPrice = 1;
    } else if (prices[h.symbol] !== undefined) {
      currentPrice = typeof prices[h.symbol] === 'object' ? prices[h.symbol].price : prices[h.symbol];
    } else {
      currentPrice = Number(h.avgBuyPrice) || 0;
    }
    totalPortfolioValue += (Number(h.quantity) || 0) * currentPrice;
  });

  const formatUSD = (num) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(num);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 glass-card rounded-2xl shimmer p-4" />
        ))}
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold dark:text-white text-slate-900 font-heading flex items-center space-x-2">
            <Wallet className="w-5 h-5 text-cyan-500 dark:text-cyan-400" />
            <span>Wallets & Accounts Breakdown</span>
          </h3>
          <p className="text-xs dark:text-slate-400 text-slate-500">Total holding aggregated across all your wallets</p>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            to="/wallets"
            className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 flex items-center space-x-1 transition"
          >
            <span>Manage All Wallets</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
          <button
            onClick={onOpenAddWallet}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-xl dark:bg-cyan-500/10 bg-cyan-50 hover:bg-cyan-500/20 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-xs font-bold transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Wallet</span>
          </button>
        </div>
      </div>

      {wallets.length === 0 ? (
        <div className="glass-card rounded-2xl p-6 text-center border-dashed dark:border-slate-800 border-slate-300">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-500 dark:text-cyan-400 flex items-center justify-center mx-auto mb-3">
            <Wallet className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold dark:text-white text-slate-900 mb-1">No Wallets Created Yet</h4>
          <p className="text-xs dark:text-slate-400 text-slate-500 max-w-md mx-auto mb-4">
            Organize your crypto, stock accounts, and hardware wallets into dedicated pages for focused tracking.
          </p>
          <button
            onClick={onOpenAddWallet}
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-cyan-500/20 cursor-pointer"
          >
            + Create Your First Wallet
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {wallets.map((wallet) => {
            const IconComp = ICON_MAP[wallet.icon] || Wallet;
            const walletVal = calculateWalletValue(wallet._id);
            const pctOfTotal = totalPortfolioValue > 0 ? (walletVal / totalPortfolioValue) * 100 : 0;
            const accentColor = wallet.color || '#06b6d4';

            return (
              <Link
                key={wallet._id}
                to={`/wallets/${wallet._id}`}
                className="glass-card rounded-2xl p-4 relative group dark:hover:border-slate-700 hover:border-slate-300 transition-all hover:scale-[1.02] flex flex-col justify-between overflow-hidden shadow-sm"
              >
                {/* Top glow line */}
                <div
                  className="absolute top-0 left-0 right-0 h-1 transition-all"
                  style={{ backgroundColor: accentColor }}
                />

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2.5">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center border"
                        style={{
                          backgroundColor: `${accentColor}20`,
                          borderColor: `${accentColor}40`,
                        }}
                      >
                        <IconComp className="w-4 h-4" style={{ color: accentColor }} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold dark:text-white text-slate-900 truncate max-w-[120px]">{wallet.name}</h4>
                        <span className="text-[10px] uppercase font-semibold dark:text-slate-400 text-slate-500 tracking-wider">
                          {wallet.type}
                        </span>
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-cyan-500 dark:group-hover:text-cyan-400 group-hover:translate-x-0.5 transition" />
                  </div>

                  <div className="text-xl font-extrabold dark:text-white text-slate-900 font-heading mb-1">
                    {formatUSD(walletVal)}
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t dark:border-slate-800/80 border-slate-200 flex items-center justify-between text-[11px] dark:text-slate-400 text-slate-500">
                  <span>{wallet.holdingCount || 0} holdings</span>
                  <span className="font-semibold dark:text-slate-300 text-slate-700">{pctOfTotal.toFixed(1)}% of total</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};
