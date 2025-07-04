// In your dashboard route file (routes/dashboard.js)
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

// Main dashboard analytics endpoint with extensive logging
router.get('/dashboard', async (req, res) => {
  console.log('\n=== BACKEND: Dashboard API Called ===');
  console.log('Request Query Parameters:', req.query);
  console.log('Request Headers:', req.headers);
  console.log('Request Method:', req.method);
  console.log('Request URL:', req.url);
  
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
    // Get date range
    const { startDate, endDate } = getDateRange(timeframe);
    console.log(`📅 BACKEND: Date range - Start: ${startDate.toISOString()}, End: ${endDate.toISOString()}`);

    console.log('🔍 BACKEND: Starting database queries...');

    // Get all analytics data in parallel
    const [
      robotMessages,
      templateMessages,
      carouselMessages,
      commentReplies,
      totalOrders,
      totalOrderAmount,
      allTimeOrders,
      allTimeRevenue,
      activeCustomers,
      dailyStats
    ] = await Promise.all([
      // Robot messages
      Message.countDocuments({
        tenentId,
        $or: [
          { message: { $regex: '🤖' } },
          { response: { $regex: '🤖' } },
          { messageType: 'robot' }
        ],
        createdAt: { $gte: startDate, $lte: endDate }
      }),

      // Template messages
      Message.countDocuments({
        tenentId,
        messageType: 'template',
        createdAt: { $gte: startDate, $lte: endDate }
      }),

      // Carousel messages
      Message.countDocuments({
        tenentId,
        messageType: 'carousel',
        createdAt: { $gte: startDate, $lte: endDate }
      }),

      // Comment replies
      Comment.countDocuments({
        tenentId,
        createdAt: { $gte: startDate, $lte: endDate }
      }),

      // Total orders in timeframe
      Order.countDocuments({
        tenentId,
        paymentStatus: 'PAID',
        createdAt: { $gte: startDate, $lte: endDate }
      }),

      // Total order amount in timeframe
      Order.aggregate([
        {
          $match: {
            tenentId,
            paymentStatus: 'PAID',
            createdAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]),

      // All time orders
      Order.countDocuments({
        tenentId,
        paymentStatus: 'PAID'
      }),

      // All time revenue
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
            tenentId,
            paymentStatus: 'PAID'
          }
        },
        {
          $group: {
            _id: '$customerId',
            orderCount: { $sum: 1 }
          }
        },
        {
          $match: {
            orderCount: { $gt: 1 }
          }
        },
        {
          $count: 'activeCustomers'
        }
      ]),

      // Historical data for charts
      getHistoricalData(tenentId, timeframe)
    ]);

    console.log('📊 BACKEND: Database query results:');
    console.log('  - Robot Messages:', robotMessages);
    console.log('  - Template Messages:', templateMessages);
    console.log('  - Carousel Messages:', carouselMessages);
    console.log('  - Comment Replies:', commentReplies);
    console.log('  - Total Orders:', totalOrders);
    console.log('  - Total Order Amount (raw):', totalOrderAmount);
    console.log('  - All Time Orders:', allTimeOrders);
    console.log('  - All Time Revenue (raw):', allTimeRevenue);
    console.log('  - Active Customers (raw):', activeCustomers);
    console.log('  - Daily Stats Length:', dailyStats?.length || 0);

    // Calculate totals
    const totalResponses = robotMessages + templateMessages + carouselMessages + commentReplies;
    const botMessages = totalResponses;

    // Extract values from aggregation results
    const timeframeOrderAmount = totalOrderAmount.length > 0 ? formatCurrency(totalOrderAmount[0].total) : 0.00;
    const allTimeOrderAmount = allTimeRevenue.length > 0 ? formatCurrency(allTimeRevenue[0].total) : 0.00;
    const activeCustomerCount = activeCustomers.length > 0 ? activeCustomers[0].activeCustomers : 0;

    console.log('🧮 BACKEND: Calculated values:');
    console.log('  - Total Responses:', totalResponses);
    console.log('  - Bot Messages:', botMessages);
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

      // Chart data
      chartData: {
        dailyStats
      },

      // Additional metadata
      metadata: {
        timeframe,
        dateRange: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        },
        currency: 'INR',
        queryTimestamp: new Date().toISOString()
      }
    };

    console.log('📤 BACKEND: Sending response data:');
    console.log('  - Success:', responseData.success);
    console.log('  - Total Responses:', responseData.totalResponses);
    console.log('  - All Time Stats:', responseData.allTimeStats);
    console.log('  - Chart Data Length:', responseData.chartData.dailyStats.length);
    console.log('  - Full Response Data:', JSON.stringify(responseData, null, 2));

    return res.status(200).json(responseData);

  } catch (error) {
    console.error('❌ BACKEND ERROR: Dashboard analytics failed');
    console.error('Error Details:', error);
    console.error('Error Stack:', error.stack);

    const errorResponse = {
      success: false,
      loading: false,
      message: 'Server error while fetching analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      totalResponses: 0,
      botMessages: 0,
      robotMessages: 0,
      templateMessages: 0,
      carouselMessages: 0,
      commentReplies: 0,
      totalOrders: 0,
      totalOrderAmount: 0.00,
      allTimeStats: {
        totalOrders: 0,
        totalRevenue: 0.00,
        totalCount: 0,
        activeCustomers: 0
      },
      chartData: {
        dailyStats: generateFallbackData(req.query.timeframe || 'month')
      }
    };

    console.log('📤 BACKEND: Sending error response:', JSON.stringify(errorResponse, null, 2));
    return res.status(500).json(errorResponse);
  }
});

