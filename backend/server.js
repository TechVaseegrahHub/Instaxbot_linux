require("dotenv").config();
const connectDB = require('./config/dbcon');
const routes =require('./routes/routes.js');
const WebSocket = require('ws');
const url = require('url');
const https = require('https')
const querystring = require('querystring');
console.log("PORT from .env:", process.env.PORT);
console.log("CLIENT_ID from .env:", process.env.CLIENT_ID);
console.log(process.env.PAGE_ACCESS_TOKEN); 
const axios = require('axios');

const mongoose = require('mongoose');
const Userinfo = require('./models/Userinfo');
const Tokeninfo = require('./models/Tokeninfo');
const User = require('./models/User');
const Message = require('./models/Message');
const Newuser = require('./models/Newuser');
const multer = require('multer');
const debounceInterval = 1000;
//const Mode = require('../models/Mode');
const cors = require('cors');
const upload = multer();
const { router: messageRouter, initializeWebSocket } = require('./routes/messageRoutes');
//const { router: chatmodeRouter, chatmodeinitializeWebSocket } = require('./routes/chatmodeRoutes');
//const contactsRoute = require('./routes/contacts');
//const messagesRoute = require('./routes/messages'); // Adjust the path if necessary
//const textmessageRoute = require('./routes/textmessage');
//const loginRoute = require('./routes/login');
//let processedMessages = new Set();
let messageSent = false;
let instagramUserId;
let mode;
const processedMessages = new Set();
const processedPayloads = new Set();
const TIME_WINDOW_MS = 10*60;
let lastProcessedTime = 0;
//const WebSocket = require('ws');
//const wss = new WebSocket.Server({ port: 8080 });
const fs = require('fs');
global.tenantVectorDBs = {};
const OpenAI = require('openai');
const allowedOrigins = ['http://localhost:5173'];

const session = require('express-session');
// Load your API key from an environment variable or secret management service
// (Don't hard-code your API key in your source code!)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const appUrl = process.env.APP_URL || 'https://ddcf6bc6761a.ngrok-free.app';
console.log('App URL:', appUrl);
// Create an instance of the OpenAI class
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY // This is the default and can be omitted
});// Ensure you have installed the OpenAI Node.js SDK
//const franc = require('franc'); // Placeholder for language detection, use appropriate library

const regex = /\w+/g;
let vectorDB = [];
//const words = userInput.match(regex);
/**
 * Copyright 2021-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */


"use strict";
const bodyParser = require('body-parser');
// Import dependencies and set up http server
var express = require("express"),
  { urlencoded, json } = require("body-parser"),
  
  config = require("./services/config"),
  path = require("path"),
  app = express();
  app.use(express.json());
  app.use(bodyParser.json()); // Add this line to parse JSON data
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(cors({
    origin: 'https://ddcf6bc6761a.ngrok-free.app', // Replace with your client URL
     credentials: true,
}));
/*
app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Use true if using HTTPS
}));*/
// Object to store known users.
//var users = {};
const startServer = async () => {
  try {
    await connectDB();
    // Rest of your server initialization code
  } catch (error) {
    console.error('Server startup failed:', error);
    process.exit(1);
  }
};

startServer();
// Parse application/x-www-form-urlencoded
app.use(
  urlencoded({
    extended: true
  })
);
app.use((req, res, next) => {
    console.log('Incoming request:', req.method, req.url);
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });
  
  connectDB();

  //app.use(express.static(path.join(__dirname, '..', 'frontend', 'dist')));
  
  //app.use('/', routes);
  app.use('/api', routes);
  /*
  app.get("/contacts", async (req,res)=>{
    try{
      const contacts = await Newuser.find({});
    
      // Map through the result to extract the usernames
      
      if(contacts){
      //console.log('List of contacts:', contacts);
      res.json(contacts);
      }
    else {
      console.log('No contacts found in the collection');}
    
  
  }
  catch (error) {
    res.send("error");
  }
  });
*/
/*
  app.get("/messages", async (req, res) => {
    
    try {
      const messages = await Message.find({}).sort({ _id: -1 }).limit(20);
        
        //console.log('List of messages:', messages);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  }); 
*/
  app.get('/test-db', async (req, res) => {
    try {
      const users = await mongoose.model('User').find().limit(1);
      res.json({ message: 'Database connected', userCount: users.length });
    } catch (error) {
      res.status(500).json({ message: 'Database error', error: error.message });
    }
  });


  app.use('/uploads', express.static('uploads'));
  app.use('/images', express.static(path.join(__dirname, 'images')));
  app.use(express.static(path.join(__dirname, '..', 'frontend', 'dist')));
  
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'dist', 'index.html'));
  });
  
  app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  });



/*
  const persistentMenuPayload = {
    platform: "instagram",
    persistent_menu: [
        {
            composer_input_disabled: false,
            locale: "default",
            call_to_actions: [
                {
                    type: "postback",
                    title: "Human Agent",
                    payload: "HUMAN_AGENT"
                },
                {
                    type: "postback",
                    title: "Chatbot",
                    payload: "AI_ASSISTANT"
                },
                {
                    type: "web_url",
                    title: "Visit Website",
                    url: "https://vaseegrahveda.com",
                    webview_height_ratio: "full"
                }
            ]
        }
    ]
};

















async function setPersistentMenu(persistentMenuPayload) {
const l=10;
const latestToken = await Tokeninfo.findOne().sort({ createdAt: -1 }).limit(1);
if (latestToken) {
  console.log('Latest token retrieved for menu:', latestToken);
  userAccessToken = latestToken.userAccessToken;
} 
else {
  console.log('No tokens found in the collection');}
  const latestUser = await Userinfo.findOne().sort({ createdAt: -1 }).limit(1);
  if (latestUser) {
    console.log('Latest user retrieved for menu:', latestUser);
  recipientID= latestUser.recipientId;
} else {
    console.log('No tokens found in the collection');}
  console.log('Instagram ID received:', recipientID);
  console.log('User Access Token received:', userAccessToken);

  const url = `https://graph.instagram.com/v21.0/${recipientID}/messenger_profile`;

  try {
      // Post persistent menu data
      const response = await axios.post(url, persistentMenuPayload, {
          headers: {
              'Authorization': `Bearer ${userAccessToken}`,
              'Content-Type': 'application/json'
          }
      });

      console.log('Persistent menu successfully created:', response.data);

      // You can perform additional actions like saving to the database here if needed
      return {
          success: true,
          data: response.data
      };
  } catch (error) {
      console.error('Error creating persistent menu:', error.response ? error.response.data : error.message);
      return {
          success: false,
          error: error.response ? error.response.data : error.message
      };
  }
}
//const recipientId = userData.recipientId;
//recipientID='17841463916417636';
//userAccessToken="IGQWROTDZASeHJMZA3NNUWloUlJNbEpsMS1xR2tEcDI0WGcwbFJKSGdXRWRxUk9kRGFrYWpmX1dNNTNEeG04MUpQblhGUk9IaEJwSU82Y01GZAFJwb1dIY2hQeUtla1E4WDFVZAUxxcWNBbzd2UQZDZD";

setPersistentMenu(persistentMenuPayload);





const iceBreakersPayload = {
    platform: "instagram",
    ice_breakers: [
        {
            
            locale: "default",
            call_to_actions: [
                {
                    question: "What can I help you with today?",
                    payload: "HELP_PAYLOAD"
                },
                {
                    question: "Do you have any billing questions?",
                    payload: "BILLING_PAYLOAD"
                }
            ]
             // Ensure to specify locale here
        }
    ]
};

async function setIceBreakers(iceBreakersPayload) {
const latestToken = await Tokeninfo.findOne().sort({ createdAt: -1 }).limit(1);
if (latestToken) {
  console.log('Latest token retrieved for IceBreakers:', latestToken);
  userAccessToken = latestToken.userAccessToken;
} 
else {
  console.log('No tokens found in the collection');}
  const latestUser = await Userinfo.findOne().sort({ createdAt: -1 }).limit(1);
  if (latestUser) {
    console.log('Latest user retrieved for IceBreakers:', latestUser);
  recipientID= latestUser.recipientId;
} else {
    console.log('No tokens found in the collection');}
  console.log('Instagram ID received:', recipientID);
  console.log('User Access Token received:', userAccessToken);

  const url = `https://graph.instagram.com/v21.0/${recipientID}/messenger_profile`;

  try {
      // Post ice breakers data
      const response = await axios.post(url, iceBreakersPayload, {
          headers: {
              'Authorization': `Bearer ${userAccessToken}`,
              'Content-Type': 'application/json'
          }
      });

      console.log('Ice breakers successfully created:', response.data);

      // You can perform additional actions like saving to the database here if needed
      return {
          success: true,
          data: response.data
      };
  } catch (error) {
      console.error('Error creating ice breakers:', error.response ? error.response.data : error.message);
      return {
          success: false,
          error: error.response ? error.response.data : error.message
      };
  }
}
//recipientID='17841463916417636';
//userAccessToken="IGQWROTDZASeHJMZA3NNUWloUlJNbEpsMS1xR2tEcDI0WGcwbFJKSGdXRWRxUk9kRGFrYWpmX1dNNTNEeG04MUpQblhGUk9IaEJwSU82Y01GZAFJwb1dIY2hQeUtla1E4WDFVZAUxxcWNBbzd2UQZDZD";

setIceBreakers(iceBreakersPayload);
//const recipientId = userData.recipientId;
//recipientID='17841463916417636';
//userAccessToken="IGQWROTDZASeHJMZA3NNUWloUlJNbEpsMS1xR2tEcDI0WGcwbFJKSGdXRWRxUk9kRGFrYWpmX1dNNTNEeG04MUpQblhGUk9IaEJwSU82Y01GZAFJwb1dIY2hQeUtla1E4WDFVZAUxxcWNBbzd2UQZDZD";

//setPersistentMenu(persistentMenuPayload);


*/






/*

// Serve static files from the Vite frontend app

// Call this function with your userAccessToken when the server starts
app.use(express.static(path.join(__dirname, '../frontend/dist'))); // Update path here

// The "catchall" handler: for any request that doesn't match one above,
app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../frontend/dist', 'index.html')); // Update path here
});
*/



async function main() {
  // Check if all environment variables are set
  config.checkEnvVariables();

  // Set configured locale
  if (config.locale) {
    i18n.setLocale(config.locale);
  }

  

 

  
  // Set our Persistent Menu upon launch
 // await GraphApi.setPersistentMenu(persistentMenu);

  // Set our page subscriptions
  //await GraphApi.setPageSubscriptions();

  // Listen for requests :)
  var listener = app.listen(config.port, function() {
    console.log(`The app is listening on port ${listener.address().port}`);
  });
  const wss = initializeWebSocket(listener);
  //const wss1 = chatmodeinitializeWebSocket(listener);
}

main();
