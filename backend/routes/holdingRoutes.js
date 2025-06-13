const express = require('express');
const router = express.Router();
const axios = require('axios');
const Order = require('../models/Order');
const Hold = require('../models/Hold');
const LongToken = require('../models/LongToken'); // Add this import

// Middleware to validate tenant ID
const validateTenentId = (req, res, next) => {
  const { tenentId } = req.body;
  
  if (!tenentId) {
    return res.status(400).json({
      success: false,
      message: 'Tenant ID is required'
    });
  }
  
  next();
};

// Helper function to get Instagram credentials and recipientId for an order
async function getInstagramCredentialsForOrder(orderNumber, tenentId) {
  console.log("orderNumber",orderNumber);
  try {
    // Find the order to get the senderId
    const order = await Order.findOne({ 
      orderId: orderNumber, 
      tenentId: tenentId 
    });
    
    if (!order || !order.senderId) {
      return {
        success: false,
        error: 'Order not found or no senderId available'
      };
    }
    
    // Get the latest Instagram token for this tenant
    const latestToken = await LongToken.findOne({ tenentId: tenentId })
      .sort({ createdAt: -1 })
      .limit(1);
    
    if (!latestToken) {
      return {
        success: false,
        error: 'No Instagram token found for tenant'
      };
    }
    
    return {
      success: true,
      recipientId: order.senderId, // senderId is used as recipientId for Instagram messaging
      userAccessToken: latestToken.userAccessToken,
      igId: latestToken.Instagramid,
      customerName: order.customer_name || order.profile_name
    };
  } catch (error) {
    console.error('Error getting Instagram credentials:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Instagram message sending function with retry logic
async function sendInstagramMessage(igId, userAccessToken, recipientId, messageText1) {
  console.log("➡️ Preparing to send Instagram message");
  console.log("🔧 Parameters:", {
    igId,
    userAccessToken: userAccessToken?.substring(0, 10) + '...', // Partial token for log
    recipientId,
    messageText1
  });

  const url = `https://graph.instagram.com/v21.0/${igId}/messages`; // ❗ Still incorrect for real Instagram messaging

  const messageTextWithEmoji = "🤖 " + messageText1;
  const data = {
    recipient: { id: recipientId },
    message: { text: messageTextWithEmoji }
  };

  let retries = 3;
  let delay = 1000;

  while (retries > 0) {
    try {
      const response = await axios.post(url, data, {
        headers: {
          'Authorization': `Bearer ${userAccessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      console.log('✅ Instagram message sent successfully');
      console.log('📨 Response:', response.data);

      return {
        success: true,
        message: messageTextWithEmoji,
        response: response.data
      };

    } catch (error) {
      retries--;

      const status = error?.response?.status;
      const responseData = error?.response?.data;

      console.error('❌ Instagram message failed:', responseData || error.message);

      if (status === 429) {
        const retryAfter = error.response.headers['retry-after'] || 60;
        const waitTime = parseInt(retryAfter) * 1000 + 1000;
        console.log(`⏳ Rate limit hit, retrying after ${waitTime / 1000}s`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else if (retries > 0) {
        console.log(`🔁 Retry in ${delay / 1000}s (${3 - retries}/3)`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      } else {
        return {
          success: false,
          error: responseData || error.message,
          message: messageTextWithEmoji
        };
      }
    }
  }

  return {
    success: false,
    error: "Unhandled failure after retries",
    message: messageTextWithEmoji
  };
}

// Get order details
router.post('/details', validateTenentId, async (req, res) => {
  try {
    const { orderNumber, tenentId } = req.body;
    
    if (!orderNumber) {
      return res.status(400).json({
        success: false,
        message: 'Order number is required'
      });
    }
    
    const order = await Order.findOne({ 
      orderId: orderNumber,
      tenentId: tenentId 
    });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Return only necessary order information
    return res.status(200).json({
      success: true,
      order: {
        orderId: order.orderId,
        customerName: order.customer_name || order.profile_name,
        status: order.status,
        totalAmount: order.total_amount,
        senderId: order.senderId // Include senderId for reference
      }
    });
  } catch (error) {
    console.error('Error fetching order details:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Update holding information with automatic Instagram integration
router.post('/update-holding', validateTenentId, async (req, res) => {
  try {
    const { 
      orderNumber, 
      holdingProduct, 
      holdingResponse, 
      date, 
      tenentId,
      // Optional override parameters - if not provided, will be fetched automatically
      igId,
      userAccessToken,
      recipientId
    } = req.body;
    
    // Validate required fields
    if (!orderNumber || !holdingProduct || !holdingResponse || !date) {
      return res.status(400).json({
        success: false,
        message: 'Order number, holding product, holding response, and expected date are required'
      });
    }
    
    // Validate date format
    const expectedDate = new Date(date);
    if (isNaN(expectedDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }
    
    // Find the order first to verify it exists and get customer name
    const order = await Order.findOne({ 
      orderId: orderNumber,
      tenentId: tenentId 
    });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Check if there's already an active hold for this order and product
    const existingHold = await Hold.findOne({
      orderNumber,
      tenentId,
      holdingProduct,
      status: 'active'
    });
    
    if (existingHold) {
      return res.status(400).json({
        success: false,
        message: 'An active hold already exists for this product on this order'
      });
    }
    
    // Update order's holding status
    await Order.updateOne(
      { orderId: orderNumber, tenentId: tenentId },
      { 
        status: 'HOLDING',
        holding_status: 'ON_HOLD',
        is_on_hold: true,
        updated_at: new Date()
      }
    );
    
    // Create new hold record with holding response
    const newHold = new Hold({
      orderNumber,
      tenentId,
      holdingProduct,
      holdingResponse,
      expectedDate: expectedDate,
      customerName: order.customer_name || order.profile_name,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // Save the hold to MongoDB
    await newHold.save();
    console.log('Hold data saved successfully to MongoDB');
    
    // Prepare response object
    let responseData = {
      success: true,
      message: 'Order has been placed on hold successfully',
      holdId: newHold._id,
      instagramStatus: null
    };
    
    // Get Instagram credentials if not provided
    let instagramCredentials = null;
    if (!igId || !userAccessToken || !recipientId) {
      instagramCredentials = await getInstagramCredentialsForOrder(orderNumber, tenentId);
      console.log("instagramCredentials",instagramCredentials);
      if (!instagramCredentials.success) {
        responseData.instagramStatus = {
          sent: false,
          error: instagramCredentials.error,
          message: 'Could not retrieve Instagram credentials - notification not sent'
        };
        return res.status(200).json(responseData);
      }
    }
    
    // Use provided credentials or fetched ones
    const finalIgId = igId || instagramCredentials?.igId;
    const finalUserAccessToken = userAccessToken || instagramCredentials?.userAccessToken;
    const finalRecipientId = recipientId || instagramCredentials?.recipientId;
    
    // Send Instagram message
    if (finalIgId && finalUserAccessToken && finalRecipientId) {
      try {
        // Create Instagram message content
        const customerName = instagramCredentials?.customerName || order.customer_name || order.profile_name || 'Customer';
        const instagramMessage = `🔔 Order Update

Hi ${customerName},

We apologize for the delay in dispatching your order ${orderNumber} from Vaseegrahveda. Your order ${orderNumber} is currently on hold. We expect to dispatch it by ${expectedDate.toDateString()}.

Thank you for choosing us!

----- Powered by Tech Vaseegrah`;
        
        console.log('Attempting to send Instagram message...');
        const instagramResult = await sendInstagramMessage(finalIgId, finalUserAccessToken, finalRecipientId, instagramMessage);
        
        if (instagramResult.success) {
          responseData.instagramStatus = {
            sent: true,
            message: 'Instagram notification sent successfully',
            recipientId: finalRecipientId
          };
          console.log('Instagram message sent successfully');
        } else {
          responseData.instagramStatus = {
            sent: false,
            error: instagramResult.error,
            message: 'Failed to send Instagram notification, but hold was created successfully'
          };
          console.log('Instagram message failed:', instagramResult.error);
        }
      } catch (instagramError) {
        console.error('Instagram messaging error:', instagramError);
        responseData.instagramStatus = {
          sent: false,
          error: instagramError.message,
          message: 'Failed to send Instagram notification, but hold was created successfully'
        };
      }
    } else {
      responseData.instagramStatus = {
        sent: false,
        message: 'Instagram parameters not available - notification not sent'
      };
    }
    
    return res.status(200).json(responseData);
    
  } catch (error) {
    console.error('Error updating holding information:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update holding information',
      error: error.message
    });
  }
});

// Resolve a hold with automatic Instagram notification
router.post('/holds/resolve', validateTenentId, async (req, res) => {
  try {
    const { 
      holdId, 
      orderNumber, 
      tenentId,
      // Optional override parameters
      igId,
      userAccessToken,
      recipientId
    } = req.body;
    
    // Validate required fields
    if (!holdId || !orderNumber || !tenentId) {
      return res.status(400).json({
        success: false,
        message: 'Hold ID, order number, and tenant ID are required'
      });
    }
    
    // Find and update hold status
    const hold = await Hold.findOneAndUpdate(
      { 
        _id: holdId, 
        tenentId: tenentId,
        orderNumber: orderNumber 
      },
      { 
        status: 'resolved',
        updatedAt: new Date()
      },
      { new: true }
    );
    
    if (!hold) {
      return res.status(404).json({
        success: false,
        message: 'Hold not found'
      });
    }
    
    // Check if there are any other active holds for this order
    const activeHoldsCount = await Hold.countDocuments({
      orderNumber,
      tenentId,
      status: 'active'
    });
    
    // If no other active holds, update order's holding status
    if (activeHoldsCount === 0) {
      await Order.updateOne(
        { orderId: orderNumber, tenentId: tenentId },
        { 
          status: 'HOLDING',
          holding_status: 'NOT_ON_HOLD',
          is_on_hold: false,
          updated_at: new Date()
        }
      );
    }
    
    // Prepare response
    let responseData = {
      success: true,
      message: 'Hold resolved successfully',
      instagramStatus: null
    };
    
    // Get Instagram credentials if not provided
    let instagramCredentials = null;
    if (!igId || !userAccessToken || !recipientId) {
      instagramCredentials = await getInstagramCredentialsForOrder(orderNumber, tenentId);
      console.log("instagramCredentials",instagramCredentials);
      if (!instagramCredentials.success) {
        responseData.instagramStatus = {
          sent: false,
          error: instagramCredentials.error,
          message: 'Could not retrieve Instagram credentials - resolution notification not sent'
        };
        return res.status(200).json(responseData);
      }
    }
    
    // Use provided credentials or fetched ones
    const finalIgId = igId || instagramCredentials?.igId;
    const finalUserAccessToken = userAccessToken || instagramCredentials?.userAccessToken;
    const finalRecipientId = recipientId || instagramCredentials?.recipientId;
    
    // Send Instagram notification about resolution
    if (finalIgId && finalUserAccessToken && finalRecipientId) {
      try {
        const customerName = instagramCredentials?.customerName || hold.customerName || 'Customer';
        const resolutionMessage = `✅ Hold Resolved\n\nHi ${customerName},\n\nGreat news! The hold on order #${orderNumber} has been resolved.\n\n` +
          `Product: ${hold.holdingProduct}\n` +
          `Your order will now continue processing. Thank you for your patience!`;
        
        const instagramResult = await sendInstagramMessage(finalIgId, finalUserAccessToken, finalRecipientId, resolutionMessage);
        
        if (instagramResult.success) {
          responseData.instagramStatus = {
            sent: true,
            message: 'Instagram resolution notification sent successfully',
            recipientId: finalRecipientId
          };
        } else {
          responseData.instagramStatus = {
            sent: false,
            error: instagramResult.error,
            message: 'Failed to send Instagram resolution notification'
          };
        }
      } catch (instagramError) {
        console.error('Instagram resolution notification error:', instagramError);
        responseData.instagramStatus = {
          sent: false,
          error: instagramError.message,
          message: 'Failed to send Instagram resolution notification'
        };
      }
    }
    
    return res.status(200).json(responseData);
  } catch (error) {
    console.error('Error resolving hold:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to resolve hold',
      error: error.message
    });
  }
});

// New endpoint to send Instagram message to any order
router.post('/send-instagram-message', validateTenentId, async (req, res) => {
  try {
    const { orderNumber, message, tenentId } = req.body;
    
    if (!orderNumber || !message) {
      return res.status(400).json({
        success: false,
        message: 'Order number and message are required'
      });
    }
    
    // Get Instagram credentials for the order
    const instagramCredentials = await getInstagramCredentialsForOrder(orderNumber, tenentId);
    console.log("instagramCredentials",instagramCredentials);
    if (!instagramCredentials.success) {
      return res.status(400).json({
        success: false,
        message: 'Could not retrieve Instagram credentials',
        error: instagramCredentials.error
      });
    }
    
    // Send the message
    const result = await sendInstagramMessage(
      instagramCredentials.igId,
      instagramCredentials.userAccessToken,
      instagramCredentials.recipientId,
      message
    );
    
    if (result.success) {
      return res.status(200).json({
        success: true,
        message: 'Instagram message sent successfully',
        recipientId: instagramCredentials.recipientId,
        customerName: instagramCredentials.customerName
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Failed to send Instagram message',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error sending Instagram message:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get all holds for a tenant
router.post('/holds/list', validateTenentId, async (req, res) => {
  try {
    const { tenentId } = req.body;
    
    // Get holds sorted by creation date (newest first)
    const holds = await Hold.find({ tenentId }).sort({ createdAt: -1 });
    
    // Format the holds for frontend - matching the expected interface
    const formattedHolds = holds.map(hold => ({
      id: hold._id.toString(),
      orderNumber: hold.orderNumber,
      customerName: hold.customerName || 'N/A',
      holdingProduct: hold.holdingProduct,
      holdingResponse: hold.holdingResponse || '',
      expectedDate: hold.expectedDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
      status: hold.status,
      createdAt: hold.createdAt,
      updatedAt: hold.updatedAt,
      responses: hold.responses || []
    }));
    
    return res.status(200).json({
      success: true,
      holds: formattedHolds,
      total: formattedHolds.length
    });
  } catch (error) {
    console.error('Error fetching holds list:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch holds',
      error: error.message
    });
  }
});

// Add additional response to an existing hold
router.post('/holds/add-response', validateTenentId, async (req, res) => {
  try {
    const { holdId, response, tenentId } = req.body;
    
    // Validate required fields
    if (!holdId || !response || !tenentId) {
      return res.status(400).json({
        success: false,
        message: 'Hold ID, response, and tenant ID are required'
      });
    }
    
    // Find and update hold with additional response
    const hold = await Hold.findOneAndUpdate(
      { _id: holdId, tenentId: tenentId },
      { 
        $push: {
          responses: {
            message: response,
            timestamp: new Date(),
            respondedAt: new Date()
          }
        },
        updatedAt: new Date()
      },
      { new: true }
    );
    
    if (!hold) {
      return res.status(404).json({
        success: false,
        message: 'Hold not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Response added successfully',
      hold: {
        id: hold._id.toString(),
        orderNumber: hold.orderNumber,
        customerName: hold.customerName || 'N/A',
        holdingProduct: hold.holdingProduct,
        holdingResponse: hold.holdingResponse || '',
        expectedDate: hold.expectedDate.toISOString().split('T')[0],
        status: hold.status,
        responses: hold.responses || []
      }
    });
  } catch (error) {
    console.error('Error adding holding response:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to add response',
      error: error.message
    });
  }
});

// Update existing holding response
router.post('/holds/update-response', validateTenentId, async (req, res) => {
  try {
    const { holdId, holdingResponse, tenentId } = req.body;
    
    // Validate required fields
    if (!holdId || !holdingResponse || !tenentId) {
      return res.status(400).json({
        success: false,
        message: 'Hold ID, holding response, and tenant ID are required'
      });
    }
    
    // Find and update hold's main holding response
    const hold = await Hold.findOneAndUpdate(
      { _id: holdId, tenentId: tenentId },
      { 
        holdingResponse: holdingResponse,
        updatedAt: new Date()
      },
      { new: true }
    );
    
    if (!hold) {
      return res.status(404).json({
        success: false,
        message: 'Hold not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Holding response updated successfully',
      hold: {
        id: hold._id.toString(),
        orderNumber: hold.orderNumber,
        customerName: hold.customerName || 'N/A',
        holdingProduct: hold.holdingProduct,
        holdingResponse: hold.holdingResponse || '',
        expectedDate: hold.expectedDate.toISOString().split('T')[0],
        status: hold.status,
        responses: hold.responses || []
      }
    });
  } catch (error) {
    console.error('Error updating holding response:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update holding response',
      error: error.message
    });
  }
});

module.exports = router;