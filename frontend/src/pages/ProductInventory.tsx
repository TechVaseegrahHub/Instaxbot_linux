import { useState, useEffect } from 'react';
import { Search, Edit, Trash2, Plus, ArrowUpDown, AlertCircle } from 'lucide-react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { Link } from "react-router-dom";

interface ProductInventory {
  id: string;
  productName: string;
  sku: string;
  unitSize: string;
  price: string;
  quantityInStock: number;
  threshold: number;
  lastRestocked: string;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
  imageUrl: string;
}

const ProductInventory: React.FC = () => {
  const [products, setProducts] = useState<ProductInventory[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ProductInventory[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof ProductInventory | ''>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<ProductInventory | null>(null);
  // Add state for mobile view
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);
  
  useEffect(() => {
    fetchProducts();
    
    // Add resize listener for responsive behavior
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const fetchProducts = async () => {
    // Existing fetch logic remains unchanged
    setLoading(true);
    try {
      const tenentId = localStorage.getItem('tenentid');
      
      const response = await axios.get('https://app.instaxbot.com/api/productinventoryroute/inventory', {
        params: { tenentId }
      });
      
      if (response.data && response.data.products) {
        const transformedProducts = response.data.products.map((item: any) => ({
          id: item._id || item.id,
          productName: item.productName,
          sku: item.sku || '',
          unitSize: item.units && item.units.length > 0 ? item.units[0].unit : '',
          price: item.units && item.units.length > 0 ? item.units[0].price : '',
          quantityInStock: item.quantityInStock || 0,
          threshold: item.threshold || 5,
          lastRestocked: item.lastRestocked || new Date().toISOString().split('T')[0],
          status: calculateStatus(item.quantityInStock || 0, item.threshold || 5),
          imageUrl: item.productPhotoUrl || ''
        }));
        
        setProducts(transformedProducts);
        setFilteredProducts(transformedProducts);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      Swal.fire({
        icon: "error",
        title: "Failed to Load Inventory",
        text: "Could not fetch products from the server. Please try again later.",
      });
      
      setProducts([]);
      setFilteredProducts([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Keep all other existing functions unchanged
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    
    if (term === '') {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter(product => 
        product.productName.toLowerCase().includes(term) || 
        product.sku.toLowerCase().includes(term)
      );
      setFilteredProducts(filtered);
    }
  };
  
  const handleSort = (field: keyof ProductInventory) => {
    const newDirection = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortField(field);
    setSortDirection(newDirection);
    
    const sorted = [...filteredProducts].sort((a, b) => {
      if (field === 'quantityInStock' || field === 'threshold') {
        return newDirection === 'asc' 
          ? Number(a[field]) - Number(b[field])
          : Number(b[field]) - Number(a[field]);
      }
      
      const valueA = String(a[field]).toLowerCase();
      const valueB = String(b[field]).toLowerCase();
      
      if (valueA < valueB) return newDirection === 'asc' ? -1 : 1;
      if (valueA > valueB) return newDirection === 'asc' ? 1 : -1;
      return 0;
    });
    
    setFilteredProducts(sorted);
  };
  
  const handleEdit = (product: ProductInventory) => {
    setEditingProduct({...product});
  };
  
  const handleUpdateProduct = (field: keyof ProductInventory, value: any) => {
    if (editingProduct) {
      setEditingProduct({
        ...editingProduct,
        [field]: value
      });
    }
  };
  
  const calculateStatus = (quantity: number, threshold: number): 'In Stock' | 'Low Stock' | 'Out of Stock' => {
    if (quantity <= 0) return 'Out of Stock';
    if (quantity <= threshold) return 'Low Stock';
    return 'In Stock';
  };
  
  const saveEditedProduct = async () => {
    if (!editingProduct) return;
    
    try {
      const tenentId = localStorage.getItem('tenentid');
      
      const status = calculateStatus(editingProduct.quantityInStock, editingProduct.threshold);
      
      const productData = {
        id: editingProduct.id,
        tenentId,
        productName: editingProduct.productName,
        sku: editingProduct.sku,
        units: [{
          unit: editingProduct.unitSize,
          price: editingProduct.price
        }],
        quantityInStock: editingProduct.quantityInStock,
        threshold: editingProduct.threshold,
        lastRestocked: editingProduct.lastRestocked,
        status
      };
      
      const response = await axios.put(
        `https://app.instaxbot.com/api/productinventoryroute/inventory/${editingProduct.id}`,
        productData
      );
      
      if (response.data) {
        const updatedProducts = products.map(p => 
          p.id === editingProduct.id ? {
            ...p,
            productName: editingProduct.productName,
            sku: editingProduct.sku,
            unitSize: editingProduct.unitSize,
            price: editingProduct.price,
            quantityInStock: editingProduct.quantityInStock,
            threshold: editingProduct.threshold,
            status
          } : p
        );
        
        setProducts(updatedProducts);
        setFilteredProducts(updatedProducts.filter(product => 
          searchTerm === '' || 
          product.productName.toLowerCase().includes(searchTerm) || 
          product.sku.toLowerCase().includes(searchTerm)
        ));
        
        setEditingProduct(null);
        
        Swal.fire({
          icon: "success",
          title: "Success",
          text: "Product inventory updated successfully!",
        });
      }
    } catch (error) {
      console.error('Error updating product:', error);
      Swal.fire({
        icon: "error",
        title: "Update Failed",
        text: "Failed to update product inventory. Please try again.",
      });
    }
  };
  
  const handleDelete = async (id: string) => {
    Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const tenentId = localStorage.getItem('tenentid');
          
          await axios.delete(`https://app.instaxbot.com/api/productinventoryroute/inventory/${id}`, {
            params: { tenentId }
          });
          
          const updatedProducts = products.filter(product => product.id !== id);
          setProducts(updatedProducts);
          setFilteredProducts(updatedProducts);
          
          Swal.fire(
            'Deleted!',
            'The product has been removed from inventory.',
            'success'
          );
        } catch (error) {
          console.error('Error deleting product:', error);
          Swal.fire({
            icon: "error",
            title: "Delete Failed",
            text: "Failed to delete product. Please try again.",
          });
        }
      }
    });
  };
  
  const handleRestock = async (id: string) => {
    Swal.fire({
      title: 'Restock Product',
      input: 'number',
      inputLabel: 'Enter quantity to add',
      inputPlaceholder: 'Quantity',
      showCancelButton: true,
      inputValidator: (value) => {
        if (!value || parseInt(value) <= 0) {
          return 'Please enter a valid quantity';
        }
        return null;
      }
    }).then(async (result) => {
      if (result.isConfirmed && result.value) {
        try {
          const quantity = parseInt(result.value);
          const tenentId = localStorage.getItem('tenentid');
          
          const product = products.find(p => p.id === id);
          if (!product) return;
          
          const newQuantity = product.quantityInStock + quantity;
          const status = calculateStatus(newQuantity, product.threshold);
          
          const response = await axios.post(
            `https://app.instaxbot.com/api/productinventoryroute/inventory/${id}/restock`,
            {
              tenentId,
              addQuantity: quantity,
              newTotal: newQuantity,
              lastRestocked: new Date().toISOString().split('T')[0]
            }
          );
          
          if (response.data) {
            const updatedProducts = products.map(p => {
              if (p.id === id) {
                return {
                  ...p,
                  quantityInStock: newQuantity,
                  lastRestocked: new Date().toISOString().split('T')[0],
                  status
                };
              }
              return p;
            });
            
            setProducts(updatedProducts);
            setFilteredProducts(updatedProducts.filter(product => 
              searchTerm === '' || 
              product.productName.toLowerCase().includes(searchTerm) || 
              product.sku.toLowerCase().includes(searchTerm)
            ));
            
            Swal.fire(
              'Restocked!',
              `Added ${quantity} items to inventory.`,
              'success'
            );
          }
        } catch (error) {
          console.error('Error restocking product:', error);
          Swal.fire({
            icon: "error",
            title: "Restock Failed",
            text: "Failed to restock product. Please try again.",
          });
        }
      }
    });
  };
  
  const getStatusClass = (status: string) => {
    switch (status) {
      case 'In Stock':
        return 'bg-emerald-600';
      case 'Low Stock':
        return 'bg-amber-600';
      case 'Out of Stock':
        return 'bg-rose-600';
      default:
        return 'bg-slate-500';
    }
  };
  
  const handleAddNewProduct = () => {
    window.location.href = '/product-details-template';
  };
  
  // New function to render the mobile card view for each product
  const renderMobileProductCard = (product: ProductInventory) => {
    return (
      <div key={product.id} className="bg-white rounded-lg shadow-md p-4 mb-3">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 flex-shrink-0">
            <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center">
              {product.imageUrl ? (
                <img 
                  src={product.imageUrl} 
                  alt={product.productName} 
                  className="h-10 w-10 rounded-full object-cover" 
                />
              ) : (
                <span className="text-slate-700 text-xs">{product.productName.substring(0, 2).toUpperCase()}</span>
              )}
            </div>
          </div>
          <div className="text-base font-medium text-slate-900">{product.productName}</div>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-sm text-slate-700 mb-3">
          <div>
            <span className="font-medium">SKU:</span> {product.sku}
          </div>
          <div>
            <span className="font-medium">Unit:</span> {product.unitSize}
          </div>
          <div>
            <span className="font-medium">Price:</span> {product.price}
          </div>
          <div>
            <span className="font-medium">In Stock:</span> {product.quantityInStock}
          </div>
        </div>
        
        <div className="flex justify-between items-center mb-3">
          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(product.status)} text-white`}>
            {product.status}
          </span>
          <div className="text-xs text-slate-600">
            <span className="font-medium">Last Restocked:</span> {product.lastRestocked}
          </div>
        </div>
        
        <div className="flex justify-between gap-2">
          <button
            onClick={() => handleEdit(product)}
            className="p-2 bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 flex items-center gap-1"
          >
            <Edit size={14} /> Edit
          </button>
          <button
            onClick={() => handleDelete(product.id)}
            className="p-2 bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 flex items-center gap-1"
          >
            <Trash2 size={14} /> Delete
          </button>
          <button
            onClick={() => handleRestock(product.id)}
            className="p-2 bg-slate-700 text-white rounded-md hover:bg-slate-600 flex-grow text-center"
          >
            Restock
          </button>
        </div>
      </div>
    );
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300 flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur-lg p-8 rounded-xl shadow-lg">
          <h2 className="text-2xl font-bold text-slate-800 mb-4">Loading inventory...</h2>
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-slate-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300 py-6 px-4 md:py-12 md:px-6">
      <Link
        to="/dashboard"
        className="fixed top-20 left-4 md:absolute md:left-[17rem] px-4 py-2 bg-slate-700 text-white rounded-md font-semibold hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-500 transition-all duration-300 z-10"
      >
        ← Back 
      </Link>
      
      <div className="max-w-7xl mx-auto mt-16 md:mt-0">
        <div className="mb-4 md:mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Product Inventory</h1>
          
          <div className="flex flex-col sm:flex-row w-full md:w-auto items-start sm:items-center gap-3">
            <div className="relative w-full sm:w-auto">
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={handleSearch}
                className="pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-md text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500 w-full sm:w-64"
              />
              <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
            </div>
            
            <button 
              onClick={handleAddNewProduct}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-md font-semibold hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-500 transition-all duration-300 w-full sm:w-auto"
            >
              <Plus size={16} />
              Add Product
            </button>
          </div>
        </div>
        
        {filteredProducts.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-lg p-6 md:p-8 rounded-xl text-center shadow-lg">
            <AlertCircle className="mx-auto text-slate-600 mb-4" size={48} />
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-2">No products found</h2>
            <p className="text-slate-700">Try adjusting your search or add new products to your inventory.</p>
          </div>
        ) : (
          <>
            {/* Mobile View - Card based UI */}
            {isMobileView ? (
              <div className="space-y-4">
                {filteredProducts.map(product => renderMobileProductCard(product))}
              </div>
            ) : (
              /* Desktop View - Table UI (unchanged) */
              <div className="bg-white/80 backdrop-blur-lg rounded-xl overflow-hidden shadow-lg">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                          <button 
                            onClick={() => handleSort('productName')} 
                            className="flex items-center gap-1 focus:outline-none"
                          >
                            Product
                            {sortField === 'productName' && (
                              <ArrowUpDown size={14} className="text-slate-500" />
                            )}
                          </button>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                          <button 
                            onClick={() => handleSort('sku')} 
                            className="flex items-center gap-1 focus:outline-none"
                          >
                            SKU
                            {sortField === 'sku' && (
                              <ArrowUpDown size={14} className="text-slate-500" />
                            )}
                          </button>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                          <button 
                            onClick={() => handleSort('unitSize')} 
                            className="flex items-center gap-1 focus:outline-none"
                          >
                            Unit
                            {sortField === 'unitSize' && (
                              <ArrowUpDown size={14} className="text-slate-500" />
                            )}
                          </button>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                          <button 
                            onClick={() => handleSort('price')} 
                            className="flex items-center gap-1 focus:outline-none"
                          >
                            Price
                            {sortField === 'price' && (
                              <ArrowUpDown size={14} className="text-slate-500" />
                            )}
                          </button>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                          <button 
                            onClick={() => handleSort('quantityInStock')} 
                            className="flex items-center gap-1 focus:outline-none"
                          >
                            In Stock
                            {sortField === 'quantityInStock' && (
                              <ArrowUpDown size={14} className="text-slate-500" />
                            )}
                          </button>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                          <button 
                            onClick={() => handleSort('status')} 
                            className="flex items-center gap-1 focus:outline-none"
                          >
                            Status
                            {sortField === 'status' && (
                              <ArrowUpDown size={14} className="text-slate-500" />
                            )}
                          </button>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                          Last Restocked
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-700 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredProducts.map(product => (
                        <tr key={product.id} className="hover:bg-slate-100 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 flex-shrink-0">
                                <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center">
                                  {product.imageUrl ? (
                                    <img 
                                      src={product.imageUrl} 
                                      alt={product.productName} 
                                      className="h-10 w-10 rounded-full object-cover" 
                                    />
                                  ) : (
                                    <span className="text-slate-700 text-xs">{product.productName.substring(0, 2).toUpperCase()}</span>
                                  )}
                                </div>
                              </div>
                              <div className="text-sm font-medium text-slate-900">{product.productName}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{product.sku}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{product.unitSize}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{product.price}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{product.quantityInStock}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(product.status)} text-white`}>
                              {product.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{product.lastRestocked}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleEdit(product)}
                                className="text-slate-600 hover:text-slate-900 transition-colors"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(product.id)}
                                className="text-slate-600 hover:text-slate-900 transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                              <button
                                onClick={() => handleRestock(product.id)}
                                className="px-2 py-1 text-xs bg-slate-200 hover:bg-slate-300 text-slate-800 rounded transition-colors"
                              >
                                Restock
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
        
        {/* Modal remains unchanged since it works on both mobile and desktop */}
        {editingProduct && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-xl max-w-md w-full shadow-xl">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Edit Product</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-slate-700 text-sm font-medium mb-1">Product Name</label>
                  <input
                    type="text"
                    value={editingProduct.productName}
                    onChange={(e) => handleUpdateProduct('productName', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded bg-white text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-700 text-sm font-medium mb-1">SKU</label>
                    <input
                      type="text"
                      value={editingProduct.sku}
                      onChange={(e) => handleUpdateProduct('sku', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded bg-white text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-slate-700 text-sm font-medium mb-1">Unit Size</label>
                    <input
                      type="text"
                      value={editingProduct.unitSize}
                      onChange={(e) => handleUpdateProduct('unitSize', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded bg-white text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-700 text-sm font-medium mb-1">Price</label>
                    <input
                      type="text"
                      value={editingProduct.price}
                      onChange={(e) => handleUpdateProduct('price', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded bg-white text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-slate-700 text-sm font-medium mb-1">In Stock</label>
                    <input
                      type="number"
                      value={editingProduct.quantityInStock}
                      onChange={(e) => handleUpdateProduct('quantityInStock', parseInt(e.target.value) || 0)}
                      min="0"
                      className="w-full px-3 py-2 border border-slate-300 rounded bg-white text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-slate-700 text-sm font-medium mb-1">Low Stock Threshold</label>
                  <input
                    type="number"
                    value={editingProduct.threshold}
                    onChange={(e) => handleUpdateProduct('threshold', parseInt(e.target.value) || 0)}
                    min="0"
                    className="w-full px-3 py-2 border border-slate-300 rounded bg-white text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500"
                  />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEditedProduct}
                  className="px-4 py-2 bg-slate-700 text-white rounded hover:bg-slate-600 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
  )}
  export default ProductInventory;