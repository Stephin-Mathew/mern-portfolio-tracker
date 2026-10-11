import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Save, Coins, TrendingUp, DollarSign, Wallet, Layers, Search, Loader2, CheckCircle2 } from 'lucide-react';
import api from '../api/axiosInstance';

// Debounce helper
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export const HoldingFormModal = ({ isOpen, onClose, onSave, holdingToEdit, wallets = [], targetWalletId = '' }) => {
  const [formData, setFormData] = useState({
    assetType: 'crypto',
    symbol: '',
    quantity: '',
    avgBuyPrice: '',
    walletId: '',
    notes: '',
    mfSchemeCode: null,
    mfSchemeName: null,
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Mutual fund scheme search state
  const [mfQuery, setMfQuery] = useState('');
  const [mfResults, setMfResults] = useState([]);
  const [mfSearching, setMfSearching] = useState(false);
  const [mfDropdownOpen, setMfDropdownOpen] = useState(false);
  const [selectedScheme, setSelectedScheme] = useState(null); // { schemeCode, schemeName }
  const mfDropdownRef = useRef(null);

  const debouncedMfQuery = useDebounce(mfQuery, 350);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (mfDropdownRef.current && !mfDropdownRef.current.contains(e.target)) {
        setMfDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Fetch MF search results when query changes
  useEffect(() => {
    if (formData.assetType !== 'mutual_fund' || debouncedMfQuery.length < 2) {
      setMfResults([]);
      setMfDropdownOpen(false);
      return;
    }
    let cancelled = false;
    setMfSearching(true);
    api.get('/prices/mf/search', { params: { q: debouncedMfQuery } })
      .then((res) => {
        if (!cancelled) {
          setMfResults(res.data.results || []);
          setMfDropdownOpen(true);
          setMfSearching(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMfResults([]);
          setMfSearching(false);
        }
      });
    return () => { cancelled = true; };
  }, [debouncedMfQuery, formData.assetType]);

  useEffect(() => {
    if (holdingToEdit) {
      setFormData({
        assetType: holdingToEdit.assetType || 'crypto',
        symbol: holdingToEdit.symbol || '',
        quantity: holdingToEdit.quantity !== undefined ? holdingToEdit.quantity : '',
        avgBuyPrice: holdingToEdit.avgBuyPrice !== undefined ? holdingToEdit.avgBuyPrice : '',
        walletId: holdingToEdit.walletId ? String(holdingToEdit.walletId) : '',
        notes: holdingToEdit.notes || '',
        mfSchemeCode: holdingToEdit.mfSchemeCode || null,
        mfSchemeName: holdingToEdit.mfSchemeName || null,
      });
      if (holdingToEdit.assetType === 'mutual_fund' && holdingToEdit.mfSchemeCode) {
        const scheme = { schemeCode: holdingToEdit.mfSchemeCode, schemeName: holdingToEdit.mfSchemeName || holdingToEdit.symbol };
        setSelectedScheme(scheme);
        setMfQuery(scheme.schemeName || '');
      }
    } else {
      setFormData({
        assetType: 'crypto',
        symbol: '',
        quantity: '',
        avgBuyPrice: '',
        walletId: targetWalletId || '',
        notes: '',
        mfSchemeCode: null,
        mfSchemeName: null,
      });
      setSelectedScheme(null);
      setMfQuery('');
    }
    setError('');
    setMfResults([]);
    setMfDropdownOpen(false);
  }, [holdingToEdit, isOpen, targetWalletId]);

  if (!isOpen) return null;

  const handleAssetTypeChange = (type) => {
    setFormData({ ...formData, assetType: type, mfSchemeCode: null, mfSchemeName: null });
    setSelectedScheme(null);
    setMfQuery('');
    setMfResults([]);
    setMfDropdownOpen(false);
  };

  const handleSelectScheme = (scheme) => {
    setSelectedScheme(scheme);
    setMfQuery(scheme.schemeName);
    // Use scheme code as symbol for MF holdings (routed to MFapi.in on backend)
    setFormData((prev) => ({
      ...prev,
      symbol: scheme.schemeCode,          // numeric code → backend routes to MFapi.in
      mfSchemeCode: scheme.schemeCode,
      mfSchemeName: scheme.schemeName,
    }));
    setMfDropdownOpen(false);
    setMfResults([]);
  };

  const handleClearScheme = () => {
    setSelectedScheme(null);
    setMfQuery('');
    setFormData((prev) => ({ ...prev, symbol: '', mfSchemeCode: null, mfSchemeName: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.assetType === 'mutual_fund') {
      if (!selectedScheme && !formData.mfSchemeCode) {
        setError('Please search and select a mutual fund scheme from the dropdown');
        return;
      }
    } else if (!formData.symbol.trim()) {
      setError('Please enter an asset symbol or fund name (e.g., BTC, AAPL, CANBK)');
      return;
    }

    if (!formData.quantity || Number(formData.quantity) <= 0) {
      setError('Please enter a positive quantity (number of units / shares)');
      return;
    }

    if ((formData.assetType === 'stock' || formData.assetType === 'mutual_fund') && (!formData.avgBuyPrice || Number(formData.avgBuyPrice) < 0)) {
      setError(`Please enter a valid purchase price / NAV for ${formData.assetType === 'mutual_fund' ? 'mutual fund' : 'stock'} holdings`);
      return;
    }

    setSubmitting(true);
    try {
      await onSave({
        ...formData,
        symbol: formData.symbol.trim().toUpperCase(),
        quantity: Number(formData.quantity),
        walletId: formData.walletId || null,
        avgBuyPrice:
          (formData.assetType === 'stock' || formData.assetType === 'mutual_fund')
            ? formData.avgBuyPrice
              ? Number(formData.avgBuyPrice)
              : 0
            : null,
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save holding');
    } finally {
      setSubmitting(false);
    }
  };

  const isMutualFund = formData.assetType === 'mutual_fund';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel w-full max-w-lg rounded-2xl border dark:border-slate-800 border-slate-200 shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 dark:hover:text-white hover:text-slate-900 rounded-xl dark:bg-slate-900/60 bg-slate-100 dark:hover:bg-slate-800 hover:bg-slate-200 border dark:border-slate-800 border-slate-300 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Title */}
        <div className="mb-6">
          <h2 className="text-xl font-bold dark:text-white text-slate-900 font-heading">
            {holdingToEdit ? 'Edit Asset Holding' : 'Add New Asset Holding'}
          </h2>
          <p className="text-xs dark:text-slate-400 text-slate-500 mt-1">
            {holdingToEdit ? 'Update details of your existing portfolio entry' : 'Record a cryptocurrency, stock, mutual fund, or cash balance'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Asset Type Selector */}
          <div>
            <label className="block text-xs font-semibold dark:text-slate-300 text-slate-700 uppercase mb-2">Asset Type</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { type: 'crypto', label: 'Crypto', icon: Coins },
                { type: 'stock', label: 'Stock / ETF', icon: TrendingUp },
                { type: 'mutual_fund', label: 'Mutual Fund', icon: Layers },
                { type: 'cash', label: 'Cash', icon: DollarSign },
              ].map(({ type, label, icon: Icon }) => (
                <button
                  type="button"
                  key={type}
                  onClick={() => handleAssetTypeChange(type)}
                  className={`flex items-center justify-center space-x-1.5 py-2.5 px-2 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                    formData.assetType === type
                      ? 'dark:bg-cyan-500/15 bg-cyan-50 dark:border-cyan-500/50 border-cyan-500/60 text-cyan-600 dark:text-cyan-400 shadow-sm shadow-cyan-500/10'
                      : 'dark:bg-slate-900/60 bg-slate-100 dark:border-slate-800 border-slate-300 dark:text-slate-400 text-slate-600 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Asset-specific info hints */}
          {formData.assetType === 'crypto' && (
            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-xs leading-relaxed">
              💡 <strong>Market &amp; Time-Based PnL:</strong> Crypto performance is automatically calculated from historical intervals — no buy price needed, perfectly tracking airdrops, rewards, and transfers.
            </div>
          )}
          {formData.assetType === 'stock' && (
            <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-400 text-xs leading-relaxed">
              📈 <strong>Yahoo Finance:</strong> Live prices are fetched automatically via Yahoo Finance. Use the standard exchange ticker (e.g. <code className="font-mono">AAPL</code>, <code className="font-mono">RELIANCE.NS</code>, <code className="font-mono">TCS.BO</code>).
            </div>
          )}
          {formData.assetType === 'mutual_fund' && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs leading-relaxed">
              🏦 <strong>MFapi.in (Live NAV):</strong> Search for your Indian mutual fund scheme below. The latest NAV is fetched daily from AMFI via MFapi.in — completely free, no API key required.
            </div>
          )}

          {/* ── Mutual Fund Scheme Search ─────────────────────────────────── */}
          {isMutualFund && (
            <div ref={mfDropdownRef} className="relative">
              <label className="block text-xs font-semibold dark:text-slate-300 text-slate-700 uppercase mb-1">
                Search Mutual Fund Scheme *
              </label>

              {selectedScheme ? (
                /* Selected scheme chip */
                <div className="flex items-start justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                  <div className="flex-1 min-w-0 mr-3">
                    <div className="flex items-center space-x-1.5 mb-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      <span className="text-xs font-bold text-emerald-500 dark:text-emerald-400">Scheme Selected</span>
                    </div>
                    <p className="text-sm font-semibold dark:text-white text-slate-900 leading-snug">{selectedScheme.schemeName}</p>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">Code: {selectedScheme.schemeCode}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearScheme}
                    className="p-1.5 rounded-lg dark:hover:bg-slate-700 hover:bg-slate-200 text-slate-400 hover:text-rose-400 transition flex-shrink-0"
                    title="Change scheme"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                /* Search input */
                <div className="relative">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    {mfSearching
                      ? <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                      : <Search className="w-4 h-4 text-slate-400" />
                    }
                  </div>
                  <input
                    type="text"
                    placeholder="Type fund name, e.g. Parag Parikh, Mirae, SBI Bluechip…"
                    value={mfQuery}
                    onChange={(e) => setMfQuery(e.target.value)}
                    onFocus={() => mfResults.length > 0 && setMfDropdownOpen(true)}
                    className="w-full glass-input rounded-xl pl-9 pr-3.5 py-2.5 text-sm"
                    autoComplete="off"
                  />
                </div>
              )}

              {/* Search results dropdown */}
              {mfDropdownOpen && mfResults.length > 0 && !selectedScheme && (
                <div className="absolute z-50 w-full mt-1 rounded-xl border dark:border-slate-700 border-slate-200 dark:bg-slate-900 bg-white shadow-2xl shadow-black/30 max-h-56 overflow-y-auto">
                  {mfResults.slice(0, 20).map((scheme) => (
                    <button
                      type="button"
                      key={scheme.schemeCode}
                      onClick={() => handleSelectScheme(scheme)}
                      className="w-full text-left px-4 py-3 hover:dark:bg-slate-800 hover:bg-slate-50 transition border-b dark:border-slate-800 border-slate-100 last:border-0 group"
                    >
                      <p className="text-xs font-semibold dark:text-white text-slate-900 leading-snug group-hover:text-cyan-500 dark:group-hover:text-cyan-400 transition">
                        {scheme.schemeName}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5 font-mono">Code: {scheme.schemeCode}</p>
                    </button>
                  ))}
                  {mfResults.length > 20 && (
                    <div className="px-4 py-2 text-xs text-slate-400 text-center">
                      Showing top 20 of {mfResults.length} results — refine your search
                    </div>
                  )}
                </div>
              )}

              {mfDropdownOpen && !mfSearching && mfResults.length === 0 && mfQuery.length >= 2 && (
                <div className="absolute z-50 w-full mt-1 rounded-xl border dark:border-slate-700 border-slate-200 dark:bg-slate-900 bg-white shadow-xl p-4 text-center">
                  <p className="text-xs text-slate-400">No schemes found for "<strong>{mfQuery}</strong>"</p>
                </div>
              )}
            </div>
          )}

          {/* ── Symbol & Quantity Grid (non-MF) ──────────────────────────── */}
          {!isMutualFund && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold dark:text-slate-300 text-slate-700 uppercase mb-1">
                  Asset Ticker / Symbol *
                </label>
                <input
                  type="text"
                  placeholder={formData.assetType === 'stock' ? 'e.g. AAPL, RELIANCE.NS' : 'e.g. BTC, ETH, SOL'}
                  value={formData.symbol}
                  onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                  className="w-full glass-input rounded-xl px-3.5 py-2.5 text-sm uppercase font-mono font-bold"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold dark:text-slate-300 text-slate-700 uppercase mb-1">
                  Quantity *
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  className="w-full glass-input rounded-xl px-3.5 py-2.5 text-sm font-mono"
                  required
                />
              </div>
            </div>
          )}

          {/* Quantity for Mutual Funds (separate row, full width) */}
          {isMutualFund && (
            <div>
              <label className="block text-xs font-semibold dark:text-slate-300 text-slate-700 uppercase mb-1">
                Units Held *
              </label>
              <input
                type="number"
                step="any"
                placeholder="e.g. 245.678"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                className="w-full glass-input rounded-xl px-3.5 py-2.5 text-sm font-mono"
                required
              />
            </div>
          )}

          {/* Stock & Mutual Fund: Avg Buy Price */}
          {(formData.assetType === 'stock' || formData.assetType === 'mutual_fund') && (
            <div>
              <label className="block text-xs font-semibold dark:text-slate-300 text-slate-700 uppercase mb-1">
                {formData.assetType === 'mutual_fund' ? 'Avg Purchase NAV (₹) *' : 'Avg Buy Price (USD / ₹) *'}
              </label>
              <input
                type="number"
                step="any"
                placeholder={formData.assetType === 'mutual_fund' ? 'e.g. 85.50' : 'e.g. 185.50'}
                value={formData.avgBuyPrice}
                onChange={(e) => setFormData({ ...formData, avgBuyPrice: e.target.value })}
                className="w-full glass-input rounded-xl px-3.5 py-2.5 text-sm font-mono"
                required
              />
              {formData.assetType === 'mutual_fund' && (
                <p className="text-xs text-slate-400 mt-1">
                  Enter the average NAV per unit at the time of purchase (in ₹). Current NAV is fetched live.
                </p>
              )}
            </div>
          )}

          {/* Destination Wallet */}
          {wallets && wallets.length > 0 && (
            <div>
              <label className="block text-xs font-semibold dark:text-slate-300 text-slate-700 uppercase mb-1 flex items-center space-x-1.5">
                <Wallet className="w-3.5 h-3.5 text-cyan-500" />
                <span>Destination Wallet / Account</span>
              </label>
              <select
                value={formData.walletId}
                onChange={(e) => setFormData({ ...formData, walletId: e.target.value })}
                className="w-full glass-input rounded-xl px-3.5 py-2.5 text-sm font-medium dark:bg-slate-900 bg-white dark:border-slate-700 border-slate-300 dark:text-white text-slate-900"
              >
                <option value="">None (Unassigned / General Portfolio)</option>
                {wallets.map((w) => (
                  <option key={w._id} value={w._id}>
                    {w.name} ({w.type})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold dark:text-slate-300 text-slate-700 uppercase mb-1">
              Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. SIP, Staked on Ledger, Yield pool"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full glass-input rounded-xl px-3.5 py-2.5 text-sm"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t dark:border-slate-800 border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border dark:border-slate-700 border-slate-300 dark:hover:bg-slate-800 hover:bg-slate-200 dark:text-slate-300 text-slate-700 text-xs font-semibold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || (isMutualFund && !selectedScheme && !formData.mfSchemeCode)}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              <span>{submitting ? 'Saving...' : holdingToEdit ? 'Update Holding' : 'Save Holding'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
