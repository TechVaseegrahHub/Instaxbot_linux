// models/InstaxBotSystemMenu.js - MongoDB model for InstaxBot System Menu
const mongoose = require('mongoose');

// Schema for individual payload items
const payloadSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['payload', 'web-url'],
    trim: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  value: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  }
}, {
  _id: false // Disable _id for subdocuments
});

// Main schema for InstaxBot System Menu
const instaxBotSystemMenuSchema = new mongoose.Schema({
  tenentId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  username: {
    type: String,
    trim: true,
    maxlength: 100
  },
  payloads: {
    type: [payloadSchema],
    default: [],
    validate: {
      validator: function(payloads) {
        // Validate business rules
        const webUrlCount = payloads.filter(p => p.type === 'web-url').length;
        return webUrlCount <= 2; // Maximum 2 web-url payloads
      },
      message: 'Maximum 2 web-url payloads are allowed'
    }
  },
  payloadCount: {
    type: Number,
    default: 0,
    min: 0
  },
  webUrlCount: {
    type: Number,
    default: 0,
    min: 0,
    max: 2
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lastAccessedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true, // Automatically manage createdAt and updatedAt
  collection: 'instaxbot_system_menus'
});

// Pre-save middleware to update counts and validate data
instaxBotSystemMenuSchema.pre('save', function(next) {
  // Update payload counts
  this.payloadCount = this.payloads.filter(p => p.type === 'payload').length;
  this.webUrlCount = this.payloads.filter(p => p.type === 'web-url').length;
  
  // Validate web-url payloads have proper URLs
  this.payloads.forEach(payload => {
    if (payload.type === 'web-url' && payload.value) {
      // Add https:// if not present
      if (!payload.value.startsWith('http://') && !payload.value.startsWith('https://')) {
        payload.value = 'https://' + payload.value;
      }
    }
  });
  
  // Update the updatedAt field
  this.updatedAt = new Date();
  
  next();
});

// Static method to find by tenent ID
instaxBotSystemMenuSchema.statics.findByTenentId = function(tenentId) {
  return this.findOne({ tenentId, isActive: true });
};

// Static method to get all active system menus
instaxBotSystemMenuSchema.statics.getAllActive = function(limit = 100) {
  return this.find({ isActive: true })
    .sort({ updatedAt: -1 })
    .limit(limit);
};

// Instance method to add payload
instaxBotSystemMenuSchema.methods.addPayload = function(payload) {
  // Validate web-url count
  if (payload.type === 'web-url') {
    const currentWebUrlCount = this.payloads.filter(p => p.type === 'web-url').length;
    if (currentWebUrlCount >= 2) {
      throw new Error('Maximum 2 web-url payloads allowed');
    }
  }
  
  this.payloads.push(payload);
  return this.save();
};

// Instance method to remove payload
instaxBotSystemMenuSchema.methods.removePayload = function(payloadId) {
  this.payloads = this.payloads.filter(p => p.id !== payloadId);
  return this.save();
};

// Instance method to update payload
instaxBotSystemMenuSchema.methods.updatePayload = function(payloadId, updateData) {
  const payloadIndex = this.payloads.findIndex(p => p.id === payloadId);
  if (payloadIndex === -1) {
    throw new Error('Payload not found');
  }
  
  // Update the payload
  Object.assign(this.payloads[payloadIndex], updateData);
  
  return this.save();
};

// Instance method to soft delete
instaxBotSystemMenuSchema.methods.softDelete = function() {
  this.isActive = false;
  return this.save();
};

// Instance method to update last accessed time
instaxBotSystemMenuSchema.methods.updateLastAccessed = function() {
  this.lastAccessedAt = new Date();
  return this.save();
};

// Virtual for getting active payloads only
instaxBotSystemMenuSchema.virtual('activePayloads').get(function() {
  return this.payloads.filter(payload => payload.title && payload.value);
});

// Transform JSON output to remove sensitive/unnecessary fields
instaxBotSystemMenuSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

// Index for performance
instaxBotSystemMenuSchema.index({ tenentId: 1, isActive: 1 });
instaxBotSystemMenuSchema.index({ updatedAt: -1 });
instaxBotSystemMenuSchema.index({ createdAt: -1 });

const InstaxBotSystemMenu = mongoose.model('InstaxBotSystemMenu', instaxBotSystemMenuSchema);

module.exports = InstaxBotSystemMenu;