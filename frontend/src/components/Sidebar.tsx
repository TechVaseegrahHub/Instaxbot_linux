import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Home,
  ReceiptText,
  MessageCircle, // Live Chat and Comments Chat
  MessageSquare, // Comments Chat
  FileText,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  Instagram,
  FileUp,
  Link2,
  Boxes,
  Truck,
  Printer,
  Package,
  CreditCard,
  Menu,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@/components/ui/hover-card";
import instaxbotLogo from "../assets/Instaxbot_Logo.png";

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const scrollRef = useRef<HTMLElement>(null);
  const location = useLocation();

  // Check if the screen is mobile
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
      // Auto-close sidebar on mobile
      if (window.innerWidth < 768) {
        setIsOpen(false);
      } else {
        setIsOpen(true);
      }
    };

    // Check initially
    checkIfMobile();

    // Add event listener
    window.addEventListener("resize", checkIfMobile);

    // Clean up
    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);

  // Restore scroll position after route changes
  useEffect(() => {
    const timer = setTimeout(() => {
      const savedScrollPosition = sessionStorage.getItem('sidebarScrollPosition');
      if (savedScrollPosition && scrollRef.current) {
        scrollRef.current.scrollTop = parseInt(savedScrollPosition, 10);
      }
    }, 100); // Small delay to ensure DOM is ready

    return () => clearTimeout(timer);
  }, [location.pathname]);

  const handleScroll = () => {
    if (scrollRef.current) {
      sessionStorage.setItem('sidebarScrollPosition', scrollRef.current.scrollTop.toString());
    }
  };

  const navItems = [
    { name: "Home", icon: Home, path: "/dashboard" },
    { name: "Connect Instagram", icon: Instagram, path: "/embed" },
    { name: "Live Chat", icon: MessageCircle, path: "/live-chat" },
    { name: "Comments Chat", icon: MessageSquare, path: "/comments_chat" },
    { name: "Comments Automation", icon: MessageCircle, path: "/comments_automation" },
    { name: "Template Message", icon: MessageSquare, path: "/template_message" },
    { name: "File Upload", icon: FileUp, path: "/upload" },
    { name: "Templates", icon: FileText, path: "/templates" },
    { name: "Icebreakers Configuration", icon: FileText, path: "/icebreakers-template" },
    { name: "Website Url Configuration", icon: Link2, path: "/website-url-configuration" },
    { name: "Products", icon: Boxes, path: "/product-inventory" },
    { name: "Order", icon: Package, path: "/order" },
    { name: "Manual order", icon: Package, path: "/manualorder" },
    { name: "Printing", icon: Printer, path: "/printing" },
    { name: "Packing", icon: Package, path: "/packing" },
    { name: "Holding", icon: Package, path: "/holding" },
    { name: "Tracking", icon: Package, path: "/tracking" },
    { name: "Shipping Settings", icon: Truck, path: "/shipping-setting" },
    { name: "Razorpay Connect", icon: CreditCard, path: "/razorpay_connect" },
    { name: "Systemmenus Template", icon: FileText, path: "/systemmenus" }
  ];

  const bottomNavItems = [
    { name: "Terms&condition", icon: ReceiptText, path: "/terms" },
    { name: "PrivacyPolicy", icon: ReceiptText, path: "/policy" },
    { name: "My Profile", icon: CircleUserRound, path: "/profile" },
  ];

  const toggleSidebar = () => setIsOpen(!isOpen);

  const handleNavClick = () => {
    // Save current scroll position before navigation
    if (scrollRef.current) {
      sessionStorage.setItem('sidebarScrollPosition', scrollRef.current.scrollTop.toString());
    }
    if (isMobile) setIsOpen(false);
  };

  const renderNavItems = (items: any[]) => (
    items.map((item) => (
      <HoverCard key={item.name}>
        <HoverCardTrigger asChild>
          <Link
            to={item.path}
            className={`
              flex items-center w-full p-2 mb-3 rounded
              hover:bg-[#ffd9ed] transition-colors
              ${isOpen ? "justify-start" : "justify-center"}
            `}
            onClick={handleNavClick}
          >
            <item.icon className="h-5 w-5" />
            {isOpen && <span className="ml-3 text-sm">{item.name}</span>}
          </Link>
        </HoverCardTrigger>
        {!isOpen && !isMobile && (
          <HoverCardContent side="left">
            <span className="text-sm">{item.name}</span>
          </HoverCardContent>
        )}
      </HoverCard>
    ))
  );

  // Mobile drawer component
  const MobileDrawer = () => (
    <>
      {!isOpen && (
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden fixed top-2 left-4 z-50 shadow-md"
          onClick={toggleSidebar}
        >
          <Menu className="h-5 w-5 text-[#0a0a0a]" />
        </Button>
      )}
      
      {isOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black/20" 
            onClick={toggleSidebar}
          />
          
          {/* Sidebar */}
          <div className="relative flex flex-col w-64 max-w-xs md:-mt-6 bg-white h-full">
            <div className="flex justify-between items-center p-4 border-b">
              <div className="flex items-center">
                <img
                  src={instaxbotLogo}
                  alt="InstaX Bot Logo"
                  className="h-5 w-5 mr-2"
                />
                <h1 className="text-sm font-semibold">
                  <span className="text-[#f585c0]">InstaX</span> bot
                </h1>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-[#575656]"
                onClick={toggleSidebar}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <nav className="flex-1 px-3 py-4 overflow-y-auto">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  className="flex items-center w-full p-2 mb-3 rounded hover:bg-[#ffd9ed] transition-colors"
                  onClick={toggleSidebar}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="ml-3 text-sm">{item.name}</span>
                </Link>
              ))}
            </nav>
            
            <div className="px-3 py-4 border-t">
              {bottomNavItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  className="flex items-center w-full p-2 mb-3 rounded hover:bg-[#ffd9ed] transition-colors"
                  onClick={toggleSidebar}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="ml-3 text-sm">{item.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );

  // Regular sidebar for desktop and tablet
  const RegularSidebar = () => (
    <aside
      className={`
        ${isOpen ? "w-64" : "w-20"}
        flex flex-col
        bg-white
        text-[#000]
        min-h-screen
        transition-all duration-300 ease-in-out
        hidden md:flex
      `}
    >
      {/* Header with Logo */}
      <div className="flex justify-between items-center p-4">
        <div className="flex items-center">
          <img
            src={instaxbotLogo}
            alt="InstaX Bot Logo"
            className={`h-5 w-5 mr-2 ${isOpen ? "block" : "hidden"}`}
          />
          <h1 className={`text-sm font-semibold ${isOpen ? "block" : "hidden"}`}>
            <span className="text-[#f585c0]">InstaX</span> bot
          </h1>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-[#575656] hover:bg-[#ffd9ed]"
          onClick={toggleSidebar}
        >
          {isOpen ? (
            <ChevronLeft className="h-5 w-5" />
          ) : (
            <ChevronRight className="h-5 w-5" />
          )}
          <span className="sr-only">Toggle Sidebar</span>
        </Button>
      </div>

      {/* Main Navigation */}
      <nav 
        ref={scrollRef}
        className="flex-1 px-3 py-4 overflow-y-auto"
        onScroll={handleScroll}
        style={{ scrollBehavior: 'auto' }}
      >
        {renderNavItems(navItems)}
      </nav>

      {/* Bottom Navigation */}
      <div className="px-3 py-4 mt-auto">
        {renderNavItems(bottomNavItems)}
      </div>
    </aside>
  );

  return (
    <>
      {isMobile ? <MobileDrawer /> : <RegularSidebar />}
    </>
  );
}