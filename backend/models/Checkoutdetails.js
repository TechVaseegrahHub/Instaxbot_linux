const mongoose = require('mongoose');

const checkoutdetailsSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  pin_code: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  country: { type: String, required: true },
  phone_number: { type: String, required: true },
  shipping_mode: { type: String},
  
  // Add shipping partner information
  shipping_partner: {
    partner_id: { type: String },
    partner_name: { type: String },
    shipping_cost: { type: Number }
  },
  
  tenentId: { type: String, required: true },
  senderId: { type: String, required: true }
}, { timestamps: true });

const Checkoutdetails = mongoose.model('Checkoutdetails', checkoutdetailsSchema);
module.exports = Checkoutdetails;