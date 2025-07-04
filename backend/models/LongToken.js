const mongoose = require('mongoose');
const longtokeninfoSchema = new mongoose.Schema({
  
  
    userAccessToken: { type: String, required: true },
    Instagramid: { type: String ,required: true},
    tenentId: { type: String,required: true}
    

    
  }, { timestamps: true });
  const LongToken = mongoose.model('LongToken', longtokeninfoSchema);
  module.exports = LongToken;