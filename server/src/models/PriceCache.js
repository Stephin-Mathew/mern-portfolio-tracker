import mongoose from 'mongoose';

const priceCacheSchema = new mongoose.Schema(
  {
    symbol: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
    },
    assetType: {
      type: String,
      enum: ['crypto', 'stock', 'mutual_fund'],
      default: 'crypto',
    },
    change24h: {
      type: Number,
      default: 0,
    },
    change7d: {
      type: Number,
      default: 0,
    },
    change30d: {
      type: Number,
      default: 0,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    // MFapi.in scheme code for mutual fund NAV lookups
    mfSchemeCode: {
      type: String,
      trim: true,
      default: null,
    },
    // Latest NAV in INR (mutual funds only)
    navInr: {
      type: Number,
      default: null,
    },
    // Scheme name from MFapi.in (mutual funds only)
    schemeName: {
      type: String,
      trim: true,
      default: null,
    },
    // Currency of native price ('USD', 'INR', etc.)
    currency: {
      type: String,
      default: 'USD',
    },
    // Native INR price for NSE/BSE stocks
    priceInr: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const PriceCache = mongoose.model('PriceCache', priceCacheSchema);
