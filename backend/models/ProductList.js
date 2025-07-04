const mongoose = require('mongoose');

const productListSchema = new mongoose.Schema({
  tenentId: {
    type: String,
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  productType: {
    type: String,
    required: true
  },
  payload: {
    type: String,
    required: true
  }
}, { timestamps: true });
const ProductList = mongoose.model('ProductList', productListSchema);
module.exports = ProductList;
