const express = require('express');
const router = express.Router();
const StoryCommentAutomationRule = require('../models/StoryCommentAutomationRule'); // Adjust the path to your model file
const StoryComment = require('../models/StoryComment'); 
const { v4: uuidv4 } = require('uuid');

//================================================================
// CREATE: Save new story automation rules
//================================================================
router.post("/comment-automation", async (req, res) => {
  const { tenentId, automationRules } = req.body;

  // Basic validation
  if (!tenentId || !Array.isArray(automationRules) || automationRules.length === 0) {
    return res.status(400).json({ 
      success: false, 
      message: "Missing tenentId or automationRules" 
    });
  }
console.log("tenant id for story",tenentId);
  try {
    const savedRules = [];
    for (const rule of automationRules) {
      const { 
        triggerText, 
        replyText,
        ruleType,
        templateItems, // Use the new field names from the React component
        templateCount
      } = rule;

      // Create a new rule instance using the StoryCommentAutomationRule model
      const newRule = new StoryCommentAutomationRule({
        ruleId: uuidv4(), // Generate a unique ID for the rule
        tenentId,
        triggerText,
        replyText,
        ruleType: ruleType || 'text', // Default to 'text' if not provided
        
        // The Mongoose pre-save hook will handle compatibility, 
        // but we'll save to the new fields directly for clarity.
        templateItems: ruleType === 'template' ? templateItems : [],
        templateCount: ruleType === 'template' ? templateCount : 0
      });

      const saved = await newRule.save();
      savedRules.push(saved);
      console.log('Saved story automation rule:', saved);
    }

    return res.status(201).json({ 
      success: true, 
      message: "Story automation rules saved successfully!",
      data: savedRules
    });

  } catch (error) {
    console.error('Error saving story automation rules:', error.message);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to save story automation rules", 
      error: error.message 
    });
  }
});


//================================================================
// READ: Fetch all existing story automation rules for a tenant
//================================================================
router.get("/rules", async (req, res) => {
  const { tenentId } = req.query;

  if (!tenentId) {
    return res.status(400).json({ success: false, message: "Missing tenentId" });
  }

  try {
    const rules = await StoryCommentAutomationRule.find({ tenentId });

    if (!rules || rules.length === 0) {
      // Return 404 if no rules are found, which is expected by the frontend
      return res.status(404).json({ success: false, message: "No story automation rules found for this tenant" });
    }

    return res.status(200).json({ success: true, rules: rules });
    
  } catch (error) {
    console.error("Error fetching story automation rules:", error.message);
    return res.status(500).json({ success: false, message: "Failed to fetch rules", error: error.message });
  }
});


//================================================================
// UPDATE: Edit an existing story automation rule
//================================================================
router.put("/rule/:ruleId", async (req, res) => {
  const { ruleId } = req.params;
  const { 
    tenentId, 
    triggerText, 
    replyText,
    ruleType,
    templateItems, // From frontend state
    templateCount  // From frontend state
  } = req.body;

  // Validate required fields
  if (!ruleId || !tenentId || !triggerText) {
    return res.status(400).json({ 
      success: false, 
      message: "Missing required fields (ruleId, tenentId, or triggerText)" 
    });
  }

  // Validate rule-specific fields
  if (ruleType === 'text' && !replyText) {
    return res.status(400).json({ success: false, message: "Missing replyText for text rule type" });
  }
  if (ruleType === 'template' && (!templateItems || templateItems.length === 0)) {
    return res.status(400).json({ success: false, message: "Template must have at least one item" });
  }

  try {
    // Ensure the rule exists and belongs to the correct tenant before updating
    const existingRule = await StoryCommentAutomationRule.findOne({ ruleId, tenentId });

    if (!existingRule) {
      return res.status(404).json({ 
        success: false, 
        message: "Rule not found or you do not have permission to edit it" 
      });
    }

    // Construct the update object
    const updateData = {
      triggerText,
      replyText: ruleType === 'text' ? replyText : undefined, // Clear replyText if not a text rule
      ruleType,
      templateItems: ruleType === 'template' ? templateItems : [],
      templateCount: ruleType === 'template' ? templateCount : 0,
      updatedAt: new Date()
    };
    
    // Find the rule by its ruleId and tenantId and update it
    const updatedRule = await StoryCommentAutomationRule.findOneAndUpdate(
      { ruleId, tenentId },
      updateData,
      { new: true } // This option returns the document after it has been updated
    );
    
    console.log(`Updated story rule with ID: ${ruleId}`, updatedRule);
    
    return res.status(200).json({ 
      success: true, 
      message: "Story rule updated successfully",
      rule: updatedRule
    });
    
  } catch (error) {
    console.error("Error updating story rule:", error.message);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to update story rule", 
      error: error.message 
    });
  }
});


