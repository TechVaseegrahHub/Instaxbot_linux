require("dotenv").config();

const Welcomemessage = require('../models/Welcomemessage');
const ProductType= require('../models/ProductType');
const ProductList= require('../models/ProductList');
const Icebreaker= require('../models/Icebreaker');
const path = require('path');
const axios = require('axios');
const express = require('express');
const { json } = express;
const router = express.Router();

const fs = require('fs');
const ProductDetail = require('../models/ProductDetail');
const multer = require('multer');
const cors = require('cors');


router.use(cors({
  origin: '*' // Replace with your client URL
}));

const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadDir = 'uploads/products';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// Update the multer configuration to handle array of files with specific field name
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
}).fields([
  { name: 'products[0][productPhoto]', maxCount: 1 },
  { name: 'products[1][productPhoto]', maxCount: 1 },
  { name: 'products[2][productPhoto]', maxCount: 1 }
  // Add more fields if needed
]);

router.post("/welcome", async (req, res) => {
    try {
      const { message,tenentId } = req.body;
      console.log("tenentId",tenentId);

      const welcome = await Welcomemessage.findOne({ tenentId:tenentId }).sort({ createdAt: -1 }).limit(1);
      if(welcome){
        const welcomemessage=message;
        const welcomemessagedata = await Welcomemessage.updateOne(
          { tenentId:tenentId },
          { $set: { welcomemessage: welcomemessage } }
          
        );
          
          console.log('welcomemessagedata ', welcomemessagedata);

      }
      if(!welcome){
        const welcomemessagedata1 = new Welcomemessage({
          tenentId:tenentId ,
          welcomemessage: message 
          
       });
     const savedwelcomemessagedata1 = await welcomemessagedata1.save();
     console.log('savedwelcomemessagedata1 ', savedwelcomemessagedata1);

      }
        
        
        

        res.json({
            success: true,
            message: 'Message sent successfully',
            //data: savedMessage
        });

    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

router.post("/Product-type", async (req, res) => {

  try {
    const { tenentId, productTypes } = req.body;

    // Validate request data
    if (!tenentId || !productTypes || !Array.isArray(productTypes)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid request data' 
      });
    }

    // Validate product types length
    if (productTypes.length > 8) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 3 product types allowed'
      });
    }

    // Validate each product type
    for (const type of productTypes) {
      if (!type.title || !type.payload) {
        return res.status(400).json({
          success: false,
          message: 'Each product type must have title and payload'
        });
      }
    }

   /* // Check if product types already exist for this tenant
    const existingTypes = await ProductType.findOne({ tenentId });

    if (existingTypes) {
      // Update existing product types
      existingTypes.productTypes = productTypes;
      await existingTypes.save();

      return res.json({
        success: true,
        message: 'Product types updated successfully',
        data: existingTypes
      });
    }*/

    // Create new product types document
    const newProductTypes = new ProductType({
      tenentId,
      productTypes
    });

    // Save to database
    const savednewProductTypes=await newProductTypes.save();
   /* if(savednewProductTypes){
      console.log("savednewProductTypes",savednewProductTypes);
    }*/

    res.json({
      success: true,
      message: 'Product types saved successfully',
      data: newProductTypes
    });

  } catch (error) {
    console.error('Error saving product types:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save product types',
      error: error.message
    });
  }



});
router.post("/Product-type-list", async (req, res) => {
  try {
    const { tenentId } = req.body;

    // Validate request data
    if (!tenentId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid request: tenant ID is required' 
      });
    }

    // Find all product types for the given tenant
    const productTypeList = await ProductType.find({ tenentId });

    if (!productTypeList || productTypeList.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No product types found for this tenant'
      });
    }

    // Extract and flatten all product types from all documents
    const allProductTypes = productTypeList.reduce((allTypes, document) => {
      if (document.productTypes && Array.isArray(document.productTypes)) {
        return [...allTypes, ...document.productTypes];
      }
      return allTypes;
    }, []);
    console.log("allProductTypes",allProductTypes);
    // Return the compiled list of product types
    res.json({
      success: true,
      message: 'Product types retrieved successfully',
      data: allProductTypes,
      count: allProductTypes.length
    });

  } catch (error) {
    console.error('Error retrieving product types:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve product types',
      error: error.message
    });
  }
});
router.post('/product-list', async (req, res) => {
  try {
    const { tenentId, products } = req.body;

    // Validate request
    if (!tenentId || !products || !Array.isArray(products)) {
      return res.status(400).json({ error: 'Invalid request data' });
    }

    // Save each product
    const savedProducts = await Promise.all(
      products.map(async (product) => {
        const newProduct = new ProductList({
          tenentId,
          productName: product.productName,
          productType: product.productType,
          payload:product.payload
        });
        return await newProduct.save();
      })
    );

    res.status(201).json({
      message: 'Products saved successfully',
      products: savedProducts
    });

  } catch (error) {
    console.error('Error saving products:', error);
    res.status(500).json({ error: 'Failed to save products' });
  }
});

// Route to get products by tenant ID
router.get('/product-list/:tenentId', async (req, res) => {
  try {
    const { tenentId } = req.params;
    const products = await ProductList.find({ tenentId }).sort({ createdAt: -1 });
    res.status(200).json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Route to update a product
router.put('/product-list/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const updateData = req.body;

    const updatedProduct = await ProductList.findByIdAndUpdate(
      productId,
      updateData,
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.status(200).json(updatedProduct);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Route to delete a product
router.delete('/product-list/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const deletedProduct = await ProductList.findByIdAndDelete(productId);

    if (!deletedProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Updated route handler for product details
router.post('/product-details', upload, async (req, res) => {
  try {
    const { tenentId, products } = req.body;
    const files = req.files;
    
    if (!tenentId || !products) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const parsedProducts = typeof products === 'string' ? JSON.parse(products) : products;
    
    const savedProducts = [];
    for (let i = 0; i < parsedProducts.length; i++) {
      const product = parsedProducts[i];
      const fileKey = `products[${i}][productPhoto]`;
      const file = files[fileKey]?.[0];
      
      let productPhotoField = {};

      // If there's a productPhotoUrl, use that
      if (product.productPhotoUrl) {
        productPhotoField = {
          productPhotoUrl: product.productPhotoUrl
        };
      } 
      // If there's a file upload, use that
      else if (file) {
        productPhotoField = {
          productPhoto: `/uploads/products/${file.filename}`
        };
      } else {
        return res.status(400).json({ error: `Missing photo for product ${i + 1}` });
      }

      // Include sku in the product document only if it exists
      const productDetail = new ProductDetail({
        tenentId,
        productName: product.productName,
        ...(product.sku && { sku: product.sku }), // Use sku directly
        units: product.units,
        websiteLink: product.websiteLink,
        ...productPhotoField
      });

      const savedProduct = await productDetail.save();
      savedProducts.push(savedProduct);
    }

    res.status(201).json({
      message: 'Products saved successfully',
      products: savedProducts
    });

  } catch (error) {
    console.error('Error saving product details:', error);
    res.status(500).json({ error: 'Failed to save product details' });
  }
});

// Updated route for product updates
router.post('/product-details/update', upload, async (req, res) => {
  try {
    const { tenentId, products } = req.body;
    const files = req.files;
    console.log("productsdetails", products);
    
    if (!tenentId || !products) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const parsedProducts = typeof products === 'string' ? JSON.parse(products) : products;
    
    const savedProducts = [];
    for (let i = 0; i < parsedProducts.length; i++) {
      const product = parsedProducts[i];
      const fileKey = `products[${i}][productPhoto]`;
      const file = files[fileKey]?.[0];
      
      let productPhotoField = {};

      // If there's a productPhotoUrl, use that
      if (product.productPhotoUrl) {
        productPhotoField = {
          productPhotoUrl: product.productPhotoUrl
        };
      } 
      // If there's a file upload, use that
      else if (file) {
        productPhotoField = {
          productPhoto: `/uploads/products/${file.filename}`
        };
      } else {
        return res.status(400).json({ error: `Missing photo for product ${i + 1}` });
      }

      // Check if product exists by name and tenentId
      const existingProduct = await ProductDetail.findOne({ 
        productName: product.productName,
        tenentId: tenentId
      });

      let savedProduct;
      
      if (existingProduct) {
        // Update existing product with proper sku handling
        const updateData = {
          websiteLink: product.websiteLink,
          units: product.units,
          ...(product.sku && { sku: product.sku }), // Use sku directly instead of productId
          ...productPhotoField
        };

        savedProduct = await ProductDetail.findOneAndUpdate(
          { _id: existingProduct._id },
          updateData,
          { new: true }
        );
      } else {
        // Create new product with proper sku handling
        const productDetail = new ProductDetail({
          tenentId,
          productName: product.productName,
          ...(product.sku && { sku: product.sku }), // Use sku directly
          units: product.units,
          websiteLink: product.websiteLink,
          ...productPhotoField
        });

        savedProduct = await productDetail.save();
      }

      savedProducts.push(savedProduct);
    }

    res.status(200).json({
      message: 'Products saved/updated successfully',
      products: savedProducts
    });

  } catch (error) {
    console.error('Error saving/updating product details:', error);
    res.status(500).json({ error: 'Failed to save/update product details' });
  }
});

// Add this route to get product details by tenant ID
router.get('/product-details/:tenentId', async (req, res) => {
  try {
    const { tenentId } = req.params;
    const products = await ProductDetail.find({ tenentId }).sort({ createdAt: -1 });
    res.status(200).json(products);
  } catch (error) {
    console.error('Error fetching product details:', error);
    res.status(500).json({ error: 'Failed to fetch product details' });
  }
});

router.post("/Icebreaker", async (req, res) => {
  try {
    const { questions, tenentId } = req.body;
    
    console.log("tenentId", tenentId);
    console.log("received questions", questions);

    // Validate input
    if (!questions || !Array.isArray(questions) || questions.length !== 4) {
      return res.status(400).json({
        success: false,
        message: 'Please provide exactly 4 questions'
      });
    }

    if (!tenentId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID is required'
      });
    }

    // Find document by tenentId and update it, or create a new one if it doesn't exist
    const result = await Icebreaker.findOneAndUpdate(
      { tenentId }, // filter - find by tenentId
      { questions }, // update - set the questions field
      { 
        new: true, // return the updated document
        upsert: true, // create a new document if one doesn't exist
        setDefaultsOnInsert: true // apply schema defaults if creating new doc
      }
    );

    console.log('Saved/updated icebreakers:', result);

    res.json({
      success: true,
      message: 'Questions saved successfully',
      data: result
    });

  } catch (error) {
    console.error('Error saving/updating icebreaker questions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;