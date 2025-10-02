import { useState, useRef, useEffect } from 'react';

// Type definitions
interface OrderData {
  orderId?: string;
  customerName?: string;
  status?: string;
  totalAmount?: number;
}

interface Hold {
  id: string;
  orderNumber: string;
  customerName?: string;
  holdingProduct: string;
  holdingResponse?: string;
  expectedDate: string;
  status: 'active' | 'resolved' | 'pending';
  createdAt?: string;
  responses?: Array<{
    message: string;
    timestamp: string;
    respondedAt: string;
  }>;
}

interface StatusBadgeProps {
  status: string;
}

// Configuration - Update these URLs to match your backend
const API_BASE_URL = 'https://ddcf6bc6761a.ngrok-free.app/api'; // Update this to your backend URL
const ENDPOINTS = {
  ORDER_DETAILS: `${API_BASE_URL}/holdingroute/details`,
  UPDATE_HOLDING: `${API_BASE_URL}/holdingroute/update-holding`,
  HOLDS_LIST: `${API_BASE_URL}/holdingroute/holds/list`,
  RESOLVE_HOLD: `${API_BASE_URL}/holdingroute/holds/resolve`,
  ADD_RESPONSE: `${API_BASE_URL}/holdingroute/holds/response`,
};

// Loader Component
const Loader = () => (
  <div className="flex justify-center items-center py-4">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-300"></div>
  </div>
);

// Status Badge Component
const StatusBadge = ({ status }: StatusBadgeProps) => {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-yellow-100 text-yellow-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

// Toast notification functions
const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.className = `fixed top-4 right-4 px-4 py-2 rounded shadow-lg z-50 transition-opacity duration-300 ${
    type === 'success' ? 'bg-green-500 text-white' :
    type === 'error' ? 'bg-red-500 text-white' :
    'bg-blue-500 text-white'
  }`;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => document.body.removeChild(toast), 300);
  }, 3000);
};

