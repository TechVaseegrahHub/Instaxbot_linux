import React, { useState, useEffect } from 'react';
import axios from 'axios';
import chat_logo from '../assets/chat_logo.png';

interface MessageTemplateProps {
  body: string;
}

interface WorkflowItem {
  type: 'payload' | 'weburl';
  title: string;
  payload: string;
}

interface TemplateMessage {
  title: string;
  payload: string;
  messageType: string;
}

const MAX_BODY_LENGTH = 1024;
const MAX_WORKFLOWS = 3;

// Base URL for API requests
const API_BASE_URL = process.env.REACT_APP_API_URL ||'https://app.instaxbot.com';

const InstaxBot: React.FC = () => {
  const [messageTemplate, setMessageTemplate] = useState<MessageTemplateProps>({
    body: 'Ready to embrace the freshness of nature? Share us your Hair/Skin concerns. Our team will guide you to the perfect herbal solution tailored for you! 🌿 💫',
  });

  // Get tenentId directly from localStorage with proper typing
  const tenentId = localStorage.getItem('tenentid');
  
  // Single username state for all uses
  const [username, setUsername] = useState<string>('Business Chat');
  
  const [bodyLength, setBodyLength] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([
    { type: 'payload', title: 'TALK WITH AGENT', payload: 'HUMAN_AGENT' }
  ]);
  const [showTitleOptions, setShowTitleOptions] = useState<boolean[]>([false]);
  const [showPayloadOptions, setShowPayloadOptions] = useState<boolean[]>([false]);
  
  // Add states for custom input modes
  const [customTitleMode, setCustomTitleMode] = useState<boolean[]>([false]);
  const [customPayloadMode, setCustomPayloadMode] = useState<boolean[]>([false]);
  
  // Add state for template messages
  const [templateMessages, setTemplateMessages] = useState<TemplateMessage[]>([]);

  // Default options if no template messages exist
  const titleOptions = ['TALK WITH AGENT'];
  const payloadOptions = ['HUMAN_AGENT' ];
  
  const actionButtons = workflows.map(workflow => workflow.title) || ['TALK WITH AGENT'];

  useEffect(() => {
    setBodyLength(messageTemplate.body.length);
  }, [messageTemplate]);

  // Fetch template messages when component mounts
  useEffect(() => {
    const fetchTemplateMessages = async () => {
      if (!tenentId) {
        console.log('No tenant ID found in localStorage');
        return;
      }
      
      try {
        const response = await axios.get(`${API_BASE_URL}/api/welcomepageroute/template-messages/${tenentId}`);
        
        if (response.data.success && response.data.data) {
          setTemplateMessages(response.data.data);
          console.log("Fetched template messages:", response.data.data);
        }
      } catch (err) {
        console.log('Error fetching template messages:', err);
      }
    };
    
    fetchTemplateMessages();
  }, [tenentId]);

  // Fetch existing welcome page data when component mounts
  useEffect(() => {
    const fetchWelcomePageData = async () => {
      if (!tenentId) {
        console.log('No tenant ID found in localStorage');
        return;
      }
      
      try {
        setIsLoading(true);
        const response = await axios.get(`${API_BASE_URL}/api/welcomepageroute/welcome-page/${tenentId}`);
        
        if (response.data.success && response.data.data) {
          const data = response.data.data;
          // Set username from API response
          if (response.data.username) {
            setUsername(response.data.username);
            console.log("Username for welcomepage:", response.data.username);
          }
          
          setMessageTemplate({
            body: data.body || ''
          });
          
          if (data.workflows && data.workflows.length > 0) {
            setWorkflows(data.workflows);
            setShowTitleOptions(new Array(data.workflows.length).fill(false));
            setShowPayloadOptions(new Array(data.workflows.length).fill(false));
            setCustomTitleMode(new Array(data.workflows.length).fill(false));
            setCustomPayloadMode(new Array(data.workflows.length).fill(false));
          }
          
          // Set template messages if they exist in the response
          if (response.data.templateMessages && response.data.templateMessages.length > 0) {
            setTemplateMessages(response.data.templateMessages);
          }
        }
      } catch (err) {
        console.log('No existing welcome page found or error fetching:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchWelcomePageData();
  }, [tenentId]);

  const handleBodyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setBodyLength(value.length);
    setMessageTemplate({ ...messageTemplate, body: value });
  };

  const handleWorkflowTypeChange = (index: number, type: 'payload' | 'weburl') => {
    const updatedWorkflows = [...workflows];
    updatedWorkflows[index].type = type;
    setWorkflows(updatedWorkflows);
  };

  const handleWorkflowTitleChange = (index: number, title: string) => {
    if (title === 'ENTER_CUSTOM_TITLE') {
      // Enable custom title mode
      const updatedCustomTitleMode = [...customTitleMode];
      updatedCustomTitleMode[index] = true;
      setCustomTitleMode(updatedCustomTitleMode);
      
      // Clear the title and hide dropdown
      const updatedWorkflows = [...workflows];
      updatedWorkflows[index].title = '';
      setWorkflows(updatedWorkflows);
    } else {
      const updatedWorkflows = [...workflows];
      updatedWorkflows[index].title = title;
      
      // Find matching template message to set the payload
      const templateMessage = templateMessages.find(tm => tm.title === title);
      if (templateMessage) {
        updatedWorkflows[index].payload = templateMessage.payload;
      } else if (title === 'TALK WITH AGENT') {
        updatedWorkflows[index].payload = 'HUMAN_AGENT';
      } 
      
      setWorkflows(updatedWorkflows);
    }
    
    // Hide dropdown after selection
    const updatedShowTitleOptions = [...showTitleOptions];
    updatedShowTitleOptions[index] = false;
    setShowTitleOptions(updatedShowTitleOptions);
  };
  
  const togglePayloadOptions = (index: number) => {
    const updatedShowPayloadOptions = [...showPayloadOptions];
    updatedShowPayloadOptions[index] = !updatedShowPayloadOptions[index];
    setShowPayloadOptions(updatedShowPayloadOptions);
  };
  
  const handlePayloadOptionChange = (index: number, payload: string) => {
    if (payload === 'ENTER_CUSTOM_PAYLOAD') {
      // Enable custom payload mode
      const updatedCustomPayloadMode = [...customPayloadMode];
      updatedCustomPayloadMode[index] = true;
      setCustomPayloadMode(updatedCustomPayloadMode);
      
      // Clear the payload and hide dropdown
      const updatedWorkflows = [...workflows];
      updatedWorkflows[index].payload = '';
      setWorkflows(updatedWorkflows);
    } else {
      const updatedWorkflows = [...workflows];
      updatedWorkflows[index].payload = payload;
      
      // Find matching template message to set the title
      const templateMessage = templateMessages.find(tm => tm.payload === payload);
      if (templateMessage && !updatedWorkflows[index].title) {
        updatedWorkflows[index].title = templateMessage.title;
      }
      
      setWorkflows(updatedWorkflows);
    }
    
    // Hide dropdown after selection
    const updatedShowPayloadOptions = [...showPayloadOptions];
    updatedShowPayloadOptions[index] = false;
    setShowPayloadOptions(updatedShowPayloadOptions);
  };
  
  const handleCustomTitleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const updatedWorkflows = [...workflows];
    updatedWorkflows[index].title = e.target.value;
    setWorkflows(updatedWorkflows);
  };

  const handleCustomPayloadChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const updatedWorkflows = [...workflows];
    updatedWorkflows[index].payload = e.target.value;
    setWorkflows(updatedWorkflows);
  };
  
  const toggleTitleOptions = (index: number) => {
    const updatedShowTitleOptions = [...showTitleOptions];
    updatedShowTitleOptions[index] = !updatedShowTitleOptions[index];
    setShowTitleOptions(updatedShowTitleOptions);
  };

  const handleWorkflowPayloadChange = (index: number, payload: string) => {
    const updatedWorkflows = [...workflows];
    updatedWorkflows[index].payload = payload;
    setWorkflows(updatedWorkflows);
  };

  const addWorkflow = () => {
    if (workflows.length < MAX_WORKFLOWS) {
      setWorkflows([...workflows, { type: 'payload', title: '', payload: '' }]);
      setShowTitleOptions([...showTitleOptions, false]);
      setShowPayloadOptions([...showPayloadOptions, false]);
      setCustomTitleMode([...customTitleMode, false]);
      setCustomPayloadMode([...customPayloadMode, false]);
    }
  };

  const removeWorkflow = (index: number) => {
    const updatedWorkflows = [...workflows];
    updatedWorkflows.splice(index, 1);
    setWorkflows(updatedWorkflows);
    
    const updatedShowTitleOptions = [...showTitleOptions];
    updatedShowTitleOptions.splice(index, 1);
    setShowTitleOptions(updatedShowTitleOptions);
    
    const updatedShowPayloadOptions = [...showPayloadOptions];
    updatedShowPayloadOptions.splice(index, 1);
    setShowPayloadOptions(updatedShowPayloadOptions);

    const updatedCustomTitleMode = [...customTitleMode];
    updatedCustomTitleMode.splice(index, 1);
    setCustomTitleMode(updatedCustomTitleMode);

    const updatedCustomPayloadMode = [...customPayloadMode];
    updatedCustomPayloadMode.splice(index, 1);
    setCustomPayloadMode(updatedCustomPayloadMode);
  };

  const handleSubmit = async () => {
    try {
      if (!messageTemplate.body.trim()) {
        setError('Message body is required.');
        return;
      }

      if (!tenentId) {
        setError('Tenant ID is missing. Please log in again.');
        return;
      }

      setIsLoading(true);
      setError(null);

      const formData = new FormData();
      formData.append('tenentId', tenentId);
      formData.append('body', messageTemplate.body);
      formData.append('workflows', JSON.stringify(workflows));
      if (username) {
        formData.append('username', username);
      }

      const response = await axios.post(`${API_BASE_URL}/api/welcomepageroute/welcome-page`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        alert('Welcome message saved successfully!');
        console.log('Server response:', response.data);
      } else {
        setError(response.data.message || 'Failed to save message.');
        console.error('Error response:', response.data);
      }
    } catch (error) {
      console.error('Error submitting message:', error);
      setError('An error occurred while saving the message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Get title options from template messages or use defaults
  const getTitleOptions = () => {
    if (templateMessages.length > 0) {
      // Extract unique titles from template messages and add custom option
      return [...new Set([...templateMessages.map(tm => tm.title), ...titleOptions]), 'ENTER_CUSTOM_TITLE'];
    }
    return [...titleOptions, 'ENTER_CUSTOM_TITLE'];
  };

  // Get payload options from template messages or use defaults
  const getPayloadOptions = () => {
    if (templateMessages.length > 0) {
      // Extract unique payloads from template messages and add custom option
      return [...new Set([...templateMessages.map(tm => tm.payload), ...payloadOptions]), 'ENTER_CUSTOM_PAYLOAD'];
    }
    return [...payloadOptions, 'ENTER_CUSTOM_PAYLOAD'];
  };

  // Custom mobile button component with updated styles (white bg, black text, black border)
  const MobileButton = ({ text }: { text: string }) => {
    return (
      <button
        className="w-full py-2 px-4 bg-white text-black border border-black rounded-md text-sm font-medium transition-colors hover:bg-gray-200 active:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
      >
        {text}
      </button>
    );
  };

  return (
    <div className="flex flex-col md:flex-row gap-8 p-6 bg-gray-100 min-h-screen">
      {/* Left Panel */}
      <div className="flex-1 bg-white rounded-lg shadow-md p-6 flex flex-col">
        <h2 className="text-lg font-semibold mb-6">Create Welcome Message</h2>
        
        {/* Display username if available */}
        {username && (
          <div className="mb-4 p-2 bg-blue-50 rounded-md">
            <p className="text-sm text-blue-800">
              <span className="font-semibold">User:</span> {username}
            </p>
          </div>
        )}
        
        {/* Body */}
        <div className="mb-6">
          <div className="flex justify-between mb-1">
            <p className="font-bold text-gray-700">Enter message text</p>
            <span className="text-sm text-gray-500">({bodyLength} / {MAX_BODY_LENGTH})</span>
          </div>
          <textarea
            id="bodyInput"
            value={messageTemplate.body}
            onChange={handleBodyChange}
            maxLength={MAX_BODY_LENGTH}
            className="w-full px-3 py-2 border border-gray-300 rounded-md h-24"
            required
          />
        </div>

        {/* Workflows */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-3">Workflows</h3>

          {workflows.map((workflow, index) => (
            <div key={index} className="mb-6 p-4 border border-gray-200 rounded-lg">
              <div className="flex gap-4 mb-4 items-center">
                {/* Choose Button Group */}
                <div className="flex border border-gray-300 rounded-md overflow-hidden">
                  <button 
                    className={`px-4 py-2 text-sm ${workflow.type === 'payload' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
                    onClick={() => handleWorkflowTypeChange(index, 'payload')}
                  >
                    Payload
                  </button>
                  <button 
                    className={`px-4 py-2 text-sm ${workflow.type === 'weburl' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
                    onClick={() => handleWorkflowTypeChange(index, 'weburl')}
                  >
                    Web-URL
                  </button>
                </div>

                <button 
                  className="text-red-500 font-semibold text-lg" 
                  onClick={() => removeWorkflow(index)}
                  disabled={workflows.length <= 1}
                  style={{ opacity: workflows.length <= 1 ? 0.5 : 1 }}
                >
                  ×
                </button>
              </div>

              {/* Title and Payload Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  {workflow.type === 'payload' ? (
                    <>
                      {customTitleMode[index] ? (
                        <input
                          type="text"
                          value={workflow.title}
                          onChange={(e) => handleCustomTitleChange(index, e)}
                          placeholder="Enter custom title..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          autoFocus
                        />
                      ) : (
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => toggleTitleOptions(index)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-left flex justify-between items-center"
                          >
                            {workflow.title || "Select title..."}
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                            </svg>
                          </button>
                          
                          {showTitleOptions[index] && (
                            <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                              {getTitleOptions().map((option) => (
                                <div
                                  key={option}
                                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                  onClick={() => handleWorkflowTitleChange(index, option)}
                                >
                                  {option === 'ENTER_CUSTOM_TITLE' ? 'Enter custom title' : option}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <input
                      type="text"
                      value={workflow.title}
                      onChange={(e) => handleCustomTitleChange(index, e)}
                      placeholder="Enter custom title..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  )}
                </div>
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {workflow.type === 'payload' ? 'Payload' : 'URL'}
                  </label>
                  {workflow.type === 'payload' ? (
                    <>
                      {customPayloadMode[index] ? (
                        <input
                          type="text"
                          value={workflow.payload}
                          onChange={(e) => handleCustomPayloadChange(index, e)}
                          placeholder="Enter custom payload..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          autoFocus
                        />
                      ) : (
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => togglePayloadOptions(index)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-left flex justify-between items-center"
                          >
                            {workflow.payload || "Select payload..."}
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                            </svg>
                          </button>
                          
                          {showPayloadOptions[index] && (
                            <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                              {getPayloadOptions().map((option) => (
                                <div
                                  key={option}
                                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                  onClick={() => handlePayloadOptionChange(index, option)}
                                >
                                  {option === 'ENTER_CUSTOM_PAYLOAD' ? 'Enter custom payload' : option}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <input
                      type="text"
                      value={workflow.payload}
                      onChange={(e) => handleWorkflowPayloadChange(index, e.target.value)}
                      placeholder="Enter URL..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {/* Add Workflow Button - Only visible if fewer than MAX_WORKFLOWS */}
          {workflows.length < MAX_WORKFLOWS && (
            <button 
              className="flex items-center gap-2 text-blue-600 font-medium"
              onClick={addWorkflow}
            >
              <span className="text-lg">+</span> Add Workflow
            </button>
          )}
        </div>
        
        {/* Error display */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-md">
            {error}
          </div>
        )}
        
        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className={`${isLoading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'} text-white py-2 rounded-md mt-auto flex justify-center items-center`}
        >
          {isLoading ? 'Saving...' : 'Submit Message'}
        </button>
      </div>

      {/* Right Panel - Mobile UI Preview */}
      <div className="md:w-1/2 flex justify-center items-start mt-8 md:mt-0">
        <div className="w-[320px] h-[640px] bg-white border-8 border-black rounded-[2rem] shadow-xl relative overflow-hidden">
          {/* Status Bar */}
          <div className="bg-white h-8 w-full flex justify-between items-center px-4 border-b border-gray-200">
            <span className="text-sm font-medium text-black">3:28</span>
            <div className="flex items-center space-x-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12,21L15.6,16.2C14.6,15.45 13.35,15 12,15C10.65,15 9.4,15.45 8.4,16.2L12,21M12,3C7.95,3 4.21,4.34 1.2,6.6L3,9C5.5,7.12 8.62,6 12,6C15.38,6 18.5,7.12 21,9L22.8,6.6C19.79,4.34 16.05,3 12,3M12,9C9.3,9 6.81,9.89 4.8,11.4L6.6,13.8C8.1,12.67 9.97,12 12,12C14.03,12 15.9,12.67 17.4,13.8L19.2,11.4C17.19,9.89 14.7,9 12,9Z" />
              </svg>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17,2V5H14V7H17V10H19V7H22V5H19V2M7,5H11V7H7V11H5V7H1V5H5V1H7M7,13H11V15H7V19H5V15H1V13H5V9H7" />
              </svg>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M16,17H8V6H16M16.67,4H15V2H9V4H7.33A1.33,1.33 0 0,0 6,5.33V20.67C6,21.4 6.6,22 7.33,22H16.67A1.33,1.33 0 0,0 18,20.67V5.33C18,4.6 17.4,4 16.67,4Z" />
              </svg>
            </div>
          </div>

          {/* Chat Header - Now using the username from API */}
          <div className="bg-gray-50 px-4 py-2 flex items-center border-b border-gray-200">
            <button className="mr-4">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden border-2 border-green-400">
                {/* Business Avatar */}
                <img 
                  src={chat_logo} 
                  alt="Business Avatar" 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.onerror = null; 
                    e.currentTarget.src = 'https://via.placeholder.com/40';
                  }}
                />
              </div>
              <div className="ml-3">
                <div className="font-medium text-sm">{username}</div>
              </div>
            </div>
            <div className="ml-auto flex space-x-3">
              <button>
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </button>
              <button>
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Chat Content */}
          <div className="h-[480px] bg-gray-100 p-4 overflow-y-auto flex flex-col space-y-4">
            {/* Bot Message with buttons inside */}
            <div className="flex flex-col max-w-[80%]">
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <p className="text-sm text-gray-800 whitespace-pre-wrap mb-2">{messageTemplate.body}</p>
                
                {/* Action Buttons inside message bubble */}
                <div className="space-y-2 w-full mt-2">
                  {actionButtons.map((button, index) => (
                    <MobileButton key={index} text={button} />
                  ))}
                </div>
              </div>
             
            </div>
          </div>

          {/* Message Input */}
          <div className="absolute bottom-0 left-0 right-0 bg-gray-50 p-2 border-t border-gray-200 flex items-center">
            <button className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center mr-2">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              </svg>
            </button>
            <div className="flex-1 bg-white rounded-full border border-gray-300 flex items-center px-3 py-1">
              <span className="text-gray-500 text-sm">Message...</span>
            </div>
            <button className="ml-2">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>
            <button className="ml-2">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
            <button className="ml-2">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            <button className="ml-2">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstaxBot;