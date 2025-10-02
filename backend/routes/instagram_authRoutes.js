require("dotenv").config();


const Tokeninfo = require('../models/Tokeninfo');
const LongToken = require('../models/LongToken');
const Icebreaker= require('../models/Icebreaker');
const Signup = require('../models/Signup');
const Mainmode = require('../models/Mainmode');
const ProductavailabilityUrl = require('../models/ProductavailabilityUrl');
const OrderstatusUrl = require('../models/OrderstatusUrl');
const PersistentmenuUrl = require('../models/PersistentmenuUrl');
const ecommerceCredentialsService = require('../models/ecommerceCredentialsService');
const axios = require('axios');
const express = require('express');
const { json } = express;
const router = express.Router();
const https = require('https');
const querystring = require('querystring');
const multer = require('multer');
const cors = require('cors');
const upload = multer({ dest: "uploads/" });
const crypto = require('crypto');
const InstaxBotSystemMenu = require('../models/InstaxBotSystemMenu');
router.use(cors({
  origin: '*' // Replace with your client URL
}));



const OpenAI = require('openai');
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY // This is the default and can be omitted
});

const config = require("../services/config");

// Instagram OAuth callback route
router.get('/auth/instagram/callback',async (req, res) => {
    // Extract the authorization code from the query parameters
    const authCode = req.query.code;
    console.log("req.query",req.query);
    const tenantId = req.query.state;
    console.log("Client ID:", config.clientId);
    console.log("Authorization Code:", authCode);
    console.log("Transfered Tenant ID:", tenantId);
    if (!authCode) {
      return res.status(400).send('Authorization code not found');
    }
  
    try {
        const postData = querystring.stringify({
          client_id: process.env.CLIENT_ID,
          client_secret: process.env.CLIENT_SECRET,
  
          grant_type: 'authorization_code',
          redirect_uri: 'https://ddcf6bc6761a.ngrok-free.app/api/instagram_authroute/auth/instagram/callback',
          
          code: authCode
        });
    
        const options = {
          hostname: 'api.instagram.com',
          path: '/oauth/access_token',
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData)
          }
        };
    
        const request = https.request(options, (response) => {
          let data = '';
    
          // Collect the data chunks
          response.on('data', (chunk) => {
            data += chunk;
          });
    
          // Once all the data has been received
          response.on('end', async () => {
            if (response.statusCode === 200) {
              const tokenResponse = JSON.parse(data);
              console.log("tokenResponse",tokenResponse);
              const accessToken = tokenResponse.access_token;
              console.log('Access token received:', accessToken);
              console.log('Access token data:', tokenResponse);
              const shortLivedAccessToken = accessToken; // Replace with your short-lived access token
              const longLivedToken=await getLongLivedAccessToken(shortLivedAccessToken);
              const useriddata=await getInstagramUserIdInformation(longLivedToken)
              if(useriddata){
              const user_id=useriddata.user_id;
              console.log("userid",user_id)
              const tenentId=tenantId;
              const latestToken = await LongToken.findOne({tenentId:tenentId}).sort({ createdAt: -1 }).limit(1);
              if (latestToken) {
                const Instagramconnectedid = latestToken.Instagramid;
  
                if(Instagramconnectedid!=user_id){
                  res.send(`
                <html>
                  <head>
                    <!-- Include SweetAlert library -->
                    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
                  </head>
                  <body>
                    <script>
                      // Show SweetAlert message
                      Swal.fire({
                        title: 'Instagram Authorization Error!',
                        text: "You have already connected a different Instagram account and cannot connect another. If you wish to connect a different Instagram account, please contact Tech Vaseegrah for assistance.",
                        icon: 'error',
                        confirmButtonText: 'Close',
                        didClose: () => {
                          // Notify the parent window
                          if (window.opener) {
                            window.opener.postMessage('instagramConnectionError', '*');
                          }
                          // Close the popup
                          window.close();
                        },
                      });
                    </script>
                  </body>
                </html>
              `);
  
                }
  
                else {
                  const user_id=useriddata.user_id
                console.log("Creating LongToken with data:", {
                userAccessToken: longLivedToken,
                Instagramid: user_id,
                tenentId: tenentId,
              });
              const longtoken = { 
                userAccessToken: longLivedToken,
                Instagramid: user_id,
                tenentId: tenentId 
              };
              const newtoken = new LongToken(longtoken);
                console.log("Creating LongToken with data:", {
                  userAccessToken: longLivedToken,
                  Instagramid: user_id,
                  tenentId: tenentId,
                });
                const savedToken = await newtoken.save();
                console.log('longLivedToken saved:', longLivedToken);
                try {
                  // Add this new code to subscribe to webhook events
                  const subscribeResponse = await axios.post(
                    `https://graph.instagram.com/v21.0/${user_id}/subscribed_apps`,
                    null,  // no request body needed
                    {
                      params: {
                        subscribed_fields: 'messages,message_reactions,messaging_postbacks,messaging_referral,messaging_seen,comments,live_comments',
                        access_token: longLivedToken
                      }
                    }
                  );
                  console.log('Webhook subscription successful:', subscribeResponse.data);
                   if(subscribeResponse.data){
  
              res.send(`
                <html>
    <head>
      <!-- Include SweetAlert library -->
      <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    </head>
    <body>
      <script>
        // Show SweetAlert message
        Swal.fire({
          title: 'Instagram Authorization Successful!',
          text: 'You can close this window.',
          icon: 'success',
          confirmButtonText: 'Close',
          timer: 5000, // Auto-close after 5 seconds
          didClose: () => {
            // Notify the parent window
            if (window.opener) {
              window.opener.postMessage('instagramConnected', '*');
            }
            // Close the popup
            window.close();
          },
        });
      </script>
    </body>
  </html>
              `);
                       }
  
              
              // Continue with existing code
              const savedToken = await newtoken.save();
              console.log('User data1 LongLivedAccessTokensaved:', savedToken);
              setPersistentMenu(persistentMenuPayload,longLivedToken,user_id,tenentId);
              setIceBreakers(longLivedToken,user_id,tenentId);
              //setIceBreakers(iceBreakersPayload,longLivedToken,user_id);
  
            } 
           /* FOR UNSUBCRIBE WEBHOOK
              try {
                const APP_ID = process.env.APP_ID;
                const response = await axios.delete(
                  `https://graph.instagram.com/v21.0/${user_id}/subscribed_apps`,
                  {
                    headers: {
                      'Authorization': `Bearer ${accessToken}`
                    }
                  }
                );
                
                console.log('Successfully unsubscribed from webhooks:', response.data);
                // Continue with existing code
              const savedToken = await newtoken.save();
              console.log('User data1 LongLivedAccessTokensaved:', savedToken);
              setPersistentMenu(persistentMenuPayload,longLivedToken,user_id);
              setIceBreakers(iceBreakersPayload,longLivedToken,user_id);
                
              } */catch (error) {
              console.error('Error subscribing to webhook:',  error.response?.data || error.message);
              res.status(500).send('Error during Instagram authorization');
              //res.status(500).send('Error during nsubscribing to webhook');
              //return;
            }  }}
            else{
              const user_id=useriddata.user_id;
              console.log("Creating LongToken with data:", {
                userAccessToken: longLivedToken,
                Instagramid: user_id,
                tenentId: tenentId,
              });
              const longtoken = { 
                userAccessToken: longLivedToken,
                Instagramid: user_id,
                tenentId: tenentId 
              };
              const newtoken = new LongToken(longtoken);
                console.log("Creating LongToken with data:", {
                  userAccessToken: longLivedToken,
                  Instagramid: user_id,
                  tenentId: tenentId,
                });
                console.log('longLivedToken saved:', longLivedToken);
                try {
                  // Add this new code to subscribe to webhook events
                  const subscribeResponse = await axios.post(
                    `https://graph.instagram.com/v21.0/${user_id}/subscribed_apps`,
                    null,  // no request body needed
                    {
                      params: {
                        subscribed_fields: 'messages,message_reactions,messaging_postbacks,messaging_referral,messaging_seen,comments,live_comments',
                        access_token: longLivedToken
                      }
                    }
                  );
                  console.log('Webhook subscription successful:', subscribeResponse.data);
                   if(subscribeResponse.data){
  
              res.send(`
                <html>
    <head>
      <!-- Include SweetAlert library -->
      <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    </head>
    <body>
      <script>
        // Show SweetAlert message
        Swal.fire({
          title: 'Instagram Authorization Successful!',
          text: 'You can close this window.',
          icon: 'success',
          confirmButtonText: 'Close',
          timer: 5000, // Auto-close after 5 seconds
          didClose: () => {
            // Notify the parent window
            if (window.opener) {
              window.opener.postMessage('instagramConnected', '*');
            }
            // Close the popup
            window.close();
          },
        });
      </script>
    </body>
  </html>
              `);
                       }
  
              
              // Continue with existing code
              const savedToken = await newtoken.save();
              console.log('User data1 LongLivedAccessTokensaved:', savedToken);
              setPersistentMenu(persistentMenuPayload,longLivedToken,user_id,tenentId);
              setIceBreakers(longLivedToken,user_id,tenentId);
              //setIceBreakers(iceBreakersPayload,longLivedToken,user_id);
  
            } 
           /* FOR UNSUBCRIBE WEBHOOK
              try {
                const APP_ID = process.env.APP_ID;
                const response = await axios.delete(
                  `https://graph.instagram.com/v21.0/${user_id}/subscribed_apps`,
                  {
                    headers: {
                      'Authorization': `Bearer ${accessToken}`
                    }
                  }
                );
                
                console.log('Successfully unsubscribed from webhooks:', response.data);
                // Continue with existing code
              const savedToken = await newtoken.save();
              console.log('User data1 LongLivedAccessTokensaved:', savedToken);
              setPersistentMenu(persistentMenuPayload,longLivedToken,user_id);
              setIceBreakers(iceBreakersPayload,longLivedToken,user_id);
                
              } */catch (error) {
              console.error('Error subscribing to webhook:',  error.response?.data || error.message);
              res.status(500).send('Error during Instagram authorization');
              //res.status(500).send('Error during nsubscribing to webhook');
              //return;
            } 
  
  
  
  
            }
                
        
          
            }
              else {
                console.error('Error:', data);
                res.status(500).send('Error during Instagram authorization');
              }
              
            } else {
              console.error('Error:', data);
              res.status(500).send('Error during Instagram authorization');
            }
          });
        });
    
        request.on('error', (e) => {
          console.error('Error exchanging authorization code:', e.message);
          res.status(500).send('Error during Instagram authorization');
        });
    
        // Send the post data
        request.write(postData);
        request.end();
    
      } catch (error) {
        console.error('Unexpected error:', error);
        res.status(500).send('Unexpected error during Instagram authorization');
      }
    });
  
    async function getLongLivedAccessToken(shortLivedAccessToken) {
      console.log('Access token received:', shortLivedAccessToken);
      console.log("CLIENT_ID from .env:", process.env.CLIENT_ID);
      try {
        const response = await axios.get(`https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${process.env.CLIENT_SECRET}&access_token=${shortLivedAccessToken}`);
       
       //console.log("longlive token data:", tokendata);
       const longLivedToken = response.data.access_token;
       
       console.log('longLivedToken :', longLivedToken);
       //console.log('Instagram app id :', Instagram_app_id);
       const token = new Tokeninfo({ userAccessToken: longLivedToken});
       try {
        const savedToken = await token.save();
        console.log('User data LongLivedAccessTokensaved:', savedToken);
      } catch (error) {
        console.error('Error saving LongLivedAccessToken data:', error);
      }
       return longLivedToken;
      } catch (error) {
        console.error('Error obtaining long-lived token:', error.response ? error.response.data : error.message);
        return {
          success: false,
          error: error.response ? error.response.data : error.message
        };
      }
    }
  
  
  module.exports = {
    port: process.env.PORT || 5000, // Default to 5000 if PORT is not defined
  };
  
  
  // Data deletion request handler
  router.post('/auth/instagram/data_deletion', (req, res) => {
    console.log("app secret",config.clientSecret)
    console.log('Deletion request received:', req.body);
    const { signed_request: signedRequest } = req.body;
    const secret = config.clientSecret; // Replace with your Instagram app secret
  
    if (!signedRequest) {
        return res.status(400).send('Missing signed request');
    }
  
    // Verify and parse the signed request
    const data = parseSignedRequest(signedRequest, secret);
    if (!data) {
        return res.status(400).send('Invalid signed request');
    }
  
    const userId = data.user_id;
  
    // Start the data deletion process (e.g., delete user data from your database)
    console.log(`Starting data deletion for user: ${userId}`);
  
    // Generate a unique confirmation code and URL to track the deletion status
    const confirmationCode = 'abc123'; // Generate a unique code for the deletion request
    const statusUrl = `https://ddcf6bc6761a.ngrok-free.app/api/instagram_authroute/auth/instagram/data_deletion?id=${confirmationCode}`;
  
    // Send the response with the tracking URL and confirmation code
    res.json({
        url: statusUrl,
        confirmation_code: confirmationCode
    });
  });
  
  // Function to parse and verify the signed_request
  function parseSignedRequest(signedRequest, appSecret) {
    const [encodedSig, payload] = signedRequest.split('.');
  
    // Decode the data from Base64
    const sig = Buffer.from(encodedSig, 'base64'); // Raw bytes, not a string
    const data = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
  
    // Check algorithm (it should always be HMAC-SHA256)
    if (data.algorithm && data.algorithm.toUpperCase() !== 'HMAC-SHA256') {
        console.error('Unknown algorithm: ' + data.algorithm);
        return null;
    }
  
    // Recalculate the signature using the app secret
    const expectedSig = crypto.createHmac('sha256', appSecret)
        .update(payload)
        .digest(); // Generate raw bytes (Buffer)
  
    // Compare the recalculated signature with the received signature
    if (!crypto.timingSafeEqual(sig, expectedSig)) {
        console.log('Received sig:', sig);
        console.log('Expected sig:', expectedSig);
      
        console.error('Bad Signed JSON signature!');
        return null;
    }
  
    return data;
  }
  
  // Function to base64 decode a string
  function base64UrlDecode(str) {
    return Buffer.from(str, 'base64').toString('utf8');
  }
  
  
  
  
  
  
  
      // Instagram Deauthorization callback handler
  router.post('/auth/instagram/deauthorize', upload.none(), (req, res) => {
    console.log('Headers:', req.headers);
  
    console.log('Deauthorize request received:', req.body);
    const { 'signed_request': signedRequest } = req.body;
    const secret = config.clientSecret; // Replace with your Instagram app secret
  
    if (!signedRequest) {
        return res.status(400).send('Missing signed request');
    }
  
    const [encodedSig, payload] = signedRequest.split('.');
  
    // Verify signature
    const expectedSig = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/={1,2}$/, '');
  
    if (encodedSig !== expectedSig) {
        return res.status(400).send('Invalid signature');
    }
  
    // Parse the payload to get the user_id
    const data = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
  
    const userId = data.user_id;
    console.log(`Deauthorization for user: ${userId}`);
  
    // Perform any necessary cleanup (e.g., removing user data from your database)
    // Example:
    // await deleteUserFromDatabase(userId);
  
    // Respond to Instagram with status 200
    res.sendStatus(200);
  });
  
  async function getInstagramUserIdInformation(userAccessToken){
    
     
    const accessToken = userAccessToken;
    try {
      const response = await axios.get(`https://graph.instagram.com/v21.0/me`, {
        params: {
          fields: 'name,username,user_id',
          access_token: accessToken
        }
      });
      
      // Check if the response data is defined
      if (response.data) {
        console.log('User Profile:', response.data);
        return response.data
      } else {
        console.log('Response data is undefined.');
      }
    } catch (error) {
      if (error.response) {
        // Log the error response from the API
        console.error('Error fetching user profile:', error.response.status, error.response.data);
      } else {
        console.error('Error fetching user profile:', error.message);
      }
    }
    };
    
  
  
  
  
  
  
  async function getInstagramUserProfileInformation(senderId,tenentId){
    const IGSID = senderId;
    let userAccessToken;
    console.log('sender:',IGSID);
    const latestToken = await LongToken.findOne({tenentId:tenentId}).sort({ createdAt: -1 }).limit(1);
    if (latestToken) {
      console.log('Latest token retrieved for Profile_infoemation:', latestToken);
      userAccessToken = latestToken.userAccessToken;
    } 
    const accessToken = userAccessToken;
    try {
      const response = await axios.get(`https://graph.instagram.com/v21.0/${IGSID}`, {
        params: {
          fields: 'name,username,user_id',
          access_token: accessToken
        }
      });
    
      // Check if the response data is defined
      if (response.data) {
        console.log('User Profile:', response.data);
        return response.data
      } else {
        console.log('Response data is undefined.');
      }
    } catch (error) {
      if (error.response) {
        // Log the error response from the API
        console.error('Error fetching user profile:', error.response.status, error.response.data);
      } else {
        console.error('Error fetching user profile:', error.message);
      }
    }
    };
  //Instagram's user Profile information
  async function getUserProfileInformation(senderId,tenentId){
  const IGSID = senderId;
  let userAccessToken;
  console.log('sender:',IGSID);
  const latestToken = await LongToken.findOne({tenentId:tenentId}).sort({ createdAt: -1 }).limit(1);
  if (latestToken) {
    console.log('Latest token retrieved for Profile_infoemation:', latestToken);
    userAccessToken = latestToken.userAccessToken;
  } 
  const accessToken = userAccessToken;
  try {
    const response = await axios.get(`https://graph.instagram.com/v21.0/${IGSID}`, {
      params: {
        fields: 'name,username,profile_pic',
        access_token: accessToken
      }
    });
  
    // Check if the response data is defined
    if (response.data) {
      console.log('User Profile:', response.data);
      return response.data
    } else {
      console.log('Response data is undefined.');
    }
  } catch (error) {
    if (error.response) {
      // Log the error response from the API
      console.error('Error fetching user profile:', error.response.status, error.response.data);
    } else {
      console.error('Error fetching user profile:', error.message);
    }
  }
  };
  // Parse application/json. Verify that callback came from Facebook
  router.use(json({ verify: verifyRequestSignature }));

  // Verify that the callback came from Facebook.
function verifyRequestSignature(req, res, buf) {
    const signature = req.headers["x-hub-signature"];
  
    if (!signature) {
      console.warn(`Couldn't find "x-hub-signature" in headers.`);
    } else {
      const elements = signature.split("=");
      const signatureHash = elements[1];
      const expectedHash = crypto
        .createHmac("sha1", config.appSecret)
        .update(buf)
        .digest("hex");
      if (signatureHash != expectedHash) {
        throw new Error(
          "Couldn't validate the request signature. Confirm your App Secret."
        );
      }
   
    }
  }
  let persistentMenuPayload = null;
  async function setupPersistentMenu(tenentId, userAccessToken, recipientID) {
    try {
        const signupdata = await Signup.findOne({ tenentId: tenentId }).sort({ createdAt: -1 }).limit(1);
        
        if (signupdata) {
            const username = signupdata.name;
            let websiteurl;
            let wooCredentials;
            let shopifyCredentials;
            
            try {
                const storeCredentials = await ecommerceCredentialsService.getCredentialsForAPI(tenentId);
                
                if(storeCredentials && storeCredentials.websites && storeCredentials.websites.length > 0) {
                    const wooCommerceWebsite = storeCredentials.websites.find(website => website.type === 'woocommerce');
                    const shopifyWebsite = storeCredentials.websites.find(website => website.type === 'shopify');
                    
                    wooCredentials = wooCommerceWebsite ? wooCommerceWebsite.credentials : null;
                    shopifyCredentials = shopifyWebsite ? shopifyWebsite.credentials : null;
                    console.log("wooCredentials", wooCredentials);
                    
                    if (wooCredentials) {
                        websiteurl = wooCredentials.url;
                        console.log("WooCommerce credentials found");
                    }
                    if (shopifyCredentials) {
                        websiteurl = shopifyCredentials.websiteUrl;
                        console.log("Shopify credentials found");
                    }
                } else {
                    console.error("No store credentials found for this account.");
                }
            } catch (error) {
                console.error("Error retrieving or processing store credentials:", error);
            }

            // **NEW: Fetch saved system menu data first**
            let savedSystemMenu = null;
            try {
                // Replace 'SystemMenu' with your actual model name
                savedSystemMenu = await InstaxBotSystemMenu.findOne({ tenentId: tenentId })
                    .sort({ createdAt: -1 })
                    .limit(1);
                console.log("Saved system menu data:", savedSystemMenu);
            } catch (error) {
                console.error("Error fetching saved system menu:", error);
            }

            const latestMainMode = await Mainmode.findOne({ tenentId })
                .sort({ createdAt: -1 });
            
            const currentMainMode = latestMainMode?.mainmode || 'offline';
            console.log("Current main mode:", currentMainMode);

            let persistentMenuPayload = null; // Initialize to null

            // **PRIORITY: Use saved system menu data if available**
            if (savedSystemMenu && savedSystemMenu.payloads && savedSystemMenu.payloads.length > 0) {
                console.log("Using saved system menu configuration");
                
                const callToActions = [];
                
                // Process saved payloads
                for (const item of savedSystemMenu.payloads) {
                    if (item.type === 'payload') {
                        callToActions.push({
                            type: "postback",
                            title: item.title,
                            payload: item.value
                        });
                    } else if (item.type === 'web-url') {
                        callToActions.push({
                            type: "web_url",
                            title: item.title,
                            url: item.value,
                            webview_height_ratio: "full"
                        });
                    }
                }

                persistentMenuPayload = {
                    platform: "instagram",
                    persistent_menu: [
                        {
                            composer_input_disabled: false,
                            locale: "default",
                            call_to_actions: callToActions
                        }
                    ]
                };
            } else {
                // **FALLBACK: Use existing logic if no saved system menu data**
                console.log("No saved system menu found, using default configuration");
                
                if (wooCredentials || shopifyCredentials) {
                    if (wooCredentials) {
                        websiteurl = wooCredentials.url;
                    }
                    if (shopifyCredentials) {
                        websiteurl = shopifyCredentials.websiteUrl;
                    }
                    
                    persistentMenuPayload = {
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
                                        type: "postback",
                                        title: "Browse Our Product",
                                        payload: "PRODUCT_CATAGORY"
                                    },
                                    {
                                        type: "web_url",
                                        title: "Visit Website",
                                        url: websiteurl,
                                        webview_height_ratio: "full"
                                    }
                                ]
                            }
                        ]
                    };
                } else {
                    persistentMenuPayload = {
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
                                        type: "postback",
                                        title: "Browse Our Product",
                                        payload: "PRODUCT_CATAGORY"
                                    }
                                ]
                            }
                        ]
                    };
                }
            }

            console.log('Final Instagram persistentMenuPayload:', JSON.stringify(persistentMenuPayload, null, 2));
            return persistentMenuPayload;
        } else {
            console.log("No signup data found for tenentId:", tenentId);
            return null;
        }

    } catch (error) {
        console.error("Error setting up persistent menu:", error);
        return null;
    }
}
  
