const mongoose = require('mongoose');
const modeSchema = new mongoose.Schema({
  
  
    mode: { type: String, required: true },
    senderId: { type: String, required: true },
    tenentId: { type: String,required: true,default:"chat"}


    
 }, { timestamps: true });
  const Mode = mongoose.model('Mode', modeSchema);
  module.exports = Mode;
  