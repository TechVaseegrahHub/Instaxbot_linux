import { useState, FormEvent } from 'react';
import { Plus, Minus, Save } from 'lucide-react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { Link } from "react-router-dom";

interface ProductType {
  title: string;
  payload: string;
}

const ProductTypeTemplate = () => {
  const [productTypes, setProductTypes] = useState<ProductType[]>([
    { title: '',  payload: '' }
  ]);

  const addProductType = () => {
    if (productTypes.length < 3) {
      setProductTypes([...productTypes, { title: '',  payload: '' }]);
    }
  };

  const removeProductType = (index: number) => {
    if (productTypes.length > 1) {
      const newTypes = productTypes.filter((_, i) => i !== index);
      setProductTypes(newTypes);
    }
  };

  const updateProductType = (index: number, field: keyof ProductType, value: string) => {
    const newTypes = [...productTypes];
    newTypes[index] = { ...newTypes[index], [field]: value };
    
    if (field === 'title') {
      newTypes[index].payload = `${value.toUpperCase().replace(/\s+/g, '_')}_CATEGORY`;
    }
    
    setProductTypes(newTypes);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (productTypes.some(type => !type.title.trim())) {
      Swal.fire({
        icon: "error",
        title: "Empty Fields",
        text: "Please fill in all required fields before saving.",
      });
      return;
    }

    try {
      const tenentId = localStorage.getItem('tenentid');
      
      const response = await axios.post(`https://app.instaxbot.com/api/templatesroute/product-type`, {
        tenentId,
        productTypes
      });

      if (response.data) {
        Swal.fire({
          icon: "success",
          title: "Success",
          text: "Product types saved successfully!",
        });
        setProductTypes([{
          title: '',
          payload: ''
        }]);
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Save Failed",
        text: "Failed to save product types. Please try again.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center -mt-16 md:-mt-16 p-4 md:p-0">
      <Link
        to="/ecommerce-product-template"
        className="absolute top-24 left-4 md:top-20 md:left-[17rem] px-3 md:px-6 py-1 md:py-2 bg-pink text-black-700 border border-pink-400 rounded-lg font-semibold hover:bg-pink-100 focus:outline-none focus:ring-2 focus:ring-pink-300 transition-all duration-300 text-sm md:text-base"
      >
        ← Back
      </Link>
    
      <div className="relative w-full max-w-2xl p-4 md:p-8 bg-white/80 shadow-lg border border-gray-100 backdrop-blur-xl rounded-xl mt-10 md:mt-0">
        <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl md:text-2xl font-bold text-gray-800">Product Types</h2>
            {productTypes.length < 3 && (
              <button
                type="button"
                onClick={addProductType}
                className="flex items-center gap-1 md:gap-2 px-3 md:px-4 py-1 md:py-2 bg-pink border border-pink-400 text-black-700 rounded-lg hover:bg-pink-300 transition-all duration-300 text-sm md:text-base"
              >
                <Plus size={16} />
                Add Type
              </button>
            )}
          </div>
    
          {productTypes.map((type, index) => (
            <div key={index} className="space-y-3 md:space-y-4 p-3 md:p-6 bg-white border border-gray-200 shadow-sm rounded-lg">
              <div className="flex justify-between items-center">
                <h3 className="text-base md:text-lg font-semibold text-gray-800">Product Type {index + 1}</h3>
                {productTypes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeProductType(index)}
                    className="text-gray-500 hover:text-red-500 transition-colors"
                  >
                    <Minus size={18} className="md:w-5 md:h-5" />
                  </button>
                )}
              </div>
    
             <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-12">
              <div className="flex flex-col space-y-6"> {/* Add vertical spacing between title and payload */}
                {/* Title Field */}
                <div>
                  <label className="block text-md md:text-md font-medium text-black mb-1 md:mb-2">Title</label>
                  <input
                    required
                    value={type.title}
                    onChange={(e) => updateProductType(index, 'title', e.target.value)}
                    placeholder="e.g. Electronics"
                    className="w-full px-3 md:px-4 py-2 border border-pink-300 rounded-md bg-pink text-black-800 placeholder-black-400 focus:outline-none focus:ring-2 focus:ring-pink-400"
                  />
                </div>

                {/* Payload Field */}
                <div className="md:w-[550px]">
                  <label className="block text-md md:text-md font-medium text-black mb-1 md:mb-2">Payload</label>
                  <input
                    required
                    value={type.payload}
                    onChange={(e) => updateProductType(index, 'payload', e.target.value)}
                    placeholder="e.g. ELECTRONICS_CATEGORY"
                    className="w-full px-4 py-2 border border-pink-300 rounded-md bg-pink text-black-800 placeholder-black-400 focus:outline-none focus:ring-2 focus:ring-pink-400"
                  />
                </div>
              </div>
            </div>
           </div>
            ))}
          <button
            type="submit"
            className="w-full px-4 md:px-8 py-3 md:py-4 bg-gradient-to-r from-pink-500 to-pink-400 text-white rounded-lg text-base md:text-lg font-semibold hover:from-pink-600 hover:to-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-300 transition-all duration-300 flex items-center justify-center gap-2"
          >
            <Save size={18} className="md:w-5 md:h-5" />
            Save Product Types
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProductTypeTemplate;