import React, { useState, useEffect } from 'react';
import { X, Wallet, Coins, Shield, CreditCard, Landmark, Vault, Palette } from 'lucide-react';

const WALLET_TYPES = [
  { id: 'crypto', label: 'Crypto Wallet / Web3', icon: Coins },
  { id: 'stock', label: 'Stock Brokerage', icon: Landmark },
  { id: 'exchange', label: 'Exchange Account', icon: Wallet },
  { id: 'bank', label: 'Bank Account', icon: CreditCard },
  { id: 'other', label: 'Custom / Other', icon: Vault },
];

const PRESET_COLORS = [
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#6366f1', // Indigo
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Red
];

const ICON_OPTIONS = [
  { id: 'wallet', label: 'Wallet', Icon: Wallet },
  { id: 'coins', label: 'Coins', Icon: Coins },
  { id: 'shield', label: 'Shield', Icon: Shield },
  { id: 'credit-card', label: 'Card', Icon: CreditCard },
  { id: 'landmark', label: 'Bank', Icon: Landmark },
  { id: 'vault', label: 'Vault', Icon: Vault },
];

export const WalletFormModal = ({ isOpen, onClose, onSave, walletToEdit }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState('crypto');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#06b6d4');
  const [icon, setIcon] = useState('wallet');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (walletToEdit) {
      setName(walletToEdit.name || '');
      setType(walletToEdit.type || 'crypto');
      setDescription(walletToEdit.description || '');
      setColor(walletToEdit.color || '#06b6d4');
      setIcon(walletToEdit.icon || 'wallet');
    } else {
      setName('');
      setType('crypto');
      setDescription('');
      setColor('#06b6d4');
      setIcon('wallet');
    }
    setError('');
  }, [walletToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a wallet name');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await onSave({
        name: name.trim(),
        type,
        description: description.trim(),
        color,
        icon,
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save wallet');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="glass-panel dark:bg-[#111625] bg-white border dark:border-slate-800 border-slate-200 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Top Gradient bar matching selected color */}
        <div
          className="absolute top-0 left-0 right-0 h-1.5 transition-all duration-300"
          style={{ backgroundColor: color }}
        />

        <div className="flex items-center justify-between pb-4 mb-6 border-b dark:border-slate-800 border-slate-200">
          <div className="flex items-center space-x-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-lg"
              style={{ backgroundColor: `${color}25`, borderColor: `${color}50`, borderWidth: 1 }}
            >
              <Wallet className="w-5 h-5" style={{ color }} />
            </div>
            <div>
              <h2 className="text-xl font-bold dark:text-white text-slate-900 font-heading">
                {walletToEdit ? 'Edit Wallet' : 'Add New Wallet'}
              </h2>
              <p className="text-xs dark:text-slate-400 text-slate-500">Manage individual portfolio accounts & wallets</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl dark:text-slate-400 text-slate-500 dark:hover:text-white hover:text-slate-900 dark:hover:bg-slate-800 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Wallet Name */}
          <div>
            <label className="block text-xs font-semibold dark:text-slate-300 text-slate-700 uppercase tracking-wider mb-2">
              Wallet / Account Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Binance Hot Wallet, Coinbase, Ledger Nano S, Robinhood"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl dark:bg-slate-900 bg-white border dark:border-slate-800 border-slate-300 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 dark:text-white text-slate-900 placeholder-slate-400 text-sm outline-none transition shadow-xs"
              required
            />
          </div>

          {/* Wallet Type */}
          <div>
            <label className="block text-xs font-semibold dark:text-slate-300 text-slate-700 uppercase tracking-wider mb-2">
              Wallet Category / Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {WALLET_TYPES.map((item) => {
                const TypeIcon = item.icon;
                const isSelected = type === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setType(item.id)}
                    className={`flex items-center space-x-2 px-3 py-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                      isSelected
                        ? 'dark:bg-cyan-500/15 bg-cyan-50 border-cyan-500 text-cyan-600 dark:text-cyan-300 shadow-sm'
                        : 'dark:bg-slate-900/60 bg-slate-100 dark:border-slate-800 border-slate-300 dark:text-slate-400 text-slate-600 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    <TypeIcon className={`w-4 h-4 ${isSelected ? 'text-cyan-500 dark:text-cyan-400' : 'dark:text-slate-400 text-slate-500'}`} />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Accent Picker */}
          <div>
            <label className="block text-xs font-semibold dark:text-slate-300 text-slate-700 uppercase tracking-wider mb-2 flex items-center space-x-2">
              <Palette className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>Theme Accent Color</span>
            </label>
            <div className="flex items-center space-x-3">
              {PRESET_COLORS.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => setColor(hex)}
                  className={`w-7 h-7 rounded-full border-2 transition transform hover:scale-110 cursor-pointer ${
                    color === hex ? 'border-cyan-500 scale-110 ring-2 ring-cyan-500/40 shadow-sm' : 'border-transparent opacity-80'
                  }`}
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
          </div>

          {/* Icon Picker */}
          <div>
            <label className="block text-xs font-semibold dark:text-slate-300 text-slate-700 uppercase tracking-wider mb-2">
              Wallet Icon
            </label>
            <div className="flex items-center space-x-2">
              {ICON_OPTIONS.map((item) => {
                const ItemIcon = item.Icon;
                const isSelected = icon === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setIcon(item.id)}
                    className={`p-2.5 rounded-xl border transition cursor-pointer ${
                      isSelected
                        ? 'dark:bg-slate-800 bg-cyan-50 border-cyan-500 text-cyan-600 dark:text-cyan-400 shadow-sm'
                        : 'dark:bg-slate-900 bg-slate-100 dark:border-slate-800 border-slate-300 dark:text-slate-400 text-slate-600 hover:text-slate-900 dark:hover:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    <ItemIcon className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold dark:text-slate-300 text-slate-700 uppercase tracking-wider mb-2">
              Description / Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Staking wallet, long term hold, Robinhood stock account"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 rounded-xl dark:bg-slate-900 bg-white border dark:border-slate-800 border-slate-300 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 dark:text-white text-slate-900 placeholder-slate-400 text-sm outline-none transition shadow-xs"
            />
          </div>

          {/* Submit Actions */}
          <div className="pt-4 flex items-center justify-end space-x-3 border-t dark:border-slate-800 border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl dark:bg-slate-800 bg-slate-100 dark:hover:bg-slate-700 hover:bg-slate-200 dark:text-slate-300 text-slate-700 font-semibold text-xs transition cursor-pointer border dark:border-slate-700 border-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 transition cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Saving...' : walletToEdit ? 'Save Changes' : 'Create Wallet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