async function setPersistentMenu(persistentMenuPayload, userAccessToken, recipientID, tenentId) {
    try {
        // Get the persistent menu payload from setupPersistentMenu
        persistentMenuPayload = await setupPersistentMenu(tenentId, userAccessToken, recipientID);
        
        console.log('Instagram ID received:', recipientID);
        console.log('User Access Token received:', userAccessToken);
        console.log('Tenant ID received:', tenentId);
        console.log('Instagram persistentMenuPayload:', JSON.stringify(persistentMenuPayload, null, 2));

        // Validate that we have a valid payload
        if (!persistentMenuPayload || !persistentMenuPayload.persistent_menu) {
            console.error('Invalid persistent menu payload generated');
            return {
                success: false,
                error: 'Invalid persistent menu payload generated'
            };
        }

        // Validate that we have at least one menu action
        if (!persistentMenuPayload.persistent_menu[0] || 
            !persistentMenuPayload.persistent_menu[0].call_to_actions || 
            persistentMenuPayload.persistent_menu[0].call_to_actions.length === 0) {
            console.error('No menu actions found in persistent menu payload');
            return {
                success: false,
                error: 'No menu actions configured'
            };
        }

        const url = `https://graph.instagram.com/v21.0/${recipientID}/messenger_profile`;

        // Post persistent menu data to Instagram API
        const response = await axios.post(url, persistentMenuPayload, {
            headers: {
                'Authorization': `Bearer ${userAccessToken}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('Persistent menu successfully created:', response.data);

        // Optional: Save the successful menu setup to database for tracking
        try {
            // You can create a model to track successful menu deployments
            // Example: await MenuDeployment.create({
            //     tenentId: tenentId,
            //     recipientID: recipientID,
            //     menuPayload: persistentMenuPayload,
            //     deployedAt: new Date(),
            //     status: 'success'
            // });
        } catch (dbError) {
            console.error('Error saving menu deployment record:', dbError);
            // Don't fail the main operation if database logging fails
        }

        return {
            success: true,
            data: response.data,
            menuPayload: persistentMenuPayload
        };

    } catch (error) {
        console.error('Error creating persistent menu:', error.response ? error.response.data : error.message);
        
        // Optional: Save the failed menu setup to database for debugging
        try {
            // Example: await MenuDeployment.create({
            //     tenentId: tenentId,
            //     recipientID: recipientID,
            //     menuPayload: persistentMenuPayload,
            //     deployedAt: new Date(),
            //     status: 'failed',
            //     error: error.response ? error.response.data : error.message
            // });
        } catch (dbError) {
            console.error('Error saving failed menu deployment record:', dbError);
        }

        return {
            success: false,
            error: error.response ? error.response.data : error.message,
            menuPayload: persistentMenuPayload
        };
    }
}
    //const recipientId = userData.recipientId;
    //recipientID='17841463916417636';
    //userAccessToken="IGQWROTDZASeHJMZA3NNUWloUlJNbEpsMS1xR2tEcDI0WGcwbFJKSGdXRWRxUk9kRGFrYWpmX1dNNTNEeG04MUpQblhGUk9IaEJwSU82Y01GZAFJwb1dIY2hQeUtla1E4WDFVZAUxxcWNBbzd2UQZDZD";
    
   // setPersistentMenu(persistentMenuPayload);
  /*
   const iceBreakersPayload = {
    platform: "instagram",
    ice_breakers: [
        {
            
            locale: "default",
            call_to_actions: [
                {
                    question: "How do I place an order?",
                    payload: "ORDER"
                },
                {
                    question: "How long does delivery take?",
                    payload: "DELIVERY"
                },
                {
                    question: "Can I track my order?",
                    payload: "TRACK"
                }
            ]
             // Ensure to specify locale here
        }
    ]
  };*/
  
  const getQuestions = async (tenantId) => {
    try {
      // Fetch the questions for the given tenantId
      const result = await Icebreaker.find({ tenentId: tenantId }, 'questions');
      console.log("result",result);
      if (result.length > 0) {
        // Flatten the questions from all documents
        const allQuestions = result.map(item => item.questions).flat();
        
        // Create the iceBreakersPayload dynamically based on the questions
        const iceBreakersPayload = {
          platform: "instagram",
          ice_breakers: [
            {
              locale: "default",
              call_to_actions: allQuestions.map((question, index) => ({
                question: question,
                payload: `QUESTION_${index + 1}`
              }))
            }
          ]
        };
  
        // Log the payload or return it
        console.log(JSON.stringify(iceBreakersPayload, null, 2));
        return iceBreakersPayload;
      } else {
        console.log('No questions found for this tenant.');
        return null;
      }
    } catch (error) {
      console.error("Error fetching questions:", error);
      throw error;
    }
  };
  async function setIceBreakers(userAccessToken,recipientID,tenentId) {
    const iceBreakersPayload=await getQuestions(tenentId);
     console.log('iceBreakersPayload:', iceBreakersPayload);
   console.log('Instagram ID received iceBreakers:', recipientID);
   console.log('User Access Token received iceBreakers:', userAccessToken);
   
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
  
  //setIceBreakers(iceBreakersPayload);

  module.exports = router;