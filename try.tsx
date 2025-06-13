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
                  {order.products.slice(0, 3).map((product, idx) => (
                    <div key={idx} className="text-sm">
                      <div className="font-medium text-gray-700 truncate max-w-xs">
                        {product.name || product.product_name || 'Unnamed Product'}
                      </div>
                      <div className="text-gray-500 text-xs">
                        Qty: {product.quantity || product.qty || 1} 
                        {product.price && (
                          <span className="ml-2">₹{parseFloat(product.price).toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                  {order.products.length > 3 && (
                    <div className="text-xs text-pink-600 font-medium">
                      +{order.products.length - 3} more items
                    </div>
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
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                {order.status}
              </span>
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

  {/* Pagination remains the same */}
  {totalPages > 1 && (
    // ... existing pagination code
  )}
</div>