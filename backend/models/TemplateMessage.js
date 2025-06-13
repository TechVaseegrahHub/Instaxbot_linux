const mongoose = require('mongoose');

// Define a schema for button options in carousel items
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

// Define a schema for carousel items
const carouselItemSchema = new mongoose.Schema({
  image: String,
  title: String,
  subtitle: String, // Now optional
  buttons: [buttonOptionSchema]
});

// Define the main template message schema
const templateMessageSchema = new mongoose.Schema({
  // Common fields
  tenentId: { type: String, required: true },
  title: { type: String, required: true },
  payload: { type: String, required: true },
  
  // Message type
  messageType: {
    type: String,
    enum: ['text', 'carousel'],
    required: true
  },
  
  // Text message content (optional, required only if type is 'text')
  text: String,
  
  // Carousel items (optional, required only if type is 'carousel')
  carouselItems: [carouselItemSchema]
  
}, { timestamps: true });

// Add validation to ensure required fields based on message type
templateMessageSchema.pre('validate', function(next) {
  if (this.messageType === 'text' && (!this.text || this.text.trim() === '')) {
    this.invalidate('text', 'Text is required for text type messages');
  } else if (this.messageType === 'carousel') {
    if (!this.carouselItems || this.carouselItems.length === 0) {
      this.invalidate('carouselItems', 'Carousel items are required for carousel type messages');
    } else {
      // Validate each carousel item
      this.carouselItems.forEach((item, index) => {
        if (!item.title) {
          this.invalidate(`carouselItems.${index}.title`, 'Title is required for carousel items');
        }
        
        // No validation for subtitle - it's now optional
        
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

const TemplateMessage = mongoose.model('TemplateMessage', templateMessageSchema);
module.exports = TemplateMessage;