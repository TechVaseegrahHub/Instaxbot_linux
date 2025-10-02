
const express = require('express');
const router = express.Router();
const axios = require('axios');
const mongoose = require('mongoose');
const Cart = require('../models/Cart');
const Razorpay = require('razorpay');
const ProductDetail = require('../models/ProductDetail');
const SecurityAccessToken = require('../models/SecurityAccessToken');
const Order = require('../models/Order');
const Razorpay_info = require('../models/Razorpay_info');
const Newuser = require('../models/Newuser');
const FREE_SHIPPING_THRESHOLD = 500;
const SPECIAL_SHIPPING_PARTNERS = ['Ship Rocket', 'Delhivery'];
// Helper function to get senderId from securityAccessToken
async function getSenderIdFromToken(securityAccessToken, tenentId) {
  const tokenData = await SecurityAccessToken.findOne({ tenentId, securityaccessToken: securityAccessToken });
  if (!tokenData) {
    throw new Error('Invalid security token');
  }
  return tokenData.senderId;
}
// Function to generate a sequence-based order ID
async function generateOrderId(tenentId) {
  // Find and update the counter for this tenant, or create it if it doesn't exist
  const result = await mongoose.connection.db.collection('counters').findOneAndUpdate(
    { _id: `order_id_${tenentId}` },
    { $inc: { sequence_value: 1 } },
    { upsert: true, returnDocument: 'after' }
  );

  // Get the counter value from the appropriate property
  // The structure of the result might vary based on MongoDB version
  const counter = result.value || result;

  // Return an ID starting from 1000
  return 1000 + (counter.sequence_value || 0);
}
// Helper function to calculate shipping cost
function calculateShippingCost(shippingPartner, cartTotal) {
  if (!shippingPartner) return 0;

  const { name, cost } = shippingPartner;
  console.log("name",name);
  console.log("cost",cost);
  // For special partners, use their own free shipping logic
  if (SPECIAL_SHIPPING_PARTNERS.includes(name)) {
    return cost > 0 ? cost : 0;
  }

  // For other partners, check cart total threshold
  if (cartTotal >= FREE_SHIPPING_THRESHOLD) {
    return 0; // Free shipping
  }

  return cost > 0 ? cost : 0;
}

// Helper function to get shipping partner from address
function extractShippingPartner(shippingAddressString) {
  try {
    console.log("shippingAddressString",shippingAddressString);
    if (!shippingAddressString) return null;

    const addressData = JSON.parse(shippingAddressString);
    console.log("addressDatashippingPartner",addressData.shippingPartner);
    return addressData.shippingPartner || null;
  } catch (error) {
    console.error('Error parsing shipping address:', error);
    return null;
  }
}
function getUnitPrice(productDetail, selectedUnit) {
  const unit = productDetail.units.find(u => u.unit === selectedUnit);
  return unit ? parseFloat(unit.price) : 0;
}

async function getUnitStockInfo(tenentId, sku, selectedUnit) {
  try {
    // First try to find by unit-specific SKU
    let productDetail = await ProductDetail.findOne({
      tenentId,
      'units.sku': sku
    });

    let unitData = null;

    if (productDetail) {
      // Found by unit SKU
      unitData = productDetail.units.find(unit => unit.sku === sku);
    } else {
      // Fallback: try to find by product-level SKU
      productDetail = await ProductDetail.findOne({ tenentId, sku });
      if (productDetail) {
        // Find the unit by selectedUnit name
        unitData = productDetail.units.find(unit => unit.unit === selectedUnit);
      }
    }

    if (!productDetail) {
      return {
        found: false,
        error: 'Product not found',
        availableStock: 0
      };
    }

    if (!unitData) {
      return {
        found: false,
        error: `Unit '${selectedUnit}' not found for this product`,
        availableStock: 0
      };
    }

    return {
      found: true,
      productDetail,
      unitData,
      availableStock: unitData.quantityInStock || 0,
      unitSku: unitData.sku,
      unitPrice: parseFloat(unitData.price) || 0
    };
  } catch (error) {
    console.error('Error getting unit stock info:', error);
    return {
      found: false,
      error: 'Database error',
      availableStock: 0
    };
  }
}


async function validateSingleItemStock(tenentId, sku, selectedUnit, requestedQuantity) {
  const stockInfo = await getUnitStockInfo(tenentId, sku, selectedUnit);

  if (!stockInfo.found) {
    return {
      valid: false,
      error: stockInfo.error,
      availableStock: 0
    };
  }

  const isValid = requestedQuantity <= stockInfo.availableStock;

  return {
    valid: isValid,
    availableStock: stockInfo.availableStock,
    error: isValid ? null : `Insufficient stock. Requested: ${requestedQuantity}, Available: ${stockInfo.availableStock}`,
    stockInfo
  };
}


async function validateCartStock(tenentId, cartItems) {
  const validationResults = [];
  const insufficientItems = [];

  for (const item of cartItems) {
    const result = await validateSingleItemStock(
      tenentId,
      item.sku,
      item.selectedUnit,
      item.quantity
    );

    validationResults.push({
      sku: item.sku,
      selectedUnit: item.selectedUnit,
      ...result
    });

    if (!result.valid) {
      insufficientItems.push({
        sku: item.sku,
        productName: item.productName,
        selectedUnit: item.selectedUnit,
        requestedQuantity: item.quantity,
        availableQuantity: result.availableStock,
        reason: result.error
      });
    }
  }

  return {
    valid: insufficientItems.length === 0,
    insufficientItems,
    allResults: validationResults
  };
}
// Get cart contents using securityAccessToken
router.get('/:securityAccessToken/:tenentId', async (req, res) => {
  try {
    const { securityAccessToken, tenentId } = req.params;
    const senderId = await getSenderIdFromToken(securityAccessToken, tenentId);

    // Find the cart
    const cart = await Cart.findOne({ senderId, tenentId });

    if (!cart || !cart.items || cart.items.length === 0) {
      return res.status(200).json({ items: [], total: 0 });
    }

    // Process each cart item to get current product/unit details
    const cartItemsWithDetails = [];

    for (const item of cart.items) {
      // Find product that contains this unit SKU
      const productDetail = await ProductDetail.findOne({
        tenentId,
        'units.sku': item.sku
      });

      if (productDetail) {
        // Find the specific unit within the product
        const unitData = productDetail.units.find(unit => unit.sku === item.sku);

        if (unitData) {
          cartItemsWithDetails.push({
            sku: item.sku,
            productName: item.productName,
            productPhotoUrl: item.productPhotoUrl || unitData.imageUrl || productDetail.productPhotoUrl || '/default-product-image.jpg',
            price: item.price,
            quantity: item.quantity,
            selectedUnit: item.selectedUnit,
            size: item.selectedUnit,
            units: productDetail.units, // Include all available units for this product
            quantityInStock: unitData.quantityInStock || 0
          });
        }
      }
    }

    const total = cartItemsWithDetails.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    res.status(200).json({ items: cartItemsWithDetails, total });

  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({ message: 'Server error fetching cart' });
  }
});


// Add product to cart by SKU using securityAccessToken

router.post('/add', async (req, res) => {
  try {
    const { securityAccessToken, tenentId, sku, quantity, selectedUnit } = req.body;
    console.log("selectedUnit", selectedUnit);
    console.log("received sku", sku);

    if (!securityAccessToken || !tenentId || !sku || !quantity || !selectedUnit) {
      return res.status(400).json({ message: 'Missing required fields, including selectedUnit' });
    }

    const senderId = await getSenderIdFromToken(securityAccessToken, tenentId);

    // First, try to find product by unit-specific SKU
    let productDetail = await ProductDetail.findOne({
      tenentId,
      'units.sku': sku
    });

    let unitData = null;
    let productSku = null;

    if (productDetail) {
      // Found by unit SKU - extract the specific unit data
      unitData = productDetail.units.find(unit => unit.sku === sku);
      productSku = productDetail.sku;
      console.log("Found product by unit SKU:", sku);
    } else {
      // Fallback: try to find by product-level SKU
      productDetail = await ProductDetail.findOne({ tenentId, sku });
      if (productDetail) {
        // Find the unit by selectedUnit name
        unitData = productDetail.units.find(unit => unit.unit === selectedUnit);
        productSku = sku;
        console.log("Found product by product SKU, looking for unit:", selectedUnit);
      }
    }

    if (!productDetail) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (!unitData) {
      return res.status(404).json({ message: `Selected unit '${selectedUnit}' not found for this product` });
    }

    // Check stock against unit-specific inventory
    const availableStock = unitData.quantityInStock || 0;
    if (quantity > availableStock) {
      return res.status(400).json({
        message: `Not enough stock for ${selectedUnit}. Only ${availableStock} available.`
      });
    }

    const price = parseFloat(unitData.price);

    let cart = await Cart.findOne({ senderId, tenentId });
    if (!cart) {
      cart = new Cart({ senderId, tenentId, items: [] });
    }

    // Use unit-specific SKU for cart operations
    const cartItemSku = unitData.sku;
    const existingItemIndex = cart.items.findIndex(item =>
      item.sku === cartItemSku && item.selectedUnit === selectedUnit
    );

    if (existingItemIndex > -1) {
      const newQuantity = cart.items[existingItemIndex].quantity + quantity;

      // Check if new quantity exceeds available stock
      if (newQuantity > availableStock) {
        return res.status(400).json({
          message: `Cannot add ${quantity} more. Total would be ${newQuantity}, but only ${availableStock} available for ${selectedUnit}.`
        });
      }

      cart.items[existingItemIndex].quantity = newQuantity;
    } else {
      cart.items.push({
        sku: cartItemSku,  // Use unit-specific SKU
        productName: productDetail.productName,
        price,
        quantity,
        selectedUnit,
        productPhotoUrl: unitData.imageUrl || productDetail.productPhotoUrl  // Use unit image if available
      });
    }

    await cart.save();

    // Optional: Update unit stock in database (if you want to reserve stock)
    // unitData.quantityInStock -= quantity;
    // await productDetail.save();

    const total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    res.status(200).json({
      message: `${selectedUnit} added to cart`,
      cart: { items: cart.items, total },
      unitSku: cartItemSku,
      availableStock: availableStock - quantity
    });

  } catch (error) {
    console.error('Error adding product to cart:', error);
    res.status(500).json({ message: 'Server error adding product to cart' });
  }
});

// Update quantity of an item in the cart using securityAccessToken
// Update quantity of an item in the cart using securityAccessToken
router.put('/update', async (req, res) => {
  try {
    const { securityAccessToken, tenentId, sku, selectedUnit, newQuantity, newSelectedUnit } = req.body;

    if (!securityAccessToken || !tenentId || !sku || !selectedUnit) {
      return res.status(400).json({ message: 'Missing required fields to identify item (sku, selectedUnit)' });
    }
    if (newQuantity === undefined && !newSelectedUnit) {
      return res.status(400).json({ message: 'Nothing to update. Provide newQuantity or newSelectedUnit.' });
    }

    const senderId = await getSenderIdFromToken(securityAccessToken, tenentId);
    const cart = await Cart.findOne({ senderId, tenentId });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    const itemIndex = cart.items.findIndex(item => item.sku === sku && item.selectedUnit === selectedUnit);
    if (itemIndex === -1) return res.status(404).json({ message: `Item with SKU ${sku} and unit ${selectedUnit} not found in cart` });

    // Find product details - first try by unit-specific SKU, then by product SKU
    let productDetail = await ProductDetail.findOne({
      tenentId,
      'units.sku': sku
    });

    let unitData = null;
    let productSku = null;

    if (productDetail) {
      // Found by unit SKU - extract the specific unit data
      unitData = productDetail.units.find(unit => unit.sku === sku);
      productSku = productDetail.sku;
    } else {
      // Fallback: try to find by product-level SKU
      productDetail = await ProductDetail.findOne({ tenentId, sku });
      if (productDetail) {
        // Find the unit by selectedUnit name
        unitData = productDetail.units.find(unit => unit.unit === selectedUnit);
        productSku = sku;
      }
    }

    if (!productDetail) {
      return res.status(404).json({ message: 'Product details not found' });
    }

    if (!unitData) {
      return res.status(404).json({ message: `Selected unit '${selectedUnit}' not found for this product` });
    }

    // Handle quantity update
    if (newQuantity !== undefined) {
      const quantityNum = parseInt(newQuantity);
      if (isNaN(quantityNum) || quantityNum < 0) {
        return res.status(400).json({ message: 'Invalid quantity' });
      }

      // Check stock against unit-specific inventory
      const availableStock = unitData.quantityInStock || 0;
      if (quantityNum > availableStock) {
        return res.status(400).json({
          message: `Not enough stock for ${selectedUnit}. Only ${availableStock} available.`
        });
      }

      cart.items[itemIndex].quantity = quantityNum;
    }

    // Handle unit change
    if (newSelectedUnit && newSelectedUnit !== selectedUnit) {
      // Find the new unit data in the same product
      const newUnitData = productDetail.units.find(unit => unit.unit === newSelectedUnit);
      if (!newUnitData) {
        return res.status(404).json({ message: `New unit '${newSelectedUnit}' not found for this product` });
      }

      const currentQuantity = cart.items[itemIndex].quantity;
      const newUnitSku = newUnitData.sku;

      // Check if an item with the new unit already exists to merge them
      const mergeTargetIndex = cart.items.findIndex(item =>
        item.sku === newUnitSku && item.selectedUnit === newSelectedUnit
      );

      if (mergeTargetIndex > -1) {
        // Check stock for merged quantity
        const totalQuantity = cart.items[mergeTargetIndex].quantity + currentQuantity;
        const newUnitStock = newUnitData.quantityInStock || 0;

        if (totalQuantity > newUnitStock) {
          return res.status(400).json({
            message: `Cannot merge items. Total quantity would be ${totalQuantity}, but only ${newUnitStock} available for ${newSelectedUnit}.`
          });
        }

        // Merge into existing item
        cart.items[mergeTargetIndex].quantity = totalQuantity;
        // Remove the old item
        cart.items.splice(itemIndex, 1);
      } else {
        // Check stock for the new unit
        const newUnitStock = newUnitData.quantityInStock || 0;
        if (currentQuantity > newUnitStock) {
          return res.status(400).json({
            message: `Cannot change unit. Quantity ${currentQuantity} exceeds available stock ${newUnitStock} for ${newSelectedUnit}.`
          });
        }

        // Just update the unit, SKU, and price of the current item
        cart.items[itemIndex].selectedUnit = newSelectedUnit;
        cart.items[itemIndex].sku = newUnitSku; // Update to unit-specific SKU
        cart.items[itemIndex].price = parseFloat(newUnitData.price);
        cart.items[itemIndex].productPhotoUrl = newUnitData.imageUrl || productDetail.productPhotoUrl; // Update image if available
      }
    }

    await cart.save();
    const total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    res.status(200).json({ message: 'Cart updated', cart: { items: cart.items, total } });
  } catch (error) {
    console.error('Error updating cart:', error);
    res.status(500).json({ message: 'Server error updating cart' });
  }
});

// Remove item from cart using securityAccessToken
router.delete('/remove', async (req, res) => {
  try {
    const { securityAccessToken, tenentId, sku, selectedUnit } = req.body;

    if (!securityAccessToken || !tenentId || !sku || !selectedUnit) {
      return res.status(400).json({ message: 'Missing required fields (sku, selectedUnit)' });
    }

    const senderId = await getSenderIdFromToken(securityAccessToken, tenentId);

    // Find the cart first to check what we're removing
    const cart = await Cart.findOne({ senderId, tenentId });
    if (!cart) {
      return res.status(200).json({ message: 'Cart not found', cart: { items: [], total: 0 } });
    }

    // Find the item in cart to get the correct SKU format
    const itemToRemove = cart.items.find(item =>
      item.sku === sku && item.selectedUnit === selectedUnit
    );

    if (!itemToRemove) {
      // If not found with exact SKU match, try to find by product SKU and unit combination
      // This handles cases where frontend might send product SKU instead of unit SKU
      const productDetail = await ProductDetail.findOne({ tenentId, sku });
      if (productDetail) {
        const unitData = productDetail.units.find(unit => unit.unit === selectedUnit);
        if (unitData) {
          // Try with the unit-specific SKU
          const itemWithUnitSku = cart.items.find(item =>
            item.sku === unitData.sku && item.selectedUnit === selectedUnit
          );

          if (itemWithUnitSku) {
            // Remove using the unit-specific SKU
            const updatedCart = await Cart.findOneAndUpdate(
              { senderId, tenentId },
              { $pull: { items: { sku: unitData.sku, selectedUnit: selectedUnit } } },
              { new: true }
            );

            const total = updatedCart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            return res.status(200).json({ message: 'Item removed', cart: { items: updatedCart.items, total } });
          }
        }
      }

      return res.status(404).json({ message: `Item with SKU ${sku} and unit ${selectedUnit} not found in cart` });
    }

    // Remove the item using the exact SKU and selectedUnit from the cart
    const updatedCart = await Cart.findOneAndUpdate(
      { senderId, tenentId },
      { $pull: { items: { sku: itemToRemove.sku, selectedUnit: selectedUnit } } },
      { new: true }
    );

    if (!updatedCart) {
      return res.status(200).json({ message: 'Cart not found', cart: { items: [], total: 0 } });
    }

    const total = updatedCart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    res.status(200).json({ message: 'Item removed', cart: { items: updatedCart.items, total } });
  } catch (error) {
    console.error('Error removing item from cart:', error);
    res.status(500).json({ message: 'Server error removing item from cart' });
  }
});
// Clear cart using securityAccessToken
router.delete('/clear', async (req, res) => {
  try {
    const { securityAccessToken, tenentId } = req.body;
    if (!securityAccessToken || !tenentId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    const senderId = await getSenderIdFromToken(securityAccessToken, tenentId);
    await Cart.findOneAndUpdate({ senderId, tenentId }, { $set: { items: [] } });
    res.status(200).json({ message: 'Cart cleared', cart: { items: [], total: 0 } });
  } catch (error) {
    console.error('Error clearing cart:', error);
    res.status(500).json({ message: 'Server error clearing cart' });
  }
});


// Add endpoint to get product details by SKU using securityAccessToken (useful for frontend)
router.get('/product/:tenentId/:sku', async (req, res) => {
  try {
    const { tenentId, sku } = req.params;

    const productDetail = await ProductDetail.findOne({
      tenentId,
      sku
    });

    if (!productDetail) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.status(200).json(productDetail);
  } catch (error) {
    console.error('Error fetching product details:', error);
    res.status(500).json({ message: 'Server error fetching product details' });
  }
});

// Validate stock availability for all items in cart
// Validate stock availability for all items in cart
router.post('/validate-stock', async (req, res) => {
  try {
    console.log('Starting validate-stock process with body:', req.body);
    const { securityAccessToken, tenentId } = req.body;
    
    if (!securityAccessToken || !tenentId) {
      console.log('Missing required fields in validate-stock request');
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    const senderId = await getSenderIdFromToken(securityAccessToken, tenentId);
    console.log('Retrieved senderId:', senderId);
    
    // Find user's cart
    const cart = await Cart.findOne({ senderId, tenentId });
    
    if (!cart || !cart.items || cart.items.length === 0) {
      console.log('Cart is empty or not found');
      return res.status(200).json({ 
        valid: true, 
        message: 'Cart is empty', 
        insufficientItems: [],
        allResults: []   // ✅ make frontend consistent
      });
    }
    
    console.log(`Validating stock for ${cart.items.length} items in cart`);
    
    // Use the improved validation function
    const validationResult = await validateCartStock(tenentId, cart.items);
    
    console.log('Stock validation result:', validationResult);
    
    const result = {
      valid: validationResult.valid,
      message: validationResult.valid 
        ? 'All items in cart have sufficient stock' 
        : 'Some items have insufficient stock',
      insufficientItems: validationResult.insufficientItems,
      allResults: validationResult.allResults   // ✅ added this
    };
    
    console.log('Validate-stock response:', result);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error validating cart stock:', error);
    if (error.message === 'Invalid security token') {
      return res.status(401).json({ message: 'Invalid security token' });
    }
    res.status(500).json({ message: 'Server error validating cart stock' });
  }
});


// Add to your cart routes
router.post('/validate-single-item', async (req, res) => {
  try {
    const { securityAccessToken, tenentId, sku, selectedUnit, requestedQuantity } = req.body;

    if (!securityAccessToken || !tenentId || !sku || !selectedUnit || !requestedQuantity) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const senderId = await getSenderIdFromToken(securityAccessToken, tenentId);
    const result = await validateSingleItemStock(tenentId, sku, selectedUnit, requestedQuantity);

    res.status(200).json(result);
  } catch (error) {
    console.error('Error validating single item stock:', error);
    res.status(500).json({ message: 'Server error validating item stock' });
  }
});

async function createRazorpayPaymentLink(accessToken, { amount, customerPhone, description, billNo }) {
  const timestamp = Date.now();
  const reference_id = `PAY-${timestamp}-${Math.random().toString(36).substring(7)}`;

  const payload = {
    amount: Math.round(amount * 100),
    currency: 'INR',
    accept_partial: false,
    reference_id,
    description: description,
    notes: {
      bill_no: billNo.toString(),
      description: description
    },
    reminder_enable: true
  };

  console.log(payload, "link payload");

  const response = await fetch('https://api.razorpay.com/v1/payment_links', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Failed to create payment link: ${errorData}`);
  }

  return await response.json();
}
async function createOrder(tenentId, securityToken, payment, razorpayOrderId) {
  // Implement your order creation logic
  try {
    // 1. Get cart items for the user
    const cart = await getCart(tenentId, securityToken);

    // 2. Get shipping address
    const shippingAddress = await getShippingAddress(tenentId, securityToken);

    // 3. Create order in your database
    const order = {
      tenentId: tenentId,
      items: cart.items,
      total: cart.total,
      shipping: {
        address: shippingAddress,
        cost: shippingAddress.shippingPartner ? shippingAddress.shippingPartner.cost : 0
      },
      payment: {
        id: payment.id,
        method: 'razorpay',
        amount: payment.amount / 100,
        status: payment.status,
        razorpayOrderId: razorpayOrderId
      },
      status: 'PROCESSING',
      createdAt: new Date()
    };

    // Save order to database (implementation depends on your database)
    const savedOrder = await saveOrderToDatabase(order);

    return savedOrder._id || savedOrder.id; // Return the order ID
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
}
router.post('/create-order', async (req, res) => {
  try {
    const { securityAccessToken, tenentId, amount, currency, receipt, notes } = req.body;
    console.log("notes", notes);
    console.log("amount", amount);

    // Validate request
    if (!securityAccessToken || !tenentId || !amount) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Get senderId from securityAccessToken
    let senderId;
    try {
      senderId = await getSenderIdFromToken(securityAccessToken, tenentId);
    } catch (error) {
      return res.status(401).json({ error: 'Invalid security token' });
    }

    // Validate stock before proceeding
    console.log('Validating stock before creating order');

    // Find user's cart
    const cart = await Cart.findOne({ senderId, tenentId });

    if (!cart || !cart.items || cart.items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // Check stock for each item in cart
    const insufficientItems = [];

    for (const item of cart.items) {
  // Find product that contains this unit SKU
  const productDetail = await ProductDetail.findOne({
    tenentId,
    'units.sku': item.sku
  });

  if (!productDetail) {
    insufficientItems.push({
      sku: item.sku,
      productName: item.productName,
      requestedQuantity: item.quantity,
      availableQuantity: 0,
      reason: 'Product no longer exists'
    });
    continue;
  }

  // Find the specific unit within the product
  const unitData = productDetail.units.find(unit => unit.sku === item.sku);

  if (!unitData) {
    insufficientItems.push({
      sku: item.sku,
      productName: item.productName,
      requestedQuantity: item.quantity,
      availableQuantity: 0,
      reason: 'Unit variant no longer exists'
    });
    continue;
  }

  const availableStock = unitData.quantityInStock || 0;

  if (item.quantity > availableStock) {
    insufficientItems.push({
      sku: item.sku,
      productName: item.productName,
      requestedQuantity: item.quantity,
      availableQuantity: availableStock,
      reason: 'Insufficient stock'
    });
  }
}

    // If there are items with insufficient stock, return error
    if (insufficientItems.length > 0) {
      return res.status(400).json({
        error: 'Insufficient stock',
        insufficientItems: insufficientItems
      });
    }

    // Calculate total price from cart
    const itemsTotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Extract shipping partner from notes and calculate shipping cost using backend logic
    const shippingPartner = extractShippingPartner(notes.shipping_address);
    const calculatedShippingCost = calculateShippingCost(shippingPartner, itemsTotal);

    // Use backend-calculated shipping cost instead of trusting frontend
    const total = itemsTotal + calculatedShippingCost;

    // Log for debugging and security
    console.log("itemsTotal:", itemsTotal);
    console.log("shippingPartner:", shippingPartner);
    console.log("calculatedShippingCost:", calculatedShippingCost);
    console.log("frontend shipping_amount:", notes.shipping_amount);

    // Optional: Verify frontend calculation matches backend
    const frontendShippingAmount = Number(notes.shipping_amount || 0);
    if (Math.abs(frontendShippingAmount - calculatedShippingCost) > 0.01) {
      console.warn(`Shipping amount mismatch! Frontend: ${frontendShippingAmount}, Backend: ${calculatedShippingCost}`);
      // For security, you could reject the request here
      // return res.status(400).json({ error: 'Shipping amount calculation mismatch' });
    }

    // Verify the amount matches the backend-calculated total
    const totalInPaisa = Math.round(total * 100);
    if (amount !== totalInPaisa) {
      console.warn(`Amount mismatch: Request amount ${amount}, calculated total ${totalInPaisa}`);
      // For security, you might want to use the backend-calculated amount
      // return res.status(400).json({ error: 'Total amount calculation mismatch' });
    }

    // Get the stored Razorpay OAuth token for this tenant
    const razorpayInfo = await Razorpay_info.findOne({ tenentId });

    if (!razorpayInfo || !razorpayInfo.razorpayAccessToken) {
      return res.status(404).json({
        error: 'Razorpay integration not found',
        message: 'Please connect your Razorpay account first'
      });
    }

    // Check if token has expired
    if (razorpayInfo.razorpayTokenExpiresAt && new Date() > new Date(razorpayInfo.razorpayTokenExpiresAt)) {
      return res.status(401).json({
        error: 'Razorpay token expired',
        message: 'Please reconnect your Razorpay account'
      });
    }

    // Create order options for Razorpay using backend-calculated values
    const options = {
      amount: totalInPaisa, // Use backend-calculated amount
      currency: currency || 'INR',
      receipt: receipt || `receipt_${Date.now()}`,
      notes: {
        ...notes,
        backend_calculated_shipping: calculatedShippingCost,
        backend_calculated_total: total
      }
    };

    try {
      // Make API call to Razorpay using OAuth token
      const orderResponse = await axios.post('https://api.razorpay.com/v1/orders', options, {
        headers: {
          'Authorization': `Bearer ${razorpayInfo.razorpayAccessToken}`,
          'Content-Type': 'application/json'
        }
      });

      // Try to get merchant ID, but don't fail if it doesn't work
      let key_id = null;
      try {
        const merchantResponse = await axios.get('https://api.razorpay.com/v1/merchants/me', {
          headers: {
            'Authorization': `Bearer ${razorpayInfo.razorpayAccessToken}`,
            'Content-Type': 'application/json'
          }
        });
        key_id = merchantResponse.data.id;
        console.log("merchantResponse", merchantResponse);
      } catch (merchantError) {
        console.warn('Could not fetch merchant details, using key_id from database instead');
        key_id = razorpayInfo.razorpayKeyId;
      }

      // Store order details in database using backend-calculated values
      const newOrder = new Order({
        tenentId,
        senderId,
        razorpayOrderId: orderResponse.data.id,
        cartItems: cart.items,
        amount: total, // Use backend-calculated total
        currency: orderResponse.data.currency,
        status: 'CREATED',
        notes: {
          ...notes,
          backend_calculated_shipping: calculatedShippingCost,
          backend_calculated_total: total
        },
        shippingCost: calculatedShippingCost, // Store backend-calculated shipping
        createdAt: new Date(orderResponse.data.created_at * 1000)
      });

      await newOrder.save();

      // Return order details and key_id to client
      res.status(200).json({
        id: orderResponse.data.id,
        amount: totalInPaisa, // Return backend-calculated amount
        currency: orderResponse.data.currency,
        key_id: key_id || razorpayInfo.razorpayKeyId,
        created_at: orderResponse.data.created_at,
        backend_calculated_total: total,
        backend_calculated_shipping: calculatedShippingCost
      });
    } catch (apiError) {
      console.error('Razorpay API error:', apiError.response?.data || apiError.message);

      return res.status(apiError.response?.status || 500).json({
        error: 'Razorpay API error',
        details: apiError.response?.data || { message: apiError.message }
      });
    }
  } catch (error) {
    console.error('Error creating Razorpay order:', error);

    res.status(500).json({
      error: 'Failed to create order',
      message: error.message
    });
  }
});

// Verify payment after it's completed
router.post('/verify-payment', async (req, res) => {
  try {
    const {
      tenentId,
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      securityAccessToken
    } = req.body;

    if (!tenentId || !razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !securityAccessToken) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Get senderId from securityAccessToken
    let senderId;
    try {
      senderId = await getSenderIdFromToken(securityAccessToken, tenentId);
    } catch (error) {
      return res.status(401).json({ error: 'Invalid security token' });
    }

    // Get the stored Razorpay information for this tenant
    const razorpayInfo = await Razorpay_info.findOne({ tenentId });

    if (!razorpayInfo || !razorpayInfo.razorpayAccessToken || !razorpayInfo.razorpayWebhookSecret) {
      return res.status(404).json({ error: 'Razorpay integration not found or incomplete' });
    }

    // Verify signature
    const generatedSignature = crypto
      .createHmac('sha256', razorpayInfo.razorpayWebhookSecret)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: 'Payment verification failed: Invalid signature'
      });
    }

    // Get payment details from Razorpay
    const paymentResponse = await axios.get(`https://api.razorpay.com/v1/payments/${razorpay_payment_id}`, {
      headers: {
        'Authorization': `Bearer ${razorpayInfo.razorpayAccessToken}`
      }
    });

    const payment = paymentResponse.data;

    // Verify that the payment matches the order
    if (payment.order_id !== razorpay_order_id) {
      return res.status(400).json({
        success: false,
        error: 'Payment verification failed: Order ID mismatch'
      });
    }

    // Begin database transaction to update order, reduce stock, and clear cart
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Find the order by Razorpay order ID
      const order = await Order.findOne({ razorpayOrderId: razorpay_order_id, tenentId });

      if (!order) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ error: 'Order not found' });
      }

      // 2. Update order status
      order.razorpayPaymentId = razorpay_payment_id;
      order.status = payment.status === 'captured' ? 'paid' : payment.status;
      order.paymentDetails = payment;
      order.updatedAt = new Date();
      await order.save({ session });

      // 3. Reduce product stock for each item
      for (const item of order.cartItems) {
  // Find product that contains this unit SKU
  const productDetail = await ProductDetail.findOne({
    tenentId,
    'units.sku': item.sku
  });

  if (productDetail) {
    // Find the specific unit and reduce its stock
    const unitIndex = productDetail.units.findIndex(unit => unit.sku === item.sku);
    if (unitIndex !== -1) {
      productDetail.units[unitIndex].quantityInStock -= item.quantity;
      await productDetail.save({ session });
    }
  }
}

      // 4. Clear user's cart after successful payment
      await Cart.updateOne(
        { senderId, tenentId },
        { $set: { items: [] } },
        { session }
      );

      // Commit the transaction
      await session.commitTransaction();
      session.endSession();

      // Return success response
      res.status(200).json({
        success: true,
        message: 'Payment verified successfully',
        orderId: order._id,
        payment: {
          id: payment.id,
          amount: payment.amount / 100,
          status: payment.status
        }
      });
    } catch (transactionError) {
      // Abort transaction on error
      await session.abortTransaction();
      session.endSession();
      throw transactionError;
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify payment',
      message: error.message
    });
  }
});
// Add this to your razorpay.js routes file

