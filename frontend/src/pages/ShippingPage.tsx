'use client';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

interface ShippingMethod {
  _id?: string;
  tenentId: string;
  name: string;
  type: 'FREE_SHIPPING' | 'COURIER_PARTNER';
  minAmount?: number;
  useWeight: boolean;
  ratePerKg?: number;
  fixedRate?: number;
  //courierId?: string;
  isActive: boolean;
}

interface AxiosErrorType {
  response?: {
    data: any;
    status: number;
  };
}

const ShippingPage: React.FC = () => {
  const [methods, setMethods] = useState<ShippingMethod[]>([]);
 
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<number | null>(null);

  // Hardcoded tenant ID - in a real app, this would come from authentication context
  const tenentId = localStorage.getItem('tenentid') || '';
  const appUrl = process.env.REACT_APP_API_URL || 'https://app.instaxbot.com';

  // Fetch shipping methods
  const fetchShippingMethods = async () => {
    try {
      setError(null);
      setIsLoading(true);

      console.log('Fetching shipping methods:', `${appUrl}/api/shippingmethodroute/${tenentId}`);

      const response = await axios.get(`${appUrl}/api/shippingmethodroute/${tenentId}`);
      
      console.log('Shipping methods response:', response.data);

      // Validate response structure
      if (Array.isArray(response.data)) {
        setMethods(response.data);
      } else {
        console.error('Invalid response format:', response.data);
        setMethods([]);
        setError('Received invalid data from server');
      }
    } catch (error: unknown) {
      console.error('Error fetching shipping methods:', error);
      
      // Type-safe error handling
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as AxiosErrorType;
        if (axiosError.response) {
          console.error('Response data:', axiosError.response.data);
          console.error('Response status:', axiosError.response.status);
        }
      }
      
      setMethods([]);
      setError('Failed to load shipping methods. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchShippingMethods();
  }, []);

  // Add new shipping method
  const handleAddMethod = () => {
    const newMethod: ShippingMethod = {
      tenentId,
      name: '',
      type: 'COURIER_PARTNER',
      useWeight: false,
      isActive: true,
    };
    setMethods([...methods, newMethod]);
    setIsEditing(methods.length);
  };

  // Save shipping method
  const handleMethodSave = async (method: ShippingMethod, index: number) => {
    // Validate method name
    if (!method.name) {
      setError('Please enter a method name');
      return;
    }

    setIsLoading(true);
    try {
      const url = method._id 
        ? `${appUrl}/api/shippingmethodroute/update/${method._id}` 
        : `${appUrl}/api/shippingmethodroute/create`;
      
      const methodData = { 
        ...method, 
        tenentId 
      };

      console.log('Saving shipping method:', { url, method: method._id ? 'PUT' : 'POST', data: methodData });

      const response = await axios[method._id ? 'put' : 'post'](url, methodData);

      console.log('Save method response:', response.data);

      const updatedMethods = [...methods];
      updatedMethods[index] = response.data.method;
      setMethods(updatedMethods);
      setIsEditing(null);
      
      toast.success('Shipping method saved successfully');
    } catch (error: unknown) {
      console.error('Error saving shipping method:', error);
      
      // Type-safe error handling
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as AxiosErrorType;
        if (axiosError.response) {
          console.error('Response data:', axiosError.response.data);
          console.error('Response status:', axiosError.response.status);
        }
      }
      
      setError('Failed to save shipping method. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete shipping method
  const handleMethodDelete = async (id: string) => {
    try {
      setError(null);
      
      console.log('Deleting shipping method:', {
        url: `${appUrl}/api/shippingmethodroute/delete/${id}`
      });

      const response = await axios.delete(`${appUrl}/api/shippingmethodroute/delete/${id}`, {
        data: { tenentId }
      });
      
      console.log('Delete method response:', response.data);

      setMethods(methods.filter(m => m._id !== id));
      toast.success('Shipping method deleted');
    } catch (error: unknown) {
      console.error('Error deleting shipping method:', error);
      
      // Type-safe error handling
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as AxiosErrorType;
        if (axiosError.response) {
          console.error('Response data:', axiosError.response.data);
          console.error('Response status:', axiosError.response.status);
        }
      }
      
      setError('Failed to delete shipping method. Please try again.');
    }
  };

  // Update method fields during editing
  const updateMethodField = (index: number, updates: Partial<ShippingMethod>) => {
    const updatedMethods = [...methods];
    updatedMethods[index] = { ...updatedMethods[index], ...updates };
    setMethods(updatedMethods);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-2xl font-bold mb-6">Shipping Methods</h1>
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
          <p>{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="flex justify-between items-center p-6 border-b">
            <h2 className="text-lg font-medium">Current Shipping Methods</h2>
            <button
              onClick={handleAddMethod}
              className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
            >
              Add New Method
            </button>
          </div>

          {methods.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No shipping methods found. Add a new method to get started.
            </div>
          ) : (
            <div className="divide-y">
              {methods.map((method, index) => (
                <div key={method._id || index} className="p-6">
                  {isEditing === index ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-gray-700 mb-2">Method Name</label>
                        <input
                          type="text"
                          value={method.name}
                          onChange={(e) => updateMethodField(index, { name: e.target.value })}
                          className="w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter method name"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-gray-700 mb-2">Shipping Type</label>
                        <select
                          value={method.type}
                          onChange={(e) => {
                            const newType = e.target.value as ShippingMethod['type'];
                            updateMethodField(index, { 
                              type: newType,
                              // Reset fields based on type
                              ...(newType === 'FREE_SHIPPING' 
                                ? { useWeight: false, ratePerKg: undefined, fixedRate: undefined }
                                : {})
                            });
                          }}
                          className="w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="FREE_SHIPPING">Free Shipping</option>
                          <option value="COURIER_PARTNER">Courier Partner</option>
                        </select>
                      </div>

                      {method.type === 'FREE_SHIPPING' && (
                        <div>
                          <label className="block text-gray-700 mb-2">Minimum Order Amount</label>
                          <input
                            type="number"
                            value={method.minAmount || ''}
                            onChange={(e) => updateMethodField(index, { 
                              minAmount: e.target.value ? parseFloat(e.target.value) : undefined 
                            })}
                            className="w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter minimum order amount"
                          />
                        </div>
                      )}

                      {method.type === 'COURIER_PARTNER' && (
                        <>
                          <div className="flex items-center mb-4">
                            <label className="mr-4 text-gray-700">Use Weight-based Pricing</label>
                            <input
                              type="checkbox"
                              checked={method.useWeight}
                              onChange={(e) => updateMethodField(index, { 
                                useWeight: e.currentTarget.checked,
                                ratePerKg: e.currentTarget.checked ? method.ratePerKg : undefined,
                                fixedRate: e.currentTarget.checked ? undefined : method.fixedRate
                              })}
                              className="form-checkbox h-5 w-5 text-blue-600"
                            />
                          </div>

                          {method.useWeight ? (
                            <div>
                              <label className="block text-gray-700 mb-2">Rate per KG</label>
                              <input
                                type="number"
                                value={method.ratePerKg || ''}
                                onChange={(e) => updateMethodField(index, { 
                                  ratePerKg: e.target.value ? parseFloat(e.target.value) : undefined 
                                })}
                                className="w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Enter rate per KG"
                              />
                            </div>
                          ) : (
                            <div>
                              <label className="block text-gray-700 mb-2">Fixed Shipping Rate</label>
                              <input
                                type="number"
                                value={method.fixedRate || ''}
                                onChange={(e) => updateMethodField(index, { 
                                  fixedRate: e.target.value ? parseFloat(e.target.value) : undefined 
                                })}
                                className="w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Enter fixed shipping rate"
                              />
                            </div>
                          )}
                        </>
                      )}

                      <div className="flex items-center mb-4">
                        <label className="mr-4 text-gray-700">Active</label>
                        <input
                          type="checkbox"
                          checked={method.isActive}
                          onChange={(e) => updateMethodField(index, { isActive: e.currentTarget.checked })}
                          className="form-checkbox h-5 w-5 text-blue-600"
                        />
                      </div>

                      <div className="flex justify-end space-x-4">
                        <button
                          onClick={() => setIsEditing(null)}
                          className="bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleMethodSave(method, index)}
                          disabled={isLoading}
                          className={`bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors ${
                            isLoading ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          {isLoading ? 'Saving...' : 'Save Method'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium text-lg">{method.name}</h3>
                        <p className="text-sm text-gray-600">
                          {method.type === 'FREE_SHIPPING' ? (
                            method.minAmount
                              ? `Free shipping for orders above ₹${method.minAmount}`
                              : 'Completely free shipping'
                          ) : method.useWeight ? 
                            `Weight-based: ₹${method.ratePerKg}/kg` : 
                            `Fixed rate: ₹${method.fixedRate}`
                          }
                        </p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <label className="flex items-center">
                          <span className="mr-2 text-gray-700">Active</span>
                          <input
                            type="checkbox"
                            checked={method.isActive}
                            onChange={(e) => {
                              const updatedMethod = { ...method, isActive: e.currentTarget.checked };
                              handleMethodSave(updatedMethod, index);
                            }}
                            className="form-checkbox h-5 w-5 text-blue-600"
                          />
                        </label>
                        <button
                          onClick={() => setIsEditing(index)}
                          className="bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded-lg transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => method._id && handleMethodDelete(method._id)}
                          className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ShippingPage;