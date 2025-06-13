const mongoose = require('mongoose');

const shippingMethodSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['FREE_SHIPPING', 'COURIER_PARTNER'],
    required: true,
    default: 'COURIER_PARTNER'
  },
  minAmount: {
    type: Number,
    min: 0,
    default: null
  },
  useWeight: {
    type: Boolean,
    default: false
  },
  ratePerKg: {
    type: Number,
    min: 0,
    default: null
  },
  fixedRate: {
    type: Number,
    min: 0,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  tenentId: {
    type: String,
    required: true
  }
}, { 
  timestamps: true,
  collection: 'shipping_methods'
});

// Validation middleware
shippingMethodSchema.pre('save', function(next) {
  // Validate based on shipping type
  if (this.type === 'FREE_SHIPPING') {
    this.useWeight = false;
    this.ratePerKg = null;
    this.fixedRate = null;
  } else if (this.type === 'COURIER_PARTNER') {
    if (this.useWeight) {
      this.fixedRate = null;
      if (!this.ratePerKg) {
        return next(new Error('Rate per KG is required for weight-based shipping'));
      }
    } else {
      this.ratePerKg = null;
      if (!this.fixedRate) {
        return next(new Error('Fixed rate is required for non-weight based shipping'));
      }
    }
  }

  next();
});

// Indexes for performance
shippingMethodSchema.index({ tenantId: 1, isActive: 1 });

const ShippingMethod = mongoose.model('ShippingMethod', shippingMethodSchema);

module.exports = ShippingMethod;
