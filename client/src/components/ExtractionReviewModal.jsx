import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  CheckCircle,
  Trash2,
  Plus,
  ShieldCheck,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Sparkles,
  RefreshCw,
  Hand,
  AlertTriangle,
  Lock,
  Link2,
  Zap,
  DollarSign,
  AlertCircle,
  Info,
} from 'lucide-react';
import api from '../api/axiosInstance';
import { useWallets } from '../context/WalletContext';

/** Tier badge component — subtle indicator of which extraction path was used */
const TierBadge = ({ tier }) => {
  if (!tier) return null;

  const badges = {
    gemini_vision: {
      label: '✨ Extracted via AI Vision',
      className: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-600 dark:text-cyan-400',
    },
    gemini: {
      label: '✨ Extracted via AI',
      className: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-600 dark:text-cyan-400',
    },
    gemini_text: {
      label: '🔁 Extracted via OCR + AI',
      className: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400',
    },
    groq_ocr: {
      label: '🔄 Extracted via OCR fallback',
      className: 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400',
    },
    openrouter_ocr: {
      label: '🌐 Extracted via OpenRouter',
      className: 'bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400',
    },
    manual: {
      label: '✋ Manual entry',
      className: 'bg-slate-500/10 border-slate-500/30 text-slate-500 dark:text-slate-400',
    },
    json_paste: {
      label: '📋 Pasted from JSON',
      className: 'bg-violet-500/10 border-violet-500/30 text-violet-600 dark:text-violet-400',
    },
  };

  const badge = badges[tier];
  if (!badge) return null;

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-[10px] font-semibold tracking-wide ${badge.className}`}>
      {badge.label}
    </span>
  );
};

export const ExtractionReviewModal = ({
  isOpen,
  onClose,
  extractedItems = [],
  defaultWalletId: initialWalletId = '',
  onSaveSuccess,
  tier = null,
  manualFallback = false,
  rawText = '',
}) => {
  const { wallets } = useWallets();
  const [items, setItems] = useState([]);
  const [livePrices, setLivePrices] = useState({});
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [defaultWalletId, setDefaultWalletId] = useState(initialWalletId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Sorting state
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');

  useEffect(() => {
    if (initialWalletId) {
      setDefaultWalletId(initialWalletId);
    } else if (wallets.length > 0) {
      setDefaultWalletId(wallets[0]._id);
    } else {
      setDefaultWalletId('');
    }
  }, [initialWalletId, isOpen, wallets]);

  // Fetch live market quotes for all extracted symbols upon open
  useEffect(() => {
    if (!isOpen) return;

    const symbols = [...new Set(extractedItems.map((it) => it.symbol).filter(Boolean))];
    if (symbols.length === 0) return;

    const fetchQuotes = async () => {
      setLoadingPrices(true);
      try {
        const res = await api.get(`/prices?symbols=${symbols.join(',')}`);
        setLivePrices(res.data.prices || {});
      } catch (err) {
        console.warn('Failed to load market prices for review modal:', err.message);
      } finally {
        setLoadingPrices(false);
      }
    };

    fetchQuotes();
  }, [isOpen, extractedItems]);

  useEffect(() => {
    if (manualFallback) {
      // Manual fallback mode — start with one empty row
      setItems([
        {
          tempId: Date.now(),
          symbol: '',
          quantity: 1,
          extractedPrice: null,
          totalValue: null,
          priceAction: 'live',
          mappedSymbol: '',
          customPrice: '',
          avgBuyPrice: 0,
          assetType: 'crypto',
          walletId: '',
          chain: '',
          walletOrAccount: '',
          notes: 'Manually entered from screenshot',
        },
      ]);
    } else if (extractedItems && extractedItems.length > 0) {
      setItems(
        extractedItems.map((item, idx) => {
          const ep = item.extractedPrice !== undefined && item.extractedPrice !== null ? Number(item.extractedPrice) : null;
          const tv = item.totalValue !== undefined && item.totalValue !== null ? Number(item.totalValue) : null;

          // Default strategy: if extractedPrice exists, choose 'screenshot' to protect user from wrong CMC token matches
          const defaultAction = ep && ep > 0 ? 'screenshot' : 'live';

          return {
            ...item,
            tempId: idx + 1,
            extractedPrice: ep,
            totalValue: tv,
            priceAction: defaultAction, // 'screenshot' | 'live' | 'mapped' | 'custom'
            mappedSymbol: '',
            customPrice: ep ? String(ep) : '',
            walletId: item.walletId || '',
            chain: item.chain || '',
          };
        })
      );
    }
  }, [extractedItems, manualFallback]);

  // Helper to format currency
  const formatUSD = (num) => {
    const n = Number(num);
    if (isNaN(n)) return '—';
    if (n !== 0 && Math.abs(n) < 0.01) {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 6 }).format(n);
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  };

  // Analyze price discrepancies for an item
  const getItemPriceAnalysis = (item) => {
    if (item.assetType === 'cash') {
      return { isMismatch: false, livePrice: 1, diffPct: 0, isUnlisted: false };
    }

    const liveQuote = livePrices[item.symbol?.toUpperCase()];
    const livePrice = typeof liveQuote === 'object' ? Number(liveQuote.price || 0) : Number(liveQuote || 0);
    const screenshotPrice = item.extractedPrice !== null && item.extractedPrice !== undefined ? Number(item.extractedPrice) : null;

    if (screenshotPrice !== null && screenshotPrice > 0) {
      if (livePrice === 0) {
        return { isMismatch: true, livePrice: 0, diffPct: 100, isUnlisted: true };
      }
      const diffPct = (Math.abs(livePrice - screenshotPrice) / screenshotPrice) * 100;
      return { isMismatch: diffPct > 15, livePrice, diffPct, isUnlisted: false };
    }

    return { isMismatch: false, livePrice, diffPct: 0, isUnlisted: livePrice === 0 };
  };

  // Check if any items have price mismatches
  const hasMismatches = useMemo(() => {
    return items.some((it) => getItemPriceAnalysis(it).isMismatch);
  }, [items, livePrices]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      const isNumeric = ['quantity', 'avgBuyPrice', 'extractedPrice', 'totalValue'].includes(field);
      setSortDirection(isNumeric ? 'desc' : 'asc');
    }
  };

  const sortedItems = useMemo(() => {
    if (!sortField) return items;
    return [...items].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (['quantity', 'avgBuyPrice', 'extractedPrice', 'totalValue'].includes(sortField)) {
        valA = Number(valA) || 0;
        valB = Number(valB) || 0;
      } else {
        valA = String(valA || '').toLowerCase();
        valB = String(valB || '').toLowerCase();
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [items, sortField, sortDirection]);

  const renderSortIndicator = (field) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 ml-1 inline text-slate-500 opacity-0 group-hover:opacity-100 transition" />;
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-3 h-3 ml-1 inline text-cyan-400 font-bold" />
    ) : (
      <ChevronDown className="w-3 h-3 ml-1 inline text-cyan-400 font-bold" />
    );
  };

  if (!isOpen) return null;

  const handleFieldChange = (tempId, field, value) => {
    setItems((prevItems) =>
      prevItems.map((it) =>
        it.tempId === tempId
          ? { ...it, [field]: field === 'symbol' ? value.toUpperCase() : value }
          : it
      )
    );
  };

  const handleRemoveRow = (tempId) => {
    setItems((prevItems) => prevItems.filter((it) => it.tempId !== tempId));
  };

  const handleAddEmptyRow = () => {
    setItems([
      ...items,
      {
        tempId: Date.now(),
        symbol: '',
        quantity: 1,
        extractedPrice: null,
        totalValue: null,
        priceAction: 'live',
        mappedSymbol: '',
        customPrice: '',
        avgBuyPrice: 0,
        assetType: 'crypto',
        walletId: defaultWalletId || '',
        chain: '',
        walletOrAccount: 'AI Staging',
        notes: 'Manually added during review stage',
      },
    ]);
  };

  // Bulk actions for all items
  const handleBulkSetStrategy = (strategy) => {
    setItems((prev) =>
      prev.map((it) => ({
        ...it,
        priceAction: strategy,
      }))
    );
  };

  const handleConfirmSave = async () => {
    setError('');

    // Validation check
    const invalidItem = items.find((it) => !it.symbol || !it.quantity || Number(it.quantity) <= 0);
    if (invalidItem) {
      setError('Please ensure all items have a valid Symbol and positive Quantity before saving.');
      return;
    }

    // Validate mapped items
    const invalidMapping = items.find((it) => it.priceAction === 'mapped' && (!it.mappedSymbol || !it.mappedSymbol.trim()));
    if (invalidMapping) {
      setError(`Please specify a target ticker to map for ${invalidMapping.symbol}`);
      return;
    }

    setSaving(true);
    try {
      const res = await api.post('/holdings/batch', {
        holdings: items,
        defaultWalletId: defaultWalletId || null,
      });
      onSaveSuccess(res.data.holdings);
      onClose();
    } catch (err) {
      console.error('Batch Save Error:', err);
      setError(err.response?.data?.message || 'Failed to save extracted holdings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel w-full max-w-6xl rounded-2xl border dark:border-slate-800 border-slate-200 shadow-2xl p-6 relative max-h-[92vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={saving}
          className="absolute top-4 right-4 p-2 text-slate-400 dark:hover:text-white hover:text-slate-900 rounded-xl dark:bg-slate-900/60 bg-slate-100 dark:hover:bg-slate-800 hover:bg-slate-200 border dark:border-slate-800 border-slate-300 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <div className="flex items-center space-x-2 text-amber-500 dark:text-amber-400 text-xs font-semibold uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <span>Mandatory Review Before Saving</span>
              </div>
              <TierBadge tier={tier} />
            </div>
            <h2 className="text-xl font-bold dark:text-white text-slate-900 font-heading">
              {manualFallback ? 'Manual Entry — Extraction Failed' : 'Verify Extracted Holdings & Prices'}
            </h2>
            <p className="text-xs dark:text-slate-400 text-slate-500">
              {manualFallback
                ? "Auto-extraction couldn't parse the screenshot. Use the raw text below as reference and add holdings manually."
                : `Extracted ${items.length} holding${items.length === 1 ? '' : 's'}. Review screenshot prices, resolve any live market mismatches, and assign target wallet.`
              }
            </p>
          </div>

          {/* Bulk Target Wallet Selector */}
          {wallets.length > 0 && (
            <div className="flex items-center space-x-2 dark:bg-slate-900/80 bg-slate-100 px-3 py-2 rounded-xl border dark:border-slate-800 border-slate-300 shadow-inner">
              <span className="text-xs font-semibold dark:text-slate-300 text-slate-700 whitespace-nowrap">Target Wallet:</span>
              <select
                value={defaultWalletId}
                onChange={(e) => setDefaultWalletId(e.target.value)}
                className="dark:bg-slate-950 bg-white dark:text-white text-slate-900 text-xs px-2.5 py-1.5 rounded-lg border dark:border-slate-700 border-slate-300 outline-none cursor-pointer"
              >
                <option value="">Unassigned / Default</option>
                {wallets.map((w) => (
                  <option key={w._id} value={w._id}>
                    {w.name} ({w.type})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Smart Price Mismatch Alert Banner */}
        {hasMismatches && !manualFallback && (
          <div className="mb-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 dark:bg-amber-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start space-x-2.5 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Price Discrepancy Detected</span>
                <p className="text-[11px] dark:text-slate-400 text-slate-600 mt-0.5">
                  Some assets in your screenshot differ from online market quotes (common for wrapped, unlisted, or airdropped tokens). We defaulted to using your exact screenshot price to ensure accurate valuation.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
              <button
                type="button"
                onClick={() => handleBulkSetStrategy('screenshot')}
                className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 dark:text-amber-300 font-bold text-[11px] transition cursor-pointer border border-amber-500/30"
              >
                🔒 Lock All Screenshot Prices
              </button>
              <button
                type="button"
                onClick={() => handleBulkSetStrategy('live')}
                className="px-2.5 py-1.5 rounded-lg dark:bg-slate-800 bg-white hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-[11px] transition cursor-pointer border dark:border-slate-700 border-slate-300"
              >
                ⚡ Use All Live Quotes
              </button>
            </div>
          </div>
        )}

        {/* Manual Fallback: Raw OCR Text Block */}
        {manualFallback && rawText && (
          <div className="mb-4 space-y-2">
            <div className="flex items-center space-x-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>We couldn't auto-extract this screenshot. Here's the text we found — please reference it while filling in holdings below.</span>
            </div>
            <div className="max-h-40 overflow-y-auto p-3 rounded-xl dark:bg-slate-950 bg-slate-100 border dark:border-slate-800 border-slate-200 shadow-inner">
              <pre className="text-xs font-mono dark:text-slate-300 text-slate-700 whitespace-pre-wrap break-words leading-relaxed">
                {rawText}
              </pre>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400 text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Review Table */}
        <div className="overflow-y-auto flex-1 my-1 border dark:border-slate-800 border-slate-200 rounded-xl dark:bg-slate-900/60 bg-white shadow-xs">
          <table className="w-full text-left text-xs dark:text-slate-300 text-slate-700">
            <thead className="dark:bg-slate-900 bg-slate-100 sticky top-0 uppercase font-semibold dark:text-slate-400 text-slate-600 border-b dark:border-slate-800 border-slate-200 select-none z-10">
              <tr>
                <th onClick={() => handleSort('assetType')} className="p-3 cursor-pointer dark:hover:text-white hover:text-slate-900 transition group">
                  <span>Type</span>
                  {renderSortIndicator('assetType')}
                </th>
                <th onClick={() => handleSort('symbol')} className="p-3 cursor-pointer dark:hover:text-white hover:text-slate-900 transition group">
                  <span>Symbol</span>
                  {renderSortIndicator('symbol')}
                </th>
                <th onClick={() => handleSort('chain')} className="p-3 cursor-pointer dark:hover:text-white hover:text-slate-900 transition group">
                  <span>Chain / Network</span>
                  {renderSortIndicator('chain')}
                </th>
                <th onClick={() => handleSort('quantity')} className="p-3 text-right cursor-pointer dark:hover:text-white hover:text-slate-900 transition group">
                  <span>Quantity</span>
                  {renderSortIndicator('quantity')}
                </th>
                <th onClick={() => handleSort('extractedPrice')} className="p-3 text-right cursor-pointer dark:hover:text-white hover:text-slate-900 transition group">
                  <span>Screenshot Price</span>
                  {renderSortIndicator('extractedPrice')}
                </th>
                <th className="p-3 text-right">
                  <span>Live Market Price</span>
                </th>
                <th className="p-3">
                  <span>Price Strategy</span>
                </th>
                <th onClick={() => handleSort('walletOrAccount')} className="p-3 cursor-pointer dark:hover:text-white hover:text-slate-900 transition group">
                  <span>Wallet / Account</span>
                  {renderSortIndicator('walletOrAccount')}
                </th>
                <th className="p-3 text-center">Remove</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-800 divide-slate-200">
              {sortedItems.map((item) => {
                const analysis = getItemPriceAnalysis(item);
                const hasExtractedPrice = item.extractedPrice !== null && item.extractedPrice !== undefined;

                return (
                  <tr
                    key={item.tempId}
                    className={`transition ${
                      analysis.isMismatch
                        ? 'dark:bg-amber-500/5 bg-amber-50/50 hover:bg-amber-500/10'
                        : 'dark:hover:bg-slate-800/50 hover:bg-slate-50'
                    }`}
                  >
                    {/* Asset Type Selector */}
                    <td className="p-2">
                      <select
                        value={item.assetType}
                        onChange={(e) => handleFieldChange(item.tempId, 'assetType', e.target.value)}
                        className="glass-input rounded-lg px-2 py-1 text-xs dark:bg-slate-900 bg-white dark:border-slate-700 border-slate-300 dark:text-white text-slate-900"
                      >
                        <option value="crypto">Crypto</option>
                        <option value="stock">Stock</option>
                        <option value="cash">Cash</option>
                      </select>
                    </td>

                    {/* Symbol */}
                    <td className="p-2">
                      <input
                        type="text"
                        value={item.symbol}
                        onChange={(e) => handleFieldChange(item.tempId, 'symbol', e.target.value)}
                        placeholder="BTC"
                        className="w-16 glass-input rounded-lg px-2 py-1 text-xs font-mono font-bold uppercase text-cyan-600 dark:text-cyan-300"
                      />
                    </td>

                    {/* Chain / Network */}
                    <td className="p-2">
                      <input
                        type="text"
                        value={item.chain || ''}
                        onChange={(e) => handleFieldChange(item.tempId, 'chain', e.target.value)}
                        placeholder="Arbitrum, Ethereum"
                        className="w-24 glass-input rounded-lg px-2 py-1 text-xs"
                      />
                    </td>

                    {/* Quantity */}
                    <td className="p-2 text-right">
                      <input
                        type="number"
                        step="any"
                        value={item.quantity}
                        onChange={(e) => handleFieldChange(item.tempId, 'quantity', e.target.value)}
                        placeholder="0.00"
                        className="w-20 glass-input rounded-lg px-2 py-1 text-xs font-mono text-right"
                      />
                    </td>

                    {/* Extracted Screenshot Price & Total */}
                    <td className="p-2 text-right font-mono">
                      {hasExtractedPrice ? (
                        <div>
                          <span className="font-bold dark:text-slate-200 text-slate-800 block">
                            {formatUSD(item.extractedPrice)}
                          </span>
                          {item.totalValue ? (
                            <span className="text-[10px] text-slate-400 block">
                              Total: {formatUSD(item.totalValue)}
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">—</span>
                      )}
                    </td>

                    {/* Live Market Price from API */}
                    <td className="p-2 text-right font-mono">
                      {item.assetType === 'cash' ? (
                        <span className="dark:text-slate-300 text-slate-700 font-semibold">$1.00</span>
                      ) : (
                        <div>
                          <span className="dark:text-slate-300 text-slate-700 font-semibold block">
                            {analysis.livePrice > 0 ? formatUSD(analysis.livePrice) : <span className="text-amber-500 text-[11px]">Unlisted ($0)</span>}
                          </span>
                          {analysis.isMismatch && hasExtractedPrice && (
                            <span className="text-[10px] font-bold text-amber-500 block">
                              {analysis.isUnlisted ? '⚠️ Unlisted' : `⚠️ ${analysis.diffPct.toFixed(0)}% diff`}
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Price Strategy Selector & Inline Configuration */}
                    <td className="p-2">
                      <div className="flex flex-col gap-1">
                        <select
                          value={item.priceAction || 'live'}
                          onChange={(e) => handleFieldChange(item.tempId, 'priceAction', e.target.value)}
                          className="glass-input rounded-lg px-2 py-1 text-xs dark:bg-slate-900 bg-white dark:border-slate-700 border-slate-300 font-medium"
                        >
                          {hasExtractedPrice && (
                            <option value="screenshot">
                              🔒 Use Screenshot Price ({formatUSD(item.extractedPrice)})
                            </option>
                          )}
                          <option value="live">
                            ⚡ Use Live Market Quote ({analysis.livePrice > 0 ? formatUSD(analysis.livePrice) : 'Auto'})
                          </option>
                          <option value="mapped">🔗 Map to Ticker (e.g. ETH, BTC)</option>
                          <option value="custom">✍️ Custom Fixed Price</option>
                        </select>

                        {/* Inline Ticker Mapping Input */}
                        {item.priceAction === 'mapped' && (
                          <div className="flex items-center space-x-1 mt-0.5">
                            <span className="text-[10px] text-slate-400">Map to:</span>
                            <input
                              type="text"
                              value={item.mappedSymbol || ''}
                              onChange={(e) => handleFieldChange(item.tempId, 'mappedSymbol', e.target.value.toUpperCase())}
                              placeholder="ETH, BTC, SOL"
                              className="w-20 px-1.5 py-0.5 rounded text-xs uppercase font-mono font-bold border border-indigo-500/50 dark:bg-slate-950 bg-white text-indigo-600 dark:text-indigo-400"
                            />
                          </div>
                        )}

                        {/* Inline Custom Price Input */}
                        {item.priceAction === 'custom' && (
                          <div className="flex items-center space-x-1 mt-0.5">
                            <span className="text-[10px] text-slate-400">$</span>
                            <input
                              type="number"
                              step="any"
                              value={item.customPrice !== undefined ? item.customPrice : ''}
                              onChange={(e) => handleFieldChange(item.tempId, 'customPrice', e.target.value)}
                              placeholder="0.00"
                              className="w-20 px-1.5 py-0.5 rounded text-xs font-mono border border-cyan-500/50 dark:bg-slate-950 bg-white text-cyan-600 dark:text-cyan-400"
                            />
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Wallet / Account */}
                    <td className="p-2">
                      <input
                        type="text"
                        value={item.walletOrAccount || ''}
                        onChange={(e) => handleFieldChange(item.tempId, 'walletOrAccount', e.target.value)}
                        placeholder="Binance"
                        className="w-20 glass-input rounded-lg px-2 py-1 text-xs"
                      />
                    </td>

                    {/* Remove Button */}
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(item.tempId)}
                        className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Modal Controls */}
        <div className="pt-3 border-t dark:border-slate-800 border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={handleAddEmptyRow}
            className="flex items-center space-x-1 px-3 py-2 rounded-xl dark:bg-slate-800 bg-slate-100 dark:hover:bg-slate-700 hover:bg-slate-200 border dark:border-slate-700 border-slate-300 dark:text-slate-300 text-slate-700 text-xs font-semibold transition cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span>Add Row</span>
          </button>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl border dark:border-slate-700 border-slate-300 dark:hover:bg-slate-800 hover:bg-slate-200 dark:text-slate-300 text-slate-700 text-xs font-semibold transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleConfirmSave}
              disabled={saving || items.length === 0}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition cursor-pointer disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{saving ? 'Saving to Portfolio...' : `Confirm & Add (${items.length}) Holdings`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
