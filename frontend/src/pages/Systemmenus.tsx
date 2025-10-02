import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { Link } from 'react-router-dom'; // Import Link from react-router-dom

interface PayloadItem {
  id: string;
  type: 'payload' | 'web-url';
  title: string;
  value: string; // Changed to match backend schema
}

const InstaxBotSystemMenu: React.FC = () => {
  const [payloads, setPayloads] = useState<PayloadItem[]>([]);

  // States for save functionality with tenent ID
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const addPayloadPayload = () => {
    const newPayload: PayloadItem = {
      id: Date.now().toString(),
      type: 'payload',
      title: '',
      value: '' // Use 'value' instead of 'payload'
    };
    setPayloads([...payloads, newPayload]);
  };

  const addWebUrlPayload = () => {
    const webUrlPayloads = payloads.filter(w => w.type === 'web-url');
    if (webUrlPayloads.length >= 2) {
      return; // Don't add more than 2 web-url payloads
    }
    
    const newPayload: PayloadItem = {
      id: Date.now().toString(),
      type: 'web-url',
      title: '',
      value: '' // Use 'value' instead of 'webUrl'
    };
    setPayloads([...payloads, newPayload]);
  };

  const removePayload = (id: string) => {
    setPayloads(payloads.filter(item => item.id !== id));
  };

  const updatePayload = (id: string, field: keyof PayloadItem, value: string) => {
    setPayloads(payloads.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  // Save system menu function with tenent ID
  const handleSaveSystemMenu = async () => {
    // Get tenentId from localStorage
    const tenentId = localStorage.getItem('tenentid');
    console.log('Retrieved tenentId from localStorage:', tenentId);
    
    if (!tenentId) {
      setErrorMessage('Tenent ID not found. Please log in again.');
      setTimeout(() => setErrorMessage(''), 5000);
      return;
    }

    // Validate payloads before saving
    const invalidPayloads = payloads.filter(item => !item.title.trim() || !item.value.trim());
    if (invalidPayloads.length > 0) {
      setErrorMessage('Please fill in all title and value fields before saving.');
      setTimeout(() => setErrorMessage(''), 5000);
      return;
    }

    setLoading(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      // No need to transform - payloads already match backend format
      const requestBody = {
        payloads: payloads.map(item => ({
          id: item.id,
          type: item.type,
          title: item.title.trim(),
          value: item.value.trim()
        })),
        tenentId: tenentId
      };

      console.log('Sending request with payloads:', requestBody);

      const response = await fetch('https://ddcf6bc6761a.ngrok-free.app/api/systemmenusroute/save-system-menu', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      // Check if response is actually JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response. Check if the API endpoint exists.');
      }

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccessMessage('System menu saved successfully');
        console.log('Saved data:', data.data);
        setTimeout(() => {
          setSuccessMessage('');
        }, 3000);
      } else {
        setErrorMessage(data.message || 'Failed to save system menu');
        setTimeout(() => setErrorMessage(''), 5000);
      }

    } catch (error) {
      console.error('Error saving system menu:', error);
      
      // More specific error handling with proper type checking
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        setErrorMessage('Network error. Please check if the server is running and try again.');
      } else if (error instanceof Error && error.message.includes('non-JSON response')) {
        setErrorMessage('API endpoint not found. Please check the server configuration.');
      } else if (error instanceof Error) {
        setErrorMessage(`Error: ${error.message}`);
      } else {
        setErrorMessage('Network error. Please check your connection and try again.');
      }
      
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 w-full">
      {/* Back Button is now here, matching the previous file's structure */}
      <Link
        to="/setting" // You can change this to the appropriate back path
        className="inline-block mb-6 ml-4 px-4 py-2 bg-white text-black-600 rounded-md font-medium hover:bg-pink-50 shadow-sm transition-all duration-300 border border-pink-200"
      >
        ← Back
      </Link>
      <div className="w-full max-w-2xl mx-auto">
        {/* Top Header - Compact like the image */}
        <div className="bg-white shadow-md rounded-xl mb-4 py-5 text-center">
          <h1 className="text-2xl font-semibold text-gray-800">
            InstaxBot System
          </h1>
        </div>
        
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="p-6 space-y-6">
            {/* Success Message */}
            {successMessage && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 text-center">
                {successMessage}
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-center">
                {errorMessage}
              </div>
            )}

            {/* Payload payloads Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Payload Options</h2>
                <button
                  onClick={addPayloadPayload}
                  className="flex items-center gap-2 px-3 py-1.5 bg-pink-500 text-white rounded-md hover:bg-pink-600 transition-colors text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Payload
                </button>
              </div>

              <div className="space-y-4">
                {payloads.filter(payload => payload.type === 'payload').map((payload) => (
                  <div key={payload.id} className="border border-pink-200 rounded-lg p-4 bg-pink-50">
                    <div className="flex items-center justify-between mb-4">
                      <span className="px-3 py-1 bg-pink-500 text-white text-xs font-medium rounded-full">
                        PAYLOAD
                      </span>
                      <button
                        onClick={() => removePayload(payload.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Input Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Title
                        </label>
                        <input
                          type="text"
                          value={payload.title}
                          onChange={(e) => updatePayload(payload.id, 'title', e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-md text-black placeholder-gray-400 shadow-md focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent"

                         placeholder="Enter title"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Payload Value
                        </label>
                        <input
                          type="text"
                          value={payload.value}
                          onChange={(e) => updatePayload(payload.id, 'value', e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-md text-black placeholder-gray-400 shadow-md focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent"

                          placeholder="Enter payload value"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Web-URL payloads Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Web-URL Options</h2>
                <button
                  onClick={addWebUrlPayload}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors text-sm ${
                    payloads.filter(w => w.type === 'web-url').length >= 2
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : 'bg-pink-500 text-white hover:bg-pink-600'
                  }`}
                  disabled={payloads.filter(w => w.type === 'web-url').length >= 2}
                >
                  <Plus className="w-4 h-4" />
                  Add Web-URL {payloads.filter(w => w.type === 'web-url').length >= 2 && '(Max 2)'}
                </button>
              </div>

              <div className="space-y-4">
                {payloads.filter(payload => payload.type === 'web-url').map((payload) => (
                  <div key={payload.id} className="border border-pink-200 rounded-lg p-4 bg-pink-50">
                    <div className="flex items-center justify-between mb-4">
                      <span className="px-3 py-1 bg-pink-500 text-white text-xs font-medium rounded-full">
                        WEB-URL
                      </span>
                      <button
                        onClick={() => removePayload(payload.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Input Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Title
                        </label>
                        <input
                          type="text"
                          value={payload.title}
                          onChange={(e) => updatePayload(payload.id, 'title', e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-md text-black placeholder-gray-400 shadow-md focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent"

                          placeholder="Enter title"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          URL
                        </label>
                        <input
                          type="url"
                          value={payload.value}
                          onChange={(e) => updatePayload(payload.id, 'value', e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-md text-black placeholder-gray-400 shadow-md focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent"

                          placeholder="Enter URL (e.g., https://example.com)"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary Section */}
            {payloads.length > 0 && (
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-100">
                <h3 className="font-semibold text-gray-800 mb-2">Summary</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>Total Items: {payloads.length}</p>
                  <p>Payload Items: {payloads.filter(p => p.type === 'payload').length}</p>
                  <p>Web-URL Items: {payloads.filter(p => p.type === 'web-url').length}/2</p>
                </div>
              </div>
            )}

            {/* Action Button */}
            <div className="flex justify-center pt-4 border-t border-gray-200">
              <button 
                onClick={handleSaveSystemMenu}
                className={`py-2 px-6 rounded-md font-medium transition-colors ${
                  payloads.length === 0 
                    ? 'bg-gray-100 text-gray-400 border border-gray-300 cursor-not-allowed' 
                    : 'bg-white text-black border-2 border-pink-300 hover:bg-pink-400 hover:text-white'
                }`}
                disabled={loading || payloads.length === 0}
              >
                {loading ? 'Saving...' : 'Save System Menu'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstaxBotSystemMenu;
