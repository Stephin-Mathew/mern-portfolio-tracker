import React, { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useWallets } from '../context/WalletContext';
import {
  ArrowLeft, Plus, Edit2, Trash2, IndianRupee, Wallet,
  Banknote, Smartphone, PiggyBank, CreditCard, MoreHorizontal,
  TrendingUp, X, Save,
} from 'lucide-react';
import api from '../api/axiosInstance';

// ─── Color palette for dynamically styled destinations ────────────────
const DESTINATION_PALETTE = [
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#f59e0b', // amber
  '#f97316', // orange
  '#6366f1', // indigo
  '#14b8a6', // teal
  '#e11d48', // rose
];

// Helper: resolve icon and color dynamically based on destination text
function getDestinationMeta(destinationName = '') {
  const norm = String(destinationName || '').toLowerCase().trim();
  let Icon = Banknote;

  if (
    norm.includes('pay') ||
    norm.includes('gpay') ||
    norm.includes('phonepe') ||
    norm.includes('paytm') ||
    norm.includes('upi') ||
    norm.includes('app') ||
    norm.includes('digital')
  ) {
    Icon = Smartphone;
  } else if (
    norm.includes('bank') ||
    norm.includes('saving') ||
    norm.includes('account') ||
    norm.includes('current') ||
    norm.includes('sbi') ||
    norm.includes('hdfc') ||
    norm.includes('icici') ||
    norm.includes('axis') ||
    norm.includes('kotak')
  ) {
    Icon = PiggyBank;
  } else if (norm.includes('card') || norm.includes('credit') || norm.includes('debit')) {
    Icon = CreditCard;
  } else if (norm.includes('fd') || norm.includes('deposit') || norm.includes('interest')) {
    Icon = TrendingUp;
  } else if (
    norm.includes('safe') ||
    norm.includes('locker') ||
    norm.includes('vault') ||
    norm.includes('box')
  ) {
    Icon = Vault;
  } else if (
    norm.includes('purse') ||
    norm.includes('wallet') ||
    norm.includes('pocket') ||
    norm.includes('drawer') ||
    norm.includes('cash') ||
    norm.includes('hand')
  ) {
    Icon = Banknote;
  } else {
    Icon = MoreHorizontal;
  }

  // Consistent vibrant color hash
  let hash = 0;
  for (let i = 0; i < norm.length; i++) {
    hash = norm.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = DESTINATION_PALETTE[Math.abs(hash) % DESTINATION_PALETTE.length];

  return {
    icon: Icon,
    color,
    label: destinationName?.trim() || 'General Cash',
  };
}

// ─── Decode destination and note from holding ──────────────────────────
function decodeEntry(holding) {
  // 1. Direct walletOrAccount field
  if (holding.walletOrAccount && holding.walletOrAccount.trim()) {
    return {
      destination: holding.walletOrAccount.trim(),
      userNote: holding.notes ? holding.notes.replace(/^location:[^|]+(\|\s*)?/, '').trim() : '',
    };
  }

  // 2. Encoded notes: location:<destination> | <notes>
  const noteStr = holding.notes || '';
  const locMatch = noteStr.match(/^location:([^|\n]+?)(?:\s\|\s(.*))?$/);
  if (locMatch) {
    const rawLoc = locMatch[1].trim();
    const legacyMap = {
      purse: 'Purse / Wallet',
      gpay: 'Google Pay',
      phonepe: 'PhonePe',
      paytm: 'Paytm',
      savings: 'Savings Account',
      current: 'Current Account',
      fd: 'Fixed Deposit',
      other: 'Other Cash',
    };
    return {
      destination: legacyMap[rawLoc] || rawLoc,
      userNote: locMatch[2] ? locMatch[2].trim() : '',
    };
  }

  return {
    destination: 'Purse / Cash in Hand',
    userNote: noteStr,
  };
}

// ─── Add / Edit Cash Modal ─────────────────────────────────────────────
function CashEntryModal({ isOpen, onClose, onSave, entryToEdit, walletId, existingDestinations = [] }) {
  const [destination, setDestination] = useState('');
  const [amount, setAmount]           = useState('');
  const [notes, setNotes]             = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState('');

  React.useEffect(() => {
    if (entryToEdit) {
      setAmount(entryToEdit.quantity ?? '');
      const { destination: dest, userNote } = decodeEntry(entryToEdit);
      setDestination(dest);
      setNotes(userNote);
    } else {
      setAmount('');
      setDestination('');
      setNotes('');
    }
    setError('');
  }, [entryToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedDest = destination.trim();
    if (!trimmedDest) {
      setError('Please enter where this cash is held (e.g. Purse, Google Pay, HDFC Account)');
      return;
    }

    const amt = Number(amount);
    if (!amt || amt <= 0) {
      setError('Please enter a valid amount (> 0)');
      return;
    }

    const notesEncoded = notes.trim()
      ? `location:${trimmedDest} | ${notes.trim()}`
      : `location:${trimmedDest}`;

    setSubmitting(true);
    try {
      await onSave({
        assetType: 'cash',
        symbol: 'INR',
        quantity: amt,
        walletId,
        walletOrAccount: trimmedDest,
        notes: notesEncoded,
        currency: 'INR',
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save cash entry');
    } finally {
      setSubmitting(false);
    }
  };

  const meta = getDestinationMeta(destination || 'Cash');
  const DestinationIcon = meta.icon;

  // Helpful quick suggestion pills (user's existing destinations + common starters)
  const defaultSuggestions = ['Purse', 'Google Pay', 'PhonePe', 'Bank Savings', 'Home Locker'];
  const suggestionList = Array.from(new Set([...existingDestinations, ...defaultSuggestions])).slice(0, 6);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="glass-panel w-full max-w-md rounded-3xl border dark:border-slate-800 border-slate-200 shadow-2xl p-6 relative">
        <div className="absolute top-0 left-0 right-0 h-1.5 rounded-t-3xl" style={{ backgroundColor: meta.color }} />
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl dark:bg-slate-900/60 bg-slate-100 dark:hover:bg-slate-800 hover:bg-slate-200 border dark:border-slate-800 border-slate-300 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="mb-6 flex items-center space-x-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all"
            style={{ backgroundColor: `${meta.color}20`, border: `1px solid ${meta.color}40` }}
          >
            <DestinationIcon className="w-5 h-5 transition-all" style={{ color: meta.color }} />
          </div>
          <div>
            <h2 className="text-lg font-bold dark:text-white text-slate-900 font-heading">
              {entryToEdit ? 'Edit Cash Entry' : 'Add Cash Balance'}
            </h2>
            <p className="text-xs dark:text-slate-400 text-slate-500">
              Record your INR cash and where you are holding it
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Destination input */}
          <div>
            <label className="block text-xs font-semibold dark:text-slate-300 text-slate-700 uppercase mb-1 flex items-center justify-between">
              <span>Where is this cash? (Destination) *</span>
              {destination.trim() && (
                <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full" style={{ backgroundColor: `${meta.color}20`, color: meta.color }}>
                  {meta.label}
                </span>
              )}
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. Purse, Google Pay, HDFC Savings, Locker, Drawer…"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full glass-input rounded-xl px-3.5 py-2.5 text-sm font-semibold"
                autoFocus
                required
              />
            </div>

            {/* Quick destination suggestion pills */}
            <div className="mt-2">
              <div className="text-[10px] uppercase font-bold text-slate-400 mb-1.5">Quick Suggestions:</div>
              <div className="flex flex-wrap gap-1.5">
                {suggestionList.map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => setDestination(sug)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                      destination.trim().toLowerCase() === sug.toLowerCase()
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-600 dark:text-emerald-400 font-bold'
                        : 'dark:bg-slate-900/60 bg-slate-100 dark:border-slate-800 border-slate-300 dark:text-slate-400 text-slate-600 hover:border-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold dark:text-slate-300 text-slate-700 uppercase mb-1">
              Amount (INR) *
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-3.5 flex items-center text-sm font-bold dark:text-slate-400 text-slate-500 pointer-events-none">
                ₹
              </span>
              <input
                type="number"
                step="any"
                min="0"
                placeholder="e.g. 5000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full glass-input rounded-xl pl-8 pr-3.5 py-2.5 text-sm font-mono font-bold"
                required
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold dark:text-slate-300 text-slate-700 uppercase mb-1">
              Note (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Emergency fund, monthly budget, petty cash…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full glass-input rounded-xl px-3.5 py-2.5 text-sm"
            />
          </div>

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
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-white font-bold text-xs shadow-lg transition cursor-pointer disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 4px 15px #10b98130' }}
            >
              <Save className="w-4 h-4" />
              <span>{submitting ? 'Saving…' : entryToEdit ? 'Update Entry' : 'Add Cash'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────
export const CashWalletPage = ({
  holdings,
  onDeleteHolding,
  onOpenEditWallet,
  onDeleteWallet,
  onClearWalletHoldings,
  showToast,
  onHoldingAdded,
  onHoldingUpdated,
}) => {
  const { id } = useParams();
  const { wallets, loading: walletsLoading } = useWallets();

  const wallet = wallets.find((w) => w._id === id);

  const cashHoldings = useMemo(
    () => holdings.filter((h) => h.walletId && h.walletId.toString() === id && h.assetType === 'cash'),
    [holdings, id]
  );

  const totalINR = useMemo(() => cashHoldings.reduce((sum, h) => sum + (Number(h.quantity) || 0), 0), [cashHoldings]);

  // Group by user-entered destination string
  const grouped = useMemo(() => {
    const groups = {};
    cashHoldings.forEach((h) => {
      const { destination } = decodeEntry(h);
      const key = destination?.trim() || 'General Cash';
      if (!groups[key]) groups[key] = [];
      groups[key].push(h);
    });
    return groups;
  }, [cashHoldings]);

  // Unique list of destinations already entered by user in this wallet
  const existingDestinations = useMemo(() => {
    return Object.keys(grouped);
  }, [grouped]);

  const [modalOpen, setModalOpen] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState(null);

  const fmt = (n) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n || 0);

  const handleSaveEntry = async (formData) => {
    if (entryToEdit) {
      const res = await api.patch(`/holdings/${entryToEdit._id}`, formData);
      if (onHoldingUpdated) onHoldingUpdated(res.data.holding);
      if (showToast) showToast('Cash entry updated', 'success');
    } else {
      const res = await api.post('/holdings', formData);
      if (onHoldingAdded) onHoldingAdded(res.data.holding);
      if (showToast) showToast('Cash balance added', 'success');
    }
  };

  const openAdd = () => { setEntryToEdit(null); setModalOpen(true); };
  const openEdit = (h) => { setEntryToEdit(h); setModalOpen(true); };

  const handleDeleteWallet = () => {
    if (!wallet) return;
    if (onDeleteWallet) onDeleteWallet(wallet, cashHoldings.length);
  };

  if (walletsLoading) {
    return (
      <div className="space-y-6 py-6">
        <div className="h-48 glass-card rounded-3xl shimmer" />
        <div className="h-64 glass-card rounded-3xl shimmer" />
      </div>
    );
  }

  if (!wallet) {
    return (
      <div className="py-12 text-center glass-card rounded-3xl my-6 border dark:border-slate-800 border-slate-200">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto mb-4">
          <Wallet className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold dark:text-white text-slate-900 mb-2">Wallet Not Found</h3>
        <p className="dark:text-slate-400 text-slate-600 text-sm mb-6">The requested wallet does not exist or has been deleted.</p>
        <Link to="/wallets" className="px-6 py-3 rounded-2xl dark:bg-slate-800 bg-slate-100 dark:hover:bg-slate-700 hover:bg-slate-200 dark:text-white text-slate-900 font-bold text-xs inline-flex items-center space-x-2 transition border dark:border-slate-700 border-slate-300">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Wallets</span>
        </Link>
      </div>
    );
  }

  const accentColor = wallet.color || '#10b981';

  return (
    <div className="space-y-6 py-4">
      {/* Breadcrumb nav */}
      <div className="flex items-center justify-between">
        <Link to="/wallets" className="inline-flex items-center space-x-2 text-xs font-semibold dark:text-slate-400 text-slate-600 dark:hover:text-emerald-400 hover:text-emerald-600 transition">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Wallets</span>
        </Link>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onOpenEditWallet && onOpenEditWallet(wallet)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl dark:bg-slate-800 bg-slate-100 dark:hover:bg-slate-700 hover:bg-slate-200 border dark:border-slate-700 border-slate-300 dark:text-slate-200 text-slate-800 text-xs font-semibold transition cursor-pointer shadow-xs"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit Wallet</span>
          </button>
          <button
            onClick={handleDeleteWallet}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 dark:text-red-400 text-xs font-semibold transition cursor-pointer shadow-xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Hero Banner */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 relative overflow-hidden border dark:border-slate-800 border-slate-200 shadow-md">
        <div className="absolute top-0 left-0 right-0 h-2 rounded-t-3xl" style={{ backgroundColor: accentColor }} />
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl opacity-20 pointer-events-none" style={{ backgroundColor: accentColor }} />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative">
          <div className="flex items-start space-x-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center border shadow-xl shrink-0" style={{ backgroundColor: `${accentColor}25`, borderColor: `${accentColor}50` }}>
              <IndianRupee className="w-7 h-7" style={{ color: accentColor }} />
            </div>
            <div>
              <div className="flex items-center space-x-3 mb-1">
                <h1 className="text-2xl sm:text-3xl font-extrabold dark:text-white text-slate-900 font-heading tracking-tight">
                  {wallet.name}
                </h1>
                <span
                  className="px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider border"
                  style={{ backgroundColor: `${accentColor}15`, borderColor: `${accentColor}35`, color: accentColor }}
                >
                  Cash · INR
                </span>
              </div>
              <p className="dark:text-slate-400 text-slate-600 text-xs sm:text-sm">
                {wallet.description || 'Track your INR cash across different locations'}
              </p>
            </div>
          </div>

          <button
            onClick={openAdd}
            className="flex items-center justify-center space-x-2 px-6 py-3.5 rounded-2xl font-extrabold text-sm shadow-lg transition cursor-pointer shrink-0 text-white"
            style={{ background: `linear-gradient(135deg, ${accentColor}, #059669)`, boxShadow: `0 4px 20px ${accentColor}40` }}
          >
            <Plus className="w-5 h-5" />
            <span>Add Cash Balance</span>
          </button>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 pt-6 border-t dark:border-slate-800/80 border-slate-200">
          <div>
            <span className="text-xs dark:text-slate-400 text-slate-500 uppercase font-semibold">Total Cash</span>
            <div className="text-2xl sm:text-3xl font-extrabold dark:text-white text-slate-900 font-heading mt-1">
              {fmt(totalINR)}
            </div>
            <span className="text-[11px] dark:text-slate-400 text-slate-500">
              Across {cashHoldings.length} entr{cashHoldings.length === 1 ? 'y' : 'ies'}
            </span>
          </div>
          <div>
            <span className="text-xs dark:text-slate-400 text-slate-500 uppercase font-semibold">Locations Tracked</span>
            <div className="text-2xl sm:text-3xl font-extrabold dark:text-white text-slate-900 font-heading mt-1">
              {Object.keys(grouped).length}
            </div>
            <span className="text-[11px] dark:text-slate-400 text-slate-500">Distinct storage locations</span>
          </div>
          <div>
            <span className="text-xs dark:text-slate-400 text-slate-500 uppercase font-semibold">Currency</span>
            <div className="text-2xl sm:text-3xl font-extrabold mt-1 font-heading" style={{ color: accentColor }}>
              INR ₹
            </div>
            <span className="text-[11px] dark:text-slate-400 text-slate-500">Indian Rupee only</span>
          </div>
        </div>
      </div>

      {/* Location Breakdown */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold dark:text-white text-slate-900 font-heading flex items-center space-x-2">
            <Banknote className="w-5 h-5 text-emerald-500" />
            <span>Cash by Location</span>
            <span className="text-xs px-2 py-0.5 rounded-full dark:bg-slate-800 bg-slate-200 dark:text-slate-400 text-slate-700 font-mono font-bold">
              {cashHoldings.length}
            </span>
          </h2>
          {cashHoldings.length > 0 && onClearWalletHoldings && (
            <button
              onClick={() => onClearWalletHoldings(wallet, cashHoldings.length)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold transition cursor-pointer shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All</span>
            </button>
          )}
        </div>

        {cashHoldings.length === 0 ? (
          <div className="glass-card rounded-3xl p-12 text-center border-dashed dark:border-slate-800 border-slate-300">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-4">
              <IndianRupee className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold dark:text-white text-slate-900 mb-2 font-heading">No Cash Added Yet</h3>
            <p className="dark:text-slate-400 text-slate-600 text-sm max-w-md mx-auto mb-6">
              Start tracking your INR cash by adding where you keep it — your purse, Google Pay, savings account, and more.
            </p>
            <button
              onClick={openAdd}
              className="px-6 py-3 rounded-2xl text-white font-bold text-sm transition shadow-lg cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
            >
              + Add First Cash Entry
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(grouped)
              .sort(([, a], [, b]) => {
                const sumA = a.reduce((s, h) => s + Number(h.quantity), 0);
                const sumB = b.reduce((s, h) => s + Number(h.quantity), 0);
                return sumB - sumA;
              })
              .map(([destName, entries]) => {
                const meta = getDestinationMeta(destName);
                const LocIcon = meta.icon;
                const locationTotal = entries.reduce((s, h) => s + Number(h.quantity), 0);
                const pct = totalINR > 0 ? (locationTotal / totalINR) * 100 : 0;

                return (
                  <div
                    key={destName}
                    className="glass-card rounded-3xl p-5 border dark:border-slate-800/80 border-slate-200 relative overflow-hidden"
                  >
                    {/* Top color bar */}
                    <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: meta.color }} />

                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: `${meta.color}20`, border: `1px solid ${meta.color}40` }}
                        >
                          <LocIcon className="w-5 h-5" style={{ color: meta.color }} />
                        </div>
                        <div>
                          <div className="font-bold dark:text-white text-slate-900 text-sm">{meta.label}</div>
                          <div className="text-xs dark:text-slate-400 text-slate-500">
                            {entries.length} entr{entries.length === 1 ? 'y' : 'ies'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-extrabold font-heading" style={{ color: meta.color }}>
                          {fmt(locationTotal)}
                        </div>
                        <div className="text-[11px] dark:text-slate-400 text-slate-500">{pct.toFixed(1)}% of total</div>
                      </div>
                    </div>

                    {/* Share bar */}
                    <div className="h-1.5 w-full dark:bg-slate-800 bg-slate-200 rounded-full overflow-hidden mb-4">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, backgroundColor: meta.color }}
                      />
                    </div>

                    {/* Entries list */}
                    <div className="space-y-2">
                      {entries.map((h) => {
                        const { userNote } = decodeEntry(h);
                        return (
                          <div
                            key={h._id}
                            className="flex items-center justify-between p-3 rounded-xl dark:bg-slate-900/60 bg-slate-50 border dark:border-slate-800 border-slate-200 group"
                          >
                            <div className="flex items-center space-x-2 min-w-0">
                              <IndianRupee className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                              <div className="min-w-0">
                                <div className="font-bold dark:text-white text-slate-900 text-sm font-mono">{fmt(h.quantity)}</div>
                                {userNote && (
                                  <div className="text-[11px] dark:text-slate-400 text-slate-500 truncate">{userNote}</div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition">
                              <button
                                onClick={() => openEdit(h)}
                                title="Edit"
                                className="p-1.5 rounded-lg dark:bg-slate-800 bg-slate-200 dark:hover:bg-slate-700 hover:bg-slate-300 dark:text-slate-400 text-slate-600 hover:text-cyan-500 transition cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onDeleteHolding(h)}
                                title="Delete"
                                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 dark:text-rose-400 transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Cash Entry Modal */}
      <CashEntryModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEntryToEdit(null); }}
        onSave={handleSaveEntry}
        entryToEdit={entryToEdit}
        walletId={id}
        existingDestinations={existingDestinations}
      />
    </div>
  );
};
