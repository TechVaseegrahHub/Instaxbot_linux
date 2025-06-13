import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CarouselButton {
  type: string;
  title: string;
  url?: string;
  payload?: string;
}

interface CarouselProduct {
  title: string;
  subtitle: string;
  imageUrl: string;
  buttons: CarouselButton[];
}

interface CarouselMessageProps {
  message: {
    _id: string;
    senderId: string;
    recipientId: string;
    messageType: 'carousel';
    message?: string;
    response?: string;
    carouselData: {
      totalProducts: number;
      products: CarouselProduct[];
    };
    Timestamp: string;
  };
  isOutgoing: boolean;
  onButtonClick?: (payload: string) => void;
}

const CarouselMessage: React.FC<CarouselMessageProps> = ({ 
  message,  
  onButtonClick 
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  if (!message.carouselData?.products || message.carouselData.products.length === 0) {
    console.error('Missing carousel data');
    return null;
  }

  const products = message.carouselData.products;
  
  const nextSlide = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === products.length - 1 ? 0 : prevIndex + 1
    );
  };

  const prevSlide = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? products.length - 1 : prevIndex - 1
    );
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return !isNaN(date.getTime())
      ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';
  };

  const renderButton = (button: CarouselButton, index: number) => {
    if (button.type === 'web_url' && button.url) {
      return (
         <a
          key={index}
          href={button.url}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full px-4 py-2 bg-blue-500 text-white rounded-md text-center hover:bg-blue-600 mb-2 last:mb-0"
        >
          {button.title}
        </a>
      );
    }
    
    return (
      <button
        key={index}
        onClick={() => onButtonClick?.(button.payload || '')}
        className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 mb-2 last:mb-0"
      >
        {button.title}
      </button>
    );
  };

  const currentProduct = products[currentIndex];

  // Determine position based on message content
  const isMessageSide = message.message === 'Carousel Message';
  const isResponseSide = message.response === 'Carousel Message' || !isMessageSide;

  return (
    <div className="flex flex-col">
      {/* User message (if it exists and it's not the trigger message) */}
      {message.message && message.message !== 'Carousel Message' && (
        <div className="flex justify-start mb-2">
          <div className="max-w-[70%] rounded-lg px-4 py-2 bg-white shadow-sm">
            <p className="break-words">{message.message}</p>
            <div className="text-xs mt-1 text-gray-500">
              {formatMessageTime(message.Timestamp)}
            </div>
          </div>
        </div>
      )}
      
      {/* Carousel display */}
      <div className={`flex ${isResponseSide ? 'justify-end' : 'justify-start'} mb-2`}>
        <div className={`max-w-[320px] rounded-lg p-4 ${isResponseSide ? 'bg-blue-500 text-white' : 'bg-white'}`}>
          <div className="relative">
            <div className="carousel-container relative">
              <div className="max-w-[280px] bg-white rounded-lg shadow-sm overflow-hidden">
                <img 
                  src={currentProduct.imageUrl}
                  alt={currentProduct.title}
                  className="w-full h-48 object-cover"
                />
                <div className="p-4">
                  <h3 className="font-bold text-lg mb-2 text-black">{currentProduct.title}</h3>
                  <p className="text-sm text-gray-600 whitespace-pre-line mb-4">{currentProduct.subtitle}</p>
                  <div className="flex flex-col space-y-2">
                    {currentProduct.buttons.map((button, buttonIndex) => renderButton(button, buttonIndex))}
                  </div>
                </div>
              </div>
              
              {/* Navigation buttons */}
              <button 
                onClick={prevSlide} 
                className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-white/80 p-1 rounded-full shadow-md hover:bg-white"
                aria-label="Previous product"
              >
                <ChevronLeft className="h-5 w-5 text-black" />
              </button>
              
              <button 
                onClick={nextSlide}
                className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-white/80 p-1 rounded-full shadow-md hover:bg-white"
                aria-label="Next product"
              >
                <ChevronRight className="h-5 w-5 text-black" />
              </button>
              
              {/* Pagination indicators */}
              <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-2">
                {products.map((_, index) => (
                  <div 
                    key={index}
                    className={`h-2 w-2 rounded-full mx-1 ${
                      index === currentIndex ? 'bg-blue-500' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
          
          <div className={`text-xs mt-2 ${isResponseSide ? 'text-white opacity-70' : 'text-gray-500'}`}>
            {formatMessageTime(message.Timestamp)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CarouselMessage;