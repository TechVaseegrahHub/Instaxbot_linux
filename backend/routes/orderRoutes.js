const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Order = require('../models/Order');

// Helper function to format date
const formatDate = (date) => {
  if (!date) return '';
  try {
    const d = new Date(date);
    return d.toISOString().split('T')[0]; // Returns YYYY-MM-DD format
  } catch (error) {
    console.error('Date formatting error:', error);
    return '';
  }
};

// Helper function to validate tenant ID
const validateTenantId = (tenentId) => {
  if (!tenentId || typeof tenentId !== 'string') {
    return false;
  }
  return true;
};

// Helper function to format order for frontend
const formatOrderForFrontend = (order) => {
  return {
    id: order.orderId || order._id,
    date: formatDate(order.created_at),
    name: order.customer_name || order.profile_name || 'N/A',
    phoneNumber: order.phone_number || 'N/A',
    totalAmount: parseFloat(order.total_amount) || 0,
    status: order.status || 'pending',
    billNo: order.bill_no || null,
    paymentStatus: order.paymentStatus || null,
    paymentMethod: order.paymentMethod || null,
    products: order.products || [],
    address: order.address || null,
    city: order.city || null,
    state: order.state || null,
    zipCode: order.zip_code || null,
    trackingNumber: order.tracking_number || null,
    trackingStatus: order.tracking_status || null,
    packingStatus: order.packing_status || null,
    isPacked: Boolean(order.is_packed),
    razorpayOrderId: order.razorpayOrderId || null,
    razorpayPaymentId: order.razorpayPaymentId || null,
    createdAt: order.created_at || null,
    updatedAt: order.updated_at || null,
    customerNotes: order.customer_notes || ''
  };
};

// Helper function to build search query
const buildSearchQuery = (tenentId, search, status, startDate, endDate) => {
  let query = { tenentId };
  
  // Add status filter if provided
  if (status && status.trim()) {
    query.status = { $regex: new RegExp(status.trim(), 'i') };
  }
  
  // Add date range filter
  if (startDate || endDate) {
    query.created_at = {};
    if (startDate) {
      query.created_at.$gte = new Date(startDate);
    }
    if (endDate) {
      query.created_at.$lte = new Date(endDate + 'T23:59:59.999Z');
    }
  }
  
  // Add search functionality
  if (search && search.trim()) {
    const searchTerm = search.trim();
    query.$or = [
      { orderId: { $regex: searchTerm, $options: 'i' } },
      { customer_name: { $regex: searchTerm, $options: 'i' } },
      { profile_name: { $regex: searchTerm, $options: 'i' } },
      { phone_number: { $regex: searchTerm, $options: 'i' } },
      { bill_no: { $regex: searchTerm, $options: 'i' } },
      { address: { $regex: searchTerm, $options: 'i' } },
      { city: { $regex: searchTerm, $options: 'i' } },
      { state: { $regex: searchTerm, $options: 'i' } }
    ];
    
    // If search term is a number, also search by total amount
    if (!isNaN(searchTerm) && searchTerm !== '') {
      query.$or.push({ total_amount: parseFloat(searchTerm) });
    }
  }
  
  return query;
};

// Route to fetch all orders with pagination and filtering
router.post('/fetch-orders', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      status = '',
      tenentId,
      startDate = '',
      endDate = ''
    } = req.body;

    // Validate required fields
    if (!validateTenantId(tenentId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid tenant ID is required'
      });
    }

    // Validate and sanitize pagination parameters
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(Math.max(1, parseInt(limit) || 20), 100); // Max 100 items per page

    console.log(`Fetching orders - tenentId: ${tenentId}, page: ${pageNum}, limit: ${limitNum}`);

    // Build query object
    const query = buildSearchQuery(tenentId, search, status, startDate, endDate);
    
    console.log("Query:", JSON.stringify(query, null, 2));

    // Calculate pagination
    const skip = (pageNum - 1) * limitNum;
    
    // Execute queries in parallel for better performance
    const [orders, totalOrders] = await Promise.all([
      Order.find(query)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Order.countDocuments(query)
    ]);
    
    // Format orders for frontend
    const formattedOrders = orders.map(formatOrderForFrontend);

    // Calculate pagination info
    const totalPages = Math.ceil(totalOrders / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    console.log(`Found ${orders.length} orders out of ${totalOrders} total`);

    res.status(200).json({
      success: true,
      data: formattedOrders,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalOrders,
        hasNextPage,
        hasPrevPage,
        itemsPerPage: limitNum,
        startIndex: skip + 1,
        endIndex: Math.min(skip + limitNum, totalOrders)
      }
    });

  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Route to fetch single order by ID
