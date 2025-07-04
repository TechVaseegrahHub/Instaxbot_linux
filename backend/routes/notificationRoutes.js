require("dotenv").config();

const Notification = require('../models/Notification');
const path = require('path');
const axios = require('axios');
const express = require('express');
const { json } = express;
const router = express.Router();
const multer = require('multer');
const cors = require('cors');

router.use(cors({
  origin: '*' // Replace with your client URL
}));

const fs = require('fs');
const notifhandlers = {
  async getNotifications(ws, data) {  // Add broadcast parameter here
    const { tenentId } = data;
    
    if (!tenentId) {
      ws.send(JSON.stringify({
        type: 'notifications',
        status: 'error',
        message: 'tenentId is required'
      }));
      return;
    }

    try {
      const notifications = await Notification.find({ tenentId })
        .sort({ createdAt: -1 })
        .lean()
        .limit(60);

      // Send to requesting client
      ws.send(JSON.stringify({
        type: 'notifications',
        status: 'success',
        data: notifications
      }));

      // Only broadcast if broadcast function is provided
      /*if (broadcast) {
        broadcast(tenentId, {
          type: 'notifications',
          status: 'success',
          data: notifications
        });
      }*/
    } catch (error) {
      console.error('Error fetching notifications:', error);
      ws.send(JSON.stringify({
        type: 'notifications',
        status: 'error',
        message: 'Error fetching notifications'
      }));
    }
  },
  async markAsRead(ws, data) {
    const { id, tenentId } = data;
    console.log("id,tenentId",id, tenentId);
    if (!tenentId || !id) {
      ws.send(JSON.stringify({
        type: 'notification_update',
        status: 'error',
        message: 'Missing required fields'
      }));
      return;
    }

    try {
      const notification = await Notification.findOneAndUpdate(
        {ID: id, tenentId },
        { $set: { isRead: true } },
        { new: true }
      );

      if (!notification) {
        ws.send(JSON.stringify({
          type: 'notification_update',
          status: 'error',
          message: 'Notification not found'
        }));
        return;
      }
      const response = {
        type: 'notification_update',
        status: 'success',
        data: notification
      };
  
      // Send to requesting client
      ws.send(JSON.stringify(response));
      // Broadcast update to all connected clients for this tenant
      /*if (broadcast) {
      broadcast(tenentId, {
        type: 'notification_update',
        status: 'success',
        data: notification
      });}*/

    } catch (error) {
      console.error('Error marking notification as read:', error);
      ws.send(JSON.stringify({
        type: 'notification_update',
        status: 'error',
        message: 'Error marking notification as read'
      }));
    }
  }
};

module.exports = notifhandlers;