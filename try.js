const formatOrderForFrontend = (order) => {
  const cleanOrder = cleanMongoObject(order); // already defined in your code

  const safeGet = (val, def = '') => {
    const conv = safeConvert(val);
    return (conv === null || conv === undefined || typeof conv === 'object') ? def : conv;
  };

  return {
    id: cleanOrder.orderId || cleanOrder._id?.toString() || '',
    date: formatDate(cleanOrder.created_at),
    name: safeGet(cleanOrder.customer_name) || safeGet(cleanOrder.profile_name) || 'N/A',
    phoneNumber: safeGet(cleanOrder.phone_number, 'N/A'),
    totalAmount: parseFloat(safeConvert(cleanOrder.total_amount)) || 0,
    status: (safeGet(cleanOrder.status, 'CREATED')).toString().toUpperCase(),
    billNo: safeGet(cleanOrder.bill_no),
    paymentStatus: safeGet(cleanOrder.paymentStatus),
    paymentMethod: safeGet(cleanOrder.paymentMethod),

    products: Array.isArray(cleanOrder.products)
      ? cleanOrder.products.map(product => ({
          sku: safeGet(product.sku),
          product_name: safeGet(product.product_name),
          quantity: parseInt(safeConvert(product.quantity)) || 1,
          price: parseFloat(safeConvert(product.price)) || 0,
        }))
      : [],

    address: safeGet(cleanOrder.address),
    city: safeGet(cleanOrder.city),
    state: safeGet(cleanOrder.state),
    zipCode: safeGet(cleanOrder.zip_code || cleanOrder.zipCode),
    pincode: safeGet(cleanOrder.pincode || cleanOrder.pin_code),
    country: safeGet(cleanOrder.country),
    fullAddress: safeGet(cleanOrder.full_address),
    landmark: safeGet(cleanOrder.landmark),
    trackingNumber: safeGet(cleanOrder.tracking_number),
    trackingStatus: safeGet(cleanOrder.tracking_status),
    packingStatus: safeGet(cleanOrder.packing_status),
    isPacked: Boolean(cleanOrder.is_packed),
    razorpayOrderId: safeGet(cleanOrder.razorpayOrderId),
    razorpayPaymentId: safeGet(cleanOrder.razorpayPaymentId),
    createdAt: cleanOrder.created_at,
    updatedAt: cleanOrder.updated_at,
    customerNotes: safeGet(cleanOrder.customer_notes),
  };
};
