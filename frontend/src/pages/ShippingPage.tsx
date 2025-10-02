'use client';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { Link } from 'react-router-dom'; // Import Link from react-router-dom

// Add custom styles for SweetAlert
const customSwalStyles = `
  .swal2-popup {
    border-radius: 10px !important;
    padding: 1.5rem !important;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
    width: 400px !important;
    max-width: 90vw !important;
    min-height: auto !important;
  }

  .swal2-icon.swal2-warning {
    border-color: #f59e0b !important;
    color: #f59e0b !important;
    font-size: 2rem !important;
    width: 60px !important;
    height: 60px !important;
    margin: 0 auto 1rem auto !important;
  }

  .swal2-icon.swal2-warning .swal2-icon-content {
    font-weight: bold !important;
    font-size: 2.5rem !important;
  }

  .swal2-title {
    font-size: 1.5rem !important;
    font-weight: 600 !important;
    color: #374151 !important;
    margin: 0 0 0.5rem 0 !important;
    line-height: 1.3 !important;
  }

  .swal2-html-container {
    font-size: 0.9rem !important;
    color: #6b7280 !important;
    margin: 0 0 1.25rem 0 !important;
    line-height: 1.4 !important;
  }

  .swal2-actions {
    margin-top: 1.25rem !important;
    justify-content: center !important;
    gap: 0.75rem !important;
    margin-bottom: 0 !important;
  }

  .swal2-confirm {
    background-color: #dc2626 !important;
    border: none !important;
    border-radius: 4px !important;
    padding: 0.6rem 1.25rem !important;
    font-weight: 500 !important;
    font-size: 0.875rem !important;
    min-width: 100px !important;
  }

  .swal2-cancel {
    background-color: #3b82f6 !important;
    border: none !important;
    border-radius: 4px !important;
    padding: 0.6rem 1.25rem !important;
    font-weight: 500 !important;
    font-size: 0.875rem !important;
    color: white !important;
    min-width: 80px !important;
  }

  .swal2-confirm:hover {
    background-color: #b91c1c !important;
  }

  .swal2-cancel:hover {
    background-color: #2563eb !important;
  }

  .swal2-container {
    padding: 0.75rem !important;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = customSwalStyles;
  document.head.appendChild(styleElement);
}

interface ShippingMethod {
  _id?: string;
  tenentId: string;
  name: string;
  type: 'FREE_SHIPPING' | 'COURIER_PARTNER';
  minAmount?: number;
  useWeight: boolean;
  ratePerKg?: number;
  fixedRate?: number;
  isActive: boolean;
}

const ShippingPage: React.FC = () => {
  const [methods, setMethods] = useState<ShippingMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<number | null>(null);

  const tenentId = localStorage.getItem('tenentid') || '';
  const appUrl = process.env.REACT_APP_API_URL || 'https://ddcf6bc6761a.ngrok-free.app';

  const fetchShippingMethods = async () => {
    try {
      setError(null);
      setIsLoading(true);
      const response = await axios.get(`${appUrl}/api/shippingmethodroute/${tenentId}`);
      if (Array.isArray(response.data)) {
        setMethods(response.data);
      } else {
        setError('Received invalid data from server');
        setMethods([]);
      }
    } catch (error: unknown) {
      setError('Failed to load shipping methods. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchShippingMethods();
  }, []);

  const handleAddMethod = () => {
    const newMethod: ShippingMethod = {
      tenentId,
      name: '',
      type: 'COURIER_PARTNER',
      useWeight: false,
      isActive: true,
    };
    setMethods([newMethod, ...methods]);
    setIsEditing(0);
  };

  const handleMethodSave = async (method: ShippingMethod, index: number) => {
    if (!method.name) {
      setError('Please enter a method name');
      return;
    }

    setIsLoading(true);
    try {
      const url = method._id
        ? `${appUrl}/api/shippingmethodroute/update/${method._id}`
        : `${appUrl}/api/shippingmethodroute/create`;

      const methodData = { ...method, tenentId };
      const response = await axios[method._id ? 'put' : 'post'](url, methodData);
      const updatedMethods = [...methods];
      updatedMethods[index] = response.data.method;
      setMethods(updatedMethods);
      setIsEditing(null);

      Swal.fire({
        title: 'Saved!',
        text: 'Shipping method has been saved successfully.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
        customClass: {
          popup: 'swal2-popup'
        }
      });

    } catch (error: unknown) {
      setError('Failed to save shipping method. Please try again.');

      Swal.fire({
        title: 'Error!',
        text: 'Failed to save shipping method. Please try again.',
        icon: 'error',
        confirmButtonColor: '#d33',
        customClass: {
          popup: 'swal2-popup'
        }
      });

    } finally {
      setIsLoading(false);
    }
  };

  const handleMethodDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
      reverseButtons: false,
      customClass: {
        popup: 'swal2-popup',
        title: 'swal2-title',
        htmlContainer: 'swal2-content',
        confirmButton: 'swal2-confirm',
        cancelButton: 'swal2-cancel',
        icon: 'swal2-icon'
      },
      buttonsStyling: true,
      allowOutsideClick: false,
      allowEscapeKey: false,
      focusConfirm: false,
      focusCancel: true
    });

    if (result.isConfirmed) {
      try {
        setError(null);
        await axios.delete(`${appUrl}/api/shippingmethodroute/delete/${id}`, {
          data: { tenentId },
        });
        setMethods(methods.filter(m => m._id !== id));

        // Success alert
        Swal.fire({
          title: 'Deleted!',
          text: 'Shipping method has been deleted successfully.',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false,
          customClass: {
            popup: 'swal2-popup'
          }
        });
      } catch (error: unknown) {
        setError('Failed to delete shipping method. Please try again.');

        // Error alert
        Swal.fire({
          title: 'Error!',
          text: 'Failed to delete shipping method. Please try again.',
          icon: 'error',
          confirmButtonColor: '#d33',
          customClass: {
            popup: 'swal2-popup'
          }
        });
      }
    }
  };

  const updateMethodField = (index: number, updates: Partial<ShippingMethod>) => {
    const updatedMethods = [...methods];
    updatedMethods[index] = { ...updatedMethods[index], ...updates };
    setMethods(updatedMethods);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* Back Button Added Here */}
      <Link
        to="/setting" // Navigates to the setting page
        className="inline-block mb-6 px-4 py-2 bg-white text-black-600 rounded-md font-medium hover:bg-pink-50 shadow-sm transition-all duration-300 border border-pink-200"
      >
        ← Back
      </Link>

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
              className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg"
            >
              Add New Method
            </button>
          </div>

          {methods.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No shipping methods found.
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
                          className="w-full p-3 border rounded-md"
                          placeholder="Enter method name"
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
                              ...(newType === 'FREE_SHIPPING'
                                ? { useWeight: false, ratePerKg: undefined, fixedRate: undefined }
                                : {}),
                            });
                          }}
                          className="w-full p-3 border rounded-md"
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
                            onChange={(e) =>
                              updateMethodField(index, {
                                minAmount: parseFloat(e.target.value) || undefined,
                              })
                            }
                            className="w-full p-3 border rounded-md"
                            placeholder="Enter amount"
                          />
                        </div>
                      )}
                      {method.type === 'COURIER_PARTNER' && (
                        <>
                          <div className="flex items-center mb-4">
                            <label className="mr-4 text-gray-700">Use Weight-based</label>
                            <input
                              type="checkbox"
                              checked={method.useWeight}
                              onChange={(e) =>
                                updateMethodField(index, {
                                  useWeight: e.currentTarget.checked,
                                  ratePerKg: e.currentTarget.checked ? method.ratePerKg : undefined,
                                  fixedRate: e.currentTarget.checked ? undefined : method.fixedRate,
                                })
                              }
                            />
                          </div>
                          {method.useWeight ? (
                            <div>
                              <label className="block text-gray-700 mb-2">Rate per KG</label>
                              <input
                                type="number"
                                value={method.ratePerKg || ''}
                                onChange={(e) =>
                                  updateMethodField(index, {
                                    ratePerKg: parseFloat(e.target.value) || undefined,
                                  })
                                }
                                className="w-full p-3 border rounded-md"
                                placeholder="Enter rate per KG"
                              />
                            </div>
                          ) : (
                            <div>
                              <label className="block text-gray-700 mb-2">Fixed Rate</label>
                              <input
                                type="number"
                                value={method.fixedRate || ''}
                                onChange={(e) =>
                                  updateMethodField(index, {
                                    fixedRate: parseFloat(e.target.value) || undefined,
                                  })
                                }
                                className="w-full p-3 border rounded-md"
                                placeholder="Enter fixed rate"
                              />
                            </div>
                          )}
                        </>
                      )}
                      <div className="flex justify-end space-x-4">
                        <button
                          onClick={() => setIsEditing(null)}
                          className="bg-gray-300 py-2 px-4 rounded"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleMethodSave(method, index)}
                          className="bg-blue-600 text-white py-2 px-4 rounded"
                        >
                          Save Method
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium text-lg">{method.name}</h3>
                        <p className="text-sm text-gray-600">
                          {method.type === 'FREE_SHIPPING'
                            ? method.minAmount
                              ? `Free over ₹${method.minAmount}`
                              : 'Completely free'
                            : method.useWeight
                            ? `₹${method.ratePerKg}/kg`
                            : `Fixed ₹${method.fixedRate}`}
                        </p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <button
                          onClick={() => setIsEditing(index)}
                          className="bg-gray-200 py-2 px-4 rounded"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleMethodDelete(method._id || '')}
                          className="bg-red-500 text-white py-2 px-4 rounded"
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
