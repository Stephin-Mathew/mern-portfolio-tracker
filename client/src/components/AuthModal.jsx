import React, { useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import { SignIn, SignUp } from '@clerk/clerk-react';
import { dark } from '@clerk/themes';
import { useTheme } from '../context/ThemeContext';

export const AuthModal = ({ isOpen, onClose }) => {
  const [isLogin, setIsLogin] = useState(true);
  const { isDark } = useTheme();

  if (!isOpen) return null;

  // Clerk appearance now inherits from main.jsx — just override root sizes
  const clerkAppearance = {
    baseTheme: isDark ? dark : undefined,
    variables: {
      colorPrimary: isDark ? '#F2F2F4' : '#17171B',
      colorText: isDark ? '#F2F2F4' : '#131316',
      colorTextSecondary: isDark ? '#9A9EA8' : '#5F636B',
      colorBackground: isDark ? '#1A1A1F' : '#FFFFFF',
      colorInputBackground: isDark ? '#232329' : '#F3F3F5',
      colorInputText: isDark ? '#F2F2F4' : '#131316',
      borderRadius: '0.75rem',
    },
    elements: {
      rootBox: 'w-full',
      card: 'w-full',
      formButtonPrimary: isDark
        ? 'bg-[#F2F2F4] hover:opacity-90 text-[#131316] font-semibold cursor-pointer'
        : 'bg-[#17171B] hover:opacity-90 text-white font-semibold cursor-pointer',
      footerActionLink: isDark
        ? 'text-[#F2F2F4] hover:opacity-80 font-semibold'
        : 'text-[#17171B] hover:opacity-80 font-semibold',
    },
  };

  return (
    <div className="modal-backdrop animate-fadeIn" onClick={onClose}>
      <div style={{ position: 'relative', width: '100%', maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: -16,
            right: -16,
            zIndex: 60,
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'var(--panel-bg)',
            border: '1px solid var(--card-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,.14)',
            color: 'var(--text-muted)',
          }}
          title="Close"
        >
          <X size={16} />
        </button>

        {/* Clerk component */}
        <div style={{ width: '100%' }}>
          {isLogin ? (
            <SignIn routing="hash" appearance={clerkAppearance} />
          ) : (
            <SignUp routing="hash" appearance={clerkAppearance} />
          )}
        </div>

        {/* Toggle footer */}
        <div
          style={{
            marginTop: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            fontSize: 12,
            color: 'var(--text-muted)',
            background: 'var(--panel-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: 12,
            padding: '10px 16px',
          }}
        >
          <Sparkles size={13} color="var(--text-muted)" />
          <span>{isLogin ? 'New here?' : 'Already have an account?'}</span>
          <button
            onClick={() => setIsLogin(!isLogin)}
            style={{
              border: 'none',
              background: 'none',
              color: 'var(--text-primary)',
              fontWeight: 600,
              fontSize: 12,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {isLogin ? 'Create account' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
};
