const express = require('express');
const ShippingMethod = require('../models/ShippingMethod');
const router = express.Router();

// Get all shipping methods for a tenant
router.get('/:tenentId', async (req, res) => {
  try {
    const { tenentId } = req.params;
    
    // Find shipping methods for the tenant
    const methods = await ShippingMethod.find({ 
      tenentId: tenentId,
      isActive: true 
    }).sort({ createdAt: -1 });
    
    res.status(200).json(methods);
  } catch (error) {
    console.error('Error fetching shipping methods:', error);
    res.status(500).json({ message: 'Server error fetching shipping methods' });
  }
});

// Create a new shipping method
router.post('/create', async (req, res) => {
  try {
    const { tenentId, name, type, minAmount, useWeight, ratePerKg, fixedRate, isActive } = req.body;
    
    // Validate required fields
    if (!tenentId || !name || !type) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Validate shipping method type
    if (!['FREE_SHIPPING', 'COURIER_PARTNER'].includes(type)) {
      return res.status(400).json({ message: 'Invalid shipping method type' });
    }
    
    // Create new shipping method
    const newMethod = new ShippingMethod({
      tenentId,
      name,
      type,
      minAmount: type === 'FREE_SHIPPING' ? minAmount : null,
      useWeight: type === 'COURIER_PARTNER' ? useWeight : false,
      ratePerKg: type === 'COURIER_PARTNER' && useWeight ? ratePerKg : null,
      fixedRate: type === 'COURIER_PARTNER' && !useWeight ? fixedRate : null,
      isActive: isActive ?? true
    });
    
    // Save shipping method
    await newMethod.save();
    console.log('Shipping method created successfully');
    res.status(201).json({
      message: 'Shipping method created successfully',
      method: newMethod
    });
  } catch (error) {
    console.error('Error creating shipping method:', error);
    res.status(500).json({ 
      message: 'Server error creating shipping method',
      error: error.message 
    });
  }
});

// Update an existing shipping method
router.put('/update/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { tenentId, name, type, minAmount, useWeight, ratePerKg, fixedRate, isActive } = req.body;
    
    // Validate required fields
    if (!tenentId || !id) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Validate shipping method type
    if (type && !['FREE_SHIPPING', 'COURIER_PARTNER'].includes(type)) {
      return res.status(400).json({ message: 'Invalid shipping method type' });
    }
    
    // Find and update shipping method
    const updatedMethod = await ShippingMethod.findOneAndUpdate(
      { _id: id, tenentId: tenentId },
      {
        name,
        type,
        minAmount: type === 'FREE_SHIPPING' ? minAmount : null,
        useWeight: type === 'COURIER_PARTNER' ? useWeight : false,
        ratePerKg: type === 'COURIER_PARTNER' && useWeight ? ratePerKg : null,
        fixedRate: type === 'COURIER_PARTNER' && !useWeight ? fixedRate : null,
        isActive
      },
      { 
        new: true,  // Return the updated document
        runValidators: true  // Run model validations
      }
    );
    
    if (!updatedMethod) {
      return res.status(404).json({ message: 'Shipping method not found' });
    }
    
    res.status(200).json({
      message: 'Shipping method updated successfully',
      method: updatedMethod
    });
  } catch (error) {
    console.error('Error updating shipping method:', error);
    res.status(500).json({ 
      message: 'Server error updating shipping method',
      error: error.message 
    });
  }
});

// Delete a shipping method
router.delete('/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { tenentId } = req.body;
    
    if (!id || !tenentId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Find and delete shipping method
    const deletedMethod = await ShippingMethod.findOneAndDelete({ 
      _id: id, 
      tenentId: tenentId 
    });
    
    if (!deletedMethod) {
      return res.status(404).json({ message: 'Shipping method not found' });
    }
    
    res.status(200).json({ 
      message: 'Shipping method deleted successfully',
      method: deletedMethod
    });
  } catch (error) {
    console.error('Error deleting shipping method:', error);
    res.status(500).json({ 
      message: 'Server error deleting shipping method',
      error: error.message 
    });
  }
});


router.get('/couriers/:tenentId', async (req, res) => {
  try {
    const { tenentId } = req.params;
    
    // Find active couriers for the tenant
    const couriers = await Courier.find({ 
      tenentId: tenentId,
      isActive: true 
    }).sort({ name: 1 });
    
    res.status(200).json(couriers);
  } catch (error) {
    console.error('Error fetching couriers:', error);
    res.status(500).json({ message: 'Server error fetching couriers' });
  }
});

module.exports = router;