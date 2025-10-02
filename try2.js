// Validate stock availability for all items in cart
router.post('/validate-stock', async (req, res) => {
  try {
    console.log('Starting validate-stock process with body:', req.body);
    const { securityAccessToken, tenentId } = req.body;
    
    if (!securityAccessToken || !tenentId) {
      console.log('Missing required fields in validate-stock request');
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    const senderId = await getSenderIdFromToken(securityAccessToken, tenentId);
    console.log('Retrieved senderId:', senderId);
    
    // Find user's cart
    const cart = await Cart.findOne({ senderId, tenentId });
    
    if (!cart || !cart.items || cart.items.length === 0) {
      console.log('Cart is empty or not found');
      return res.status(200).json({ 
        valid: true, 
        message: 'Cart is empty', 
        insufficientItems: [],
        allResults: []   // ✅ make frontend consistent
      });
    }
    
    console.log(`Validating stock for ${cart.items.length} items in cart`);
    
    // Use the improved validation function
    const validationResult = await validateCartStock(tenentId, cart.items);
    
    console.log('Stock validation result:', validationResult);
    
    const result = {
      valid: validationResult.valid,
      message: validationResult.valid 
        ? 'All items in cart have sufficient stock' 
        : 'Some items have insufficient stock',
      insufficientItems: validationResult.insufficientItems,
      allResults: validationResult.allResults   // ✅ added this
    };
    
    console.log('Validate-stock response:', result);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error validating cart stock:', error);
    if (error.message === 'Invalid security token') {
      return res.status(401).json({ message: 'Invalid security token' });
    }
    res.status(500).json({ message: 'Server error validating cart stock' });
  }
});
