/**
 * Validates and normalizes an extraction result against the expected Holding schema.
 * Used as the single source of truth for validation across all extraction tiers.
 *
 * @param {*} data — The raw parsed result from any extraction tier
 * @returns {{ valid: boolean, data?: Array, errors?: string[] }}
 */
export const validateExtractionResult = (data) => {
  const errors = [];

  if (!Array.isArray(data)) {
    return { valid: false, errors: ['Extraction output must be a JSON array'] };
  }

  if (data.length === 0) {
    return { valid: false, errors: ['Extraction returned an empty array'] };
  }

  const VALID_ASSET_TYPES = ['crypto', 'stock', 'cash'];

  // Well-known stock tickers for type inference when assetType is missing/invalid
  const KNOWN_STOCKS = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'GOOGL', 'AMZN', 'META', 'SPY', 'QQQ', 'AMD', 'NFLX', 'DIS', 'BA', 'V', 'JPM', 'WMT'];
  const KNOWN_CASH = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'INR', 'CASH', 'USDT', 'USDC'];

  const normalizedItems = [];

  data.forEach((item, index) => {
    if (!item || typeof item !== 'object') {
      errors.push(`Item ${index}: not a valid object`);
      return;
    }

    // --- symbol ---
    const symbol = item.symbol ? String(item.symbol).trim().toUpperCase() : '';
    if (!symbol) {
      errors.push(`Item ${index}: missing or empty "symbol"`);
      return;
    }

    // --- quantity ---
    const quantity = Number(item.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      errors.push(`Item ${index} (${symbol}): "quantity" must be a number > 0, got ${item.quantity}`);
      return;
    }

    // --- assetType (with smart inference fallback) ---
    let assetType = String(item.assetType || '').toLowerCase();
    if (!VALID_ASSET_TYPES.includes(assetType)) {
      if (KNOWN_CASH.includes(symbol)) assetType = 'cash';
      else if (KNOWN_STOCKS.includes(symbol)) assetType = 'stock';
      else assetType = 'crypto';
    }

    // --- avgBuyPrice (only required for stocks) ---
    let avgBuyPrice = null;
    if (assetType === 'stock') {
      const rawPrice = item.avgBuyPrice !== undefined && item.avgBuyPrice !== null ? Number(item.avgBuyPrice) : 0;
      avgBuyPrice = isNaN(rawPrice) || rawPrice < 0 ? 0 : rawPrice;
    }

    // --- extractedPrice & totalValue from screenshot ---
    let extractedPrice = null;
    if (item.extractedPrice !== undefined && item.extractedPrice !== null && item.extractedPrice !== '') {
      const ep = Number(item.extractedPrice);
      if (!isNaN(ep) && ep >= 0) extractedPrice = ep;
    }

    let totalValue = null;
    if (item.totalValue !== undefined && item.totalValue !== null && item.totalValue !== '') {
      const tv = Number(item.totalValue);
      if (!isNaN(tv) && tv >= 0) totalValue = tv;
    }

    // If unit price missing but totalValue and quantity exist: calculate unit price
    if (extractedPrice === null && totalValue !== null && quantity > 0) {
      extractedPrice = Number((totalValue / quantity).toFixed(6));
    }

    // If totalValue missing but unit price and quantity exist: calculate total value
    if (totalValue === null && extractedPrice !== null && quantity > 0) {
      totalValue = Number((extractedPrice * quantity).toFixed(2));
    }

    normalizedItems.push({
      symbol,
      quantity,
      extractedPrice,
      totalValue,
      avgBuyPrice,
      assetType,
      walletOrAccount: item.walletOrAccount ? String(item.walletOrAccount).trim() : 'AI Extraction',
      notes: item.notes ? String(item.notes).trim() : 'AI Parsed from screenshot',
    });
  });

  if (normalizedItems.length === 0) {
    return {
      valid: false,
      errors: errors.length > 0 ? errors : ['No valid holding entries could be parsed'],
    };
  }

  return { valid: true, data: normalizedItems };
};
