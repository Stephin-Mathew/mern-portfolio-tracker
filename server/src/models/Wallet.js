import mongoose from 'mongoose';

const walletSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Wallet name is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['crypto', 'stock', 'exchange', 'bank', 'other'],
      default: 'crypto',
      required: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    color: {
      type: String,
      default: '#06b6d4',
    },
    icon: {
      type: String,
      default: 'wallet',
    },
  },
  {
    timestamps: true,
  }
);

export const Wallet = mongoose.model('Wallet', walletSchema);
