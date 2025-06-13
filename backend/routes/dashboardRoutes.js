const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Comment = require('../models/Comment');

router.get('/dashboard', async (req, res) => {
  const { tenentId, timeframe = 'week' } = req.query;

  if (!tenentId) {
    return res.status(400).json({
      success: false,
      message: 'Missing tenentId'
    });
  }

  try {
    // Set date filters based on timeframe
    const startDate = new Date();
    if (timeframe === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (timeframe === 'month') {
      startDate.setDate(startDate.getDate() - 30);
    } else if (timeframe === 'year') {
      startDate.setDate(startDate.getDate() - 365);
    }

    // Query for messages containing 🤖 emoji
    const robotMessages = await Message.countDocuments({
      tenentId,
      $or: [
        { message: { $regex: '🤖' } },
        { response: { $regex: '🤖' } }
      ],
      Timestamp: { $gte: startDate }
    });

    // Query for template messages
    const templateMessages = await Message.countDocuments({
      tenentId,
      messageType: 'template',
      Timestamp: { $gte: startDate }
    });

    // Query for carousel messages
    const carouselMessages = await Message.countDocuments({
      tenentId,
      messageType: 'carousel',
      Timestamp: { $gte: startDate }
    });

    // Calculate total bot messages as sum of the three categories
    const botMessages = robotMessages + templateMessages + carouselMessages;
    
    // Query for total responses (all messages with a response)
    const totalResponses = await Message.countDocuments({
      tenentId,
      response: { $exists: true, $ne: '' },
      Timestamp: { $gte: startDate }
    });

    // Query for comment replies
    const commentReplies = await Comment.countDocuments({
      tenentId,
      Timestamp: { $gte: startDate }
    });

    // Get historical data for charts - daily aggregation
    const dailyStats = await getHistoricalData(tenentId, timeframe);

    // Return all analytics data
    return res.status(200).json({
      success: true,
      totalResponses,
      botMessages,         // Sum of all bot message types
      robotMessages,       // Messages with 🤖
      templateMessages,    // Template messages
      carouselMessages,    // Carousel messages
      commentReplies,
      chartData: {
        dailyStats
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard analytics:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching analytics'
    });
  }
});

async function getHistoricalData(tenentId, timeframe) {
  try {
    // Set date filters and interval based on timeframe
    const startDate = new Date();
    let format;
    
    if (timeframe === 'week') {
      startDate.setDate(startDate.getDate() - 7);
      format = '%Y-%m-%d';
    } else if (timeframe === 'month') {
      startDate.setDate(startDate.getDate() - 30);
      format = '%Y-%m-%d';
    } else if (timeframe === 'year') {
      startDate.setDate(startDate.getDate() - 365);
      format = '%Y-%m';
    }

    // Get message stats by day/month for robot emoji messages
    const robotStats = await Message.aggregate([
      {
        $match: {
          tenentId,
          Timestamp: { $gte: startDate },
          $or: [
            { message: { $regex: '🤖' } },
            { response: { $regex: '🤖' } }
          ]
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format, date: '$Timestamp' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ]);

    // Get message stats by day/month for template messages
    const templateStats = await Message.aggregate([
      {
        $match: {
          tenentId,
          messageType: 'template',
          Timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format, date: '$Timestamp' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ]);

    // Get message stats by day/month for carousel messages
    const carouselStats = await Message.aggregate([
      {
        $match: {
          tenentId,
          messageType: 'carousel',
          Timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format, date: '$Timestamp' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ]);

    // Get comment stats by day/month
    const commentStats = await Comment.aggregate([
      {
        $match: {
          tenentId,
          Timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format, date: '$Timestamp' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ]);

    // Get all unique dates across all datasets
    const allDates = new Set([
      ...robotStats.map(item => item._id),
      ...templateStats.map(item => item._id),
      ...carouselStats.map(item => item._id),
      ...commentStats.map(item => item._id)
    ]);

    // Create the combined stats with all dates
    const combinedStats = Array.from(allDates).sort().map(date => {
      // Find the values for each type of statistic for this date
      const robotData = robotStats.find(item => item._id === date) || { count: 0 };
      const templateData = templateStats.find(item => item._id === date) || { count: 0 };
      const carouselData = carouselStats.find(item => item._id === date) || { count: 0 };
      const commentData = commentStats.find(item => item._id === date) || { count: 0 };
      
      // Calculate total bot messages
      const totalBotMessages = robotData.count + templateData.count + carouselData.count;
      
      return {
        date,
        botMessages: totalBotMessages,
        robotMessages: robotData.count,
        templateMessages: templateData.count,
        carouselMessages: carouselData.count,
        commentReplies: commentData.count
      };
    });
    console.log("combinedStats",combinedStats);
    return combinedStats;
  } catch (error) {
    console.error('Error getting historical data:', error);
    return [];
  }
}

// Get message type breakdown 
router.get('/message-type-breakdown', async (req, res) => {
  const { tenentId, timeframe = 'week' } = req.query;

  if (!tenentId) {
    return res.status(400).json({
      success: false,
      message: 'Missing tenentId'
    });
  }

  try {
    // Set date filters based on timeframe
    const startDate = new Date();
    if (timeframe === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (timeframe === 'month') {
      startDate.setDate(startDate.getDate() - 30);
    } else if (timeframe === 'year') {
      startDate.setDate(startDate.getDate() - 365);
    }

    // Count the different message types
    const robotMessageCount = await Message.countDocuments({
      tenentId,
      $or: [
        { message: { $regex: '🤖' } },
        { response: { $regex: '🤖' } }
      ],
      Timestamp: { $gte: startDate }
    });

    const templateMessageCount = await Message.countDocuments({
      tenentId,
      messageType: 'template',
      Timestamp: { $gte: startDate }
    });

    const carouselMessageCount = await Message.countDocuments({
      tenentId,
      messageType: 'carousel',
      Timestamp: { $gte: startDate }
    });

    const data = [
      { _id: 'robot', type: 'Robot Messages 🤖', count: robotMessageCount },
      { _id: 'template', type: 'Template Messages', count: templateMessageCount },
      { _id: 'carousel', type: 'Carousel Messages', count: carouselMessageCount }
    ];

    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error fetching message type breakdown:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching message type breakdown'
    });
  }
});

module.exports = router;