// Create payment link
router.post('/create-payment-link', async (req, res) => {
  try {
    const { securityAccessToken, tenentId, amount, description, notes } = req.body;
    console.log("notes", notes);
    console.log("amount", amount);
    console.log("securityAccessToken", securityAccessToken);
    console.log("tenentId", tenentId);

    // Validate request
    if (!securityAccessToken || !tenentId || !amount) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Get senderId from securityAccessToken
    let senderId;
    try {
      senderId = await getSenderIdFromToken(securityAccessToken, tenentId);
      console.log("senderId", senderId);
    } catch (error) {
      return res.status(401).json({ error: 'Invalid security token' });
    }

    // Validate stock before proceeding
    console.log('Validating stock before creating payment link');

    // Find user's cart
    const cart = await Cart.findOne({ senderId, tenentId });

    if (!cart || !cart.items || cart.items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // Check stock for each item in cart
    const insufficientItems = [];

    for (const item of cart.items) {
  // Find product that contains this unit SKU
  const productDetail = await ProductDetail.findOne({
    tenentId,
    'units.sku': item.sku
  });

  if (!productDetail) {
    insufficientItems.push({
      sku: item.sku,
      productName: item.productName,
      requestedQuantity: item.quantity,
      availableQuantity: 0,
      reason: 'Product no longer exists'
    });
    continue;
  }

  // Find the specific unit within the product
  const unitData = productDetail.units.find(unit => unit.sku === item.sku);

  if (!unitData) {
    insufficientItems.push({
      sku: item.sku,
      productName: item.productName,
      requestedQuantity: item.quantity,
      availableQuantity: 0,
      reason: 'Unit variant no longer exists'
    });
    continue;
  }

  const availableStock = unitData.quantityInStock || 0;

  if (item.quantity > availableStock) {
    insufficientItems.push({
      sku: item.sku,
      productName: item.productName,
      requestedQuantity: item.quantity,
      availableQuantity: availableStock,
      reason: 'Insufficient stock'
    });
  }
}

    // If there are items with insufficient stock, return error
    if (insufficientItems.length > 0) {
      return res.status(400).json({
        error: 'Insufficient stock',
        insufficientItems: insufficientItems
      });
    }

    // Calculate total price from cart
    const itemsTotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Extract shipping partner from notes and calculate shipping cost using backend logic
    const shippingPartner = extractShippingPartner(notes.shipping_address);
    const calculatedShippingCost = calculateShippingCost(shippingPartner, itemsTotal);

    // Use backend-calculated shipping cost instead of trusting frontend
    const total = itemsTotal + calculatedShippingCost;

    // Log for debugging and security
    console.log("itemsTotal:", itemsTotal);
    console.log("shippingPartner:", shippingPartner);
    console.log("calculatedShippingCost:", calculatedShippingCost);
    console.log("frontend shipping_amount:", notes.shipping_amount);

    // Optional: Verify frontend calculation matches backend
    const frontendShippingAmount = Number(notes.shipping_amount || 0);
    if (Math.abs(frontendShippingAmount - calculatedShippingCost) > 0.01) {
      console.warn(`Shipping amount mismatch! Frontend: ${frontendShippingAmount}, Backend: ${calculatedShippingCost}`);
      // For security, you could reject the request here
      // return res.status(400).json({ error: 'Shipping amount calculation mismatch' });
    }

    // Create a bill number (can be order number or any unique identifier)
    const billNo = Date.now();

    // Get the stored Razorpay OAuth info for this tenant
    const razorpayInfo = await Razorpay_info.findOne({ tenentId });

    if (!razorpayInfo) {
      return res.status(404).json({
        error: 'Razorpay integration not found',
        message: 'Please connect your Razorpay account first'
      });
    }
    console.log("razorpayInfo", razorpayInfo);

    // Get valid access token
    let razorpayaccessToken = razorpayInfo.razorpayAccessToken;
    try {
      // If using the organisationId format from the original code
      //accessToken = await getValidAccessToken(tenentId);
    } catch (tokenError) {
      return res.status(401).json({
        error: 'Failed to get valid Razorpay token',
        message: 'Please reconnect your Razorpay account'
      });
    }

    try {
      // Create payment link using the backend-calculated total
      const customerPhone = notes.customer_phone || '';
      const linkDescription = description || `Order from Cart - ${new Date().toISOString().split('T')[0]}`;

      const paymentLinkResponse = await createRazorpayPaymentLink(razorpayaccessToken, {
        amount: total, // Use backend-calculated total
        customerPhone,
        description: linkDescription,
        billNo
      });

      const orderId = await generateOrderId(tenentId);

      // Store order details in database
      let shippingPartnerData = null;
      if (notes.shipping_address) {
        const addressData = JSON.parse(notes.shipping_address);
        if (addressData.shippingPartner) {
          // Store as a string if it's a complex object
          shippingPartnerData = typeof addressData.shippingPartner === 'object'
            ? addressData.shippingPartner.name || JSON.stringify(addressData.shippingPartner)
            : addressData.shippingPartner;
        }
      }

      const userid = await Newuser.findOne({senderId: senderId, tenentId: tenentId}).sort({ createdAt: -1 }).limit(1);
      const name = userid.name;
      const username = userid.username;

      const newOrder = new Order({
        tenentId,
        senderId,
        orderId: orderId,
        bill_no: billNo,
        razorpayPaymentLinkId: paymentLinkResponse.id,
        razorpayPaymentLinkUrl: paymentLinkResponse.short_url,
        customer_name: notes.shipping_address ? JSON.parse(notes.shipping_address).name : "",
        name: name,
        username: username,
        products: cart.items.map(item => ({
          sku: item.sku,
          product_name: item.productName,
          quantity: Number(item.quantity),
          selectedunit: item.selectedUnit,
          price: Number(item.price),
          selectedUnit: item.selectedUnit
        })),
        amount: total, // Use backend-calculated total
        currency: 'INR',
        status: 'CREATED',
        timestamp: new Date().getTime().toString(),
        shipping_cost: calculatedShippingCost, // Use backend-calculated shipping
        total_amount: total, // Use backend-calculated total
        paymentStatus: "",
        paymentMethod: "",
        print_status: "PENDING",
        payment_reminder_sent: false,
        payment_reminder_scheduled: true,
        tracking_status: "NOT_SHIPPED",
        holding_status: "NOT_ON_HOLD",
        is_on_hold: false,
        packing_status: "PENDING",
        address: notes.shipping_address ? JSON.parse(notes.shipping_address).address : "",
        city: notes.shipping_address ? JSON.parse(notes.shipping_address).city : "",
        country: "India",
        phone_number: notes.customer_phone || senderId,
        state: notes.shipping_address ? JSON.parse(notes.shipping_address).state : "",
        zip_code: notes.shipping_address ? JSON.parse(notes.shipping_address).pinCode : "",
        shipping_partner: shippingPartnerData,
        created_at: new Date()
      });

      await newOrder.save();

      // Return payment link details to client with backend-calculated values
      res.status(200).json({
        id: paymentLinkResponse.id,
        payment_link_url: paymentLinkResponse.short_url,
        reference_id: paymentLinkResponse.reference_id,
        amount: total, // Backend-calculated amount
        currency: 'INR',
        status: paymentLinkResponse.status,
        backend_calculated_total: total,
        backend_calculated_shipping: calculatedShippingCost
      });
    } catch (apiError) {
      console.error('Razorpay API error:', apiError.response?.data || apiError.message);

      return res.status(apiError.response?.status || 500).json({
        error: 'Razorpay API error',
        details: apiError.response?.data || { message: apiError.message }
      });
    }
  } catch (error) {
    console.error('Error creating Razorpay payment link:', error);

    res.status(500).json({
      error: 'Failed to create payment link',
      message: error.message
    });
  }
});
module.exports = router;