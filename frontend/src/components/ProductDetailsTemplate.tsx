import React from 'react';
import { formatMessageTime } from '@/utils/dateUtils';



interface Button {
  type: string;
  title: string;
  url?: string;
  payload?: string;
}

interface ProductDetailsElement {
  title: string;
  image_url: string;
  subtitle: string;
  default_action: {
    type: string;
    url: string;
  };
  buttons: Button[];
  price?: string; // Changed to match the new price type
}

export interface ProductDetailsTemplateProps {
  message: {
    _id: string;
    senderId: string;
    recipientId: string;
    messageType: 'template';
    message: string;
    response: {
      attachment: {
        type: 'template';
        payload: {
          template_type: 'generic';
          elements: ProductDetailsElement[];
        };
      };
    };
    Timestamp: string;
  };
  isOutgoing: boolean;
  onButtonClick?: (payload: string) => void;
}

const formatPrice = (price: string | number): string => {
  // If price is already formatted with symbol, return as is
  if (typeof price === 'string' && price.startsWith('₹')) {
    return price;
  }

  // If price is a number or string without symbol, format it
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  if (!isNaN(numPrice)) {
    const formattedAmount = new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numPrice);
    return `₹${formattedAmount}`;
  }

  return 'Price not available';
};

const ProductDetailsTemplate: React.FC<ProductDetailsTemplateProps> = ({ 
  message, 
  isOutgoing, 
  onButtonClick 
}) => {
  console.log('Incoming message:', message);
  
  if (!message.response?.attachment?.payload) {
    console.error('Missing product details template payload data');
    return null;
  }

  const templateData = message.response.attachment.payload;

  const renderButton = (button: Button, index: number) => {
    if (button.type === 'web_url' && button.url) {
      return (
        <a
          key={index}
          href={button.url}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-blue-500 text-white rounded-md text-center hover:bg-blue-600"
        >
          {button.title}
        </a>
      );
    }
    
    return (
      <button
        key={index}
        onClick={() => onButtonClick?.(button.payload || '')}
        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
      >
        {button.title}
      </button>
    );
  };

  const renderProductDetails = (element: ProductDetailsElement) => {
    let displayPrice: string;

    if (element.price) {
      displayPrice = element.price; // Use price directly if it's already formatted
    } else {
      // Try to extract price from subtitle if not provided directly
      const matches = element.subtitle.match(/([₹$€£])?(\d+(?:\.\d+)?)/);
      if (matches) {
        const price = matches[1] ? 
          `${matches[1]}${matches[2]}` : // Use existing symbol if present
          formatPrice(matches[2]); // Format with ₹ if no symbol
        displayPrice = price;
      } else {
        displayPrice = 'Price not available';
      }
    }

    return (
      <div className="max-w-[300px] bg-white rounded-lg shadow-sm overflow-hidden">
        <img 
          src={element.image_url}
          alt={element.title}
          className="w-full h-48 object-cover"
        />
        <div className="p-4">
          <h3 className="font-bold text-lg mb-2">{element.title}</h3>
          <p className="text-sm text-gray-600 mb-2">{displayPrice}</p>
          <p className="text-sm text-gray-600 whitespace-pre-line mb-4">{element.subtitle}</p>
          <div className="space-y-2">
            {element.buttons.map((button, buttonIndex) => renderButton(button, buttonIndex))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col">
      {message.message && (
        <div className="flex justify-start mb-2">
          <div className="max-w-[70%] rounded-lg px-4 py-2 bg-white shadow-sm">
            <p className="break-words">{message.message}</p>
            <div className="text-xs mt-1 text-gray-500">
              {formatMessageTime(message.Timestamp)}
            </div>
          </div>
        </div>
      )}
      <div className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'} mb-2`}>
        <div className={`max-w-[70%] rounded-lg p-4 ${isOutgoing ? 'bg-blue-500 text-white' : 'bg-white'}`}>
          {templateData.elements?.map((element, index) => (
            <div key={index}>
              {renderProductDetails(element)}
            </div>
          ))}
          <div className={`text-xs mt-2 ${isOutgoing ? 'text-white opacity-70' : 'text-gray-500'}`}>
            {formatMessageTime(message.Timestamp)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailsTemplate;