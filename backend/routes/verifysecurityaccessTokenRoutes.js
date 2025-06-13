require("dotenv").config();
const express = require('express');
const router = express.Router();
const SecurityAccessToken = require('../models/SecurityAccessToken'); // Adjust path as needed

/**
 * Verify securityAccessToken and return associated senderId
 * 
 * POST /api/auth/verify-token
 * Body: {
 *   tenentId: String,
 *   securityAccessToken: String
 * }
 */
router.post('/verify-token', async (req, res) => {
  try {
    const { tenentId, securityAccessToken } = req.body;
    console.log('Token verification route hit');
    console.log('Request body:', req.body);
    // Validate input
    if (!tenentId || !securityAccessToken) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required parameters' 
      });
    }
    
    // Find the token in the database
    const tokenData = await SecurityAccessToken.findOne({ 
      tenentId: tenentId,
      securityaccessToken: securityAccessToken 
    });
    
    // If token not found or invalid
    if (!tokenData) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid security token' 
      });
    }
    
    // Return the senderId associated with this token
    return res.status(200).json({ 
      success: true, 
      senderId: tokenData.senderId 
    });
    
  } catch (error) {
    console.error('Error verifying token:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error' 
    });
  }
});

module.exports = router;