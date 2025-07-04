import { useRef } from 'react';
import { Printer, ArrowLeft } from 'lucide-react';
import ShippingLabelTemplate from './ShippingLabelTemplate';

// Types
interface TemplateType {
  id: string;
  name: string;
  width: number;
  height: number;
  className?: string;
  description?: string;
  isDefault?: boolean;
  margins?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  scaleFactor?: number;
  printSettings?: {
    fitToPage: boolean;
    respectBoundaries: boolean;
  };
}

interface AddressType {
  name: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
}

interface OrderType {
  id: string;
  name: string;
  toAddress: AddressType;
  isPrepaid: boolean;
  orderDate: string;
  shipVia: string;
  products: Array<{ name: string; quantity: number }>;
  totalItems: number;
  packedBy: string;
  weight: string;
}

interface OrderPrintPageProps {
  orderData: OrderType;
  fromAddress: AddressType;
  selectedTemplate: TemplateType;
  onBack: () => void;
}

const OrderPrintPage = ({ orderData, fromAddress, selectedTemplate, onBack }: OrderPrintPageProps) => {
  const printAreaRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Unable to open print window. Please disable your pop-up blocker and try again.');
      return;
    }

    // Calculate dimensions in inches (96 DPI standard)
    const widthInches = selectedTemplate.width / 96;
    const heightInches = selectedTemplate.height / 96;
    
    // Get margins with defaults
    const margins = {
      top: selectedTemplate.margins?.top || 5,
      right: selectedTemplate.margins?.right || 5,
      bottom: selectedTemplate.margins?.bottom || 5,
      left: selectedTemplate.margins?.left || 5
    };

    // Create a simplified HTML document for printing with proper dimensions
    printWindow.document.open();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Label - ${orderData.id}</title>
          <style>
            @media print {
              @page {
                size: ${widthInches}in ${heightInches}in;
                margin: 0;
              }
              body {
                margin: 0;
                padding: 0;
                width: ${selectedTemplate.width}px;
                height: ${selectedTemplate.height}px;
                overflow: hidden;
              }
              .print-container {
                width: 100%;
                height: 100%;
                page-break-after: always;
                overflow: hidden;
                box-sizing: border-box;
                padding: ${margins.top}px ${margins.right}px ${margins.bottom}px ${margins.left}px;
              }
              
              /* Force content to stay on single page */
              * {
                overflow: hidden;
                text-overflow: ellipsis;
              }
            }
            
            body {
              margin: 0;
              padding: 0;
              font-family: Arial, sans-serif;
            }
            
            .print-container {
              width: ${selectedTemplate.width}px;
              height: ${selectedTemplate.height}px;
              margin: 0 auto;
              border: 1px solid #ccc;
              box-sizing: border-box;
              padding: ${margins.top}px ${margins.right}px ${margins.bottom}px ${margins.left}px;
              overflow: hidden;
            }
            
            .order-header {
              border-bottom: 1px solid #000;
              padding-bottom: 5px;
              margin-bottom: 5px;
              font-size: ${selectedTemplate.width < 300 ? '10px' : '12px'};
              overflow: hidden;
              height: ${Math.max(20, Math.floor(selectedTemplate.height * 0.08))}px;
            }
            
            .order-id {
              font-weight: bold;
              margin-bottom: 5px;
              font-size: ${selectedTemplate.width < 300 ? '10px' : '12px'};
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            
            .barcode-container {
              text-align: center;
              margin: 5px 0;
              height: ${Math.max(40, Math.floor(selectedTemplate.height * 0.12))}px;
              overflow: hidden;
            }
            
            .address-container {
              border: 1px solid #000;
              padding: 5px;
              margin-bottom: 5px;
              font-size: ${selectedTemplate.width < 300 ? '10px' : '12px'};
              height: ${Math.max(80, Math.floor(selectedTemplate.height * 0.25))}px;
              overflow: hidden;
            }
            
            .address-name {
              font-weight: bold;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            
            .address-line {
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            
            .address-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 5px;
              margin-bottom: 5px;
              height: ${Math.max(80, Math.floor(selectedTemplate.height * 0.35))}px;
              overflow: hidden;
            }
            
            .address-box {
              border: 1px solid #000;
              padding: 5px;
              font-size: ${selectedTemplate.width < 300 ? '10px' : '12px'};
              overflow: hidden;
            }
            
            .products-container {
              border-top: 1px solid #000;
              padding-top: 5px;
              font-size: ${selectedTemplate.width < 300 ? '10px' : '12px'};
              height: ${Math.max(40, Math.floor(selectedTemplate.height * 0.15))}px;
              overflow: hidden;
            }
            
            .products-title {
              font-weight: bold;
            }
            
            .products-list {
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
          </style>
        </head>
        <body>
          <div class="print-container">
            <div class="order-header">
              <strong>Ship Via:</strong> ${orderData.shipVia}
            </div>
            <div class="order-id">${fromAddress.name} - Order ID: ${orderData.id}</div>
            <div class="barcode-container">
              <svg id="barcode"></svg>
            </div>
            <div class="address-container">
              <div class="address-name">TO: ${orderData.toAddress.name}</div>
              <div class="address-line">${orderData.toAddress.street}</div>
              <div class="address-line">${orderData.toAddress.city}</div>
              <div class="address-line">${orderData.toAddress.state} ${orderData.toAddress.zipCode}</div>
              <div class="address-line">${orderData.toAddress.phone}</div>
            </div>
            <div class="address-grid">
              <div class="address-box">
                <div class="address-name">From:</div>
                <div class="address-line">${fromAddress.name}</div>
                <div class="address-line">${fromAddress.street}</div>
                <div class="address-line">${fromAddress.city}</div>
                <div class="address-line">${fromAddress.state} - ${fromAddress.zipCode}</div>
                <div class="address-line">Mobile: ${fromAddress.phone}</div>
              </div>
              <div class="address-box">
                <div class="address-name">${orderData.isPrepaid ? 'Prepaid Order:' : 'Order:'}</div>
                <div class="address-line">Date: ${orderData.orderDate.length > 15 ? orderData.orderDate.substring(0, 15) : orderData.orderDate}</div>
                <div class="address-line">Items: ${orderData.totalItems}</div>
                <div class="address-line">Weight: ${orderData.weight}</div>
              </div>
            </div>
            <div class="products-container">
              <div class="products-title">Products:</div>
              <div class="products-list">
                ${generateProductList(orderData.products, selectedTemplate)}
              </div>
            </div>
          </div>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/jsbarcode/3.11.5/JsBarcode.all.min.js"></script>
          <script>
            // Generate barcode when document is loaded
            document.addEventListener('DOMContentLoaded', function() {
              JsBarcode("#barcode", "${orderData.id}", {
                format: "CODE128",
                width: ${Math.max(1, Math.min(1.5, selectedTemplate.width / 300))},
                height: ${Math.min(40, selectedTemplate.height / 10)},
                displayValue: false,
                margin: 0
              });
              
              // Print after barcode is generated
              setTimeout(() => {
                window.print();
                setTimeout(() => window.close(), 500);
              }, 300);
            });
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Helper function to generate product list HTML with proper truncation
  const generateProductList = (products: Array<{ name: string; quantity: number }>, template: TemplateType) => {
    const isSmallTemplate = template.width < 300;
    const maxProducts = isSmallTemplate ? 2 : template.width < 400 ? 3 : 4;
    const maxNameLength = isSmallTemplate ? 15 : template.width < 400 ? 20 : 30;
    
    let displayProducts = products.slice(0, maxProducts);
    let result = displayProducts.map((product, idx) => {
      const displayName = product.name.length > maxNameLength 
        ? product.name.substring(0, maxNameLength) + '...' 
        : product.name;
        
      return `${displayName} × ${product.quantity}${idx < displayProducts.length - 1 ? ', ' : ''}`;
    }).join('');
    
    if (products.length > maxProducts) {
      result += ` + ${products.length - maxProducts} more`;
    }
    
    return result;
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Print Preview</h2>
        <div className="flex space-x-4">
          <button
            onClick={onBack}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-600 hover:bg-gray-100"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print
          </button>
        </div>
      </div>

      <div className="mb-4">
        <div className="text-sm text-gray-600 mb-2">
          Using template: <span className="font-medium">{selectedTemplate.name}</span> ({selectedTemplate.width}px × {selectedTemplate.height}px)
        </div>
      </div>

      <div className="bg-gray-100 p-6 rounded-md flex justify-center">
        <div ref={printAreaRef} className="shadow-lg">
          <ShippingLabelTemplate
            template={selectedTemplate}
            fromAddress={fromAddress}
            order={orderData}
            isPrintView={false}
          />
        </div>
      </div>

      <div className="mt-6 bg-gray-50 p-4 rounded-md">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Print Instructions:</h3>
        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
          <li>Make sure your printer is set to the correct paper size ({selectedTemplate.name})</li>
          <li>Verify that "Fit to page" is disabled in your print settings</li>
          <li>Set page margins to zero or minimum for best results</li>
          <li>If alignment is off, try adjusting the scaling factor in template settings</li>
        </ul>
      </div>
    </div>
  );
};

export default OrderPrintPage;