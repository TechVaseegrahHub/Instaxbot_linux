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
  const tokenData = await SecurityAccessToken.findOne({
    tenentId,
    securityaccessToken: securityAccessToken
  });

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
    if (!shippingAddressString) return null;

    const addressData = JSON.parse(shippingAddressString);
    return addressData.shippingPartner || null;
  } catch (error) {
    console.error('Error parsing shipping address:', error);
    return null;
  }
}

// Get cart contents using securityAccessToken
router.get('/:securityAccessToken/:tenentId', async (req, res) => {
  try {
    const { securityAccessToken, tenentId } = req.params;
    console.log("securityAccessToken for cart",securityAccessToken);
    // Get senderId from securityAccessToken
    const senderId = await getSenderIdFromToken(securityAccessToken, tenentId);

    // Find the user's cart or create an empty one
    let cart = await Cart.findOne({ senderId, tenentId });
    console.log("cart",cart);
    if (!cart) {
      return res.status(200).json({ items: [], total: 0 });
    }

    // Calculate the total price
    const total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    res.status(200).json({
      items: cart.items,
      total
    });
  } catch (error) {
    console.error('Error fetching cart:', error);
    if (error.message === 'Invalid security token') {
      return res.status(401).json({ message: 'Invalid security token' });
    }
    res.status(500).json({ message: 'Server error fetching cart' });
  }
});

// Add product to cart by SKU using securityAccessToken

router.post('/add', async (req, res) => {
  console.log('Cart add request body:', req.body);
  try {
    const { securityAccessToken, tenentId, sku, quantity } = req.body;

    if (!securityAccessToken || !tenentId || !sku || !quantity) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Get senderId from securityAccessToken
    const senderId = await getSenderIdFromToken(securityAccessToken, tenentId);

    // Find product details by SKU
    const productDetail = await ProductDetail.findOne({ tenentId, sku });

    if (!productDetail) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Ensure the quantity requested is not more than the available stock
    const availableStock = productDetail.quantityInStock || 0;
    if (quantity > availableStock) {
      return res.status(400).json({ message: `Not enough stock available. Only ${availableStock} items in stock.` });
    }

    // Get the price (first unit price)
    const price = parseFloat(productDetail.units[0].price);

    // Find existing cart or create a new one
    let cart = await Cart.findOne({ senderId, tenentId });

    if (!cart) {
      cart = new Cart({ senderId, tenentId, items: [] });
    }

    // Check if product is already in the cart
    const existingItemIndex = cart.items.findIndex(item => item.sku === sku);

    if (existingItemIndex !== -1) {
      // Increment the quantity in the cart
      cart.items[existingItemIndex].quantity += quantity;
    } else {
      // Add new item to the cart
      cart.items.push({
        sku,
        productName: productDetail.productName,
        productPhotoUrl: productDetail.productPhotoUrl || productDetail.productPhoto,
        price,
        quantity
      });
    }

    // Save the updated cart
    await cart.save();

    // Calculate the total price
    const total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    res.status(200).json({
      message: 'Product added to cart',
      cart: {
        items: cart.items,
        total
      }
    });
  } catch (error) {
    console.error('Error adding product to cart:', error);
    if (error.message === 'Invalid security token') {
      return res.status(401).json({ message: 'Invalid security token' });
    }
    res.status(500).json({ message: 'Server error adding product to cart' });
  }
});

// Update quantity of an item in the cart using securityAccessToken
router.put('/update', async (req, res) => {
  try {
    const { securityAccessToken, tenentId, sku, quantity } = req.body;

    if (!securityAccessToken || !tenentId || !sku || quantity === undefined) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Get senderId from securityAccessToken
    const senderId = await getSenderIdFromToken(securityAccessToken, tenentId);

    // Ensure quantity is a non-negative integer
    const newQuantity = parseInt(quantity);
    if (isNaN(newQuantity) || newQuantity < 0) {
      return res.status(400).json({ message: 'Quantity must be a non-negative number' });
    }

    // Find user's cart
    let cart = await Cart.findOne({ senderId, tenentId });

    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    // Find product details by SKU
    const productDetail = await ProductDetail.findOne({ tenentId, sku });

    if (!productDetail) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const availableStock = productDetail.quantityInStock || 0;

    // Find the existing item in cart
    const existingItemIndex = cart.items.findIndex(item => item.sku === sku);

    if (existingItemIndex === -1) {
      return res.status(404).json({ message: 'Item not found in cart' });
    }

    const currentQuantity = cart.items[existingItemIndex].quantity;

    // Check if we're trying to increase quantity beyond available stock
    if (newQuantity > currentQuantity && newQuantity > availableStock) {
      return res.status(400).json({
        message: `Not enough stock available. Only ${availableStock} items in stock.`,
        insufficientStock: true
      });
    }

    // Update the cart item quantity
    cart.items[existingItemIndex].quantity = newQuantity;

    // Save the updated cart
    await cart.save();

    // Calculate the total price
    const total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    res.status(200).json({
      message: 'Cart updated successfully',
      cart: {
        items: cart.items,
        total
      }
    });
  } catch (error) {
    console.error('Error updating cart:', error);
    if (error.message === 'Invalid security token') {
      return res.status(401).json({ message: 'Invalid security token' });
    }
    res.status(500).json({ message: 'Server error updating cart' });
  }
});

// Remove item from cart using securityAccessToken
router.delete('/remove', async (req, res) => {
  try {
    const { securityAccessToken, tenentId, sku } = req.body;

    if (!securityAccessToken || !tenentId || !sku) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Get senderId from securityAccessToken
    const senderId = await getSenderIdFromToken(securityAccessToken, tenentId);

    // Find user's cart
    let cart = await Cart.findOne({ senderId, tenentId });

    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    // Remove item
    cart.items = cart.items.filter(item => item.sku !== sku);

    await cart.save();

    // Calculate the total price
    const total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    res.status(200).json({
      message: 'Item removed from cart',
      cart: {
        items: cart.items,
        total
      }
    });
  } catch (error) {
    console.error('Error removing item from cart:', error);
    if (error.message === 'Invalid security token') {
      return res.status(401).json({ message: 'Invalid security token' });
    }
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

    // Get senderId from securityAccessToken
    const senderId = await getSenderIdFromToken(securityAccessToken, tenentId);

    // Find and update cart (set items to empty array)
    const result = await Cart.findOneAndUpdate(
      { senderId, tenentId },
      { $set: { items: [] } },
      { new: true }
    );

    if (!result) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    res.status(200).json({
      message: 'Cart cleared successfully',
      cart: {
        items: [],
        total: 0
      }
    });
  } catch (error) {
    console.error('Error clearing cart:', error);
    if (error.message === 'Invalid security token') {
      return res.status(401).json({ message: 'Invalid security token' });
    }
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
router.post('/validate-stock', async (req, res) => {
  try {
    console.log('Starting validate-stock process with body:', req.body);
    const { securityAccessToken, tenentId } = req.body;

    if (!securityAccessToken || !tenentId) {
      console.log('Missing required fields in validate-stock request');
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Get senderId from securityAccessToken
    console.log('Getting senderId from token for tenantId:', tenentId);
    const senderId = await getSenderIdFromToken(securityAccessToken, tenentId);
    console.log('Retrieved senderId:', senderId);

    // Find user's cart
    console.log('Finding cart for senderId:', senderId);
    const cart = await Cart.findOne({ senderId, tenentId });
    console.log('Cart found:', cart ? `Cart with ${cart.items.length} items` : 'No cart found');

    if (!cart || !cart.items || cart.items.length === 0) {
      console.log('Cart is empty or not found');
      return res.status(200).json({
        valid: true,
        message: 'Cart is empty',
        insufficientItems: []
      });
    }

    // Check stock for each item in cart
    console.log(`Validating stock for ${cart.items.length} items in cart`);
    const insufficientItems = [];

    for (const item of cart.items) {
      console.log(`Checking stock for SKU: ${item.sku}, Quantity: ${item.quantity}`);
      // Get current product details to check latest stock
      const productDetail = await ProductDetail.findOne({ tenentId, sku: item.sku });

      if (!productDetail) {
        console.log(`Product not found for SKU: ${item.sku}`);
        insufficientItems.push({
          sku: item.sku,
          productName: item.productName,
          requestedQuantity: item.quantity,
          availableQuantity: 0,
          reason: 'Product no longer exists'
        });
        continue;
      }

      const availableStock = productDetail.quantityInStock || 0;
      console.log(`Available stock for ${item.sku}: ${availableStock}, Requested: ${item.quantity}`);

      if (item.quantity > availableStock) {
        console.log(`Insufficient stock for SKU: ${item.sku}`);
        insufficientItems.push({
          sku: item.sku,
          productName: item.productName,
          requestedQuantity: item.quantity,
          availableQuantity: availableStock,
          reason: 'Insufficient stock'
        });
      }
    }

    const isValid = insufficientItems.length === 0;
    console.log('Stock validation result:', {
      valid: isValid,
      insufficientItemsCount: insufficientItems.length
    });

    const result = {
      valid: isValid,
      message: isValid ? 'All items in cart have sufficient stock' : 'Some items have insufficient stock',
      insufficientItems
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
      // Get current product details to check latest stock
      const productDetail = await ProductDetail.findOne({ tenentId, sku: item.sku });

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

      const availableStock = productDetail.quantityInStock || 0;

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
        await ProductDetail.updateOne(
          { tenentId, sku: item.sku },
          { $inc: { quantityInStock: -item.quantity } },
          { session }
        );
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
      // Get current product details to check latest stock
      const productDetail = await ProductDetail.findOne({ tenentId, sku: item.sku });

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

      const availableStock = productDetail.quantityInStock || 0;

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
          price: Number(item.price)
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