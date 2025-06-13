const express = require('express');
const router = express.Router();

const ecommerceCredentialsService = require('../models/ecommerceCredentialsService');

// Store credentials
router.post('/storeCredentials', async (req, res) => {
  const { websites, tenentId } = req.body;
  console.log("Store Credentials Request Data:", { tenentId, websitesCount: websites?.length });
  
  try {
    if (!tenentId || !websites || !Array.isArray(websites)) {
      throw new Error('Missing required parameters: tenentId and websites array are required');
    }

    // Validate data structure
    for (const website of websites) {
      if (!website.id || !website.type || !website.credentials) {
        throw new Error('Invalid website data structure');
      }
      
      if (website.type === 'shopify') {
        const { apiKey, apiPassword, storeUrl, websiteUrl } = website.credentials;
        if (!apiKey || !apiPassword || !storeUrl) {
          throw new Error('Missing required Shopify credentials');
        }
        
        // Validate Shopify store URL format
        const shopifyUrlRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/;
        if (!shopifyUrlRegex.test(storeUrl.replace(/^https?:\/\//, ''))) {
          throw new Error('Invalid Shopify store URL format. Expected format: your-store.myshopify.com');
        }
        
        // Website URL is optional, but if provided, validate basic URL format
        if (websiteUrl && typeof websiteUrl === 'string' && websiteUrl.trim()) {
          try {
            new URL(websiteUrl.includes('://') ? websiteUrl : `https://${websiteUrl}`);
          } catch (e) {
            throw new Error('Invalid Shopify website URL format');
          }
        }
        
        // Ensure websiteUrl is explicitly included, even if empty
        website.credentials.websiteUrl = websiteUrl || '';
      } else if (website.type === 'woocommerce') {
        const { consumerKey, consumerSecret, url } = website.credentials;
        if (!consumerKey || !consumerSecret || !url) {
          throw new Error('Missing required WooCommerce credentials');
        }
        
        // Basic URL validation for WooCommerce URL
        try {
          new URL(url.includes('://') ? url : `https://${url}`);
        } catch (e) {
          throw new Error('Invalid WooCommerce site URL format');
        }
      } else {
        throw new Error(`Invalid website type: ${website.type}`);
      }
    }

    // Save credentials using the service
    await ecommerceCredentialsService.saveCredentials(req, res);
    
  } catch (error) {
    console.error('Error saving store credentials:', error);
    console.log('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    res.status(500).json({ 
      error: 'Failed to save store credentials',
      details: error.message 
    });
  }
});

// Get credentials for display (masked sensitive info)
router.get('/credentials/:tenentId', async (req, res) => {
  try {
    await ecommerceCredentialsService.getCredentialsForDisplay(req, res);
  } catch (error) {
    console.error('Error retrieving store credentials:', error);
    res.status(500).json({
      error: 'Failed to retrieve store credentials',
      details: error.message
    });
  }
});


module.exports = router;