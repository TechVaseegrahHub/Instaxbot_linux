const mongoose = require('mongoose');

// First, create a schema for product types
const productTypeSchema = new mongoose.Schema({
  tenentId: {
    type: String,
    required: true
  },
  
  productTypes: [{
    title: {
      type: String,
      required: true
    },
    
    payload: {
      type: String,
      required: true
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const ProductType = mongoose.model('ProductType', productTypeSchema);
module.exports = ProductType;