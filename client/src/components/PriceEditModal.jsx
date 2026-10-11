import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  Unlock,
  Link2,
  DollarSign,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Search,
  CheckCircle2,
  Loader2,
  TrendingUp,
} from 'lucide-react';
import api from '../api/axiosInstance';
import { ApiMappingModal } from './ApiMappingModal';

const COMMON_TICKERS = ['BTC', 'ETH', 'SOL', 'USDT', 'USDC', 'BNB', 'AVAX', 'SUI', 'ARB', 'OP'];

export const PriceEditModal = ({
  isOpen,
  onClose,
  symbol,
  currentPriceInfo = {},
  onSavePrice,
  onResetPrice,
}) => {
  const safeSymbol = String(symbol || '');
  const priceObj = typeof currentPriceInfo === 'object' && currentPriceInfo !== null
    ? currentPriceInfo
    : { price: Number(currentPriceInfo) || 0 };

  const [activeTab, setActiveTab] = useState('fixed'); // 'fixed' | 'mapped'
  const [priceInput, setPriceInput] = useState('');
  const [mappedTickerInput, setMappedTickerInput] = useState('');
  const [customCurrency, setCustomCurrency] = useState('USD');
  const [isLocked, setIsLocked] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState('');

  // Live API quote verification state
  const [verifiedQuote, setVerifiedQuote] = useState(null);
  const [fetchingQuote, setFetchingQuote] = useState(false);
  const [showMappingModal, setShowMappingModal] = useState(false);

  const currentPrice = Number(priceObj.price || 0);
  const currentPriceInr = Number(priceObj.priceInr || priceObj.navInr || 0);
  const isCustom = !!priceObj.isCustom;
  const mappedSymbol = priceObj.mappedSymbol || '';
  const isINRAsset = priceObj.currency === 'INR' || safeSymbol.endsWith('.NS') || safeSymbol.endsWith('.BO');

  const fetchLiveQuote = async (tickerToFetch) => {
    const t = String(tickerToFetch || mappedTickerInput || '').trim();
    if (!t) return;

    setFetchingQuote(true);
    setError('');
    try {
      const res = await api.get(`/prices/quote/${encodeURIComponent(t)}`);
      if (res.data?.found) {
        setVerifiedQuote(res.data);
        if (res.data.suggestedSymbol && res.data.suggestedSymbol !== t) {
          setMappedTickerInput(res.data.suggestedSymbol);
        }
      } else {
        setVerifiedQuote(null);
        setError(res.data?.message || `No price quote found for ${t}`);
      }
    } catch (err) {
      setVerifiedQuote(null);
      setError(
        err.response?.data?.message ||
        `Could not fetch live quote for ${t}. If it's an Indian stock, try appending .NS (e.g. ${t}.NS)`
      );
    } finally {
      setFetchingQuote(false);
    }
  };

  useEffect(() => {
    if (isOpen && safeSymbol) {
      setError('');
      setVerifiedQuote(null);
      setCustomCurrency(isINRAsset ? 'INR' : 'USD');

      if (mappedSymbol) {
        setActiveTab('mapped');
        setMappedTickerInput(mappedSymbol);
        setPriceInput(currentPrice > 0 ? String(currentPrice) : '');
        // Auto-fetch quote for mapped symbol
        fetchLiveQuote(mappedSymbol);
      } else {
        setActiveTab('fixed');
        const displayVal = isINRAsset && currentPriceInr > 0 ? currentPriceInr : currentPrice;
        setPriceInput(displayVal > 0 ? String(displayVal) : '');
        setMappedTickerInput('');
      }
      setIsLocked(priceObj.isLocked !== undefined ? !!priceObj.isLocked : true);
    }
  }, [isOpen, safeSymbol, currentPrice, currentPriceInr, isCustom, mappedSymbol, isINRAsset, priceObj.isLocked]);

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
        await onSavePrice(safeSymbol, {
          price: num,
          mappedSymbol: null,
          currency: customCurrency,
          isLocked,
        });
        onClose();
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to save custom price');
      } finally {
        setSaving(false);
      }
    } else {
      const cleanMapped = (verifiedQuote?.symbol || mappedTickerInput).trim().toUpperCase();
      if (!cleanMapped) {
        setError('Please enter a target ticker symbol to map to (e.g. ETH, BTC, CANBK.NS)');
        return;
      }
      if (cleanMapped === safeSymbol.toUpperCase()) {
        setError(`Cannot map ${safeSymbol} to itself`);
        return;
      }
      setSaving(true);
      try {
        await onSavePrice(safeSymbol, {
          price: null,
          mappedSymbol: cleanMapped,
          currency: verifiedQuote?.currency || 'USD',
          priceInr: verifiedQuote?.priceInr || verifiedQuote?.navInr || null,
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
      await onResetPrice(safeSymbol);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to reset price');
    } finally {
      setResetting(false);
    }
  };

  const formatUSD = (num) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 6 }).format(num || 0);

  const formatINR = (num) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num || 0);

  const currentDisplayFormatted = isINRAsset && currentPriceInr > 0 ? formatINR(currentPriceInr) : formatUSD(currentPrice);

  if (!isOpen || !symbol) return null;

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
              Current Live Valuation: <span className="font-mono font-bold dark:text-slate-200 text-slate-800">{currentDisplayFormatted}</span>
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
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold dark:text-slate-300 text-slate-700 uppercase tracking-wider">
                  Custom Price ({customCurrency === 'INR' ? '₹ INR' : '$ USD'})
                </label>
                <div className="flex items-center dark:bg-slate-900 bg-slate-200 p-0.5 rounded-lg border dark:border-slate-800 border-slate-300">
                  <button
                    type="button"
                    onClick={() => setCustomCurrency('INR')}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded transition cursor-pointer ${
                      customCurrency === 'INR' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400'
                    }`}
                  >
                    ₹ INR
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomCurrency('USD')}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded transition cursor-pointer ${
                      customCurrency === 'USD' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400'
                    }`}
                  >
                    $ USD
                  </button>
                </div>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-mono font-bold dark:text-slate-500 text-slate-400">
                  {customCurrency === 'INR' ? '₹' : '$'}
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
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold dark:text-slate-300 text-slate-700 uppercase tracking-wider">
                  Target Market Symbol
                </label>
                <button
                  type="button"
                  onClick={() => setShowMappingModal(true)}
                  className="text-[11px] font-bold text-cyan-500 hover:text-cyan-400 flex items-center space-x-1 transition cursor-pointer"
                >
                  <Search className="w-3 h-3" />
                  <span>Advanced Search (MF / Stocks)</span>
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={mappedTickerInput}
                  onChange={(e) => setMappedTickerInput(e.target.value.toUpperCase())}
                  placeholder="e.g. CANBK.NS, BTC, ETH, 120503"
                  onKeyDown={(e) => e.key === 'Enter' && fetchLiveQuote(mappedTickerInput)}
                  className="flex-1 px-3.5 py-2.5 rounded-xl dark:bg-slate-900 bg-white border dark:border-slate-700 border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 dark:text-white text-slate-900 text-sm font-mono font-bold uppercase outline-none transition shadow-xs"
                />
                <button
                  type="button"
                  onClick={() => fetchLiveQuote(mappedTickerInput)}
                  disabled={fetchingQuote || !mappedTickerInput.trim()}
                  className="flex items-center space-x-1 px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {fetchingQuote ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  <span>Test API</span>
                </button>
              </div>
              <p className="text-[11px] dark:text-slate-400 text-slate-500 leading-relaxed">
                Connect this holding to live quotes from Yahoo Finance (Stocks), MFapi.in (Mutual Funds), or CoinMarketCap (Crypto).
              </p>
            </div>

            {/* Verified Live Quote Card */}
            {verifiedQuote && (
              <div className="p-3.5 rounded-xl dark:bg-slate-900/90 bg-indigo-50/60 border dark:border-indigo-500/30 border-indigo-500/40 shadow-md space-y-1.5 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">
                      Live Quote Verified
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold dark:bg-slate-800 bg-white text-slate-600 dark:text-slate-300 border dark:border-slate-700 border-slate-200">
                    Source: {verifiedQuote.source}
                  </span>
                </div>

                {verifiedQuote.schemeName && (
                  <p className="text-xs font-semibold dark:text-white text-slate-900 leading-snug">
                    {verifiedQuote.schemeName}
                  </p>
                )}

                <div className="flex items-baseline justify-between pt-1">
                  <div>
                    <span className="text-xl font-extrabold font-mono dark:text-white text-slate-900">
                      {verifiedQuote.formattedPrice}
                    </span>
                    <span className="text-xs text-slate-400 font-mono ml-2">
                      ({verifiedQuote.currency})
                    </span>
                  </div>

                  {verifiedQuote.change24h !== undefined && verifiedQuote.change24h !== null && (
                    <span className={`text-xs font-bold font-mono ${
                      Number(verifiedQuote.change24h) >= 0 ? 'text-emerald-500' : 'text-rose-500'
                    }`}>
                      {Number(verifiedQuote.change24h) >= 0 ? '+' : ''}{Number(verifiedQuote.change24h).toFixed(2)}% (24H)
                    </span>
                  )}
                </div>

                <div className="pt-1.5 flex items-center justify-between text-[11px] text-slate-400 font-mono border-t dark:border-slate-800 border-slate-200">
                  <span>Mapping: <strong className="text-cyan-500">{safeSymbol}</strong> &rarr; <strong className="text-indigo-400">{verifiedQuote.symbol}</strong></span>
                  <span>Type: {verifiedQuote.assetType}</span>
                </div>
              </div>
            )}

            {/* Quick Suggestions & Indian Suffixes */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold dark:text-slate-400 text-slate-500">
                  Popular Crypto:
                </span>
                <div className="flex items-center space-x-1 text-[11px]">
                  <span className="text-slate-400">Append:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const base = mappedTickerInput.replace(/\.(NS|BO)$/i, '') || safeSymbol;
                      const newSym = `${base}.NS`;
                      setMappedTickerInput(newSym);
                      fetchLiveQuote(newSym);
                    }}
                    className="font-mono text-cyan-500 hover:underline cursor-pointer"
                  >
                    .NS (NSE)
                  </button>
                  <span className="text-slate-500">|</span>
                  <button
                    type="button"
                    onClick={() => {
                      const base = mappedTickerInput.replace(/\.(NS|BO)$/i, '') || safeSymbol;
                      const newSym = `${base}.BO`;
                      setMappedTickerInput(newSym);
                      fetchLiveQuote(newSym);
                    }}
                    className="font-mono text-cyan-500 hover:underline cursor-pointer"
                  >
                    .BO (BSE)
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_TICKERS.filter((t) => t !== safeSymbol.toUpperCase()).map((ticker) => (
                  <button
                    key={ticker}
                    type="button"
                    onClick={() => {
                      setMappedTickerInput(ticker);
                      fetchLiveQuote(ticker);
                    }}
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
                  <span>{activeTab === 'mapped' ? 'Save & Link Ticker' : 'Save Price'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Advanced API Search & Mapping Modal */}
      {showMappingModal && (
        <ApiMappingModal
          isOpen={showMappingModal}
          onClose={() => setShowMappingModal(false)}
          sourceSymbol={symbol}
          sourceAssetType={isINRAsset ? 'stock' : 'crypto'}
          referencePrice={currentPriceInr || currentPrice}
          currency={isINRAsset ? 'INR' : 'USD'}
          onConfirmMapping={({ mappedSymbol: chosenSymbol, quote: chosenQuote }) => {
            setMappedTickerInput(chosenSymbol);
            if (chosenQuote) setVerifiedQuote(chosenQuote);
            setShowMappingModal(false);
          }}
        />
      )}
    </div>
  );
};
