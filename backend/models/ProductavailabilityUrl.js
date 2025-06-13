const mongoose = require('mongoose');
const ProductavailabilityUrlSchema = new mongoose.Schema({
  
  
    url: { type: String, required: true },
    type: { type: String},
    
    tenentId: { type: String, required: true }
    
  }, { timestamps: true });
  const ProductavailabilityUrl = mongoose.model('ProductavailabilityUrl', ProductavailabilityUrlSchema);
  module.exports = ProductavailabilityUrl;