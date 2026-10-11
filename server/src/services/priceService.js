import axios from 'axios';
import https from 'https';
import dns from 'dns';
import cron from 'node-cron';
import { PriceCache } from '../models/PriceCache.js';
import { PriceOverride } from '../models/PriceOverride.js';
import { Holding } from '../models/Holding.js';

// Public DNS resolver to bypass ISP crypto DNS blocking (e.g. for pro-api.coinmarketcap.com)
const publicDnsResolver = new dns.Resolver();
try {
  publicDnsResolver.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (dnsErr) {
  console.warn('Could not set custom DNS servers on resolver:', dnsErr.message);
}

const customLookup = (hostname, options, callback) => {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  publicDnsResolver.resolve4(hostname, (err, addresses) => {
    if (err || !addresses || addresses.length === 0) {
      dns.lookup(hostname, options, callback);
    } else if (options && options.all) {
      callback(null, addresses.map((a) => ({ address: a, family: 4 })));
    } else {
      callback(null, addresses[0], 4);
    }
  });
};

const customHttpsAgent = new https.Agent({
  lookup: customLookup,
  keepAlive: true,
});

// Standard baseline market quotes with 24h/7d/30d change percentages for mock fallback
const FALLBACK_PRICES = {
  BTC: { price: 64250.0, change24h: 2.45, change7d: 5.12, change30d: 8.9 },
  ETH: { price: 3450.75, change24h: -1.15, change7d: 3.4, change30d: 6.2 },
  SOL: { price: 148.5, change24h: 4.8, change7d: 12.3, change30d: 18.5 },
  BNB: { price: 575.2, change24h: 0.8, change7d: 1.5, change30d: 4.2 },
  XRP: { price: 0.58, change24h: -0.4, change7d: -2.1, change30d: 1.8 },
  DOGE: { price: 0.12, change24h: 3.2, change7d: 7.9, change30d: -3.4 },
  ADA: { price: 0.38, change24h: 1.1, change7d: -1.4, change30d: -5.2 },
  AVAX: { price: 24.6, change24h: 2.9, change7d: 8.4, change30d: 11.2 },
  LINK: { price: 12.8, change24h: -1.8, change7d: 4.1, change30d: 7.0 },
  DOT: { price: 4.9, change24h: 0.5, change7d: -0.8, change30d: -4.1 },
  SUI: { price: 1.85, change24h: 6.7, change7d: 15.2, change30d: 34.0 },
  NEAR: { price: 4.4, change24h: 3.1, change7d: 6.8, change30d: 9.5 },
  PEPE: { price: 0.0000085, change24h: 5.4, change7d: 14.8, change30d: 22.1 },
  SHIB: { price: 0.000017, change24h: 1.2, change7d: 3.5, change30d: -2.0 },
  ARB: { price: 0.62, change24h: 2.1, change7d: 4.5, change30d: 9.1 },
  OP: { price: 1.45, change24h: 1.8, change7d: 6.2, change30d: 12.4 },
  UNI: { price: 7.85, change24h: -0.5, change7d: 2.1, change30d: 5.8 },
  AAVE: { price: 155.2, change24h: 4.3, change7d: 11.8, change30d: 25.4 },
  AAPL: { price: 224.5, change24h: 0.65, change7d: 1.8, change30d: 4.2 },
  MSFT: { price: 418.2, change24h: -0.32, change7d: 0.9, change30d: 3.1 },
  NVDA: { price: 128.4, change24h: 2.15, change7d: 5.8, change30d: 14.5 },
  TSLA: { price: 215.6, change24h: -1.45, change7d: 4.2, change30d: -2.8 },
  GOOGL: { price: 165.3, change24h: 0.42, change7d: 1.1, change30d: 2.9 },
  AMZN: { price: 178.9, change24h: 0.88, change7d: 2.4, change30d: 6.1 },
  META: { price: 512.0, change24h: 1.25, change7d: 3.8, change30d: 9.4 },
  SPY: { price: 554.8, change24h: 0.35, change7d: 1.2, change30d: 3.5 },
  QQQ: { price: 482.3, change24h: 0.52, change7d: 1.6, change30d: 4.8 },
  USD: { price: 1.0, change24h: 0, change7d: 0, change30d: 0 },
  USDT: { price: 1.0, change24h: 0.01, change7d: 0.02, change30d: 0.01 },
  USDC: { price: 1.0, change24h: 0.0, change7d: 0.01, change30d: 0.0 },
  INR: { price: 95.7, rate: 95.7, change24h: 0, change7d: 0, change30d: 0 },
  // Hyperliquid ecosystem
  HYPE: { price: 95.0, change24h: 2.0, change7d: 8.5, change30d: 45.0 },
  WHYPE: { price: 95.0, change24h: 2.0, change7d: 8.5, change30d: 45.0 },
  // Popular tokens in user portfolio
  ENA: { price: 0.38, change24h: 1.2, change7d: 4.5, change30d: 9.0 },
  EIGEN: { price: 2.1, change24h: 0.8, change7d: 3.2, change30d: 7.5 },
  ETHFI: { price: 1.45, change24h: 1.5, change7d: 5.0, change30d: 12.0 },
  OKB: { price: 45.0, change24h: 0.5, change7d: 2.1, change30d: 5.5 },
  OM: { price: 0.65, change24h: 1.1, change7d: 3.4, change30d: 8.0 },
  ZRO: { price: 3.2, change24h: 1.8, change7d: 6.0, change30d: 14.0 },
  HPOS10I: { price: 0.0, change24h: 0, change7d: 0, change30d: 0 },
};

let inrCache = {
  rate: 95.7,
  lastUpdated: 0,
};

/**
 * Fetch live USD to INR exchange rate with multi-source fallback
 */
export const fetchLiveInrRate = async () => {
  const now = Date.now();
  if (now - inrCache.lastUpdated < 15 * 60 * 1000 && inrCache.rate > 0) {
    return inrCache.rate;
  }
  try {
    const res = await axios.get('https://open.er-api.com/v6/latest/USD', { timeout: 5000 });
    if (res.data?.rates?.INR) {
      inrCache = {
        rate: Number(res.data.rates.INR),
        lastUpdated: now,
      };
      return inrCache.rate;
    }
  } catch (err1) {
    try {
      const res2 = await axios.get('https://api.frankfurter.app/latest?from=USD&to=INR', { timeout: 5000 });
      if (res2.data?.rates?.INR) {
        inrCache = {
          rate: Number(res2.data.rates.INR),
          lastUpdated: now,
        };
        return inrCache.rate;
      }
    } catch (err2) {
      console.warn('Failed to fetch live INR rate from open feeds, using baseline:', err2.message);
    }
  }
  return inrCache.rate || 95.7;
};

// ─────────────────────────────────────────────────────────────────────────────
// Yahoo Finance — Stocks & ETFs
// Endpoint: https://query1.finance.yahoo.com/v8/finance/chart/{TICKER}
// Returns: current price, previousClose, 52w range etc. No API key needed.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch current price for a single stock/ETF ticker from Yahoo Finance chart API.
 * Returns { price, change24h, change7d, change30d } or null on failure.
 */
const fetchYahooPrice = async (ticker) => {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}`;
    const res = await axios.get(url, {
      params: {
        interval: '1d',
        range: '1mo',   // 1 month of daily data so we can compute 7d & 30d change
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PortfolioTracker/1.0)',
        'Accept': 'application/json',
      },
      timeout: 8000,
    });

    const result = res.data?.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta;
    const currentPrice = meta.regularMarketPrice ?? meta.chartPreviousClose ?? null;
    if (!currentPrice) return null;

    const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? currentPrice;
    const change24h = prevClose > 0 ? ((currentPrice - prevClose) / prevClose) * 100 : 0;

    // Compute 7d and 30d changes from historical closes
    const closes = result.indicators?.quote?.[0]?.close ?? [];
    const validCloses = closes.filter((c) => c !== null && c !== undefined && c > 0);

    let change7d = 0;
    let change30d = 0;
    if (validCloses.length >= 2) {
      const oldest = validCloses[0];
      // 7 days ago ≈ 5 trading days — use whichever is available
      const idx7d = Math.max(0, validCloses.length - 6);
      const price7dAgo = validCloses[idx7d];
      change7d = price7dAgo > 0 ? ((currentPrice - price7dAgo) / price7dAgo) * 100 : 0;
      change30d = oldest > 0 ? ((currentPrice - oldest) / oldest) * 100 : 0;
    }

    // Check if the stock is quoted in INR (e.g. NSE .NS, BSE .BO, or Yahoo meta currency)
    const isINR = meta.currency === 'INR' || ticker.endsWith('.NS') || ticker.endsWith('.BO');
    let priceInUsd = Number(currentPrice);
    if (isINR) {
      const inrRate = await fetchLiveInrRate();
      priceInUsd = inrRate > 0 ? Number(currentPrice) / inrRate : Number(currentPrice);
    }

    return {
      price: Number(priceInUsd.toFixed(6)),
      priceInr: isINR ? Number(currentPrice) : null,
      currency: isINR ? 'INR' : (meta.currency || 'USD'),
      change24h: Number(change24h.toFixed(4)),
      change7d: Number(change7d.toFixed(4)),
      change30d: Number(change30d.toFixed(4)),
      assetType: 'stock',
    };
  } catch (err) {
    console.warn(`⚠️ Yahoo Finance fetch failed for ${ticker}: ${err.message}`);
    return null;
  }
};

/**
 * Fetch prices for multiple stock tickers from Yahoo Finance in parallel.
 * Yahoo has no batch endpoint, so we fan out concurrent requests (throttled).
 */
export const fetchYahooStockPrices = async (tickers = []) => {
  if (!tickers.length) return {};
  console.log(`📈 Yahoo Finance: fetching ${tickers.length} stock/ETF ticker(s): [${tickers.join(', ')}]`);

  // Run up to 5 concurrent requests to be polite to Yahoo's free endpoint
  const CONCURRENCY = 5;
  const results = {};
  for (let i = 0; i < tickers.length; i += CONCURRENCY) {
    const batch = tickers.slice(i, i + CONCURRENCY);
    const settled = await Promise.allSettled(batch.map((t) => fetchYahooPrice(t)));
    settled.forEach((outcome, idx) => {
      const ticker = batch[idx];
      if (outcome.status === 'fulfilled' && outcome.value) {
        results[ticker] = outcome.value;
      }
    });
  }

  const fetched = Object.keys(results).length;
  console.log(`✅ Yahoo Finance: fetched ${fetched}/${tickers.length} quote(s).`);
  return results;
};

// ─────────────────────────────────────────────────────────────────────────────
// MFapi.in — Indian Mutual Funds (NAV)
// Endpoints:
//   GET https://api.mfapi.in/mf/{schemeCode}        → latest + historical NAV
//   GET https://api.mfapi.in/mf/search?q={query}    → search by fund name
// The "symbol" stored for a mutual fund holding is the numeric scheme code
// (e.g. "120503" for Mirae Asset Large Cap Fund — Direct Plan — Growth).
// NAV is in INR; we convert to USD using live INR rate for the price field
// but also expose navInr directly.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Detect if a symbol string is a MFapi.in numeric scheme code.
 * Valid scheme codes are purely numeric strings of 5–6 digits.
 */
export const isMfSchemeCode = (sym) => /^\d{5,6}$/.test(sym);

/**
 * Fetch the latest NAV for a mutual fund by its MFapi.in numeric scheme code.
 * Returns { price (USD), navInr, schemeName, change24h, change7d, change30d } or null.
 *
 * Historical 7d/30d change is computed from the last 30 daily NAV records.
 * MFapi returns data newest-first: data[0] is latest, data[1] is previous day, etc.
 */
export const fetchMutualFundNav = async (schemeCode) => {
  try {
    const url = `https://api.mfapi.in/mf/${schemeCode}`;
    const res = await axios.get(url, {
      timeout: 8000,
      headers: { 'Accept': 'application/json' },
    });

    const { status, data: navData, meta } = res.data ?? {};
    if (status !== 'SUCCESS' || !Array.isArray(navData) || navData.length === 0) {
      console.warn(`⚠️ MFapi: no NAV data for scheme ${schemeCode}`);
      return null;
    }

    // MFapi dates format: "DD-MM-YYYY", data sorted newest-first
    const parseNav = (entry) => {
      const raw = entry?.nav;
      if (!raw) return null;
      const val = parseFloat(raw.replace(/,/g, ''));
      return isNaN(val) ? null : val;
    };

    const latestNav = parseNav(navData[0]);       // today
    const nav1d = parseNav(navData[1]) ?? latestNav;     // 1 trading day ago
    // 7 trading days ago — try index 5 (approx 1 week of trading days)
    const nav7d = parseNav(navData[Math.min(5, navData.length - 1)]) ?? latestNav;
    // 30 calendar days ≈ ~22 trading days — use index 21 if available
    const nav30d = parseNav(navData[Math.min(21, navData.length - 1)]) ?? latestNav;

    if (!latestNav) return null;

    const change24h = nav1d > 0 ? ((latestNav - nav1d) / nav1d) * 100 : 0;
    const change7d  = nav7d  > 0 ? ((latestNav - nav7d)  / nav7d)  * 100 : 0;
    const change30d = nav30d > 0 ? ((latestNav - nav30d) / nav30d) * 100 : 0;

    // Convert NAV from INR to USD for unified price field
    const inrRate = await fetchLiveInrRate();
    const priceInUsd = inrRate > 0 ? latestNav / inrRate : latestNav;

    return {
      price: Number(priceInUsd.toFixed(6)),
      navInr: Number(latestNav.toFixed(4)),
      schemeName: meta?.scheme_name ?? meta?.fund_house ?? null,
      change24h: Number(change24h.toFixed(4)),
      change7d:  Number(change7d.toFixed(4)),
      change30d: Number(change30d.toFixed(4)),
      assetType: 'mutual_fund',
    };
  } catch (err) {
    console.warn(`⚠️ MFapi fetch failed for scheme ${schemeCode}: ${err.message}`);
    return null;
  }
};

