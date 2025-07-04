require("dotenv").config();

const Signup = require('../models/Signup');

const express = require('express');
const { json } = express;
const router = express.Router();

const multer = require('multer');
const cors = require('cors');

router.use(cors({
  origin: '*' // Replace with your client URL
}));

const fs = require('fs');


router.get("/username", async (req, res) => {
    const { tenentId } = req.query;
    console.log("tenentId", tenentId);
  
    let username = "Nil"; // Default value for username
  
    try {
      // Find the user data based on tenentId
      const usernamedata = await Signup.findOne({ tenentId: tenentId }).sort({ createdAt: -1 }).limit(1);;
      if (usernamedata) {
        console.log("usernamedata", usernamedata);
        username = usernamedata.name; // Update username if data exists
      }
    } catch (error) {
      console.error("Error fetching username:", error);
      return res.status(500).send("Internal Server Error"); // Handle errors gracefully
    }
  
    // Send the username in the response
    res.json({ username });
  });

  module.exports = router;