import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Coins,
  Layers,
  ArrowRight,
  Loader2,
  RefreshCw,
  ExternalLink,
  Sparkles,
  Check,
  Zap,
} from 'lucide-react';
import api from '../api/axiosInstance';

export const ApiMappingModal = ({
  isOpen,
  onClose,
  sourceSymbol = '',
  sourceName = '',
  sourceAssetType = 'stock',
  referencePrice = null,
  currency = 'INR',
  onConfirmMapping,
}) => {
  const [assetType, setAssetType] = useState(sourceAssetType || 'stock');
  const [targetSymbol, setTargetSymbol] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [quote, setQuote] = useState(null);

  // MF variants and auto-selection state
  const [mfSearchQuery, setMfSearchQuery] = useState('');
  const [mfVariants, setMfVariants] = useState([]);
  const [selectedMfVariant, setSelectedMfVariant] = useState(null);
  const [mfSearching, setMfSearching] = useState(false);
  const [showAllVariants, setShowAllVariants] = useState(true);

  const safeSourceSymbol = String(sourceSymbol || '');

  const fetchQuote = async (symbolToFetch, typeToUse) => {
    const sym = String(symbolToFetch || targetSymbol || '').trim();
    if (!sym) {
      setError('Please enter a symbol or scheme code');
      return;
    }

    setLoading(true);
    setError('');
    setQuote(null);

    try {
      const type = typeToUse || assetType;
      const res = await api.get(`/prices/quote/${encodeURIComponent(sym)}?assetType=${type}&referencePrice=${referencePrice || ''}`);
      if (res.data?.found) {
        setQuote(res.data);
        if (res.data.suggestedSymbol && res.data.suggestedSymbol !== sym) {
          setTargetSymbol(res.data.suggestedSymbol);
        }
      } else {
        setError(res.data?.message || `No price quote found for ${sym}`);
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
        `Could not fetch live quote for "${sym}". For Indian stocks, try appending .NS (e.g. ${sym}.NS).`
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch all variants for the mutual fund (Direct, Regular, Growth, IDCW),
   * along with their live NAVs, and auto-select the variant closest to referencePrice.
   */
  const fetchMfVariants = async (queryText) => {
    const q = String(queryText || '').trim();
    if (!q || q.length < 2) return;

    setMfSearching(true);
    setError('');

    try {
      const res = await api.get('/prices/mf/variants', {
        params: {
          q,
          referencePrice: referencePrice ? Number(referencePrice) : undefined,
        },
      });

      const { variants = [], bestMatch } = res.data || {};
      setMfVariants(variants);

      if (bestMatch) {
        setSelectedMfVariant(bestMatch);
        setTargetSymbol(String(bestMatch.schemeCode));
        setQuote({
          found: true,
          symbol: String(bestMatch.schemeCode),
          suggestedSymbol: String(bestMatch.schemeCode),
          assetType: 'mutual_fund',
          source: 'MFapi.in',
          currency: 'INR',
          price: bestMatch.price,
          priceInr: bestMatch.navInr,
          navInr: bestMatch.navInr,
          schemeName: bestMatch.schemeName,
          change24h: bestMatch.change24h || 0,
          change7d: bestMatch.change7d || 0,
          change30d: bestMatch.change30d || 0,
          formattedPrice: bestMatch.formattedPrice,
          diffPct: bestMatch.diffPct,
          diffAbs: bestMatch.diffAbs,
          isClosestMatch: true,
        });
      } else {
        setError(`No mutual fund schemes found matching "${q}"`);
      }
    } catch (err) {
      console.warn('Failed to fetch MF variants:', err);
      setError(err.response?.data?.message || `Could not fetch variants for "${q}"`);
    } finally {
      setMfSearching(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const initialType = sourceAssetType || 'stock';
      setAssetType(initialType);
      setError('');
      setQuote(null);
      setMfVariants([]);
      setSelectedMfVariant(null);

      const defaultSearch = (sourceName || safeSourceSymbol).trim();
      setMfSearchQuery(defaultSearch);

      if (initialType === 'mutual_fund') {
        if (defaultSearch) {
          fetchMfVariants(defaultSearch);
        }
      } else {
        // Auto-suggest stock / crypto target symbol
        let defaultTarget = safeSourceSymbol.trim().toUpperCase();
        if (initialType === 'stock' && defaultTarget && !defaultTarget.includes('.')) {
          defaultTarget = `${defaultTarget}.NS`;
        }
        setTargetSymbol(defaultTarget);
        if (defaultTarget) {
          fetchQuote(defaultTarget, initialType);
        }
      }
    }
  }, [isOpen, safeSourceSymbol, sourceName, sourceAssetType]);

  // Debounced search for mutual funds when user changes query manually
  useEffect(() => {
    if (assetType !== 'mutual_fund' || !mfSearchQuery || mfSearchQuery.trim().length < 2) {
      return;
    }

    const timer = setTimeout(() => {
      fetchMfVariants(mfSearchQuery);
    }, 450);

    return () => clearTimeout(timer);
  }, [mfSearchQuery, assetType]);

  const handleSelectVariant = (variant) => {
    setSelectedMfVariant(variant);
    setTargetSymbol(String(variant.schemeCode));
    setQuote({
      found: true,
      symbol: String(variant.schemeCode),
      suggestedSymbol: String(variant.schemeCode),
      assetType: 'mutual_fund',
      source: 'MFapi.in',
      currency: 'INR',
      price: variant.price,
      priceInr: variant.navInr,
      navInr: variant.navInr,
      schemeName: variant.schemeName,
      change24h: variant.change24h || 0,
      change7d: variant.change7d || 0,
      change30d: variant.change30d || 0,
      formattedPrice: variant.formattedPrice,
      diffPct: variant.diffPct,
      diffAbs: variant.diffAbs,
      isClosestMatch: variant.isClosestMatch,
    });
  };

  const handleAppendSuffix = (suffix) => {
    let base = targetSymbol.replace(/\.(NS|BO)$/i, '');
    const newSym = `${base}${suffix}`;
    setTargetSymbol(newSym);
    fetchQuote(newSym, 'stock');
  };

  const handleConfirm = () => {
    if (!quote) return;
    onConfirmMapping({
      sourceSymbol: sourceSymbol.toUpperCase(),
      mappedSymbol: quote.symbol || targetSymbol.toUpperCase(),
      assetType,
      quote,
      price: quote.price,
      priceInr: quote.priceInr || quote.navInr,
      currency: quote.currency || (assetType === 'crypto' ? 'USD' : 'INR'),
      schemeName: quote.schemeName || null,
    });
    onClose();
  };

  // Compare live price against reference price (screenshot LTP)
  const renderPriceDiff = () => {
    if (!referencePrice || !quote) return null;
    const ref = Number(referencePrice);
    const live = quote.currency === 'INR' && quote.priceInr ? Number(quote.priceInr) : Number(quote.price);
    if (!ref || !live) return null;

    const diffPct = ((Math.abs(live - ref) / ref) * 100).toFixed(2);
    const isClose = diffPct < 3;

    return (
      <div className={`mt-2 p-2 rounded-lg text-xs flex items-center justify-between border ${
        isClose
          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
          : 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
      }`}>
        <span>
          Original / Screenshot Price: <strong>{quote.currency === 'INR' ? `₹${ref.toFixed(2)}` : `$${ref.toFixed(2)}`}</strong>
        </span>
        <span className="font-bold">
          {isClose ? `✅ Match (${diffPct}% diff)` : `⚠️ ${diffPct}% variance`}
        </span>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel w-full max-w-lg rounded-2xl border dark:border-slate-800 border-slate-200 shadow-2xl p-6 relative flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 dark:hover:text-white hover:text-slate-900 rounded-xl dark:bg-slate-900/60 bg-slate-100 dark:hover:bg-slate-800 hover:bg-slate-200 border dark:border-slate-800 border-slate-300 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div>
          <div className="flex items-center space-x-2 text-cyan-600 dark:text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Live API Price Verification</span>
          </div>
          <h2 className="text-xl font-bold dark:text-white text-slate-900 font-heading">
            Map & Verify Price for <span className="font-mono text-cyan-500">{sourceName || sourceSymbol || 'Asset'}</span>
          </h2>
          <p className="text-xs dark:text-slate-400 text-slate-500 mt-0.5">
            Query MFapi.in, Yahoo Finance, or CoinMarketCap to automatically select the matching plan variant and test live quotes.
          </p>
        </div>

        {/* Asset Type Selector Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl dark:bg-slate-900/80 bg-slate-100 border dark:border-slate-800 border-slate-300">
          {[
            { id: 'stock', label: 'Stock / ETF', icon: TrendingUp },
            { id: 'mutual_fund', label: 'Mutual Fund', icon: Layers },
            { id: 'crypto', label: 'Crypto', icon: Coins },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setAssetType(id);
                setQuote(null);
                setError('');
                if (id === 'mutual_fund') {
                  const defaultSearch = (sourceName || safeSourceSymbol).trim();
                  setMfSearchQuery(defaultSearch);
                  if (defaultSearch) fetchMfVariants(defaultSearch);
                } else if (id === 'stock' && targetSymbol && !targetSymbol.includes('.')) {
                  setTargetSymbol(`${targetSymbol}.NS`);
                }
              }}
              className={`flex items-center justify-center space-x-1.5 py-2 px-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                assetType === id
                  ? 'dark:bg-slate-800 bg-white text-cyan-600 dark:text-cyan-400 shadow-sm border dark:border-slate-700 border-slate-200'
                  : 'dark:text-slate-400 text-slate-600 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Stock / ETF Input Section */}
        {assetType === 'stock' && (
          <div className="space-y-2">
            <label className="block text-xs font-semibold dark:text-slate-300 text-slate-700 uppercase tracking-wider">
              Stock Ticker (Yahoo Finance)
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={targetSymbol}
                onChange={(e) => setTargetSymbol(e.target.value.toUpperCase())}
                placeholder="e.g. CANBK.NS, RELIANCE.NS, AAPL"
                onKeyDown={(e) => e.key === 'Enter' && fetchQuote(targetSymbol, 'stock')}
                className="flex-1 px-3.5 py-2.5 rounded-xl dark:bg-slate-900 bg-white border dark:border-slate-700 border-slate-300 dark:text-white text-slate-900 text-sm font-mono font-bold uppercase outline-none focus:border-cyan-500 shadow-xs"
              />
              <button
                type="button"
                onClick={() => fetchQuote(targetSymbol, 'stock')}
                disabled={loading || !targetSymbol.trim()}
                className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition cursor-pointer disabled:opacity-50 shrink-0"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                <span>Fetch Price</span>
              </button>
            </div>

            {/* Quick Suffix Helpers for Indian NSE/BSE */}
            <div className="flex items-center space-x-1.5 pt-1">
              <span className="text-[11px] text-slate-400">Indian Exchanges:</span>
              <button
                type="button"
                onClick={() => handleAppendSuffix('.NS')}
                className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold dark:bg-slate-800 bg-slate-200 hover:text-cyan-500 transition cursor-pointer"
              >
                + .NS (NSE)
              </button>
              <button
                type="button"
                onClick={() => handleAppendSuffix('.BO')}
                className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold dark:bg-slate-800 bg-slate-200 hover:text-cyan-500 transition cursor-pointer"
              >
                + .BO (BSE)
              </button>
            </div>
          </div>
        )}

        {/* Mutual Fund Input & Variants Section */}
        {assetType === 'mutual_fund' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold dark:text-slate-300 text-slate-700 uppercase tracking-wider mb-1.5">
                Mutual Fund Name or Scheme Code
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  {mfSearching ? (
                    <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4 text-slate-400" />
                  )}
                </div>
                <input
                  type="text"
                  value={mfSearchQuery}
                  onChange={(e) => setMfSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchMfVariants(mfSearchQuery)}
                  placeholder="e.g. Parag Parikh Flexi Cap, Quant Small Cap..."
                  className="w-full pl-9 pr-24 py-2.5 rounded-xl dark:bg-slate-900 bg-white border dark:border-slate-700 border-slate-300 dark:text-white text-slate-900 text-xs outline-none focus:border-cyan-500 shadow-xs"
                />
                <button
                  type="button"
                  onClick={() => fetchMfVariants(mfSearchQuery)}
                  disabled={mfSearching || !mfSearchQuery.trim()}
                  className="absolute right-1.5 top-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition cursor-pointer disabled:opacity-50 flex items-center space-x-1"
                >
                  {mfSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  <span>Search</span>
                </button>
              </div>
            </div>

            {/* Auto-Match Highlight Banner */}
            {selectedMfVariant && (
              <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-transparent border border-emerald-500/30 dark:border-emerald-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      Auto-Selected Closest Variant
                    </span>
                  </div>
                  {referencePrice && (
                    <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400">
                      Screenshot: <strong className="text-slate-800 dark:text-slate-200">₹{Number(referencePrice).toFixed(2)}</strong>
                    </span>
                  )}
                </div>

                <div className="mt-1 flex items-baseline justify-between gap-2">
                  <p className="text-xs font-semibold dark:text-white text-slate-900 line-clamp-1">
                    {selectedMfVariant.schemeName}
                  </p>
                  <span className="text-xs font-mono font-extrabold text-emerald-600 dark:text-emerald-400 shrink-0">
                    NAV ₹{selectedMfVariant.navInr.toFixed(2)}
                  </span>
                </div>

                {selectedMfVariant.diffPct !== null && (
                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1 font-mono">
                      <span>Scheme Code:</span>
                      <strong className="text-cyan-500">{selectedMfVariant.schemeCode}</strong>
                      <span className="px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-500 text-[10px] uppercase font-bold">
                        {selectedMfVariant.planType} • {selectedMfVariant.optionType}
                      </span>
                    </span>
                    <span className={`font-bold ${
                      Number(selectedMfVariant.diffPct) < 3 ? 'text-emerald-500' : 'text-amber-500'
                    }`}>
                      {Number(selectedMfVariant.diffPct) < 3 ? '✅' : '⚠️'} {selectedMfVariant.diffPct}% diff from screenshot
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Variants Selector List */}
            {mfVariants.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                    <Layers className="w-3.5 h-3.5 text-cyan-400" />
                    <span>All Plan Variants ({mfVariants.length} Found)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAllVariants(!showAllVariants)}
                    className="text-[11px] text-cyan-500 hover:text-cyan-400 font-semibold cursor-pointer"
                  >
                    {showAllVariants ? 'Collapse' : 'Show All'}
                  </button>
                </div>

                {showAllVariants && (
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 rounded-xl border dark:border-slate-800 border-slate-200 p-1.5 dark:bg-slate-900/60 bg-slate-50/60">
                    {mfVariants.map((v) => {
                      const isSelected = selectedMfVariant?.schemeCode === v.schemeCode;
                      const isClosest = v.isClosestMatch;
                      return (
                        <button
                          key={v.schemeCode}
                          type="button"
                          onClick={() => handleSelectVariant(v)}
                          className={`w-full text-left p-2.5 rounded-lg border transition cursor-pointer flex flex-col gap-1 ${
                            isSelected
                              ? 'border-emerald-500/60 dark:bg-emerald-500/10 bg-emerald-50 shadow-xs'
                              : 'border-slate-200 dark:border-slate-800 dark:bg-slate-900 bg-white hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center space-x-1.5 overflow-hidden">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase shrink-0 ${
                                v.planType === 'Direct'
                                  ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                                  : 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/30'
                              }`}>
                                {v.planType}
                              </span>
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase shrink-0 ${
                                v.optionType === 'Growth'
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                  : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                              }`}>
                                {v.optionType}
                              </span>
                              {isClosest && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 shrink-0">
                                  🎯 Closest Match
                                </span>
                              )}
                            </div>

                            <div className="flex items-center space-x-2 shrink-0">
                              <span className="font-mono font-bold text-xs dark:text-white text-slate-900">
                                ₹{v.navInr.toFixed(2)}
                              </span>
                              {isSelected && (
                                <span className="p-0.5 rounded-full bg-emerald-500 text-slate-950">
                                  <Check className="w-3 h-3" />
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                            <span className="truncate pr-2">{v.schemeName}</span>
                            {v.diffPct !== null && (
                              <span className={`font-mono font-bold shrink-0 text-[10px] ${
                                Number(v.diffPct) < 3 ? 'text-emerald-500' : 'text-slate-400'
                              }`}>
                                {v.diffPct}% diff
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Crypto Input Section */}
        {assetType === 'crypto' && (
          <div className="space-y-2">
            <label className="block text-xs font-semibold dark:text-slate-300 text-slate-700 uppercase tracking-wider">
              Crypto Market Ticker (CoinMarketCap / CoinGecko)
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={targetSymbol}
                onChange={(e) => setTargetSymbol(e.target.value.toUpperCase())}
                placeholder="e.g. BTC, ETH, SOL, HYPE"
                onKeyDown={(e) => e.key === 'Enter' && fetchQuote(targetSymbol, 'crypto')}
                className="flex-1 px-3.5 py-2.5 rounded-xl dark:bg-slate-900 bg-white border dark:border-slate-700 border-slate-300 dark:text-white text-slate-900 text-sm font-mono font-bold uppercase outline-none focus:border-cyan-500 shadow-xs"
              />
              <button
                type="button"
                onClick={() => fetchQuote(targetSymbol, 'crypto')}
                disabled={loading || !targetSymbol.trim()}
                className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition cursor-pointer disabled:opacity-50 shrink-0"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                <span>Fetch Price</span>
              </button>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Verified Quote Preview Card */}
        {quote && (
          <div className="p-4 rounded-xl dark:bg-slate-900/90 bg-slate-50 border dark:border-cyan-500/30 border-cyan-500/40 shadow-lg space-y-2 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">
                  Live Quote Verified
                </span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold dark:bg-slate-800 bg-slate-200 text-slate-600 dark:text-slate-300 border dark:border-slate-700 border-slate-300">
                Source: {quote.source}
              </span>
            </div>

            {quote.schemeName && (
              <p className="text-xs font-semibold dark:text-white text-slate-900 leading-snug">
                {quote.schemeName}
              </p>
            )}

            <div className="flex items-baseline justify-between pt-1">
              <div>
                <span className="text-2xl font-extrabold font-mono dark:text-white text-slate-900">
                  {quote.formattedPrice}
                </span>
                <span className="text-xs text-slate-400 font-mono ml-2">
                  ({quote.currency})
                </span>
              </div>

              {quote.change24h !== undefined && (
                <span className={`text-xs font-bold font-mono ${
                  quote.change24h >= 0 ? 'text-emerald-500' : 'text-rose-500'
                }`}>
                  {quote.change24h >= 0 ? '+' : ''}{quote.change24h.toFixed(2)}% (24H)
                </span>
              )}
            </div>

            {/* Comparison against screenshot / original reference price */}
            {renderPriceDiff()}

            <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 font-mono border-t dark:border-slate-800 border-slate-200">
              <span>Mapping: <strong className="text-cyan-500">{sourceSymbol || 'Asset'}</strong> &rarr; <strong className="text-indigo-400">{quote.symbol}</strong></span>
              <span>Type: {quote.assetType}</span>
            </div>
          </div>
        )}

        {/* Modal Action Buttons */}
        <div className="pt-3 border-t dark:border-slate-800 border-slate-200 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border dark:border-slate-700 border-slate-300 dark:hover:bg-slate-800 hover:bg-slate-200 text-xs font-semibold transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={!quote}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Check className="w-4 h-4" />
            <span>Confirm & Map to {quote ? quote.symbol : 'Symbol'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
