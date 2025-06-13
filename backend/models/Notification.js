const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  senderId: { type: String, required: true },
  tenentId: { type: String, required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  ID: { type: String ,required: true},
  createdAt: { type: Date, default: Date.now },
  
});

module.exports = mongoose.model('Notification', NotificationSchema);
