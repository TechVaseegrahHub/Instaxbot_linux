// models/Organisation.js
const mongoose = require('mongoose');

const razorpaySchema = new mongoose.Schema({
  // Other organisation fields would go here...
  
  tenentId: {
    type: String,
    required: true
  },
  razorpayAccessToken: {
    type: String,
    default: null
  },
  razorpayRefreshToken: {
    type: String,
    default: null
  },
  razorpayTokenExpiresAt: {
    type: Date,
    default: null
  },
  razorpayAccountId: {
    type: String,
    default: null
  },
  razorpayKeyId: {
    type: String,
    default: null
  },
  razorpayState: {
    type: String,
    default: null
  },
  razorpayStateExpiresAt: {
    type: Date,
    default: null
  }
}, { 
  timestamps: true,
  // This helps match Prisma's snake_case field names in the database
  
});

const Razorpay = mongoose.model('Razorpay', razorpaySchema);
module.exports = Razorpay;