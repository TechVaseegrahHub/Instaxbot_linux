// VectorDBRoutes.js
const VectorDB = require('../models/VectorDB');

async function updateVectorDB(tenantId, vectors) {
    try {
        const result = await VectorDB.findOneAndUpdate(
            { tenantId }, 
            { $set: { vectors } },  // Use $set to update the vectors array
            { 
                upsert: true,
                new: true    // Return the updated document
            }
        );
        console.log(`Updated vectors for tenant ${tenantId}, count: ${vectors.length}`);
        return result;
    } catch (error) {
        console.error(`Error updating vector DB for tenant ${tenantId}:`, error);
        throw error;
    }
}

async function getVectorDB(tenantId) {
    try {
        const record = await VectorDB.findOne({ tenantId });
        if (record && record.vectors) {
            console.log(`Retrieved ${record.vectors.length} vectors for tenant ${tenantId}`);
            return record.vectors;
        }
        return [];
    } catch (error) {
        console.error(`Error getting vector DB for tenant ${tenantId}:`, error);
        return [];
    }
}

module.exports = { updateVectorDB, getVectorDB };