// userModel.js
const mongoose = require('mongoose');

// Define the user schema
const userinfoSchema = new mongoose.Schema({
  
  senderId: { type: String, required: true },
  recipientId: { type: String, required: true },
  
}, { timestamps: true });



// Create and export the User model
const Userinfo = mongoose.model('Userinfo', userinfoSchema);


module.exports = Userinfo;