//================================================================
// DELETE: Remove a story automation rule by its ID
//================================================================
router.delete("/rule/:ruleId", async (req, res) => {
  const { ruleId } = req.params;
  const { tenentId } = req.query; // tenentId is passed as a query parameter in the frontend

  if (!ruleId || !tenentId) {
    return res.status(400).json({ 
      success: false, 
      message: "Missing ruleId or tenentId" 
    });
  }

  try {
    // First, verify the rule exists and belongs to the tenant to ensure security
    const rule = await StoryCommentAutomationRule.findOne({ ruleId, tenentId });

    if (!rule) {
      return res.status(404).json({ 
        success: false, 
        message: "Rule not found or you do not have permission to delete it" 
      });
    }

    // Delete the rule
    await StoryCommentAutomationRule.deleteOne({ ruleId, tenentId });
    
    console.log(`Deleted story rule with ID: ${ruleId}`);
    
    return res.status(200).json({ 
      success: true, 
      message: "Story automation rule deleted successfully" 
    });
    
  } catch (error) {
    console.error("Error deleting story rule:", error.message);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to delete rule", 
      error: error.message 
    });
  }
});


router.get("/rules-by-reply", async (req, res) => {
  const { tenentId } = req.query;

  if (!tenentId) {
    return res.status(400).json({ success: false, message: "Missing tenentId" });
  }

  try {
    const rulesWithReplies = await StoryComment.aggregate([
      // Stage 1: Filter by the correct tenant
      { $match: { tenentId: tenentId } },
      
      // Stage 2: Group the replies by the rule that triggered them
      { 
        $group: { 
          _id: "$ruleId", // Group by the ruleId field
          replyCount: { $sum: 1 }, // Count how many replies this rule generated
          lastReplyTimestamp: { $max: "$Timestamp" } // Find the most recent reply time for sorting
        } 
      },

      // Stage 3: Join with the StoryCommentAutomationRule collection to get the triggerText
      {
        $lookup: {
          from: "storycommentautomationrules", // The collection name for StoryCommentAutomationRule model
          localField: "_id", // The ruleId from our $group stage
          foreignField: "ruleId", // The matching ruleId in the rules collection
          as: "ruleDetails" // The name of the new array field to add
        }
      },
      
      // Stage 4: $lookup returns an array. Deconstruct it to a single object.
      { $unwind: "$ruleDetails" },

      // Stage 5: Reshape the data to a clean format for the frontend
      {
        $project: {
          _id: 0, // Exclude the default _id
          ruleId: "$_id",
          triggerText: "$ruleDetails.triggerText",
          replyCount: "$replyCount",
          timestamp: "$lastReplyTimestamp"
        }
      },

      // Stage 6: Sort by the most recently active rule
      { $sort: { timestamp: -1 } }
    ]);
    console.log("rulesWithReplies",rulesWithReplies);
    return res.status(200).json({ 
      success: true, 
      data: rulesWithReplies 
    });
    
  } catch (error) {
    console.error("Error fetching rules by reply:", error.message);
    return res.status(500).json({ success: false, message: "Failed to fetch rules by reply" });
  }
});


//================================================================
// 2. GET /replies-by-rule/:ruleId
//    Fetches all replies for a specific automation rule.
//================================================================
router.get("/replies-by-rule/:ruleId", async (req, res) => {
  const { ruleId } = req.params;
  const { tenentId } = req.query;
  
  if (!ruleId || !tenentId) {
    return res.status(400).json({ success: false, message: "Missing ruleId or tenentId" });
  }
  
  try {
    const replies = await StoryComment.find({ 
      ruleId: ruleId,
      tenentId: tenentId
    }).sort({ Timestamp: -1 }).limit(50);
    
    return res.status(200).json({
      success: true,
      count: replies.length,
      replies: replies
    });
    
  } catch (error) {
    console.error("Error fetching replies for rule:", error.message);
    return res.status(500).json({ success: false, message: "Failed to fetch replies for this rule" });
  }
});


module.exports = router;
