import { motion } from 'framer-motion'
import { Plus, Minus, Package, User, MapPin, CreditCard, Save } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useNavigate } from 'react-router-dom'
import { useState, useEffect, ChangeEvent, FormEvent } from 'react'
import axios, { AxiosError } from 'axios'

// Configure axios defaults
axios.defaults.headers.common['ngrok-skip-browser-warning'] = 'true'
axios.defaults.headers.common['Access-Control-Allow-Origin'] = '*'
axios.defaults.withCredentials = false

// Type definitions
interface Product {
  sku: string;
  product_name: string;
  quantity: number;
  price: number;
}

interface OrderData {
  orderId: string;
  bill_no: string;
  tenentId: string;
  senderId: string;
  customer_wa_id: string;
  profile_name: string;
  customer_name: string;
  phone_number: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  products: Product[];
  shipping_cost: number;
  currency: string;
  status: string;
  payment_method: string;
  weight: number;
  shipping_partner: string;
  amount?: number;
  total_amount?: number;
}

interface Message {
  type: 'success' | 'error' | '';
  text: string;
}

interface CalculatedAmounts {
  subtotal: number;
  total_amount: number;
}

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5 } }
}

const slideIn = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.5 } }
}

export default function ManualOrderPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<Message>({ type: '', text: '' });

  const [orderData, setOrderData] = useState<OrderData>({
    orderId: '',
    bill_no: '',
    tenentId: '', // Will be set from localStorage
    senderId: '',
    customer_wa_id: '',
    profile_name: '',
    customer_name: '',
    phone_number: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    country: 'India',
    products: [{ sku: '', product_name: '', quantity: 1, price: 0 }],
    shipping_cost: 0,
    currency: 'INR',
    status: 'paid',
    payment_method: '',
    weight: 0,
    shipping_partner: ''
  });

  const [calculatedAmounts, setCalculatedAmounts] = useState<CalculatedAmounts>({
    subtotal: 0,
    total_amount: 0
  });

  // Calculate amounts when products or shipping cost changes
  useEffect(() => {
    const subtotal = orderData.products.reduce((sum, product) => 
      sum + (product.quantity * product.price), 0
    );
    const total = subtotal + (orderData.shipping_cost || 0);
    
    setCalculatedAmounts({ subtotal, total_amount: total });
    setOrderData(prev => ({ ...prev, amount: subtotal, total_amount: total }));
  }, [orderData.products, orderData.shipping_cost]);

  // Get tenant ID from localStorage on component mount
  useEffect(() => {
    const tenantId = localStorage.getItem('tenantId') || localStorage.getItem('tenentId') || 'default';
    setOrderData(prev => ({ ...prev, tenentId: tenantId }));
  }, []);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setOrderData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSelectChange = (name: keyof OrderData, value: string) => {
    setOrderData(prev => ({ ...prev, [name]: value }));
  };

  const handleProductChange = (index: number, field: keyof Product, value: string) => {
    const updatedProducts = [...orderData.products];
    updatedProducts[index] = {
      ...updatedProducts[index],
      [field]: field === 'quantity' || field === 'price' ? parseFloat(value) || 0 : value
    };
    setOrderData(prev => ({ ...prev, products: updatedProducts }));
  };

  const addProduct = () => {
    setOrderData(prev => ({
      ...prev,
      products: [...prev.products, { sku: '', product_name: '', quantity: 1, price: 0 }]
    }));
  };

  const removeProduct = (index: number) => {
    if (orderData.products.length > 1) {
      const updatedProducts = orderData.products.filter((_, i) => i !== index);
      setOrderData(prev => ({ ...prev, products: updatedProducts }));
    }
  };

  const validateForm = (): boolean => {
    const required: (keyof OrderData)[] = ['customer_name', 'phone_number', 'address', 'city', 'state', 'zip_code'];
    const missing = required.filter(field => !orderData[field]);
    
    if (missing.length > 0) {
      setMessage({ type: 'error', text: `Missing required fields: ${missing.join(', ')}` });
      return false;
    }

    const invalidProducts = orderData.products.some(p => !p.product_name || p.quantity <= 0 || p.price <= 0);
    if (invalidProducts) {
      setMessage({ type: 'error', text: 'All products must have valid name, quantity, and price' });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // Generate bill number automatically
      const billNo = Date.now().toString();
      
      // Get tenant ID from localStorage (fallback to 'default')
      const tenantId = localStorage.getItem('tenantId') || localStorage.getItem('tenentId') || 'default';
      
      // Remove orderId from payload - let backend generate it
      const { orderId, ...orderPayloadWithoutId } = orderData;
      
      const orderPayload = {
        ...orderPayloadWithoutId,
        bill_no: billNo, // Auto-generated bill number
        tenentId: tenantId, // From localStorage
        created_at: new Date(),
        timestamp: new Date().toISOString(),
        paymentStatus: 'paid',
        amountPaid: orderData.total_amount
      };

      const response = await axios.post('/api/orders', orderPayload, {
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        }
      });

      if (response.status === 200 || response.status === 201) {
        setMessage({ 
          type: 'success', 
          text: `Order created successfully! Order ID: ${response.data.data.orderId}, Bill No: ${billNo}` 
        });
        
        // Reset form but keep tenantId
        const currentTenantId = localStorage.getItem('tenantId') || localStorage.getItem('tenentId') || 'default';
        setOrderData({
          orderId: '',
          bill_no: '',
          tenentId: currentTenantId,
          senderId: '',
          customer_wa_id: '',
          profile_name: '',
          customer_name: '',
          phone_number: '',
          address: '',
          city: '',
          state: '',
          zip_code: '',
          country: 'India',
          products: [{ sku: '', product_name: '', quantity: 1, price: 0 }],
          shipping_cost: 0,
          currency: 'INR',
          status: 'paid',
          payment_method: '',
          weight: 0,
          shipping_partner: ''
        });
        
        // Scroll to top to show success message
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        throw new Error('Failed to create order');
      }
    } catch (error) {
      console.error('Error creating order:', error);
      
      // Type-safe error handling
      let errorMessage = 'Failed to create order';
      if (error instanceof AxiosError) {
        errorMessage = error.response?.data?.message || error.message || errorMessage;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setMessage({ 
        type: 'error', 
        text: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeIn}
      className="min-h-screen bg-gray-50 dark:bg-gray-900"
    >
      <div className="container mx-auto p-6 space-y-8">
        <motion.header
          variants={slideIn}
          className="flex justify-between items-center bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
        >
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600">
            Create Manual Order - InstaxBot
          </h1>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-gray-600 hover:text-gray-700 hover:bg-gray-100"
            onClick={() => navigate('/dashboard')}
          >
            Back to Dashboard
          </Button>
        </motion.header>

        {message.text && (
          <motion.div
            variants={slideIn}
            className={`p-4 rounded-lg ${
              message.type === 'success' 
                ? 'bg-green-100 text-green-800 border border-green-200' 
                : 'bg-red-100 text-red-800 border border-red-200'
            }`}
          >
            {message.text}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Order Information */}
          <motion.div variants={slideIn}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Package className="h-5 w-5 text-purple-600" />
                  <span>Order Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Order ID</Label>
                    <Input
                      value="Will be generated automatically"
                      readOnly
                      className="bg-gray-50 dark:bg-gray-700 text-gray-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Bill Number</Label>
                    <Input
                      value="Will be generated automatically"
                      readOnly
                      className="bg-gray-50 dark:bg-gray-700 text-gray-500"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Tenant ID</Label>
                  <Input
                    value={orderData.tenentId || 'Loading from localStorage...'}
                    readOnly
                    className="bg-gray-50 dark:bg-gray-700 text-gray-500"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Customer Information */}
          <motion.div variants={slideIn}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-blue-600" />
                  <span>Customer Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customer_name">Customer Name *</Label>
                    <Input
                      id="customer_name"
                      name="customer_name"
                      value={orderData.customer_name}
                      onChange={handleInputChange}
                      required
                      placeholder="Enter customer name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone_number">Phone Number *</Label>
                    <Input
                      id="phone_number"
                      name="phone_number"
                      type="tel"
                      value={orderData.phone_number}
                      onChange={handleInputChange}
                      required
                      placeholder="Enter phone number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customer_wa_id">WhatsApp ID</Label>
                    <Input
                      id="customer_wa_id"
                      name="customer_wa_id"
                      value={orderData.customer_wa_id}
                      onChange={handleInputChange}
                      placeholder="WhatsApp number (optional)"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="senderId">Sender ID</Label>
                    <Input
                      id="senderId"
                      name="senderId"
                      value={orderData.senderId}
                      onChange={handleInputChange}
                      placeholder="Enter sender ID (optional)"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profile_name">Profile Name</Label>
                    <Input
                      id="profile_name"
                      name="profile_name"
                      value={orderData.profile_name}
                      onChange={handleInputChange}
                      placeholder="Enter profile name (optional)"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Address Information */}
          <motion.div variants={slideIn}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MapPin className="h-5 w-5 text-green-600" />
                  <span>Shipping Address</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="address">Address *</Label>
                  <Textarea
                    id="address"
                    name="address"
                    value={orderData.address}
                    onChange={handleInputChange}
                    required
                    rows={3}
                    placeholder="Enter complete shipping address"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      name="city"
                      value={orderData.city}
                      onChange={handleInputChange}
                      required
                      placeholder="Enter city"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State *</Label>
                    <Input
                      id="state"
                      name="state"
                      value={orderData.state}
                      onChange={handleInputChange}
                      required
                      placeholder="Enter state"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zip_code">ZIP Code *</Label>
                    <Input
                      id="zip_code"
                      name="zip_code"
                      value={orderData.zip_code}
                      onChange={handleInputChange}
                      required
                      placeholder="Enter ZIP/PIN code"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      name="country"
                      value={orderData.country}
                      onChange={handleInputChange}
                      placeholder="Country"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Products */}
          <motion.div variants={slideIn}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Package className="h-5 w-5 text-orange-600" />
                    <span>Products</span>
                  </div>
                  <Button type="button" onClick={addProduct} size="sm" className="bg-green-600 hover:bg-green-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Product
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {orderData.products.map((product, index) => (
                  <div key={index} className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                      <div className="space-y-2">
                        <Label>SKU</Label>
                        <Input
                          value={product.sku}
                          onChange={(e) => handleProductChange(index, 'sku', e.target.value)}
                          placeholder="Product SKU"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Product Name *</Label>
                        <Input
                          value={product.product_name}
                          onChange={(e) => handleProductChange(index, 'product_name', e.target.value)}
                          placeholder="Product name"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Quantity *</Label>
                        <Input
                          type="number"
                          min="1"
                          value={product.quantity}
                          onChange={(e) => handleProductChange(index, 'quantity', e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Price (₹) *</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={product.price}
                          onChange={(e) => handleProductChange(index, 'price', e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Total</Label>
                        <Input
                          value={`₹${(product.quantity * product.price).toFixed(2)}`}
                          readOnly
                          className="bg-gray-100 dark:bg-gray-600"
                        />
                      </div>
                      <div>
                        <Button
                          type="button"
                          onClick={() => removeProduct(index)}
                          variant="outline"
                          size="sm"
                          disabled={orderData.products.length === 1}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          {/* Order Summary & Shipping */}
          <motion.div variants={slideIn}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="h-5 w-5 text-indigo-600" />
                  <span>Order Summary & Shipping</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="shipping_cost">Shipping Cost (₹)</Label>
                    <Input
                      id="shipping_cost"
                      name="shipping_cost"
                      type="number"
                      min="0"
                      step="0.01"
                      value={orderData.shipping_cost}
                      onChange={handleInputChange}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weight">Weight (kg)</Label>
                    <Input
                      id="weight"
                      name="weight"
                      type="number"
                      min="0"
                      step="0.01"
                      value={orderData.weight}
                      onChange={handleInputChange}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shipping_partner">Shipping Partner</Label>
                    <Select value={orderData.shipping_partner} onValueChange={(value) => handleSelectChange('shipping_partner', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select shipping partner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="delhivery">Delhivery</SelectItem>
                        <SelectItem value="bluedart">BlueD</SelectItem>
                        <SelectItem value="dtdc">DTDC</SelectItem>
                       <SelectItem value="fedex">FedEx</SelectItem>
                       <SelectItem value="indiapost">India Post</SelectItem>
                       <SelectItem value="ecom">Ecom Express</SelectItem>
                       <SelectItem value="ekart">Ekart</SelectItem>
                       <SelectItem value="shiprocket">Shiprocket</SelectItem>
                       <SelectItem value="xpressbees">XpressBees</SelectItem>
                       <SelectItem value="shadowfax">Shadowfax</SelectItem>
                       <SelectItem value="other">Other</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
                 <div className="space-y-2">
                   <Label htmlFor="payment_method">Payment Method</Label>
                   <Select value={orderData.payment_method} onValueChange={(value) => handleSelectChange('payment_method', value)}>
                     <SelectTrigger>
                       <SelectValue placeholder="Select payment method" />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="cash">Cash</SelectItem>
                       <SelectItem value="cod">Cash on Delivery</SelectItem>
                       <SelectItem value="razorpay">Razorpay</SelectItem>
                       <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                       <SelectItem value="upi">UPI</SelectItem>
                       <SelectItem value="card">Card</SelectItem>
                       <SelectItem value="cheque">Cheque</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
               </div>
               
               <div className="border-t pt-4 space-y-2">
                 <div className="flex justify-between text-lg">
                   <span>Subtotal:</span>
                   <span>₹{calculatedAmounts.subtotal.toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between text-lg">
                   <span>Shipping:</span>
                   <span>₹{orderData.shipping_cost.toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between text-xl font-bold border-t pt-2">
                   <span>Total:</span>
                   <span className="text-purple-600">₹{calculatedAmounts.total_amount.toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between text-sm text-gray-600 bg-green-50 dark:bg-green-900/20 p-2 rounded">
                   <span>Status:</span>
                   <span className="text-green-600 font-medium">PAID (Manual Order)</span>
                 </div>
               </div>
             </CardContent>
           </Card>
         </motion.div>

         <motion.div variants={slideIn} className="flex justify-center">
           <Button 
             type="submit" 
             disabled={loading} 
             size="lg"
             className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 min-w-48"
           >
             {loading ? (
               <div className="flex items-center space-x-2">
                 <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                 <span>Creating Order...</span>
               </div>
             ) : (
               <div className="flex items-center space-x-2">
                 <Save className="h-4 w-4" />
                 <span>Create Order</span>
               </div>
             )}
           </Button>
         </motion.div>
       </form>
     </div>
   </motion.div>
 );
}