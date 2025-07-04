const mongoose = require('mongoose');

const fromAddressSchema = new mongoose.Schema({
  tenent_id: { type: String, required: true },
  name: { type: String, required: true },
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zipCode: { type: String, required: true },
  phone: { type: String, required: true },
  isDefault: { type: Boolean, default: false }
}, { timestamps: true });

// Index for faster lookups by tenant
fromAddressSchema.index({ tenant_id: 1 });
// Index for finding default address
fromAddressSchema.index({ tenant_id: 1, isDefault: 1 });

const FromAddress = mongoose.model('FromAddress', fromAddressSchema);
module.exports = FromAddress;