import React, { useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, PieChart, Clock, Zap } from 'lucide-react';

export const PortfolioSummary = ({ holdings = [], prices = {}, loading }) => {
  const [summaryView, setSummaryView] = useState('24h'); // '24h' | '7d' | 'stocks'
  const [selectedCurrency, setSelectedCurrency] = useState(() => {
    try {
      return localStorage.getItem('portfolio_currency') || 'USD';
    } catch {
      return 'USD';
    }
  });

  const handleCurrencyChange = (curr) => {
    setSelectedCurrency(curr);
    try {
      localStorage.setItem('portfolio_currency', curr);
    } catch (e) {
      console.warn('Could not save currency preference:', e);
    }
  };

  // Live prices for currency conversions
  const btcPrice = Number(prices.BTC?.price || 84300);
  const hypePrice = Number(prices.HYPE?.price || 93.8);
  const inrRate = Number(prices.INR?.price || prices.INR?.rate || 95.7);

  // Currency options for toggle pill
  const currencyOptions = [
    { id: 'USD', symbol: '$', label: 'USD', title: 'US Dollar ($)' },
    { id: 'INR', symbol: '₹', label: 'INR', title: 'Indian Rupee (₹)' },
    { id: 'BTC', symbol: '₿', label: 'BTC', title: 'Bitcoin (₿)' },
    { id: 'HYPE', symbol: 'HP', label: 'HYPE', title: 'Hyperliquid (HYPE)' },
  ];

  // Calculate total portfolio values
  let totalValue = 0;
  let totalStockCost = 0;
  let cryptoValue = 0;
  let stockValue = 0;
  let cashValue = 0;

  let total24hPnL = 0;
  let total7dPnL = 0;
  let stockTotalPnL = 0;

  holdings.forEach((h) => {
    let p = 0;
    let ch24 = 0;
    let ch7 = 0;

    if (h.assetType === 'cash') {
      p = 1;
    } else if (prices[h.symbol]) {
      const entry = prices[h.symbol];
      if (typeof entry === 'object') {
        p = Number(entry.price || 0);
        ch24 = Number(entry.change24h || 0);
        ch7 = Number(entry.change7d || 0);
      } else {
        p = Number(entry) || 0;
      }
    } else {
      p = Number(h.avgBuyPrice) || 0;
    }

    const qty = Number(h.quantity) || 0;
    const val = qty * p;
    totalValue += val;

    if (h.assetType === 'crypto') {
      cryptoValue += val;
      const start24 = p / (1 + ch24 / 100);
      total24hPnL += qty * (p - start24);

      const start7 = p / (1 + ch7 / 100);
      total7dPnL += qty * (p - start7);
    } else if (h.assetType === 'stock') {
      stockValue += val;
      const cost = qty * (Number(h.avgBuyPrice) || 0);
      totalStockCost += cost;
      stockTotalPnL += (val - cost);

      // Stock daily/7d contribution
      const start24 = p / (1 + ch24 / 100);
      total24hPnL += qty * (p - start24);
      const start7 = p / (1 + ch7 / 100);
      total7dPnL += qty * (p - start7);
    } else if (h.assetType === 'cash') {
      cashValue += val;
    }
  });

  const activePnL =
    summaryView === '7d'
      ? total7dPnL
      : summaryView === 'stocks'
      ? stockTotalPnL
      : total24hPnL;

  const startBasis =
    summaryView === '7d'
      ? totalValue - total7dPnL
      : summaryView === 'stocks'
      ? totalStockCost
      : totalValue - total24hPnL;

  const pnlPercent = startBasis > 0 ? (activePnL / startBasis) * 100 : 0;
  const isPositive = activePnL >= 0;

  const cryptoPct = totalValue > 0 ? (cryptoValue / totalValue) * 100 : 0;
  const stockPct = totalValue > 0 ? (stockValue / totalValue) * 100 : 0;
  const cashPct = totalValue > 0 ? (cashValue / totalValue) * 100 : 0;

  const formatUSD = (num) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(num || 0);

  const formatINR = (num) => {
    const val = (num || 0) * inrRate;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  const formatBTC = (num) => {
    const val = btcPrice > 0 ? (num || 0) / btcPrice : 0;
    if (val === 0) return '0.0000 ₿';
    const absVal = Math.abs(val);
    const sign = val < 0 ? '-' : '';
    let formatted;
    if (absVal >= 1000) {
      formatted = absVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else if (absVal >= 1) {
      formatted = absVal.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
    } else if (absVal >= 0.01) {
      formatted = absVal.toFixed(4);
    } else {
      formatted = absVal.toFixed(6);
    }
    return `${sign}${formatted} ₿`;
  };

  const formatHYPE = (num) => {
    const val = hypePrice > 0 ? (num || 0) / hypePrice : 0;
    if (val === 0) return '0.00 HYPE';
    const absVal = Math.abs(val);
    const sign = val < 0 ? '-' : '';
    let formatted;
    if (absVal >= 1000) {
      formatted = absVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else if (absVal >= 1) {
      formatted = absVal.toFixed(2);
    } else {
      formatted = absVal.toFixed(4);
    }
    return `${sign}${formatted} HYPE`;
  };

  const formatSelectedCurrency = (num) => {
    switch (selectedCurrency) {
      case 'INR':
        return formatINR(num);
      case 'BTC':
        return formatBTC(num);
      case 'HYPE':
        return formatHYPE(num);
      case 'USD':
      default:
        return formatUSD(num);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 glass-card rounded-2xl shimmer p-6" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 mb-8">
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Total Net Worth Card with Multi-Currency Switcher */}
        <div className="glass-card rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-cyan-500/10 rounded-full blur-xl group-hover:bg-cyan-500/20 transition-all" />
          
          <div className="flex items-center justify-between dark:text-slate-400 text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Portfolio Value</span>

            {/* Quick Currency Toggle Pill */}
            <div className="flex items-center dark:bg-slate-900 bg-slate-200/80 p-0.5 rounded-lg border dark:border-slate-800 border-slate-300 shadow-xs">
              {currencyOptions.map((opt) => {
                const isActive = selectedCurrency === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleCurrencyChange(opt.id)}
                    className={`px-1.5 py-0.5 text-[10px] font-bold rounded cursor-pointer transition flex items-center space-x-0.5 ${
                      isActive
                        ? 'bg-cyan-500 text-slate-950 shadow-xs font-extrabold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title={opt.title}
                  >
                    <span>{opt.symbol}</span>
                    <span className="hidden sm:inline">{opt.label !== opt.symbol ? opt.label : ''}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-baseline gap-2">
            <div className="text-2xl sm:text-3xl font-extrabold dark:text-white text-slate-900 tracking-tight font-heading">
              {formatSelectedCurrency(totalValue)}
            </div>
            {selectedCurrency !== 'USD' && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-md dark:bg-slate-800/80 bg-slate-200/70 dark:text-slate-400 text-slate-600 border dark:border-slate-700/60 border-slate-300">
                ≈ {formatUSD(totalValue)}
              </span>
            )}
          </div>

          <div className="mt-2 flex items-center justify-between text-xs dark:text-slate-400 text-slate-500">
            <div className="flex items-center space-x-1.5">
              {selectedCurrency === 'USD' && (
                <span>Across {holdings.length} total holding{holdings.length === 1 ? '' : 's'}</span>
              )}
              {selectedCurrency === 'INR' && (
                <>
                  <span className="font-semibold dark:text-slate-300 text-slate-700">1 USD ≈ ₹{inrRate.toFixed(2)}</span>
                  <span>•</span>
                  <span>{holdings.length} holding{holdings.length === 1 ? '' : 's'}</span>
                </>
              )}
              {selectedCurrency === 'BTC' && (
                <>
                  <span className="font-semibold dark:text-slate-300 text-slate-700">
                    1 BTC ≈ ${btcPrice.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                  <span>•</span>
                  <span>{holdings.length} holding{holdings.length === 1 ? '' : 's'}</span>
                </>
              )}
              {selectedCurrency === 'HYPE' && (
                <>
                  <span className="font-semibold dark:text-slate-300 text-slate-700">
                    1 HYPE ≈ ${hypePrice.toFixed(2)}
                  </span>
                  <span>•</span>
                  <span>{holdings.length} holding{holdings.length === 1 ? '' : 's'}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Period Performance Card */}
        <div className="glass-card rounded-2xl p-6 relative overflow-hidden group">
          <div
            className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full blur-xl transition-all ${
              isPositive ? 'bg-emerald-500/10 group-hover:bg-emerald-500/20' : 'bg-rose-500/10 group-hover:bg-rose-500/20'
            }`}
          />
          <div className="flex items-center justify-between dark:text-slate-400 text-slate-500 mb-2">
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider">
                {summaryView === '7d'
                  ? '7D (vs Last Week)'
                  : summaryView === 'stocks'
                  ? 'Stock Gain vs Cost'
                  : '24H (vs Yesterday)'}
              </span>
            </div>

            {/* Quick Toggle Pill */}
            <div className="flex items-center dark:bg-slate-900 bg-slate-200/80 p-0.5 rounded-lg border dark:border-slate-800 border-slate-300">
              <button
                onClick={() => setSummaryView('24h')}
                className={`px-1.5 py-0.5 text-[10px] font-bold rounded cursor-pointer transition ${
                  summaryView === '24h' ? 'bg-cyan-500 text-slate-950 shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="24H Gain vs Yesterday"
              >
                24H
              </button>
              <button
                onClick={() => setSummaryView('7d')}
                className={`px-1.5 py-0.5 text-[10px] font-bold rounded cursor-pointer transition ${
                  summaryView === '7d' ? 'bg-cyan-500 text-slate-950 shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="7D Gain vs Last Week"
              >
                7D
              </button>
              <button
                onClick={() => setSummaryView('stocks')}
                className={`px-1.5 py-0.5 text-[10px] font-bold rounded cursor-pointer transition ${
                  summaryView === 'stocks' ? 'bg-cyan-500 text-slate-950 shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="All-Time Stock Return vs Buy Price"
              >
                Stocks
              </button>
            </div>
          </div>

          <div className="flex items-baseline space-x-2">
            <div
              className={`text-2xl sm:text-3xl font-extrabold tracking-tight font-heading ${
                isPositive ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'
              }`}
            >
              {isPositive ? '+' : ''}
              {formatSelectedCurrency(activePnL)}
            </div>
            <div
              className={`text-sm font-bold px-2 py-0.5 rounded-md ${
                isPositive
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
              }`}
            >
              {isPositive ? '+' : ''}
              {pnlPercent.toFixed(2)}%
            </div>
          </div>
          <div className="mt-2 text-xs dark:text-slate-400 text-slate-500">
            {summaryView === 'stocks' ? (
              <span>
                Stock Invested Cost: <strong className="dark:text-slate-200 text-slate-800">{formatSelectedCurrency(totalStockCost)}</strong>
              </span>
            ) : (
              <span>
                Market Basis: <strong className="dark:text-slate-200 text-slate-800">{formatSelectedCurrency(startBasis)}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Asset Distribution Summary Card */}
        <div className="glass-card rounded-2xl p-6 relative overflow-hidden group sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between dark:text-slate-400 text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Asset Breakdown</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
              <PieChart className="w-5 h-5" />
            </div>
          </div>

          {/* Asset Allocation Multi-bar */}
          <div className="space-y-2 mt-2">
            <div className="h-3 w-full dark:bg-slate-800 bg-slate-200 rounded-full overflow-hidden flex shadow-inner">
              <div
                style={{ width: `${cryptoPct}%` }}
                className="bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                title={`Crypto: ${cryptoPct.toFixed(1)}%`}
              />
              <div
                style={{ width: `${stockPct}%` }}
                className="bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                title={`Stocks: ${stockPct.toFixed(1)}%`}
              />
              <div
                style={{ width: `${cashPct}%` }}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                title={`Cash: ${cashPct.toFixed(1)}%`}
              />
            </div>
            <div className="flex items-center justify-between text-xs dark:text-slate-400 text-slate-600 pt-1 font-medium">
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                <span>Crypto ({cryptoPct.toFixed(0)}%)</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                <span>Stocks ({stockPct.toFixed(0)}%)</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Cash ({cashPct.toFixed(0)}%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
