const mongoose = require('mongoose');
const PersistentmenuUrlSchema = new mongoose.Schema({
  
  
    url: { type: String, required: true },
    type: { type: String},
    
    tenentId: { type: String, required: true }
    
  }, { timestamps: true });
  const PersistentmenuUrl = mongoose.model('PersistentmenuUrl', PersistentmenuUrlSchema);
  module.exports = PersistentmenuUrl;