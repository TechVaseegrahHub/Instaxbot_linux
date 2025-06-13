import { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

// Updated Product interface to match your MongoDB schema
interface Product {
  sku?: string;
  product_name?: string;
  quantity?: number;
  price?: number | string; // Allow both number and string
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
  const [isOrderSwitchOn, setIsOrderSwitchOn] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [expandedOrders, setExpandedOrders] = useState(new Set<string>());
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  // API base URL - adjust this to match your backend
  const API_BASE_URL = 'https://app.instaxbot.com/api';
  
  // Available status options
  const statusOptions = [
    'CREATED',
    'PENDING', 
    'PROCESSING',
    'PAID',
    'SHIPPED',
    'DELIVERED',
    'COMPLETED',
    'CANCELLED',
    'FAILED',
    'HOLDED'
  ];

  // Helper function to safely format price
  const formatPrice = (price: any): string | null => {
    if (price === null || price === undefined) return null;
    
    if (typeof price === 'number') {
      return price.toFixed(2);
    }
    
    if (typeof price === 'string') {
      const numPrice = parseFloat(price);
      return !isNaN(numPrice) ? numPrice.toFixed(2) : null;
    }
    
    return null;
  };

  // Get tenentId from localStorage
  const getTenentId = () => {
    try {
      return localStorage.getItem('tenentid') || '';
    } catch (error) {
      console.error('Error accessing localStorage:', error);
      return '';
    }
  };

  // Toggle order expansion for showing more products
  const toggleOrderExpansion = (orderId: string) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
  };

  // Update order status
  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setUpdatingStatus(orderId);
    
    const tenentId = getTenentId();
    
    if (!tenentId) {
      setError('Tenant ID not found. Please login again.');
      setUpdatingStatus(null);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/orderroute/update-status/${orderId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenentId: tenentId,
          status: newStatus
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        // Update the order status in the local state
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order.id === orderId 
              ? { ...order, status: newStatus }
              : order
          )
        );
        console.log(`Order ${orderId} status updated to ${newStatus}`);
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

  // Memoized fetch function to prevent unnecessary re-renders
  const fetchOrders = useCallback(async (page: number, search: string, status: string, limit: number) => {
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
        page: page,
        limit: limit,
        tenentId: tenentId,
        ...(search && { search }),
        ...(status && { status })
      };

      console.log('Fetching orders with params:', requestBody);

      const response = await fetch(`${API_BASE_URL}/orderroute/fetch-orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result: ApiResponse = await response.json();
      
      console.log('API Response:', result);
      
      if (result.success) {
        setOrders(result.data);
        setCurrentPage(result.pagination.currentPage);
        setTotalPages(result.pagination.totalPages);
        setTotalOrders(result.pagination.totalOrders);
      } else {
        throw new Error('Failed to fetch orders');
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
      setOrders([]);
      setCurrentPage(1);
      setTotalPages(1);
      setTotalOrders(0);
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL]); // Only API_BASE_URL as dependency

  // Initial load - only runs once
  useEffect(() => {
    fetchOrders(1, '', '', 20);
  }, [fetchOrders]);

  // Handle search with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchOrders(1, searchTerm, statusFilter, itemsPerPage);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, fetchOrders, statusFilter, itemsPerPage]);

  // Handle page changes - Direct function call, no useEffect
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage && !loading) {
      console.log(`Changing from page ${currentPage} to page ${newPage}`);
      fetchOrders(newPage, searchTerm, statusFilter, itemsPerPage);
    }
  };

  // Handle status filter change - Direct function call
  const handleStatusChange = (status: string) => {
    setStatusFilter(status);
    // fetchOrders will be called by the useEffect above due to statusFilter change
  };

  // Handle items per page change - Direct function call  
  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    // fetchOrders will be called by the useEffect above due to itemsPerPage change
  };

  // Go to first page
  const goToFirstPage = () => {
    if (currentPage !== 1 && !loading) {
      handlePageChange(1);
    }
  };

  // Go to last page
  const goToLastPage = () => {
    if (currentPage !== totalPages && !loading) {
      handlePageChange(totalPages);
    }
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    const normalizedStatus = status.toLowerCase();
    switch (normalizedStatus) {
      case 'completed':
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'pending':
      case 'created':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
      case 'paid':
        return 'bg-blue-100 text-blue-800';
      case 'shipped':
        return 'bg-purple-100 text-purple-800';
      case 'cancelled':
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'holded':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Generate page numbers for pagination
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
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="w-full max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-pink-100 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-pink-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search orders, names, phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 w-80"
                />
              </div>
              
              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
              >
                <option value="">All Status</option>
                {statusOptions.map(status => (
                  <option key={status} value={status.toLowerCase()}>{status}</option>
                ))}
              </select>

              {/* Items Per Page */}
              <select
                value={itemsPerPage}
                onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                className="px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
              >
                <option value={10}>10 per page</option>
                <option value={20}>20 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>

              {/* Refresh Button */}
              <button
                onClick={() => fetchOrders(currentPage, searchTerm, statusFilter, itemsPerPage)}
                disabled={loading}
                className="p-2 border border-gray-300 rounded-md bg-white text-pink-600 hover:bg-pink-50 focus:outline-none focus:ring-2 focus:ring-pink-500 disabled:opacity-50 transition-all duration-300"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <div className="text-gray-800">
                <span className="text-base font-medium">Total Orders: {totalOrders.toLocaleString()}</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-800">Order Management</h1>
              
              {/* Switch Order Toggle */}
              <div className="flex items-center space-x-3">
                <span className="text-gray-800 font-medium">Switch Order</span>
                <button
                  onClick={() => setIsOrderSwitchOn(!isOrderSwitchOn)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 ${
                    isOrderSwitchOn ? 'bg-pink-600' : 'bg-gray-400'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isOrderSwitchOn ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-lg shadow-md border border-pink-100 overflow-hidden">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 mb-4 rounded mx-4 mt-4">
              <p>Error: {error}</p>
            </div>
          )}
          
          {loading && (
            <div className="bg-pink-50 border border-pink-200 text-pink-700 px-4 py-3 mb-4 rounded mx-4 mt-4">
              <p>Loading orders...</p>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-pink-50 border-b border-pink-100">
                <tr>
                  <th className="px-6 py-4 text-left text-base font-semibold text-gray-800">Order ID</th>
                  <th className="px-6 py-4 text-left text-base font-semibold text-gray-800">Date</th>
                  <th className="px-6 py-4 text-left text-base font-semibold text-gray-800">Customer Info</th>
                  <th className="px-6 py-4 text-left text-base font-semibold text-gray-800">Products</th>
                  <th className="px-6 py-4 text-left text-base font-semibold text-gray-800">Total Amount</th>
                  <th className="px-6 py-4 text-left text-base font-semibold text-gray-800">Status</th>
                  <th className="px-6 py-4 text-left text-base font-semibold text-gray-800">Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pink-100">
                {orders.map((order, index) => (
                  <tr key={`${order.id}-${index}`} className={index % 2 === 0 ? 'bg-white' : 'bg-pink-50'}>
                    <td className="px-6 py-4 text-base font-medium text-gray-900">
                      {order.id}
                      {order.billNo && (
                        <div className="text-sm text-gray-500">Bill: {order.billNo}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-base text-gray-700">{order.date}</td>
                    <td className="px-6 py-4">
                      <div className="text-base text-gray-700 font-medium">{order.name}</div>
                      <div className="text-sm text-gray-500">{order.phoneNumber}</div>
                    </td>
                    <td className="px-6 py-4">
                      {order.products && order.products.length > 0 ? (
                        <div className="space-y-1">
                          {/* Always show first 2 products */}
                          {order.products.slice(0, 2).map((product, idx) => (
                            <div key={idx} className="text-sm">
                              <div className="font-medium text-gray-700 truncate max-w-xs">
                                {product.product_name || product.sku || 'Unnamed Product'}
                              </div>
                              <div className="text-gray-500 text-xs">
                                Qty: {product.quantity || 1} 
                                {formatPrice(product.price) && (
                                  <span className="ml-2">₹{formatPrice(product.price)}</span>
                                )}
                              </div>
                            </div>
                          ))}
                          
                          {/* Show additional products if expanded */}
                          {expandedOrders.has(order.id) && order.products.slice(2).map((product, idx) => (
                            <div key={idx + 2} className="text-sm">
                              <div className="font-medium text-gray-700 truncate max-w-xs">
                                {product.product_name || product.sku || 'Unnamed Product'}
                              </div>
                              <div className="text-gray-500 text-xs">
                                Qty: {product.quantity || 1} 
                                {formatPrice(product.price) && (
                                  <span className="ml-2">₹{formatPrice(product.price)}</span>
                                )}
                              </div>
                            </div>
                          ))}
                          
                          {/* Show expand/collapse button if more than 2 products */}
                          {order.products.length > 2 && (
                            <button
                              onClick={() => toggleOrderExpansion(order.id)}
                              className="text-xs text-pink-600 hover:text-pink-800 font-medium mt-1"
                            >
                              {expandedOrders.has(order.id) 
                                ? 'Show less' 
                                : `+${order.products.length - 2} more items`
                              }
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">No products</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-base text-gray-700">
                      ₹{order.totalAmount.toFixed(2)}
                      {order.paymentStatus && (
                        <div className="text-sm text-gray-500">
                          Payment: {order.paymentStatus}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="relative">
                        <select
                          value={order.status}
                          onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                          disabled={updatingStatus === order.id}
                          className={`appearance-none w-full px-3 py-1 pr-8 rounded-full text-sm font-medium border-0 focus:outline-none focus:ring-2 focus:ring-pink-500 cursor-pointer transition-all duration-200 ${getStatusColor(order.status)} ${
                            updatingStatus === order.id ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          {statusOptions.map(status => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className={`absolute right-2 top-1/2 transform -translate-y-1/2 w-3 h-3 pointer-events-none ${
                          updatingStatus === order.id ? 'animate-spin' : ''
                        }`} />
                      </div>
                    </td>
                    <td className="px-6 py-4 text-base text-gray-700">
                      {order.city && order.state ? `${order.city}, ${order.state}` : order.city || order.state || 'N/A'}
                      {order.trackingNumber && (
                        <div className="text-sm text-gray-500">
                          Tracking: {order.trackingNumber}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {!loading && orders.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500 text-base">
                {error ? 'Unable to load orders. Please try again.' : 'No orders found matching your search.'}
              </p>
            </div>
          )}

          {/* Enhanced Pagination */}
          {totalPages > 1 && (
            <div className="bg-pink-50 px-6 py-4 border-t border-pink-100">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="text-base text-gray-700">
                  Showing {Math.min((currentPage - 1) * itemsPerPage + 1, totalOrders)} to {Math.min(currentPage * itemsPerPage, totalOrders)} of {totalOrders.toLocaleString()} orders
                </div>
                
                <div className="flex items-center gap-2">
                  {/* First Page Button */}
                  <button
                    onClick={goToFirstPage}
                    disabled={currentPage === 1 || loading}
                    className="px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-pink-50 hover:text-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 text-sm"
                  >
                    First
                  </button>

                  {/* Previous Page Button */}
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1 || loading}
                    className="p-2 rounded-md border border-gray-300 bg-white text-gray-500 hover:bg-pink-50 hover:text-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  
                  {/* Page Numbers */}
                  {generatePageNumbers().map(pageNum => (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      disabled={loading}
                      className={`px-3 py-2 rounded-md text-base font-medium transition-all duration-300 ${
                        pageNum === currentPage
                          ? 'bg-pink-600 text-white shadow-sm'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-pink-50 hover:text-pink-600'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {pageNum}
                    </button>
                  ))}
                  
                  {/* Next Page Button */}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || loading}
                    className="p-2 rounded-md border border-gray-300 bg-white text-gray-500 hover:bg-pink-50 hover:text-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  {/* Last Page Button */}
                  <button
                    onClick={goToLastPage}
                    disabled={currentPage === totalPages || loading}
                    className="px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-pink-50 hover:text-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 text-sm"
                  >
                    Last
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderManagement;