require("dotenv").config();

const Signup = require('../models/Signup');
const Checkoutdetails = require('../models/Checkoutdetails');
const SecurityAccessToken = require('../models/SecurityAccessToken');
const express = require('express');
const { json } = express;
const router = express.Router();

const multer = require('multer');
const cors = require('cors');

router.use(cors({
  origin: '*' // Replace with your client URL
}));

const fs = require('fs');

// Helper function to get senderId from securityAccessToken
async function getSenderIdFromToken(securityAccessToken, tenentId) {
  const tokenData = await SecurityAccessToken.findOne({
    tenentId,
    securityaccessToken: securityAccessToken
  });

  if (!tokenData) {
    throw new Error('Invalid security token');
  }

  return tokenData.senderId;
}

router.post("/save_address", express.json(), async (req, res) => {
    const { tenentId, securityAccessToken, shippingDetails } = req.body;
    
    if (!tenentId || !securityAccessToken || !shippingDetails) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    
    try {
      // Get senderId from securityAccessToken
      const senderId = await getSenderIdFromToken(securityAccessToken, tenentId);
      
      // Check if checkout details already exist for this tenentId and senderId
      let checkoutDetails = await Checkoutdetails.findOne({ 
        tenentId, 
        senderId 
      });
      
      // Prepare shipping partner data if available
      const shippingPartnerData = shippingDetails.shippingPartner ? {
        partner_id: shippingDetails.shippingPartner.id,
        partner_name: shippingDetails.shippingPartner.name,
        shipping_cost: shippingDetails.shippingPartner.cost
      } : null;
      
      if (checkoutDetails) {
        const updatedDetails = await Checkoutdetails.findOneAndUpdate(
            { tenentId, senderId }, // Filter criteria
            { 
              $set: {  // Fields to update
                name: shippingDetails.name,
                address: shippingDetails.address,
                pin_code: shippingDetails.pinCode,
                city: shippingDetails.city,
                state: shippingDetails.state,
                country: shippingDetails.country,
                phone_number: shippingDetails.phoneNumber,
                shipping_partner: shippingPartnerData // Add shipping partner data
              }
            },
            { 
              new: true, // Return the updated document
              upsert: true, // Create a new document if one doesn't exist
              runValidators: true // Run model validations
            }
          );
          
          const isNewRecord = !updatedDetails._id; // Check if this is a new record
          
          return res.status(isNewRecord ? 201 : 200).json({
            message: isNewRecord ? 
              "Address information saved successfully" : 
              "Address information updated successfully",
            data: updatedDetails
          });
      } else {
        // Create new record
        const newCheckoutDetails = new Checkoutdetails({
          tenentId,
          senderId,
          name: shippingDetails.name,
          address: shippingDetails.address,
          pin_code: shippingDetails.pinCode,
          city: shippingDetails.city,
          state: shippingDetails.state,
          country: shippingDetails.country,
          phone_number: shippingDetails.phoneNumber,
          shipping_partner: shippingPartnerData // Add shipping partner data
        });
        
        await newCheckoutDetails.save();
        
        return res.status(201).json({ 
          message: "Address information saved successfully", 
          data: newCheckoutDetails 
        });
      }
    } catch (error) {
      console.error("Error saving address information:", error);
      if (error.message === 'Invalid security token') {
        return res.status(401).json({ error: "Invalid security token" });
      }
      return res.status(500).json({ error: "Internal Server Error" });
    }
  });

// Add a route to fetch shipping methods for a specific tenant
router.get("/shipping_methods/:tenentId", express.json(), async (req, res) => {
  const { tenentId } = req.params;
  
  if (!tenentId) {
    return res.status(400).json({ error: "Missing tenant ID" });
  }
  
  try {
    // Assuming you have a ShippingMethod model to fetch from
    const ShippingMethod = require('../models/ShippingMethod');
    
    const shippingMethods = await ShippingMethod.find({ 
      tenentId, 
      isActive: true 
    });
    
    return res.status(200).json({
      message: "Shipping methods retrieved successfully",
      methods: shippingMethods
    });
  } catch (error) {
    console.error("Error fetching shipping methods:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;