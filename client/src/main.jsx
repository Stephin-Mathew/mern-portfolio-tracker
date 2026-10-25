import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import { dark } from '@clerk/themes';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { App } from './App';
import { AuthProvider } from './context/AuthContext';
import './index.css';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  console.warn('Missing Clerk Publishable Key in client/.env');
}

function ClerkWithTheme({ children }) {
  const { isDark } = useTheme();

  return (
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      afterSignOutUrl="/"
      appearance={{
        baseTheme: isDark ? dark : undefined,
        variables: {
          colorPrimary: '#17171B',
          colorText: isDark ? '#F2F2F4' : '#131316',
          colorTextSecondary: isDark ? '#9A9EA8' : '#5F636B',
          colorBackground: isDark ? '#1A1A1F' : '#FFFFFF',
          colorInputBackground: isDark ? '#232329' : '#F3F3F5',
          colorInputText: isDark ? '#F2F2F4' : '#131316',
          colorNeutral: isDark ? '#F2F2F4' : '#131316',
          borderRadius: '0.75rem',
        },
        elements: {
          card: isDark
            ? 'bg-[#1A1A1F] border border-[#2A2A31] shadow-2xl rounded-2xl'
            : 'bg-white border border-[#ECEDEF] shadow-xl rounded-2xl',
          formButtonPrimary: isDark
            ? 'bg-[#F2F2F4] hover:opacity-90 text-[#131316] font-semibold transition cursor-pointer'
            : 'bg-[#17171B] hover:opacity-90 text-white font-semibold transition cursor-pointer',
          footerActionLink: isDark
            ? 'text-[#F2F2F4] hover:opacity-80 font-semibold'
            : 'text-[#17171B] hover:opacity-80 font-semibold',
          modalBackdrop: isDark
            ? 'bg-black/60 backdrop-blur-md'
            : 'bg-black/40 backdrop-blur-md',
          headerTitle: 'font-semibold',
          socialButtonsBlockButton: isDark
            ? 'bg-[#232329] hover:bg-[#34343C] border-[#2A2A31] text-[#F2F2F4]'
            : 'bg-[#F3F3F5] hover:bg-[#ECEDEF] border-[#ECEDEF] text-[#131316]',
          formFieldInput: isDark
            ? 'bg-[#232329] border-[#2A2A31] text-[#F2F2F4] placeholder-[#9A9EA8]'
            : 'bg-[#F3F3F5] border-[#ECEDEF] text-[#131316] placeholder-[#6B6F78]',
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <ClerkWithTheme>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ClerkWithTheme>
    </ThemeProvider>
  </React.StrictMode>
);
