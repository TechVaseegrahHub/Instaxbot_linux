const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const FromAddress = require('../models/FromAddress');
const Template = require('../models/PrintingTemplate');
const puppeteer = require('puppeteer');
const axios = require('axios');

// Instagram messaging function
async function sendInstagramMessage(igId, userAccessToken, recipientId, messageText1) {
  const url = `https://graph.instagram.com/v21.0/${igId}/messages`;
  const messageTextWithEmoji = " 🤖:" + messageText1;
  const data = {
    recipient: { id: recipientId },
    message: { text: messageTextWithEmoji }
  };

  try {
    const response = await axios.post(url, data, {
      headers: {
        'Authorization': `Bearer ${userAccessToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('Instagram message sent successfully', response.data);
    return { success: true, message: messageTextWithEmoji };
    
  } catch (error) {
    console.error('Instagram message sending failed:', {
      error: error.response?.data || error.message,
      status: error.response?.status,
      recipientId: recipientId
    });
    
    throw new Error(`Instagram message failed: ${error.response?.data?.error?.message || error.message}`);
  }
}

// Helper function to send Instagram notification after printing
async function sendPrintNotification(order, tenentId) {
  try {
    // Check if order has Instagram details
    if (!order.instagram_id || !order.instagram_access_token || !order.instagram_recipient_id) {
      console.log(`No Instagram details found for order ${order.orderId || order.bill_no}`);
      return { success: false, message: 'No Instagram details' };
    }

    const messageText = `Your order ${order.orderId || order.bill_no} has been printed and is being processed for shipping. Thank you for your purchase!`;
    
    const result = await sendInstagramMessage(
      order.instagram_id,
      order.instagram_access_token,
      order.instagram_recipient_id,
      messageText
    );

    console.log(`Instagram notification sent for order ${order.orderId || order.bill_no}`);
    return result;
    
  } catch (error) {
    console.error(`Failed to send Instagram notification for order ${order.orderId || order.bill_no}:`, error);
    return { success: false, error: error.message };
  }
}

// GET endpoint to fetch a "from address"
router.get('/from-address', async (req, res) => {
  try {
    const tenentId = req.tenentId || req.headers['tenent-id'];
    console.log(`Fetching from address for tenant: ${tenentId}`);

    if (!tenentId) {
      console.log('No tenant ID provided');
      return res.status(400).json({
        success: false,
        message: 'Tenant ID is required'
      });
    }

    // Find the most recent address for this tenant
    const address = await FromAddress.findOne({ tenent_id: tenentId })
      .sort({ createdAt: -1 });

    if (!address) {
      console.log(`No address found for tenant: ${tenentId}`);
      return res.status(404).json({
        success: false,
        message: 'No address found for this tenant'
      });
    }

    console.log(`Address found for tenant: ${tenentId}`);
    res.status(200).json({
      success: true,
      data: address
    });
  } catch (error) {
    console.error('Error fetching from address:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error fetching address'
    });
  }
});

// POST endpoint to save a "from address"
router.post('/from-address', async (req, res) => {
  try {
    const addressData = req.body;
    const tenentId = req.tenentId || req.headers['tenent-id'] || addressData.tenent_id;

    if (!tenentId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID is required'
      });
    }

    // Ensure tenent_id is set
    addressData.tenent_id = tenentId;

    // Create a new address
    const newAddress = new FromAddress(addressData);
    await newAddress.save();

    console.log(`New address saved for tenant: ${tenentId}`);
    res.status(201).json({
      success: true,
      message: 'Address saved successfully',
      data: newAddress
    });
  } catch (error) {
    console.error('Error saving from address:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error saving address'
    });
  }
});

router.post('/initialize-templates', async (req, res) => {
  try {
    const tenentId = req.tenentId || req.headers['tenent-id'] || req.body.tenent_id;

    if (!tenentId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID is required'
      });
    }

    // Check if tenant already has templates
    const existingTemplates = await Template.find({ tenent_id: tenentId });
    
    if (existingTemplates.length > 0) {
      return res.status(200).json({
        success: true,
        message: 'Templates already exist for this tenant',
        count: existingTemplates.length
      });
    }

    // Create default templates
    await Template.createDefaultTemplates(tenentId);
    
    // Get the newly created templates
    const templates = await Template.find({ tenent_id: tenentId });
    
    res.status(201).json({
      success: true,
      message: 'Default templates created successfully',
      count: templates.length
    });
  } catch (error) {
    console.error('Error initializing templates:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error initializing templates'
    });
  }
});

// GET endpoint to retrieve a single bill by ID
router.get('/print-bill/:billId', async (req, res) => {
  try {
    const { billId } = req.params;
    const tenentId = req.tenentId || req.headers['tenent-id'];
    console.log(`Fetching bill ${billId} for tenant: ${tenentId}`);

    if (!billId) {
      return res.status(400).json({ error: 'Bill ID is required' });
    }

    // This is causing the error - we need to modify the query to avoid casting to ObjectId
    let query = {
      tenentId: tenentId
    };

    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(billId);

    const orConditions = [
      { orderId: billId },
      { bill_no: billId }
    ];

    if (isValidObjectId) {
      orConditions.push({ _id: billId });
    }

    query.$or = orConditions;

    console.log('Query:', JSON.stringify(query, null, 2));

    // Find the order with the fixed query
    const order = await Order.findOne(query);

    if (!order) {
      console.log(`Bill ${billId} not found for tenant: ${tenentId}`);
      return res.status(404).json({ error: 'Bill not found' });
    }

    console.log(`Bill ${billId} found for tenant: ${tenentId}, ID: ${order._id}`);

    const fromAddress = await getOrganizationAddress(tenentId);
    const formattedBill = formatOrderForPrinting(order, fromAddress);

    // ✅ UPDATE: Update both print_status and status to 'PRINTED'
    await Order.updateOne(
      { _id: order._id },
      { $set: { 
        print_status: 'PRINTED', 
        status: 'PRINTED',
        last_printed_at: new Date() 
      } }
    );
    console.log(`Bill ${billId} marked as printed with status updated`);

    // Send Instagram notification
    const instagramResult = await sendPrintNotification(order, tenentId);
    if (instagramResult.success) {
      console.log(`Instagram notification sent for bill ${billId}`);
    }

    res.status(200).json(formattedBill);
  } catch (error) {
    console.error('Error fetching bill for printing:', error);
    res.status(500).json({ error: 'Server error fetching bill details' });
  }
});

// GET endpoint for bulk printing - retrieves all unprinted orders
router.get('/bulkPrinting', async (req, res) => {
  try {
    const tenentId = req.tenentId || req.headers['tenent-id'];
    const limit = parseInt(req.query.limit) || 50; // Default to max 50 orders at once

    console.log(`Fetching pending orders for bulk printing. Tenant: ${tenentId}, Limit: ${limit}`);

    // ✅ UPDATE: Include 'PACKED' status in the query
    const pendingOrders = await Order.find({
      tenentId: tenentId,
      print_status: 'PENDING',
      status: { $in: ['paid', 'shipped', 'processing', 'PACKED'] }
    }).limit(limit).sort({ created_at: 1 });

    console.log(`Found ${pendingOrders.length} pending orders for tenant: ${tenentId}`);

    if (pendingOrders.length === 0) {
      return res.status(200).json({
        bills: [],
        message: "No pending orders found to print"
      });
    }

    const fromAddress = await getOrganizationAddress(tenentId);

    const formattedBills = pendingOrders.map(order => formatOrderForPrinting(order, fromAddress));

    const orderIds = pendingOrders.map(order => order._id);
    
    // ✅ UPDATE: Update both print_status and status to 'PRINTED'
    await Order.updateMany(
      { _id: { $in: orderIds } },
      { $set: { 
        print_status: 'PRINTED', 
        status: 'PRINTED',
        last_printed_at: new Date() 
      } }
    );
    console.log(`Marked ${orderIds.length} orders as printed with status updated`);

    // Send Instagram notifications for bulk printed orders
    let instagramResults = [];
    for (const order of pendingOrders) {
      try {
        const instagramResult = await sendPrintNotification(order, tenentId);
        instagramResults.push({
          orderId: order.orderId || order.bill_no,
          instagram: instagramResult
        });
      } catch (error) {
        console.error(`Failed to send Instagram notification for order ${order.orderId || order.bill_no}:`, error);
        instagramResults.push({
          orderId: order.orderId || order.bill_no,
          instagram: { success: false, error: error.message }
        });
      }
    }

    const successfulNotifications = instagramResults.filter(r => r.instagram.success).length;
    console.log(`Instagram notifications sent for ${successfulNotifications}/${pendingOrders.length} orders`);

    const remaining = await getRemainingPendingCount(tenentId);
    console.log(`Remaining pending orders: ${remaining}`);

    res.status(200).json({
      bills: formattedBills,
      total: pendingOrders.length,
      remaining: remaining,
      notifications: {
        sent: successfulNotifications,
        failed: pendingOrders.length - successfulNotifications,
        details: instagramResults
      }
    });
  } catch (error) {
    console.error('Error fetching bills for bulk printing:', error);
    res.status(500).json({ error: 'Server error fetching bills for printing' });
  }
});

// Helper function to get remaining pending order count
async function getRemainingPendingCount(tenentId) {
  try {
    // ✅ UPDATE: Include 'PACKED' status in the query
    const count = await Order.countDocuments({
      tenentId: tenentId,
      print_status: 'PENDING',
      status: { $in: ['paid', 'shipped', 'processing', 'PACKED'] }
    });
    console.log(`Counted ${count} remaining pending orders for tenant: ${tenentId}`);
    return count;
  } catch (error) {
    console.error('Error counting remaining pending orders:', error);
    return 0;
  }
}

// Helper function to get organization address
async function getOrganizationAddress(tenentId) {
  try {
    console.log(`Fetching organization address for tenant: ${tenentId}`);
    const address = await FromAddress.findOne({ tenent_id: tenentId })
      .sort({ _id: -1 });

    if (!address) {
      console.log(`No organization address found for tenant: ${tenentId}, using default`);
      return {
        shopName: 'Your Business',
        street: 'Main Street',
        district: 'District',
        state: 'State',
        pincode: '123456',
        phone: '1234567890'
      };
    }

    console.log(`Organization address found for tenant: ${tenentId}`);
    return {
      shopName: address.name,
      street: address.street,
      district: address.city,
      state: address.state,
      pincode: address.zipCode,
      phone: address.phone
    };
  } catch (error) {
    console.error('Error fetching organization address:', error);
    return {
      shopName: 'Your Business',
      street: 'Main Street',
      district: 'District',
      state: 'State',
      pincode: '123456',
      phone: '1234567890'
    };
  }
}

// Helper function to format order data for printing
function formatOrderForPrinting(order, orgAddress) {
  let addressObj = {};
  try {
    if (typeof order.address === 'string' && order.address.startsWith('{')) {
      addressObj = JSON.parse(order.address);
    } else {
      addressObj = {
        street: order.address,
        city: order.city,
        state: order.state,
        pincode: order.zip_code,
      };
    }
  } catch (e) {
    console.error('Error parsing address:', e);
    addressObj = {
      street: order.address,
      city: order.city,
      state: order.state,
      pincode: order.zip_code,
    };
  }

  const productCount = order.products.reduce((sum, product) => sum + (product.quantity || 1), 0);
  const totalWeight = calculateOrderWeight(order.products);

  // Create a product list showing quantity and number of specific products
  const productDetails = order.products.map(product => ({
    productName: product.product_name,
    quantity: product.quantity || 1,
    productCount: order.products.filter(p => p.product_name === product.product_name).length
  }));

  return {
    bill_id: order.orderId || order.bill_no,
    customer_details: {
      name: order.customer_name,
      flat_no: addressObj.flat_no || '',
      street: addressObj.street || order.address || '',
      district: addressObj.district || order.city || '',
      state: addressObj.state || order.state || '',
      pincode: addressObj.pincode || order.zip_code || '',
      phone: order.phone_number
    },
    organisation_details: orgAddress,
    bill_details: {
      bill_no: order.orderId || order.bill_no,
      date: new Date(order.created_at).toLocaleDateString(),
      time: new Date(order.created_at).toLocaleTimeString(),
      payment_method: order.payment_method || 'Online',
      payment_status: order.payment_status || (order.status === 'paid' ? 'Paid' : 'Pending')
    },
    product_details: productDetails,
    shipping_details: {
      method_name: order.shipping_partner || 'Standard Shipping',
      tracking_id: order.tracking_id || '',
      weight: totalWeight,
      item_count: productCount
    }
  };
}

// Helper function to calculate order weight
function calculateOrderWeight(products) {
  if (!products || products.length === 0) return '0.5 kg';

  const totalWeight = products.reduce((sum, product) => {
    if (product.weight) {
      const weightMatch = /(\d+(\.\d+)?)\s*(g|kg|gm)?/i.exec(product.weight);
      if (weightMatch) {
        const value = parseFloat(weightMatch[1]);
        const unit = (weightMatch[3] || 'g').toLowerCase();
        const grams = unit === 'kg' ? value * 1000 : value;
        return sum + (grams * (product.quantity || 1));
      }
    }
    return sum + (100 * (product.quantity || 1));
  }, 0);

  if (totalWeight >= 1000) {
    return `${(totalWeight / 1000).toFixed(2)} kg`;
  } else {
    return `${totalWeight.toFixed(0)} g`;
  }
}

// PUT endpoint to update print status
router.put('/update-print-status/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { print_status } = req.body;
    const tenentId = req.tenentId || req.headers['tenent-id'];

    console.log(`Updating print status for order ${orderId}, tenant: ${tenentId}, status: ${print_status}`);

    if (!orderId || !print_status) {
      return res.status(400).json({ error: 'Order ID and print status are required' });
    }

    const validStatuses = ['PENDING', 'PRINTED', 'FAILED'];
    if (!validStatuses.includes(print_status)) {
      return res.status(400).json({ error: 'Invalid print status' });
    }

    let query = {
      tenentId: tenentId
    };

    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(orderId);

    const orConditions = [
      { orderId: orderId },
      { bill_no: orderId }
    ];

    if (isValidObjectId) {
      orConditions.push({ _id: orderId });
    }

    query.$or = orConditions;

    // Get the order before updating
    const order = await Order.findOne(query);

    // ✅ UPDATE: Update both print_status and status
    const updateObj = {
      $set: {
        print_status,
        status: print_status, // Update main status to match print_status
        ...(print_status === 'PRINTED' ? { last_printed_at: new Date() } : {})
      }
    };

    const result = await Order.updateOne(query, updateObj);

    if (result.matchedCount === 0) {
      console.log(`Order ${orderId} not found for tenant: ${tenentId}`);
      return res.status(404).json({ error: 'Order not found' });
    }

    console.log(`Print status and main status updated successfully for order ${orderId}. Modified: ${result.modifiedCount}`);

    // Send Instagram notification if status is PRINTED
    if (print_status === 'PRINTED' && order) {
      const instagramResult = await sendPrintNotification(order, tenentId);
      if (instagramResult.success) {
        console.log(`Instagram notification sent for order ${orderId}`);
      }
    }

    const remaining = await getRemainingPendingCount(tenentId);

    res.status(200).json({
      message: 'Print status updated successfully',
      remaining: remaining
    });
  } catch (error) {
    console.error('Error updating print status:', error);
    res.status(500).json({ error: 'Server error updating print status' });
  }
});

// GET endpoint to fetch pending print count
router.get('/pending-count', async (req, res) => {
  try {
    const tenentId = req.tenentId || req.headers['tenent-id'];
    console.log(`Fetching pending print count for tenant: ${tenentId}`);

    if (!tenentId) {
      console.log('No tenant ID provided');
      return res.status(400).json({
        count: 0,
        error: 'Tenant ID is required'
      });
    }

    const totalOrders = await Order.countDocuments({
      tenentId: tenentId
    });

    console.log(`Total orders found for tenant ${tenentId}: ${totalOrders}`);

    // ✅ UPDATE: Include 'PACKED' status in the query
    const count = await Order.countDocuments({
      tenentId: tenentId,
      print_status: 'PENDING',
      status: { $in: ['paid', 'shipped', 'processing', 'PACKED'] }
    });

    console.log(`Pending print count for tenant ${tenentId}: ${count} (out of ${totalOrders} total orders)`);

    const printedCount = await Order.countDocuments({
      tenentId: tenentId,
      print_status: 'PRINTED'
    });

    const failedCount = await Order.countDocuments({
      tenentId: tenentId,
      print_status: 'FAILED'
    });

    const nullCount = await Order.countDocuments({
      tenentId: tenentId,
      print_status: null
    });

    console.log(`Other print statuses: PRINTED=${printedCount}, FAILED=${failedCount}, NULL=${nullCount}`);

    res.status(200).json({
      count,
      debug: {
        total: totalOrders,
        printed: printedCount,
        failed: failedCount,
        null: nullCount
      }
    });
  } catch (error) {
    console.error('Error counting pending prints:', error);
    res.status(500).json({ error: 'Server error counting pending prints', count: 0 });
  }
});

// Helper function to update order print status (used by PDF generation)
async function updateOrderPrintStatus(billId, tenentId) {
  try {
    // Get the order first
    const order = await Order.findOne({
      $or: [
        { orderId: billId },
        { bill_no: billId },
        { _id: /^[0-9a-fA-F]{24}$/.test(billId) ? billId : null }
      ].filter(Boolean),
      tenentId: tenentId 
    });

    // ✅ UPDATE: Update both print_status and status to 'PRINTED'
    await Order.updateOne(
      { 
        $or: [
          { orderId: billId },
          { bill_no: billId },
          { _id: /^[0-9a-fA-F]{24}$/.test(billId) ? billId : null }
        ].filter(Boolean),
        tenentId: tenentId 
      },
      { 
        $set: { 
          print_status: 'PRINTED',
          status: 'PRINTED',
          last_printed_at: new Date() 
        } 
      }
    );
    console.log(`Order ${billId} print status and main status updated to PRINTED`);

    // Send Instagram notification
    if (order) {
      const instagramResult = await sendPrintNotification(order, tenentId);
      if (instagramResult.success) {
        console.log(`Instagram notification sent for order ${billId}`);
      }
    }
  } catch (error) {
    console.error('Error updating order print status:', error);
  }
}

router.post('/generate-pdf', async (req, res) => {
  try {
    const { html, templateId, billId } = req.body;
    const tenentId = req.headers['tenent-id'];
    
    // Get template dimensions based on templateId
    const templateDimensions = getTemplateDimensions(templateId);
    
    // Launch a browser instance
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    // Set the page size based on the template
    await page.setViewport({
      width: templateDimensions.width,
      height: templateDimensions.height,
      deviceScaleFactor: 2 // for higher quality
    });
    
    // Set the content
    await page.setContent(html);
    
    // Generate PDF
    const pdfBuffer = await page.pdf({
      width: `${templateDimensions.width / 96}in`,
      height: `${templateDimensions.height / 96}in`,
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 }
    });
    
    await browser.close();
    
    // ✅ UPDATE: Update order status if billId provided (includes Instagram notification)
    if (billId) {
      await updateOrderPrintStatus(billId, tenentId);
    }
    
    // Send the PDF as response
    res.contentType('application/pdf');
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).send({ error: 'Failed to generate PDF' });
  }
});

function getTemplateDimensions(templateId) {
  // Return dimensions based on template ID
  const templates = {
    '4x4': { width: 384, height: 384 },
    '2x4': { width: 192, height: 384 },
    '4x6': { width: 384, height: 576 },
    'a4': { width: 793, height: 1123 }
  };
  
  return templates[templateId] || templates['4x4'];
}

router.post('/generate-bulk-pdf', async (req, res) => {
  try {
    const { html, templateId } = req.body;
    const tenentId = req.headers['tenent-id'];
    
    // Launch a browser instance
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    // Set the content
    await page.setContent(html);
    
    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true
    });
    
    await browser.close();
    
    // Send the PDF as response
    res.contentType('application/pdf');
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error('Error generating bulk PDF:', error);
    res.status(500).send({ error: 'Failed to generate bulk PDF' });
  }
});

router.get('/templates', async (req, res) => {
  try {
    const tenentId = req.tenentId || req.headers['tenent-id'];
    console.log(`Fetching templates for tenant: ${tenentId}`);

    if (!tenentId) {
      console.log('No tenant ID provided');
      return res.status(400).json({
        success: false,
        message: 'Tenant ID is required'
      });
    }

    // Find all templates for this tenant
    let templates = await Template.find({ tenent_id: tenentId })
      .sort({ createdAt: -1 });

    // If no templates found, create default templates
    if (templates.length === 0) {
      console.log(`No templates found for tenant: ${tenentId}, creating defaults`);
      
      // Create default templates
      await Template.createDefaultTemplates(tenentId);
      
      // Fetch the newly created templates
      templates = await Template.find({ tenent_id: tenentId })
        .sort({ createdAt: -1 });
    }

    console.log(`Found ${templates.length} templates for tenant: ${tenentId}`);
    
    // Format templates for frontend
    const formattedTemplates = templates.map(template => ({
      id: template.templateId,
      name: template.name,
      description: template.description,
      width: template.width,
      height: template.height,
      className: template.className,
      isDefault: template.isDefault
    }));

    res.status(200).json({
      success: true,
      data: formattedTemplates
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error fetching templates'
    });
  }
});

// POST endpoint to save a template
router.post('/templates', async (req, res) => {
  try {
    const templateData = req.body;
    const tenentId = req.tenentId || req.headers['tenent-id'] || templateData.tenent_id;

    if (!tenentId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID is required'
      });
    }

    // Ensure tenent_id is set
    templateData.tenent_id = tenentId;

    // If this is marked as default, unset default for other templates
    if (templateData.isDefault) {
      await Template.updateMany(
        { tenent_id: tenentId, isDefault: true },
        { $set: { isDefault: false } }
      );
    }

    // Check if template already exists for this tenant
    const existingTemplate = await Template.findOne({
      tenent_id: tenentId,
      templateId: templateData.templateId
    });

    let savedTemplate;
    
    if (existingTemplate) {
      // Update existing template
      savedTemplate = await Template.findByIdAndUpdate(
        existingTemplate._id,
        templateData,
        { new: true }
      );
      console.log(`Updated existing template for tenant: ${tenentId}`);
    } else {
      // Create a new template
      const newTemplate = new Template(templateData);
      savedTemplate = await newTemplate.save();
      console.log(`New template saved for tenant: ${tenentId}`);
    }

    res.status(201).json({
      success: true,
      message: 'Template saved successfully',
      data: savedTemplate
    });
  } catch (error) {
    console.error('Error saving template:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error saving template'
    });
  }
});

// GET endpoint to fetch default template
router.get('/default-template', async (req, res) => {
  try {
    const tenentId = req.tenentId || req.headers['tenent-id'];
    console.log(`Fetching default template for tenant: ${tenentId}`);

    if (!tenentId) {
      console.log('No tenant ID provided');
      return res.status(400).json({
        success: false,
        message: 'Tenant ID is required'