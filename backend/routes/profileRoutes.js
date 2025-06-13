require("dotenv").config();

const LongToken = require('../models/LongToken');

const Profile = require('../models/Profile');
const rateLimiter = require('../services/rateLimitService');
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

async function getInstagramUserProfileInformation(senderId, tenentId) {
  const IGSID = senderId;
  let userAccessToken;
  console.log('sender:', IGSID);
  
  const latestToken = await LongToken.findOne({tenentId: tenentId})
    .sort({ createdAt: -1 })
    .limit(1);
    
  if (!latestToken) {
    console.log('No token found for tenant:', tenentId);
    return { username: "Nil", name: "Nil", user_id: senderId };
  }
  
  const userAccessToken1 = latestToken.userAccessToken;
  const accountId = latestToken.Instagramid;

  try {
    // ✅ CHECK RATE LIMIT BEFORE MAKING API CALL
    if (!rateLimiter.canMakeConversationsApiCall(tenentId, accountId, senderId)) {
      console.log(`⚠️  Rate limit exceeded for Conversations API for tenant ${tenentId}, using default profile info`);
      return { username: "Nil", name: "Nil", user_id: senderId };
    }

    const response = await axios.get(`https://graph.instagram.com/v21.0/${IGSID}`, {
      params: {
        fields: 'name,username,user_id',
        access_token: userAccessToken1
      },
      timeout: 10000
    });
  
    if (response.data) {
      console.log('User Profile:', response.data);
      return response.data;
    } else {
      console.log('Response data is undefined.');
      return { username: "Nil", name: "Nil", user_id: senderId };
    }
  } catch (error) {
    if (error.response) {
      console.error('Error fetching user profile:', error.response.status, error.response.data);
      if (error.response.status === 429) {
        console.error('Rate limit exceeded for Instagram API');
        return { username: "Nil", name: "Nil", user_id: senderId };
      }
    } else {
      console.error('Error fetching user profile:', error.message);
    }
    return { username: "Nil", name: "Nil", user_id: senderId };
  }
}

router.get("/profile", async (req,res)=>{
    try{
      const { tenentId} = req.query;
      const data_info = await LongToken.findOne({tenentId: tenentId}).sort({ createdAt: -1 }).limit(1);
      recipientID=data_info.Instagramid;
      
      data1=await getInstagramUserProfileInformation(recipientID,tenentId);
      if(data1){
        console.log("Profile data is found");
      }
      else{
        console.log("Error in Profile");
      }
      // Map through the result to extract the usernames
      const Profileid = await Profile.findOne({ recipientId:recipientID }).sort({ createdAt: -1 }).limit(1);
      console.log("Profileid",Profileid);
      if(Profileid){

        if(!data1.username){
          userName="Nil";
        }
        else{
          userName=data1.username;
        }
        let Name=data1.name;
        if(!Name){
          Name="Nil";
        }
        else{
          Name=data1.name;
        }

        const updateProfile = await Profile.updateOne(
          { recipientId: recipientID }, // Query to find the document
          { 
            $set: { 
              username: userName,
              name: Name
            } 
          } // Update operation
        );
        
        console.log('Profiledata:', updateProfile);
        
          const Profileinfo = await Profile.findOne({recipientId:recipientID}).sort({ createdAt: -1 }).limit(1);
          res.json(Profileinfo);
        
        console.log("updateProfile:", updateProfile);
        
      }
      if(!Profileid){
        //console.log("Profileid is :",Profileid);
        console.log("data1.username is",data1.username);
        let userName=data1.username;
        if(!userName){
          userName="Nil";
        }
        else{
          userName=data1.username;
        }
        let Name=data1.name;
        if(!Name){
          Name="Nil";
        }
        else{
          Name=data1.name;
        }

        const Profiledata = new Profile({
           recipientId: recipientID ,
           username: userName ,
           name: Name
        });
      const savedProfiledata = await Profiledata.save();
      console.log('Profiledata ', savedProfiledata);
      //const Profileinfo = await Profile.findOne({recipientId:recipientID});
      res.json(savedProfiledata);
      
  
  }
  
}
  catch (error) {
    res.status(400).send({ error: "Invalid request" });
  }
  });

  module.exports = router;