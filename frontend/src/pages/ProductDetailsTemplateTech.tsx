import { useState, FormEvent } from 'react';
import { Plus, Minus, Save, Link as LinkIcon, Image,ArrowLeft } from 'lucide-react';
import axios, { AxiosError } from 'axios';
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
  productDescription: string;
  units: ProductUnit[];
  websiteLink: string;
  sku?: string;
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
      productDescription: '',
      sku: '',
      units: [{ unit: '', price: '' }],
      websiteLink: '',
      productPhoto: null,
      productPhotoPreview: ''
    }
  ]);

  const addProduct = () => {
    setProducts([...products, {
      productName: '',
      productDescription: '',
      sku: '',
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
    
    console.log('🏢 Tenant ID:', tenentId);
    formData.append('tenentId', tenentId || '');

    // Convert products array to string to preserve structure
    const productsData = products.map(product => ({
      productName: product.productName,
      productDescription: product.productDescription,
      ...(product.sku && { sku: product.sku }),
      websiteLink: product.websiteLink,
      units: product.units,
      productPhotoUrl: product.isExternalImage ? product.productPhotoUrl : undefined
    }));

    console.log('📦 Products Data (JSON):', productsData);
    console.log('📦 Products Data (Stringified):', JSON.stringify(productsData));
    
    formData.append('products', JSON.stringify(productsData));

    // Append files separately
    products.forEach((product, index) => {
      if (!product.isExternalImage && product.productPhoto) {
        console.log(`📸 File for Product ${index}:`, {
          name: product.productPhoto.name,
          size: product.productPhoto.size,
          type: product.productPhoto.type,
          lastModified: product.productPhoto.lastModified
        });
        formData.append(`products[${index}][productPhoto]`, product.productPhoto);
      }
    });

    // Log all FormData entries
    console.log('📋 FormData entries:');
    for (let [key, value] of formData.entries()) {
      if (value instanceof File) {
        console.log(`  ${key}:`, {
          fileName: value.name,
          fileSize: value.size,
          fileType: value.type
        });
      } else {
        console.log(`  ${key}:`, value);
      }
    }

    return formData;
  };

  const validateProducts = () => {
    const hasEmptyFields = products.some(product =>
      !product.productName.trim() ||
      !product.websiteLink.trim() ||
      (!product.productPhoto && !product.productPhotoUrl) ||
      product.units.some(unit => !unit.unit.trim() || !unit.price.trim())
    );
    
    console.log('✅ Validation Result:', hasEmptyFields ? 'FAILED' : 'PASSED');
    
    if (hasEmptyFields) {
      console.log('❌ Validation Details:');
      products.forEach((product, index) => {
        console.log(`  Product ${index + 1}:`);
        console.log(`    - Product Name: ${product.productName.trim() ? '✓' : '✗ (empty)'}`);
        console.log(`    - Website Link: ${product.websiteLink.trim() ? '✓' : '✗ (empty)'}`);
        console.log(`    - Photo: ${(product.productPhoto || product.productPhotoUrl) ? '✓' : '✗ (missing)'}`);
        product.units.forEach((unit, unitIndex) => {
          console.log(`    - Unit ${unitIndex + 1}: ${unit.unit.trim() && unit.price.trim() ? '✓' : '✗ (empty)'}`);
        });
      });
    }
    
    return hasEmptyFields;
  };

  const handleUpdate = async () => {
    console.log('🔄 UPDATE OPERATION STARTED');
    console.log('📊 Current Products State:', products);
    
    try {
      // Validate required fields
      if (validateProducts()) {
        console.log('❌ Validation failed - stopping update');
        Swal.fire({
          icon: "error",
          title: "Empty Fields",
          text: "Please fill in all required fields before updating.",
        });
        return;
      }

      const formData = prepareFormData();
      
      console.log('🚀 Sending UPDATE request to backend...');
      console.log('🎯 API Endpoint:', 'https://ddcf6bc6761a.ngrok-free.app/api/templatesroute/product-details/update');
      
      const response = await axios.post(
        'https://ddcf6bc6761a.ngrok-free.app/api/templatesroute/product-details/update',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      console.log('✅ UPDATE Response:', response.data);
      console.log('📈 Response Status:', response.status);
      console.log('📋 Response Headers:', response.headers);

      if (response.data) {
        console.log('🎉 Update successful!');
        Swal.fire({
          icon: "success",
          title: "Success",
          text: "Product details updated successfully!",
        });

        // Reset the form after successful update
        setProducts([{
          productName: '',
          productDescription: '',
          sku: '',
          units: [{ unit: '', price: '' }],
          websiteLink: '',
          productPhoto: null,
          productPhotoPreview: '',
          productPhotoUrl: '',
          isExternalImage: false
        }]);
        console.log('🔄 Form reset after successful update');
      }
    } catch (error) {
      console.error('❌ UPDATE ERROR:', error);
      
      if (error instanceof AxiosError) {
        console.error('📋 Error Details:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          headers: error.response?.headers
        });
      } else {
        console.error('📋 Unknown Error:', error);
      }
      
      Swal.fire({
        icon: "error",
        title: "Update Failed",
        text: "Failed to update product details. Please try again.",
      });
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    console.log('💾 SAVE OPERATION STARTED');
    console.log('📊 Current Products State:', products);

    if (validateProducts()) {
      console.log('❌ Validation failed - stopping save');
      Swal.fire({
        icon: "error",
        title: "Empty Fields",
        text: "Please fill in all required fields before saving.",
      });
      return;
    }

    try {
      const formData = prepareFormData();
      
      console.log('🚀 Sending SAVE request to backend...');
      console.log('🎯 API Endpoint:', 'https://ddcf6bc6761a.ngrok-free.app/api/templatesroute/product-details');
      
      const response = await axios.post(
        'https://ddcf6bc6761a.ngrok-free.app/api/templatesroute/product-details', 
        formData, 
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      console.log('✅ SAVE Response:', response.data);
      console.log('📈 Response Status:', response.status);
      console.log('📋 Response Headers:', response.headers);

      if (response.data) {
        console.log('🎉 Save successful!');
        Swal.fire({
          icon: "success",
          title: "Success",
          text: "Product details saved successfully!",
        });
        
        setProducts([{
          productName: '',
          productDescription: '',
          sku: '',
          units: [{ unit: '', price: '' }],
          websiteLink: '',
          productPhoto: null,
          productPhotoPreview: '',
          productPhotoUrl: '',
          isExternalImage: false
        }]);
        console.log('🔄 Form reset after successful save');
      }
    } catch (error) {
      console.error('❌ SAVE ERROR:', error);
      
      if (error instanceof AxiosError) {
        console.error('📋 Error Details:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          headers: error.response?.headers
        });
      } else {
        console.error('📋 Unknown Error:', error);
      }
      
      Swal.fire({
        icon: "error",
        title: "Save Failed",
        text: "Failed to save product details. Please try again.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-8 px-4 w-full">
      <Link
              to="/tech-product-template"
              className="absolute top-24 left-4 md:top-20 md:left-[17rem] px-3 py-1.5 md:px-4 md:py-2 bg-white text-pink-600 rounded-md font-medium hover:bg-pink-50 shadow-sm transition-all duration-300 flex items-center gap-1 md:gap-2 border border-pink-200 text-sm md:text-base"
            >
              <ArrowLeft size={14} /> Back
            </Link>
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

            {products.map((product, productIndex) => (
              <div key={productIndex} className="space-y-4 p-3 md:p-5 bg-white border border-pink-100 rounded-lg shadow-sm mb-4 md:mb-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg md:text-xl font-semibold text-gray-800">Product {productIndex + 1}</h3>
                  {products.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeProduct(productIndex)}
                      className="text-gray-400 hover:text-pink-600 transition-colors p-1 rounded-full hover:bg-pink-50"
                    >
                      <Minus size={18} />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3 md:gap-4">
                  <div>
                    <label className="block text-gray-700 text-sm md:text-base font-medium mb-1 md:mb-2">Product Name</label>
                    <input
                      required
                      value={product.productName}
                      onChange={(e) => updateProduct(productIndex, 'productName', e.target.value)}
                      placeholder="e.g. Face Cream"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-800 placeholder-gray-400 focus:ring-2 focus:border-pink-500 focus:outline-none focus:ring-pink-500 text-sm md:text-base"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 text-sm md:text-base font-medium mb-1 md:mb-2">Product Description</label>
                    <textarea
                      value={product.productDescription}
                      onChange={(e) => updateProduct(productIndex, 'productDescription', e.target.value)}
                      placeholder="Describe your product features, benefits, and specifications..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-800 placeholder-gray-400 focus:ring-2 focus:border-pink-500 focus:outline-none focus:ring-pink-500 text-sm md:text-base resize-vertical"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 text-sm md:text-base font-medium mb-1 md:mb-2">SKU (Optional)</label>
                    <input
                      value={product.sku || ''}
                      onChange={(e) => updateProduct(productIndex, 'sku', e.target.value)}
                      placeholder="e.g. PROD-123"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-800 placeholder-gray-400 focus:ring-2 focus:border-pink-500 focus:outline-none focus:ring-pink-500 text-sm md:text-base"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 text-sm md:text-base font-medium mb-1 md:mb-2">Website Link</label>
                  <div className="relative">
                    <input
                      required
                      value={product.websiteLink}
                      onChange={(e) => updateProduct(productIndex, 'websiteLink', e.target.value)}
                      placeholder="https://example.com/product"
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-sm md:text-base"
                    />
                    <LinkIcon className="absolute left-3 top-2.5 text-pink-400" size={16} />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-gray-700 text-sm md:text-base font-medium">Units & Prices</label>
                    <button
                      type="button"
                      onClick={() => addUnit(productIndex)}
                      className="text-gray-400 hover:text-pink-600 transition-colors p-1 rounded-full hover:bg-pink-50"
                    >
                      <Plus size={16} />
                    </button>
                  </div>

                  {product.units.map((unit, unitIndex) => (
                    <div key={unitIndex} className="flex flex-col md:flex-row gap-2 md:gap-3 mb-2 md:items-center">
                      <input
                        required
                        value={unit.unit}
                        onChange={(e) => updateUnit(productIndex, unitIndex, 'unit', e.target.value)}
                        placeholder="e.g. 100ml"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-sm md:text-base"
                      />
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
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-sm md:text-base"
                      />
                      {product.units.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeUnit(productIndex, unitIndex)}
                          className="text-gray-400 hover:text-pink-600 transition-colors p-1 rounded-full hover:bg-pink-50 ml-auto md:ml-0"
                        >
                          <Minus size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-sm md:text-base font-medium text-gray-700 mb-1 md:mb-2">Product Photo</label>
                  <div className="flex flex-col md:flex-row md:items-start gap-3 md:gap-10">
                    <label className="cursor-pointer mb-2 md:mb-0">
                      <div className="relative">
                        {product.productPhotoPreview ? (
                          <img
                            src={product.productPhotoPreview}
                            alt="Product preview"
                            className="w-24 h-24 md:w-32 md:h-32 object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-24 h-24 md:w-32 md:h-32 border-2 border-dashed border-pink-200 rounded-md flex items-center justify-center bg-pink-50">
                            <Image className="text-pink-400" size={24} />
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
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Or enter image URL"
                        value={product.productPhotoUrl || ''}
                        onChange={(e) => handleImageUrlInput(productIndex, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-sm md:text-base"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-lg shadow-md p-4 md:p-6 border border-pink-100">
            <div className="flex flex-col gap-3">
              <button
                type="submit"
                className="w-full px-4 py-2.5 bg-pink-600 text-white rounded-md font-medium hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 transition-all duration-300 flex items-center justify-center gap-2 shadow-sm text-sm md:text-base"
              >
                <Save size={16} />
                Save Product Details
              </button>

              <button
                type="button"
                onClick={handleUpdate}
                className="w-full px-4 py-2.5 bg-gray-200 text-gray-800 rounded-md font-medium hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 transition-all duration-300 flex items-center justify-center gap-2 shadow-sm text-sm md:text-base"
              >
                <Save size={16} />
                Update Product Details
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductDetailsTemplate;
