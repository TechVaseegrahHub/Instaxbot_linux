const express = require('express');
const router = express.Router();
const TemplateMessage = require('../models/TemplateMessage'); // Adjust path as needed

// POST endpoint to create new message templates
router.post('/message-templates', async (req, res) => {
  try {
    const { tenentId, templates } = req.body;

    if (!tenentId || !templates || !Array.isArray(templates)) {
      return res.status(400).json({ success: false, message: 'Invalid request data' });
    }

    // Process each template in the array
    const savedTemplates = [];
    for (const template of templates) {
      const newTemplate = new TemplateMessage({
        tenentId,
        title: template.title,
        payload: template.payload,
        messageType: template.messageType,
        text: template.text,
        carouselItems: template.messageType === 'carousel' ? template.carouselItems : undefined
      });

      // Save the template
      const savedTemplate = await newTemplate.save();
      savedTemplates.push(savedTemplate);
    }

    res.status(201).json({ 
      success: true, 
      message: 'Templates saved successfully', 
      data: savedTemplates 
    });
  } catch (error) {
    console.error('Error saving message templates:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to save templates', 
      error: error.message 
    });
  }
});
// POST endpoint to update existing message templates
router.post('/message-templates/update', async (req, res) => {
  try {
    const { tenentId, templates } = req.body;

    if (!tenentId || !templates || !Array.isArray(templates)) {
      return res.status(400).json({ success: false, message: 'Invalid request data' });
    }

    const updatedTemplates = [];
    
    for (const template of templates) {
      // Check if template has an ID (for updating)
      if (template._id) {
        const updatedTemplate = await TemplateMessage.findByIdAndUpdate(
          template._id,
          {
            tenentId,
            payload: template.payload,
            messageType: template.messageType,
            text: template.text,
            carouselItems: template.messageType === 'carousel' ? template.carouselItems : undefined
          },
          { new: true, runValidators: true }
        );
        
        if (updatedTemplate) {
          updatedTemplates.push(updatedTemplate);
        }
      } else {
        // If no ID, create a new template
        const newTemplate = new TemplateMessage({
          tenentId,
          payload: template.payload,
          messageType: template.messageType,
          text: template.text,
          carouselItems: template.messageType === 'carousel' ? template.carouselItems : undefined
        });
        
        const savedTemplate = await newTemplate.save();
        updatedTemplates.push(savedTemplate);
      }
    }

    res.status(200).json({ 
      success: true, 
      message: 'Templates updated successfully', 
      data: updatedTemplates 
    });
  } catch (error) {
    console.error('Error updating message templates:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update templates', 
      error: error.message 
    });
  }
});

// GET endpoint to fetch all templates for a tenant
router.get('/message-templates/:tenentId', async (req, res) => {
  try {
    const { tenentId } = req.params;
    
    if (!tenentId) {
      return res.status(400).json({ success: false, message: 'Tenant ID is required' });
    }
    
    const templates = await TemplateMessage.find({ tenentId });
    
    res.status(200).json({
      success: true,
      count: templates.length,
      data: templates
    });
  } catch (error) {
    console.error('Error fetching message templates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch templates',
      error: error.message
    });
  }
});

// GET endpoint to fetch a specific template by ID
router.get('/message-templates/template/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const template = await TemplateMessage.findById(id);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch template',
      error: error.message
    });
  }
});

// DELETE endpoint to remove a template
router.delete('/message-templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const deletedTemplate = await TemplateMessage.findByIdAndDelete(id);
    
    if (!deletedTemplate) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete template',
      error: error.message
    });
  }
});

module.exports = router;