const HoldingPage = () => {
  // Form states
  const [orderNumber, setOrderNumber] = useState('');
  const [holdingProduct, setHoldingProduct] = useState('');
  const [holdingResponse, setHoldingResponse] = useState('');
  const [date, setDate] = useState('');

  // UI states
  const [loading, setLoading] = useState(false);
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'add' | 'list'>('add');
  const [holdsList, setHoldsList] = useState<Hold[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [tenentId, setTenentId] = useState<string | null>(null);

  const orderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Get tenentId from localStorage on component mount
    const storedTenentId = localStorage?.getItem('tenentid');
    setTenentId(storedTenentId);
    
    if (!storedTenentId) {
      showToast('Tenant ID not found in localStorage. Please log in again.', 'error');
    }
    
    if (orderInputRef.current) orderInputRef.current.focus();
    if (activeTab === 'list') fetchHoldsList();
  }, [activeTab]);

  // API function to fetch order details
  const fetchOrderDetails = async () => {
    if (!orderNumber.trim()) {
      showToast('Please enter an order number', 'error');
      return;
    }

    const currentTenentId = localStorage?.getItem('tenentid');
    if (!currentTenentId) {
      showToast('Tenant ID not found. Please log in again.', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(ENDPOINTS.ORDER_DETAILS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderNumber: orderNumber.trim(),
          tenentId: currentTenentId
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch order details');
      }

      if (data.success && data.order) {
        setOrderData(data.order);
        setShowForm(true);
        showToast('Order found! You can now add holding information.', 'success');
      } else {
        throw new Error(data.message || 'Order not found');
      }
    } catch (err: any) {
      console.error('Error fetching order details:', err);
      showToast(err.message || 'Error fetching order details.', 'error');
      setOrderData(null);
      setShowForm(false);
    } finally {
      setLoading(false);
    }
  };

  // API function to submit holding information
  const handleSubmit = async () => {
    if (!orderNumber.trim() || !holdingProduct.trim() || !date || !holdingResponse.trim()) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    const currentTenentId = localStorage?.getItem('tenentid');
    if (!currentTenentId) {
      showToast('Tenant ID not found. Please log in again.', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(ENDPOINTS.UPDATE_HOLDING, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderNumber: orderNumber.trim(),
          holdingProduct: holdingProduct.trim(),
          holdingResponse: holdingResponse.trim(),
          date: date,
          tenentId: currentTenentId
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update holding information');
      }

      if (data.success) {
        showToast('Holding information updated successfully', 'success');
        resetForm();
        
        // Refresh holds list if we're on that tab
        if (activeTab === 'list') {
          fetchHoldsList();
        }
      } else {
        throw new Error(data.message || 'Failed to update holding information');
      }
    } catch (err: any) {
      console.error('Error updating holding:', err);
      showToast(err.message || 'Failed to update holding.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setOrderNumber('');
    setHoldingProduct('');
    setHoldingResponse('');
    setDate('');
    setOrderData(null);
    setShowForm(false);
    if (orderInputRef.current) orderInputRef.current.focus();
  };

  // API function to fetch holds list
  const fetchHoldsList = async () => {
    const currentTenentId = localStorage?.getItem('tenentid');
    if (!currentTenentId) {
      showToast('Tenant ID not found. Please log in again.', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(ENDPOINTS.HOLDS_LIST, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenentId: currentTenentId
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch holds list');
      }

      if (data.success) {
        setHoldsList(data.holds || []);
        showToast(`Loaded ${data.holds?.length || 0} holds`, 'success');
      } else {
        throw new Error(data.message || 'Failed to fetch holds list');
      }
    } catch (err: any) {
      console.error('Error fetching holds list:', err);
      showToast(err.message || 'Error fetching holds list.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // API function to resolve a hold
  const resolveHold = async (holdId: string, orderNumber: string) => {
    if (!window.confirm('Are you sure you want to resolve this hold?')) return;

    const currentTenentId = localStorage?.getItem('tenentid');
    if (!currentTenentId) {
      showToast('Tenant ID not found. Please log in again.', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(ENDPOINTS.RESOLVE_HOLD, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          holdId: holdId,
          orderNumber: orderNumber,
          tenentId: currentTenentId
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to resolve hold');
      }

      if (data.success) {
        showToast(`Hold resolved successfully for order #${orderNumber}`, 'success');
        // Refresh the holds list to show updated status
        fetchHoldsList();
      } else {
        throw new Error(data.message || 'Failed to resolve hold');
      }
    } catch (err: any) {
      console.error('Error resolving hold:', err);
      showToast(err.message || `Error resolving hold for order #${orderNumber}.`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && orderNumber.trim()) fetchOrderDetails();
  };

  const filteredHolds = holdsList.filter((hold: Hold) => {
    const matchesSearch =
      hold.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hold.holdingProduct?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hold.customerName?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'all' || hold.status?.toLowerCase() === filterStatus.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Tab Navigation */}
      <div className="max-w-4xl mx-auto mb-6">
        <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('add')}
            className={`flex-1 py-2 px-4 rounded-md transition-colors ${
              activeTab === 'add'
                ? 'bg-white text-black shadow-sm font-medium'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Add Holding
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`flex-1 py-2 px-4 rounded-md transition-colors ${
              activeTab === 'list'
                ? 'bg-white text-black shadow-sm font-medium'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Holdings List ({holdsList.length})
          </button>
        </div>
      </div>

      {/* Add Holding Form - Centered */}
      {activeTab === 'add' && (
        <div className="min-h-screen flex justify-center items-start pt-20">
          <div className="bg-white p-6 shadow-lg rounded-xl max-w-lg w-full mx-4">
            <h1 className="text-2xl font-bold mb-6 text-gray-800 text-center">Add Holding Information</h1>

            <div className="space-y-4">
              {/* Centered Order Search Section */}
              <div className="flex flex-col items-center space-y-3">
                <input
                  ref={orderInputRef}
                  type="text"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Order Number"
                  className="w-48 p-3 border-2 border-pink-400 rounded-lg focus:ring-0 focus:border-pink-400 outline-none text-gray-700 placeholder-gray-400 text-center"
                  disabled={showForm || !tenentId}
                />

                <button
                  onClick={fetchOrderDetails}
                  disabled={loading || showForm || !tenentId}
                  className="w-48 bg-white text-black py-3 px-4 rounded-lg hover:bg-pink-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium border-2 border-pink-400 hover:border-pink-400"
                >
                  {loading ? 'Searching...' : 'Search Order'}
                </button>
              </div>

              {orderData && (
                <div className="p-4 bg-gray-50 rounded-lg border">
                  <h3 className="font-semibold text-gray-800 mb-2">Order Details</h3>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Order ID:</span> {orderData.orderId || orderNumber}</p>
                    <p><span className="font-medium">Customer:</span> {orderData.customerName || 'N/A'}</p>
                    <p><span className="font-medium">Status:</span> {orderData.status || 'N/A'}</p>
                    {orderData.totalAmount && (
                      <p><span className="font-medium">Total:</span> ₹{orderData.totalAmount}</p>
                    )}
                  </div>
                </div>
              )}

              {showForm && (
                <div className="space-y-4">
                  <input
                    type="text"
                    value={holdingProduct}
                    onChange={(e) => setHoldingProduct(e.target.value)}
                    placeholder="Holding Product (Required)"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none"
                    required
                  />

                  <textarea
                    value={holdingResponse}
                    onChange={(e) => setHoldingResponse(e.target.value)}
                    placeholder="Holding Response (Required)"
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none resize-none"
                    required
                  />

                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none"
                    required
                  />

                  <div className="flex space-x-3">
                    <button
                      onClick={handleSubmit}
                      disabled={loading}
                      className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      {loading ? 'Saving...' : 'Save Holding Info'}
                    </button>
                    <button
                      onClick={resetForm}
                      className="px-6 bg-gray-500 text-white py-3 rounded-lg hover:bg-gray-600 transition-colors font-medium"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Holdings List */}
      {activeTab === 'list' && (
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold text-gray-800">Holdings List</h1>
                <button
                  onClick={fetchHoldsList}
                  disabled={loading || !tenentId}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                >
                  {loading ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
              
              {/* Search and Filter */}
              <div className="flex flex-col sm:flex-row gap-4">
                <input
                  type="text"
                  placeholder="Search by order number, product, or customer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-300 focus:border-pink-400 outline-none"
                  disabled={!tenentId}
                />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-400 focus:border-pink-400 outline-none"
                  disabled={!tenentId}
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
            </div>

            <div className="p-6">
              {loading && <Loader />}
              
              {!loading && !tenentId && (
                <div className="text-center py-8">
                  <p className="text-red-500 font-medium">Tenant ID not found in localStorage</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Please log in to your account to access the holdings list.
                  </p>
                </div>
              )}
              
              {!loading && tenentId && filteredHolds.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">No holdings found.</p>
                  {holdsList.length === 0 && (
                    <p className="text-sm text-gray-400 mt-2">
                      Add some holdings using the "Add Holding" tab or click "Refresh" to load from database.
                    </p>
                  )}
                </div>
              )}

              {!loading && tenentId && filteredHolds.length > 0 && (
                <div className="space-y-4">
                  {filteredHolds.map((hold) => (
                    <div key={hold.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-800">Order #{hold.orderNumber}</h3>
                          <p className="text-sm text-gray-600">{hold.customerName || 'Unknown Customer'}</p>
                        </div>
                        <StatusBadge status={hold.status} />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-sm font-medium text-gray-700">Holding Product:</p>
                          <p className="text-sm text-gray-600">{hold.holdingProduct}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">Expected Date:</p>
                          <p className="text-sm text-gray-600">{hold.expectedDate}</p>
                        </div>
                        {hold.createdAt && (
                          <div>
                            <p className="text-sm font-medium text-gray-700">Created:</p>
                            <p className="text-sm text-gray-600">
                              {new Date(hold.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                        {hold.holdingResponse && (
                          <div className="md:col-span-2">
                            <p className="text-sm font-medium text-gray-700">Holding Response:</p>
                            <p className="text-sm text-gray-600">{hold.holdingResponse}</p>
                          </div>
                        )}
                      </div>

                      {hold.status === 'active' && (
                        <button
                          onClick={() => resolveHold(hold.id, hold.orderNumber)}
                          disabled={loading}
                          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                        >
                          Resolve Hold
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HoldingPage;