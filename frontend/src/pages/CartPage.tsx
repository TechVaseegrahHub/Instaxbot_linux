import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface CartItem {
  sku: string;
  productName: string;
  productPhotoUrl: string;
  price: number;
  quantity: number;
  quantityInStock: number;
}

interface CartData {
  items: CartItem[];
  total: number;
}

interface ShippingPartner {
  id: string;
  name: string;
  cost: number;
}

interface ShippingDetails {
  name: string;
  address: string;
  pinCode: string;
  city: string;
  state: string;
  country: string;
  phoneNumber: string;
  shippingPartner?: ShippingPartner | null;
}

interface ShippingMethod {
  _id?: string;
  name: string;
  type: 'FREE_SHIPPING' | 'COURIER_PARTNER';
  ratePerKg?: number;
  fixedRate?: number;
  minAmount?: number;
  isActive: boolean;
}

interface StockIssue {
  sku: string;
  productName: string;
  requested: number;
  available: number;
  reason: string;
}

// Add an interface for the insufficient stock item
interface InsufficientStockItem {
  sku: string;
  productName: string;
  requestedQuantity: number;
  availableQuantity: number;
  reason: string;
}

/*interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: {
    name: string;
    contact: string;
    email: string;
  };
  notes: Record<string, string>;
  theme: {
    color: string;
  };
  handler: (response: RazorpayResponse) => void;
  modal?: {
    ondismiss: () => void;
  };
}*/

/*interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}*/

// Add this to declare the Razorpay global type
/*interface Window {
  Razorpay: new (options: RazorpayOptions) => {
    open: () => void;
  };
}*/

interface AxiosErrorType {
  response?: {
    data: any;
    status: number;
  };
  request?: any;
  message?: string;
}

