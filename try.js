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

    // Get unique media IDs from comments collection with comment counts
    const commentsByMedia = await Comment.aggregate([
      { $match: { tenentId: tenentId } },
      { $group: { _id: "$mediaId", count: { $sum: 1 } } }
    ]);
    
    console.log("commentsByMedia", commentsByMedia);
    
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

    // Get the latest automation rule createdAt for each mediaId
    const latestRulesByMedia = await CommentAutomationRule.aggregate([
      { 
        $match: { 
          tenentId: tenentId,
          mediaId: { $in: mediaIds }
        } 
      },
      {
        $group: {
          _id: "$mediaId",
          latestRuleCreatedAt: { $max: "$createdAt" }
        }
      }
    ]);

    // Create a map of mediaId -> latest rule createdAt
    const ruleCreatedAtMap = {};
    latestRulesByMedia.forEach(item => {
      ruleCreatedAtMap[item._id] = item.latestRuleCreatedAt;
    });

    // Fetch details for each media ID from Instagram
    const enrichedMedia = [];
    
    // Process media IDs in batches to avoid rate limiting
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
            displayUrl: media.media_type === 'VIDEO' ? media.thumbnail_url : media.media_url,
            // Add the latest rule creation timestamp for sorting
            latestRuleCreatedAt: ruleCreatedAtMap[media.id] || null
          });
        }
      } catch (error) {
        console.error(`Error fetching media ${mediaId}:`, error.response?.data || error.message);
        // Continue with other media IDs even if one fails
      }
    }

    // Sort the enriched media by latest rule createdAt (most recent first)
    // Media with rules come first, then by rule creation date, then by media timestamp
    const sortedMedia = enrichedMedia.sort((a, b) => {
      // If both have rules, sort by latest rule creation date
      if (a.latestRuleCreatedAt && b.latestRuleCreatedAt) {
        return new Date(b.latestRuleCreatedAt) - new Date(a.latestRuleCreatedAt);
      }
      // If only one has rules, prioritize the one with rules
      if (a.latestRuleCreatedAt && !b.latestRuleCreatedAt) {
        return -1;
      }
      if (!a.latestRuleCreatedAt && b.latestRuleCreatedAt) {
        return 1;
      }
      // If neither has rules, sort by media timestamp
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

    console.log("Sorted enriched media:", sortedMedia.map(m => ({
      id: m.id,
      timestamp: m.timestamp,
      latestRuleCreatedAt: m.latestRuleCreatedAt
    })));

    return res.status(200).json({ 
      success: true, 
      data: sortedMedia 
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