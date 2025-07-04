const mongoose = require('mongoose');
const securityaccesstokenSchema = new mongoose.Schema({
  
  
    senderId: { type: String, required: true },
    securityaccessToken: { type: String, required: true },
    tenentId: { type: String, required: true }
    
  }, { timestamps: true });
  const SecurityAccessToken = mongoose.model('SecurityAccessToken', securityaccesstokenSchema);
  module.exports = SecurityAccessToken;