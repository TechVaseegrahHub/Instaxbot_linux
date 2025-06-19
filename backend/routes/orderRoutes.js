const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Order = require('../models/Order');

// Helper function to format date
const formatDate = (date) => {
  if (!date) return '';
  try {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
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

// Helper function to safely convert MongoDB values to JavaScript primitives
const safeConvert = (value) => {
  if (value === null || value === undefined) {
    return null;
  }
  
  // Handle MongoDB NumberInt, NumberLong, NumberDecimal
  if (typeof value === 'object' && value !== null) {
    if (value.$numberInt !== undefined) {
      return parseInt(value.$numberInt, 10);
    }
    if (value.$numberLong !== undefined) {
      return parseInt(value.$numberLong, 10);
    }
    if (value.$numberDecimal !== undefined) {
      return parseFloat(value.$numberDecimal);
    }
    if (value.$numberDouble !== undefined) {
      return parseFloat(value.$numberDouble);
    }
    // Handle MongoDB Date objects
    if (value.$date !== undefined) {
      return new Date(value.$date);
    }
  }
  
  return value;
};

// Helper function to deeply clean MongoDB objects
const cleanMongoObject = (obj) => {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(cleanMongoObject);
  }
  
  if (typeof obj === 'object' && obj !== null) {
    // Handle special MongoDB types first
    const converted = safeConvert(obj);
    if (converted !== obj) {
      return converted;
    }
    
    // Clean nested objects
    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
      cleaned[key] = cleanMongoObject(value);
    }
    return cleaned;
  }
  
  return obj;
};

// Helper function to format order for frontend
const formatOrderForFrontend = (order) => {
  const cleanOrder = cleanMongoObject(order); // already defined in your code

  const safeGet = (val, def = '') => {
    const conv = safeConvert(val);
    return (conv === null || conv === undefined || typeof conv === 'object') ? def : conv;
  };

  return {
    id: cleanOrder.orderId || cleanOrder._id?.toString() || '',
    date: formatDate(cleanOrder.created_at),
    name: safeGet(cleanOrder.customer_name) || safeGet(cleanOrder.profile_name) || 'N/A',
    phoneNumber: safeGet(cleanOrder.phone_number, 'N/A'),
    totalAmount: parseFloat(safeConvert(cleanOrder.total_amount)) || 0,
    status: (safeGet(cleanOrder.status, 'CREATED')).toString().toUpperCase(),
    billNo: safeGet(cleanOrder.bill_no),
    paymentStatus: safeGet(cleanOrder.paymentStatus),
    paymentMethod: safeGet(cleanOrder.paymentMethod),

    products: Array.isArray(cleanOrder.products)
      ? cleanOrder.products.map(product => ({
          sku: safeGet(product.sku),
          product_name: safeGet(product.product_name),
          quantity: parseInt(safeConvert(product.quantity)) || 1,
          price: parseFloat(safeConvert(product.price)) || 0,
        }))
      : [],

    address: safeGet(cleanOrder.address),
    city: safeGet(cleanOrder.city),
    state: safeGet(cleanOrder.state),
    zipCode: safeGet(cleanOrder.zip_code || cleanOrder.zipCode),
    pincode: safeGet(cleanOrder.pincode || cleanOrder.pin_code),
    country: safeGet(cleanOrder.country),
    fullAddress: safeGet(cleanOrder.full_address),
    landmark: safeGet(cleanOrder.landmark),
    trackingNumber: safeGet(cleanOrder.tracking_number),
    trackingStatus: safeGet(cleanOrder.tracking_status),
    packingStatus: safeGet(cleanOrder.packing_status),
    isPacked: Boolean(cleanOrder.is_packed),
    razorpayOrderId: safeGet(cleanOrder.razorpayOrderId),
    razorpayPaymentId: safeGet(cleanOrder.razorpayPaymentId),
    createdAt: cleanOrder.created_at,
    updatedAt: cleanOrder.updated_at,
    customerNotes: safeGet(cleanOrder.customer_notes),
  };
};

// Helper function to build search query
const buildSearchQuery = (tenentId, search, status, startDate, endDate) => {
  let query = { tenentId };
  
  // Add status filter - exact match, case-insensitive
  if (status && status.trim()) {
    const statusTrim = status.trim();
    query.status = { $regex: new RegExp(`^${statusTrim}$`, 'i') };
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
  
  // Add search functionality with enhanced location fields
  if (search && search.trim()) {
    const searchTerm = search.trim();
    query.$or = [
      { orderId: { $regex: searchTerm, $options: 'i' } },
      { customer_name: { $regex: searchTerm, $options: 'i' } },
      { profile_name: { $regex: searchTerm, $options: 'i' } },
      { phone_number: { $regex: searchTerm, $options: 'i' } },
      { bill_no: { $regex: searchTerm, $options: 'i' } },
      { address: { $regex: searchTerm, $options: 'i' } },
      { full_address: { $regex: searchTerm, $options: 'i' } },
      { city: { $regex: searchTerm, $options: 'i' } },
      { state: { $regex: searchTerm, $options: 'i' } },
      { country: { $regex: searchTerm, $options: 'i' } },
      { landmark: { $regex: searchTerm, $options: 'i' } },
      { zip_code: { $regex: searchTerm, $options: 'i' } },
      { pincode: { $regex: searchTerm, $options: 'i' } },
      { pin_code: { $regex: searchTerm, $options: 'i' } }
    ];
    
    // If search term is a number, also search by total amount and postal codes
    if (!isNaN(searchTerm) && searchTerm !== '') {
      query.$or.push(
        { total_amount: parseFloat(searchTerm) },
        { zip_code: searchTerm },
        { pincode: searchTerm },
        { pin_code: searchTerm }
      );
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
    const limitNum = Math.min(Math.max(1, parseInt(limit) || 20), 100);

    console.log(`\n=== FETCH ORDERS REQUEST ===`);
    console.log(`TenantId: ${tenentId}`);
    console.log(`Page: ${pageNum} (requested: ${page})`);
    console.log(`Limit: ${limitNum} (requested: ${limit})`);
    console.log(`Status Filter: "${status}"`);
    console.log(`Search Term: "${search}"`);

    // Build query object
    const query = buildSearchQuery(tenentId, search, status, startDate, endDate);
    
    console.log(`MongoDB Query:`, JSON.stringify(query, null, 2));

    // Calculate pagination
    const skip = (pageNum - 1) * limitNum;
    console.log(`Skip: ${skip} records`);
    
    // Execute queries in parallel for better performance
    // Use .lean() to get plain JavaScript objects instead of Mongoose documents
    const [orders, totalOrders] = await Promise.all([
      Order.find(query)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(), // This is crucial for avoiding MongoDB BSON objects
      Order.countDocuments(query)
    ]);
    
    console.log(`\n=== QUERY RESULTS ===`);
    console.log(`Total orders matching query: ${totalOrders}`);
    console.log(`Orders returned for page ${pageNum}: ${orders.length}`);

    // Log first order structure for debugging
    if (orders.length > 0) {
      console.log(`Sample order structure:`, JSON.stringify(orders[0], null, 2));
    }
    
    // Format orders for frontend with proper cleaning
    const formattedOrders = orders.map(formatOrderForFrontend);

    // Calculate pagination info
    const totalPages = Math.ceil(totalOrders / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    console.log(`\n=== PAGINATION INFO ===`);
    console.log(`Total Pages: ${totalPages}`);
    console.log(`Current Page: ${pageNum}`);
    console.log(`Has Next Page: ${hasNextPage}`);
    console.log(`Has Previous Page: ${hasPrevPage}`);
    console.log(`=========================\n`);

    // Ensure all response data is clean
    const response = {
      success: true,
      data: formattedOrders,
      pagination: {
        currentPage: pageNum,
        totalPages: parseInt(totalPages),
        totalOrders: parseInt(totalOrders),
        hasNextPage: Boolean(hasNextPage),
        hasPrevPage: Boolean(hasPrevPage),
        itemsPerPage: parseInt(limitNum),
        startIndex: parseInt(skip + 1),
        endIndex: parseInt(Math.min(skip + limitNum, totalOrders))
      }
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
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

    const sanitizedStatus = status.trim().toUpperCase();
    console.log(`\n=== UPDATE ORDER STATUS ===`);
    console.log(`Order Number: ${orderNumber}`);
    console.log(`Tenant ID: ${tenentId}`);
    console.log(`New Status: ${sanitizedStatus}`);
    
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
    
    console.log(`Update by orderId - Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);
    
    // If no match found by orderId, try by MongoDB _id
    if (result.matchedCount === 0 && mongoose.Types.ObjectId.isValid(orderNumber)) {
      console.log(`Trying update by MongoDB _id...`);
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
      console.log(`Update by _id - Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);
    }
    
    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    console.log(`Successfully updated order ${orderNumber} to status ${sanitizedStatus}`);
    console.log(`========================\n`);
    
    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      updatedCount: parseInt(result.modifiedCount),
      newStatus: sanitizedStatus
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

// Route to fetch single order by ID
router.post('/fetch-order/:orderNumber', async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const { tenentId } = req.body;
    
    if (!orderNumber || !validateTenantId(tenentId)) {
      return res.status(400).json({
        success: false,
        message: 'Order number and valid tenant ID are required'
      });
    }

    console.log(`Fetching single order: ${orderNumber}, tenentId: ${tenentId}`);
    
    let order = null;
    
    order = await Order.findOne({ 
      orderId: orderNumber,
      tenentId: tenentId 
    }).lean(); // Use .lean() here too
    
    if (!order && mongoose.Types.ObjectId.isValid(orderNumber)) {
      order = await Order.findOne({
        _id: orderNumber,
        tenentId: tenentId
      }).lean(); // Use .lean() here too
    }
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    const formattedOrder = formatOrderForFrontend(order);
    
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
                { $in: [{ $toUpper: '$status' }, ['COMPLETED', 'DELIVERED']] },
                1,
                0
              ]
            }
          },
          pendingOrders: {
            $sum: {
              $cond: [
                { $in: [{ $toUpper: '$status' }, ['PENDING', 'CREATED']] },
                1,
                0
              ]
            }
          },
          processingOrders: {
            $sum: {
              $cond: [
                { $in: [{ $toUpper: '$status' }, ['PROCESSING', 'PAID']] },
                1,
                0
              ]
            }
          },
          shippedOrders: {
            $sum: {
              $cond: [
                { $eq: [{ $toUpper: '$status' }, 'SHIPPED'] },
                1,
                0
              ]
            }
          },
          cancelledOrders: {
            $sum: {
              $cond: [
                { $in: [{ $toUpper: '$status' }, ['CANCELLED', 'FAILED']] },
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
      status: { $regex: new RegExp(`^${status.trim()}$`, 'i') }
    };
 
    const [orders, totalOrders] = await Promise.all([
      Order.find(query)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Order.countDocuments(query)
    ]);
 
    const formattedOrders = orders.map(formatOrderForFrontend);
 
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
 
 // Route to get pending orders
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
 
    const pendingOrders = await Order.find({
      tenentId: tenentId,
      $or: [
        { 
          status: { $regex: /^(paid|processing)$/i },
          $or: [{ is_packed: false }, { is_packed: { $exists: false } }]
        },
        {
          status: { $regex: /^(pending|created)$/i }
        }
      ]
    })
    .sort({ created_at: 1 })
    .limit(limitNum)
    .lean();
 
    const formattedOrders = pendingOrders.map(formatOrderForFrontend);
 
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
 
    if (orderIds.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 100 orders can be updated at once'
      });
    }
 
    const sanitizedStatus = status.trim().toUpperCase();
 
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
 
 // Consolidated search route
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
 
    const query = buildSearchQuery(tenentId, searchTerm, '', '', '');
 
    const [orders, totalOrders] = await Promise.all([
      Order.find(query)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Order.countDocuments(query)
    ]);
 
    const formattedOrders = orders.map(formatOrderForFrontend);
 
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