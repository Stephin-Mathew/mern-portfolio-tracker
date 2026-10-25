/**
 * Unified formatting utilities for all currencies.
 * All functions accept a USD amount and a rates object:
 *   rates = { btcPrice, hypePrice, inrRate }
 */

const DEFAULT_INR_RATE = 95.7;
const DEFAULT_BTC_PRICE = 84300;
const DEFAULT_HYPE_PRICE = 93.8;

/** Extract live rates from prices object (from API). */
export function getRates(prices = {}) {
  return {
    btcPrice: Number(prices.BTC?.price || DEFAULT_BTC_PRICE),
    hypePrice: Number(prices.HYPE?.price || DEFAULT_HYPE_PRICE),
    inrRate: Number(prices.INR?.price || prices.INR?.rate || DEFAULT_INR_RATE),
  };
}

/**
 * Format a USD amount as a compact INR string for stat cards / chart axes.
 * e.g. 12500000 → "₹1.25 Cr", 150000 → "₹1.50 L", 1200 → "₹1.2K"
 */
export function formatINRCompact(usd, inrRate = DEFAULT_INR_RATE) {
  const val = (usd || 0) * inrRate;
  const abs = Math.abs(val);
  const sign = val < 0 ? '−' : '';
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(2)} L`;
  if (abs >= 1e3) return `${sign}₹${(abs / 1e3).toFixed(1)}K`;
  return `${sign}₹${abs.toFixed(2)}`;
}

/** Full INR with en-IN locale (no compaction). */
export function formatINRFull(usd, inrRate = DEFAULT_INR_RATE) {
  const val = (usd || 0) * inrRate;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
}

/** Format USD amount as a $-prefixed string. */
export function formatUSD(usd) {
  const val = usd || 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
}

/** Format USD amount as BTC. Shows sats if < 0.001 BTC. */
export function formatBTC(usd, btcPrice = DEFAULT_BTC_PRICE) {
  const btc = btcPrice > 0 ? (usd || 0) / btcPrice : 0;
  if (btc === 0) return '₿0.0000';
  const abs = Math.abs(btc);
  const sign = btc < 0 ? '−' : '';
  if (abs < 0.001) {
    const sats = Math.round(abs * 1e8);
    return `${sign}${sats.toLocaleString('en-US')} sats`;
  }
  if (abs >= 1) return `${sign}₿${abs.toFixed(4)}`;
  return `${sign}₿${abs.toFixed(abs >= 0.01 ? 4 : 6)}`;
}

/** Format USD amount as HYPE tokens. */
export function formatHYPE(usd, hypePrice = DEFAULT_HYPE_PRICE) {
  const hype = hypePrice > 0 ? (usd || 0) / hypePrice : 0;
  if (hype === 0) return '0.00 HYPE';
  const abs = Math.abs(hype);
  const sign = hype < 0 ? '−' : '';
  if (abs >= 1000) return `${sign}${abs.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} HYPE`;
  if (abs >= 1) return `${sign}${abs.toFixed(2)} HYPE`;
  return `${sign}${abs.toFixed(4)} HYPE`;
}

/**
 * Format a price (not a portfolio total) in the given currency.
 * Price values stay full-precision.
 */
export function formatPrice(usdPrice, currency, rates = {}) {
  const { btcPrice, hypePrice, inrRate } = { ...getRates({}), ...rates };
  const p = usdPrice || 0;
  switch (currency) {
    case 'INR': {
      const inr = p * inrRate;
      const abs = Math.abs(inr);
      return `₹${abs >= 1000 ? abs.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : abs.toFixed(2)}`;
    }
    case 'BTC': {
      const btc = btcPrice > 0 ? p / btcPrice : 0;
      if (btc < 0.001) return `${Math.round(btc * 1e8).toLocaleString('en-US')} sats`;
      return `₿${btc.toFixed(btc >= 0.01 ? 4 : 6)}`;
    }
    case 'HYPE': {
      const h = hypePrice > 0 ? p / hypePrice : 0;
      const abs = Math.abs(h);
      return `${abs >= 1000 ? abs.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : abs >= 1 ? abs.toFixed(2) : abs.toFixed(4)} HYPE`;
    }
    case 'USD':
    default: {
      const abs = Math.abs(p);
      return `$${abs >= 1000 ? abs.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : abs.toFixed(2)}`;
    }
  }
}

/**
 * Main formatter: convert a USD amount to the display currency.
 * For stat cards (compact = true) INR uses L / Cr notation.
 */
export function formatValue(usd, currency, rates = {}, compact = false) {
  const { btcPrice, hypePrice, inrRate } = { ...getRates({}), ...rates };
  switch (currency) {
    case 'INR':
      return compact ? formatINRCompact(usd, inrRate) : formatINRFull(usd, inrRate);
    case 'BTC':
      return formatBTC(usd, btcPrice);
    case 'HYPE':
      return formatHYPE(usd, hypePrice);
    case 'USD':
    default:
      return formatUSD(usd);
  }
}

/**
 * Format a signed change (delta) value. Prepends +/− based on sign.
 */
export function formatDelta(usd, currency, rates = {}, compact = false) {
  const sign = (usd || 0) >= 0 ? '+' : '';
  const abs = Math.abs(usd || 0);
  const signedAbs = usd < 0 ? -abs : abs;
  const formatted = formatValue(signedAbs, currency, rates, compact);
  return usd >= 0 ? `+${formatted}` : formatted;
}

/** Format a percent number, signed. */
export function formatPercent(pct, decimals = 2) {
  const p = pct || 0;
  return `${p >= 0 ? '+' : ''}${p.toFixed(decimals)}%`;
}

/**
 * Compact axis label for chart y-axis labels (same as stat card INR compact, USD uses K/M).
 */
export function formatAxisLabel(usdValue, currency, rates = {}) {
  const { btcPrice, hypePrice, inrRate } = { ...getRates({}), ...rates };
  switch (currency) {
    case 'INR': {
      const v = (usdValue || 0) * inrRate;
      const abs = Math.abs(v);
      if (abs >= 1e7) return `₹${(abs / 1e7).toFixed(1)}Cr`;
      if (abs >= 1e5) return `₹${(abs / 1e5).toFixed(1)}L`;
      if (abs >= 1e3) return `₹${(abs / 1e3).toFixed(1)}K`;
      return `₹${abs.toFixed(0)}`;
    }
    case 'BTC': {
      const v = btcPrice > 0 ? (usdValue || 0) / btcPrice : 0;
      return `₿${v.toFixed(4)}`;
    }
    case 'HYPE': {
      const v = hypePrice > 0 ? (usdValue || 0) / hypePrice : 0;
      if (v >= 1000) return `${(v / 1000).toFixed(1)}K HYPE`;
      return `${v.toFixed(1)} HP`;
    }
    case 'USD':
    default: {
      const abs = Math.abs(usdValue || 0);
      if (abs >= 1e6) return `$${(abs / 1e6).toFixed(1)}M`;
      if (abs >= 1e3) return `$${(abs / 1e3).toFixed(1)}K`;
      return `$${abs.toFixed(0)}`;
    }
  }
}
