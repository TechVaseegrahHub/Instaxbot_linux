const express = require('express');
const axios = require('axios');
const router = express.Router();
const LongToken = require('../models/LongToken');
const CommentAutomationRule = require('../models/CommentAutomationRule');
const Comment = require('../models/Comment');
const { v4: uuidv4 } = require('uuid'); 
// Route to check token


router.get("/comments-by-media", async (req, res) => {
  const tenentId = req.query.tenentId;
  
  if (!tenentId) {
    return res.status(400).json({ success: false, message: "Missing tenentId" });
  }

  try {
    // First, get the Instagram access token
    const latestToken = await LongToken.findOne({ tenentId }).sort({ createdAt: -1 });

    if (!latestToken || !latestToken.userAccessToken) {
      return res.status(404).json({ success: false, message: "Access token not found for this tenent" });
    }

    // First, get unique media IDs from comments collection
    const commentsByMedia = await Comment.aggregate([
      { $match: { tenentId: tenentId } },
      { $group: { _id: "$mediaId", count: { $sum: 1 } } }
    ]);
    console.log("commentsByMedia",commentsByMedia);
    // If no comments found, return empty array
    if (commentsByMedia.length === 0) {
      return res.status(200).json({ 
        success: true, 
        data: [] 
      });
    }

    // Extract media IDs from comments data
    const mediaIds = commentsByMedia.map(item => item._id);
    
    // Create a map of mediaId -> count for faster lookup
    const commentCountMap = {};
    commentsByMedia.forEach(item => {
      commentCountMap[item._id] = item.count;
    });

    // Fetch details for each media ID from Instagram
    const enrichedMedia = [];
    
    // Process media IDs in batches to avoid rate limiting
    // Instagram Graph API allows fetching one media item at a time
    for (const mediaId of mediaIds) {
      try {
        const mediaResponse = await axios.get(`https://graph.instagram.com/${mediaId}`, {
          params: {
            access_token: latestToken.userAccessToken,
            fields: 'id,media_type,media_url,thumbnail_url,caption,timestamp,permalink'
          }
        });
        
        if (mediaResponse.data) {
          const media = mediaResponse.data;
          enrichedMedia.push({
            ...media,
            commentCount: commentCountMap[media.id] || 0,
            // Use thumbnail_url for videos or media_url for images
            displayUrl: media.media_type === 'VIDEO' ? media.thumbnail_url : media.media_url
          });
        }
      } catch (error) {
        console.error(`Error fetching media ${mediaId}:`, error.response?.data || error.message);
        // Continue with other media IDs even if one fails
      }
    }

    //console.log("enrichedMedia", enrichedMedia);
    return res.status(200).json({ 
      success: true, 
      data: enrichedMedia 
    });
    
  } catch (error) {
    console.error("Error fetching comments by media:", error.response?.data || error.message);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to fetch comments by media", 
      error: error.message 
    });
  }
});

// Get comments for a specific media ID
router.get("/media-comments/:mediaId", async (req, res) => {
  const { mediaId } = req.params;
  const tenentId = req.query.tenentId;
  
  if (!mediaId || !tenentId) {
    return res.status(400).json({ success: false, message: "Missing mediaId or tenentId" });
  }
  
  try {
    const comments = await Comment.find({ 
      mediaId: mediaId,
      tenentId: tenentId
    }).sort({ Timestamp: -1 }).limit(20);;
    
    return res.status(200).json({
      success: true,
      count: comments.length,
      comments: comments
    });
    
  } catch (error) {
    console.error("Error fetching comments for media:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch comments for this media",
      error: error.message
    });
  }
});


router.get("/check-token", async (req, res) => {
  const tenentId = req.query.tenentId;

  if (!tenentId) {
    return res.status(400).json({ success: false, message: "Missing tenentId" });
  }

  try {
    const latestToken = await LongToken.findOne({ tenentId }).sort({ createdAt: -1 });

    if (latestToken) {
      console.log('Latest token retrieved for Profile_information:', latestToken);
      return res.status(200).json({ success: true, valid: true, token: latestToken.userAccessToken });
    } else {
      return res.status(404).json({ success: false, valid: false, message: "No access token found for this tenent" });
    }
  } catch (error) {
    console.error("Error checking token:", error);
    return res.status(500).json({ success: false, message: "Server error while checking token" });
  }
});

// Route to fetch media
router.get("/media", async (req, res) => {
  const tenentId = req.query.tenentId;
  console.log("response for tenentId",tenentId);
  if (!tenentId) {
    return res.status(400).json({ success: false, message: "Missing tenentId" });
  }

  try {
    const latestToken = await LongToken.findOne({ tenentId }).sort({ createdAt: -1 });

    if (!latestToken || !latestToken.userAccessToken) {
      console.log("Access token not found");
      return res.status(404).json({ success: false, message: "Access token not found for this tenent" });
    }

    const userAccessToken = latestToken.userAccessToken;

    const igMediaUrl = 'https://graph.instagram.com/me/media';

    const response = await axios.get(igMediaUrl, {
      params: {
        access_token: userAccessToken,
        fields: 'id,media_type,media_url,thumbnail_url,caption,timestamp,permalink',
        limit: 20,
      }
    });
  //console.log("response for media",response);
    if (response.data && response.data.data && response.data.data.length > 0) {
      return res.status(200).json({ success: true, data: response.data.data });
    } else {
      return res.status(404).json({ success: false, message: "No media found for this Instagram account." });
    }
  } catch (error) {
    console.error("Error fetching media:", error.response?.data || error.message);
    return res.status(500).json({ success: false, message: "Failed to fetch media from Instagram." });
  }
});


