import { useEffect, useRef, useMemo } from 'react';
import JsBarcode from 'jsbarcode';

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

interface ShippingLabelProps {
  template: TemplateType;
  fromAddress: AddressType;
  order: OrderType;
  isPrintView?: boolean;
}

const ShippingLabelTemplate = ({ template, fromAddress, order, isPrintView = false }: ShippingLabelProps) => {
  const barcodeRef = useRef<SVGSVGElement>(null);

  // Get template-specific font sizes based on selected template
  const getFontSizes = (template: TemplateType | null) => {
    // Small template (2x4)
    if (template?.id === '2x4' || (template?.width && template.width <= 192)) {
      return {
        baseFontSize: 5, // Further reduced
        titleFontSize: 6, // Further reduced
        smallFontSize: 4, // Further reduced
        letterSpacing: '-0.4px', // Increased letter spacing reduction
        lineHeight: 0.8, // Further reduced
        padding: '1px', // Reduced padding
        borderWidth: '0.5px'
      };
    }
    // Medium template (4x4)
    else if (template?.id === '4x4' || (template?.width && template.width <= 384)) {
      return {
        baseFontSize: 11,
        titleFontSize: 12,
        smallFontSize: 10,
        letterSpacing: 'normal',
        lineHeight: 1.2,
        padding: '4px',
        borderWidth: '1px'
      };
    }
    // Larger templates
    else {
      return {
        baseFontSize: 14,
        titleFontSize: 16, 
        smallFontSize: 12,
        letterSpacing: 'normal',
        lineHeight: 1.3,
        padding: '6px',
        borderWidth: '1px'
      };
    }
  };

  const fontSizes = useMemo(() => getFontSizes(template), [template]);

  // Adjust barcode size based on template
  const barcodeWidth = template.id === '2x4' ? 0.8 : 1.2;
  const barcodeHeight = template.id === '2x4' ? 25 : 40;

  useEffect(() => {
    // Generate barcode when component mounts or when order.id changes
    if (barcodeRef.current && order.id) {
      JsBarcode(barcodeRef.current, order.id, { 
        format: "CODE128", 
        width: barcodeWidth,
        height: barcodeHeight,
        displayValue: false,
        margin: 0
      });
    }
  }, [order.id, barcodeWidth, barcodeHeight]);
  
  // Format product list with adaptive truncation
  const formatProductsList = (products: Array<{ name: string; quantity: number }>): string => {
    if (!products || products.length === 0) {
      return "No products";
    }
    
    // For small templates, show fewer products with condensed format
    if (template.id === '2x4') {
      const maxToShow = 3;
      const visibleProducts = products.slice(0, maxToShow);
      const remaining = products.length - maxToShow;
      
      let result = visibleProducts.map(product => {
        // Truncate product names for small templates
        const truncatedName = product.name.length > 8 
          ? product.name.substring(0, 7) + '…' 
          : product.name;
        return `${truncatedName} × ${product.quantity}`;
      }).join(', ');
      
      if (remaining > 0) {
        result += `, +${remaining} more`;
      }
      
      return result;
    }
    
    // For larger templates, show all products with more space
    return products.map(product => {
      // Less truncation for larger templates
      const truncatedName = template.id === '4x4' && product.name.length > 15
        ? product.name.substring(0, 14) + '…'
        : product.name;
      return `${truncatedName} × ${product.quantity}`;
    }).join(', ');
  };

  // Calculate dimensions to match print version
  const containerStyle = {
    width: isPrintView ? '100%' : `${template.width}px`,
    height: isPrintView ? '100%' : `${template.height}px`,
    margin: '0 auto',
    boxSizing: 'border-box' as const,
    position: 'relative' as const,
    padding: fontSizes.padding,
    paddingTop: '15px', // Added more padding at the top
    paddingLeft: '12px', // Added padding for left
    paddingRight: '12px', // Added padding for right
    paddingBottom: '12px', // Added padding for bottom
    border: '0',
    fontFamily: 'Arial, sans-serif',
    fontSize: `${fontSizes.baseFontSize}px`,
    lineHeight: fontSizes.lineHeight,
    fontWeight: 500 as const, 
    letterSpacing: fontSizes.letterSpacing
  };

  // Common styles for reuse
  const addressLineStyle = {
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis' as const,
    lineHeight: fontSizes.lineHeight,
    fontSize: `${fontSizes.baseFontSize}px`
  };

  return (
    <div className="container" style={containerStyle}>
      <div className="header" style={{
        fontSize: `${fontSizes.titleFontSize}px`,
        fontWeight: 'bold',
        marginTop: '10px', // Add space before the Ship Via header
        marginBottom: '2px',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }}>
        Ship Via: {order.shipVia}
      </div>
      
      <div className="order-id" style={{
        fontSize: `${fontSizes.titleFontSize}px`,
        fontWeight: 'bold',
        marginBottom: '4px',
        textAlign: 'center',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }}>
        {fromAddress.name} Order ID: {order.id}
      </div>
      
      {/* Centered barcode with improved styling */}
      <div className="barcode-wrapper" style={{
        textAlign: 'center',
        margin: '8px auto', // Changed: added auto for horizontal centering
        height: `${barcodeHeight}px`,
        display: 'flex',
        justifyContent: 'center', // Added: center horizontally
        alignItems: 'center', // Added: center vertically
        width: '90%' // Added: set width to limit barcode width
      }}>
        <svg 
          ref={barcodeRef} 
          className="barcode-img"
          style={{
            maxHeight: '100%',
            maxWidth: '100%' // Added: ensure barcode fits container
          }}
        ></svg>
      </div>
      
      <div className="address-box" style={{
        border: `${fontSizes.borderWidth} solid #000`,
        padding: fontSizes.padding,
        marginBottom: '4px',
        minHeight: '80px',
        overflow: 'visible'
      }}>
        <div className="to-name" style={{
          fontWeight: 'bold',
          fontSize: `${fontSizes.titleFontSize}px`,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          TO {order.toAddress.name}
        </div>
        <div className="address-line" style={addressLineStyle}>
          {order.toAddress.street}
        </div>
        <div className="address-line" style={addressLineStyle}>
          {order.toAddress.city}
        </div>
        <div className="address-line" style={addressLineStyle}>
          {order.toAddress.state} {order.toAddress.zipCode}
        </div>
        <div className="address-line" style={addressLineStyle}>
          {order.toAddress.phone}
        </div>
      </div>
      
      <div className="details-grid" style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '4px',
        marginBottom: '4px'
      }}>
        <div className="detail-box" style={{
          border: `${fontSizes.borderWidth} solid #000`,
          padding: fontSizes.padding,
          minHeight: '70px'
        }}>
          <div className="detail-title" style={{
            fontWeight: 'bold',
            fontSize: `${fontSizes.titleFontSize}px`
          }}>
            From:
          </div>
          <div className="address-line" style={addressLineStyle}>{fromAddress.name}</div>
          <div className="address-line" style={addressLineStyle}>{fromAddress.street}</div>
          <div className="address-line" style={addressLineStyle}>{fromAddress.city}</div>
          <div className="address-line" style={addressLineStyle}>{fromAddress.state}-{fromAddress.zipCode}</div>
          <div className="address-line" style={addressLineStyle}>Mobile: {fromAddress.phone}</div>
        </div>
        
        <div className="detail-box" style={{
          border: `${fontSizes.borderWidth} solid #000`,
          padding: fontSizes.padding,
          minHeight: '70px'
        }}>
          <div className="detail-title" style={{
            fontWeight: 'bold',
            fontSize: `${fontSizes.titleFontSize}px`
          }}>
            Prepaid Order:
          </div>
          <div className="address-line" style={addressLineStyle}>Date: {order.orderDate}</div>
          <div className="address-line" style={addressLineStyle}>Weight: {order.weight}</div>
          <div className="address-line" style={addressLineStyle}>No. of Items: {order.totalItems}</div>
          <div className="address-line" style={addressLineStyle}>Packed By: {order.packedBy}</div>
        </div>
      </div>
      
      <div className="product-section" style={{
        border: `${fontSizes.borderWidth} solid #000`,
        padding: fontSizes.padding,
        paddingTop: '10px', // Add more top padding
        marginTop: '8px', // Increased from 4px
        minHeight: '60px' // Increased from 40px to expand the box
      }}>
        <div className="product-title" style={{
          fontWeight: 'bold',
          fontSize: `${fontSizes.titleFontSize}px`,
          marginBottom: '2px'
        }}>
          Products:
        </div>
        <div className="product-list" style={{
          whiteSpace: 'normal',
          wordWrap: 'break-word',
          lineHeight: fontSizes.lineHeight,
          fontSize: `${fontSizes.smallFontSize}px`
        }}>
          {formatProductsList(order.products)}
        </div>
      </div>
    </div>
  );
};

export default ShippingLabelTemplate;