import React from 'react';
import { formatMessageTime } from '@/utils/dateUtils';

interface Button {
  type: string;
  title: string;
  payload?: string;
  url?: string;
}

interface ProductElement {
  title: string;
  image_url: string;
  subtitle: string;
  default_action: {
    type: string;
    url: string;
  };
  buttons: Button[];
}

export interface TemplateMessageProps {
  message: {
    _id: string;
    senderId: string;
    recipientId: string;
    messageType: 'template';
    audioUrl?: string | null;
    transcription?: string | null;
    message: string | null;
    response: {
      attachment: {
        type: 'template';
        payload: {
          template_type: string;
          text?: string;
          buttons?: Button[];
          elements?: ProductElement[];
        };
      };
    };
    Timestamp: string;
  };
  isOutgoing: boolean;
  onButtonClick: (payload: string) => void;
}

const TemplateMessage: React.FC<TemplateMessageProps> = ({ message, onButtonClick }) => {
  //console.log('Incoming message:', message);
  //console.log('Template message received:', message);
  //console.log('Template payload:', message.response?.attachment?.payload);
  //console.log('Template type:', message.response?.attachment?.payload?.template_type);
  //console.log('Template elements:', message.response?.attachment?.payload?.elements);
  if (!message.response?.attachment?.payload) {
    console.error('Missing template payload data');
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
        onClick={() => onButtonClick(button.payload || '')}
        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
      >
        {button.title}
      </button>
    );
  };

  /*const renderGenericTemplate = (element: ProductElement) => (
    <div className="product-template bg-white rounded-lg overflow-hidden">
      {element.image_url && (
        <img 
          src={element.image_url} 
          alt={element.title}
          className="w-full h-48 object-cover"
        />
      )}
      <div className="p-4">
        <h3 className="font-bold text-lg mb-2">{element.title}</h3>
        <p className="text-gray-700 whitespace-pre-line mb-4">{element.subtitle}</p>
        <div className="flex flex-col gap-2">
          {element.buttons.map((button, index) => renderButton(button, index))}
        </div>
      </div>
    </div>
  );*/

  const renderButtonTemplate = () => (
    <>
      <p className="font-medium mb-3">{templateData.text}</p>
      {templateData.buttons && templateData.buttons.length > 0 && (
        <div className="flex flex-col gap-2">
          {templateData.buttons.map((button, index) => renderButton(button, index))}
        </div>
      )}
    </>
  );

  const renderTemplate = () => {
    try {
    switch (templateData.template_type) {
      case 'generic':
        if (!templateData.elements || templateData.elements.length === 0) {
          console.error('No elements in generic template');
          return null;
        }
        return templateData.elements?.map((element, index) => {
          //console.log('Rendering element:', element);
        //console.log('Element title:', element.title);
        
        return (
          <div key={index} className="max-w-[300px] bg-white rounded-lg shadow-sm overflow-hidden">
            <img 
              src={element.image_url}
              alt={element.title}
              className="w-full h-48 object-cover"
            />
            <div className="p-4">
            <h3 className="font-bold text-lg mb-2 text-black">{element.title}</h3>
              <p className="text-sm text-gray-600 whitespace-pre-line mb-4">{element.subtitle}</p>
              <div className="space-y-2">
                {element.buttons.map((button, buttonIndex) => renderButton(button, buttonIndex))}
              </div>
            </div>
          </div>
        );
    });
      default:
        return renderButtonTemplate();
    }
  } catch (error) {
    console.error('Error rendering template:', error);
    return null;
  }
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
      <div className="flex justify-end mb-2">
        <div className="max-w-[70%] rounded-lg p-4 bg-blue-500 text-white">
          {renderTemplate()}
          <div className="text-xs mt-2 text-white opacity-70">
            {formatMessageTime(message.Timestamp)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateMessage;