import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import Login from './Services/Login';
import Signup from './Services/Signup';
import Dashboard from './pages/Dashboard';
import LiveChat from './pages/Livechat';
import Sidebar from './components/Sidebar';
import Header from './components/Header'; 
import Profile from './pages/Profile';
import TermsAndConditions from './pages/Terms&condition';
import PrivacyPolicy from './pages/Policy';
import FrontPrivacyPolicy from './pages/FPolicy';
import FrontTermsAndConditions from './pages/FrontTerms&conditions';
import Frontpage from './pages/Embed';
import FileUpload from './pages/FileUpload';
import Templates from './pages/Templates';
import ProductTemplate from './pages/ProductTemplate';
import TechProductTemplate from './pages/TechProductTemplate';
import EcommerceProductTemplate from './pages/EcommerceProductTemplate';
import ProductTypeTemplate from './pages/ProductTypeTemplate';
import ProductDetailsTemplate from './pages/ProductDetailsTemplate';
import ProductDetailsTemplateTech from './pages/ProductDetailsTemplateTech';
import IcebreakersTemplate from './pages/IcebreakersTemplate';
import ProtectedRoute from './components/ProtectedRoute';
import WebsiteURLConfiguration from './pages/WebsiteUrlConfiguration' 
import AdminPage from './pages/AdminPage'
import CartPage from './pages/CartPage'
import CartPageSize from './pages/CartPageSize'
import ProductInventory from './pages/ProductInventory'
import ProductInventorySize from './pages/ProductInventorySize'
import ShippingPage from './pages/ShippingPage'
import ProductCatalog from './pages/ProductCatalog'
import ProductCatalogSize from './pages/ProductCatalogSize'
import CommentsContainer from './pages/CommentsContainer'
import TemplateMessage from './pages/TemplateMessage'
import RazorpayConnect from './pages/RazorpayConnect'
import Printing from './pages/Printing'
import Packing from './pages/Packing'
import Holding from './pages/Holding'
import Order from './pages/Order'
import Tracking from './pages/Tracking'
import Welcomepage from './pages/Welcomepage'
import Systemmenus from './pages/Systemmenus'
import AllCommentsAutomation from './pages/AllCommentsAutomation'
import Setting from './pages/Setting'
// Import ProtectedRoute

function AppContent() {
  const location = useLocation();
  const isLoginPage = ['/login', '/', '/signup','/frontpolicy','/frontterms','/admin','/cart','/productcatalog','/cartsize','/productcatalogsize'].includes(location.pathname);

  return (
    <div className="flex h-screen">
      {/* Show Sidebar only if it's not the login/signup page */}
      {!isLoginPage && <Sidebar />}
      
      <div className="flex flex-col flex-1">
        {!isLoginPage && <Header />}
        <main className={`flex-1 ${isLoginPage ? 'w-full' : ''} overflow-auto`}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/terms" element={<TermsAndConditions />} />
          <Route path="/policy" element={<PrivacyPolicy />} />
          <Route path="/frontpolicy" element={<FrontPrivacyPolicy />} />
          <Route path="/frontterms" element={<FrontTermsAndConditions />} />
          <Route 
        path="/cart" 
         element={<CartPage />}  
      />
      <Route 
        path="/cartsize" 
         element={<CartPageSize />}  
      />
          
           <Route 
        path="/admin" 
        element={<ProtectedRoute element={<AdminPage />} />} 
      />   
      <Route 
        path="/dashboard" 
        element={<ProtectedRoute element={<Dashboard />} />} 
      />
      <Route 
        path="/live-chat" 
        element={<ProtectedRoute element={<LiveChat />} />} 
      />
      <Route 
        path="/profile" 
        element={<ProtectedRoute element={<Profile />} />} 
      />
      <Route 
        path="/upload" 
        element={<ProtectedRoute element={<FileUpload />} />} 
      />
      <Route 
        path="/embed" 
        element={<ProtectedRoute element={<Frontpage />} />} 
      />
      <Route 
        path="/templates" 
        element={<ProtectedRoute element={<Templates />} />} 
      />
      <Route 
        path="/product-template" 
        element={<ProtectedRoute element={<ProductTemplate />} />} 
      />
      <Route 
        path="/tech-product-template" 
        element={<ProtectedRoute element={<TechProductTemplate />} />} 
      />
      <Route 
        path="/ecommerce-product-template" 
        element={<ProtectedRoute element={<EcommerceProductTemplate />} />} 
      />
      <Route 
        path="/product-type-template" 
        element={<ProtectedRoute element={<ProductTypeTemplate />} />} 
      />
      <Route 
        path="/product-details-template" 
        element={<ProtectedRoute element={<ProductDetailsTemplate />} />} 
      />
      
      <Route 
        path="/product-details-template-tech" 
        element={<ProtectedRoute element={<ProductDetailsTemplateTech />} />} 
      />
      
      <Route 
        path="/website-url-configuration" 
        element={<ProtectedRoute element={<WebsiteURLConfiguration />} />} 
      />
      <Route 
        path="/policy" 
        element={<ProtectedRoute element={<PrivacyPolicy />} />} 
      />
      <Route 
        path="/terms" 
        element={<ProtectedRoute element={<TermsAndConditions />} />} 
      />
      <Route 
        path="/icebreakers-template" 
        element={<ProtectedRoute element={<IcebreakersTemplate />} />} 
      />
    <Route 
        path="/product-inventory" 
        element={<ProtectedRoute element={<ProductInventory />} />} 
      />
      <Route 
        path="/product-inventory-size" 
        element={<ProtectedRoute element={<ProductInventorySize />} />} 
      />
      <Route 
        path="/template_message" 
        element={<ProtectedRoute element={<TemplateMessage />} />} 
      />
      <Route 
        path="/printing" 
        element={<ProtectedRoute element={<Printing />} />} 
      />
      <Route 
        path="/packing" 
        element={<ProtectedRoute element={<Packing />} />} 
      />
      <Route 
        path="/holding" 
        element={<ProtectedRoute element={<Holding />} />} 
      />
      <Route 
        path="/order" 
        element={<ProtectedRoute element={<Order />} />} 
      />
      <Route 
        path="/tracking" 
        element={<ProtectedRoute element={<Tracking />} />} 
      />
      <Route 
        path="/welcomepage" 
        element={<ProtectedRoute element={<Welcomepage />} />} 
      />
      <Route 
        path="/systemmenus" 
        element={<ProtectedRoute element={<Systemmenus />} />} 
      />
      <Route 
          path="/setting" 
          element={<ProtectedRoute element={<Setting />} />} 
            />
      <Route 
  path="/productcatalog" 
  element={<ProtectedRoute 
    element={<ProductCatalog />} 
    bypassTokenCheck={true} 
  />}  
/>
<Route 
  path="/productcatalogsize" 
  element={<ProtectedRoute 
    element={<ProductCatalogSize />} 
    bypassTokenCheck={true} 
  />}  
/>

<Route 
        path="/comments_chat" 
        element={<ProtectedRoute element={<CommentsContainer />} />} 
      />
      
      <Route 
        path="/shipping-setting" 
        element={<ProtectedRoute element={<ShippingPage />} />} 
      />

<Route 
        path="/razorpay_connect" 
        element={<ProtectedRoute element={<RazorpayConnect />} />} 
      />
      <Route 
              path="/allcomments_automation" 
              element={<ProtectedRoute element={<AllCommentsAutomation />} />} 
            />
        </Routes>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;


