require("dotenv").config();

const Response = require('../models/Response');
const { updateVectorDB, getVectorDB } = require('./VectorDBRoutes');
const path = require('path');
const axios = require('axios');
const express = require('express');
const { json } = express;
const router = express.Router();

const multer = require('multer');
const cors = require('cors');
const upload = multer({ dest: "uploads/" });

router.use(cors({
  origin: '*' // Replace with your client URL
}));

const fs = require('fs');
const tenantVectorDBs = require('./vectorDBState');
const OpenAI = require('openai');
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY // This is the default and can be omitted
});


router.post("/upload", upload.single("file"), async (req, res) => {
    try {
      
      const { tenentId } = req.body; // Access tenentId from the request body
      console.log("tenentid:",tenentId)
      const filePath = req.file.path;
      if (!tenentId) {
        return res.status(400).json({ message: "Tenent ID is required." });
      }
  
      // Read and parse the file
      const fileContent = fs.readFileSync(filePath, "utf8");
  
      // Save to MongoDB
      const upload = await Response.findOne({ tenentId:tenentId }).sort({ createdAt: -1 }).limit(1);;
      
      if(upload){
        const updateupload= await Response.updateOne(
          { tenentId: tenentId },
          { $set: { content: fileContent } },
          
        );
        if(updateupload){
          console.log("Responses.txt is uploaded successfully");
        }
        else{
          console.log("Error occur while uploading responses.txt");
        }

      }
      else{
      const responseDoc = new Response({ content: fileContent ,tenentId: tenentId});
      const responsedata = await responseDoc.save();
      if(responsedata){
        console.log("Responses is uploaded successfully");
        
      }
      else{
        console.log("Error occur while uploading responses");
      }
      }
      // Delete the file from server after saving
      fs.unlinkSync(filePath);
  
      res.status(200).json({ message: "File uploaded and saved to MongoDB!" });
      const uploadedFilePath = await uploadRAGFile(tenentId);
      if (uploadedFilePath) {
        await loadRAGFile(uploadedFilePath, tenentId)
    }
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to process file." });
    }
  });
  const uploadRAGFile = async (tenentId) => {
    try {
      const responseDoc = await Response.findOne({ tenentId });
  
      if (responseDoc) {
        if (!tenantVectorDBs[tenentId]) {
          tenantVectorDBs[tenentId] = [];
        }
  
        const fileContent = responseDoc.content;
        const tenantDir = path.join(__dirname, '..', 'tenant_files');
        
        if (!fs.existsSync(tenantDir)) {
          fs.mkdirSync(tenantDir, { recursive: true });
        }
  
        const timestamp = Date.now();
        const fileName = `responses_${tenentId}_${timestamp}.txt`;
        const filePath = path.join(tenantDir, fileName);
        
        fs.writeFileSync(filePath, fileContent, 'utf8');
        console.log(`Content saved to ${fileName}`);
  
        // Clean up old files BEFORE processing new file
        await cleanupOldFiles(tenentId, tenantDir);
  
        // Return the path of the newly created file
        return filePath;
      } else {
        console.log(`No document found for tenant ${tenentId}`);
        return null;
      }
    } catch (error) {
      console.error(`Error uploading RAG file for tenant ${tenentId}:`, error);
      throw error;
    }
  };
  // Helper function to clean up old files
const cleanupOldFiles = async (tenentId, tenantDir) => {
  try {
    const files = fs.readdirSync(tenantDir)
      .filter(file => file.startsWith(`responses_${tenentId}_`))
      .map(file => ({
        name: file,
        path: path.join(tenantDir, file),
        timestamp: parseInt(file.split('_')[2])
      }))
      .sort((a, b) => b.timestamp - a.timestamp); // Sort by newest first

    // Keep only the most recent file
    const filesToDelete = files.slice(1);
    for (const file of filesToDelete) {
      await fs.promises.unlink(file.path);
      console.log(`Deleted old file: ${file.name}`);
    }
  } catch (error) {
    console.error(`Error cleaning up old files for tenant ${tenentId}:`, error);
  }
};
  /*const getLatestFileContent = () => {
    const filePath = path.join(__dirname, '..', 'responses.txt');
    return filePath; // Read the updated file content
  };*/
  async function loadRAGFile(filePath, tenentId) {
    try {
      // Verify the file exists
      if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        return;
      }
  
      // Get file creation time
      const stats = fs.statSync(filePath);
      console.log(`Loading RAG file created at: ${stats.birthtime}`);
  
      const vectors = [];
      const content = await fs.promises.readFile(filePath, 'utf8');
      const chunks = content.split('\n\n').filter(chunk => chunk.trim());
      
      for (const chunk of chunks) {
        if (chunk.trim()) {
          const lowercaseChunk = chunk.toLowerCase(); // Convert chunk to lowercase
          const embedding = await createEmbedding(lowercaseChunk);
          vectors.push({
            text: lowercaseChunk, // Store the lowercase version
            embedding,
            lastUpdated: Date.now()
          });
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      await updateVectorDB(tenentId, vectors);
      tenantVectorDBs[tenentId] = vectors;
      console.log(`Processed ${chunks.length} chunks for tenant ${tenentId}`);
      console.log('Current vector DB size:', tenantVectorDBs[tenentId].length);
      console.log('Using file:', filePath);
  
    } catch (error) {
      console.error(`Error loading RAG file:`, error);
      throw error;
    }
  }
  async function createEmbedding(text, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await openai.embeddings.create({
          model: "text-embedding-ada-002",
          input: text.slice(0, 8000), // Limit text length to avoid token limits
        });
        return response.data[0].embedding;
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }
  module.exports = router;

  