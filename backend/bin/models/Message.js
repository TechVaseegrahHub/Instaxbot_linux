const mongoose = require('mongoose');

// Button Schema for templates
const buttonSchema = new mongoose.Schema({
  type: String,
  title: String,
  payload: String
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
    enum: ['text', 'template','audio','image','video','ig_reel','ig_stroy'],
    default: 'text'
  },
  audioUrl: {
    type: String
  },
  transcription: {
    type: String
  },
  // User's message
  message: {
    type: String
  },
  imageUrl: {
    type: String
  },
  videoUrl: {
    type: String
  },
  igreelUrl: {
    type: String
  },
  igstroyUrl: {
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

// Helper methods
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
    igstroyUrl: data.igreelUrl,
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

// models/Message.js

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
            text: firstresponse.attachment.payload.text,
            buttons: firstresponse.attachment.payload.buttons
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



messageSchema.statics.createProductTemplate = async function(data, productTypes) {
  try {
    // Validate product types array
    if (!Array.isArray(productTypes) || productTypes.length === 0) {
      throw new Error('Product types must be a non-empty array');
    }

    // Limit to maximum 3 buttons per template (Facebook Messenger limit)
    const maxButtons = 8;
    if (productTypes.length > maxButtons) {
      throw new Error(`Maximum ${maxButtons} product types allowed per template`);
    }

    // Map product types to buttons
    const buttons = productTypes.map(type => ({
      type: 'postback',
      title: `${type.title}`,
      payload: type.payload || `${type.title.toUpperCase().replace(/\s+/g, '_')}_CATEGORY`
    }));

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
            template_type: 'product',
            text: 'Please select a product category:',
            buttons: buttons
          }
        }
      },
      messageid: data.messageid
    });
  } catch (error) {
    console.error('Error creating product template message:', error);
    throw error;
  }
};

// Create subcategory template
/*messageSchema.statics.createSubcategoryTemplate = async function(data, categoryTitle, subcategories) {
  try {
    if (!Array.isArray(subcategories) || subcategories.length === 0) {
      throw new Error('Subcategories must be a non-empty array');
    }

    const maxButtons = 3;
    if (subcategories.length > maxButtons) {
      throw new Error(`Maximum ${maxButtons} subcategories allowed per template`);
    }

    const buttons = subcategories.map(subcat => ({
      type: 'postback',
      title: `${subcat.title}`,
      payload: subcat.payload || `${subcat.title.toUpperCase().replace(/\s+/g, '_')}`
    }));

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
            template_type: 'product',
            text: `Choose a ${categoryTitle.toLowerCase()} category:`,
            buttons: buttons
          }
        }
      },
      messageid: data.messageid
    });
  } catch (error) {
    console.error('Error creating subcategory template message:', error);
    throw error;
  }
};*/



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
              image_url: productDetails.productPhoto,
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