// Enhanced getHistoricalData function with logging
async function getHistoricalData(tenentId, timeframe) {
  console.log(`📈 BACKEND: Getting historical data for ${tenentId}, timeframe: ${timeframe}`);
  
  try {
    const { dateRanges, dateLabels } = getDateRangesForTimeframe(timeframe);
    console.log(`📅 BACKEND: Generated ${dateRanges.length} date ranges for timeframe ${timeframe}`);
    console.log('📅 BACKEND: Date labels:', dateLabels);

    const historicalData = await Promise.all(
      dateRanges.map(async (range, index) => {
        console.log(`🔍 BACKEND: Querying data for range ${index + 1}: ${range.start.toISOString()} to ${range.end.toISOString()}`);
        
        const [robotCount, templateCount, carouselCount, commentCount, orderData] = await Promise.all([
          // Robot messages
          Message.countDocuments({
            tenentId,
            $or: [
              { message: { $regex: '🤖' } },
              { response: { $regex: '🤖' } },
              { messageType: 'robot' }
            ],
            createdAt: { $gte: range.start, $lte: range.end }
          }),

          // Template messages
          Message.countDocuments({
            tenentId,
            messageType: 'template',
            createdAt: { $gte: range.start, $lte: range.end }
          }),

          // Carousel messages
          Message.countDocuments({
            tenentId,
            messageType: 'carousel',
            createdAt: { $gte: range.start, $lte: range.end }
          }),

          // Comment replies
          Comment.countDocuments({
            tenentId,
            createdAt: { $gte: range.start, $lte: range.end }
          }),

          // Orders data
          Order.aggregate([
            {
              $match: {
                tenentId,
                paymentStatus: 'PAID',
                status: { $in: ['completed', 'processing', 'shipped','holded', 'delivered','COMPLETED','PACKED','PRINTED','PROCESSING','SHIPPED','HOLDED'] },
                createdAt: { $gte: range.start, $lte: range.end }
              }
            },
            {
              $group: {
                _id: null,
                orders: { $sum: 1 },
                orderAmount: { $sum: '$amount' }
              }
            }
          ])
        ]);

        const orderInfo = orderData.length > 0 ? orderData[0] : { orders: 0, orderAmount: 0 };
        
        const dataPoint = {
          date: dateLabels[index],
          robotMessages: robotCount,
          templateMessages: templateCount,
          carouselMessages: carouselCount,
          commentReplies: commentCount,
          orders: orderInfo.orders,
          orderAmount: formatCurrency(orderInfo.orderAmount),
          totalMessages: robotCount + templateCount + carouselCount + commentCount
        };

        console.log(`📊 BACKEND: Data point ${index + 1} (${dateLabels[index]}):`, dataPoint);
        return dataPoint;
      })
    );

    console.log('✅ BACKEND: Historical data collection complete');
    console.log('📊 BACKEND: Final historical data:', JSON.stringify(historicalData, null, 2));
    return historicalData;

  } catch (error) {
    console.error('❌ BACKEND ERROR: Failed to get historical data:', error);
    const fallbackData = generateFallbackData(timeframe);
    console.log('📤 BACKEND: Returning fallback data:', fallbackData);
    return fallbackData;
  }
}