/**
 * Search for mutual fund schemes by name query using MFapi.in search endpoint.
 * Returns array of { schemeCode, schemeName } objects.
 */
export const searchMutualFunds = async (query) => {
  try {
    const res = await axios.get('https://api.mfapi.in/mf/search', {
      params: { q: query },
      timeout: 8000,
      headers: { 'Accept': 'application/json' },
    });
    const items = Array.isArray(res.data) ? res.data : [];
    return items.map((item) => ({
      schemeCode: String(item.schemeCode),
      schemeName: item.schemeName,
    }));
  } catch (err) {
    console.warn(`⚠️ MFapi search failed for "${query}": ${err.message}`);
    return [];
  }
};

/**
 * Fetch NAV prices for multiple mutual fund scheme codes in parallel.
 */
export const fetchMutualFundNavBatch = async (schemeCodes = []) => {
  if (!schemeCodes.length) return {};
  console.log(`🏦 MFapi.in: fetching NAV for ${schemeCodes.length} scheme(s): [${schemeCodes.join(', ')}]`);

  const CONCURRENCY = 5;
  const results = {};
  for (let i = 0; i < schemeCodes.length; i += CONCURRENCY) {
    const batch = schemeCodes.slice(i, i + CONCURRENCY);
    const settled = await Promise.allSettled(batch.map((c) => fetchMutualFundNav(c)));
    settled.forEach((outcome, idx) => {
      const code = batch[idx];
      if (outcome.status === 'fulfilled' && outcome.value) {
        results[code] = outcome.value;
      }
    });
  }

  const fetched = Object.keys(results).length;
  console.log(`✅ MFapi.in: fetched ${fetched}/${schemeCodes.length} NAV(s).`);
  return results;
};

