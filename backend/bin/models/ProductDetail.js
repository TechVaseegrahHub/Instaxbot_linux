const mongoose = require('mongoose');

const productUnitSchema = new mongoose.Schema({
  unit: {
    type: String,
    required: true
  },
  price: {
    type: String,
    required: true
  }
});

const productDetailSchema = new mongoose.Schema({
  tenentId: {
    type: String,
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  units: [productUnitSchema],
  websiteLink: {
    type: String,
    required: true
  },
  productPhoto: {
    type: String,  // Store the photo URL
    required: true
  }
}, { timestamps: true });

const ProductDetail= mongoose.model('ProductDetail', productDetailSchema);
module.exports = ProductDetail;