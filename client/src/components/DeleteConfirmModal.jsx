import React, { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, X, ShieldAlert } from 'lucide-react';

export const DeleteConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  itemDescription,
  requireInputText = '',
}) => {
  const [deleting, setDeleting] = useState(false);
  const [confirmationInput, setConfirmationInput] = useState('');

  useEffect(() => {
    if (isOpen) {
      setConfirmationInput('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isConfirmed = requireInputText
    ? confirmationInput.trim() === requireInputText
    : true;

  const handleConfirm = async () => {
    if (!isConfirmed) return;
    setDeleting(true);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="glass-panel dark:bg-[#111625] bg-white border border-rose-500/30 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl relative overflow-hidden">
        {/* Top Glowing Red Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-red-500 to-amber-500" />

        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500 dark:text-rose-400 shadow-md">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-bold dark:text-white text-slate-900 font-heading">{title || 'Confirm Deletion'}</h3>
              <p className="text-xs text-rose-500 dark:text-rose-400 font-bold">Irreversible Action</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={deleting}
            className="p-1.5 rounded-xl text-slate-400 dark:hover:text-white hover:text-slate-900 dark:hover:bg-slate-800 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="my-4 p-3.5 rounded-2xl dark:bg-slate-900/80 bg-slate-50 border dark:border-slate-800 border-slate-200 text-xs dark:text-slate-300 text-slate-700 space-y-1">
          <p>Are you sure you want to proceed with this deletion?</p>
          {itemDescription && (
            <p className="font-mono font-bold dark:text-white text-slate-900 dark:bg-slate-950/60 bg-white p-2 rounded-xl border dark:border-slate-800/80 border-slate-200 text-center text-xs shadow-xs">
              {itemDescription}
            </p>
          )}
          <p className="text-[11px] dark:text-slate-400 text-slate-500 pt-1">
            This will permanently remove the data from your portfolio and cannot be undone.
          </p>
        </div>

        {/* Typed confirmation input if required */}
        {requireInputText && (
          <div className="mb-4 space-y-1.5">
            <label className="block text-xs font-semibold dark:text-slate-300 text-slate-700">
              Type <span className="font-mono font-extrabold text-rose-500 dark:text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">{requireInputText}</span> to confirm:
            </label>
            <input
              type="text"
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
              placeholder={`Enter ${requireInputText}`}
              autoFocus
              className="w-full glass-input rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold uppercase tracking-wider dark:bg-slate-950 bg-white border border-rose-500/40 text-rose-500 dark:text-rose-400 outline-none focus:border-rose-500"
            />
          </div>
        )}

        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="px-4 py-2.5 rounded-xl dark:bg-slate-800 bg-slate-100 dark:hover:bg-slate-700 hover:bg-slate-200 dark:text-slate-300 text-slate-700 font-semibold text-xs transition cursor-pointer border dark:border-slate-700 border-slate-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={deleting || !isConfirmed}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs shadow-lg shadow-rose-600/25 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
            <span>{deleting ? 'Deleting...' : 'Confirm Deletion'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

