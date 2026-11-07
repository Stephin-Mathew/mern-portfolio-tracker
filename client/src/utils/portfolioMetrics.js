/**
 * computePortfolio — single pure function that derives all portfolio metrics
 * from raw holdings + prices + wallets.
 *
 * The valuation logic is UNCHANGED from PortfolioSummary / WalletsSummaryWidget
 * (isINR detection, cash = 1, fallback to avgBuyPrice, INR → USD conversion).
 */

/** Shared isINR detection logic (mirrors existing PortfolioSummary). */
export function detectIsINR(holding, priceEntry) {
  return (
    holding.assetType === 'mutual_fund' ||
    holding.currency === 'INR' ||
    priceEntry?.currency === 'INR' ||
    (priceEntry?.priceInr != null && priceEntry.priceInr > 0) ||
    (priceEntry?.navInr != null && priceEntry.navInr > 0) ||
    holding.symbol?.endsWith('.NS') ||
    holding.symbol?.endsWith('.BO')
  );
}

/** Get the USD price for a single holding. */
export function getHoldingPriceUSD(holding, prices, inrRate = 95.7) {
  const entry = prices[holding.symbol];

  if (holding.assetType === 'cash') return 1;

  if (entry !== undefined) {
    return typeof entry === 'object' ? Number(entry.price || 0) : Number(entry || 0);
  }

  // No price data — fall back to avgBuyPrice
  const isINR = detectIsINR(holding, entry);
  const raw = Number(holding.avgBuyPrice) || 0;
  return isINR && inrRate > 0 ? raw / inrRate : raw;
}

/**
 * computePortfolio(holdings, prices, wallets)
 *
 * Returns:
 * {
 *   totalValue,          // USD
 *   change24h: { amount, pct },
 *   change7d: { amount, pct },
 *   stockFundPnl: { amount, pct, cost },
 *   positionsCount,
 *   walletCount,
 *   perSymbol: [{ symbol, name, price, valueUsd, weightPct, change24h, change7d,
 *                 isFixed, mappedSymbol, assetType, color, letter }],
 *   perWallet: [{ wallet, valueUsd, pct, holdingsCount }],
 *   movers: { gainers, losers }   // arrays of { symbol, name, change24h }
 * }
 */
