const mongoose = require('mongoose');

// Button Schema for templates - updated with URL generation logic
const buttonSchema = new mongoose.Schema({
  type: String,
  title: String,
  payload: String,
  url: String
});

const quickReplySchema = new mongoose.Schema({
  content_type: {
    type: String,
    enum: ['text', 'user_email', 'user_phone_number'],
    default: 'text'
  },
  title: String,
  payload: String,
  image_url: String
});

// Template Payload Schema
const templatePayloadSchema = new mongoose.Schema({
  template_type: String,
  text: String,
  buttons: [buttonSchema],
  quick_replies: [quickReplySchema]
});

// Template Attachment Schema
const attachmentSchema = new mongoose.Schema({
  type: String,
  payload: templatePayloadSchema
});

// Product Type Schema
const productTypeSchema = new mongoose.Schema({
  title: String,
  payload: String
});

// Message Schema
const messageSchema = new mongoose.Schema({
  senderId: { 
    type: String, 
    required: true 
  },
  recipientId: { 
    type: String, 
    required: true 
  },
  tenentId: { 
    type: String, 
    required: true 
  },
  messageid: { 
    type: String 
  },
  messageType: { 
    type: String,
    enum: ['text', 'template','audio','image', 'video','ig_reel','ig_stroy', 'carousel'],
    default: 'text'
  },
  audioUrl: {
    type: String
  },
  transcription: {
    type: String
  },
  carouselData: {
    totalProducts: Number,
    products: [{
      title: String,
      subtitle: String,
      imageUrl: String,
      buttons: [{
        type: {
          type: String,
          required: true
        },
        title: {
          type: String,
          required: true
        },
        url: {
          type: String
        },
        payload: {
          type: String
        }
      }]
    }]
  },
  // User's message
  message: {
    type: String
  },
  imageUrl: {
    type: String
  },
  // Template or response
  response: {
    type: mongoose.Schema.Types.Mixed,
    validate: {
      validator: function(value) {
        if (this.messageType === 'template') {
          return value && value.attachment;
        }
        return typeof value === 'string' || !value;
      }
    }
  },
  Timestamp: { 
    type: Date, 
    default: () => new Date().toISOString() 
  }
}, { 
  timestamps: true 
});

// Helper methods - unchanged
messageSchema.statics.createTextMessage = async function(data) {
  return this.create({
    senderId: data.senderId,
    recipientId: data.recipientId,
    tenentId: data.tenentId,
    messageType: 'text',
    message: data.message || "",
    response: data.response || "",
    messageid: data.messageid,
    Timestamp: data.Timestamp
  });
};
messageSchema.statics.createImageMessage = async function(data) {
  return this.create({
    senderId: data.senderId,
    recipientId: data.recipientId,
    tenentId: data.tenentId,
    messageType: 'image',
    imageUrl: data.imageUrl,
    message: data.message || "",
    response: data.response || "",
    messageid: data.messageid,
    Timestamp: data.Timestamp
  });
};
messageSchema.statics.createAudioMessage = async function(data) {
  return this.create({
    senderId: data.senderId,
    recipientId: data.recipientId,
    tenentId: data.tenentId,
    messageType: 'audio',
    audioUrl: data.audioUrl,
    transcription: data.transcription,
    message: data.message || "",
    response: data.response || "",
    messageid: data.messageid,
    Timestamp: data.Timestamp
  });
};

messageSchema.statics.createVideoMessage = async function(data) {
  return this.create({
    senderId: data.senderId,
    recipientId: data.recipientId,
    tenentId: data.tenentId,
    messageType: 'video',
    videoUrl: data.videoUrl,
    message: data.message || "",
    response: data.response || "",
    messageid: data.messageid,
    Timestamp: data.Timestamp
  });
};
// models/Message.js
messageSchema.statics.createIgReelMessage = async function(data) {
  return this.create({
    senderId: data.senderId,
    recipientId: data.recipientId,
    tenentId: data.tenentId,
    messageType: 'ig_reel',
    igreelUrl: data.igreelUrl,
    message: data.message || "",
    response: data.response || "",
    messageid: data.messageid,
    Timestamp: data.Timestamp
  });
};


messageSchema.statics.createIgStroyMessage = async function(data) {
  return this.create({
    senderId: data.senderId,
    recipientId: data.recipientId,
    tenentId: data.tenentId,
    messageType: 'ig_stroy',
    igstroyUrl: data.igstroyUrl,
    message: data.message || "",
    response: data.response || "",
    messageid: data.messageid,
    Timestamp: data.Timestamp
  });
};

messageSchema.statics.createTemplateMessage = async function(data) {
  try {
    return this.create({
      senderId: data.senderId,
      recipientId: data.recipientId,
      tenentId: data.tenentId,
      messageType: 'template',
      message: data.message || '', // User's message
      response: {   // Template goes in response
        attachment: {
          type: 'template',
          payload: {
            template_type: 'button',
            text: data.response.attachment.payload.text,
            buttons: data.response.attachment.payload.buttons
          }
        }
      },
      messageid: data.messageid,
      Timestamp: data.Timestamp
    });
  } catch (error) {
    console.error('Error creating template message:', error);
    throw error;
  }
};


messageSchema.statics.createProductTemplateMessage = async function(data) {
  try {
    // Validate required fields
    if (!data.senderId || !data.recipientId || !data.tenentId) {
      throw new Error('Missing required message fields');
    }

    // Default template response if not provided
    const defaultTemplateResponse = {
      attachment: {
        type: "template",
        payload: {
          template_type: "button",
          text: "Browse Our Products",
          buttons: [
            {
              type: "web_url",
              title: "View Our Products",
              url: 'https://vaseegrahveda.com/'
            }
          ]
        }
      }
    };

    // Use provided response or fall back to default
    const templateResponse = data.response || defaultTemplateResponse;

    // Create message document
    return this.create({
      senderId: data.senderId,
      recipientId: data.recipientId,
      tenentId: data.tenentId,
      messageType: 'template',
      message: data.message || '', // User's message
      response: {
        attachment: {
          type: templateResponse.attachment.type,
          payload: {
            template_type: templateResponse.attachment.payload.template_type,
            text: templateResponse.attachment.payload.text,
            buttons: templateResponse.attachment.payload.buttons.map(button => ({
              type: button.type,
              title: button.title,
              url: button.url || button.payload // Handle both web_url and postback
            }))
          }
        }
      },
      messageid: data.messageid || null,
      Timestamp: data.Timestamp || new Date()
    });
  } catch (error) {
    console.error('Error creating template message:', error);
    
    // Enhanced error logging
    if (error.name === 'ValidationError') {
      console.error('Validation Error Details:', 
        Object.values(error.errors).map(err => err.message)
      );
    }
    
    throw error;
  }
};

messageSchema.statics.createCarouselMessage = async function(data) {
  try {
    // Validate required fields
    if (!data.senderId || !data.recipientId || !data.tenentId) {
      throw new Error('Missing required message fields');
    }

    // Validate carousel data
    if (!data.carouselData || !Array.isArray(data.carouselData.products)) {
      throw new Error('Invalid carousel data');
    }

    // Create normalized product data structure with updated button handling
    const products = data.carouselData.products.map(product => ({
      title: product.title || '',
      subtitle: product.subtitle || '',
      imageUrl: product.imageUrl || product.image_url || '',
      buttons: Array.isArray(product.buttons) ? product.buttons.map(button => {
        // Create a normalized button object
        const normalizedButton = {
          type: button.type || 'web_url',
          title: button.title || ''
        };
        
        // Handle the different button types appropriately
        if (button.type === 'web_url') {
          normalizedButton.url = button.url || '';
        } else if (button.type === 'postback') {
          normalizedButton.payload = button.payload || '';
        }
        
        return normalizedButton;
      }) : []
    }));
    
    // Create and save the message document
    return this.create({
      senderId: data.senderId,
      recipientId: data.recipientId,
      tenentId: data.tenentId,
      messageType: 'carousel',
      messageid: data.messageid || null,
      carouselData: {
        totalProducts: products.length,
        products: products
      },
      message: data.message || '',
      response: data.response || '',
      Timestamp: data.Timestamp || new Date()
    });
    
  } catch (error) {
    console.error('Error creating carousel message:', error);
    throw error;
  }
};

messageSchema.statics.createProductDetailsTemplate = async function(data, productDetails) {
  try {
    if (!productDetails) {
      throw new Error('Product details are required');
    }

    // Create price list text
    const priceList = Array.isArray(productDetails?.units)
    ? productDetails.units.map(unit => `${unit.unit}: ₹${unit.price}`).join('\n')
    : 'No pricing details available.';

    // Create buy button for website
    const buttons = [
      {
        type: 'web_url',
        title: 'Buy Now',
        url: productDetails.websiteLink
      }
    ];

    // Add buttons for each unit if there are multiple units
    /*if (productDetails.units.length > 0) {
      productDetails.units.forEach(unit => {
        if (buttons.length < 3) { // Facebook Messenger limit of 3 buttons
          buttons.push({
            type: 'postback',
            title: `Buy ${unit.unit}`,
            payload: `BUY_${productDetails.productName.toUpperCase()}_${unit.unit.toUpperCase()}`
          });
        }
      });
    }*/

    return this.create({
      senderId: data.senderId,
      recipientId: data.recipientId,
      tenentId: data.tenentId,
      messageType: 'template',
      message: data.message || '',
      response: {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'generic',
            elements: [{
              title: productDetails.productName,
              image_url: productDetails.productPhotoUrl || productDetails.productPhoto,
              subtitle: priceList,
              default_action: {
                type: 'web_url',
                url: productDetails.websiteLink
              },
              buttons: buttons
            }]
          }
        }
      },
      messageid: data.messageid,
    Timestamp: data.Timestamp
    });
  } catch (error) {
    console.error('Error creating product details template message:', error);
    throw error;
  }
};

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;