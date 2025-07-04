const mongoose = require('mongoose');
const welcomemessageSchema = new mongoose.Schema({
    welcomemessage: { type:String ,default:"Helloo 🤩, I'm Chattu an AI chatbot. If you have any questions feel free to ping me here ma. Note sometimes my responses may not always be accurate. Kindly continue your chat in English for a fulfilling experience.❤️"},
    tenentId: { type: String,required: true}
  }, { timestamps: true });
  const Welcomemessage = mongoose.model('Welcomemessage', welcomemessageSchema);
  module.exports = Welcomemessage;