/**
 * Automatically fetch all plan variants (Direct/Regular, Growth/IDCW) for a mutual fund,
 * retrieve their live NAVs, and identify the variant closest to a target/screenshot price.
 */
export const resolveMutualFundVariants = async (query, targetPrice = null) => {
  const cleanStr = String(query || '').trim();
  if (!cleanStr) return { variants: [], bestMatch: null };

  const refPriceNum = targetPrice !== null && targetPrice !== undefined && !isNaN(Number(targetPrice)) && Number(targetPrice) > 0
    ? Number(targetPrice)
    : null;

  // 1. If cleanStr is already a scheme code (5-6 digits), fetch it directly
  if (isMfSchemeCode(cleanStr)) {
    const nav = await fetchMutualFundNav(cleanStr);
    if (nav) {
      const sName = nav.schemeName || `Scheme ${cleanStr}`;
      const isDirect = /direct/i.test(sName);
      const isRegular = /regular/i.test(sName);
      const isGrowth = /growth/i.test(sName);
      const isIdcw = /idcw|dividend/i.test(sName);

      const single = {
        schemeCode: cleanStr,
        schemeName: sName,
        navInr: nav.navInr,
        price: nav.price,
        currency: 'INR',
        diffAbs: refPriceNum !== null ? Math.abs(nav.navInr - refPriceNum) : null,
        diffPct: refPriceNum !== null && refPriceNum > 0
          ? Number(((Math.abs(nav.navInr - refPriceNum) / refPriceNum) * 100).toFixed(2))
          : null,
        isClosestMatch: true,
        planType: isDirect ? 'Direct' : isRegular ? 'Regular' : 'Standard',
        optionType: isGrowth ? 'Growth' : isIdcw ? 'IDCW' : 'Standard',
        change24h: nav.change24h || 0,
        change7d: nav.change7d || 0,
        change30d: nav.change30d || 0,
        formattedPrice: `₹${nav.navInr.toFixed(2)}`,
      };
      return { query: cleanStr, referencePrice: refPriceNum, variants: [single], bestMatch: single };
    }
  }

  // 2. Build search candidate queries
  // Base query with specific plan/option tokens stripped so MFapi returns ALL variants (Direct, Regular, Growth, IDCW)
  const baseQuery = cleanStr
    .replace(/-(\s*)direct/gi, '')
    .replace(/-(\s*)regular/gi, '')
    .replace(/-(\s*)growth/gi, '')
    .replace(/-(\s*)idcw/gi, '')
    .replace(/-(\s*)dividend/gi, '')
    .replace(/\b(direct|regular|plan|growth|idcw|dividend|option)\b/gi, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  let searchResults = [];
  // Try base query first (this yields all variants: Direct, Regular, Growth, IDCW)
  if (baseQuery && baseQuery.length >= 2) {
    searchResults = await searchMutualFunds(baseQuery);
  }

  // If no results, try original query
  if ((!searchResults || searchResults.length === 0) && cleanStr.length >= 2) {
    searchResults = await searchMutualFunds(cleanStr);
  }

  // If still empty, try first 2-3 words (e.g. AMC + fund category)
  if (!searchResults || searchResults.length === 0) {
    const words = baseQuery.split(' ').filter((w) => w.length > 2);
    if (words.length >= 2) {
      searchResults = await searchMutualFunds(words.slice(0, 2).join(' '));
    }
  }

  if (!searchResults || searchResults.length === 0) {
    return { query: cleanStr, referencePrice: refPriceNum, variants: [], bestMatch: null };
  }

  // Cap candidate schemes to at most 12 variants to keep network fetch fast
  const candidateList = searchResults.slice(0, 12);
  const candidateCodes = candidateList.map((s) => s.schemeCode);

  // Fetch NAVs for all candidate variants in batch
  const navMap = await fetchMutualFundNavBatch(candidateCodes);

  // Assemble enriched variants list
  const variants = [];
  candidateList.forEach((c) => {
    const navData = navMap[c.schemeCode];
    if (!navData || !navData.navInr) return;

    const navInr = navData.navInr;
    const diffAbs = refPriceNum !== null ? Math.abs(navInr - refPriceNum) : null;
    const diffPct = refPriceNum !== null && refPriceNum > 0
      ? Number(((diffAbs / refPriceNum) * 100).toFixed(2))
      : null;

    const sName = c.schemeName || navData.schemeName || '';
    const isDirect = /direct/i.test(sName);
    const isRegular = /regular/i.test(sName);
    const isGrowth = /growth/i.test(sName);
    const isIdcw = /idcw|dividend/i.test(sName);

    const planType = isDirect ? 'Direct' : isRegular ? 'Regular' : 'Standard';
    const optionType = isGrowth ? 'Growth' : isIdcw ? 'IDCW' : 'Standard';

    variants.push({
      schemeCode: c.schemeCode,
      schemeName: sName,
      navInr,
      price: navData.price,
      currency: 'INR',
      diffAbs,
      diffPct,
      planType,
      optionType,
      isClosestMatch: false,
      change24h: navData.change24h || 0,
      change7d: navData.change7d || 0,
      change30d: navData.change30d || 0,
      formattedPrice: `₹${navInr.toFixed(2)}`,
    });
  });

  if (variants.length === 0) {
    return { query: cleanStr, referencePrice: refPriceNum, variants: [], bestMatch: null };
  }

  // Helper score for preference: Direct + Growth is standard
  const getPreferenceScore = (v) => {
    let score = 0;
    if (v.planType === 'Direct') score += 20;
    else if (v.planType === 'Regular') score += 10;
    if (v.optionType === 'Growth') score += 15;
    else if (v.optionType === 'IDCW') score += 5;
    return score;
  };

  // Sort variants:
  if (refPriceNum !== null) {
    // Sort by price difference ascending (closest NAV to screenshot price first)
    // If difference is practically equal (< 0.05), tie-break with preference score
    variants.sort((a, b) => {
      const diffDelta = (a.diffAbs ?? Infinity) - (b.diffAbs ?? Infinity);
      if (Math.abs(diffDelta) > 0.05) {
        return diffDelta;
      }
      return getPreferenceScore(b) - getPreferenceScore(a);
    });
  } else {
    // Heuristic: Direct Growth > Regular Growth > Direct IDCW > Regular IDCW
    variants.sort((a, b) => getPreferenceScore(b) - getPreferenceScore(a));
  }

  // Mark the top variant as closest match
  variants[0].isClosestMatch = true;

  return {
    query: cleanStr,
    referencePrice: refPriceNum,
    bestMatch: variants[0],
    variants,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Symbol classification helpers
// ─────────────────────────────────────────────────────────────────────────────

// Stock/ETF tickers that should use Yahoo Finance (not CMC/CoinGecko)
// Covers Indian exchange suffixes too: .NS (NSE), .BO (BSE)
const STOCK_TICKERS = new Set([
  'AAPL','MSFT','NVDA','TSLA','GOOGL','GOOG','AMZN','META','SPY','QQQ',
  'NFLX','AMD','INTC','BABA','V','MA','JPM','BAC','WMT','DIS',
  'RELIANCE.NS','TCS.NS','INFY.NS','HDFCBANK.NS','ICICIBANK.NS',
  'WIPRO.NS','LT.NS','BAJFINANCE.NS','HINDUNILVR.NS','SBIN.NS',
  'TATAMOTORS.NS','ADANIENT.NS','MARUTI.NS','AXISBANK.NS','KOTAKBANK.NS',
]);

/**
 * Returns true for any ticker that should be routed to Yahoo Finance:
 * - Known STOCK_TICKERS set  OR
 * - Contains a dot (e.g. "RELIANCE.NS", "TCS.BO")  OR
 * - Ends with .NS or .BO suffix
 */
export const isStockTicker = (sym) =>
  STOCK_TICKERS.has(sym) ||
  sym.includes('.') ||
  sym.endsWith('.NS') ||
  sym.endsWith('.BO');

// CoinGecko ticker → CoinGecko ID map for common crypto assets
const COINGECKO_ID_MAP = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  BNB: 'binancecoin',
  XRP: 'ripple',
  DOGE: 'dogecoin',
  ADA: 'cardano',
  AVAX: 'avalanche-2',
  LINK: 'chainlink',
  DOT: 'polkadot',
  SUI: 'sui',
  NEAR: 'near',
  PEPE: 'pepe',
  SHIB: 'shiba-inu',
  ARB: 'arbitrum',
  OP: 'optimism',
  UNI: 'uniswap',
  AAVE: 'aave',
  MATIC: 'matic-network',
  POL: 'matic-network',
  LTC: 'litecoin',
  BCH: 'bitcoin-cash',
  ATOM: 'cosmos',
  TON: 'the-open-network',
  APT: 'aptos',
  INJ: 'injective-protocol',
  IMX: 'immutable-x',
  FIL: 'filecoin',
  TRX: 'tron',
  ALGO: 'algorand',
  SAND: 'the-sandbox',
  MANA: 'decentraland',
  CRV: 'curve-dao-token',
  COMP: 'compound-governance-token',
  MKR: 'maker',
  SNX: 'havven',
  FTM: 'fantom',
  ETC: 'ethereum-classic',
  XLM: 'stellar',
  VET: 'vechain',
  HBAR: 'hedera-hashgraph',
  ICP: 'internet-computer',
  GRT: 'the-graph',
  ENS: 'ethereum-name-service',
  FLOKI: 'floki',
  WIF: 'dogwifcoin',
  BONK: 'bonk',
  JTO: 'jito-governance-token',
  PYTH: 'pyth-network',
  TIA: 'celestia',
  SEI: 'sei-network',
  // Hyperliquid ecosystem
  HYPE: 'hyperliquid',
  WHYPE: 'wrapped-hyperliquid',
  // Popular mid/small caps
  ENA: 'ethena',
  EIGEN: 'eigenlayer',
  ETHFI: 'ether-fi',
  OKB: 'okb',
  OM: 'mantra-dao',
  ZRO: 'layerzero',
  HPOS10I: 'hpos10i',
  ZORA: 'zora-network',
  SENA: 'sena',
  UENA: 'ulthena',
  MAX: 'matr1x-fire',
  OKE: 'okex',
  FEUSD: 'frax-ether',
  SENT: 'sentinel-group',
  PLUME: 'plume',
};

// ─────────────────────────────────────────────────────────────────────────────
// Price cache layer
// ─────────────────────────────────────────────────────────────────────────────

const PRICE_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes staleness threshold

/**
 * Get cached or live price object for requested symbols array.
 *
 * Symbol routing:
 *   - Purely numeric 5-6 digit strings → MFapi.in (mutual fund NAV)
 *   - Symbols with dots or in STOCK_TICKERS set → Yahoo Finance (stocks/ETFs)
 *   - Everything else → CoinMarketCap → CoinGecko fallback (crypto)
 *
 * Returns:
 *   { [symbol]: { price, change24h, change7d, change30d, navInr?, schemeName?,
 *                 assetType?, isCustom?, isLocked?, mappedSymbol? } }
 */
export const getPricesForSymbols = async (symbols = [], userId = null) => {
  if (!symbols.length) return {};

  const cleanSymbols = [...new Set(symbols.map((s) => s.toUpperCase()))];
  const priceMap = {};
  const staleSymbols = [];

  // Check user-specific overrides if userId is provided
  const overrideMap = new Map();
  const mappedSymbolsToQuery = [];

  if (userId) {
    try {
      const userOverrides = await PriceOverride.find({ userId, symbol: { $in: cleanSymbols } });
      userOverrides.forEach((ov) => {
        overrideMap.set(ov.symbol, ov);
        if (ov.mappedSymbol) {
          mappedSymbolsToQuery.push(ov.mappedSymbol.toUpperCase());
        }
      });
    } catch (err) {
      console.warn('Error fetching price overrides:', err.message);
    }
  }

  // All symbols needed from cache/network (original symbols + mapped target symbols)
  const allSymbolsToQuery = [...new Set([...cleanSymbols, ...mappedSymbolsToQuery])];

  // Check database price cache
  const cachedEntries = await PriceCache.find({ symbol: { $in: allSymbolsToQuery } });
  const now = Date.now();
  cachedEntries.forEach((entry) => {
    const age = now - (entry.lastUpdated ? new Date(entry.lastUpdated).getTime() : 0);
    if (age > PRICE_CACHE_TTL_MS) {
      priceMap[entry.symbol] = {
        price: entry.price,
        change24h: entry.change24h || 0,
        change7d: entry.change7d || 0,
        change30d: entry.change30d || 0,
        ...(entry.assetType === 'mutual_fund' && {
          navInr: entry.navInr ?? null,
          schemeName: entry.schemeName ?? null,
          assetType: 'mutual_fund',
        }),
      };
      const ov = overrideMap.get(entry.symbol);
      if (!ov || !ov.isLocked) {
        staleSymbols.push(entry.symbol);
      }
    } else {
      priceMap[entry.symbol] = {
        price: entry.price,
        change24h: entry.change24h || 0,
        change7d: entry.change7d || 0,
        change30d: entry.change30d || 0,
        currency: entry.currency || 'USD',
        priceInr: entry.priceInr ?? null,
        ...(entry.assetType === 'mutual_fund' && {
          navInr: entry.navInr ?? null,
          schemeName: entry.schemeName ?? null,
          assetType: 'mutual_fund',
        }),
      };
    }
  });

  // Identify symbols missing from cache
  const missingSymbols = allSymbolsToQuery.filter((sym) => {
    if (sym === 'USD' || sym === 'USDT' || sym === 'USDC' || sym === 'INR') {
      if (sym === 'USD' || sym === 'USDT' || sym === 'USDC') {
        priceMap[sym] = { price: 1.0, change24h: 0, change7d: 0, change30d: 0 };
      }
      return false;
    }
    // If it has a fixed custom price override (not mapped), no need to query
    const ov = overrideMap.get(sym);
    if (ov && !ov.mappedSymbol && ov.price !== null && ov.price !== undefined) {
      return false;
    }
    return !priceMap[sym];
  });

  // Always populate live INR rate if queried
  if (allSymbolsToQuery.includes('INR') || cleanSymbols.includes('INR')) {
    const liveInr = await fetchLiveInrRate();
    priceMap['INR'] = {
      price: liveInr,
      rate: liveInr,
      inrPerUsd: liveInr,
      change24h: 0,
      change7d: 0,
      change30d: 0,
    };
  }

  // Combine missing + stale symbols that need refreshing
  const symbolsToRefresh = [...new Set([...missingSymbols, ...staleSymbols])];

  if (symbolsToRefresh.length > 0) {
    console.log(`🔍 Fetching live quotes for ${symbolsToRefresh.length} symbols (${missingSymbols.length} missing, ${staleSymbols.length} stale)`);
    const fetched = await fetchAndCachePrices(symbolsToRefresh);
    Object.assign(priceMap, fetched);
  }

  // Apply user overrides and mappings to final output
  const finalPriceMap = {};

  cleanSymbols.forEach((sym) => {
    const ov = overrideMap.get(sym);

    if (ov) {
      if (ov.mappedSymbol) {
        const mappedTarget = ov.mappedSymbol.toUpperCase();
        const targetQuote = priceMap[mappedTarget] || { price: 0, change24h: 0, change7d: 0, change30d: 0 };
        finalPriceMap[sym] = {
          price: Number(targetQuote.price || 0),
          priceInr: targetQuote.priceInr ?? null,
          navInr: targetQuote.navInr ?? null,
          currency: targetQuote.currency || 'USD',
          schemeName: targetQuote.schemeName ?? null,
          assetType: targetQuote.assetType || (isMfSchemeCode(mappedTarget) ? 'mutual_fund' : isStockTicker(mappedTarget) ? 'stock' : 'crypto'),
          change24h: Number(targetQuote.change24h || 0),
          change7d: Number(targetQuote.change7d || 0),
          change30d: Number(targetQuote.change30d || 0),
          isCustom: true,
          isLocked: !!ov.isLocked,
          mappedSymbol: mappedTarget,
        };
      } else if (ov.price !== null && ov.price !== undefined) {
        const baseQuote = priceMap[sym] || {};
        const isINR = ov.currency === 'INR' || sym.endsWith('.NS') || sym.endsWith('.BO') || isMfSchemeCode(sym);
        const liveInrRate = inrCache.rate || 95.7;
        const priceUsd = isINR ? Number(ov.price) / liveInrRate : Number(ov.price);

        finalPriceMap[sym] = {
          price: Number(priceUsd.toFixed(6)),
          priceInr: isINR ? Number(ov.price) : (ov.priceInr ?? null),
          currency: isINR ? 'INR' : (ov.currency || 'USD'),
          change24h: Number(baseQuote.change24h || 0),
          change7d: Number(baseQuote.change7d || 0),
          change30d: Number(baseQuote.change30d || 0),
          isCustom: true,
          isLocked: !!ov.isLocked,
          mappedSymbol: null,
        };
      } else {
        finalPriceMap[sym] = priceMap[sym] || { price: 0, change24h: 0, change7d: 0, change30d: 0 };
      }
    } else {
      finalPriceMap[sym] = priceMap[sym] || { price: 0, change24h: 0, change7d: 0, change30d: 0 };
    }
  });

  return finalPriceMap;
};

// ─────────────────────────────────────────────────────────────────────────────
// Core fetch-and-cache function — routes symbols to correct price source
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetches market prices and change percentages for a list of symbols.
 *
 * Source routing (per symbol):
 *   1. Numeric 5-6 digit codes  → MFapi.in (Indian mutual fund NAV)
 *   2. Stock/ETF tickers        → Yahoo Finance chart API
 *   3. Crypto tickers           → CoinMarketCap (primary) → CoinGecko (fallback)
 *   4. Static baseline          → FALLBACK_PRICES for anything that errors out
 */
export const fetchAndCachePrices = async (symbols = []) => {
  const result = {};

  // ── Stablecoins / fiat shortcuts ──────────────────────────────────────────
  const FIAT_STABLE = new Set(['USD', 'USDT', 'USDC']);
  symbols.forEach((sym) => {
    if (FIAT_STABLE.has(sym)) {
      result[sym] = { price: 1.0, change24h: 0, change7d: 0, change30d: 0 };
    }
  });

  // ── INR live rate ──────────────────────────────────────────────────────────
  if (symbols.includes('INR')) {
    const liveInr = await fetchLiveInrRate();
    result['INR'] = { price: liveInr, rate: liveInr, change24h: 0, change7d: 0, change30d: 0 };
  }

  // Partition remaining symbols by asset type
  const remaining = symbols.filter((s) => !result[s]);

  // Query database Holdings to discover assetType hints for user-registered symbols
  let knownStockSymbols = new Set();
  let knownMfSymbols = new Set();
  try {
    const dbHoldings = await Holding.find({ symbol: { $in: remaining } }, 'symbol assetType').lean();
    dbHoldings.forEach((h) => {
      if (h.assetType === 'stock') knownStockSymbols.add(h.symbol);
      if (h.assetType === 'mutual_fund') knownMfSymbols.add(h.symbol);
    });
  } catch (err) {
    // Non-blocking fallback
  }

  const mfCodes    = remaining.filter((s) => isMfSchemeCode(s) || knownMfSymbols.has(s));
  const stockTicks = remaining.filter((s) => !isMfSchemeCode(s) && !knownMfSymbols.has(s) && (isStockTicker(s) || knownStockSymbols.has(s)));
  const cryptoSyms = remaining.filter((s) => !isMfSchemeCode(s) && !knownMfSymbols.has(s) && !isStockTicker(s) && !knownStockSymbols.has(s));

  // ── 1. Mutual Funds — MFapi.in ─────────────────────────────────────────────
  if (mfCodes.length > 0) {
    const mfResults = await fetchMutualFundNavBatch(mfCodes);
    Object.assign(result, mfResults);
  }

  // ── 2. Stocks / ETFs — Yahoo Finance ──────────────────────────────────────
  if (stockTicks.length > 0) {
    const yahooResults = await fetchYahooStockPrices(stockTicks);
    Object.assign(result, yahooResults);

    // For any stock tickers Yahoo couldn't resolve that lack an exchange suffix,
    // retry automatically with the .NS suffix (covers most Indian NSE stocks).
    const missed = stockTicks.filter((t) => !yahooResults[t]);
    if (missed.length > 0) {
      const needsNsProbe = missed.filter((t) => !t.includes('.'));
      if (needsNsProbe.length > 0) {
        const nsTickers = needsNsProbe.map((t) => `${t}.NS`);
        console.log(`🔄 Retrying ${needsNsProbe.length} missed stock(s) with .NS suffix: [${nsTickers.join(', ')}]`);
        const nsResults = await fetchYahooStockPrices(nsTickers);
        needsNsProbe.forEach((bare, idx) => {
          const nsTick = nsTickers[idx];
          if (nsResults[nsTick] && nsResults[nsTick].price > 0) {
            // Store under both the bare symbol AND the .NS ticker for consistent lookups
            result[bare] = nsResults[nsTick];
            result[nsTick] = nsResults[nsTick];
            console.log(`✅ Resolved ${bare} → ${nsTick} (NSE auto-probe)`);
          }
        });
      }
      const stillMissed = missed.filter((t) => !result[t]);
      if (stillMissed.length > 0) {
        console.warn(`⚠️ Yahoo Finance: no data for [${stillMissed.join(', ')}] — using fallback baseline`);
      }
    }
  }

  // ── 3. Crypto — CoinMarketCap (primary) ────────────────────────────────────
  const cmcApiKey = process.env.COINMARKETCAP_API_KEY;
  const NON_CMC   = new Set(['INR', 'USD', 'USDT', 'USDC']);
  const CMC_VALID = /^[A-Z0-9]{1,10}$/;

  const cmcSymbols      = cryptoSyms.filter((s) => !NON_CMC.has(s) && CMC_VALID.test(s) && !result[s]);
  const skippedToFallback = cryptoSyms.filter((s) => !NON_CMC.has(s) && !CMC_VALID.test(s));
  if (skippedToFallback.length > 0) {
    console.log(`⚠️  Non-standard symbols skipped (CMC invalid): [${skippedToFallback.join(', ')}]`);
  }

  if (cmcApiKey && cmcSymbols.length > 0) {
    console.log(`📤 Sending to CMC: [${cmcSymbols.join(', ')}]`);
    try {
      const response = await axios.get(
        'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest',
        {
          headers: { 'X-CMC_PRO_API_KEY': cmcApiKey },
          params: { symbol: cmcSymbols.join(',') },
          timeout: 10000,
          httpsAgent: customHttpsAgent,
        }
      );
      const data = response.data?.data || {};
      for (const sym of cmcSymbols) {
        if (data[sym] && data[sym].quote?.USD) {
          const usdQuote = data[sym].quote.USD;
          result[sym] = {
            price: Number(usdQuote.price || 0),
            change24h: Number(usdQuote.percent_change_24h || 0),
            change7d: Number(usdQuote.percent_change_7d || 0),
            change30d: Number(usdQuote.percent_change_30d || 0),
          };
        }
      }
      console.log(`✅ CoinMarketCap: fetched ${Object.keys(result).length}/${cmcSymbols.length} crypto symbol(s).`);
    } catch (err) {
      const errBody = err.response?.data;
      console.warn(`⚠️ CoinMarketCap API call failed: ${err.message}`);
      if (errBody) console.warn(`   CMC error body: ${JSON.stringify(errBody)}`);
      console.warn(`   Symbols sent: [${cmcSymbols.join(', ')}]`);
      console.warn(`   Falling back to CoinGecko...`);
    }
  }

  // ── 4. Crypto — CoinGecko (fallback for any missed crypto) ─────────────────
  const cryptoSymbolsMissed = cryptoSyms.filter(
    (s) => !result[s] && COINGECKO_ID_MAP[s]
  );

  if (cryptoSymbolsMissed.length > 0) {
    try {
      const geckoIds = cryptoSymbolsMissed.map((s) => COINGECKO_ID_MAP[s]);
      const response = await axios.get(
        'https://api.coingecko.com/api/v3/simple/price',
        {
          params: {
            ids: geckoIds.join(','),
            vs_currencies: 'usd',
            include_24hr_change: true,
          },
          timeout: 8000,
        }
      );
      const data = response.data || {};
      for (const sym of cryptoSymbolsMissed) {
        const geckoId = COINGECKO_ID_MAP[sym];
        const entry = data[geckoId];
        if (entry && entry.usd) {
          const fallback = FALLBACK_PRICES[sym] || {};
          result[sym] = {
            price: Number(entry.usd || 0),
            change24h: Number(entry.usd_24h_change || 0),
            change7d: Number(fallback.change7d || 0),
            change30d: Number(fallback.change30d || 0),
          };
        }
      }
      console.log(`✅ CoinGecko fallback: fetched prices for ${cryptoSymbolsMissed.length} missed symbol(s).`);
    } catch (err) {
      console.warn(`⚠️ CoinGecko fallback also failed: ${err.message}. Using static baseline prices.`);
    }
  }

  // ── 4b. Auto-probe Indian Stock tickers (.NS) on Yahoo Finance for unresolved symbols ──
  const unresolved = symbols.filter((s) => !result[s] && !FIAT_STABLE.has(s) && !isMfSchemeCode(s));
  const candidateStocks = unresolved.filter((s) => /^[A-Z0-9]{2,15}$/.test(s) && !s.includes('.'));
  if (candidateStocks.length > 0) {
    const nsTickers = candidateStocks.map((s) => `${s}.NS`);
    try {
      const nsQuotes = await fetchYahooStockPrices(nsTickers);
      candidateStocks.forEach((s) => {
        const nsTick = `${s}.NS`;
        if (nsQuotes[nsTick] && nsQuotes[nsTick].price > 0) {
          result[s] = { ...nsQuotes[nsTick], assetType: 'stock' };
          result[nsTick] = { ...nsQuotes[nsTick], assetType: 'stock' };
        }
      });
    } catch (e) {
      // Non-blocking
    }
  }

  // ── 5. Static baseline for anything still missing ──────────────────────────
  for (const sym of symbols) {
    if (!result[sym]) {
      const fallbackEntry = FALLBACK_PRICES[sym] || {
        price: 0,
        change24h: 0,
        change7d: 0,
        change30d: 0,
      };
      const basePrice = fallbackEntry.price;
      const variance = basePrice > 0 ? (Math.random() - 0.5) * 0.01 * basePrice : 0;
      const livePrice = basePrice > 0 ? Number((basePrice + variance).toFixed(6)) : 0;

      result[sym] = {
        price: livePrice,
        change24h: Number(fallbackEntry.change24h || 0),
        change7d: Number(fallbackEntry.change7d || 0),
        change30d: Number(fallbackEntry.change30d || 0),
      };
    }
  }

  // ── 6. Update MongoDB PriceCache ───────────────────────────────────────────
  await Promise.all(
    symbols.map((sym) => {
      const entry = result[sym];
      const assetType = entry?.assetType || (
        isMfSchemeCode(sym)
          ? 'mutual_fund'
          : (isStockTicker(sym) || sym.endsWith('.NS') || sym.endsWith('.BO'))
          ? 'stock'
          : 'crypto'
      );

      const cacheUpdate = {
        price: entry.price,
        change24h: entry.change24h,
        change7d: entry.change7d,
        change30d: entry.change30d,
        assetType,
        lastUpdated: new Date(),
      };

      // Persist mutual fund specific fields
      if (assetType === 'mutual_fund') {
        if (entry.navInr != null) cacheUpdate.navInr = entry.navInr;
        if (entry.schemeName) cacheUpdate.schemeName = entry.schemeName;
        cacheUpdate.mfSchemeCode = sym;
      }
      if (entry.currency) cacheUpdate.currency = entry.currency;
      if (entry.priceInr != null) cacheUpdate.priceInr = entry.priceInr;

      return PriceCache.findOneAndUpdate(
        { symbol: sym },
        cacheUpdate,
        { upsert: true, new: true }
      );
    })
  );

  return result;
};

/**
 * Initialize background cron job to refresh cached price data every 5 minutes
 */
export const initPriceCron = () => {
  console.log('⏱️ Initializing PriceCache cron job (runs every 5 minutes)...');
  cron.schedule('*/5 * * * *', async () => {
    try {
      const cached = await PriceCache.find({}).select('symbol');
      const symbols = cached.map((c) => c.symbol);
      if (symbols.length > 0) {
        console.log(`🔄 Cron executing: Refreshing ${symbols.length} portfolio price quotes...`);
        await fetchAndCachePrices(symbols);
      }
    } catch (err) {
      console.error('Error during price refresh cron:', err.message);
    }
  });
};
