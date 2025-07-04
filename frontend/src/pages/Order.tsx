import { useState, useEffect } from 'react';
import { RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

interface Product {
  sku?: string;
  product_name?: string;
  quantity?: number;
  price?: number | string;
}

interface Order {
  id: string;
  date: string;
  name: string;
  products: Product[];
  phoneNumber: string;
  totalAmount: number;
  status: string;
  billNo?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  pincode?: string;
  country?: string;
  fullAddress?: string;
  landmark?: string;
  trackingNumber?: string;
}

interface ApiResponse {
  success: boolean;
  data: Order[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalOrders: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

const OrderManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [itemsPerPage] = useState(20);
  const [expandedOrders, setExpandedOrders] = useState(new Set<string>());
  const [expandedAddresses, setExpandedAddresses] = useState(new Set<string>());
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://8def-2401-4900-8827-18db-d531-34b1-a4f4-2ef9.ngrok-free.app/api';
  
  const statusOptions = [
    'CREATED', 'PENDING', 'PROCESSING', 'PAID', 
    'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED', 
    'FAILED', 'HOLDED','PRINTED','PACKED'
  ];

  // Safe formatting functions to handle any potential MongoDB objects
  const formatPrice = (price: any): string => {
    if (price === null || price === undefined) return '0.00';
    
    // Handle MongoDB NumberInt/NumberLong objects
    if (typeof price === 'object' && price !== null) {
      if (price.$numberInt !== undefined) {
        return parseFloat(price.$numberInt).toFixed(2);
      }
      if (price.$numberLong !== undefined) {
        return parseFloat(price.$numberLong).toFixed(2);
      }
      if (price.$numberDecimal !== undefined) {
        return parseFloat(price.$numberDecimal).toFixed(2);
      }
      if (price.$numberDouble !== undefined) {
        return parseFloat(price.$numberDouble).toFixed(2);
      }
    }
    
    const numPrice = parseFloat(String(price));
    return !isNaN(numPrice) ? numPrice.toFixed(2) : '0.00';
  };

  const safeString = (value: any): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') {
      console.warn('⚠️ Unexpected object in string field:', value);
      return JSON.stringify(value);
    }
    return String(value);
  };
  

  const safeNumber = (value: any): number => {
    if (value === null || value === undefined) return 0;
    
    // Handle MongoDB NumberInt/NumberLong objects
    if (typeof value === 'object' && value !== null) {
      if (value.$numberInt !== undefined) {
        return parseInt(value.$numberInt, 10);
      }
      if (value.$numberLong !== undefined) {
        return parseInt(value.$numberLong, 10);
      }
    }
    
    const num = parseFloat(String(value));
    return !isNaN(num) ? num : 0;
  };

  const formatCompleteAddress = (order: Order): string => {
    const parts = [
      safeString(order.address), 
      safeString(order.landmark), 
      safeString(order.city), 
      safeString(order.state), 
      safeString(order.country), 
      safeString(order.zipCode || order.pincode)
    ].filter(part => part && part !== '');
    return parts.length > 0 ? parts.join(', ') : 'N/A';
  };

  const getShortAddress = (order: Order): string => {
    const parts = [safeString(order.city), safeString(order.state)].filter(part => part && part !== '');
    return parts.length > 0 ? parts.join(', ') : 'N/A';
  };

  const getTenentId = () => {
    try {
      return localStorage.getItem('tenentid') || '';
    } catch (error) {
      console.error('Error accessing localStorage:', error);
      return '';
    }
  };

  const toggleOrderExpansion = (orderId: string) => {
    const newExpanded = new Set(expandedOrders);
    newExpanded.has(orderId) ? newExpanded.delete(orderId) : newExpanded.add(orderId);
    setExpandedOrders(newExpanded);
  };

  const toggleAddressExpansion = (orderId: string) => {
    const newExpanded = new Set(expandedAddresses);
    newExpanded.has(orderId) ? newExpanded.delete(orderId) : newExpanded.add(orderId);
    setExpandedAddresses(newExpanded);
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setUpdatingStatus(orderId);
    const tenentId = getTenentId();
    
    if (!tenentId) {
      setError('Tenant ID not found. Please login again.');
      setUpdatingStatus(null);
      return;
    }

    try {
      console.log(`Updating order ${orderId} status to ${newStatus}`);
      
      const response = await fetch(`${API_BASE_URL}/orderroute/update-status/${orderId}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ 
          tenentId, 
          status: newStatus.toUpperCase() 
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setOrders(prev => 
          prev.map(order => 
            order.id === orderId 
              ? { ...order, status: newStatus.toUpperCase() }
              : order
          )
        );
        console.log(`Order ${orderId} status updated successfully to ${newStatus}`);
        setError('');
      } else {
        throw new Error(result.message || 'Failed to update order status');
      }
    } catch (err) {
      console.error('Error updating order status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update order status');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const fetchOrders = async (page: number, search: string, status: string, limit: number) => {
    setLoading(true);
    setError('');
    
    const tenentId = getTenentId();
    
    if (!tenentId) {
      setError('Tenant ID not found. Please login again.');
      setLoading(false);
      return;
    }

    try {
      const requestBody = {
        page,
        limit,
        tenentId,
        ...(search && { search }),
        ...(status && { status })
      };

      console.log('Fetching orders with params:', requestBody);

      const response = await fetch(`${API_BASE_URL}/orderroute/fetch-orders`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: ApiResponse = await response.json();
      
      console.log('API Response:', result);
      
      if (result.success) {
        // Ensure all data is properly formatted before setting state
        const cleanOrders = result.data.map(order => ({
          ...order,
          id: safeString(order.id),
          totalAmount: safeNumber(order.totalAmount),
          status: safeString(order.status),
          products: Array.isArray(order.products) ? order.products.map(product => ({
            ...product,
            quantity: safeNumber(product.quantity),
            price: safeNumber(product.price)
          })) : []
        }));
        
        setOrders(cleanOrders);
        setCurrentPage(safeNumber(result.pagination.currentPage));
        setTotalPages(safeNumber(result.pagination.totalPages));
        setTotalOrders(safeNumber(result.pagination.totalOrders));
        setError('');
      } else {
        throw new Error('Failed to fetch orders');
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError(err instanceof Error ? err.message : 'Error fetching orders. Please check your connection.');
      setOrders([]);
      setCurrentPage(1);
      setTotalPages(1);
      setTotalOrders(0);
    } finally {
      setLoading(false);
    }
  };

  // Fixed useEffect - separate effects for different triggers
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (currentPage === 1) {
        fetchOrders(1, searchTerm, statusFilter, itemsPerPage);
      } else {
        setCurrentPage(1);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  useEffect(() => {
    if (currentPage === 1) {
      fetchOrders(1, searchTerm, statusFilter, itemsPerPage);
    } else {
      setCurrentPage(1);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchOrders(currentPage, searchTerm, statusFilter, itemsPerPage);
  }, [currentPage]);

  useEffect(() => {
    fetchOrders(1, '', '', itemsPerPage);
  }, []);

  const handlePrevPage = () => {
    if (currentPage > 1 && !loading) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages && !loading) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePageClick = (pageNumber: number) => {
    if (pageNumber !== currentPage && !loading) {
      setCurrentPage(pageNumber);
    }
  };

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
  };

  const handleRefresh = () => {
    fetchOrders(currentPage, searchTerm, statusFilter, itemsPerPage);
  };

  const getStatusBadgeColor = (status: string) => {
    const normalizedStatus = safeString(status).toUpperCase();
    switch (normalizedStatus) {
      case 'COMPLETED':
      case 'DELIVERED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'PENDING':
      case 'CREATED':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'PROCESSING':
      case 'PAID':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'SHIPPED':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'CANCELLED':
      case 'FAILED':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'HOLDED':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const generatePageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5;
    
    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
      let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
      
      if (endPage - startPage < maxPagesToShow - 1) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }
    }
    
    return pageNumbers;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <h1 className="text-2xl font-bold text-gray-900">Order Management</h1>
            
            {/* Controls Section */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              {/* Search Input */}
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search orders, names, phone..."
                  className="w-full sm:w-80 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => handleStatusFilterChange(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none bg-white"
              >
                <option value="">All Statuses</option>
                {statusOptions.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>

              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* Stats Section */}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-600">
            <span>Total Orders: <strong className="text-gray-900">{totalOrders.toLocaleString()}</strong></span>
            <span>•</span>
            <span>Showing: <strong className="text-gray-900">{orders.length}</strong> orders</span>
            <span>•</span>
            <span>Page: <strong className="text-pink-600">{currentPage}</strong> of <strong className="text-pink-600">{totalPages}</strong></span>
            {statusFilter && (
              <>
                <span>•</span>
                <span>Status: <strong className="text-pink-600">{statusFilter}</strong></span>
              </>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
            <p className="font-medium">Error:</p>
            <p>{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-md mb-6">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <p>Loading orders for page {currentPage}...</p>
            </div>
          </div>
        )}

        {/* Orders Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          {!loading && orders.length === 0 && !error ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No orders found</p>
              <p className="text-gray-400 text-sm mt-2">
                {searchTerm || statusFilter 
                  ? 'Try adjusting your search or filter criteria' 
                  : 'No orders available at the moment'
                }
              </p>
              {currentPage > 1 && (
                <button
                  onClick={() => setCurrentPage(1)}
                  className="mt-4 px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 transition-colors"
                >
                  Go to First Page
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead className="bg-pink-600 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Order Details</th>
                    <th className="px-4 py-3 text-left font-semibold">Date</th>
                    <th className="px-4 py-3 text-left font-semibold">Customer</th>
                    <th className="px-4 py-3 text-left font-semibold">Products</th>
                    <th className="px-4 py-3 text-left font-semibold">Total Amount</th>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                    <th className="px-4 py-3 text-left font-semibold">Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {orders.map((order, index) => (
                    <tr key={order.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      {/* Order Details */}
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <div className="font-medium text-gray-900">{order.id}</div>
                          {order.billNo && (
                            <div className="text-xs text-gray-500">
                              Bill: {order.billNo}
                            </div>
                          )}
                          {order.trackingNumber && (
                            <div className="text-xs text-gray-500">
                              Tracking: {order.trackingNumber}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900">{order.date}</div>
                      </td>

                      {/* Customer */}
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <div className="font-medium text-gray-900">{order.name}</div>
                          <div className="text-sm text-gray-500">{order.phoneNumber}</div>
                          {order.paymentStatus && (
                            <div className="text-xs text-gray-500">
                              Payment: {order.paymentStatus}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Products */}
<td className="px-4 py-4">
  <div className="space-y-2">
    {order.products && order.products.length > 0 ? (
      <>
        {order.products.slice(0, 2).map((product, idx) => (
          <div key={idx} className="text-sm">
            <div className="font-medium text-gray-700 truncate max-w-xs">
              {typeof product.product_name === 'string'
                ? product.product_name
                : typeof product.sku === 'string'
                  ? product.sku
                  : 'Unnamed Product'}
            </div>
            <div className="text-xs text-gray-500">
              Qty: {product.quantity || 1}
              <span className="ml-2">₹{formatPrice(product.price)}</span>
            </div>
          </div>
        ))}

        {/* 🔽 Add this block BELOW the first 2 products */}
        {expandedOrders.has(order.id) &&
          order.products.slice(2).map((product, idx) => (
            <div key={idx + 2} className="text-sm">
              <div className="font-medium text-gray-700 truncate max-w-xs">
                {product.product_name || product.sku || 'Unnamed Product'}
              </div>
              <div className="text-xs text-gray-500">
                Qty: {product.quantity || 1}
                <span className="ml-2">₹{formatPrice(product.price)}</span>
              </div>
            </div>
          ))}

        {/* 👇 Add the toggle button here */}
        {order.products.length > 2 && (
          <button
            onClick={() => toggleOrderExpansion(order.id)}
            className="text-xs text-pink-600 hover:text-pink-800 font-medium transition-colors"
          >
            {expandedOrders.has(order.id)
              ? 'Show Less'
              : `+${order.products.length - 2} more items`}
          </button>
        )}
      </>
    ) : (
      <span className="text-gray-400 text-sm">No products</span>
    )}
  </div>
</td>


                      {/* Total Amount */}
                      <td className="px-4 py-4">
                        <div className="font-semibold text-gray-900">
                          ₹{formatPrice(order.totalAmount) || '0.00'}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4">
                        <div className="space-y-2">
                          {/* Status Badge */}
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadgeColor(order.status)}`}>
                            {order.status}
                          </span>

                          {/* Status Dropdown */}
                          <select
                            value={order.status}
                            onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                            disabled={updatingStatus === order.id}
                            className={`w-full text-xs border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none ${
                              updatingStatus === order.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                            }`}
                          >
                            {statusOptions.map(status => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>

                          {updatingStatus === order.id && (
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              Updating...
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Location */}
                      <td className="px-4 py-4">
                        <div className="space-y-2">
                          <div className="text-sm text-gray-900">
                            {expandedAddresses.has(order.id) 
                              ? formatCompleteAddress(order) 
                              : getShortAddress(order)
                            }
                          </div>
                          
                          {/* Address Toggle Button */}
                          <button
                            onClick={() => toggleAddressExpansion(order.id)}
                            className="text-xs text-pink-600 hover:text-pink-800 font-medium transition-colors"
                          >
                            {expandedAddresses.has(order.id) ? 'Show Less' : 'Show Full Address'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Enhanced Pagination */}
          {totalPages > 1 && !loading && (
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                {/* Pagination Info */}
                <div className="text-sm text-gray-700">
                  Showing {Math.min((currentPage - 1) * itemsPerPage + 1, totalOrders)} to{' '}
                  {Math.min(currentPage * itemsPerPage, totalOrders)} of{' '}
                  {totalOrders.toLocaleString()} results
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center gap-2">
                  {/* First Page Button */}
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1 || loading}
                    className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    First
                  </button>

                  {/* Previous Button */}
                  <button
                    onClick={handlePrevPage}
                    disabled={currentPage === 1 || loading}
                    className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>

                  {/* Page Numbers */}
                  <div className="flex items-center gap-1">
                    {generatePageNumbers().map(pageNum => (
                      <button
                        key={pageNum}
                        onClick={() => handlePageClick(pageNum)}
                        disabled={loading}
                        className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                          pageNum === currentPage
                            ? 'bg-pink-600 text-white'
                            : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50 hover:text-gray-700'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {pageNum}
                      </button>
                    ))}
                  </div>

                  {/* Next Button */}
                  <button
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages || loading}
                    className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  {/* Last Page Button */}
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages || loading}
                    className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Last
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Debug Info (Remove in production) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-6 bg-gray-100 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-700 mb-2">Debug Info:</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p>API URL: {API_BASE_URL}</p>
              <p>Current Page: {currentPage}</p>
              <p>Total Pages: {totalPages}</p>
              <p>Total Orders: {totalOrders}</p>
              <p>Orders on This Page: {orders.length}</p>
              <p>Status Filter: {statusFilter || 'None'}</p>
              <p>Search Term: {searchTerm || 'None'}</p>
              <p>Loading: {loading ? 'Yes' : 'No'}</p>
              <p>Items Per Page: {itemsPerPage}</p>
              <p>Expected Skip: {(currentPage - 1) * itemsPerPage}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderManagement;