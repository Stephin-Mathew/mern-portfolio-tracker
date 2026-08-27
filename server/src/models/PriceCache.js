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
      enum: ['crypto', 'stock'],
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
  },
  {
    timestamps: true,
  }
);

export const PriceCache = mongoose.model('PriceCache', priceCacheSchema);
