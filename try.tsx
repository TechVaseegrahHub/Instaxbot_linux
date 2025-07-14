 <div className="mt-6 mb-4 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="mb-6">
              <h4 className="text-sm font-normal text-gray-800 mb-1 flex items-center">
              <svg className="w-3.5 h-3.5 mr-1 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              Select Your Preferred Shipping Partner
            </h4>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <p className="text-xs text-gray-600 font-normal">Standard shipping charge: ₹50</p>
                <p className="text-xs text-gray-500 italic bg-gray-50 px-2 py-0.5 rounded-full">
                  Final charges calculated at checkout
                </p>
              </div>
            </div>

            <div className="relative">
              <select
                className="w-full p-2.5 text-sm font-normalbg-white border-2 border-gray-200 rounded-lg shadow-sm 
                          focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 
                          text-lg font-medium text-gray-700 cursor-pointer
                          hover:border-gray-300 transition-all duration-200
                          appearance-none bg-no-repeat bg-right pr-12"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: 'right 1rem center',
                  backgroundSize: '1rem'
                }}
                value={shippingDetails.shippingPartner?.id || ''}
                onChange={(e) => {
                  const selectedMethod = shippingMethods.find(method => method._id === e.target.value);
                  if (selectedMethod) {
                    handleShippingPartnerSelect(selectedMethod);
                  }
                }}
              >
                <option value="" disabled className="text-gray-400">
                  Choose your shipping partner
                </option>
                {shippingMethods.map((method) => (
                  <option key={method._id} value={method._id} className="text-lg py-2 text-gray-700">
                    {method.name} 
                    {method.type === 'FREE_SHIPPING' ? (
                      cart.total >= (method.minAmount || 0) ? 
                        " • FREE SHIPPING" : 
                        ` • Free on orders above ₹${method.minAmount || 0}`
                    ) : (
                      ` • ₹${method.fixedRate || 0}`
                    )}
                  </option>
                ))}
              </select>
              
              {/* Custom dropdown arrow */}
              <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            
            {/* Optional: Add selected shipping info display */}
            {shippingDetails.shippingPartner && (
              <div className="mt-3 p-2.5 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-green-800 text-sm font-normal">
                    Selected: {shippingDetails.shippingPartner.name}
                  </span>
                </div>
              </div>
            )}
          </div>