const mongoose = require('mongoose');
const newuserSchema = new mongoose.Schema({
  
  
    senderId: { type: String, required: true },
    username: { type: String, required: true },
    name: { type: String, required: true },
    profile_pic:{ type: String },
    tenentId: { type: String, required: true }
    
  }, { timestamps: true });
  const Newuser = mongoose.model('Newuser', newuserSchema);
  module.exports = Newuser;