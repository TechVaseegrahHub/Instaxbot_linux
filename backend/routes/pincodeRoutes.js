// routes/pincodeRoute.js
const express = require('express');
const axios = require('axios');

const router = express.Router();

router.get('/:pincode', async (req, res) => {
  const { pincode } = req.params;
  try {
    const response = await axios.get(`https://api.postalpincode.in/pincode/${pincode}`);
    res.json(response.data);
  } catch (err) {
    console.error('Pincode API Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch pincode details' });
  }
});

module.exports = router;
