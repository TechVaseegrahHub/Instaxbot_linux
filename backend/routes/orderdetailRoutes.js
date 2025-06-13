const express = require('express');
const router = express.Router();
const Order = require('../models/Order'); // Adjust path to your Order model

// GET /api/orders?senderId=xxx&tenentId=yyy
router.get('/orders', async (req, res) => {
  try {
    const { 
      senderId, 
      tenentId, 
      page = 1, 
      limit = 10, 
      status, 
      startDate, 
      endDate,
      includeStats = false 
    } = req.query;

    if (!senderId || !tenentId) {
      return res.status(400).json({ 
        error: 'Missing required query parameters: senderId and tenentId' 
      });
    }

    // Build query object - ADDED paymentStatus filter
    const query = {
      tenentId: tenentId,
      paymentStatus: "PAID", // Only show PAID orders
      $or: [
        { customer_wa_id: senderId },
        { senderId: senderId }
      ]
    };

    // Add optional filters
    if (status) {
      query.status = status;
    }

    if (startDate || endDate) {
      query.created_at = {};
      if (startDate) {
        query.created_at.$gte = new Date(startDate);
      }
      if (endDate) {
        query.created_at.$lte = new Date(endDate);
      }
    }

    // Calculate pagination
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    // Get total count for pagination
    const totalOrders = await Order.countDocuments(query);

    // FIX: Use .lean() and convert numbers
    const orders = await Order.find(query)
      .sort({ timestamp: -1, created_at: -1 })
      .skip(skip)
      .limit(limitNumber)
      .lean(); // Convert to plain JS objects

    // FIX: Sanitize numeric fields
    const sanitizedOrders = orders.map(order => ({
      ...order,
      total_amount: Number(order.total_amount) || 0,
      amount: Number(order.amount) || 0,
      amountPaid: Number(order.amountPaid) || 0,
      shipping_cost: Number(order.shipping_cost) || 0,
      weight: Number(order.weight) || 0
    }));

    // Calculate order statistics if requested
    let stats = null;
    if (includeStats === 'true') {
      const pipeline = [
        { $match: query },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalAmount: { $sum: '$total_amount' },
            avgOrderValue: { $avg: '$total_amount' },
            statusCounts: {
              $push: '$status'
            }
          }
        }
      ];

      const statsResult = await Order.aggregate(pipeline);
      
      if (statsResult.length > 0) {
        const statusCounts = {};
        statsResult[0].statusCounts.forEach(status => {
          statusCounts[status] = (statusCounts[status] || 0) + 1;
        });

        stats = {
          totalOrders: Number(statsResult[0].totalOrders) || 0,
          totalAmount: Number(statsResult[0].totalAmount) || 0,
          avgOrderValue: Number(statsResult[0].avgOrderValue) || 0,
          statusBreakdown: statusCounts
        };
      }
    }

    // Format response with pagination info
    const response = {
      orders: sanitizedOrders,
      pagination: {
        currentPage: pageNumber,
        totalPages: Math.ceil(totalOrders / limitNumber),
        totalOrders,
        hasNextPage: pageNumber < Math.ceil(totalOrders / limitNumber),
        hasPrevPage: pageNumber > 1,
        limit: limitNumber
      }
    };

    // Add stats if requested
    if (stats) {
      response.statistics = stats;
    }

    // Add latest order info
    if (sanitizedOrders.length > 0) {
      response.latestOrder = sanitizedOrders[0];
    }

    return res.json(response);

  } catch (error) {
    console.error('Error fetching orders:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// GET /api/orders/summary - Get order summary for a customer
router.get('/orders/summary', async (req, res) => {
  try {
    const { senderId, tenentId } = req.query;

    if (!senderId || !tenentId) {
      return res.status(400).json({ 
        error: 'Missing required query parameters: senderId and tenentId' 
      });
    }

    const query = {
      tenentId: tenentId,
      paymentStatus: "PAID", // Only show PAID orders
      $or: [
        { customer_wa_id: senderId },
        { senderId: senderId }
      ]
    };

    // Get order summary using aggregation - FIX: Add proper serialization
    const summary = await Order.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$total_amount' },
          avgOrderValue: { $avg: '$total_amount' },
          statusCounts: {
            $push: '$status'
          },
          latestOrderDate: { $max: '$created_at' },
          firstOrderDate: { $min: '$created_at' }
        }
      }
    ]);

    let result = {
      totalOrders: 0,
      totalSpent: 0,
      avgOrderValue: 0,
      statusBreakdown: {},
      latestOrderDate: null,
      firstOrderDate: null
    };

    if (summary.length > 0) {
      const data = summary[0];
      
      // Calculate status breakdown
      const statusBreakdown = {};
      data.statusCounts.forEach(status => {
        statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
      });

      // FIX: Convert MongoDB numbers to plain JavaScript numbers
      result = {
        totalOrders: Number(data.totalOrders) || 0,
        totalSpent: Number(data.totalSpent) || 0,
        avgOrderValue: Number(data.avgOrderValue) || 0,
        statusBreakdown,
        latestOrderDate: data.latestOrderDate,
        firstOrderDate: data.firstOrderDate
      };
    }

    // Get latest order details - FIX: Use .lean() for plain objects
    const latestOrder = await Order.findOne(query)
      .sort({ timestamp: -1, created_at: -1 })
      .lean(); // This converts MongoDB document to plain JS object

    if (latestOrder) {
      // FIX: Ensure numeric fields are properly converted
      result.latestOrder = {
        ...latestOrder,
        total_amount: Number(latestOrder.total_amount) || 0,
        amount: Number(latestOrder.amount) || 0,
        amountPaid: Number(latestOrder.amountPaid) || 0,
        shipping_cost: Number(latestOrder.shipping_cost) || 0,
        weight: Number(latestOrder.weight) || 0
      };
    }

    return res.json(result);

  } catch (error) {
    console.error('Error fetching order summary:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// GET /api/orders/:orderId - Get specific order details
router.get('/orders/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { tenentId } = req.query;

    if (!tenentId) {
      return res.status(400).json({ 
        error: 'Missing required query parameter: tenentId' 
      });
    }

    const order = await Order.findOne({
      $or: [
        { orderId: orderId },
        { _id: orderId }
      ],
      tenentId: tenentId,
      paymentStatus: "PAID" // Only show PAID orders
    }).lean();

    if (!order) {
      return res.status(404).json({ 
        error: 'Order not found or not paid' 
      });
    }

    // Sanitize numeric fields
    const sanitizedOrder = {
      ...order,
      total_amount: Number(order.total_amount) || 0,
      amount: Number(order.amount) || 0,
      amountPaid: Number(order.amountPaid) || 0,
      shipping_cost: Number(order.shipping_cost) || 0,
      weight: Number(order.weight) || 0
    };

    return res.json(sanitizedOrder);

  } catch (error) {
    console.error('Error fetching order details:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// POST /api/orders (Alternative method for better security)
router.post('/orders', async (req, res) => {
  try {
    const { 
      senderId, 
      tenentId, 
      page = 1, 
      limit = 10, 
      status, 
      startDate, 
      endDate 
    } = req.body;

    if (!senderId || !tenentId) {
      return res.status(400).json({ 
        error: 'Missing required parameters: senderId and tenentId' 
      });
    }

    // Build query object
    const query = {
      tenentId: tenentId,
      paymentStatus: "PAID", // Only show PAID orders
      $or: [
        { customer_wa_id: senderId },
        { senderId: senderId }
      ]
    };

    // Add optional filters
    if (status) {
      query.status = status;
    }

    if (startDate || endDate) {
      query.created_at = {};
      if (startDate) {
        query.created_at.$gte = new Date(startDate);
      }
      if (endDate) {
        query.created_at.$lte = new Date(endDate);
      }
    }

    // Calculate pagination
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    // Get total count
    const totalOrders = await Order.countDocuments(query);

    // Find orders with pagination
    const orders = await Order.find(query)
      .sort({ timestamp: -1, created_at: -1 })
      .skip(skip)
      .limit(limitNumber)
      .lean();

    // Sanitize numeric fields
    const sanitizedOrders = orders.map(order => ({
      ...order,
      total_amount: Number(order.total_amount) || 0,
      amount: Number(order.amount) || 0,
      amountPaid: Number(order.amountPaid) || 0,
      shipping_cost: Number(order.shipping_cost) || 0,
      weight: Number(order.weight) || 0
    }));

    const response = {
      orders: sanitizedOrders,
      pagination: {
        currentPage: pageNumber,
        totalPages: Math.ceil(totalOrders / limitNumber),
        totalOrders,
        hasNextPage: pageNumber < Math.ceil(totalOrders / limitNumber),
        hasPrevPage: pageNumber > 1,
        limit: limitNumber
      }
    };

    return res.json(response);

  } catch (error) {
    console.error('Error fetching orders:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// PATCH /api/orders/:orderId/status - Update order status
router.patch('/orders/:orderId/status', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, tenentId } = req.body;

    if (!status || !tenentId) {
      return res.status(400).json({ 
        error: 'Missing required parameters: status and tenentId' 
      });
    }

    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
    if (!validStatuses.includes(status.toLowerCase())) {
      return res.status(400).json({ 
        error: 'Invalid status. Valid statuses are: ' + validStatuses.join(', ') 
      });
    }

    const updatedOrder = await Order.findOneAndUpdate(
      {
        $or: [
          { orderId: orderId },
          { _id: orderId }
        ],
        tenentId: tenentId,
        paymentStatus: "PAID" // Only update PAID orders
      },
      { 
        status: status,
        updated_at: new Date()
      },
      { new: true, lean: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({ 
        error: 'Order not found or not paid' 
      });
    }

    // Sanitize the updated order
    const sanitizedOrder = {
      ...updatedOrder,
      total_amount: Number(updatedOrder.total_amount) || 0,
      amount: Number(updatedOrder.amount) || 0,
      amountPaid: Number(updatedOrder.amountPaid) || 0,
      shipping_cost: Number(updatedOrder.shipping_cost) || 0,
      weight: Number(updatedOrder.weight) || 0
    };

    return res.json({
      message: 'Order status updated successfully',
      order: sanitizedOrder
    });

  } catch (error) {
    console.error('Error updating order status:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

module.exports = router;