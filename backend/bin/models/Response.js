const mongoose = require('mongoose');
const responseSchema = new mongoose.Schema({
    content: String,
    tenentId: { type: String,required: true}
  }, { timestamps: true });
  const Response = mongoose.model('Response', responseSchema);
  module.exports = Response;