// models/InstaxBotSystemMenu.js - Improved MongoDB model for InstaxBot System Menu
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

// Add validation for web-url type
payloadSchema.pre('validate', function(next) {
  if (this.type === 'web-url') {
    // Basic URL validation
    const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/i;
    
    // Add https:// if not present
    if (!this.value.startsWith('http://') && !this.value.startsWith('https://')) {
      this.value = 'https://' + this.value;
    }
    
    // Validate URL format
    if (!urlPattern.test(this.value)) {
      this.invalidate('value', 'Please provide a valid URL');
    }
  }
  next();
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
    maxlength: 100,
    default: null
  },
  payloads: {
    type: [payloadSchema],
    default: [],
    validate: [
      {
        validator: function(payloads) {
          // Maximum total payloads allowed
          return payloads.length <= 10;
        },
        message: 'Maximum 10 total payloads allowed'
      },
      {
        validator: function(payloads) {
          // Maximum 2 web-url payloads
          const webUrlCount = payloads.filter(p => p.type === 'web-url').length;
          return webUrlCount <= 2;
        },
        message: 'Maximum 2 web-url payloads are allowed'
      },
      {
        validator: function(payloads) {
          // Ensure unique IDs within payloads
          const ids = payloads.map(p => p.id);
          return ids.length === new Set(ids).size;
        },
        message: 'Payload IDs must be unique'
      },
      {
        validator: function(payloads) {
          // Ensure unique titles within payloads
          const titles = payloads.map(p => p.title.toLowerCase().trim());
          return titles.length === new Set(titles).size;
        },
        message: 'Payload titles must be unique'
      }
    ]
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
  
  // Update the lastAccessedAt field on save
  if (!this.isNew) {
    this.lastAccessedAt = new Date();
  }
  
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

// Static method to save system menu (upsert functionality)
instaxBotSystemMenuSchema.statics.saveSystemMenu = async function(tenentId, payloads, username) {
  try {
    const systemMenuData = {
      tenentId: tenentId,
      payloads: payloads,
      username: username
    };
    
    const result = await this.findOneAndUpdate(
      { tenentId: tenentId },
      systemMenuData,
      { 
        upsert: true, 
        new: true,
        setDefaultsOnInsert: true,
        runValidators: true // Ensure validation runs on update
      }
    );
    
    return result;
  } catch (error) {
    throw error;
  }
};

// Static method to delete by tenent ID (soft delete)
instaxBotSystemMenuSchema.statics.softDeleteByTenentId = function(tenentId) {
  return this.findOneAndUpdate(
    { tenentId: tenentId },
    { isActive: false, updatedAt: new Date() },
    { new: true }
  );
};

// Static method to permanently delete by tenent ID
instaxBotSystemMenuSchema.statics.deleteByTenentId = function(tenentId) {
  return this.findOneAndDelete({ tenentId: tenentId });
};

// Static method to update specific payload by ID
instaxBotSystemMenuSchema.statics.updatePayloadById = async function(tenentId, payloadId, updateData) {
  try {
    // Find the system menu
    const systemMenu = await this.findOne({ tenentId: tenentId, isActive: true });
    
    if (!systemMenu) {
      throw new Error('System menu not found');
    }
    
    // Find the payload to update
    const payloadIndex = systemMenu.payloads.findIndex(p => p.id === payloadId);
    
    if (payloadIndex === -1) {
      throw new Error('Payload not found');
    }
    
    // Update the payload
    systemMenu.payloads[payloadIndex] = {
      id: payloadId,
      type: updateData.type,
      title: updateData.title,
      value: updateData.value
    };
    
    // Save the updated system menu
    await systemMenu.save();
    
    return systemMenu.payloads[payloadIndex];
  } catch (error) {
    throw error;
  }
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
  
  // Check for duplicate ID
  if (this.payloads.some(p => p.id === payload.id)) {
    throw new Error('Payload ID already exists');
  }
  
  // Check for duplicate title
  if (this.payloads.some(p => p.title.toLowerCase().trim() === payload.title.toLowerCase().trim())) {
    throw new Error('Payload title already exists');
  }
  
  this.payloads.push(payload);
  return this.save();
};

// Instance method to remove payload
instaxBotSystemMenuSchema.methods.removePayload = function(payloadId) {
  const initialLength = this.payloads.length;
  this.payloads = this.payloads.filter(p => p.id !== payloadId);
  
  if (this.payloads.length === initialLength) {
    throw new Error('Payload not found');
  }
  
  return this.save();
};

// Instance method to update payload
instaxBotSystemMenuSchema.methods.updatePayload = function(payloadId, updateData) {
  const payloadIndex = this.payloads.findIndex(p => p.id === payloadId);
  if (payloadIndex === -1) {
    throw new Error('Payload not found');
  }
  
  // Check for duplicate title (excluding current payload)
  const duplicateTitle = this.payloads.some((p, index) => 
    index !== payloadIndex && 
    p.title.toLowerCase().trim() === updateData.title.toLowerCase().trim()
  );
  
  if (duplicateTitle) {
    throw new Error('Payload title already exists');
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

// Virtual for getting payload statistics
instaxBotSystemMenuSchema.virtual('statistics').get(function() {
  return {
    totalPayloads: this.payloads.length,
    payloadCount: this.payloadCount,
    webUrlCount: this.webUrlCount,
    remainingWebUrlSlots: 2 - this.webUrlCount
  };
});

// Transform JSON output to remove sensitive/unnecessary fields
instaxBotSystemMenuSchema.methods.toJSON = function() {
  const obj = this.toObject({ virtuals: true });
  delete obj.__v;
  return obj;
};

// Indexes for performance optimization
instaxBotSystemMenuSchema.index({ tenentId: 1, isActive: 1 });
instaxBotSystemMenuSchema.index({ updatedAt: -1 });
instaxBotSystemMenuSchema.index({ createdAt: -1 });
instaxBotSystemMenuSchema.index({ lastAccessedAt: -1 });

// Prevent model re-compilation error
const InstaxBotSystemMenu = mongoose.models.InstaxBotSystemMenu || 
  mongoose.model('InstaxBotSystemMenu', instaxBotSystemMenuSchema);

module.exports = InstaxBotSystemMenu;