// Add logging to other helper functions
function getDateRange(timeframe) {
  console.log(`📅 BACKEND: Calculating date range for timeframe: ${timeframe}`);
  
  const endDate = new Date();
  const startDate = new Date();

  endDate.setHours(23, 59, 59, 999);
  
  switch (timeframe) {
    case 'week':
      startDate.setDate(startDate.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'month':
      startDate.setDate(startDate.getDate() - 29);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'year':
      startDate.setFullYear(startDate.getFullYear() - 1);
      startDate.setHours(0, 0, 0, 0);
      break;
    default:
      startDate.setDate(startDate.getDate() - 29);
      startDate.setHours(0, 0, 0, 0);
  }

  console.log(`📅 BACKEND: Date range calculated - Start: ${startDate.toISOString()}, End: ${endDate.toISOString()}`);
  return { startDate, endDate };
}

function getDateRangesForTimeframe(timeframe) {
  console.log(`📅 BACKEND: Generating date ranges for timeframe: ${timeframe}`);
  
  const now = new Date();
  let dateRanges = [];
  let dateLabels = [];

  switch (timeframe) {
    case 'week':
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);
        dateRanges.push({ start, end });
        
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        dateLabels.push(dayNames[date.getDay()]);
      }
      break;

    case 'month':
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now);
        date.setMonth(date.getMonth() - i);
        const start = new Date(date.getFullYear(), date.getMonth(), 1);
        const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
        dateRanges.push({ start, end });
        
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        dateLabels.push(monthNames[date.getMonth()]);
      }
      break;

    case 'year':
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const currentQuarter = Math.floor(currentMonth / 3);
      
      for (let i = 5; i >= 0; i--) {
        const quarterOffset = currentQuarter - i;
        let year = currentYear;
        let quarter = quarterOffset;
        
        while (quarter < 0) {
          quarter += 4;
          year -= 1;
        }
        while (quarter >= 4) {
          quarter -= 4;
          year += 1;
        }
        
        const startMonth = quarter * 3;
        const start = new Date(year, startMonth, 1);
        const end = new Date(year, startMonth + 3, 0, 23, 59, 59, 999);
        dateRanges.push({ start, end });
        dateLabels.push(`${year} Q${quarter + 1}`);
      }
      break;

    default:
      return getDateRangesForTimeframe('month');
  }

  console.log(`📅 BACKEND: Generated ${dateRanges.length} date ranges`);
  console.log('📅 BACKEND: Date labels:', dateLabels);
  return { dateRanges, dateLabels };
}

