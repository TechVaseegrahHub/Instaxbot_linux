import { useState } from 'react';
import { Plus, Minus, Save } from 'lucide-react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { Link } from "react-router-dom";

interface ProductDetails {
  productName: string;
  productType: string;
  payload: string;
}

const ProductDetailsInput = () => {
  const [products, setProducts] = useState<ProductDetails[]>([
    { productName: '', productType: '', payload: '' }
  ]);

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
    setProducts(newProducts);
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
      const response = await axios.post('https://8def-2401-4900-8827-18db-d531-34b1-a4f4-2ef9.ngrok-free.app/api/urlconfiguration/product-list', {
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
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Save Failed",
        text: "Failed to save product list. Please try again.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4 sm:px-0">
      <Link
        to="/tech-product-template"
        className="fixed sm:absolute top-24 left-4 sm:top-20 sm:left-[17rem] px-6 py-2 bg-white text-pink-500 border-2 border-pink-500 rounded-full font-semibold hover:bg-pink-500 hover:text-white transition-all duration-300 z-10"
      >
        ← Back
      </Link>

      {/* Added top margin on mobile only */}
      <div className="w-full max-w-4xl mt-20 md:mt-0">
        <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
          <div className="bg-white rounded-lg shadow-md p-4 md:p-6 border border-pink-100">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center border-b border-pink-100 pb-4 mb-4 gap-3">
              <h2 className="text-xl md:text-2xl font-bold text-gray-800">Product Details</h2>
              <button
                type="button"
                onClick={addProduct}
                className="flex items-center justify-center gap-1 md:gap-2 px-3 py-1.5 bg-pink-600 text-white rounded-md text-sm md:text-base shadow-md hover:bg-pink-700 transition-all duration-300 w-full md:w-auto"
              >
                <Plus size={16} />
                Add Product
              </button>
            </div>
            </div>

          {products.map((product, index) => (
            <div key={index} className="space-y-4 p-4 sm:p-6 border border-pink-200 bg-pink-50 rounded-lg">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-gray-700 font-[Poppins]">Product {index + 1}</h3>
                {products.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeProduct(index)}
                    className="text-pink-500 hover:text-red-600 transition-colors"
                  >
                    <Minus size={20} />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">Product Name</label>
                  <input
                    required
                    value={product.productName}
                    onChange={(e) => updateProduct(index, 'productName', e.target.value)}
                    placeholder="Enter product name"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-300"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">Product Type</label>
                  <input
                    required
                    value={product.productType}
                    onChange={(e) => updateProduct(index, 'productType', e.target.value)}
                    placeholder="Enter product type"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-300"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">Payload</label>
                  <input
                    required
                    value={product.payload}
                    onChange={(e) => updateProduct(index, 'payload', e.target.value)}
                    placeholder="Enter payload"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-300"
                  />
                </div>
              </div>
            </div>
          ))}

          <button
            type="submit"
            className="w-full px-8 py-4 bg-pink-500 text-white rounded-full text-lg font-semibold hover:bg-pink-600 focus:outline-none focus:ring-2 focus:ring-pink-300 transition-all duration-300 flex items-center justify-center gap-2"
          >
            <Save size={20} />
            Save Products
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProductDetailsInput;