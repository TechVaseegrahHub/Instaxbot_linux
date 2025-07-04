// models/WelcomePage.js - MongoDB schema for welcome page configuration

const mongoose = require('mongoose');

// Define workflow schema as a subdocument
const workflowSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['playload', 'weburl'],
    required: true
  },
  title: {
    type: String,
    required: true
  },

  payload: {
    type: String,
    required: true
  },
  urlType: {
    type: String,
    enum: ['Enter URL', ''],
    default: ''
  }
});

// Define button options schema for carousel items
const buttonOptionSchema = new mongoose.Schema({
  buttonText: String,
  buttonUrl: String,
  buttonPayload: String,
  buttonType: {
    type: String,
    enum: ['url', 'payload'],
    default: 'url'
  }
});

// Define carousel item schema
const carouselItemSchema = new mongoose.Schema({
  image: String,
  title: String,
  subtitle: String, // Optional
  buttons: [buttonOptionSchema]
});

// Define welcome page schema
const welcomePageSchema = new mongoose.Schema({
  tenentId: {
    type: String,
    required: true,
    unique: true
  },
  body: {
    type: String,
    required: true,
    maxlength: 1024
  },
  headerType: {
    type: String,
    enum: ['Text', 'Image', 'Video'],
    default: 'Text'
  },
  mediaPath: {
    type: String,
    default: null
  },
  workflows: {
    type: [workflowSchema],
    validate: [
      {
        validator: function(workflows) {
          // Updated to match the error message indicating max 2 workflows
          return workflows.length <= 3;
        },
        message: 'Maximum 3  workflows allowed'
      }
    ],
    default: []
  },
  // Template message fields
  messageType: {
    type: String,
    enum: ['text', 'carousel'],
    default: 'text'
  },
  text: String,
  carouselItems: [carouselItemSchema]
}, { timestamps: true });

// Add validation for template message components
welcomePageSchema.pre('validate', function(next) {
  // Only validate template message fields if they are being used
  if (this.messageType === 'text' && this.text !== undefined && (!this.text || this.text.trim() === '')) {
    this.invalidate('text', 'Text is required for text type messages');
  } else if (this.messageType === 'carousel' && this.carouselItems !== undefined) {
    if (!this.carouselItems || this.carouselItems.length === 0) {
      this.invalidate('carouselItems', 'Carousel items are required for carousel type messages');
    } else {
      // Validate each carousel item
      this.carouselItems.forEach((item, index) => {
        if (!item.title) {
          this.invalidate(`carouselItems.${index}.title`, 'Title is required for carousel items');
        }
        
        // Validate buttons
        if (!item.buttons || item.buttons.length === 0) {
          this.invalidate(`carouselItems.${index}.buttons`, 'At least one button is required per carousel item');
        } else {
          item.buttons.forEach((button, buttonIndex) => {
            if (!button.buttonText) {
              this.invalidate(`carouselItems.${index}.buttons.${buttonIndex}.buttonText`, 'Button text is required');
            }
            
            if (button.buttonType === 'url' && (!button.buttonUrl || button.buttonUrl.trim() === '')) {
              this.invalidate(`carouselItems.${index}.buttons.${buttonIndex}.buttonUrl`, 'URL is required for URL type buttons');
            } else if (button.buttonType === 'payload' && (!button.buttonPayload || button.buttonPayload.trim() === '')) {
              this.invalidate(`carouselItems.${index}.buttons.${buttonIndex}.buttonPayload`, 'Payload is required for payload type buttons');
            }
          });
        }
      });
    }
  }
  
  next();
});

// Check if the model already exists before creating it
module.exports = mongoose.models.WelcomePage || mongoose.model('WelcomePage', welcomePageSchema);