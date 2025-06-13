const mongoose = require('mongoose');
const OrderstatusUrlSchema = new mongoose.Schema({
  
  
    url: { type: String, required: true },
    type: { type: String},
    
    tenentId: { type: String, required: true }
    
  }, { timestamps: true });
  const OrderstatusUrl = mongoose.model('OrderstatusUrl', OrderstatusUrlSchema);
  module.exports = OrderstatusUrl;