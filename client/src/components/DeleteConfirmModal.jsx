import React, { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

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
    if (isOpen) setConfirmationInput('');
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
    <div className="modal-backdrop animate-fadeIn" onClick={onClose}>
      <div
        className="modal-panel"
        style={{ maxWidth: 420, borderTop: '3px solid var(--negative)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: 'var(--negative-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <AlertTriangle size={20} color="var(--negative)" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
                {title || 'Confirm Deletion'}
              </h3>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 500, color: 'var(--negative)', marginTop: 2 }}>
                Irreversible action
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={deleting}
            style={{
              width: 32, height: 32, borderRadius: 8,
              border: '1px solid var(--card-border)',
              background: 'var(--shell-bg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-muted)',
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Description block */}
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 12,
            background: 'var(--shell-bg)',
            border: '1px solid var(--card-border)',
            marginBottom: 16,
            fontSize: 13,
            color: 'var(--text-secondary)',
          }}
        >
          <p style={{ margin: 0 }}>Are you sure you want to proceed with this deletion?</p>
          {itemDescription && (
            <p
              style={{
                margin: '8px 0 0',
                fontFamily: 'monospace',
                fontWeight: 600,
                color: 'var(--text-primary)',
                background: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                borderRadius: 8,
                padding: '6px 10px',
                fontSize: 12,
                textAlign: 'center',
              }}
            >
              {itemDescription}
            </p>
          )}
          <p style={{ margin: '8px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
            This will permanently remove the data from your portfolio and cannot be undone.
          </p>
        </div>

        {/* Typed confirmation */}
        {requireInputText && (
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 500,
                color: 'var(--text-secondary)',
                marginBottom: 6,
              }}
            >
              Type{' '}
              <code
                style={{
                  fontWeight: 700,
                  color: 'var(--negative)',
                  background: 'var(--negative-bg)',
                  padding: '1px 6px',
                  borderRadius: 4,
                }}
              >
                {requireInputText}
              </code>{' '}
              to confirm:
            </label>
            <input
              type="text"
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
              placeholder={`Enter ${requireInputText}`}
              autoFocus
              className="form-input"
              style={{
                fontFamily: 'monospace',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '.08em',
                color: 'var(--negative)',
                borderColor: confirmationInput && !isConfirmed ? 'var(--negative)' : undefined,
              }}
            />
          </div>
        )}

        {/* Footer buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            onClick={onClose}
            disabled={deleting}
            style={{
              padding: '9px 16px',
              borderRadius: 10,
              border: '1px solid var(--card-border)',
              background: 'var(--shell-bg)',
              color: 'var(--text-secondary)',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={deleting || !isConfirmed}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 18px',
              borderRadius: 10,
              border: 'none',
              background: 'var(--negative)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 500,
              cursor: deleting || !isConfirmed ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              opacity: deleting || !isConfirmed ? 0.5 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            <Trash2 size={13} />
            {deleting ? 'Deleting…' : 'Confirm Deletion'}
          </button>
        </div>
      </div>
    </div>
  );
};
