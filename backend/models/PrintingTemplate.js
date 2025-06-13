// models/PrintingTemplate.js
const mongoose = require('mongoose');

const printingTemplateSchema = new mongoose.Schema({
  tenent_id: { type: String, required: true },
  templateId: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String },
  width: { type: Number, required: true },
  height: { type: Number, required: true },
  className: { type: String },
  isDefault: { type: Boolean, default: false },
  // Add margins to ensure content fits within the page
  margins: {
    top: { type: Number, default: 5 },
    right: { type: Number, default: 5 },
    bottom: { type: Number, default: 5 },
    left: { type: Number, default: 5 }
  },
  // Add scaling factor for different printers
  scaleFactor: { type: Number, default: 1.0 },
  // Add print settings
  printSettings: {
    fitToPage: { type: Boolean, default: true },
    respectBoundaries: { type: Boolean, default: true }
  }
}, { timestamps: true });

// Create a compound index for faster lookups
printingTemplateSchema.index({ tenent_id: 1, templateId: 1 }, { unique: true });

// Define the effective print area (accounting for margins)
printingTemplateSchema.virtual('effectiveWidth').get(function() {
  return this.width - (this.margins.left + this.margins.right);
});

printingTemplateSchema.virtual('effectiveHeight').get(function() {
  return this.height - (this.margins.top + this.margins.bottom);
});

// Method to calculate CSS for print view
printingTemplateSchema.methods.getPrintStyles = function() {
  return {
    width: `${this.width}px`,
    height: `${this.height}px`,
    padding: `${this.margins.top}px ${this.margins.right}px ${this.margins.bottom}px ${this.margins.left}px`,
    overflow: 'hidden',
    boxSizing: 'border-box',
    transform: `scale(${this.scaleFactor})`,
    transformOrigin: 'top left'
  };
};

// Generate print media queries for this template
printingTemplateSchema.methods.getPrintMediaQuery = function() {
  // Convert pixels to inches (assuming 96 DPI standard)
  const widthInches = this.width / 96;
  const heightInches = this.height / 96;
  
  // Return the appropriate media query for printing
  return `
    @media print {
      @page {
        size: ${widthInches}in ${heightInches}in;
        margin: 0;
      }
      body {
        margin: 0;
        padding: 0;
        width: ${this.width}px;
        height: ${this.height}px;
        overflow: hidden;
      }
      .print-container {
        width: 100%;
        height: 100%;
        page-break-after: always;
        overflow: hidden;
      }
    }
  `;
};

// Add static method to create default templates for a tenant
printingTemplateSchema.statics.createDefaultTemplates = async function(tenentId) {
  const defaultTemplates = [
    {
      tenent_id: tenentId,
      templateId: '4x4',
      name: '4×4 inches',
      description: 'Small square label',
      width: 384, // 4 inches at 96 DPI
      height: 384, // 4 inches at 96 DPI
      className: 'w-96 h-96',
      margins: { top: 10, right: 10, bottom: 10, left: 10 },
      scaleFactor: 1.0,
      printSettings: { fitToPage: true, respectBoundaries: true },
      isDefault: false
    },
    {
      tenent_id: tenentId,
      templateId: 'a4',
      name: 'A4',
      description: 'Full page label',
      width: 793, // 8.27 inches at 96 DPI
      height: 1123, // 11.7 inches at 96 DPI
      className: 'w-full max-w-3xl h-auto',
      margins: { top: 15, right: 15, bottom: 15, left: 15 },
      scaleFactor: 1.0,
      printSettings: { fitToPage: true, respectBoundaries: true },
      isDefault: false
    },
    {
      tenent_id: tenentId,
      templateId: '2x4',
      name: '2×4 inches',
      description: 'Small rectangular label',
      width: 192, // 2 inches at 96 DPI
      height: 384, // 4 inches at 96 DPI
      className: 'w-48 h-96',
      margins: { top: 8, right: 8, bottom: 8, left: 8 },
      scaleFactor: 1.0,
      printSettings: { fitToPage: true, respectBoundaries: true },
      isDefault: false
    },
    {
      tenent_id: tenentId,
      templateId: '4x6',
      name: '4×6 inches',
      description: 'Standard shipping label',
      width: 384, // 4 inches at 96 DPI
      height: 576, // 6 inches at 96 DPI
      className: 'w-96 h-144',
      margins: { top: 12, right: 12, bottom: 12, left: 12 },
      scaleFactor: 1.0,
      printSettings: { fitToPage: true, respectBoundaries: true },
      isDefault: true
    }
  ];

  // Use bulkWrite for efficiency
  const operations = defaultTemplates.map(template => ({
    updateOne: {
      filter: { tenent_id: tenentId, templateId: template.templateId },
      update: template,
      upsert: true
    }
  }));

  return this.bulkWrite(operations);
};

// Method to retrieve the best template for a given content size
printingTemplateSchema.statics.findBestTemplateForContent = async function(tenentId, contentWidth, contentHeight) {
  // Get all templates for this tenant
  const templates = await this.find({ tenent_id: tenentId }).sort({ width: 1, height: 1 });
  
  if (!templates.length) return null;
  
  // Find the smallest template that can fit the content
  for (const template of templates) {
    const effectiveWidth = template.effectiveWidth;
    const effectiveHeight = template.effectiveHeight;
    
    if (contentWidth <= effectiveWidth && contentHeight <= effectiveHeight) {
      return template;
    }
  }
  
  // If no template fits perfectly, return the largest one
  return templates[templates.length - 1];
};

const PrintingTemplate = mongoose.model('PrintingTemplate', printingTemplateSchema);

module.exports = PrintingTemplate;