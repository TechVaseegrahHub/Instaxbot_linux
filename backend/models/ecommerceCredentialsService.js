const mongoose = require('mongoose');
const crypto = require('crypto');

// Updated encryption/decryption functions with proper key handling
function getEncryptionKey() {
  const key = process.env.ENCRYPTION_KEY || 'default32charactersecurekeygoeshere';
  return crypto.createHash('sha256').update(String(key)).digest('base64').substring(0, 32);
}

function encrypt(text) {
  const ENCRYPTION_KEY = getEncryptionKey();
  const IV_LENGTH = 16;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
  const ENCRYPTION_KEY = getEncryptionKey();
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift(), 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

// Define the website schema
const websiteSchema = new mongoose.Schema({
  id: { type: Number, required: true },
  type: { 
    type: String, 
    required: true,
    enum: ['shopify', 'woocommerce']
  },
  credentials: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  }
});

// Define the main e-commerce credentials schema
const ecommerceCredentialsSchema = new mongoose.Schema({
  tenentId: {
    type: String,
    required: true,
    index: true
  },
  websites: [websiteSchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save hook to encrypt sensitive data
ecommerceCredentialsSchema.pre('save', function(next) {
  if (this.isModified('websites')) {
    // Update the timestamp
    this.updatedAt = Date.now();
    
    // Encrypt sensitive data
    for (let i = 0; i < this.websites.length; i++) {
      const website = this.websites[i];
      
      if (website.type === 'shopify') {
        // Only encrypt if it's not already encrypted
        if (website.credentials.apiPassword && !website.credentials.apiPassword.includes(':')) {
          website.credentials.apiPassword = encrypt(website.credentials.apiPassword);
          // Also encrypt the API key for added security
          website.credentials.apiKey = encrypt(website.credentials.apiKey);
        }
        
        // Ensure websiteUrl exists (might be empty string)
        if (website.credentials.websiteUrl === undefined) {
          website.credentials.websiteUrl = '';
        }
      } else if (website.type === 'woocommerce') {
        if (website.credentials.consumerSecret && !website.credentials.consumerSecret.includes(':')) {
          website.credentials.consumerSecret = encrypt(website.credentials.consumerSecret);
          website.credentials.consumerKey = encrypt(website.credentials.consumerKey);
        }
      }
    }
  }
  next();
});

// Method to get decrypted credentials for API use
ecommerceCredentialsSchema.methods.getDecryptedWebsites = function() {
  const decryptedWebsites = [];
  
  this.websites.forEach(website => {
    const decryptedWebsite = {
      id: website.id,
      type: website.type,
      credentials: {}
    };
    
    if (website.type === 'shopify') {
      decryptedWebsite.credentials = {
        apiKey: website.credentials.apiKey.includes(':') ? decrypt(website.credentials.apiKey) : website.credentials.apiKey,
        apiPassword: website.credentials.apiPassword.includes(':') ? decrypt(website.credentials.apiPassword) : website.credentials.apiPassword,
        storeUrl: website.credentials.storeUrl,
        // Always include websiteUrl in the decrypted credentials
        websiteUrl: website.credentials.websiteUrl || ''
      };
    } else if (website.type === 'woocommerce') {
      decryptedWebsite.credentials = {
        consumerKey: website.credentials.consumerKey.includes(':') ? decrypt(website.credentials.consumerKey) : website.credentials.consumerKey,
        consumerSecret: website.credentials.consumerSecret.includes(':') ? decrypt(website.credentials.consumerSecret) : website.credentials.consumerSecret,
        url: website.credentials.url
      };
    }
    
    decryptedWebsites.push(decryptedWebsite);
  });
  
  return decryptedWebsites;
};

class EcommerceCredentialsService {
  constructor() {
    this.model = mongoose.model('EcommerceCredentials', ecommerceCredentialsSchema);
  }

  /**
   * Save e-commerce credentials for a tenant
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async saveCredentials(req, res) {
    try {
      const { websites, tenentId } = req.body;
      
      if (!tenentId || !websites || !Array.isArray(websites)) {
        return res.status(400).json({ success: false, message: 'Invalid request data' });
      }
      
      // Find existing credentials or create new ones
      let credentials = await this.model.findOne({ tenentId: tenentId });
      
      if (credentials) {
        // Update existing credentials
        credentials.websites = websites;
        await credentials.save();
      } else {
        // Create new credentials
        credentials = new this.model({
          tenentId: tenentId,
          websites: websites
        });
        await credentials.save();
      }
      
      res.status(200).json({
        success: true,
        message: 'E-commerce credentials saved successfully'
      });
    } catch (error) {
      console.error('Error saving e-commerce credentials:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to save credentials',
        error: error.message
      });
    }
  }

  /**
   * Get decrypted credentials for API use
   * @param {string} tenentId - Tenant ID
   * @returns {Object} Decrypted credentials
   */
  async getCredentialsForAPI(tenentId) {
    try {
      console.log("tenentId for **",tenentId);
      const credentials = await this.model.findOne({ tenentId: tenentId });
      console.log("credentials for **",credentials);
      if (!credentials) {
        throw new Error('No credentials found for this tenant');
      }
      
      // Use the method to get decrypted websites
      return {
        tenentId: credentials.tenentId,
        websites: credentials.getDecryptedWebsites(),
        createdAt: credentials.createdAt,
        updatedAt: credentials.updatedAt
      };
    } catch (error) {
      console.error('Error fetching credentials:', error);
      throw error;
    }
  }

  /**
   * Get credentials with masked sensitive information for display
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getCredentialsForDisplay(req, res) {
    try {
      const { tenentId } = req.params;
      
      const credentials = await this.model.findOne({ tenentId });
      
      if (!credentials) {
        return res.status(404).json({
          success: false,
          message: 'No credentials found for this tenant'
        });
      }
      
      // Create a sanitized version without sensitive data
      const sanitizedCredentials = {
        tenentId: credentials.tenentId,
        websites: credentials.websites.map(website => {
          const sanitizedWebsite = {
            id: website.id,
            type: website.type,
            credentials: {}
          };
          
          if (website.type === 'shopify') {
            sanitizedWebsite.credentials = {
              apiKey: '********',
              apiPassword: '********',
              storeUrl: website.credentials.storeUrl,
              // Include websiteUrl if it exists
              ...(website.credentials.websiteUrl && { websiteUrl: website.credentials.websiteUrl })
            };
          } else if (website.type === 'woocommerce') {
            sanitizedWebsite.credentials = {
              consumerKey: '********',
              consumerSecret: '********',
              url: website.credentials.url
            };
          }
          
          return sanitizedWebsite;
        }),
        createdAt: credentials.createdAt,
        updatedAt: credentials.updatedAt
      };
      
      res.status(200).json({
        success: true,
        data: sanitizedCredentials
      });
    } catch (error) {
      console.error('Error fetching credentials for display:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch credentials',
        error: error.message
      });
    }
  }

  /**
   * Get credentials for a specific store type
   * @param {string} tenentId - Tenant ID
   * @param {string} storeType - 'shopify' or 'woocommerce'
   * @returns {Object|null} Credentials for the specified store type or null if not found
   */
  async getCredentialsByType(tenentId, storeType) {
    try {
      const credentialsData = await this.getCredentialsForAPI(tenentId);
      const matchingWebsite = credentialsData.websites.find(website => website.type === storeType);
      
      if (!matchingWebsite) {
        return null;
      }
      
      return matchingWebsite.credentials;
    } catch (error) {
      console.error(`Error fetching ${storeType} credentials:`, error);
      throw error;
    }
  }
}

// Create and export a singleton instance
const ecommerceCredentialsService = new EcommerceCredentialsService();
module.exports = ecommerceCredentialsService;