const CartPage: React.FC = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [cart, setCart] = useState<CartData>({ items: [], total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<'shipping' | 'terms' | 'payment'>('shipping');
  const [senderId, setSenderId] = useState<string>('');
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
  const [selectedShippingPartner, setSelectedShippingPartner] = useState<ShippingPartner | null>(null);
  const [stockIssues, setStockIssues] = useState<StockIssue[]>([]);
  const [stockValidationInProgress, setStockValidationInProgress] = useState(false);

  // Form state
  const [shippingDetails, setShippingDetails] = useState<ShippingDetails>({
    name: '',
    address: '',
    pinCode: '',
    city: '',
    state: '',
    country: 'India',
    phoneNumber: '',
    shippingPartner: null
  });

  // Extract query parameters from URL
  const getQueryParams = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const skuParam = urlParams.get('sku');
    const securityAccessTokenParam = urlParams.get('securityaccessToken');
    const tenentIdParam = urlParams.get('tenentId');
    
    return {
      sku: skuParam,
      securityAccessToken: securityAccessTokenParam || '',
      tenentId: tenentIdParam || localStorage.getItem('tenentId') || ''
    };
  };

  const { sku, securityAccessToken, tenentId } = getQueryParams();
  
  // Store tenentId in localStorage for future use (but not senderId)
  useEffect(() => {
    if (tenentId) localStorage.setItem('tenentId', tenentId);
  }, [tenentId]);

  const appUrl = process.env.REACT_APP_API_URL || 'https://app.instaxbot.com';

  // Verify the security token and get senderId
  useEffect(() => {
    const verifySecurity = async () => {
      if (!securityAccessToken || !tenentId) {
        setError('Missing authentication information');
        setIsLoading(false);
        return;
      }

      try {
        console.log('Verifying security token:', `${appUrl}/api/verifysecurityaccesstokenroute/verify-token`);
        
        let response;
        
        try {
          response = await axios.post(`${appUrl}/api/verifysecurityaccesstokenroute/verify-token`, {
            tenentId, 
            securityAccessToken
          });
          console.log('Token verification response:', response.data);
        } catch (error) {
          const axiosError = error as AxiosErrorType;
          console.error('Token verification error:', axiosError);
          if (axiosError.response) {
            console.error('Response data:', axiosError.response.data);
            console.error('Response status:', axiosError.response.status);
          } else if (axiosError.request) {
            console.error('No response received:', axiosError.request);
          } else {
            console.error('Error setting up request:', axiosError.message);
          }
          throw error; // Re-throw to be caught by outer catch
        }

        if (response && response.data && response.data.senderId) {
          setSenderId(response.data.senderId);
        } else {
          setError('Invalid security token');
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error verifying security token:', err);
        setError('Authentication failed. Please try again.');
        setIsLoading(false);
      }
    };
    
    verifySecurity();
  }, [securityAccessToken, tenentId, appUrl]);

  // Fetch shipping methods
  useEffect(() => {
    const fetchShippingMethods = async () => {
      try {
        console.log('Fetching shipping methods:', `${appUrl}/api/shippingmethodroute/${tenentId}`);
        
        const response = await axios.get(`${appUrl}/api/shippingmethodroute/${tenentId}`);
        
        console.log('Shipping methods response:', response.data);
        
        if (Array.isArray(response.data)) {
          setShippingMethods(response.data);
        } else {
          setError('Failed to load shipping methods');
        }
      } catch (err) {
        setError('Failed to fetch shipping methods');
        console.error(err);
      }
    };
  
    if (tenentId) {
      fetchShippingMethods();
    }
  }, [appUrl, tenentId]);

  // Function to fetch cart data
  const fetchCartData = async () => {
    if (!securityAccessToken || !tenentId) return;
    
    try {
      setError(null);
      
      const response = await axios.get(
        `${appUrl}/api/cartroute/${securityAccessToken}/${tenentId}`
      );
      
      // Validate response structure
      if (response.data && typeof response.data === 'object') {
        const items = Array.isArray(response.data.items) ? response.data.items : [];
        const total = typeof response.data.total === 'number' ? response.data.total : 0;
        setCart({ items, total });
      } else {
        console.error('Invalid response format:', response.data);
        setCart({ items: [], total: 0 });
        setError('Received invalid data from server');
      }
      
      setIsLoading(false);
    } catch (error) {
      //const axiosError = error as AxiosErrorType;
      setError('Failed to load your cart. Please try again.');
      setIsLoading(false);
    }
  };
  
  // Function to validate stock
  const validateStock = async (): Promise<{ valid: boolean; issues: StockIssue[] }> => {
    if (!securityAccessToken || !tenentId) return { valid: false, issues: [] };
    
    try {
      setError(null);
      console.log('Validating stock:', {
        url: `${appUrl}/api/cartroute/validate-stock`,
        data: { securityAccessToken, tenentId }
      });
      
      const response = await axios.post(`${appUrl}/api/cartroute/validate-stock`, {
        securityAccessToken,
        tenentId
      });
      
      console.log('Stock validation response:', response.data);
      
      if (response.data && response.data.valid !== undefined) {
        // Map the backend response structure to your frontend structure
        return {
          valid: response.data.valid,
          issues: (response.data.insufficientItems || []).map((item: InsufficientStockItem) => ({
            sku: item.sku,
            productName: item.productName,
            requested: item.requestedQuantity,
            available: item.availableQuantity,
            reason: item.reason
          }))
        };
      }
      
      return { valid: false, issues: [] };
    } catch (error) {
      console.error('Error validating stock:', error);
      setError('Failed to validate product stock. Please try again.');
      return { valid: false, issues: [] };
    }
  };

  // Function to validate cart stock on load
  const validateCartStockOnLoad = async () => {
    if (!securityAccessToken || !tenentId) return;
    
    try {
      setStockValidationInProgress(true);
      
      // Call the existing validateStock function
      const stockValidation = await validateStock();
      
      if (!stockValidation.valid) {
        // Store stock issues in state
        setStockIssues(stockValidation.issues);
        
        // Display toast notifications for each issue
        
        // Also show a general notification about stock issues
        
      }
    } catch (error) {
      console.error('Error validating stock on load:', error);
      toast.error('Failed to verify product availability. Please try again later.', {
        position: "top-center",
        autoClose: 3000,
        className: 'custom-toast',
      });
    } finally {
      setStockValidationInProgress(false);
    }
  };

  // Function to fetch saved address information
  const fetchAddressInfo = async () => {
    if (!securityAccessToken || !tenentId) return;
    
    try {
      console.log('Fetching address info:', `${appUrl}/api/addressroute/address_info?securityAccessToken=${securityAccessToken}&tenentId=${tenentId}`);
      
      const response = await axios.get(
        `${appUrl}/api/addressroute/address_info?securityAccessToken=${securityAccessToken}&tenentId=${tenentId}`
      );
      
      console.log('Address info response:', response.data);
      
      // Update shipping details form with existing data
      if (response.data) {
        setShippingDetails({
          name: response.data.name || '',
          address: response.data.address || '',
          pinCode: response.data.pinCode || '',
          city: response.data.city || '',
          state: response.data.state || '',
          country: response.data.country || 'India',
          phoneNumber: response.data.phoneNumber || '',
          shippingPartner: response.data.shippingPartner || null
        });
      }
    } catch (error) {
      const axiosError = error as AxiosErrorType;
      console.error('Error fetching address info:', axiosError);
      // We don't need to show an error to the user here,
      // as the form will just be empty if there's no saved address
    }
  };

  // Fetch cart data when senderId is available and validate stock
  useEffect(() => {
    if (securityAccessToken && tenentId) {
      fetchCartData().then(() => {
        // Validate stock after cart data is loaded
        validateCartStockOnLoad();
      });
    }
  }, [securityAccessToken, tenentId, senderId]);

  // Add product to cart when SKU is present in URL and securityAccessToken is available
  useEffect(() => {
    const addProductToCart = async () => {
      if (!securityAccessToken || !tenentId) return;
      
      if (sku) {
        try {
          setIsLoading(true);
          
          console.log('Adding product to cart:', {
            url: `${appUrl}/api/cartroute/add`,
            data: { securityAccessToken, tenentId, sku, quantity: 1 }
          });
          
          const response = await axios.post(`${appUrl}/api/cartroute/add`, {
            securityAccessToken,
            tenentId,
            sku,
            quantity: 1  // Default to 1 if not specified
          });
          
          console.log('Add to cart response:', response.data);
          
          // Refresh cart after adding
          await fetchCartData();
          
          // Remove the SKU parameter but keep tenentId and securityAccessToken
          const url = new URL(window.location.href);
          url.searchParams.delete('sku');
          window.history.replaceState({}, '', url.toString());
        } catch (error) {
          const axiosError = error as AxiosErrorType;
          console.error('Error adding product to cart:', axiosError);
          
          if (axiosError.response) {
            console.error('Response data:', axiosError.response.data);
            console.error('Response status:', axiosError.response.status);
          }
          
          setError('Failed to add product to cart. Please try again.');
          setIsLoading(false);
        }
      }
    };
    
    if (securityAccessToken && tenentId && sku) {
      addProductToCart();
    }
  }, [sku, securityAccessToken, tenentId, appUrl]);

  // Prevent background scroll when drawer is open
  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
  }, [isDrawerOpen]);

  // Check stock on payment page
  useEffect(() => {
    const checkStockOnPaymentPage = async () => {
      if (checkoutStep === 'payment') {
        setStockValidationInProgress(true);
        
        try {
          const stockValidation = await validateStock();
          
          if (!stockValidation.valid) {
            // Store stock issues in state
            setStockIssues(stockValidation.issues);
            
            // Display toast notifications for each issue
            stockValidation.issues.forEach((issue) => {
              toast.error(`Stock issue: ${issue.productName} - Only ${issue.available} available`, {
                position: "top-center",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                className: 'custom-toast',
              });
            });
            
            // Refresh cart to update with latest stock info
            await fetchCartData();
          } else {
            // Clear any previous stock issues
            setStockIssues([]);
          }
        } catch (error) {
          console.error('Error validating stock:', error);
          toast.error('Unable to verify product availability. Please try again.', {
            position: "top-center",
            autoClose: 3000,
            className: 'custom-toast',
          });
        } finally {
          setStockValidationInProgress(false);
        }
      }
    };
    
    checkStockOnPaymentPage();
  }, [checkoutStep]);

  // Debug render
  useEffect(() => {
    console.log('Rendering with cart:', cart);
  }, [cart]);

  const handleQuantityChange = async (sku: string, newQuantity: number, availableStock: number) => {
    // First check for missing auth tokens
    if (!securityAccessToken || !tenentId) return;
    
    // Only apply stock validation when increasing quantity, not when decreasing
    const isIncreasingQuantity = (cart.items.find(item => item.sku === sku)?.quantity || 0) < newQuantity;
    
    // Only check available stock when increasing quantity
    if (isIncreasingQuantity && newQuantity > availableStock) {
      toast.error(`Not enough stock to add the product to your cart`, {
        position: "top-center",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        className: 'custom-toast',
      });
      return;
    }
  
    // Handle case where quantity becomes zero
    if (newQuantity <= 0) {
      await handleRemoveItem(sku);
      return;
    }
  
    try {
      setError(null);
      
      console.log('Updating quantity:', {
        url: `${appUrl}/api/cartroute/update`,
        data: { securityAccessToken, tenentId, sku, quantity: newQuantity }
      });
      
      const response = await axios.put(`${appUrl}/api/cartroute/update`, {
        securityAccessToken,
        tenentId,
        sku,
        quantity: newQuantity
      });
      
      console.log('Update quantity response:', response.data);
      
      if (response.data && response.data.cart) {
        const items = Array.isArray(response.data.cart.items) 
          ? response.data.cart.items 
          : [];
        const total = typeof response.data.cart.total === 'number' 
          ? response.data.cart.total 
          : 0;
        
        setCart({ items, total });

        // Re-validate stock after updating quantity
        validateCartStockOnLoad();
      } else {
        // If the response format is unexpected, refresh the cart
        await fetchCartData();
      }
    } catch (error) {
      const axiosError = error as AxiosErrorType;
      console.error('Error updating quantity:', axiosError);
      
      // Still handle server-side validation errors
      if (axiosError.response && 
          axiosError.response.status === 400 && 
          axiosError.response.data && 
          axiosError.response.data.insufficientStock) {
        alert(axiosError.response.data.message);
        setError(axiosError.response.data.message);
      } else {
        setError('Failed to update product quantity. Please try again.');
      }
      
      // Refresh cart to ensure UI is in sync with backend
      await fetchCartData();
    }
  };
  
  const handleShippingPartnerSelect = (method: ShippingMethod) => {
    // Calculate shipping cost based on method type and cart total
    let cost = 0;
    
    if (method.type === 'FREE_SHIPPING') {
      // If this is a free shipping method, check if cart total meets minimum amount
      const minimumAmount = method.minAmount || 0;
      cost = cart.total >= minimumAmount ? 0 : (method.fixedRate || 50); // Default to 50 if fixedRate is not provided
    } else {
      // For other shipping methods, use the fixed rate
      cost = method.fixedRate || 0;
    }
    
    // Convert ShippingMethod to ShippingPartner format
    const partner: ShippingPartner = {
      id: method._id || 'default-id',
      name: method.name,
      cost: cost
    };
    
    setSelectedShippingPartner(partner);
    
    // Update shipping details with selected partner
    setShippingDetails(prev => ({
      ...prev,
      shippingPartner: partner
    }));
  };

  const handleRemoveItem = async (sku: string) => {
    if (!securityAccessToken || !tenentId) return;
    
    try {
      setError(null);
      
      console.log('Removing item:', {
        url: `${appUrl}/api/cartroute/remove`,
        data: { securityAccessToken, tenentId, sku }
      });
      
      const response = await axios.delete(`${appUrl}/api/cartroute/remove`, {
        data: {
          securityAccessToken,
          tenentId,
          sku
        }
      });
      
      console.log('Remove item response:', response.data);
      
      if (response.data && response.data.cart) {
        const items = Array.isArray(response.data.cart.items) 
          ? response.data.cart.items 
          : [];
        const total = typeof response.data.cart.total === 'number' 
          ? response.data.cart.total 
          : 0;
        
        setCart({ items, total });
        
        // Re-validate stock after removing an item
        if (items.length > 0) {
          validateCartStockOnLoad();
        } else {
          // Clear stock issues if cart is empty
          setStockIssues([]);
        }
      } else {
        // If the response format is unexpected, refresh the cart
        await fetchCartData();
      }
    } catch (error) {
      const axiosError = error as AxiosErrorType;
      console.error('Error removing item:', axiosError);
      setError('Failed to remove product. Please try again.');
      // Refresh cart to ensure UI is in sync with backend
      await fetchCartData();
    }
  };

  const handleClearCart = async () => {
    if (!securityAccessToken || !tenentId) return;
    
    try {
      setError(null);
      
      console.log('Clearing cart:', {
        url: `${appUrl}/api/cartroute/clear`,
        data: { securityAccessToken, tenentId }
      });
      
      const response = await axios.delete(`${appUrl}/api/cartroute/clear`, {
        data: {
          securityAccessToken,
          tenentId
        }
      });
      
      console.log('Clear cart response:', response.data);
      
      if (response.data && response.data.cart) {
        const items = Array.isArray(response.data.cart.items) 
          ? response.data.cart.items 
          : [];
        const total = typeof response.data.cart.total === 'number' 
          ? response.data.cart.total 
          : 0;
        
        setCart({ items, total });
        
        // Clear stock issues when cart is cleared
        setStockIssues([]);
      } else {
        // If the response format is unexpected, refresh the cart
        await fetchCartData();
      }
    } catch (error) {
      const axiosError = error as AxiosErrorType;
      console.error('Error clearing cart:', axiosError);
      setError('Failed to clear cart. Please try again.');
      // Refresh cart to ensure UI is in sync with backend
      await fetchCartData();
    }
  };

  const handleShippingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setError(null);
      
      // Validate required fields and shipping partner
      if (!shippingDetails.name || !shippingDetails.address || !shippingDetails.pinCode || 
          !shippingDetails.city || !shippingDetails.state || !shippingDetails.phoneNumber ||
          !shippingDetails.shippingPartner) {
        setError('Please fill in all required fields and select a shipping partner');
        return;
      }
      
      console.log('Saving shipping details:', {
        url: `${appUrl}/api/checkoutroute/save_address`,
        data: { securityAccessToken, tenentId, shippingDetails }
      });
      
      // Send the shipping details to the server
      const response = await axios.post(`${appUrl}/api/checkoutroute/save_address`, {
        securityAccessToken,
        tenentId,
        shippingDetails
      });
      
      console.log('Save address response:', response.data);
      
      // Proceed to terms step if successful
      setCheckoutStep('terms');
    } catch (error) {
      const axiosError = error as AxiosErrorType;
      console.error('Error saving shipping details:', axiosError);
      
      if (axiosError.response) {
        console.error('Response data:', axiosError.response.data);
        console.error('Response status:', axiosError.response.status);
      }
      
      setError('Failed to save your shipping details. Please try again.');
    }
  };

  const handleProceedToCheckout = () => {
    // Check if there are stock issues before proceeding to checkout
    if (stockIssues.length > 0) {
      toast.error('Please resolve stock issues before proceeding to checkout', {
        position: 'top-center',
        autoClose: 3000,
        className: 'custom-toast',
      });
      return;
    }
    
    setIsDrawerOpen(true);
    setCheckoutStep('shipping');
    fetchAddressInfo(); // Fetch saved address when opening checkout
  };

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setShippingDetails(prev => ({
      ...prev,
      [name]: value
    }));

    // Auto-fill city and state when pincode is entered
    if (name === 'pinCode' && value.length === 6) {
      try {
        const response = await axios.get(`${appUrl}/api/pincoderoute/${value}`);

        const data = response.data[0];

        if (data.Status === 'Success') {
          const postOffice = data.PostOffice[0];
          setShippingDetails(prev => ({
            ...prev,
            city: postOffice.District || postOffice.Block,
            state: postOffice.State
          }));

        } 
      } catch (error) {
        console.error('Failed to fetch pincode details:', error);

      }
    }
  };

  // Calculate total with shipping if a partner is selected
  const calculateTotal = () => {
    const subtotal = cart.total || 0;
    const shippingCost = selectedShippingPartner?.cost || 0;
    return subtotal + shippingCost;
  };

  const initiateRazorpayPayment = async () => {
    // Get the token directly from URL parameters to ensure exact matching
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('securityaccessToken'); // Note lowercase 'a'
    
    if (!urlToken || !tenentId) {
      toast.error('Authentication error. Please check URL parameters and try again.', {
        position: 'top-center',
        autoClose: 3000,
        className: 'custom-toast',
      });
      return;
    }
    
    try {
      // First validate stock
      if (stockIssues.length > 0) {
        toast.error('Please resolve stock issues before proceeding', {
          position: 'top-center',
          autoClose: 3000,
          className: 'custom-toast',
        });
        return;
      }
    
      // Log what we're sending
      console.log('Creating payment link with URL token:', {
        token: urlToken.substring(0, 10) + '...',
        tenentId,
        amount: calculateTotal() * 100
      });
    
      // Set up the payment link request with the exact URL token
      const response = await axios.post(
        `${appUrl}/api/cartroute/create-payment-link`,
        {
          securityAccessToken: urlToken, // Use the exact token from URL
          tenentId,
          amount: calculateTotal() * 100,
          description: `Order from ${shippingDetails.name}`,
          notes: {
            customer_phone: shippingDetails.phoneNumber,
            shipping_address: JSON.stringify(shippingDetails),
            shipping_amount: selectedShippingPartner?.cost || 0
          }
        }
      );
    
      console.log('Payment link created:', response.data);
  
      // If we got a payment link URL, redirect to it
      if (response.data && response.data.payment_link_url) {
        // Save current order info to local storage for reference
        localStorage.setItem('currentOrderId', response.data.id || '');
        localStorage.setItem('currentReferenceId', response.data.reference_id || '');
        
        // Redirect to Razorpay payment page
        window.location.href = response.data.payment_link_url;
      } else {
        toast.error('Failed to create payment link', {
          position: 'top-center',
          autoClose: 3000,
          className: 'custom-toast',
        });
      }
    } catch (error) {
      console.error('Payment link creation error:', error);
      
      // Handle different types of errors
      const axiosError = error as AxiosErrorType;
      if (axiosError.response) {
        if (axiosError.response.data && axiosError.response.data.insufficientItems) {
          // Handle stock validation errors from the server
          setStockIssues(axiosError.response.data.insufficientItems.map((item: InsufficientStockItem) => ({
            sku: item.sku,
            productName: item.productName,
            requested: item.requestedQuantity,
            available: item.availableQuantity,
            reason: item.reason
          })));
          
          toast.error('Some items in your cart have stock issues', {
            position: 'top-center',
            autoClose: 4000,
            className: 'custom-toast',
          });
        } else if (axiosError.response.data && axiosError.response.data.error) {
          // Display the specific error from the server
          toast.error(axiosError.response.data.error, {
            position: 'top-center',
            autoClose: 3000,
            className: 'custom-toast',
          });
        } else {
          toast.error('Payment initialization failed', {
            position: 'top-center',
            autoClose: 3000,
            className: 'custom-toast',
          });
        }
      } else {
        toast.error('Payment initialization failed', {
          position: 'top-center',
          autoClose: 3000,
          className: 'custom-toast',
        });
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* Custom CSS for larger toast notifications */}
      <style>{`
        .custom-toast {
          font-size: 18px !important;
          min-height: 64px !important;
          width: 300px !important;
          padding: 15px !important;
          }
        .Toastify__toast-container--top-center {
          top: 20px;
          width: auto;
          margin: 0 auto;
        }
      `}</style>
      
      {/* Toast Container - this will render the toast notifications */}
      <ToastContainer />
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Your Cart</h1>
        <a 
          href={`/productcatalog?tenentId=${tenentId}&securityaccessToken=${securityAccessToken}`} 
          className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md transition-colors"
        >
          Back to Products
        </a>
      </div>
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
          <p>{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : !cart || !cart.items || cart.items.length === 0 ? (
        <div className="text-center py-8 bg-white rounded-lg shadow">
          <p className="text-gray-500 mb-4">Your cart is empty</p>
          <a 
            href={`/productcatalog?tenentId=${tenentId}&securityaccessToken=${securityAccessToken}`} 
            className="text-blue-500 hover:text-blue-700"
          >
            Continue Shopping
          </a>
        </div>
      ) : (
        <>
          {/* Stock validation loading indicator */}
          {stockValidationInProgress && (
            <div className="flex items-center justify-center p-4 mb-4 bg-blue-50 border border-blue-200 rounded-md">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mr-3"></div>
              <p className="text-blue-700">Verifying product stock availability...</p>
            </div>
          )}

          {/* Stock Issues Warning Banner */}
          {stockIssues.length > 0 && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
              <div className="flex">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="font-medium">Stock availability issues</p>
                  <p className="text-sm">Some items in your cart have limited availability. Please review and adjust quantities.</p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
            <div className="px-4 sm:px-6 py-4 border-b">
              <div className="hidden sm:flex px-6 py-4 border-b justify-between font-medium text-gray-500">
                <div className="w-2/5">Product</div>
                <div className="w-1/5 text-center">Price</div>
                <div className="w-1/5 text-center">Quantity</div>
                <div className="w-1/5 text-right">Total</div>
              </div>
            </div>
            
            <div className="divide-y">
              {cart.items.map((item) => {
                const stockIssue = stockIssues.find(issue => issue.sku === item.sku);
                const hasStockIssue = stockIssue !== undefined;

                return (
                  <div key={item.sku} className={`p-4 ${hasStockIssue ? 'border border-red-500 bg-red-50 rounded-md m-2' : ''}`}>
                    {/* Product details - always stack vertically on mobile */}
                    <div className="flex items-center mb-3">
                      {item.productPhotoUrl && (
                        <img 
                          src={item.productPhotoUrl} 
                          alt={item.productName} 
                          className="w-16 h-16 object-cover rounded mr-3"
                          onError={(e) => {
                            e.currentTarget.onerror = null; // Prevent infinite loop
                            e.currentTarget.src = `${appUrl}/default-product-image.jpg`;
                          }}
                        />
                      )}
                      <div>
                        <div className="font-medium">{item.productName}</div>
                        <div className="text-sm text-gray-500">SKU: {item.sku}</div>
                        
                        {/* Add stock status indicator */}
                        {hasStockIssue ? (
                          <div className="text-red-600 text-sm mt-1 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            Only {stockIssue.available} available
                          </div>
                        ) : (
                          <div className="text-green-600 text-sm mt-1 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            In Stock
                          </div>
                        )}
                      </div>
                      <button 
                        className="ml-auto text-gray-400 hover:text-red-500"
                        onClick={() => handleRemoveItem(item.sku)}
                        aria-label={`Remove ${item.productName} from cart`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                    
                    {/* Show stock issue resolution options if needed */}
                    {hasStockIssue && (
                    <div className="mt-2 bg-red-100 p-3 rounded-md mb-3">
                      <p className="text-red-700 text-sm font-medium">
                        {stockIssue.available === 0 ? 
                          "No stock available" : 
                          `You selected ${stockIssue.requested} but only ${stockIssue.available} are available`
                        }
                      </p>
                      <div className="flex space-x-2 mt-2">
                        {/* Only show Update button if there's at least 1 item available */}
                        {stockIssue.available > 0 && (
                          <button
                            onClick={() => handleQuantityChange(item.sku, stockIssue.available, stockIssue.available)}
                            className="bg-blue-600 text-white text-sm px-3 py-1 rounded-md hover:bg-blue-700 flex items-center"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4" />
                            </svg>
                            Update to {stockIssue.available}
                          </button>
                        )}
                        <button
                          onClick={() => handleRemoveItem(item.sku)}
                          className="bg-red-500 text-white text-sm px-3 py-1 rounded-md hover:bg-red-600 flex items-center"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Remove Item
                        </button>
                      </div>
                    </div>
                  )}
                    
                    {/* Price, quantity and total - shown as a grid on mobile */}
                    <div className="grid grid-cols-3 gap-2 items-center">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Price</div>
                        <div>₹{parseFloat(String(item.price)).toFixed(2)}</div>
                      </div>
                      
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Quantity</div>
                        <div className="flex items-center border rounded-md w-min">
                          <button 
                            className="px-2 py-1 text-gray-500 hover:text-gray-700"
                            onClick={() => handleQuantityChange(item.sku, item.quantity - 1, item.quantityInStock)}
                          >
                            -
                          </button>
                          <span className="px-2">{item.quantity}</span>
                          <button 
                            className="px-2 py-1 text-gray-500 hover:text-gray-700"
                            onClick={() => handleQuantityChange(item.sku, item.quantity + 1, item.quantityInStock)}
                            disabled={hasStockIssue && item.quantity >= stockIssue.available}
                          >
                            +
                          </button>
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Total</div>
                        <div className="font-medium">
                          ₹{(parseFloat(String(item.price)) * item.quantity).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4">
            <button 
              className="text-red-500 hover:text-red-700"
              onClick={handleClearCart}
            >
              Clear Cart
            </button>
            
            <div className="bg-white rounded-lg shadow p-6 w-full md:w-80">
            <h2 className="text-lg font-medium mb-4">Order Summary</h2>
            
            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₹{cart.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Shipping</span>
                <span>Calculated at checkout</span>
              </div>
            </div>
            
            <div className="border-t pt-4 mb-6">
              <div className="flex justify-between font-medium">
                <span>Total</span>
                <span>₹{cart.total.toFixed(2)}</span>
              </div>
            </div>
            
            <div className="space-y-2">
              {stockIssues.length > 0 ? (
                <>
                  {/* Refresh button */}
                  <button 
                    onClick={async () => {
                      try {
                        setIsLoading(true);
                        setStockIssues([]); // Clear existing issues before refresh
                        await fetchCartData();
                        const stockValidation = await validateStock();
                        
                        if (!stockValidation.valid) {
                          setStockIssues(stockValidation.issues);
                          toast.info("Stock check complete. Please review your cart.", {
                            position: "top-center",
                            autoClose: 3000,
                            className: 'custom-toast',
                          });
                        } else {
                          // If validation is successful (no issues), clear issues array and show success
                          setStockIssues([]);
                          toast.success("Your cart is ready for checkout!", {
                            position: "top-center",
                            autoClose: 3000,
                            className: 'custom-toast',
                          });
                        }
                      } catch (error) {
                        console.error("Error refreshing cart:", error);
                        toast.error("Failed to refresh cart. Please try again.", {
                          position: "top-center",
                          autoClose: 3000,
                          className: 'custom-toast',
                        });
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                    className="w-full flex items-center justify-center bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg text-lg transition-colors"
                  >
                    {isLoading ? (
                      <span className="flex items-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Refreshing...
                      </span>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Refresh Cart
                      </>
                    )}
                  </button>
                  
                  {/* Disabled checkout button */}
                  <button
                    disabled
                    className="w-full bg-gray-400 cursor-not-allowed text-white py-3 rounded-lg text-lg"
                  >
                    Proceed to Checkout
                  </button>
                  
                  <p className="text-red-500 text-sm mt-1 text-center">
                    Please resolve stock issues before checkout
                  </p>
                </>
              ) : (
                /* Regular checkout button when no stock issues */
                <button
                  onClick={handleProceedToCheckout}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg text-lg transition-colors"
                >
                  Proceed to Checkout
                </button>
              )}
            </div>
          </div>
          </div>
        </>
      )}

      {/* Overlay - Prevent Background Clicks */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity ${
          isDrawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsDrawerOpen(false)}
      />

      {/* Shipping Details Form */}
      {checkoutStep === 'shipping' && (
        <div
          className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 p-6 shadow-lg transform transition-transform duration-300 ease-in-out ${
            isDrawerOpen ? 'translate-y-0' : 'translate-y-full'
          }`}
          style={{ height: '80vh', overflowY: 'auto' }}
        >
          <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-6" />
          
          <div className="flex items-center mb-4">
            <button 
              onClick={() => setIsDrawerOpen(false)} 
              className="p-2"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-xl font-medium mx-auto pr-8">Your details</h2>
            <button className="text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
          </div>
          
          <div className="w-full h-2 bg-gray-100 mb-6">
            <div className="w-1/3 h-full bg-pink-500"></div>
          </div>
          
          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
              <p>{error}</p>
            </div>
          )}
          
          <form className="space-y-4" onSubmit={handleShippingSubmit}>
            <div>
              <input
                type="text"
                placeholder="Name"
                name="name"
                value={shippingDetails.name}
                onChange={handleInputChange}
                className={`w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 ${
                  error && !shippingDetails.name ? 'border-red-500' : ''
                }`}
                required
              />
            </div>
            
            <div>
              <input
                type="text"
                placeholder="Address"
                name="address"
                value={shippingDetails.address}
                onChange={handleInputChange}
                className={`w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 ${
                  error && !shippingDetails.address ? 'border-red-500' : ''
                }`}
                required
              />
            </div>
            
            <div>
              <input
                type="text"
                placeholder="Pin code"
                name="pinCode"
                value={shippingDetails.pinCode}
                onChange={handleInputChange}
                className={`w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 ${
                  error && !shippingDetails.pinCode ? 'border-red-500' : ''
                }`}
                required
                maxLength={6}
                pattern="[0-9]{6}"
              />
            </div>
            
            <div>
              <input
                type="text"
                placeholder="City"
                name="city"
                value={shippingDetails.city}
                onChange={handleInputChange}
                className={`w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 ${
                  error && !shippingDetails.city ? 'border-red-500' : ''
                }`}
                required
                readOnly
              />
            </div>
            
            <div className="relative">
              <input
                type="text"
                placeholder="State"
                name="state"
                value={shippingDetails.state}
                onChange={handleInputChange}
                className={`w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 ${
                  error && !shippingDetails.state ? 'border-red-500' : ''
                }`}
                required
                readOnly
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            
            <div>
              <label className="block text-gray-500 text-sm mb-1">Country</label>
              <input
                type="text"
                name="country"
                value="India"
                readOnly
                className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
              />
            </div>
            
            <div>
              <input
                type="tel"
                placeholder="Phone number"
                name="phoneNumber"
                value={shippingDetails.phoneNumber}
                onChange={handleInputChange}
                className={`w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 ${
                  error && !shippingDetails.phoneNumber ? 'border-red-500' : ''
                }`}
                required
              />
            </div>

            {/* Shipping Partner Selection */}
            <div className="mt-6 mb-4">
              <h3 className="text-lg font-medium mb-2">Select Your Preferred Shipping Partner</h3>
              <p className="text-gray-600 mb-1">Standard shipping charge: ₹50</p>
              <p className="text-gray-500 italic mb-4">[Calculated at Checkout]</p>
              
              <div className="space-y-3">
                {shippingMethods.map((method) => (
                  <div 
                    key={method._id}
                    className={`border rounded-md p-4 flex justify-between items-center cursor-pointer ${
                      shippingDetails.shippingPartner?.id === method._id ? 'border-pink-500' : ''
                    }`}
                    onClick={() => handleShippingPartnerSelect(method)}
                  >
                    <div>
                      <div className="font-medium">{method.name}</div>
                      <div className="text-sm text-gray-600">
                        {method.type === 'FREE_SHIPPING' ? (
                          cart.total >= (method.minAmount || 0) ? 
                            "Free (Your order qualifies for free shipping)" : 
                            `Free shipping available on orders above ₹${method.minAmount || 0}`
                        ) : (
                          `₹${method.fixedRate || 0}`
                        )}
                      </div>
                    </div>
                    {shippingDetails.shippingPartner?.id === method._id && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            <button
              type="submit"
              className="w-full bg-pink-500 hover:bg-pink-600 text-white py-3 rounded-md text-lg mt-4 transition-colors"
            >
              Continue
            </button>
          </form>
        </div>
      )}

      {checkoutStep === 'terms' && (
        <div
          className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 p-6 shadow-lg transform transition-transform duration-300 ease-in-out ${
            isDrawerOpen ? 'translate-y-0' : 'translate-y-full'
          }`}
          style={{ height: '80vh', overflowY: 'auto' }}
        >
          <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-6" />
          
          <div className="flex items-center mb-4">
            <button 
              onClick={() => setCheckoutStep('shipping')} 
              className="p-2"
              aria-label="Back"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-xl font-medium mx-auto pr-8">Terms and Conditions</h2>
            <div className="w-6"></div> {/* Empty div for flex alignment */}
          </div>
          
          <div className="w-full h-2 bg-gray-100 mb-6">
            <div className="w-2/3 h-full bg-pink-500"></div>
          </div>
          
          <div className="mb-8">
            <h3 className="text-2xl font-bold mb-4">Our Terms</h3>
            <p className="mb-4">
              Your personal data will be used to process your order, support your experience on Instagram, and for other purposes as outlined in our privacy policy.
            </p>
          </div>
          
          <button
            onClick={() => setCheckoutStep('payment')}
            className="w-full bg-pink-500 hover:bg-pink-600 text-white py-3 rounded-md text-lg transition-colors mb-4"
          >
            Accept and Submit
          </button>
          
          <div className="flex items-center justify-center mt-6 text-sm text-gray-600">
            <p className="flex items-center">
              <span>Managed by {tenentId ? "Vaseegrah Shop" : "Shop"}. </span>
              <a href="#" className="text-pink-500 ml-1">Learn more</a>
            </p>
          </div>
        </div>
      )}
      
      {checkoutStep === 'payment' && (
        <div
          className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 p-6 shadow-lg transform transition-transform duration-300 ease-in-out ${
            isDrawerOpen ? 'translate-y-0' : 'translate-y-full'
          }`}
          style={{ height: '85vh', overflowY: 'auto' }}
        >
          <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-6" />

          <div className="flex items-center mb-4">
            <button
              onClick={() => setCheckoutStep('terms')}
              className="p-2"
              aria-label="Back"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-xl font-medium mx-auto pr-8">Order Summary</h2>
            <div className="w-6"></div> {/* Empty div for flex alignment */}
          </div>

          <div className="w-full h-2 bg-gray-100 mb-6">
            <div className="w-full h-full bg-pink-500"></div>
          </div>

          {/* Display loading indicator during stock validation */}
          {stockValidationInProgress && (
            <div className="flex items-center justify-center p-4 mb-4 bg-blue-50 border border-blue-200 rounded-md">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mr-3"></div>
              <p className="text-blue-700">Verifying product stock availability...</p>
            </div>
          )}

          {/* Stock Issues Warning Banner */}
          {stockIssues.length > 0 && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
              <div className="flex">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="font-medium">Some items in your cart have stock issues</p>
              </div>
              <p className="ml-8 text-sm">Please adjust quantities before proceeding with payment</p>
            </div>
          )}

          {/* Product List */}
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-3">Products</h3>
            <div className="space-y-4 max-h-64 overflow-y-auto">
              {cart.items.map((item) => {
                const stockIssue = stockIssues.find(issue => issue.sku === item.sku);
                const hasStockIssue = stockIssue !== undefined;

                return (
                  <div
                    key={item.sku}
                    className={`border rounded-md p-4 ${hasStockIssue ? 'border-red-500 bg-red-50' : ''}`}
                  >
                    <div className="flex items-center">
                      {item.productPhotoUrl && (
                        <img
                          src={item.productPhotoUrl}
                          alt={item.productName}
                          className="w-16 h-16 object-cover rounded mr-3"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = `${appUrl}/default-product-image.jpg`;
                          }}
                        />
                      )}
                      <div className="flex-1">
                        <div className="font-medium">{item.productName}</div>
                        <div className="text-sm text-gray-500">SKU: {item.sku}</div>
                  <div className="flex justify-between items-center mt-2">
                    <div className="text-gray-700">₹{parseFloat(String(item.price)).toFixed(2)} × {item.quantity}</div>
                    <div className="font-medium">₹{(parseFloat(String(item.price)) * item.quantity).toFixed(2)}</div>
                  </div>

                  {/* Stock Status Indicator */}
                  {!hasStockIssue && (
                    <div className="mt-1 text-green-600 text-xs flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      In Stock
                    </div>
                  )}
                </div>
              </div>

              {hasStockIssue && (
              <div className="mt-2 bg-red-100 p-3 rounded-md mb-3">
                <p className="text-red-700 text-sm font-medium">
                  {stockIssue.available === 0 ? 
                    "No stock available" : 
                    `You selected ${stockIssue.requested} but only ${stockIssue.available} are available`
                  }
                </p>
                <div className="flex space-x-2 mt-2">
                  {/* Only show Update button if there's at least 1 item available */}
                  {stockIssue.available > 0 && (
                    <button
                      onClick={() => handleQuantityChange(item.sku, stockIssue.available, stockIssue.available)}
                      className="bg-blue-600 text-white text-sm px-3 py-1 rounded-md hover:bg-blue-700 flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4" />
                      </svg>
                      Update to {stockIssue.available}
                    </button>
                  )}
                  <button
                    onClick={() => handleRemoveItem(item.sku)}
                    className="bg-red-500 text-white text-sm px-3 py-1 rounded-md hover:bg-red-600 flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Remove Item
                  </button>
                </div>
              </div>
            )}
            </div>
          );
        })}
      </div>
    </div>

    {/* Shipping Address */}
    <div className="mb-4">
      <h3 className="text-lg font-medium mb-2">Shipping Address</h3>
      <div className="border rounded-md p-4">
        <p>{shippingDetails.name}</p>
        <p>{shippingDetails.address}</p>
        <p>
          {shippingDetails.city}, {shippingDetails.state} {shippingDetails.pinCode}
        </p>
        <p>{shippingDetails.country}</p>
        <p className="mt-1">Phone: {shippingDetails.phoneNumber}</p>
      </div>
    </div>

    {/* Shipping Method */}
    {shippingDetails.shippingPartner && (
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-2">Shipping Method</h3>
        <div className="border rounded-md p-4">
          <p className="font-medium">{shippingDetails.shippingPartner.name}</p>
          <p className="text-gray-700">
            {shippingDetails.shippingPartner.cost > 0
              ? `₹${shippingDetails.shippingPartner.cost.toFixed(2)}`
              : 'Free Shipping'}
          </p>
        </div>
      </div>
    )}

    {/* Order Total */}
    <div className="border-t border-b py-4 mb-6">
      <div className="flex justify-between text-gray-700 mb-2">
        <span>Subtotal</span>
        <span>₹{cart.total.toFixed(2)}</span>
      </div>
      <div className="flex justify-between text-gray-700 mb-2">
        <span>Shipping</span>
        <span>
          {shippingDetails.shippingPartner
            ? shippingDetails.shippingPartner.cost > 0
              ? `₹${shippingDetails.shippingPartner.cost.toFixed(2)}`
              : 'Free'
            : '₹0.00'}
        </span>
      </div>
      <div className="flex justify-between font-bold text-lg mt-2 text-pink-600">
        <span>Total</span>
        <span>₹{calculateTotal().toFixed(2)}</span>
      </div>
    </div>

    {/* Payment Button Section */}
    // In the Payment section of your checkout drawer
<div className="flex justify-center mb-6">
  {stockIssues.length > 0 ? (
    // Show refresh button when there are stock issues
    <button
      onClick={async () => {
        try {
          setStockValidationInProgress(true);
          
          // Call the existing validateStock function
          const stockValidation = await validateStock();
          
          if (stockValidation.valid) {
            // Stock validation successful - clear issues
            setStockIssues([]);
            toast.success("All items are now in stock!", {
              position: "top-center",
              autoClose: 3000,
              className: 'custom-toast',
            });
          } else {
            // Stock validation still has issues
            setStockIssues(stockValidation.issues);
            toast.warning("Some items still have stock issues. Please review your cart.", {
              position: "top-center",
              autoClose: 3000,
              className: 'custom-toast',
            });
          }
        } catch (error) {
          console.error("Error validating stock:", error);
          toast.error("Failed to check stock availability. Please try again.", {
            position: "top-center",
            autoClose: 3000,
            className: 'custom-toast',
          });
        } finally {
          setStockValidationInProgress(false);
        }
      }}
      className="w-full flex items-center justify-center bg-green-600 hover:bg-green-700 text-white py-3 rounded-md text-lg transition-colors"
    >
      {stockValidationInProgress ? (
        <span className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
          Checking inventory...
        </span>
      ) : (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Verify Stock Availability
        </>
      )}
    </button>
  ) : (
    // Show payment button when there are no stock issues
    <button
      onClick={initiateRazorpayPayment}
      disabled={stockValidationInProgress}
      className={`w-full ${
        stockValidationInProgress
          ? 'bg-gray-400 cursor-not-allowed'
          : 'bg-pink-600 hover:bg-pink-700'
      } text-white py-3 rounded-md text-lg transition-colors`}
    >
      {stockValidationInProgress ? (
        <span className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
          Verifying...
        </span>
      ) : (
        `Pay ₹${calculateTotal().toFixed(2)}`
      )}
    </button>
  )}
</div>
  </div>
)}
    </div>
  );
};

export default CartPage;