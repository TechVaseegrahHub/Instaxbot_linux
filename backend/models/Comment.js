const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  tenentId: {
    type: String,
    required: true
  },
  commentId: {
    type: String,
    required: true,
  },
 
  senderId: {
    type: String,
    required: true
  },
  
  message: {
    type: String,
    required: true
  },
  Timestamp: { 
    type: Date, 
    default: () => new Date().toISOString() 
  },
  mediaId:{
    type: String,
    required: true
  },
  response: {
    type: String,
    default: ''
  },
  username:{
    type: String,
    required: true
  },
  recipientId: {
    type: String,
    default: ''
  }
  
}, { timestamps: true });
commentSchema.statics.createCommentMessage = async function(data) {
    return this.create({
      tenentId: data.tenentId,
      mediaId: data.mediaId,
      commentId: data.commentId,
      message:data.message,
      recipientId:data.recipientId,
      senderId: data.senderId,
      response: data.response,
      Timestamp: data.Timestamp,
      username:data.username
    });
  };
  
  commentSchema.statics.respondToComment = async function(commentId, responseText) {
    return this.updateOne(
      { commentId },
      {
        response: responseText,
        responseTimestamp: new Date().toISOString()
      }
    );
  };
  const Comment= mongoose.model('Comment', commentSchema);
module.exports = Comment;
