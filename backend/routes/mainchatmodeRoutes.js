const express = require('express');
const router = express.Router();
const Mainmode = require('../models/Mainmode');

// Get contacts by tenant ID
router.get('/mainmode', async (req, res) => {
  const { tenentId } = req.query;
  try {
    const Mainchatmode = await Mainmode.findOne({ tenentId }).sort({ createdAt: -1 }).limit(1);
    console.log('Fetching main mode for tenant ID:', tenentId);
    if (Mainchatmode) {
      res.json(Mainchatmode);
    } else {
      res.status(404).json({ error: 'No contacts found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

module.exports = router;
