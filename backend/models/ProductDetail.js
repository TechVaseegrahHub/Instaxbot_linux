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
    
  },
  productPhotoUrl:{
    type: String,  // Store the photo URL
    
  },
  sku:{
    type: String,  // Store the photo URL
  },
  quantityInStock: {
    type: Number,
    default: 0,
    min: 0
  },
  threshold: {
    type: Number,
    default: 10 // Default low stock threshold
  },
  lastRestocked: {
    type: Date
  }
}, { timestamps: true });

const ProductDetail= mongoose.model('ProductDetail', productDetailSchema);
module.exports = ProductDetail;