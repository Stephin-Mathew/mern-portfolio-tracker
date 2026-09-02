import mongoose from 'mongoose';

const priceOverrideSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    symbol: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    price: {
      type: Number,
      default: null,
      min: 0,
    },
    mappedSymbol: {
      type: String,
      uppercase: true,
      trim: true,
      default: null,
    },
    isLocked: {
      type: Boolean,
      default: true,
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

// Compound unique index per user + symbol
priceOverrideSchema.index({ userId: 1, symbol: 1 }, { unique: true });

export const PriceOverride = mongoose.model('PriceOverride', priceOverrideSchema);