function generateFallbackData(timeframe) {
  console.log(`📋 BACKEND: Generating fallback data for timeframe: ${timeframe}`);
  
  let fallbackData;
  switch (timeframe) {
    case 'week':
      fallbackData = [
        { date: "Sun", robotMessages: 0, templateMessages: 0, carouselMessages: 0, commentReplies: 0, orders: 0, orderAmount: 0.00, totalMessages: 0 },
        { date: "Mon", robotMessages: 0, templateMessages: 0, carouselMessages: 0, commentReplies: 0, orders: 0, orderAmount: 0.00, totalMessages: 0 },
        { date: "Tue", robotMessages: 0, templateMessages: 0, carouselMessages: 0, commentReplies: 0, orders: 0, orderAmount: 0.00, totalMessages: 0 },
        { date: "Wed", robotMessages: 0, templateMessages: 0, carouselMessages: 0, commentReplies: 0, orders: 0, orderAmount: 0.00, totalMessages: 0 },
        { date: "Thu", robotMessages: 0, templateMessages: 0, carouselMessages: 0, commentReplies: 0, orders: 0, orderAmount: 0.00, totalMessages: 0 },
        { date: "Fri", robotMessages: 0, templateMessages: 0, carouselMessages: 0, commentReplies: 0, orders: 0, orderAmount: 0.00, totalMessages: 0 },
        { date: "Sat", robotMessages: 0, templateMessages: 0, carouselMessages: 0, commentReplies: 0, orders: 0, orderAmount: 0.00, totalMessages: 0 }
      ];
      break;
    case 'month':
      fallbackData = [
        { date: "Jan", robotMessages: 0, templateMessages: 0, carouselMessages: 0, commentReplies: 0, orders: 0, orderAmount: 0.00, totalMessages: 0 },
        { date: "Feb", robotMessages: 0, templateMessages: 0, carouselMessages: 0, commentReplies: 0, orders: 0, orderAmount: 0.00, totalMessages: 0 },
        { date: "Mar", robotMessages: 0, templateMessages: 0, carouselMessages: 0, commentReplies: 0, orders: 0, orderAmount: 0.00, totalMessages: 0 },
        { date: "Apr", robotMessages: 0, templateMessages: 0, carouselMessages: 0, commentReplies: 0, orders: 0, orderAmount: 0.00, totalMessages: 0 },
        { date: "May", robotMessages: 0, templateMessages: 0, carouselMessages: 0, commentReplies: 0, orders: 0, orderAmount: 0.00, totalMessages: 0 },
        { date: "Jun", robotMessages: 0, templateMessages: 0, carouselMessages: 0, commentReplies: 0, orders: 0, orderAmount: 0.00, totalMessages: 0 }
      ];
      break;
    case 'year':
      fallbackData = [
        { date: "2023 Q1", robotMessages: 0, templateMessages: 0, carouselMessages: 0, commentReplies: 0, orders: 0, orderAmount: 0.00, totalMessages: 0 },
        { date: "2023 Q2", robotMessages: 0, templateMessages: 0, carouselMessages: 0, commentReplies: 0, orders: 0, orderAmount: 0.00, totalMessages: 0 },
        { date: "2023 Q3", robotMessages: 0, templateMessages: 0, carouselMessages: 0, commentReplies: 0, orders: 0, orderAmount: 0.00, totalMessages: 0 },
        { date: "2023 Q4", robotMessages: 0, templateMessages: 0, carouselMessages: 0, commentReplies: 0, orders: 0, orderAmount: 0.00, totalMessages: 0 },
        { date: "2024 Q1", robotMessages: 0, templateMessages: 0, carouselMessages: 0, commentReplies: 0, orders: 0, orderAmount: 0.00, totalMessages: 0 },
        { date: "2024 Q2", robotMessages: 0, templateMessages: 0, carouselMessages: 0, commentReplies: 0, orders: 0, orderAmount: 0.00, totalMessages: 0 }
      ];
      break;
    default:
      return generateFallbackData('month');
  }
  
  console.log('📋 BACKEND: Fallback data generated:', fallbackData);
  return fallbackData;
}

module.exports = router;