export function computePortfolio(holdings = [], prices = {}, wallets = []) {
  const inrRate = Number(prices.INR?.price || prices.INR?.rate || 95.7);

  let totalValue = 0;
  let total24hPnL = 0;
  let total7dPnL = 0;
  let totalStockCost = 0;
  let stockFundPnL = 0;

  // Aggregate by symbol (mirrors HoldingsTable grouping)
  const symbolMap = new Map(); // symbol → aggregated row

  for (const h of holdings) {
    const entry = prices[h.symbol];
    const isINR = detectIsINR(h, entry);
    const price = getHoldingPriceUSD(h, prices, inrRate);
    const qty = Number(h.quantity) || 0;
    const val = qty * price;

    totalValue += val;

    const ch24 = Number(entry?.change24h || 0);
    const ch7 = Number(entry?.change7d || 0);
    const start24 = ch24 !== 0 ? price / (1 + ch24 / 100) : price;
    const start7 = ch7 !== 0 ? price / (1 + ch7 / 100) : price;

    const pnl24 = qty * (price - start24);
    const pnl7 = qty * (price - start7);

    total24hPnL += pnl24;
    total7dPnL += pnl7;

    const rawCost = (h.avgBuyPrice != null && Number(h.avgBuyPrice) > 0)
      ? qty * Number(h.avgBuyPrice)
      : 0;
    const cost = isINR && inrRate > 0 ? rawCost / inrRate : rawCost;

    if (h.assetType === 'stock' || h.assetType === 'mutual_fund') {
      totalStockCost += cost;
      stockFundPnL += val - cost;
    }

    // Aggregate per-symbol
    const sym = (h.symbol || '').toUpperCase();
    if (!symbolMap.has(sym)) {
      symbolMap.set(sym, {
        symbol: sym,
        name: entry?.name || h.mfSchemeName || h.symbol || sym,
        price,
        valueUsd: 0,
        costUsd: 0,
        hasCostBasis: false,
        quantity: 0,
        pnl24hUsd: 0,
        pnl7dUsd: 0,
        change24h: ch24,
        change7d: ch7,
        isFixed: Boolean(entry?.isCustom && !entry?.mappedSymbol),
        mappedSymbol: entry?.mappedSymbol || null,
        assetType: h.assetType,
        updatedAt: entry?.updatedAt || null,
      });
    }
    const row = symbolMap.get(sym);
    row.valueUsd += val;
    row.quantity += qty;
    row.pnl24hUsd += pnl24;
    row.pnl7dUsd += pnl7;
    if (cost > 0) {
      row.costUsd += cost;
      row.hasCostBasis = true;
    }
    // Use latest price entry if multiple holdings
    if (entry) {
      row.price = price;
      row.change24h = ch24;
      row.change7d = ch7;
    }
  }

  // Build sorted perSymbol array
  const perSymbol = [...symbolMap.values()]
    .sort((a, b) => b.valueUsd - a.valueUsd)
    .map((row) => {
      const unrealizedPnlUsd = row.hasCostBasis ? row.valueUsd - row.costUsd : 0;
      const roiPct = (row.hasCostBasis && row.costUsd > 0) ? (unrealizedPnlUsd / row.costUsd) * 100 : 0;
      return {
        ...row,
        unrealizedPnlUsd,
        roiPct,
        weightPct: totalValue > 0 ? (row.valueUsd / totalValue) * 100 : 0,
      };
    });

  // Per-wallet breakdown
  const walletMap = new Map();
  for (const w of wallets) {
    walletMap.set(w._id.toString(), { wallet: w, valueUsd: 0, holdingsCount: 0 });
  }

  for (const h of holdings) {
    const wid = h.walletId?.toString();
    if (wid && walletMap.has(wid)) {
      const entry = prices[h.symbol];
      const price = getHoldingPriceUSD(h, prices, inrRate);
      walletMap.get(wid).valueUsd += (Number(h.quantity) || 0) * price;
      walletMap.get(wid).holdingsCount += 1;
    }
  }

  const perWallet = [...walletMap.values()]
    .sort((a, b) => b.valueUsd - a.valueUsd)
    .map((row) => ({
      ...row,
      pct: totalValue > 0 ? (row.valueUsd / totalValue) * 100 : 0,
    }));

  // Top movers — use change24h from the price API (which is always vs the previous trading-day
  // close, not vs the buy price). For stocks the market state tells us whether trading is live.
  // Stocks on weekends / market-closed hours still show last-session change but are flagged so
  // the UI can display "Last Session" instead of "Today".
  const moversRaw = perSymbol
    .filter((s) => s.change24h !== 0 && s.assetType !== 'cash')
    .map((s) => {
      const entry = prices[s.symbol];
      // Stocks: derive daily change from prevDayClose when available for accuracy;
      // otherwise fall back to the cached change24h from the API.
      let dailyChange = s.change24h;
      if (s.assetType === 'stock' && entry?.prevDayClose && entry.prevDayClose > 0 && s.price > 0) {
        dailyChange = ((s.price - entry.prevDayClose) / entry.prevDayClose) * 100;
      }

      // A stock is "market closed" if its marketState is not REGULAR (or PRE/POST for extended hours).
      // Crypto trades 24/7 so it is never market-closed.
      const marketState = entry?.marketState ?? null;
      const isMarketClosed =
        s.assetType === 'stock' &&
        marketState !== null &&
        marketState !== 'REGULAR' &&
        marketState !== 'PRE' &&
        marketState !== 'POST';

      return {
        symbol: s.symbol,
        name: s.name,
        change24h: Number(dailyChange.toFixed(4)),
        assetType: s.assetType,
        isMarketClosed,
      };
    });

  const gainers = moversRaw
    .filter((m) => m.change24h > 0)
    .sort((a, b) => b.change24h - a.change24h)
    .slice(0, 6);

  const losers = moversRaw
    .filter((m) => m.change24h < 0)
    .sort((a, b) => a.change24h - b.change24h)
    .slice(0, 6);

  const startBasis24 = totalValue - total24hPnL;
  const change24hPct = startBasis24 > 0 ? (total24hPnL / startBasis24) * 100 : 0;

  const startBasis7 = totalValue - total7dPnL;
  const change7dPct = startBasis7 > 0 ? (total7dPnL / startBasis7) * 100 : 0;

  const stockFundPct = totalStockCost > 0 ? (stockFundPnL / totalStockCost) * 100 : 0;

  // Dollar Movers (actual currency gainers and losers)
  const dollarGainers24h = perSymbol
    .filter((s) => (s.pnl24hUsd || 0) > 0.01 && s.assetType !== 'cash')
    .sort((a, b) => b.pnl24hUsd - a.pnl24hUsd)
    .slice(0, 5);

  const dollarLosers24h = perSymbol
    .filter((s) => (s.pnl24hUsd || 0) < -0.01 && s.assetType !== 'cash')
    .sort((a, b) => a.pnl24hUsd - b.pnl24hUsd)
    .slice(0, 5);

  const dollarGainers7d = perSymbol
    .filter((s) => (s.pnl7dUsd || 0) > 0.01 && s.assetType !== 'cash')
    .sort((a, b) => b.pnl7dUsd - a.pnl7dUsd)
    .slice(0, 5);

  const dollarLosers7d = perSymbol
    .filter((s) => (s.pnl7dUsd || 0) < -0.01 && s.assetType !== 'cash')
    .sort((a, b) => a.pnl7dUsd - b.pnl7dUsd)
    .slice(0, 5);

  // Asset class performance & contribution
  const assetTypes = ['crypto', 'stock', 'mutual_fund', 'cash'];
  const assetClassBreakdown = {};
  for (const type of assetTypes) {
    const list = perSymbol.filter((s) => s.assetType === type);
    const valueUsd = list.reduce((sum, s) => sum + s.valueUsd, 0);
    const costUsd = list.reduce((sum, s) => sum + (s.costUsd || 0), 0);
    const pnl24hUsd = list.reduce((sum, s) => sum + (s.pnl24hUsd || 0), 0);
    const pnl7dUsd = list.reduce((sum, s) => sum + (s.pnl7dUsd || 0), 0);
    const base24 = valueUsd - pnl24hUsd;
    const base7 = valueUsd - pnl7dUsd;
    assetClassBreakdown[type] = {
      type,
      valueUsd,
      costUsd,
      pnl24hUsd,
      pnl7dUsd,
      weightPct: totalValue > 0 ? (valueUsd / totalValue) * 100 : 0,
      return24hPct: base24 > 0 ? (pnl24hUsd / base24) * 100 : 0,
      return7dPct: base7 > 0 ? (pnl7dUsd / base7) * 100 : 0,
      holdingsCount: list.length,
    };
  }

  // Unrealized P&L & Cost basis analysis (all holdings with recorded avgBuyPrice)
  const costBasisHoldings = perSymbol
    .filter((s) => s.hasCostBasis && s.costUsd > 0)
    .sort((a, b) => b.unrealizedPnlUsd - a.unrealizedPnlUsd);

  const totalCostBasisUsd = costBasisHoldings.reduce((sum, s) => sum + s.costUsd, 0);
  const totalCostMarketValueUsd = costBasisHoldings.reduce((sum, s) => sum + s.valueUsd, 0);
  const netUnrealizedPnlUsd = totalCostMarketValueUsd - totalCostBasisUsd;
  const netRoiPct = totalCostBasisUsd > 0 ? (netUnrealizedPnlUsd / totalCostBasisUsd) * 100 : 0;

  const profitablePositions = costBasisHoldings.filter((s) => (s.unrealizedPnlUsd || 0) > 0.01);
  const lossPositions = costBasisHoldings.filter((s) => (s.unrealizedPnlUsd || 0) < -0.01);
  const neutralPositions = costBasisHoldings.filter((s) => Math.abs(s.unrealizedPnlUsd || 0) <= 0.01);

  const bestRoi = [...costBasisHoldings].sort((a, b) => (b.roiPct || 0) - (a.roiPct || 0))[0] || null;
  const bestDollar = costBasisHoldings[0] || null;
  const worstDollar = costBasisHoldings[costBasisHoldings.length - 1] || null;

  const unrealizedAnalysis = {
    hasData: costBasisHoldings.length > 0,
    totalCostUsd: totalCostBasisUsd,
    totalValueUsd: totalCostMarketValueUsd,
    netPnlUsd: netUnrealizedPnlUsd,
    roiPct: netRoiPct,
    profitableCount: profitablePositions.length,
    lossCount: lossPositions.length,
    neutralCount: neutralPositions.length,
    totalCount: costBasisHoldings.length,
    bestRoi,
    bestDollar,
    worstDollar: (worstDollar && (worstDollar.unrealizedPnlUsd || 0) < 0) ? worstDollar : null,
    positions: costBasisHoldings,
  };

  return {
    totalValue,
    change24h: { amount: total24hPnL, pct: change24hPct },
    change7d: { amount: total7dPnL, pct: change7dPct },
    stockFundPnl: { amount: stockFundPnL, pct: stockFundPct, cost: totalStockCost },
    positionsCount: perSymbol.length,
    walletCount: wallets.length,
    perSymbol,
    perWallet,
    movers: { gainers, losers },
    dollarMovers: {
      gainers24h: dollarGainers24h,
      losers24h: dollarLosers24h,
      gainers7d: dollarGainers7d,
      losers7d: dollarLosers7d,
    },
    assetClassBreakdown,
    unrealizedAnalysis,
  };
}

/**
 * Compute 30-day return from per-symbol data using prices[symbol].change30d.
 * Returns { amount, pct } or null if >20% of portfolio value lacks change30d.
 */
export function compute30dReturn(perSymbol, prices, totalValue) {
  if (totalValue <= 0) return null;

  let coveredValue = 0;
  let startValue = 0;
  let currentValue = 0;

  for (const s of perSymbol) {
    const ch30 = Number(prices[s.symbol]?.change30d || 0);
    if (ch30 !== 0 || prices[s.symbol]?.change30d !== undefined) {
      coveredValue += s.valueUsd;
      const startPrice = ch30 !== 0 ? s.price / (1 + ch30 / 100) : s.price;
      const qty = s.price > 0 ? s.valueUsd / s.price : 0;
      startValue += qty * startPrice;
      currentValue += s.valueUsd;
    }
  }

  const uncoveredPct = totalValue > 0 ? (1 - coveredValue / totalValue) * 100 : 100;
  if (uncoveredPct > 20) return null; // too many missing values

  const returnAmt = currentValue - startValue;
  const returnPct = startValue > 0 ? (returnAmt / startValue) * 100 : 0;
  return { amount: returnAmt, pct: returnPct };
}
