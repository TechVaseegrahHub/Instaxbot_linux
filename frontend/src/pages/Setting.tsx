import { Card, CardContent } from "@/components/ui/card";
import { 
  FileUp, 
  MessageSquareText, 
  FileText, 
  Link2, 
  Truck, 
  CreditCard,
  Layers // Added for consistency
} from "lucide-react";
import { Link } from "react-router-dom";

// Define a type for a single setting item for better structure and scalability
interface SettingItem {
  icon: React.ElementType;
  title: string;
  borderColor: string;
  path: string; // Added path for navigation
}

export default function Settings() {
  // Define a color palette consistent with the dashboard for UI elements
  const COLORS = {
    borderBlue: "#3B82F6",
    borderPurple: "#8B5CF6",
    borderGreen: "#10B981",
    borderTeal: "#14B8A6",
    borderIndigo: "#6366F1",
    borderPink: "#EC4899",
    borderGray: "#6B7280",
  };

  // Array of setting items to be rendered as cards, now with navigation paths and updated icons
  const settingItems: SettingItem[] = [
    {
      icon: FileUp,
      title: "File Upload",
      borderColor: COLORS.borderBlue,
      path: "/upload",
    },
    {
      icon: Layers, // Corrected Icon for consistency with sidebar
      title: "Templates",
      borderColor: COLORS.borderGreen,
      path: "/templates",
    },
    {
      icon: MessageSquareText, // New card for Template Message
      title: "Template Message",
      borderColor: COLORS.borderPink,
      path: "/template_message",
    },
    {
      icon: FileText,
      title: "Icebreaker Configuration",
      borderColor: COLORS.borderPurple,
      path: "/icebreakers-template",
    },
    {
      icon: Link2,
      title: "Website URL Configuration",
      borderColor: COLORS.borderIndigo,
      path: "/website-url-configuration",
    },
    {
      icon: FileText,
      title: "Persistent Menu",
      borderColor: COLORS.borderTeal, // Adjusted color to avoid duplication
      path: "/systemmenus", // UPDATED: Path now matches the sidebar navigation
    },
    {
      icon: Truck,
      title: "Shipping Settings",
      borderColor: COLORS.borderGray, // Adjusted color
      path: "/shipping-setting",
    },
    {
      icon: CreditCard,
      title: "Razorpay Connect",
      borderColor: COLORS.borderBlue, // Adjusted color
      path: "/razorpay_connect",
    },
  ];

  return (
    <div className="min-h-screen p-6 bg-white">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black mb-2">Settings</h1>
          <p className="text-gray-600">Manage your account settings, preferences, and integrations.</p>
        </div>

        {/* Settings Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {settingItems.map((item, index) => (
            <Link to={item.path} key={index} className="no-underline">
              <Card
                className="shadow-xl hover:shadow-2xl transition-all duration-300 bg-white hover:bg-gray-50 transform hover:-translate-y-1 h-full"
                style={{ borderTop: `4px solid ${item.borderColor}` }}
              >
                <CardContent className="pt-6">
                  <div className="flex flex-col items-start h-full">
                    {/* Icon */}
                    <div 
                      className="p-3 rounded-full shadow-lg mb-4"
                      style={{ backgroundColor: item.borderColor }}
                    >
                      <item.icon className="w-6 h-6 text-white" />
                    </div>

                    {/* Text Content */}
                    <div className="flex-grow">
                      <h3 className="text-lg font-bold text-gray-800 mb-1">{item.title}</h3>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
