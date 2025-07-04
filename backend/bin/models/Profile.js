const mongoose = require('mongoose');
const profileSchema = new mongoose.Schema({
  
  
    recipientId: { type: String, required: true },
    username: { type: String, required: true },
    name: { type: String},
  
    
    profile_pic:{ type: String }
    
  }, { timestamps: true });
  const Profile = mongoose.model('Profile', profileSchema);
  module.exports = Profile;