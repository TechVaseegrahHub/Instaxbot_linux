const mongoose = require('mongoose');

const vectorDBSchema = new mongoose.Schema({
    tenantId: String,
    vectors: [{
        text: String,
        embedding: [Number],
        lastUpdated: { type: Date, default: Date.now }
    }]
}, { timestamps: true });

const VectorDB = mongoose.model('VectorDB', vectorDBSchema);

module.exports = VectorDB;