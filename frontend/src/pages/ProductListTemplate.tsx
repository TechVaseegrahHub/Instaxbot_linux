import { useState, useEffect } from 'react';
import { Plus, Minus, Save, RefreshCw } from 'lucide-react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { Link } from "react-router-dom";

interface ProductDetails {
  productName: string;
  productType: string;
  payload: string;
}

interface ProductType {
  title: string;
  payload: string;
}

const ProductDetailsInput = () => {
  const [products, setProducts] = useState<ProductDetails[]>([
    { productName: '', productType: '', payload: '' }
  ]);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);
  const [typesFetchError, setTypesFetchError] = useState<string | null>(null);

  // Function to fetch product types - moved out of useEffect for reusability
  const fetchProductTypes = async () => {
    setLoading(true);
    setTypesFetchError(null);
    try {
      const tenentId = localStorage.getItem('tenentid');
      if (!tenentId) {
        throw new Error('Tenant ID not found in localStorage');
      }
      
      console.log('Fetching product types with tenant ID:', tenentId);
      
      // Updated to use the new POST endpoint
      const response = await axios.post('https://8def-2401-4900-8827-18db-d531-34b1-a4f4-2ef9.ngrok-free.app/api/templatesroute/Product-type-list', {
        tenentId
      });
      
      console.log('Product types API response:', response.data);
      
      // Update response data handling to match the new endpoint structure
      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        setProductTypes(response.data.data);
        console.log('Product types loaded:', response.data.data.length);
      } else {
        // If no product types found, set empty array
        setProductTypes([]);
        setTypesFetchError('No product types found or invalid response format');
        console.log('No product types found or invalid response format');
      }
    } catch (error: any) {
      console.error("Failed to fetch product types:", error);
      setTypesFetchError(error.message || 'Unknown error occurred');
      if (error.response) {
        console.error('Error response:', error.response.data);
      }
      if (error.response?.status === 404) {
        // No product types found is not an error to show to the user
        setProductTypes([]);
      } else {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: `Failed to load product types: ${error.message}`,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch product types when component mounts
  useEffect(() => {
    fetchProductTypes();
  }, []);

  const addProduct = () => {
    setProducts([...products, { productName: '', productType: '', payload: '' }]);
  };

  const removeProduct = (index: number) => {
    if (products.length > 1) {
      const newProducts = products.filter((_, i) => i !== index);
      setProducts(newProducts);
    }
  };

  const updateProduct = (index: number, field: keyof ProductDetails, value: string) => {
    const newProducts = [...products];
    newProducts[index] = { ...newProducts[index], [field]: value };
    
    // Auto-generate payload when product name changes
    if (field === 'productName') {
      newProducts[index].payload = `${value.toUpperCase().replace(/\s+/g, '_')}_PRODUCT`;
    }
    
    setProducts(newProducts);
  };

  const handleProductTypeClick = () => {
    // If there are no product types or there was an error, try fetching again
    if (productTypes.length === 0 || typesFetchError) {
      fetchProductTypes();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (products.some(product => 
      !product.productName.trim() || 
      !product.productType.trim() || 
      !product.payload.trim()
    )) {
      Swal.fire({
        icon: "error",
        title: "Empty Fields",
        text: "Please fill in all required fields before saving.",
      });
      return;
    }

    try {
      const tenentId = localStorage.getItem('tenentid');
      const response = await axios.post('https://8def-2401-4900-8827-18db-d531-34b1-a4f4-2ef9.ngrok-free.app/api/templatesroute/product-list', {
        tenentId,
        products
      });

      if (response.data) {
        Swal.fire({
          icon: "success",
          title: "Success",
          text: "Product list saved successfully!",
        });
        setProducts([{ productName: '', productType: '', payload: '' }]);
      }
    } catch (error: any) {
      console.error("Failed to save products:", error);
      Swal.fire({
        icon: "error",
        title: "Save Failed",
        text: `Failed to save product list: ${error.message}`,
      });
    }
  };

  if (loading && productTypes.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-xl font-medium text-gray-600">Loading product types...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-6 md:py-12 px-4 md:px-0">
      <Link
        to="/ecommerce-product-template"
        className="absolute top-24 md:top-20 left-4 md:left-[17rem] px-3 md:px-6 py-1 md:py-2 bg-white text-black-500 border-2 border-pink-300 rounded-lg font-semibold hover:bg-pink-200 hover:text-black transition-all duration-300 text-sm md:text-base"
      >
        ← Back 
      </Link>
  
      <div className="relative md:top-24 w-full max-w-2xl p-4 md:p-6 lg:p-10 bg-white shadow-lg rounded-xl mt-10 md:mt-0">
        <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-black-500 font-[Poppins]">Product List</h2>
            <button 
              type="button" 
              onClick={addProduct}
              className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-1 md:py-2 bg-pink-100 text-black-700 border border-pink-300 rounded-lg hover:bg-pink-200 transition-all duration-300 text-sm md:text-base"
            >
              <Plus size={16} />
              <span>Add Product</span>
            </button>
          </div>
  
          {products.map((product, index) => (
            <div key={index} className="space-y-3 md:space-y-4 p-3 md:p-4 lg:p-6 border border-pink-200 bg-pink-50 rounded-lg">
              <div className="flex justify-between items-center">
                <h3 className="text-base md:text-lg lg:text-xl font-semibold text-gray-700 font-[Poppins]">Product {index + 1}</h3>
                {products.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeProduct(index)}
                    className="text-pink-500 hover:text-red-600 transition-colors"
                  >
                    <Minus size={18} className="md:w-5 md:h-5" />
                  </button>
                )}
              </div>
  
              <div className="grid grid-cols-1 gap-3 md:gap-4">
                <div>
                  <label className="block text-gray-700 text-xs md:text-sm font-medium mb-1 md:mb-2">Product Name</label>
                  <input
                    required
                    value={product.productName}
                    onChange={(e) => updateProduct(index, 'productName', e.target.value)}
                    placeholder="Enter product name"
                    className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg bg-white text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-300"
                  />
                </div>
  
                <div>
                  <label className="block text-gray-700 text-xs md:text-sm font-medium mb-1 md:mb-2">
                    Product Type
                    {loading && productTypes.length > 0 && (
                      <span className="ml-2 inline-block animate-spin text-pink-500">
                        <RefreshCw size={14} />
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <select
                      required
                      value={product.productType}
                      onChange={(e) => updateProduct(index, 'productType', e.target.value)}
                      onClick={handleProductTypeClick}
                      className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg bg-white text-black focus:outline-none focus:ring-2 focus:ring-pink-300"
                    >
                      <option value="">Select a product type</option>
                      {productTypes.length > 0 ? (
                        productTypes.map((type, i) => (
                          <option key={i} value={type.title}>
                            {type.title}
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>
                          {typesFetchError ? 'Error loading types - click to retry' : 'No product types available'}
                        </option>
                      )}
                    </select>
                    {productTypes.length === 0 && !loading && (
                      <button
                        type="button"
                        onClick={fetchProductTypes}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-pink-500 hover:text-pink-700"
                        title="Refresh product types"
                      >
                        <RefreshCw size={18} />
                      </button>
                    )}
                  </div>
                  {typesFetchError && (
                    <p className="text-red-500 text-xs mt-1">
                      {typesFetchError} 
                      <button 
                        type="button"
                        onClick={fetchProductTypes}
                        className="ml-2 text-pink-500 underline hover:text-pink-700"
                      >
                        Retry
                      </button>
                    </p>
                  )}
                </div>
  
                <div>
                  <label className="block text-gray-700 text-xs md:text-sm font-medium mb-1 md:mb-2">Payload</label>
                  <input
                    required
                    value={product.payload}
                    onChange={(e) => updateProduct(index, 'payload', e.target.value)}
                    placeholder="Enter payload"
                    className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg bg-white text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-300"
                  />
                </div>
              </div>
            </div>
          ))}
  
          <button 
            type="submit" 
            className="w-full px-4 md:px-8 py-3 md:py-4 bg-pink-500 text-white rounded-lg text-base md:text-lg font-semibold hover:bg-pink-600 focus:outline-none focus:ring-2 focus:ring-pink-300 transition-all duration-300 flex items-center justify-center gap-2"
          >
            <Save size={18} className="md:w-5 md:h-5" />
            Save Products
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProductDetailsInput;