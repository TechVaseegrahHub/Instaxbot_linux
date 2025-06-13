const mongoose = require('mongoose');

const holdSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    index: true
  },
  tenentId: {
    type: String,
    required: true,
    index: true
  },
  customerName: {
    type: String,
    default: ''
  },
  holdingProduct: {
    type: String,
    required: true
  },
  holdingResponse: {
    type: String,
    required: true,
    default: ''
  },
  expectedDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'resolved', 'pending'],
    default: 'active',
    index: true
  },
  // Additional responses array for follow-up communications
  responses: [{
    message: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    respondedAt: {
      type: Date,
      default: Date.now
    },
    respondedBy: {
      type: String,
      default: 'system'
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound indexes for efficient querying
holdSchema.index({ tenentId: 1, orderNumber: 1 });
holdSchema.index({ tenentId: 1, status: 1 });
holdSchema.index({ tenentId: 1, createdAt: -1 });

// Pre-save middleware to update updatedAt
holdSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Static method to find active holds for an order
holdSchema.statics.findActiveHoldsByOrder = function(orderNumber, tenentId) {
  return this.find({
    orderNumber: orderNumber,
    tenentId: tenentId,
    status: 'active'
  });
};

// Static method to find all holds for a tenant with pagination
holdSchema.statics.findByTenantWithPagination = function(tenentId, page = 1, limit = 10, status = null) {
  const query = { tenentId: tenentId };
  if (status && status !== 'all') {
    query.status = status;
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
};

// Instance method to add response
holdSchema.methods.addResponse = function(message, respondedBy = 'system') {
  this.responses.push({
    message: message,
    timestamp: new Date(),
    respondedAt: new Date(),
    respondedBy: respondedBy
  });
  this.updatedAt = new Date();
  return this.save();
};

// Instance method to resolve hold
holdSchema.methods.resolve = function() {
  this.status = 'resolved';
  this.updatedAt = new Date();
  return this.save();
};

// Virtual for formatted expected date
holdSchema.virtual('formattedExpectedDate').get(function() {
  return this.expectedDate.toISOString().split('T')[0];
});

// Virtual for days until expected date
holdSchema.virtual('daysUntilExpected').get(function() {
  const today = new Date();
  const expected = new Date(this.expectedDate);
  const diffTime = expected - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Virtual for hold duration
holdSchema.virtual('holdDuration').get(function() {
  const today = new Date();
  const created = new Date(this.createdAt);
  const diffTime = today - created;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Ensure virtual fields are included in JSON output
holdSchema.set('toJSON', { virtuals: true });
holdSchema.set('toObject', { virtuals: true });

const Hold = mongoose.model('Hold', holdSchema);

module.exports = Hold;