import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Define types for better TypeScript support
interface Product {
  name: string;
  sku: string;
  quantity: number;
  image: string; // Changed to string type for direct URL
}

// Create a custom loader component
const CustomLoader: React.FC = () => (
  <div className="flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
  </div>
);

const Packing: React.FC = () => {
  const [orderNumber, setOrderNumber] = useState<string>('');
  const [products, setProducts] = useState<Product[]>([]);
  const [skuInput, setSkuInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [customerNote, setCustomerNote] = useState<string>('');
  const [verifiedSkus, setVerifiedSkus] = useState<string[]>([]);
  const [productsFetched, setProductsFetched] = useState<boolean>(false);
  
  const skuInputRef = useRef<HTMLInputElement>(null);
  const orderInputRef = useRef<HTMLInputElement>(null);
  
  const apiBaseUrl = 'https://app.instaxbot.com';

  // Simplified useEffect - focus on order input when component mounts
  useEffect(() => {
    console.log('Component mounted, focusing on order input');
    if (orderInputRef.current) {
      orderInputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    console.log('Products updated:', products);
    console.log('Customer Note updated:', customerNote);
    if (products.length > 0 && skuInputRef.current) {
      skuInputRef.current.focus();
    }
  }, [products, customerNote]);

  const fetchProducts = async (): Promise<void> => {
    setLoading(true);
    setProductsFetched(false);
    
    const tenentId = localStorage.getItem('tenentid');
    if (!tenentId) {
      toast.error('Tenant ID not found. Please log in again.');
      setLoading(false);
      return;
    }
    
    try {
      // Use JSON data instead of FormData
      const response = await axios.post(
        `${apiBaseUrl}/api/packingroute/fetch-products/${orderNumber}`,
        { tenentId },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      
      console.log('API Response:', response.data);
      setProducts(response.data.products || []);
      setCustomerNote(response.data.customerNote || '');
      setVerifiedSkus([]);
      setProductsFetched(true);
      toast.success('Products fetched successfully');
    } catch (error: any) {
      console.error('Error fetching data:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
        console.error('Error status:', error.response.status);
        console.error('Error headers:', error.response.headers);
      } else if (error.request) {
        console.error('Error request:', error.request);
      } else {
        console.error('Error message:', error.message);
      }
      toast.error('Error fetching data. Please try again later.');
      setProducts([]);
      setCustomerNote('');
    } finally {
      setLoading(false);
    }
  };

  const handleFetchClick = (): void => {
    if (orderNumber) {
      fetchProducts();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' && orderNumber) {
      fetchProducts();
    }
  };

  const handleSkuSubmit = (): void => {
    if (!skuInput) {
      return;
    }

    const productIndex = products.findIndex((product) => product.sku === skuInput);
    console.log(`Verifying SKU: ${skuInput}, Product Index: ${productIndex}`);

    if (productIndex !== -1) {
      const updatedProducts = [...products];
      const currentQuantity = updatedProducts[productIndex].quantity;

      if (currentQuantity > 1) {
        updatedProducts[productIndex].quantity -= 1;
      } else {
        updatedProducts.splice(productIndex, 1);
      }

      setProducts(updatedProducts);
      setVerifiedSkus([...verifiedSkus, skuInput]);

      if (updatedProducts.length === 0) {
        submitAllVerifiedSkus([...verifiedSkus, skuInput]);
      } 
    } else {
      toast.error('Wrong product');
    }

    setSkuInput('');
    if (skuInputRef.current) {
      skuInputRef.current.focus();
    }
  };

  const submitAllVerifiedSkus = async (allVerifiedSkus: string[]): Promise<void> => {
    const tenentId = localStorage.getItem('tenentid');
    if (!tenentId) {
      toast.error('Tenant ID not found. Please log in again.');
      return;
    }
    
    try {
      setLoading(true);
      
      // Use JSON data instead of FormData
      await axios.post(
        `${apiBaseUrl}/api/packingroute/verify-sku/${orderNumber}`,
        { 
          tenentId,
          skuInputs: allVerifiedSkus 
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      
      toast.success('All products are verified and packed successfully');
      setOrderNumber('');
      setSkuInput('');
      setProducts([]);
      setVerifiedSkus([]);
      setCustomerNote('');
      if (orderInputRef.current) {
        orderInputRef.current.focus();
      }
    } catch (error: any) {
      console.error('Error verifying SKU:', error);
      toast.error('Error verifying SKU. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkuKeyPress = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      handleSkuSubmit();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4" style={{ backgroundColor: '#f7f7f7' }}>
      {/* Main Content Container - Centers everything */}
      <div className="w-full max-w-md flex flex-col items-center">
        {/* Welcome Box */}
        <div className="bg-white shadow px-3 py-5 text-center rounded-xl mb-4 w-full">
          <h1 className="text-2xl font-bold text-black-800">Welcome InstaxBot</h1>
        </div>
        
        <ToastContainer />
        
        {/* Order Input Box */}
        <div className="bg-white shadow rounded-xl p-8 mb-6 w-full">
          <div className="flex flex-col gap-5">
            <div className="flex items-center w-full">
              <h2 className="text-lg font-bold text-gray-800 mr-3 whitespace-nowrap">Enter Order Number</h2>
              <input
                type="text"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                onKeyPress={handleKeyPress}
                className="border rounded-sm p-3 flex-grow text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-400 shadow-md"
                placeholder="Order Number"
                ref={orderInputRef}
              />
            </div>
            
            {/* Centered Fetch Button */}
            <div className="flex justify-center mt-3">
              <button
                onClick={handleFetchClick}
                className="bg-white text-black px-8 py-3 rounded-sm hover:bg-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-400 border-2 border-pink-400 shadow-md transition duration-400 font-medium text-lg"
              >
                Fetch Product
              </button>
            </div>
          </div>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <CustomLoader />
          </div>
        ) : (
          <div className="flex flex-col items-center w-full">
            {customerNote && (
              <div className="mb-5 p-4 bg-yellow-100 rounded-xl w-full shadow-md">
                <h3 className="font-bold text-lg mb-2">Customer Note:</h3>
                <p className="text-gray-800">{customerNote}</p>
              </div>
            )}
            
            {products.length > 0 && (
              <div className="w-full bg-white shadow-lg rounded-xl overflow-hidden mb-6">
                <table className="min-w-full">
                  <thead className="bg-blue-600 text-white">
                    <tr>
                      <th className="py-3 px-4 text-left">Name</th>
                      <th className="py-3 px-4">Image</th>
                      <th className="py-3 px-4">Quantity</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-800">
                    {products.map((product, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">{product.name}</td>
                        <td className="py-3 px-4 text-center">
                          {product.image ? (
                            <img
                              src={product.image}
                              alt={product.name}
                              className="max-w-[100px] max-h-[100px] mx-auto"
                            />
                          ) : (
                            <div className="w-[100px] h-[100px] bg-gray-200 flex items-center justify-center mx-auto">
                              No image
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">{product.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {products.length > 0 && (
              <div className="mt-4 flex flex-col items-center w-full">
                <input
                  type="text"
                  value={skuInput}
                  onChange={(e) => setSkuInput(e.target.value)}
                  onKeyPress={handleSkuKeyPress}
                  className="border rounded-xl p-3 w-full text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 shadow-md"
                  placeholder="Enter SKU"
                  ref={skuInputRef}
                />
                <button
                  onClick={handleSkuSubmit}
                  className="bg-green-500 text-white px-6 py-3 rounded-xl mt-3 w-full md:w-1/2 hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 shadow-md transition duration-300"
                >
                  Submit SKU
                </button>
              </div>
            )}
            {productsFetched && products.length === 0 && (
              <div className="text-center p-8 bg-white rounded-xl shadow-md w-full">
                <p className="text-xl text-gray-600">All products have been packed!</p>
                <p className="text-gray-500 mt-2">You can enter a new order number above.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Packing;