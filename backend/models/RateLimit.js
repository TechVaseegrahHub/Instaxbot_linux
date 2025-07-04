const mongoose = require('mongoose');

const rateLimitSchema = new mongoose.Schema({
  businessAccountId: {
    type: String,
    required: true
  },
  tenentId: {
    type: String,
    required: true
  },
  engagedUserCount: {
    type: Number,
    default: 0
  },
  dailyApiLimit: {
    type: Number,
    default: 0
  },
  apiCallsToday: {
    type: Number,
    default: 0
  },
  lastResetTime: {
    type: Date,
    default: Date.now
  },
  // For per-second tracking (Send API)
  sendApiCalls: {
    lastSecondCount: {
      type: Number,
      default: 0
    },
    lastSecondTimestamp: {
      type: Date,
      default: Date.now
    }
  },
  // For per-second tracking (Conversations API)
  conversationApiCalls: {
    lastSecondCount: {
      type: Number,
      default: 0
    },
    lastSecondTimestamp: {
      type: Date,
      default: Date.now
    }
  },
  // For per-hour tracking (Private Replies API)
  privateReplyApiCalls: {
    lastHourCount: {
      type: Number,
      default: 0
    },
    lastHourTimestamp: {
      type: Date,
      default: Date.now
    }
  }
}, { timestamps: true });

// Create compound index
rateLimitSchema.index({ businessAccountId: 1, tenentId: 1 }, { unique: true });

module.exports = mongoose.model('RateLimit', rateLimitSchema);
