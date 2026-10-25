import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { formatValue, formatDelta, formatPercent, formatPrice, getRates } from '../utils/format';

const CurrencyContext = createContext(null);

const CURRENCIES = ['USD', 'INR', 'BTC', 'HYPE'];
const STORAGE_KEY = 'portfolio_currency';

export function CurrencyProvider({ children, prices = {} }) {
  const [currency, setCurrencyState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return CURRENCIES.includes(saved) ? saved : 'USD';
    } catch {
      return 'USD';
    }
  });

  const setCurrency = useCallback((c) => {
    if (!CURRENCIES.includes(c)) return;
    setCurrencyState(c);
    try {
      localStorage.setItem(STORAGE_KEY, c);
    } catch (e) {
      console.warn('Could not save currency preference:', e);
    }
  }, []);

  const rates = useMemo(() => getRates(prices), [prices]);

  /** Format a USD amount in the active currency. compact=true for INR L/Cr. */
  const fmt = useCallback(
    (usd, compact = false) => formatValue(usd, currency, rates, compact),
    [currency, rates]
  );

  /** Format a signed delta (+/-). */
  const fmtDelta = useCallback(
    (usd, compact = false) => formatDelta(usd, currency, rates, compact),
    [currency, rates]
  );

  /** Format a per-unit price (no compact). */
  const fmtPrice = useCallback(
    (usdPrice) => formatPrice(usdPrice, currency, rates),
    [currency, rates]
  );

  /** Format a % string, always signed. */
  const fmtPct = useCallback((pct, decimals = 2) => formatPercent(pct, decimals), []);

  const value = {
    currency,
    setCurrency,
    currencies: CURRENCIES,
    rates,
    fmt,
    fmtDelta,
    fmtPrice,
    fmtPct,
  };

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within a CurrencyProvider');
  return ctx;
}
