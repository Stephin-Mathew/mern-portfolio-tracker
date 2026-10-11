import express from 'express';
import {
  getPricesForSymbols,
  fetchAndCachePrices,
  searchMutualFunds,
  fetchMutualFundNav,
  resolveMutualFundVariants,
  fetchYahooStockPrices,
  isStockTicker,
  isMfSchemeCode,
} from '../services/priceService.js';
import { Holding } from '../models/Holding.js';
import { PriceOverride } from '../models/PriceOverride.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

const BENCHMARK_SYMBOLS = ['BTC', 'HYPE', 'INR', 'USD'];

/**
 * @route   GET /api/prices
 * @desc    Get cached prices for user's portfolio symbols or passed query symbols (with user overrides applied)
 * @access  Private
 */
router.get('/', async (req, res) => {
  try {
    let symbols = [];
    if (req.query.symbols) {
      // Client already sends the symbols — no DB query needed
      symbols = req.query.symbols.split(',').map((s) => s.trim().toUpperCase());
    } else {
      // Fallback: use distinct() instead of find().select() — returns only unique strings
      symbols = await Holding.distinct('symbol', { userId: req.user._id });
    }

    // Always include conversion benchmarks so client can convert to BTC, HYPE, INR, etc.
    const symbolsToQuery = [...new Set([...symbols, ...BENCHMARK_SYMBOLS])];
    const priceMap = await getPricesForSymbols(symbolsToQuery, req.user._id);
    res.json({ prices: priceMap });
  } catch (error) {
    console.error('Fetch Prices Error:', error);
    res.status(500).json({ message: 'Failed to retrieve price data' });
  }
});

/**
 * @route   POST /api/prices/refresh
 * @desc    Manually trigger price cache refresh for user's portfolio symbols
 * @access  Private
 */
router.post('/refresh', async (req, res) => {
  try {
    const userHoldings = await Holding.find({ userId: req.user._id }).select('symbol');
    const symbols = [...new Set([...userHoldings.map((h) => h.symbol), ...BENCHMARK_SYMBOLS])];

    await fetchAndCachePrices(symbols);
    const refreshedPriceMap = await getPricesForSymbols(symbols, req.user._id);

    res.json({ message: 'Price cache updated', prices: refreshedPriceMap });
  } catch (error) {
    console.error('Refresh Prices Error:', error);
    res.status(500).json({ message: 'Failed to refresh price data' });
  }
});

/**
 * @route   POST /api/prices/override
 * @desc    Set a user-scoped custom price or ticker mapping for a symbol
 * @access  Private
 */
router.post('/override', async (req, res) => {
  try {
    const { symbol, price, mappedSymbol, isLocked, notes, currency } = req.body;

    if (!symbol || !symbol.trim()) {
      return res.status(400).json({ message: 'Symbol is required' });
    }

    const cleanSymbol = symbol.trim().toUpperCase();
    const cleanMapped = mappedSymbol && mappedSymbol.trim() ? mappedSymbol.trim().toUpperCase() : null;

    let parsedPrice = null;
    if (price !== undefined && price !== null && price !== '') {
      parsedPrice = Number(price);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        return res.status(400).json({ message: 'Price must be a valid positive number' });
      }
    }

    if (parsedPrice === null && !cleanMapped) {
      return res.status(400).json({ message: 'Please provide either a custom price or a mapped ticker symbol' });
    }

    const override = await PriceOverride.findOneAndUpdate(
      { userId: req.user._id, symbol: cleanSymbol },
      {
        price: cleanMapped ? null : parsedPrice,
        mappedSymbol: cleanMapped,
        isLocked: isLocked !== undefined ? !!isLocked : true,
        notes: notes || '',
        currency: currency || 'USD',
      },
      { upsert: true, new: true }
    );

    // Fetch updated price quote for this symbol with override applied
    const priceMap = await getPricesForSymbols([cleanSymbol], req.user._id);

    res.json({
      message: cleanMapped
        ? `Asset ${cleanSymbol} mapped to ${cleanMapped}`
        : `Custom price for ${cleanSymbol} saved and locked`,
      override,
      price: priceMap[cleanSymbol],
      prices: priceMap,
    });
  } catch (error) {
    console.error('Price Override Error:', error);
    res.status(500).json({ message: error.message || 'Failed to save price override' });
  }
});

/**
 * @route   DELETE /api/prices/override/:symbol
 * @desc    Remove custom price override/mapping and revert to live market price
 * @access  Private
 */
router.delete('/override/:symbol', async (req, res) => {
  try {
    const cleanSymbol = req.params.symbol.trim().toUpperCase();

    await PriceOverride.deleteOne({ userId: req.user._id, symbol: cleanSymbol });

    // Fetch original live market price
    const priceMap = await getPricesForSymbols([cleanSymbol], req.user._id);

    res.json({
      message: `Price override for ${cleanSymbol} removed — reverted to live market price`,
      symbol: cleanSymbol,
      price: priceMap[cleanSymbol],
      prices: priceMap,
    });
  } catch (error) {
    console.error('Remove Price Override Error:', error);
    res.status(500).json({ message: error.message || 'Failed to remove price override' });
  }
});

/**
 * @route   GET /api/prices/mf/search
 * @desc    Search for Indian mutual fund schemes by name (via MFapi.in)
 * @access  Private
 * @query   q {string} - search query (fund name or AMC)
 */
router.get('/mf/search', async (req, res) => {
  try {
    const query = (req.query.q || '').trim();
    if (!query || query.length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' });
    }
    const results = await searchMutualFunds(query);
    res.json({ results });
  } catch (error) {
    console.error('MF Search Error:', error);
    res.status(500).json({ message: 'Failed to search mutual fund schemes' });
  }
});

/**
 * @route   GET /api/prices/mf/variants
 * @desc    Fetch mutual fund plan variants (Direct/Regular, Growth/IDCW), their live NAVs,
 *          and auto-select the variant closest to referencePrice (screenshot price).
 * @access  Private
 * @query   q {string} - fund name or scheme code
 * @query   referencePrice {number} - screenshot price for comparison
 */
router.get('/mf/variants', async (req, res) => {
  try {
    const query = (req.query.q || '').trim();
    if (!query || query.length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' });
    }
    const referencePrice = req.query.referencePrice ? Number(req.query.referencePrice) : null;
    const result = await resolveMutualFundVariants(query, referencePrice);
    res.json(result);
  } catch (error) {
    console.error('MF Variants Error:', error);
    res.status(500).json({ message: 'Failed to fetch mutual fund variants' });
  }
});

/**
 * @route   GET /api/prices/mf/:schemeCode
 * @desc    Fetch the latest NAV for a specific MFapi.in scheme code
 * @access  Private
 */
router.get('/mf/:schemeCode', async (req, res) => {
  try {
    const { schemeCode } = req.params;
    if (!isMfSchemeCode(schemeCode)) {
      return res.status(400).json({ message: 'Invalid scheme code — must be a 5 or 6 digit number' });
    }
    const nav = await fetchMutualFundNav(schemeCode);
    if (!nav) {
      return res.status(404).json({ message: `No NAV data found for scheme code ${schemeCode}` });
    }
    res.json({ schemeCode, ...nav });
  } catch (error) {
    console.error('MF NAV Fetch Error:', error);
    res.status(500).json({ message: 'Failed to fetch mutual fund NAV' });
  }
});

/**
 * @route   POST /api/prices/lookup-batch
 * @desc    Smart batch lookup for portfolio items / screenshot extractions with automatic Indian stock (.NS)
 *          and mutual fund scheme resolution.
 * @access  Private
 */
router.post('/lookup-batch', async (req, res) => {
  try {
    const { items = [] } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.json({ prices: {}, resolvedMap: {} });
    }

    const priceMap = {};
    const resolvedMap = {};

    // Get benchmark quotes like INR so conversions work accurately
    const benchmarkQuotes = await getPricesForSymbols(['INR', 'USD'], req.user._id);
    Object.assign(priceMap, benchmarkQuotes);
    const inrRate = Number(benchmarkQuotes.INR?.price || 95.7);

    const mfItems = [];
    const stockCandidates = [];
    const generalSymbols = [];

    items.forEach((it) => {
      const sym = (it.symbol || '').trim();
      const assetType = it.assetType;
      if (!sym) return;

      const upper = sym.toUpperCase();

      if (assetType === 'cash') {
        priceMap[upper] = {
          price: 1.0,
          priceInr: 1.0,
          currency: 'INR',
          change24h: 0,
          change7d: 0,
          change30d: 0,
        };
        resolvedMap[upper] = {
          resolvedSymbol: upper,
          assetType: 'cash',
          currency: 'INR',
          livePrice: 1.0,
        };
        return;
      }

      const mapped = it.mappedSymbol ? String(it.mappedSymbol).trim().toUpperCase() : null;

      if (assetType === 'mutual_fund' || isMfSchemeCode(sym) || (mapped && isMfSchemeCode(mapped))) {
        mfItems.push({
          original: sym,
          name: it.name || it.schemeName || sym,
          mappedSymbol: mapped,
          // AI-provided scheme code or user-mapped code takes priority over name-based search
          mfSchemeCode: it.mfSchemeCode
            ? String(it.mfSchemeCode).trim()
            : (mapped && isMfSchemeCode(mapped) ? mapped : null),
          targetPrice: it.extractedPrice !== undefined && it.extractedPrice !== null ? Number(it.extractedPrice) : (it.targetPrice || null),
        });
      } else if (assetType === 'stock' || isStockTicker(upper) || (mapped && isStockTicker(mapped)) || !sym.includes('.')) {
        stockCandidates.push({
          sym,
          mappedSymbol: mapped,
          // AI-provided Yahoo ticker or user-mapped ticker (e.g. CANBK.NS) takes priority over blind .NS probing
          yahooSymbol: it.yahooSymbol
            ? String(it.yahooSymbol).trim().toUpperCase()
            : mapped || null,
        });
      } else {
        generalSymbols.push(upper);
        if (mapped) generalSymbols.push(mapped);
      }
    });

    // 1. Process Mutual Funds:
    for (const mf of mfItems) {
      try {
        const origUpper = mf.original.toUpperCase();

        // Determine which scheme code to query — prefer AI-provided/mapped, then check if original IS a code
        const schemeCodeToQuery = mf.mfSchemeCode || (isMfSchemeCode(mf.original) ? mf.original : null);

        if (schemeCodeToQuery) {
          // Direct fetch by scheme code — most reliable path
          console.log(`🏦 MF direct lookup by scheme code ${schemeCodeToQuery} for "${mf.original}"`);
          const nav = await fetchMutualFundNav(schemeCodeToQuery);
          if (nav) {
            const entry = {
              ...nav,
              currency: 'INR',
              priceInr: nav.navInr,
            };
            priceMap[origUpper] = entry;
            priceMap[schemeCodeToQuery] = entry;
            if (mf.mappedSymbol) priceMap[mf.mappedSymbol] = entry;
            resolvedMap[origUpper] = {
              resolvedSymbol: schemeCodeToQuery,
              schemeName: nav.schemeName,
              assetType: 'mutual_fund',
              currency: 'INR',
              livePrice: nav.navInr,
              foundVia: mf.mfSchemeCode ? 'ai_scheme_code' : 'direct_code',
            };
          } else {
            console.warn(`⚠️ MF lookup failed for scheme code ${schemeCodeToQuery}, resolving variants by price`);
            // Fall back to resolving variants with price matching
            const { bestMatch } = await resolveMutualFundVariants(mf.name || mf.original, mf.targetPrice);
            if (bestMatch) {
              const entry = {
                price: bestMatch.price,
                priceInr: bestMatch.navInr,
                navInr: bestMatch.navInr,
                currency: 'INR',
                schemeName: bestMatch.schemeName,
                change24h: bestMatch.change24h,
                change7d: bestMatch.change7d,
                change30d: bestMatch.change30d,
              };
              priceMap[origUpper] = entry;
              priceMap[bestMatch.schemeCode] = entry;
              if (mf.mappedSymbol) priceMap[mf.mappedSymbol] = entry;
              resolvedMap[origUpper] = {
                resolvedSymbol: bestMatch.schemeCode,
                schemeName: bestMatch.schemeName,
                assetType: 'mutual_fund',
                currency: 'INR',
                livePrice: bestMatch.navInr,
                foundVia: 'fallback_closest_variant',
              };
            }
          }
        } else {
          // Query is fund name/text — resolve all variants and select closest to screenshot price
          const { bestMatch } = await resolveMutualFundVariants(mf.name || mf.original, mf.targetPrice);
          if (bestMatch) {
            const entry = {
              price: bestMatch.price,
              priceInr: bestMatch.navInr,
              navInr: bestMatch.navInr,
              currency: 'INR',
              schemeName: bestMatch.schemeName,
              change24h: bestMatch.change24h,
              change7d: bestMatch.change7d,
              change30d: bestMatch.change30d,
            };
            priceMap[origUpper] = entry;
            priceMap[bestMatch.schemeCode] = entry;
            if (mf.mappedSymbol) priceMap[mf.mappedSymbol] = entry;
            resolvedMap[origUpper] = {
              resolvedSymbol: bestMatch.schemeCode,
              schemeName: bestMatch.schemeName,
              assetType: 'mutual_fund',
              currency: 'INR',
              livePrice: bestMatch.navInr,
              foundVia: mf.targetPrice ? 'closest_price_variant' : 'name_search_preferred_variant',
            };
          }
        }
      } catch (mfErr) {
        console.warn(`MF resolution error for "${mf.original}":`, mfErr.message);
      }
    }

    // 2. Process Stocks (use AI-provided or mapped yahooSymbol when available, else auto-probe .NS):
    if (stockCandidates.length > 0) {
      const tickersToProbe = new Set();
      const symbolToYahooMap = new Map(); // original upper -> yahoo ticker used

      stockCandidates.forEach(({ sym, yahooSymbol, mappedSymbol }) => {
        const upper = sym.toUpperCase();
        const preferred = yahooSymbol || mappedSymbol;
        if (preferred) {
          tickersToProbe.add(preferred);
          symbolToYahooMap.set(upper, preferred);
        } else if (upper.endsWith('.NS') || upper.endsWith('.BO') || isStockTicker(upper)) {
          tickersToProbe.add(upper);
          symbolToYahooMap.set(upper, upper);
        } else {
          // Probe with .NS first (most Indian stocks)
          tickersToProbe.add(`${upper}.NS`);
          tickersToProbe.add(upper);
        }
      });

      const yahooQuotes = await fetchYahooStockPrices([...tickersToProbe]);

      stockCandidates.forEach(({ sym, yahooSymbol, mappedSymbol }) => {
        const upper = sym.toUpperCase();
        const nsTick = `${upper}.NS`;
        const preferredTick = symbolToYahooMap.get(upper);

        // Lookup order: AI-provided/mapped yahooSymbol → .NS probe (NSE India) → bare ticker
        const quote =
          (preferredTick && yahooQuotes[preferredTick]) ||
          yahooQuotes[nsTick] ||
          yahooQuotes[upper] ||
          (mappedSymbol && yahooQuotes[mappedSymbol]);

        const resolvedTicker =
          preferredTick && yahooQuotes[preferredTick]
            ? preferredTick
            : yahooQuotes[nsTick]
            ? nsTick
            : yahooQuotes[upper]
            ? upper
            : (mappedSymbol && yahooQuotes[mappedSymbol])
            ? mappedSymbol
            : null;

        if (quote && quote.price > 0) {
          const isINR = quote.currency === 'INR' || (resolvedTicker && (resolvedTicker.endsWith('.NS') || resolvedTicker.endsWith('.BO')));
          const priceInr = quote.priceInr || (isINR ? (quote.currency === 'INR' ? quote.price : quote.price * inrRate) : null);
          const finalQuote = {
            ...quote,
            currency: isINR ? 'INR' : (quote.currency || 'USD'),
            priceInr,
            assetType: 'stock',
          };
          priceMap[upper] = finalQuote;
          if (resolvedTicker) {
            priceMap[resolvedTicker] = finalQuote;
          }
          if (mappedSymbol) {
            priceMap[mappedSymbol] = finalQuote;
          }
          resolvedMap[upper] = {
            resolvedSymbol: resolvedTicker || upper,
            assetType: 'stock',
            currency: isINR ? 'INR' : 'USD',
            livePrice: isINR ? (priceInr || quote.price) : quote.price,
            foundVia: yahooSymbol && resolvedTicker === yahooSymbol ? 'ai_yahoo_symbol' : 'probe',
          };
        } else {
          generalSymbols.push(upper);
          if (mappedSymbol) generalSymbols.push(mappedSymbol);
        }
      });
    }

    // 3. Process remaining symbols via standard priceService
    if (generalSymbols.length > 0) {
      const remainingQuotes = await getPricesForSymbols([...new Set(generalSymbols)], req.user._id);
      Object.assign(priceMap, remainingQuotes);
      generalSymbols.forEach((s) => {
        if (remainingQuotes[s]) {
          const q = remainingQuotes[s];
          resolvedMap[s] = {
            resolvedSymbol: s,
            assetType: q.assetType || 'crypto',
            currency: q.currency || 'USD',
            livePrice: q.price || 0,
          };
        }
      });
    }

    res.json({ prices: priceMap, resolvedMap });
  } catch (error) {
    console.error('Lookup Batch Error:', error);
    res.status(500).json({ message: 'Failed to lookup prices' });
  }
});

