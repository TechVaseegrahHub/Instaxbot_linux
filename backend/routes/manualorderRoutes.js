require("dotenv").config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Order = require('../models/Order');

const router = express.Router();

// CORS setup
router.use(cors({ origin: '*' }));

// ✅ Simple Sequential Order ID Generator
async function generateOrderId(tenentId = 'default') {
  try {
    const result = await mongoose.connection.db.collection('counters').findOneAndUpdate(
      { _id: `order_counter_${tenentId}` },
      { $inc: { sequence_value: 1 } },
      { upsert: true, returnDocument: 'after' }
    );
    const counter = result.value || result;
    
    // Return simple sequential number starting from 1000
    return (1000 + (counter.sequence_value || 0)).toString();
  } catch (error) {
    console.error('Order ID generation error:', error);
    // Fallback to timestamp-based ID
    return Date.now().toString();
  }
}

// ✅ Validate incoming order
const validateOrderData = (req, res, next) => {
  const requiredFields = ['customer_name', 'phone_number', 'address', 'city', 'state', 'zip_code'];
  const missing = requiredFields.filter(field => !req.body[field]);
  if (missing.length > 0) {
    return res.status(400).json({ success: false, message: `Missing: ${missing.join(', ')}` });
  }

  if (!Array.isArray(req.body.products) || req.body.products.length === 0) {
    return res.status(400).json({ success: false, message: 'At least one product is required' });
  }

  const invalidProduct = req.body.products.some(p => !p.product_name || p.quantity <= 0 || p.price <= 0);
  if (invalidProduct) {
    return res.status(400).json({ success: false, message: 'Each product must have name, quantity > 0, price > 0' });
  }

  if (!req.body.total_amount || req.body.total_amount <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid total amount' });
  }

  next();
};

// ✅ POST /orders - Create Order
router.post('/orders', validateOrderData, async (req, res) => {
  try {
    let orderData = { ...req.body };

    // Always generate a new sequential ID (ignore frontend-generated ID)
    orderData.orderId = await generateOrderId(orderData.tenentId || 'default');

    const subtotal = orderData.products.reduce((sum, p) => sum + (p.quantity * p.price), 0);
    const shipping = orderData.shipping_cost || 0;
    const total = subtotal + shipping;

    const newOrderData = {
      ...orderData,
      amount: subtotal,
      total_amount: total,
      amountPaid: orderData.status === 'paid' ? total : 0,
      paymentStatus: orderData.status === 'paid' ? 'paid' : 'pending',
      paymentMethod: orderData.payment_method || '',
      status: orderData.status || 'paid',
      currency: orderData.currency || 'INR',
      country: orderData.country || 'India',
      created_at: new Date(),
      updated_at: new Date(),
      timestamp: new Date().toISOString(),
      confirmation_sent: false,
      print_status: 'PENDING',
      tracking_status: 'NOT_SHIPPED',
      holding_status: 'NOT_ON_HOLD',
      is_on_hold: false,
      packing_status: 'PENDING',
      payment_reminder_sent: false,
      payment_reminder_scheduled: false
    };

    // Avoid undefined fields
    Object.keys(newOrderData).forEach(key => {
      if (newOrderData[key] === undefined || newOrderData[key] === null) {
        delete newOrderData[key];
      }
    });

    // Check duplicate (though unlikely with sequential IDs)
    const existing = await Order.findOne({ orderId: newOrderData.orderId });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Order ID already exists' });
    }

    const newOrder = await new Order(newOrderData).save();

    return res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: {
        orderId: newOrder.orderId,
        _id: newOrder._id,
        status: newOrder.status,
        total_amount: newOrder.total_amount,
        customer_name: newOrder.customer_name,
        bill_no: newOrder.bill_no
      }
    });

  } catch (err) {
    console.error('Create order error:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: 'Validation error', errors: Object.values(err.errors).map(e => e.message) });
    }
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: 'Duplicate key error' });
    }
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ✅ GET Single Order
router.get('/orders/:orderId', async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, data: order });
  } catch (err) {
    console.error('Get order error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ✅ GET All Orders with Filters
router.get('/orders', async (req, res) => {
  try {
    const { tenentId, senderId, status, customer_name, limit = 50, skip = 0, sortBy = 'created_at', sortOrder = 'desc' } = req.query;

    const query = {};
    if (tenentId) query.tenentId = tenentId;
    if (senderId) query.senderId = senderId;
    if (status) query.status = status;
    if (customer_name) query.customer_name = new RegExp(customer_name, 'i');

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const orders = await Order.find(query).sort(sort).limit(parseInt(limit)).skip(parseInt(skip));
    const total = await Order.countDocuments(query);

    res.json({ success: true, data: orders, pagination: { total, limit: parseInt(limit), skip: parseInt(skip) } });
  } catch (err) {
    console.error('Fetch orders error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ✅ PUT /orders/:orderId - Update
router.put('/orders/:orderId', async (req, res) => {
  try {
    const updateData = { ...req.body, updated_at: new Date() };
    delete updateData._id;
    delete updateData.created_at;

    const updated = await Order.findOneAndUpdate({ orderId: req.params.orderId }, updateData, { new: true });
    if (!updated) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, message: 'Order updated', data: updated });
  } catch (err) {
    console.error('Update order error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ✅ DELETE /orders/:orderId
router.delete('/orders/:orderId', async (req, res) => {
  try {
    const deleted = await Order.findOneAndDelete({ orderId: req.params.orderId });
    if (!deleted) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, message: 'Order deleted' });
  } catch (err) {
    console.error('Delete order error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;