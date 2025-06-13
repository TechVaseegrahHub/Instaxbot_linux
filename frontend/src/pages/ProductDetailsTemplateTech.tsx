import { useState, FormEvent, useEffect } from 'react';
import { Plus, Minus, Save, Link as LinkIcon, Image, ArrowLeft } from 'lucide-react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { Link } from "react-router-dom";

interface ProductUnit {
  unit: string;
  price: string;
}

interface ProductDetailsTemplateProps {
  productName?: string;
  initialData?: ProductDetail;
}

interface ProductDetail {
  productName: string;
  units: ProductUnit[];
  websiteLink: string;
  sku?: string;  // Changed from productId to sku
  productPhoto: File | null;
  productPhotoUrl?: string;
  productPhotoPreview: string;
  isExternalImage?: boolean;
}

const ProductDetailsTemplate: React.FC<ProductDetailsTemplateProps> = ({
  initialData
}) => {
  const [products, setProducts] = useState<ProductDetail[]>([
    initialData || {
      productName: '',
      sku: '',  // Changed from productId to sku
      units: [{ unit: '', price: '' }],
      websiteLink: '',
      productPhoto: null,
      productPhotoPreview: ''
    }
  ]);
  
  // Add state to detect mobile view
  const [isMobileView, setIsMobileView] = useState(false);
  
  // Add effect to detect mobile screen size
  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    
    // Set initial value
    handleResize();
    
    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const addProduct = () => {
    setProducts([...products, {
      productName: '',
      sku: '',  // Changed from productId to sku
      units: [{ unit: '', price: '' }],
      websiteLink: '',
      productPhoto: null,
      productPhotoPreview: '',
      isExternalImage: false
    }]);
  };

  const removeProduct = (productIndex: number) => {
    if (products.length > 1) {
      const newProducts = products.filter((_, i) => i !== productIndex);
      setProducts(newProducts);
    }
  };

  const addUnit = (productIndex: number) => {
    const newProducts = [...products];
    newProducts[productIndex].units.push({ unit: '', price: '' });
    setProducts(newProducts);
  };

  const removeUnit = (productIndex: number, unitIndex: number) => {
    if (products[productIndex].units.length > 1) {
      const newProducts = [...products];
      newProducts[productIndex].units = newProducts[productIndex].units.filter((_, i) => i !== unitIndex);
      setProducts(newProducts);
    }
  };

  const handlePhotoChange = (productIndex: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const newProducts = [...products];
      newProducts[productIndex].productPhoto = file;
      newProducts[productIndex].productPhotoUrl = undefined;
      newProducts[productIndex].isExternalImage = false;
      newProducts[productIndex].productPhotoPreview = URL.createObjectURL(file);
      setProducts(newProducts);
    }
  };

  const handleImageUrlInput = (productIndex: number, url: string) => {
    const newProducts = [...products];
    newProducts[productIndex].productPhoto = null;
    newProducts[productIndex].productPhotoUrl = url;
    newProducts[productIndex].isExternalImage = true;
    newProducts[productIndex].productPhotoPreview = url;
    setProducts(newProducts);
  };

  const updateProduct = (productIndex: number, field: keyof ProductDetail, value: any) => {
    const newProducts = [...products];
    newProducts[productIndex] = { ...newProducts[productIndex], [field]: value };
    setProducts(newProducts);
  };

  const updateUnit = (productIndex: number, unitIndex: number, field: keyof ProductUnit, value: string) => {
    const newProducts = [...products];
    newProducts[productIndex].units[unitIndex] = {
      ...newProducts[productIndex].units[unitIndex],
      [field]: value
    };
    setProducts(newProducts);
  };

  const prepareFormData = () => {
    const formData = new FormData();
    const tenentId = localStorage.getItem('tenentid');
    formData.append('tenentId', tenentId || '');

    // Convert products array to string to preserve structure
    const productsData = products.map(product => ({
      productName: product.productName,
      ...(product.sku && { sku: product.sku }), // Use sku directly now
      websiteLink: product.websiteLink,
      units: product.units,
      productPhotoUrl: product.isExternalImage ? product.productPhotoUrl : undefined
    }));

    formData.append('products', JSON.stringify(productsData));

    // Append files separately
    products.forEach((product, index) => {
      if (!product.isExternalImage && product.productPhoto) {
        formData.append(`products[${index}][productPhoto]`, product.productPhoto);
      }
    });

    return formData;
  };

  const validateProducts = () => {
    return products.some(product =>
      !product.productName.trim() ||
      !product.websiteLink.trim() ||
      (!product.productPhoto && !product.productPhotoUrl) ||
      product.units.some(unit => !unit.unit.trim() || !unit.price.trim())
    );
  };

  const handleUpdate = async () => {
    try {
      // Validate required fields
      if (validateProducts()) {
        Swal.fire({
          icon: "error",
          title: "Empty Fields",
          text: "Please fill in all required fields before updating.",
        });
        return;
      }

      const formData = prepareFormData();
      const response = await axios.post(
        'https://app.instaxbot.com/api/templatesroute/product-details/update',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data) {
        Swal.fire({
          icon: "success",
          title: "Success",
          text: "Product details updated successfully!",
        });

        // Reset the form after successful update
        setProducts([{
          productName: '',
          sku: '',  // Changed from productId to sku
          units: [{ unit: '', price: '' }],
          websiteLink: '',
          productPhoto: null,
          productPhotoPreview: '',
          productPhotoUrl: '',
          isExternalImage: false
        }]);
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Update Failed",
        text: "Failed to update product details. Please try again.",
      });
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (validateProducts()) {
      Swal.fire({
        icon: "error",
        title: "Empty Fields",
        text: "Please fill in all required fields before saving.",
      });
      return;
    }

    try {
      const formData = prepareFormData();
      const response = await axios.post(
        'https://app.instaxbot.com/api/templatesroute/product-details', 
        formData, 
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data) {
        Swal.fire({
          icon: "success",
          title: "Success",
          text: "Product details saved successfully!",
        });
        setProducts([{
          productName: '',
          sku: '',  // Changed from productId to sku
          units: [{ unit: '', price: '' }],
          websiteLink: '',
          productPhoto: null,
          productPhotoPreview: '',
          productPhotoUrl: '',
          isExternalImage: false
        }]);
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Save Failed",
        text: "Failed to save product details. Please try again.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-start py-2 px-3">
      <div className={`w-full ${isMobileView ? 'max-w-sm' : 'max-w-4xl'}`}>
        {isMobileView && (
          <div className="mb-2 w-full flex justify-start">
            <Link
              to="/tech-product-template"
              className="absolute top-24 left-4 md:top-20 md:left-[17rem] px-3 py-1.5 md:px-4 md:py-2 bg-white text-pink-600 rounded-md font-medium hover:bg-pink-50 shadow-sm transition-all duration-300 flex items-center gap-1 md:gap-2 border border-pink-200 text-sm md:text-base"
            >
              <ArrowLeft size={14} /> Back
            </Link>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
         <div className="bg-white mt-24 rounded-lg shadow-md p-3 sm:p-6 border border-pink-100">
            <div className="flex justify-between items-center border-b border-pink-100 pb-2 mb-3">
              <h2 className="text-lg sm:text-2xl font-bold text-gray-800">Product Details</h2>
              {isMobileView ? (
                <button
                  type="button"
                  onClick={addProduct}
                  className="flex items-center justify-center w-7 h-7 bg-pink-600 text-white rounded-full shadow-md hover:bg-pink-700 transition-all duration-300"
                >
                  <Plus size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={addProduct}
                  className="flex items-center gap-2 px-3 py-1.5 bg-pink-600 text-white rounded-md text-base shadow-md hover:bg-pink-700 transition-all duration-300"
                >
                  <Plus size={16} />
                  Add Product
                </button>
              )}
            </div>

            {products.map((product, productIndex) => (
              <div key={productIndex} className="space-y-3 sm:space-y-5 p-3 sm:p-5 bg-white border border-pink-100 rounded-lg shadow-sm mb-3 sm:mb-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-base sm:text-xl font-semibold text-gray-800e">Product {productIndex + 1}</h3>
                  {products.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeProduct(productIndex)}
                      className="text-gray-400 hover:text-pink-600 transition-colors p-1 rounded-full hover:bg-pink-50"
                    >
                      <Minus size={isMobileView ? 16 : 20} />
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-gray-700 text-sm sm:text-base font-medium mb-1">Product Name</label>
                  <input
                    required
                    value={product.productName}
                    onChange={(e) => updateProduct(productIndex, 'productName', e.target.value)}
                    placeholder="e.g. Face Cream"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-800 text-sm placeholder-gray-400 focus:ring-2 focus:border-pink-500 focus:outline-none focus:ring-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 text-sm sm:text-base font-medium mb-1">SKU (Optional)</label>
                  <input
                    value={product.sku || ''}
                    onChange={(e) => updateProduct(productIndex, 'sku', e.target.value)}
                    placeholder="e.g. PROD-123"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-800 text-sm placeholder-gray-400 focus:ring-2 focus:border-pink-500 focus:outline-none focus:ring-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 text-sm sm:text-base font-medium mb-1">Website Link</label>
                  <div className="relative">
                    <input
                      required
                      value={product.websiteLink}
                      onChange={(e) => updateProduct(productIndex, 'websiteLink', e.target.value)}
                      placeholder="https://example.com/product"
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md bg-white text-gray-800 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                    />
                    <LinkIcon className="absolute left-3 top-2.5 text-pink-400" size={16} />
                  </div>
                </div>

                <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-gray-700 text-sm sm:text-base font-medium">Units & Prices</label>
                  <button
                    type="button"
                    onClick={() => addUnit(productIndex)}
                    className="text-gray-400 hover:text-pink-600 transition-colors p-1 rounded-full hover:bg-pink-50"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                {product.units.map((unit, unitIndex) => (
                  <div key={unitIndex} className="flex gap-2 items-center">
                    <div className="flex-1 min-w-0"> {/* Added container with min-width */}
                      <input
                        required
                        value={unit.unit}
                        onChange={(e) => updateUnit(productIndex, unitIndex, 'unit', e.target.value)}
                        placeholder="e.g. 100ml"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-800 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                      />
                    </div>
                    <div className="flex-1 min-w-0"> {/* Added container with min-width */}
                      <input
                        required
                        type="text"
                        value={unit.price}
                        onChange={(e) => {
                          const inputValue = e.target.value;
                          if (!inputValue) {
                            updateUnit(productIndex, unitIndex, 'price', '');
                            return;
                          }
                          const valueWithoutSymbol = inputValue.replace(/₹/g, '');
                          const priceWithSymbol = `${valueWithoutSymbol}`;
                          updateUnit(productIndex, unitIndex, 'price', priceWithSymbol);
                        }}
                        placeholder="₹0.00"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-800 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                      />
                    </div>
                    {product.units.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeUnit(productIndex, unitIndex)}
                        className="text-gray-400 hover:text-pink-600 transition-colors p-1 rounded-full hover:bg-pink-50 flex-shrink-0"
                      >
                        <Minus size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
                <div>
                  <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1">Product Photo</label>
                  <div className="flex flex-col">
                    <label className="cursor-pointer mb-2">
                      <div className="relative">
                        {product.productPhotoPreview ? (
                          <img
                            src={product.productPhotoPreview}
                            alt="Product preview"
                            className="w-full h-32 object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-full h-32 border-2 border-dashed border-pink-200 rounded-md flex items-center justify-center bg-pink-50">
                            <Image className="text-pink-400" size={36} />
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handlePhotoChange(productIndex, e)}
                          className="hidden"
                        />
                      </div>
                    </label>
                    <input
                      type="text"
                      placeholder="Or enter image URL"
                      value={product.productPhotoUrl || ''}
                      onChange={(e) => handleImageUrlInput(productIndex, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-800 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-lg shadow-md p-0 sm:p-6 border border-pink-100">
            {isMobileView ? (
              <button
                type="submit"
                className="w-full p-3 bg-pink-600 text-white rounded-lg text-sm font-medium hover:bg-pink-700 focus:outline-none transition-all duration-300 flex items-center justify-center"
              >
                <Save size={14} className="mr-1" />
                Save Product
              </button>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3 p-6">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-pink-600 text-white rounded-md font-medium hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 transition-all duration-300 flex items-center justify-center gap-2 shadow-sm"
                >
                  <Save size={16} />
                  Save Product Details
                </button>

                <button
                  type="button"
                  onClick={handleUpdate}
                  className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-800 rounded-md font-medium hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 transition-all duration-300 flex items-center justify-center gap-2 shadow-sm"
                >
                  <Save size={16} />
                  Update Product Details
                </button>
              </div>
            )}
          </div>
        </form>
        
        {!isMobileView && (
          <Link
            to="/tech-product-template"
            className="absolute top-20 left-[17rem] px-4 py-2 bg-white text-pink-600 rounded-md font-medium hover:bg-pink-50 shadow-sm transition-all duration-300 flex items-center gap-2 border border-pink-200"
          >
            ← Back
          </Link>
        )}
      </div>
    </div>
  );
};

export default ProductDetailsTemplate;