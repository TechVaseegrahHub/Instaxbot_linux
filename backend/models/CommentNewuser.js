const mongoose = require('mongoose');
const commentnewuserSchema = new mongoose.Schema({
  
  
    senderId: { type: String, required: true },
    username: { type: String, required: true },
    tenentId: { type: String, required: true }
    
  }, { timestamps: true });
  const CommentNewuser = mongoose.model('CommentNewuser', commentnewuserSchema);
  module.exports = CommentNewuser;