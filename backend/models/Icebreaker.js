const mongoose = require('mongoose');
const IcebreakersSchema = new mongoose.Schema({
    
    questions: [{
        type: String,
        required: true
      }],
        tenentId: {
            type: String,
            required: true
          }
      }, { timestamps: true });
  const Icebreakers = mongoose.model('Icebreakers', IcebreakersSchema);
  module.exports = Icebreakers;