import mongoose from 'mongoose';

const holdingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    assetType: {
      type: String,
      enum: ['crypto', 'stock', 'cash'],
      default: 'crypto',
      required: true,
    },
    symbol: {
      type: String,
      required: [true, 'Symbol is required (e.g., BTC, AAPL, USD)'],
      uppercase: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0, 'Quantity cannot be negative'],
    },
    avgBuyPrice: {
      type: Number,
      required: function () {
        return this.assetType === 'stock';
      },
      min: [0, 'Buy price cannot be negative'],
      default: null,
    },
    walletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Wallet',
      default: null,
      index: true,
    },
    walletOrAccount: {
      type: String,
      trim: true,
      default: '',
    },
    chain: {
      type: String,
      trim: true,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for common query patterns on remote MongoDB Atlas
// These prevent full collection scans and significantly reduce query latency
holdingSchema.index({ userId: 1, walletId: 1 });
holdingSchema.index({ userId: 1, symbol: 1 });

export const Holding = mongoose.model('Holding', holdingSchema);
