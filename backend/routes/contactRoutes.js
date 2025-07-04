const express = require('express');
const router = express.Router();
const Newuser = require('../models/Newuser');

// Get contacts by tenant ID
router.get('/contacts', async (req, res) => {
  const { tenentId } = req.query;
  try {
    const contacts = await Newuser.find({ tenentId });
    if (contacts) {
      res.json(contacts);
    } else {
      res.status(404).json({ error: 'No contacts found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

module.exports = router;
