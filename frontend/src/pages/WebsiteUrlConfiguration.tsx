import { useState } from 'react';
import axios from 'axios';
import { Globe, ShoppingBag, ShoppingCart} from 'lucide-react';

// Define interfaces for our types
interface ShopifyCredentials {
  apiKey: string;
  apiPassword: string;
  storeUrl: string;
  websiteUrl?: string;
}

interface WooCommerceCredentials {
  consumerKey: string;
  consumerSecret: string;
  url: string;
}

type StoreCredentials = ShopifyCredentials | WooCommerceCredentials;

interface Website {
  id: number;
  type: 'shopify' | 'woocommerce';
  credentials: StoreCredentials;
}

export default function WebsiteUrlConfiguration() {
  const [websites, setWebsites] = useState<Website[]>([
    {
      id: 1,
      type: 'shopify',
      credentials: {
        apiKey: '',
        apiPassword: '',
        storeUrl: '',
        websiteUrl: ''
      }
    }
  ]);

  const [loading, setLoading] = useState<boolean>(false);

  const handleTypeChange = (id: number, newType: 'shopify' | 'woocommerce') => {
    setWebsites(prev => 
      prev.map(website => 
        website.id === id ? {
          ...website,
          type: newType,
          credentials: newType === 'shopify' 
            ? { apiKey: '', apiPassword: '', storeUrl: '', websiteUrl: '' } 
            : { consumerKey: '', consumerSecret: '', url: '' }
        } : website
      )
    );
  };

  const handleCredentialChange = (id: number, field: string, value: string) => {
    // For all fields - removed special validation
    setWebsites(prev => 
      prev.map(website => 
        website.id === id ? {
          ...website,
          credentials: {
            ...website.credentials,
            [field]: value
          }
        } : website
      )
    );
  };

  const addWebsite = () => {
    setWebsites(prev => [
      ...prev, 
      {
        id: prev.length + 1,
        type: 'shopify',
        credentials: {
          apiKey: '',
          apiPassword: '',
          storeUrl: '',
          websiteUrl: ''
        }
      }
    ]);
  };

  const removeWebsite = (id: number) => {
    if (websites.length === 1) {
      alert('You need at least one website configuration.');
      return;
    }
    
    setWebsites(prev => prev.filter(website => website.id !== id));
  };

  const validateCredentials = (website: Website) => {
    if (website.type === 'shopify') {
      const credentials = website.credentials as ShopifyCredentials;
      // Remove URL validation checks, just check if fields have values
      return credentials.apiKey && credentials.apiPassword && credentials.storeUrl;
    } else {
      const credentials = website.credentials as WooCommerceCredentials;
      return credentials.consumerKey && credentials.consumerSecret && credentials.url;
    }
  };

  const handleSave = async () => {
    const tenentId = localStorage.getItem('tenentid');
    if (!tenentId) {
      alert('Session information missing. Please log in again.');
      return;
    }

    // Validate all websites have complete credentials
    const invalidWebsites = websites.filter(website => !validateCredentials(website));
    if (invalidWebsites.length > 0) {
      alert('Please fill in all credential fields for all websites with valid information.');
      return;
    }

    setLoading(true);

    try {
      // Use the API route like in the second code
      await axios.post(
        'https://app.instaxbot.com/api/urlconfigurationroute/storeCredentials',
        {
          websites,
          tenentId
        }
      );
      
      alert('Website credentials have been saved!');
    } catch (error) {
      console.error('Error saving credentials:', error);
      alert('An error occurred while saving your credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen p-3 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="p-4 sm:p-6 text-center">
          <div className="flex justify-center mb-2 sm:mb-3">
            <Globe className="w-12 h-12 sm:w-16 sm:h-16 text-black" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-black">E-commerce Integration</h1>
          </div>
          <p className="text-gray-500 font-normal mt-1 text-sm sm:text-base">Configure your store credentials for order status and product availability</p>
        </div>

        <div className="bg-white shadow-md rounded-b-lg p-3 sm:p-6 space-y-4 sm:space-y-6">
          {websites.map((website) => (
            <div key={website.id} className="border border-gray-200 rounded-lg p-3 sm:p-5">
              <div className="flex justify-between items-center mb-3 sm:mb-4 pb-2 border-b">
                <div className="flex items-center gap-2">
                  {website.type === 'shopify' ? 
                    <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-pink-600" /> : 
                    <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 text-pink-600" />
                  }
                  <h2 className="text-base sm:text-lg font-semibold text-gray-800">Store #{website.id}</h2>
                </div>
                <button 
                  onClick={() => removeWebsite(website.id)}
                  className="text-pink-500 hover:text-pink-700 text-xs sm:text-sm font-medium"
                >
                  Remove
                </button>
              </div>
              
              <div className="mb-4 sm:mb-6">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Platform Type</label>
                <div className="flex gap-2 sm:gap-3 flex-wrap">
                  <button 
                    onClick={() => handleTypeChange(website.id, 'shopify')}
                    className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium ${
                      website.type === 'shopify' 
                        ? 'bg-pink-100 text-pink-700 border border-pink-300' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Shopify
                  </button>
                  <button 
                    onClick={() => handleTypeChange(website.id, 'woocommerce')}
                    className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium ${
                      website.type === 'woocommerce' 
                        ? 'bg-pink-100 text-pink-700 border border-pink-300' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    WooCommerce
                  </button>
                </div>
              </div>

              {website.type === 'shopify' ? (
                <div className="space-y-3 sm:space-y-4">
                  <h3 className="font-medium text-gray-900 border-b pb-2 mb-3 sm:mb-4 text-sm sm:text-base">Shopify Website Integration</h3>
                  <div>
                    <label className="flex items-center text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      <span className="mr-1">1.</span> Shopify API Key
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <input
                      type="text"
                      value={(website.credentials as ShopifyCredentials).apiKey}
                      onChange={(e) => handleCredentialChange(website.id, 'apiKey', e.target.value)}
                      placeholder="Enter your Shopify API Key"
                      className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 text-xs sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="flex items-center text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      <span className="mr-1">2.</span> Shopify API Password
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <input
                      type="password"
                      value={(website.credentials as ShopifyCredentials).apiPassword}
                      onChange={(e) => handleCredentialChange(website.id, 'apiPassword', e.target.value)}
                      placeholder="Enter your Shopify API Password"
                      className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 text-xs sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="flex flex-wrap items-center text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      <span className="mr-1">3.</span> Shopify Store URL
                      <span className="text-red-500 ml-1">*</span>
                      <span className="text-xs text-gray-500 ml-1 sm:ml-2 w-full sm:w-auto mt-0.5 sm:mt-0">(Format: your-store.myshopify.com)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={(website.credentials as ShopifyCredentials).storeUrl}
                        onChange={(e) => handleCredentialChange(website.id, 'storeUrl', e.target.value)}
                        placeholder="your-store.myshopify.com"
                        className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 text-xs sm:text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="flex items-center text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      <span className="mr-1">4.</span> Shopify Website URL
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={(website.credentials as ShopifyCredentials).websiteUrl || ''}
                        onChange={(e) => handleCredentialChange(website.id, 'websiteUrl', e.target.value)}
                        placeholder="https://your-shop-name.com"
                        className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 text-xs sm:text-sm"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Enter your public-facing Shopify website URL (optional)</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  <h3 className="font-medium text-gray-900 border-b pb-2 mb-3 sm:mb-4 text-sm sm:text-base">WooCommerce Website Integration</h3>
                  <div>
                    <label className="flex items-center text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      <span className="mr-1">1.</span> WooCommerce Consumer Key
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <input
                      type="text"
                      value={(website.credentials as WooCommerceCredentials).consumerKey}
                      onChange={(e) => handleCredentialChange(website.id, 'consumerKey', e.target.value)}
                      placeholder="Enter your WooCommerce Consumer Key"
                      className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 text-xs sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="flex items-center text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      <span className="mr-1">2.</span> WooCommerce Consumer Secret
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <input
                      type="password"
                      value={(website.credentials as WooCommerceCredentials).consumerSecret}
                      onChange={(e) => handleCredentialChange(website.id, 'consumerSecret', e.target.value)}
                      placeholder="Enter your WooCommerce Consumer Secret"
                      className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 text-xs sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="flex items-center text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      <span className="mr-1">3.</span> WooCommerce Site URL
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <input
                      type="text"
                      value={(website.credentials as WooCommerceCredentials).url}
                      onChange={(e) => handleCredentialChange(website.id, 'url', e.target.value)}
                      placeholder="https://your-woocommerce-site.com"
                      className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 text-xs sm:text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">Enter your complete WooCommerce website URL including https://</p>
                  </div>
                </div>
              )}
            </div>
          ))}

          <div className="flex flex-col sm:flex-row sm:justify-between pt-3 sm:pt-4 border-t gap-3 sm:gap-0">
            <button 
              onClick={addWebsite}
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-xs sm:text-sm font-medium"
            >
              Add Another Store
            </button>
            
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-4 sm:px-6 py-1.5 sm:py-2 bg-white text-black rounded-md border-2 border-pink-500 hover:border-pink-600 hover:bg-pink-300 text-xs sm:text-sm font-medium"
            >
              {loading ? 'Saving...' : 'Save All Credentials'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}