router.post('/fetch-order/:orderNumber', async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const { tenentId } = req.body;
    
    // Validate required fields
    if (!orderNumber || !validateTenantId(tenentId)) {
      return res.status(400).json({
        success: false,
        message: 'Order number and valid tenant ID are required'
      });
    }

    console.log(`Fetching order: ${orderNumber}, tenentId: ${tenentId}`);
    
    let order = null;
    
    // Try to find by orderId first
    order = await Order.findOne({ 
      orderId: orderNumber,
      tenentId: tenentId 
    }).lean();
    
    // If not found by orderId, try by MongoDB _id
    if (!order && mongoose.Types.ObjectId.isValid(orderNumber)) {
      order = await Order.findOne({
        _id: orderNumber,
        tenentId: tenentId
      }).lean();
    }
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Format order for frontend
    const formattedOrder = formatOrderForFrontend(order);
    
    console.log(`Order found: ${formattedOrder.id}`);
    
    res.status(200).json({
      success: true,
      data: formattedOrder
    });
    
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Route to update order status
router.post('/update-status/:orderNumber', async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const { tenentId, status } = req.body;
    
    // Validate required fields
    if (!orderNumber || !validateTenantId(tenentId) || !status || !status.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Order number, tenant ID, and status are required'
      });
    }

    const sanitizedStatus = status.trim();
    console.log(`Updating order status: ${orderNumber}, tenentId: ${tenentId}, status: ${sanitizedStatus}`);
    
    // Try to update by orderId first
    let result = await Order.updateOne(
      { 
        orderId: orderNumber,
        tenentId: tenentId 
      },
      { 
        status: sanitizedStatus,
        updated_at: new Date()
      }
    );
    
    // If no match found by orderId, try by MongoDB _id
    if (result.matchedCount === 0 && mongoose.Types.ObjectId.isValid(orderNumber)) {
      result = await Order.updateOne(
        {
          _id: orderNumber,
          tenentId: tenentId
        },
        { 
          status: sanitizedStatus,
          updated_at: new Date()
        }
      );
    }
    
    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      updatedCount: result.modifiedCount
    });
    
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Route to get order statistics
router.post('/fetch-stats', async (req, res) => {
  try {
    const { tenentId } = req.body;
    
    if (!validateTenantId(tenentId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid tenant ID is required'
      });
    }
    
    console.log(`Fetching order stats for tenentId: ${tenentId}`);
    
    const stats = await Order.aggregate([
      { $match: { tenentId: tenentId } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: { $ifNull: ['$total_amount', 0] } },
          completedOrders: {
            $sum: {
              $cond: [
                { $in: [{ $toLower: '$status' }, ['completed', 'delivered']] },
                1,
                0
              ]
            }
          },
          pendingOrders: {
            $sum: {
              $cond: [
                { $in: [{ $toLower: '$status' }, ['pending', 'created']] },
                1,
                0
              ]
            }
          },
          processingOrders: {
            $sum: {
              $cond: [
                { $in: [{ $toLower: '$status' }, ['processing', 'paid']] },
                1,
                0
              ]
            }
          },
          shippedOrders: {
            $sum: {
              $cond: [
                { $eq: [{ $toLower: '$status' }, 'shipped'] },
                1,
                0
              ]
            }
          },
          cancelledOrders: {
            $sum: {
              $cond: [
                { $in: [{ $toLower: '$status' }, ['cancelled', 'failed']] },
                1,
                0
              ]
            }
          },
          packedOrders: {
            $sum: {
              $cond: [
                { $eq: ['$is_packed', true] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);
    
    const result = stats[0] || {
      totalOrders: 0,
      totalRevenue: 0,
      completedOrders: 0,
      pendingOrders: 0,
      processingOrders: 0,
      shippedOrders: 0,
      cancelledOrders: 0,
      packedOrders: 0
    };
    
    console.log('Order stats:', JSON.stringify(result, null, 2));
    
    res.status(200).json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('Error fetching order stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Route to get orders by status with pagination
router.post('/fetch-by-status/:status', async (req, res) => {
  try {
    const { status } = req.params;
    const { tenentId, limit = 50, page = 1 } = req.body;
    
    if (!status || !validateTenantId(tenentId)) {
      return res.status(400).json({
        success: false,
        message: 'Status and valid tenant ID are required'
      });
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(Math.max(1, parseInt(limit) || 50), 100);
    const skip = (pageNum - 1) * limitNum;

    console.log(`Fetching orders with status: ${status}, tenentId: ${tenentId}`);

    const query = {
      tenentId: tenentId,
      status: { $regex: new RegExp(status.trim(), 'i') }
    };

    // Execute queries in parallel
    const [orders, totalOrders] = await Promise.all([
      Order.find(query)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Order.countDocuments(query)
    ]);

    // Format orders for frontend
    const formattedOrders = orders.map(order => ({
      id: order.orderId || order._id,
      date: formatDate(order.created_at),
      name: order.customer_name || order.profile_name || 'N/A',
      phoneNumber: order.phone_number || 'N/A',
      totalAmount: parseFloat(order.total_amount) || 0,
      status: order.status || 'pending',
      billNo: order.bill_no,
      paymentStatus: order.paymentStatus,
      packingStatus: order.packing_status,
      isPacked: Boolean(order.is_packed),
      trackingStatus: order.tracking_status
    }));

    console.log(`Found ${orders.length} orders with status: ${status}`);

    res.status(200).json({
      success: true,
      data: formattedOrders,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalOrders / limitNum),
        totalOrders,
        hasNextPage: pageNum < Math.ceil(totalOrders / limitNum),
        hasPrevPage: pageNum > 1
      },
      count: orders.length
    });
    
  } catch (error) {
    console.error('Error fetching orders by status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders by status',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Route to get pending orders that need attention
router.get('/pending-orders/:tenentId', async (req, res) => {
  try {
    const { tenentId } = req.params;
    const { limit = 50 } = req.query;
    
    if (!validateTenantId(tenentId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid tenant ID is required'
      });
    }

    const limitNum = Math.min(Math.max(1, parseInt(limit) || 50), 100);

    console.log(`Fetching pending orders for tenentId: ${tenentId}`);

    // Find all orders that need attention
    const pendingOrders = await Order.find({
      tenentId: tenentId,
      $or: [
        // Include orders that are paid/processing and not packed
        { 
          status: { $in: ['paid', 'processing', 'PAID', 'PROCESSING'] },
          $or: [{ is_packed: false }, { is_packed: { $exists: false } }]
        },
        // Include pending orders
        {
          status: { $in: ['pending', 'PENDING', 'created', 'CREATED'] }
        }
      ]
    })
    .sort({ created_at: 1 }) // Sort by creation date, oldest first
    .limit(limitNum)
    .select('orderId status packing_status created_at customer_name is_packed phone_number total_amount')
    .lean();

    // Format orders for frontend
    const formattedOrders = pendingOrders.map(order => ({
      id: order.orderId || order._id,
      date: formatDate(order.created_at),
      name: order.customer_name || 'N/A',
      phoneNumber: order.phone_number || 'N/A',
      totalAmount: parseFloat(order.total_amount) || 0,
      status: order.status || 'pending',
      packingStatus: order.packing_status,
      isPacked: Boolean(order.is_packed)
    }));

    console.log(`Found ${pendingOrders.length} pending orders`);

    res.status(200).json({
      success: true,
      orders: formattedOrders,
      count: pendingOrders.length
    });
  } catch (error) {
    console.error('Error fetching pending orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending orders',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Route to bulk update order statuses
router.post('/bulk-update-status', async (req, res) => {
  try {
    const { tenentId, orderIds, status } = req.body;

    // Validate required fields
    if (!validateTenantId(tenentId) || 
        !orderIds || 
        !Array.isArray(orderIds) || 
        orderIds.length === 0 || 
        !status || 
        !status.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID, order IDs array, and status are required'
      });
    }

    // Limit bulk operations to prevent abuse
    if (orderIds.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 100 orders can be updated at once'
      });
    }

    const sanitizedStatus = status.trim();
    console.log(`Bulk updating ${orderIds.length} orders to status: ${sanitizedStatus}, tenentId: ${tenentId}`);

    // Update multiple orders at once
    const result = await Order.updateMany(
      { 
        orderId: { $in: orderIds },
        tenentId: tenentId 
      },
      { 
        status: sanitizedStatus,
        updated_at: new Date()
      }
    );

    console.log(`Updated ${result.modifiedCount} orders out of ${orderIds.length} requested`);

    res.status(200).json({
      success: true,
      message: `Successfully updated ${result.modifiedCount} orders to ${sanitizedStatus}`,
      updatedCount: result.modifiedCount,
      requestedCount: orderIds.length
    });
    
  } catch (error) {
    console.error('Error bulk updating order statuses:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk update order statuses',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Consolidated search route (replaces the separate search-orders route)
router.post('/search', async (req, res) => {
  try {
    const { tenentId, searchTerm, limit = 20, page = 1 } = req.body;
    
    if (!validateTenantId(tenentId) || !searchTerm || !searchTerm.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID and search term are required'
      });
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(Math.max(1, parseInt(limit) || 20), 100);
    const skip = (pageNum - 1) * limitNum;

    console.log(`Searching orders for: ${searchTerm}, tenentId: ${tenentId}`);

    // Use the buildSearchQuery helper function
    const query = buildSearchQuery(tenentId, searchTerm, '', '', '');

    // Execute queries in parallel
    const [orders, totalOrders] = await Promise.all([
      Order.find(query)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Order.countDocuments(query)
    ]);

    // Format orders for frontend
    const formattedOrders = orders.map(formatOrderForFrontend);

    console.log(`Found ${orders.length} orders matching search: ${searchTerm}`);

    res.status(200).json({
      success: true,
      data: formattedOrders,
      searchTerm: searchTerm.trim(),
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalOrders / limitNum),
        totalOrders,
        hasNextPage: pageNum < Math.ceil(totalOrders / limitNum),
        hasPrevPage: pageNum > 1
      },
      count: orders.length
    });
    
  } catch (error) {
    console.error('Error searching orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search orders',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;