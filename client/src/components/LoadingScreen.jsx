import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';

export const LoadingScreen = () => {
  const [step, setStep] = useState(0);
  const steps = [
    'Connecting to secure portfolio vault…',
    'Loading wallets & connected accounts…',
    'Fetching live market quotes…',
    'Almost ready…',
  ];

  useEffect(() => {
    const id = setInterval(() => setStep((p) => Math.min(p + 1, steps.length - 1)), 500);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--page-bg)',
      }}
    >
      <div
        className="card animate-fadeIn"
        style={{ maxWidth: 380, width: '100%', margin: '0 16px', textAlign: 'center', padding: '40px 32px' }}
      >
        {/* Logo */}
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: 'var(--btn-primary-bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
          }}
        >
          <div style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--btn-primary-text)', transform: 'rotate(45deg)' }} />
        </div>

        <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 8px' }}>
          Loading Your Portfolio
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 24px', minHeight: 36 }}>
          {steps[step]}
        </p>

        {/* Progress bar */}
        <div
          style={{
            height: 4,
            background: 'var(--progress-track)',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: 4,
              width: `${((step + 1) / steps.length) * 100}%`,
              background: 'var(--btn-primary-bg)',
              borderRadius: 2,
              transition: 'width 0.5s ease',
            }}
          />
        </div>
      </div>
    </div>
  );
};