router.post("/comment-automation", async (req, res) => {
  const { tenentId, automationRules } = req.body;

  console.log("Received from frontend:");
  console.log("tenentId:", tenentId);
  console.log("automationRules:", automationRules);

  if (!tenentId || !automationRules) {
    return res.status(400).json({ success: false, message: "Missing tenentId or automationRules" });
  }

  try {
    for (const rule of automationRules) {
      const { 
        mediaId, 
        commentId, 
        triggerText, 
        replyText,
        ruleType,
        templateItems,
        templateCount
      } = rule;

      // Store as appropriate type in the database
      // If it's a template rule, save it with carousel fields for compatibility
      const ruleData = new CommentAutomationRule({
        ruleId: uuidv4(), // generate unique ID
        tenentId,         // store tenent ID
        mediaId,
        commentId,
        triggerText,
        replyText,
        ruleType: ruleType || 'text', // Keep as 'template' or 'text'
        // If template type, map template items to carousel items
        carouselItems: ruleType === 'template' ? templateItems : undefined,
        carouselCount: ruleType === 'template' ? templateCount : undefined
      });

      await ruleData.save();
      console.log('Saved rule:', ruleData);
    }

    return res.status(200).json({ success: true, message: "Rules saved successfully!" });

  } catch (error) {
    console.error('Error saving rules:', error.message);
    return res.status(500).json({ success: false, message: "Failed to save rules", error: error.message });
  }
});

router.get("/rules", async (req, res) => {
  const tenentId = req.query.tenentId;
  console.log("Request received for rules with tenentId:", tenentId);

  if (!tenentId) {
    return res.status(400).json({ success: false, message: "Missing tenentId" });
  }

  try {
    const rules = await CommentAutomationRule.find({ tenentId });

    if (!rules || rules.length === 0) {
      return res.status(404).json({ success: false, message: "No rules found for this tenentId" });
    }
 //console.log("rules",rules);
    return res.status(200).json({ success: true, rules: rules });
  } catch (error) {
    console.error("Error fetching rules:", error.message);
    return res.status(500).json({ success: false, message: "Failed to fetch rules", error: error.message });
  }
});

// Delete a rule by ID
router.delete("/rule/:ruleId", async (req, res) => {
  const { ruleId } = req.params;
  const tenentId = req.query.tenentId;

  if (!ruleId || !tenentId) {
    return res.status(400).json({ 
      success: false, 
      message: "Missing ruleId or tenentId" 
    });
  }

  try {
    // First check if the rule exists and belongs to this tenant
    const rule = await CommentAutomationRule.findOne({ 
      ruleId,
      tenentId
    });

    if (!rule) {
      return res.status(404).json({ 
        success: false, 
        message: "Rule not found or doesn't belong to this tenant" 
      });
    }

    // Delete the rule
    await CommentAutomationRule.deleteOne({ ruleId });
    
    console.log(`Deleted rule with ID: ${ruleId}`);
    
    return res.status(200).json({ 
      success: true, 
      message: "Rule deleted successfully" 
    });
  } catch (error) {
    console.error("Error deleting rule:", error.message);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to delete rule", 
      error: error.message 
    });
  }
});

// Edit a rule - Updated to handle new rule types
router.put("/rule/:ruleId", async (req, res) => {
  const { ruleId } = req.params;
  const { 
    tenentId, 
    mediaId, 
    triggerText, 
    replyText,
    ruleType,
    templateItems,
    templateCount,
    carouselItems,
    carouselCount
  } = req.body;

  if (!ruleId || !tenentId) {
    return res.status(400).json({ 
      success: false, 
      message: "Missing ruleId or tenentId" 
    });
  }

  if (!mediaId || !triggerText) {
    return res.status(400).json({ 
      success: false, 
      message: "Missing required fields (mediaId or triggerText)" 
    });
  }

  // Validate based on rule type
  if (ruleType === 'text' && !replyText) {
    return res.status(400).json({
      success: false,
      message: "Missing replyText for text rule type"
    });
  }

  if (ruleType === 'template' && (!templateItems || templateItems.length === 0) && (!carouselItems || carouselItems.length === 0)) {
    return res.status(400).json({
      success: false,
      message: "Template must have at least one item"
    });
  }

  try {
    // Check if the rule exists and belongs to this tenant
    const rule = await CommentAutomationRule.findOne({ 
      ruleId,
      tenentId
    });

    if (!rule) {
      return res.status(404).json({ 
        success: false, 
        message: "Rule not found or doesn't belong to this tenant" 
      });
    }

    // Create the update object with the new fields
    const updateData = {
      mediaId,
      triggerText,
      replyText,
      ruleType,
      updatedAt: new Date()
    };
    
    // If template type (carousel), add the items properly
    if (ruleType === 'template') {
      // Use either templateItems or carouselItems depending on what was sent
      updateData.carouselItems = templateItems || carouselItems;
      updateData.carouselCount = templateCount || carouselCount || 
        (templateItems ? templateItems.length : carouselItems ? carouselItems.length : 1);
    }

    // Update the rule
    const updatedRule = await CommentAutomationRule.findOneAndUpdate(
      { ruleId },
      updateData,
      { new: true } // Return the updated document
    );
    
    console.log(`Updated rule with ID: ${ruleId}`, updatedRule);
    
    return res.status(200).json({ 
      success: true, 
      message: "Rule updated successfully",
      rule: updatedRule
    });
  } catch (error) {
    console.error("Error updating rule:", error.message);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to update rule", 
      error: error.message 
    });
  }
});

module.exports = router;