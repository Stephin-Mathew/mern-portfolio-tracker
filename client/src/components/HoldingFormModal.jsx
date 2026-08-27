import React, { useState, useEffect } from 'react';
import { X, Save, Coins, TrendingUp, Wallet as WalletIcon, Network } from 'lucide-react';
import { useWallets } from '../context/WalletContext';

export const HoldingFormModal = ({ isOpen, onClose, onSave, holdingToEdit, defaultWalletId }) => {
  const { wallets } = useWallets();

  const [formData, setFormData] = useState({
    assetType: 'crypto',
    symbol: '',
    quantity: '',
    avgBuyPrice: '',
    walletId: '',
    walletOrAccount: '',
    chain: '',
    notes: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (holdingToEdit) {
      setFormData({
        assetType: holdingToEdit.assetType || 'crypto',
        symbol: holdingToEdit.symbol || '',
        quantity: holdingToEdit.quantity !== undefined ? holdingToEdit.quantity : '',
        avgBuyPrice: holdingToEdit.avgBuyPrice !== undefined ? holdingToEdit.avgBuyPrice : '',
        walletId: holdingToEdit.walletId || '',
        walletOrAccount: holdingToEdit.walletOrAccount || '',
        chain: holdingToEdit.chain || '',
        notes: holdingToEdit.notes || '',
      });
    } else {
      setFormData({
        assetType: 'crypto',
        symbol: '',
        quantity: '',
        avgBuyPrice: '',
        walletId: defaultWalletId || '',
        walletOrAccount: '',
        chain: '',
        notes: '',
      });
    }
    setError('');
  }, [holdingToEdit, isOpen, defaultWalletId]);

  if (!isOpen) return null;

  const handleWalletSelect = (e) => {
    const selectedId = e.target.value;
    const selectedWallet = wallets.find((w) => w._id === selectedId);
    setFormData((prev) => ({
      ...prev,
      walletId: selectedId,
      walletOrAccount: selectedWallet ? selectedWallet.name : prev.walletOrAccount,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.symbol.trim()) {
      setError('Please enter an asset symbol (e.g., BTC, AAPL, USD)');
      return;
    }

    if (!formData.quantity || Number(formData.quantity) <= 0) {
      setError('Please enter a positive quantity');
      return;
    }

    if (formData.assetType === 'stock' && (!formData.avgBuyPrice || Number(formData.avgBuyPrice) < 0)) {
      setError('Please enter a valid purchase price for stock holdings');
      return;
    }

    setSubmitting(true);
    try {
      await onSave({
        ...formData,
        symbol: formData.symbol.trim().toUpperCase(),
        quantity: Number(formData.quantity),
        avgBuyPrice:
          formData.assetType === 'stock'
            ? formData.avgBuyPrice
              ? Number(formData.avgBuyPrice)
              : 0
            : null,
        walletId: formData.walletId || null,
        chain: formData.chain.trim(),
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save holding');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel w-full max-w-lg rounded-2xl border dark:border-slate-800 border-slate-200 shadow-2xl p-6 relative">
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
            {holdingToEdit ? 'Update details of your existing portfolio entry' : 'Record a cryptocurrency, stock, or cash balance'}
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
            <div className="grid grid-cols-3 gap-2">
              {[
                { type: 'crypto', label: 'Crypto', icon: Coins },
                { type: 'stock', label: 'Stock', icon: TrendingUp },
                { type: 'cash', label: 'Cash', icon: WalletIcon },
              ].map(({ type, label, icon: Icon }) => (
                <button
                  type="button"
                  key={type}
                  onClick={() => setFormData({ ...formData, assetType: type })}
                  className={`flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                    formData.assetType === type
                      ? 'dark:bg-cyan-500/15 bg-cyan-50 dark:border-cyan-500/50 border-cyan-500/60 text-cyan-600 dark:text-cyan-400 shadow-sm shadow-cyan-500/10'
                      : 'dark:bg-slate-900/60 bg-slate-100 dark:border-slate-800 border-slate-300 dark:text-slate-400 text-slate-600 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Crypto Info Hint */}
          {formData.assetType === 'crypto' && (
            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-xs leading-relaxed">
              💡 <strong>Market & Time-Based PnL:</strong> Crypto performance is automatically calculated from historical intervals (yesterday, last week, 30d) — no buy price needed, perfectly tracking airdrops, rewards, and transfers.
            </div>
          )}

          {/* Symbol & Quantity Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold dark:text-slate-300 text-slate-700 uppercase mb-1">
                Asset Ticker / Symbol *
              </label>
              <input
                type="text"
                placeholder="e.g. BTC, ETH, AAPL"
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

          {/* Stock: Avg Buy Price & Wallet / Crypto: Wallet & Network */}
          {formData.assetType === 'stock' ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold dark:text-slate-300 text-slate-700 uppercase mb-1">
                  Avg Buy Price ($) *
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 185.50"
                  value={formData.avgBuyPrice}
                  onChange={(e) => setFormData({ ...formData, avgBuyPrice: e.target.value })}
                  className="w-full glass-input rounded-xl px-3.5 py-2.5 text-sm font-mono"
                  required
                />
              </div>

              {/* Wallet Assignment Dropdown */}
              <div>
                <label className="block text-xs font-semibold dark:text-slate-300 text-slate-700 uppercase mb-1">
                  Assign Wallet / Account
                </label>
                <select
                  value={formData.walletId}
                  onChange={handleWalletSelect}
                  className="w-full glass-input rounded-xl px-3 py-2.5 text-sm dark:bg-slate-900 bg-white dark:text-white text-slate-900 outline-none cursor-pointer"
                >
                  <option value="">Unassigned / General</option>
                  {wallets.map((w) => (
                    <option key={w._id} value={w._id}>
                      {w.name} ({w.type})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold dark:text-slate-300 text-slate-700 uppercase mb-1">
                Assign Wallet / Account
              </label>
              <select
                value={formData.walletId}
                onChange={handleWalletSelect}
                className="w-full glass-input rounded-xl px-3 py-2.5 text-sm dark:bg-slate-900 bg-white dark:text-white text-slate-900 outline-none cursor-pointer"
              >
                <option value="">Unassigned / General</option>
                {wallets.map((w) => (
                  <option key={w._id} value={w._id}>
                    {w.name} ({w.type})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Chain / Network & Custom Account Tag */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold dark:text-slate-300 text-slate-700 uppercase mb-1 flex items-center space-x-1">
                <Network className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                <span>Chain / Network</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Ethereum, Arbitrum, Polygon, BSC, Solana"
                value={formData.chain}
                onChange={(e) => setFormData({ ...formData, chain: e.target.value })}
                className="w-full glass-input rounded-xl px-3.5 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold dark:text-slate-300 text-slate-700 uppercase mb-1">
                Account Tag / Custom Name
              </label>
              <input
                type="text"
                placeholder="e.g. Sub-account #1"
                value={formData.walletOrAccount}
                onChange={(e) => setFormData({ ...formData, walletOrAccount: e.target.value })}
                className="w-full glass-input rounded-xl px-3.5 py-2.5 text-sm"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold dark:text-slate-300 text-slate-700 uppercase mb-1">
              Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Staked on Ledger, Yield pool"
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
              disabled={submitting}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition cursor-pointer disabled:opacity-50"
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
