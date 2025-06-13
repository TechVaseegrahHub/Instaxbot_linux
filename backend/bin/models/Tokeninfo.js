const mongoose = require('mongoose');
const tokeninfoSchema = new mongoose.Schema({
  
  
    userAccessToken: { type: String, required: true },
    

    
  }, { timestamps: true });
  const Tokeninfo = mongoose.model('Tokeninfo', tokeninfoSchema);
  module.exports = Tokeninfo;