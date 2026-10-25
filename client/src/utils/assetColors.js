/** Asset avatar colors by symbol (from design spec). */
const ASSET_COLORS = {
  BTC: '#F7931A',
  HYPE: '#0F766E',
  ETH: '#5B6CE0',
  USDC: '#2775CA',
  SOL: '#9333EA',
  XRP: '#111827',
  LINK: '#2A5ADA',
  ARB: '#28A0F0',
  DOGE: '#C2A633',
  USDT: '#26A17B',
};

/** Wallet color palette (used when wallet.color is missing or duplicated). */
export const WALLET_PALETTE = [
  '#2DD4BF',
  '#FBBF24',
  '#818CF8',
  '#F472B6',
  '#A3E635',
  '#F97316',
  '#60A5FA',
  '#94A3B8',
];

/** Get the avatar color for a given asset symbol. Falls back to deterministic hash. */
export function getAssetColor(symbol = '') {
  const upper = symbol.toUpperCase();
  if (ASSET_COLORS[upper]) return ASSET_COLORS[upper];
  // Deterministic hash from symbol characters
  let hash = 0;
  for (let i = 0; i < upper.length; i++) {
    hash = (hash * 31 + upper.charCodeAt(i)) >>> 0;
  }
  // Use a curated palette of distinct colors for unknown symbols
  const palette = [
    '#7C3AED', '#0891B2', '#475569', '#2563EB', '#0EA5E9',
    '#E11D48', '#16A34A', '#CA8A04', '#9333EA', '#DC2626',
    '#0D9488', '#7E22CE', '#1D4ED8', '#B45309', '#0369A1',
  ];
  return palette[hash % palette.length];
}

/** Get the first display letter for an asset symbol (uses symbol chars, not full name). */
export function getAssetLetter(symbol = '') {
  return (symbol || '?').charAt(0).toUpperCase();
}

/**
 * Resolve the effective color for a wallet.
 * If wallet.color is set and not duplicated among the passed wallets, use it.
 * Otherwise, pick from WALLET_PALETTE by wallet index.
 */
export function getWalletColor(wallet, allWallets = []) {
  if (!wallet) return WALLET_PALETTE[0];
  if (wallet.color) {
    // Check if another wallet shares the same color
    const duplicated = allWallets.filter(
      (w) => w._id !== wallet._id && w.color === wallet.color
    ).length > 0;
    if (!duplicated) return wallet.color;
  }
  const idx = allWallets.findIndex((w) => w._id === wallet._id);
  return WALLET_PALETTE[idx >= 0 ? idx % WALLET_PALETTE.length : 0];
}

/**
 * Built-in name map for common crypto and well-known stocks.
 * Used as a fallback when prices[symbol].name is missing.
 */
const NAME_MAP = {
  BTC: 'Bitcoin',
  ETH: 'Ethereum',
  SOL: 'Solana',
  XRP: 'XRP',
  DOGE: 'Dogecoin',
  USDT: 'Tether',
  USDC: 'USD Coin',
  LINK: 'Chainlink',
  ARB: 'Arbitrum',
  HYPE: 'Hyperliquid',
  MATIC: 'Polygon',
  ADA: 'Cardano',
  DOT: 'Polkadot',
  AVAX: 'Avalanche',
  ATOM: 'Cosmos',
  RELIANCE: 'Reliance Industries',
  INFY: 'Infosys',
  TCS: 'Tata Consultancy',
  CANBK: 'Canara Bank',
  PPFAS: 'Parag Parikh Flexi Cap',
  NIFTYBEES: 'Nippon Nifty BeES',
};

/** Get display name for a symbol/holding. */
export function getAssetName(symbol, holding, priceEntry) {
  if (priceEntry?.name) return priceEntry.name;
  if (holding?.mfSchemeName) return holding.mfSchemeName;
  if (NAME_MAP[symbol?.toUpperCase()]) return NAME_MAP[symbol.toUpperCase()];
  // Fall back to asset type label
  const typeLabels = {
    crypto: 'Crypto',
    stock: 'Stock',
    mutual_fund: 'Mutual Fund',
    cash: 'Cash',
  };
  return typeLabels[holding?.assetType] || symbol || '—';
}
