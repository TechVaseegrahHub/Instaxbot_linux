const mongoose = require('mongoose');

const productUnitSchema = new mongoose.Schema({
  unit: {
    type: String,
    required: true
  },
  price: {
    type: String,
    required: true
  },
  imageUrl: {
    type: String,
    default: ''
  },
  sku: {
    type: String,
    required: true
  },
   quantityInStock: {
    type: Number,
    default: 0,
    min: 0
  },
  lastRestocked: { // Added for unit-specific restock tracking
    type: Date
  }
});

const productColorSchema = new mongoose.Schema({
  color: {
    type: String,
    required: true
  },
  price: {
    type: String,
    required: true
  },
  imageUrl: {
    type: String,
    default: ''
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
  colors: [productColorSchema],
  websiteLink: {
    type: String,
    
  },
  productPhoto: {
    type: String,
  },
  productPhotoUrl:{
    type: String,
  },
  productDescription:{
    type: String,
  },
  sku:{
    type: String,
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

const ProductDetail = mongoose.model('ProductDetail', productDetailSchema);
module.exports = ProductDetail;
