import React, { useState, useEffect } from 'react';
import { X, Lock, Unlock, Link2, DollarSign, RefreshCw, AlertCircle, CheckCircle, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';

const COMMON_TICKERS = ['BTC', 'ETH', 'SOL', 'USDT', 'USDC', 'BNB', 'AVAX', 'SUI', 'ARB', 'OP'];

export const PriceEditModal = ({
  isOpen,
  onClose,
  symbol,
  currentPriceInfo = {},
  onSavePrice,
  onResetPrice,
}) => {
  const [activeTab, setActiveTab] = useState('fixed'); // 'fixed' | 'mapped'
  const [priceInput, setPriceInput] = useState('');
  const [mappedTickerInput, setMappedTickerInput] = useState('');
  const [isLocked, setIsLocked] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState('');

  const currentPrice = Number(currentPriceInfo?.price || 0);
  const isCustom = !!currentPriceInfo?.isCustom;
  const mappedSymbol = currentPriceInfo?.mappedSymbol || '';

  useEffect(() => {
    if (isOpen) {
      setError('');
      if (mappedSymbol) {
        setActiveTab('mapped');
        setMappedTickerInput(mappedSymbol);
        setPriceInput(currentPrice > 0 ? String(currentPrice) : '');
      } else {
        setActiveTab('fixed');
        setPriceInput(currentPrice > 0 ? String(currentPrice) : '');
        setMappedTickerInput('');
      }
      setIsLocked(currentPriceInfo?.isLocked !== undefined ? !!currentPriceInfo.isLocked : true);
    }
  }, [isOpen, symbol, currentPrice, isCustom, mappedSymbol, currentPriceInfo]);

  if (!isOpen || !symbol) return null;

  const handleSave = async () => {
    setError('');

    if (activeTab === 'fixed') {
      const num = Number(priceInput);
      if (isNaN(num) || num < 0 || priceInput.trim() === '') {
        setError('Please enter a valid non-negative price');
        return;
      }
      setSaving(true);
      try {
        await onSavePrice(symbol, {
          price: num,
          mappedSymbol: null,
          isLocked,
        });
        onClose();
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to save custom price');
      } finally {
        setSaving(false);
      }
    } else {
      const cleanMapped = mappedTickerInput.trim().toUpperCase();
      if (!cleanMapped) {
        setError('Please enter a target ticker symbol to map to (e.g. ETH, BTC)');
        return;
      }
      if (cleanMapped === symbol.toUpperCase()) {
        setError(`Cannot map ${symbol} to itself`);
        return;
      }
      setSaving(true);
      try {
        await onSavePrice(symbol, {
          price: null,
          mappedSymbol: cleanMapped,
          isLocked: true,
        });
        onClose();
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to save ticker mapping');
      } finally {
        setSaving(false);
      }
    }
  };

  const handleReset = async () => {
    setError('');
    setResetting(true);
    try {
      await onResetPrice(symbol);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to reset price');
    } finally {
      setResetting(false);
    }
  };

  const formatUSD = (num) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 6 }).format(num || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel w-full max-w-lg rounded-2xl border dark:border-slate-800 border-slate-200 shadow-2xl p-6 relative flex flex-col gap-5">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={saving || resetting}
          className="absolute top-4 right-4 p-2 text-slate-400 dark:hover:text-white hover:text-slate-900 rounded-xl dark:bg-slate-900/60 bg-slate-100 dark:hover:bg-slate-800 hover:bg-slate-200 border dark:border-slate-800 border-slate-300 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 shrink-0">
            <DollarSign className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-bold dark:text-white text-slate-900 font-heading">
                Edit Price for <span className="text-cyan-500 dark:text-cyan-400 font-mono">{symbol}</span>
              </h2>
              {isCustom && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  {mappedSymbol ? `Mapped to ${mappedSymbol}` : 'Custom Override'}
                </span>
              )}
            </div>
            <p className="text-xs dark:text-slate-400 text-slate-500">
              Current Live Valuation: <span className="font-mono font-bold dark:text-slate-200 text-slate-800">{formatUSD(currentPrice)}</span>
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400 text-xs flex items-center space-x-2 font-semibold">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Mode Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl dark:bg-slate-900/80 bg-slate-100 border dark:border-slate-800 border-slate-300">
          <button
            type="button"
            onClick={() => setActiveTab('fixed')}
            className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'fixed'
                ? 'dark:bg-slate-800 bg-white text-cyan-600 dark:text-cyan-400 shadow-sm border dark:border-slate-700 border-slate-200'
                : 'dark:text-slate-400 text-slate-600 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Fixed Custom Price</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('mapped')}
            className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'mapped'
                ? 'dark:bg-slate-800 bg-white text-indigo-600 dark:text-indigo-400 shadow-sm border dark:border-slate-700 border-slate-200'
                : 'dark:text-slate-400 text-slate-600 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Map to Market Ticker</span>
          </button>
        </div>

        {/* Tab 1: Fixed Custom Price */}
        {activeTab === 'fixed' && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold dark:text-slate-300 text-slate-700 uppercase tracking-wider">
                Custom USD Price ($)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-mono font-bold dark:text-slate-500 text-slate-400">
                  $
                </span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-2.5 rounded-xl dark:bg-slate-900 bg-white border dark:border-slate-700 border-slate-300 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 dark:text-white text-slate-900 text-sm font-mono font-bold outline-none transition shadow-xs"
                />
              </div>
            </div>

            {/* Lock Toggle Checkbox */}
            <label className="flex items-start space-x-3 p-3 rounded-xl dark:bg-slate-900/60 bg-slate-50 border dark:border-slate-800 border-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={isLocked}
                onChange={(e) => setIsLocked(e.target.checked)}
                className="mt-0.5 rounded text-cyan-500 focus:ring-cyan-500 dark:border-slate-700"
              />
              <div className="text-xs">
                <span className="font-bold dark:text-slate-200 text-slate-800 flex items-center space-x-1">
                  <Lock className="w-3 h-3 text-cyan-500 inline mr-1" />
                  Lock Custom Price
                </span>
                <p className="dark:text-slate-400 text-slate-500 text-[11px] mt-0.5 leading-relaxed">
                  Prevents automated background refreshes and the "Refresh Prices" button from overwriting this value.
                </p>
              </div>
            </label>
          </div>
        )}

        {/* Tab 2: Map to Market Ticker */}
        {activeTab === 'mapped' && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold dark:text-slate-300 text-slate-700 uppercase tracking-wider">
                Target Market Symbol
              </label>
              <input
                type="text"
                value={mappedTickerInput}
                onChange={(e) => setMappedTickerInput(e.target.value.toUpperCase())}
                placeholder="e.g. ETH, BTC, SOL"
                className="w-full px-3.5 py-2.5 rounded-xl dark:bg-slate-900 bg-white border dark:border-slate-700 border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 dark:text-white text-slate-900 text-sm font-mono font-bold uppercase outline-none transition shadow-xs"
              />
              <p className="text-[11px] dark:text-slate-400 text-slate-500 leading-relaxed">
                Map wrapped, staked, or airdropped coins (e.g. <span className="font-mono text-cyan-500">WETH</span> &rarr; <span className="font-mono text-indigo-500">ETH</span>) to automatically inherit live price quotes and 24H performance.
              </p>
            </div>

            {/* Quick Suggestions */}
            <div>
              <span className="text-[11px] font-semibold dark:text-slate-400 text-slate-500 block mb-1.5">
                Quick Select:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_TICKERS.filter((t) => t !== symbol.toUpperCase()).map((ticker) => (
                  <button
                    key={ticker}
                    type="button"
                    onClick={() => setMappedTickerInput(ticker)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition cursor-pointer border ${
                      mappedTickerInput === ticker
                        ? 'bg-indigo-500/20 border-indigo-500 text-indigo-600 dark:text-indigo-400'
                        : 'dark:bg-slate-900 bg-slate-100 dark:border-slate-800 border-slate-300 dark:text-slate-400 text-slate-600 hover:border-indigo-500/40'
                    }`}
                  >
                    {ticker}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="pt-4 border-t dark:border-slate-800 border-slate-200 flex items-center justify-between gap-3">
          {isCustom ? (
            <button
              type="button"
              onClick={handleReset}
              disabled={saving || resetting}
              className="px-3 py-2 rounded-xl text-rose-500 hover:bg-rose-500/10 border border-rose-500/20 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
            >
              {resetting ? 'Resetting...' : 'Reset to Live Market Price'}
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving || resetting}
              className="px-4 py-2.5 rounded-xl border dark:border-slate-700 border-slate-300 dark:hover:bg-slate-800 hover:bg-slate-200 dark:text-slate-300 text-slate-700 text-xs font-semibold transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving || resetting}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 transition cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Save Price</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
