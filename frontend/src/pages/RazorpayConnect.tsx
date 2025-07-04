'use client';
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import razorpay_logo from '../assets/razorpay_logo.png';

// Define interfaces for type safety
interface ConnectionData {
  isConnected: boolean;
  accountId: string | null;
  keyId: string | null;
  connectedSince: string | null;
}

// Removed unused Transaction interface

// Define interface for fetch options
interface FetchOptions extends RequestInit {
  headers?: Record<string, string>;
}

export default function RazorpayConnect() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [connectionData, setConnectionData] = useState<ConnectionData>({
    isConnected: false,
    accountId: null,
    keyId: null,
    connectedSince: null
  });
  // Removed unused state variables

  // Get tenant ID from local storage
  const getTenantId = useCallback(() => {
    const tenantId = localStorage.getItem('tenentid');
    if (!tenantId) {
      toast.error("Tenant ID not found. Please login again.");
      return null;
    }
    return tenantId;
  }, []);
  
  // API helper function with error handling
  const fetchWithErrorHandling = useCallback(async (url: string, options: FetchOptions = {}) => {
    const tenantId = getTenantId();
    if (!tenantId) return null;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': tenantId,
          ...(options.headers || {})
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        // Extract more meaningful error message if available
        const errorMessage = data.message || data.error || `Error: ${response.status}`;
        throw new Error(errorMessage);
      }
      
      return data;
    } catch (error) {
      console.error(`API Error (${url}):`, error);
      throw error;
    }
  }, [getTenantId]);

  // Check if the user has a connected Razorpay account
  const checkRazorpayConnection = useCallback(async () => {
    try {
      const data = await fetchWithErrorHandling('/api/razorpayroute/check-connection');
      if (!data) return;
      
      setConnectionData(data);
      
      // Removed fetchTransactions call
    } catch (error) {
      toast.error("Could not verify Razorpay connection status.");
    }
  }, [fetchWithErrorHandling]);

  useEffect(() => {
    checkRazorpayConnection();
  }, [checkRazorpayConnection]);

  // Removed fetchTransactions function

  // Connect to Razorpay OAuth
  const handleConnect = useCallback(async () => {
    try {
      setIsLoading(true);
      const tenantId = getTenantId();
      if (!tenantId) {
        setIsLoading(false);
        return;
      }

      const data = await fetchWithErrorHandling('/api/razorpayroute/authorize', {
        method: 'POST',
        body: JSON.stringify({ tenentId: tenantId })
      });
      
      if (!data || !data.authUrl) {
        throw new Error('Invalid response from server');
      }
      
      // Redirect to Razorpay authorization page
      window.location.href = data.authUrl;
    } catch (error) {
      toast.error("Failed to connect with Razorpay. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [getTenantId, fetchWithErrorHandling]);

  // Disconnect Razorpay integration
  const handleDisconnect = useCallback(async () => {
    try {
      setIsLoading(true);
      const tenantId = getTenantId();
      if (!tenantId) {
        setIsLoading(false);
        return;
      }
      
      await fetchWithErrorHandling('/api/razorpayroute/disconnect', {
        method: 'POST',
        body: JSON.stringify({ tenentId: tenantId })
      });
      
      toast.success("Razorpay disconnected successfully");
      setConnectionData({
        isConnected: false,
        accountId: null,
        keyId: null,
        connectedSince: null
      });
      // Removed setTransactions call
    } catch (error) {
      toast.error("Failed to disconnect Razorpay. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [getTenantId, fetchWithErrorHandling]);

  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Removed unused helper functions

  return (
    <div className="flex flex-col items-center">
      {/* Title positioned above the box */}
      <h2 className="text-xl font-semibold text-center mt-10 mb-6 ">Razorpay Integration</h2>
      
      {/* Connection Status Box */}
      <div className="w-full max-w-3xl p-6 border rounded-lg shadow-sm bg-white mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
          <div className="w-[100px] h-14 bg-gray-100 flex items-center justify-center rounded-md">
              <img src={razorpay_logo} alt="Razorpay" className="h-5" />
            </div>
            <div>
              <p className="text-md text-gray-900 font-medium">Razorpay Payments</p>
              <p className="text-sm text-gray-500">
                {connectionData.isConnected 
                  ? `Connected to account ${connectionData.accountId || 'Unknown'}` 
                  : 'connect '}
              </p>
              {connectionData.isConnected && connectionData.connectedSince && (
                <p className="text-xs text-gray-400">
                  Connected since {formatDate(connectionData.connectedSince)}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {!connectionData.isConnected ? (
              <button
                onClick={handleConnect}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isLoading ? 'Connecting...' : 'Connect Razorpay'}
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-green-600 text-sm font-semibold flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Connected
                </span>
              </div>
            )}
            
            {/* Disconnect button - always visible */}
            <button
              onClick={handleDisconnect}
              disabled={isLoading || !connectionData.isConnected}
              className={`px-4 py-2 text-sm font-medium rounded focus:outline-none focus:ring-2 focus:ring-red-500 ${
                connectionData.isConnected 
                  ? 'bg-red-600 text-white hover:bg-red-700' 
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isLoading && connectionData.isConnected ? 'Disconnecting...' : 'Disconnect'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}