// routes/dashboard.js
const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Comment = require('../models/Comment');
const Order = require('../models/Order');

// Currency formatting helper
function formatCurrency(amount) {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return 0.00;
  }
  return parseFloat(amount.toFixed(2));
}

// COMPREHENSIVE DATE FIELD DEBUGGING
async function debugOrderDateFields(tenentId) {
  console.log('\n🔍 === COMPREHENSIVE ORDER DATE DEBUGGING ===');
  
  try {
    // Get sample orders to inspect their structure
    const sampleOrders = await Order.find({ tenentId }).limit(10);
    
    console.log('📊 SAMPLE ORDERS STRUCTURE:');
    sampleOrders.forEach((order, index) => {
      console.log(`Order ${index + 1}:`, {
        _id: order._id,
        created_at: order.created_at,
        created_atType: typeof order.created_at,
        created_atConstructor: order.created_at?.constructor?.name,
        isDate: order.created_at instanceof Date,
        paymentStatus: order.paymentStatus,
        amount: order.amount,
        // Check if there are other date fields
        updatedAt: order.updatedAt,
        allFields: Object.keys(order.toObject())
      });
    });

    // Check different possible date field names
    const possibleDateFields = ['createdAt', 'created_at', 'date', 'orderDate', 'timestamp', 'updatedAt'];
    
    for (const field of possibleDateFields) {
      const countWithField = await Order.countDocuments({ 
        tenentId, 
        [field]: { $exists: true } 
      });
      console.log(`📊 Orders with '${field}' field: ${countWithField}`);
    }

    // Test if dates are stored as strings vs Date objects
    const now = new Date();
    const yesterday = new Date(now - 24 * 60 * 60 * 1000);
    
    console.log('\n🧪 TESTING DIFFERENT DATE QUERY APPROACHES:');
    
    // Test 1: Standard Date object query
    const dateObjectQuery = await Order.countDocuments({
      tenentId,
      paymentStatus: 'PAID',
      created_at: { $gte: yesterday }
    });
    console.log('1. Date object query (last 24h):', dateObjectQuery);

    // Test 2: String date query
    const stringDateQuery = await Order.countDocuments({
      tenentId,
      paymentStatus: 'PAID',
      created_at: { $gte: yesterday.toISOString() }
    });
    console.log('2. String date query (last 24h):', stringDateQuery);

    // Test 3: Very broad range (last year)
    const lastYear = new Date(now - 365 * 24 * 60 * 60 * 1000);
    const broadQuery = await Order.countDocuments({
      tenentId,
      paymentStatus: 'PAID',
      created_at: { $gte: lastYear }
    });
    console.log('3. Broad date query (last year):', broadQuery);

    // Test 4: Check if all orders have created_at
    const ordersWithcreated_at = await Order.countDocuments({
      tenentId,
      created_at: { $exists: true }
    });
    const ordersWithoutcreated_at = await Order.countDocuments({
      tenentId,
      created_at: { $exists: false }
    });
    console.log('4. Orders WITH created_at field:', ordersWithcreated_at);
    console.log('4. Orders WITHOUT created_at field:', ordersWithoutcreated_at);

    // Test 5: Check date range of existing orders
    const dateRange = await Order.aggregate([
      { $match: { tenentId, created_at: { $exists: true } } },
      {
        $group: {
          _id: null,
          minDate: { $min: '$created_at' },
          maxDate: { $max: '$created_at' },
          count: { $sum: 1 }
        }
      }
    ]);
    console.log('5. Date range of orders:', dateRange);

  } catch (error) {
    console.error('❌ Error in date debugging:', error);
  }
  
  console.log('🔍 === END DATE DEBUGGING ===\n');
}

// SMART DATE QUERY FUNCTION
async function smartOrderQuery(tenentId, startDate, endDate, queryType = 'count') {
  console.log(`🧠 SMART QUERY: ${queryType} for date range ${startDate.toISOString()} to ${endDate.toISOString()}`);
  
  const baseMatch = {
    tenentId,
    paymentStatus: 'PAID' // Ensures we are only considering paid orders
  };

  // Try multiple date query strategies to accommodate different formats of `created_at`
  const strategies = [
    {
      name: 'Date Objects',
      dateQuery: { created_at: { $gte: startDate, $lte: endDate } }
    },
    {
      name: 'ISO Strings',
      dateQuery: { created_at: { $gte: startDate.toISOString(), $lte: endDate.toISOString() } }
    },
    {
      name: 'Timestamp Numbers',
      dateQuery: { created_at: { $gte: startDate.getTime(), $lte: endDate.getTime() } }
    },
    {
      name: 'Date Range (no time)',
      dateQuery: { 
        created_at: { 
          $gte: new Date(startDate.toDateString()), 
          $lte: new Date(endDate.toDateString() + ' 23:59:59') 
        } 
      }
    }
  ];

  for (const strategy of strategies) {
    try {
      const query = { ...baseMatch, ...strategy.dateQuery };
      let result;

      // Perform count or aggregation based on queryType
      if (queryType === 'count') {
        result = await Order.countDocuments(query);
      } else if (queryType === 'amount') {
        const aggResult = await Order.aggregate([
          { $match: query },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        result = aggResult;
      }

      // Logging the result of the strategy
      console.log(`   ${strategy.name}: ${queryType === 'count' ? result : (result.length > 0 ? result[0].total : 0)}`);

      // If we get valid results, return the result
      if ((queryType === 'count' && result > 0) || (queryType === 'amount' && result.length > 0 && result[0].total > 0)) {
        console.log(`✅ SUCCESS with ${strategy.name} strategy!`);
        return result;
      }
    } catch (error) {
      console.log(`   ${strategy.name}: ERROR - ${error.message}`);
    }
  }

  console.log('❌ All strategies failed, returning 0/empty');
  return queryType === 'count' ? 0 : [];
}

// Main dashboard route with comprehensive debugging
router.get('/dashboard', async (req, res) => {
  console.log('\n=== BACKEND: Dashboard API Called ===');
  console.log('Request Query Parameters:', req.query);
  
  const { tenentId, timeframe = 'month' } = req.query;

  if (!tenentId) {
    console.log('❌ BACKEND ERROR: Missing tenentId');
    return res.status(400).json({
      success: false,
      message: 'Missing tenentId'
    });
  }

  console.log(`✅ BACKEND: Processing request for tenentId: ${tenentId}, timeframe: ${timeframe}`);

  try {
    // STEP 1: Debug the date fields first
    await debugOrderDateFields(tenentId);

    // STEP 2: Get date range
    const { startDate, endDate } = getDateRange(timeframe);
    console.log(`📅 BACKEND: Date range - Start: ${startDate.toISOString()}, End: ${endDate.toISOString()}`);

    // STEP 3: Use smart queries for other data
    console.log('🔍 BACKEND: Starting SMART database queries...');
    const [
      robotMessages,
      templateMessages,
      carouselMessages,
      commentReplies,
      allTimeOrders,
      allTimeRevenue,
      activeCustomers
    ] = await Promise.all([
      // Messages (these might work fine)
      Message.countDocuments({
        tenentId,
        $or: [
          { message: { $regex: '🤖' } },
          { response: { $regex: '🤖' } },
          { messageType: 'robot' }
        ],
        createdAt: { $gte: startDate, $lte: endDate }
      }).catch(() => 0),

      Message.countDocuments({
        tenentId,
        messageType: 'template',
        createdAt: { $gte: startDate, $lte: endDate }
      }).catch(() => 0),

      Message.countDocuments({
        tenentId,
        messageType: 'carousel',
        createdAt: { $gte: startDate, $lte: endDate }
      }).catch(() => 0),

      Comment.countDocuments({
        tenentId,
        createdAt: { $gte: startDate, $lte: endDate }
      }).catch(() => 0),

      // All time queries (these work)
      Order.countDocuments({
        tenentId,
        paymentStatus: 'PAID'
      }),

      Order.aggregate([
        {
          $match: {
            tenentId,
            paymentStatus: 'PAID'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]),

      // Active customers
      Order.aggregate([
          {
            $match: {
              tenentId, // Filters by tenantId
              paymentStatus: 'PAID' // Only includes paid orders
            }
          },
          {
            $group: {
              _id: '$senderId', // Group by senderId instead of customerId
              orderCount: { $sum: 1 } // Count the number of orders for each senderId
            }
          },
          {
            $match: {
              orderCount: { $gt: 1 } // Only include senders with more than 1 order
            }
          },
          {
            $count: 'activeCustomers' // Count how many senders meet the condition
          }
        ])

    ]);

    console.log('📊 BACKEND: SMART Query Results:');
    console.log('  - Robot Messages:', robotMessages);
    console.log('  - Template Messages:', templateMessages);
    console.log('  - Carousel Messages:', carouselMessages);
    console.log('  - Comment Replies:', commentReplies);
    console.log('  - All Time Orders:', allTimeOrders);
    console.log('  - All Time Revenue:', allTimeRevenue);
    console.log('  - Active Customers:', activeCustomers);

    // Use `fetchTotalOrders` function to get total orders and total order amount
    const { totalOrders, totalOrderAmount } = await fetchTotalOrders(tenentId, timeframe);

    console.log('🧮 BACKEND: Final calculated values:');
    console.log('  - Timeframe Orders:', totalOrders);
    console.log('  - Timeframe Order Amount (formatted):', totalOrderAmount);

    // Calculate totals
    const totalResponses = robotMessages + templateMessages + carouselMessages + commentReplies;
    const botMessages = totalResponses;

    // Extract values from aggregation results
    const timeframeOrderAmount = totalOrderAmount.length > 0 ? formatCurrency(totalOrderAmount[0].total) : 0.00;
    const allTimeOrderAmount = allTimeRevenue.length > 0 ? formatCurrency(allTimeRevenue[0].total) : 0.00;
    const activeCustomerCount = activeCustomers.length > 0 ? activeCustomers[0].activeCustomers : 0;

    console.log('🧮 BACKEND: Final calculated values:');
    console.log('  - Total Responses:', totalResponses);
    console.log('  - Bot Messages:', botMessages);
    console.log('  - Timeframe Orders:', totalOrders);
    console.log('  - Timeframe Order Amount (formatted):', timeframeOrderAmount);
    console.log('  - All Time Order Amount (formatted):', allTimeOrderAmount);
    console.log('  - Active Customer Count:', activeCustomerCount);

    // Prepare response data
    const responseData = {
      success: true,
      
      // Current timeframe stats
      totalResponses,
      botMessages,
      robotMessages,
      templateMessages,
      carouselMessages,
      commentReplies,
      totalOrders,
      totalOrderAmount: timeframeOrderAmount,
      loading: false,
      
      // All time statistics
      allTimeStats: {
        totalOrders: allTimeOrders,
        totalRevenue: allTimeOrderAmount,
        totalCount: allTimeOrders,
        activeCustomers: activeCustomerCount
      },

      // Additional metadata
      metadata: {
        timeframe,
        dateRange: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        },
        currency: 'INR',
        queryTimestamp: new Date().toISOString(),
        debugInfo: {
          allTimeOrdersFound: allTimeOrders,
          timeframeOrdersFound: totalOrders,
          dateFilteringWorking: totalOrders > 0 || allTimeOrders === 0
        }
      }
    };

    console.log('📤 BACKEND: Sending response data with debug info');
    return res.status(200).json(responseData);

  } catch (error) {
    console.error('❌ BACKEND ERROR: Dashboard analytics failed');
    console.error('Error Details:', error);
    console.error('Error Stack:', error.stack);

    return res.status(500).json({
      success: false,
      loading: false,
      message: 'Server error while fetching analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Simple date range function for testing
function getDateRange(timeframe) {
  const endDate = new Date();
  const startDate = new Date();

  switch (timeframe) {
    case 'today':
      startDate.setHours(0, 0, 0, 0);  // Start of the day
      endDate.setHours(23, 59, 59, 999);  // End of the day
      break;
    case 'week':
      startDate.setDate(startDate.getDate() - 6);  // One week ago
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'month':
      startDate.setMonth(startDate.getMonth() - 1);  // One month ago
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'year':
      startDate.setFullYear(startDate.getFullYear() - 1);  // One year ago
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      break;
    default:
      return getDateRange('month');
  }

  return { startDate, endDate };
}

async function fetchTotalOrders(tenentId, timeframe) {
  // Get the date range for the specified timeframe
  const { startDate, endDate } = getDateRange(timeframe);
  
  // Fetch total orders count
  const totalOrders = await smartOrderQuery(tenentId, startDate, endDate, 'count');
  console.log(`📊 Total Orders (${timeframe}): ${totalOrders}`);
  
  // Fetch total order amount
  const totalOrderAmount = await smartOrderQuery(tenentId, startDate, endDate, 'amount');
  console.log(`📊 Total Order Amount (${timeframe}): ₹${totalOrderAmount}`);

  return { totalOrders, totalOrderAmount };
}

module.exports = router;
