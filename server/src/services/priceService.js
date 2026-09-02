import axios from 'axios';
import cron from 'node-cron';
import { PriceCache } from '../models/PriceCache.js';
import { PriceOverride } from '../models/PriceOverride.js';

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
};

/**
 * Get cached or live price object for requested symbols array
 * Returns: { [symbol]: { price: number, change24h: number, change7d: number, change30d: number, isCustom?: boolean, isLocked?: boolean, mappedSymbol?: string } }
 */
const PRICE_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes staleness threshold

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
      // Entry exists but is stale — use it as a fallback but mark for refresh
      priceMap[entry.symbol] = {
        price: entry.price,
        change24h: entry.change24h || 0,
        change7d: entry.change7d || 0,
        change30d: entry.change30d || 0,
      };
      // Only mark for refresh if not a locked custom price
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
      };
    }
  });

  // Identify symbols missing from cache
  const missingSymbols = allSymbolsToQuery.filter((sym) => {
    if (sym === 'USD' || sym === 'USDT' || sym === 'USDC') {
      priceMap[sym] = { price: 1.0, change24h: 0, change7d: 0, change30d: 0 };
      return false;
    }
    // If it has a fixed custom price override (not mapped), we don't need to query CMC
    const ov = overrideMap.get(sym);
    if (ov && !ov.mappedSymbol && ov.price !== null && ov.price !== undefined) {
      return false;
    }
    return !priceMap[sym];
  });

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
        // Ticker mapping: inherit mapped symbol's price & change stats
        const mappedTarget = ov.mappedSymbol.toUpperCase();
        const targetQuote = priceMap[mappedTarget] || { price: 0, change24h: 0, change7d: 0, change30d: 0 };
        finalPriceMap[sym] = {
          price: Number(targetQuote.price || 0),
          change24h: Number(targetQuote.change24h || 0),
          change7d: Number(targetQuote.change7d || 0),
          change30d: Number(targetQuote.change30d || 0),
          isCustom: true,
          isLocked: !!ov.isLocked,
          mappedSymbol: mappedTarget,
        };
      } else if (ov.price !== null && ov.price !== undefined) {
        // Fixed custom price
        const baseQuote = priceMap[sym] || {};
        finalPriceMap[sym] = {
          price: Number(ov.price),
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

/**
 * Fetches market prices and 24h/7d/30d change percentages from CoinMarketCap / Fallbacks and updates PriceCache
 */
export const fetchAndCachePrices = async (symbols = []) => {
  const result = {};
  const cmcApiKey = process.env.COINMARKETCAP_API_KEY;

  if (cmcApiKey && symbols.length > 0) {
    try {
      const response = await axios.get(
        'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest',
        {
          headers: { 'X-CMC_PRO_API_KEY': cmcApiKey },
          params: { symbol: symbols.join(',') },
          timeout: 5000,
        }
      );

      const data = response.data?.data || {};
      for (const sym of symbols) {
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
    } catch (err) {
      console.warn(`⚠️ CoinMarketCap API call failed: ${err.message}. Using fallback baseline prices.`);
    }
  }

  // Populate any missing symbols with baseline or small randomized fluctuation simulation
  for (const sym of symbols) {
    if (!result[sym]) {
      const fallbackEntry = FALLBACK_PRICES[sym] || {
        price: 0,
        change24h: 0,
        change7d: 0,
        change30d: 0,
      };

      const basePrice = fallbackEntry.price;
      // Small +/- 0.5% dynamic variance only for known baseline assets
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

  // Update MongoDB PriceCache in parallel
  await Promise.all(
    symbols.map((sym) =>
      PriceCache.findOneAndUpdate(
        { symbol: sym },
        {
          price: result[sym].price,
          change24h: result[sym].change24h,
          change7d: result[sym].change7d,
          change30d: result[sym].change30d,
          assetType: ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'GOOGL', 'AMZN', 'META', 'SPY', 'QQQ'].includes(sym)
            ? 'stock'
            : 'crypto',
          lastUpdated: new Date(),
        },
        { upsert: true, new: true }
      )
    )
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