/**
 * @route   GET /api/prices/quote/:symbol
 * @desc    Fetch a single asset's live market price from the appropriate API (Yahoo Finance / MFapi.in / CMC)
 *          Used for live testing and verifying prices before mapping.
 * @access  Private
 */
router.get('/quote/:symbol', async (req, res) => {
  try {
    let rawSymbol = (req.params.symbol || '').trim();
    if (!rawSymbol) {
      return res.status(400).json({ message: 'Symbol is required' });
    }

    const { assetType } = req.query; // 'stock' | 'mutual_fund' | 'crypto'
    const isMF = assetType === 'mutual_fund' || isMfSchemeCode(rawSymbol);

    // If it's a mutual fund
    if (isMF) {
      if (isMfSchemeCode(rawSymbol)) {
        const mfNav = await fetchMutualFundNav(rawSymbol);
        if (mfNav) {
          return res.json({
            found: true,
            symbol: rawSymbol,
            assetType: 'mutual_fund',
            source: 'MFapi.in',
            currency: 'INR',
            price: mfNav.price,
            priceInr: mfNav.navInr,
            navInr: mfNav.navInr,
            schemeName: mfNav.schemeName,
            change24h: mfNav.change24h,
            change7d: mfNav.change7d,
            change30d: mfNav.change30d,
            formattedPrice: `₹${mfNav.navInr.toFixed(2)}`,
          });
        }
      } else {
        // Query is fund name/text — resolve variants and auto-select closest to referencePrice
        const refPrice = req.query.referencePrice ? Number(req.query.referencePrice) : null;
        const { bestMatch, variants } = await resolveMutualFundVariants(rawSymbol, refPrice);
        if (bestMatch) {
          return res.json({
            found: true,
            symbol: bestMatch.schemeCode,
            suggestedSymbol: bestMatch.schemeCode,
            assetType: 'mutual_fund',
            source: 'MFapi.in',
            currency: 'INR',
            price: bestMatch.price,
            priceInr: bestMatch.navInr,
            navInr: bestMatch.navInr,
            schemeName: bestMatch.schemeName,
            change24h: bestMatch.change24h,
            change7d: bestMatch.change7d,
            change30d: bestMatch.change30d,
            formattedPrice: bestMatch.formattedPrice,
            diffPct: bestMatch.diffPct,
            diffAbs: bestMatch.diffAbs,
            planType: bestMatch.planType,
            optionType: bestMatch.optionType,
            variants: variants || [],
          });
        }
      }
    }

    // Try fetching via general price service
    let symToFetch = rawSymbol.toUpperCase();
    let quotes = await fetchAndCachePrices([symToFetch]);
    let entry = quotes[symToFetch];

    // If stock assetType or missing price and lacks exchange suffix, try Indian exchange suffix .NS on Yahoo
    let suggested = null;
    if ((!entry || entry.price === 0) && !symToFetch.includes('.') && (assetType === 'stock' || !assetType)) {
      const nsSym = `${symToFetch}.NS`;
      const nsQuotes = await fetchYahooStockPrices([nsSym]);
      if (nsQuotes[nsSym] && nsQuotes[nsSym].price > 0) {
        entry = nsQuotes[nsSym];
        suggested = nsSym;
        symToFetch = nsSym;
      }
    }

    if (!entry || entry.price === 0) {
      return res.status(404).json({
        found: false,
        symbol: rawSymbol,
        message: `No live quote found for ${rawSymbol}. Try appending .NS for Indian stocks (e.g. ${rawSymbol}.NS) or verify ticker.`,
      });
    }

    const isINR = entry.currency === 'INR' || symToFetch.endsWith('.NS') || symToFetch.endsWith('.BO');
    const displayPrice = isINR
      ? (entry.priceInr ?? (entry.price * (quotes.INR?.price || 95.7)))
      : entry.price;

    res.json({
      found: true,
      symbol: symToFetch,
      suggestedSymbol: suggested,
      assetType: entry.assetType || (isINR ? 'stock' : 'crypto'),
      source: isINR ? 'Yahoo Finance (NSE/BSE)' : isStockTicker(symToFetch) ? 'Yahoo Finance' : 'CoinMarketCap / CoinGecko',
      currency: isINR ? 'INR' : 'USD',
      price: entry.price,
      priceInr: entry.priceInr || (isINR ? displayPrice : null),
      navInr: entry.navInr ?? null,
      schemeName: entry.schemeName ?? null,
      change24h: entry.change24h || 0,
      change7d: entry.change7d || 0,
      change30d: entry.change30d || 0,
      formattedPrice: isINR ? `₹${Number(displayPrice).toFixed(2)}` : `$${Number(entry.price).toFixed(2)}`,
    });
  } catch (error) {
    console.error('Quote fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch quote' });
  }
});

export default router;
