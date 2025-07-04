const mongoose = require('mongoose');

const engagedUserSchema = new mongoose.Schema({
  tenentId: {
    type: String,
    required: true,
    index: true
  },
  accountId: {
    type: String,
    required: true,
    index: true
  },
  senderId: {
    type: String,
    required: true,
    index: true
  },
  lastActivity: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  engagementCount: {
    type: Number,
    default: 1
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index for efficient queries
engagedUserSchema.index({ tenentId: 1, accountId: 1, senderId: 1 }, { unique: true });
engagedUserSchema.index({ lastActivity: 1 }); // For cleanup queries
engagedUserSchema.index({ tenentId: 1, accountId: 1, lastActivity: 1 }); // For rate limit calculations

module.exports = mongoose.model('EngagedUser', engagedUserSchema);