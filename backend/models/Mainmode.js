const mongoose = require('mongoose');
const mainmodeSchema = new mongoose.Schema({
  
  
    mainmode: { type: String, required: true },
    tenentId: { type: String,required: true,default:"chat"}


    
 }, { timestamps: true });
  const Mainmode = mongoose.model('Mainmode', mainmodeSchema);
  module.exports = Mainmode;
  