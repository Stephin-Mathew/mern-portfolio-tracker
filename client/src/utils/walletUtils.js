/**
 * Calculates the total USD valuation of a given wallet based on its holdings and live prices.
 */
export const calculateWalletValue = (walletId, holdings = [], prices = {}) => {
  if (!walletId || !holdings || holdings.length === 0) return 0;
  const targetId = walletId.toString();
  let total = 0;

  for (const h of holdings) {
    if (h.walletId && h.walletId.toString() === targetId) {
      let currentPrice = 0;
      if (h.assetType === 'cash') {
        currentPrice = 1;
      } else if (prices && prices[h.symbol] !== undefined) {
        const entry = prices[h.symbol];
        currentPrice =
          typeof entry === 'object' && entry !== null
            ? Number(entry.price || 0)
            : Number(entry || 0);
      } else {
        currentPrice = Number(h.avgBuyPrice) || 0;
      }
      total += (Number(h.quantity) || 0) * currentPrice;
    }
  }

  return total;
};

/**
 * Sorts an array of wallets in descending order of their total USD value (highest dollar count first).
 * Ties are broken alphabetically by wallet name.
 */
export const sortWalletsByValue = (wallets = [], holdings = [], prices = {}) => {
  if (!wallets || wallets.length <= 1) return wallets || [];
  return [...wallets].sort((a, b) => {
    const valA = calculateWalletValue(a._id, holdings, prices);
    const valB = calculateWalletValue(b._id, holdings, prices);
    const diff = valB - valA;
    if (Math.abs(diff) > 0.0001) return diff;
    return (a.name || '').localeCompare(b.name || '');
  });
};
