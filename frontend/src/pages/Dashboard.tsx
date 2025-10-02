import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, Bot, FileText, ArrowUpRight, Calendar, Layers, Instagram, ShoppingCart, DollarSign, Hash } from "lucide-react";

// Updated AllTimeStats to include totalStoryComments
interface AllTimeStats {
  totalOrders: number;
  totalRevenue: number;
  totalCount: number;
  activeCustomers?: number;
  totalStoryComments: number; // New field for story comments
}

interface DashboardStats {
  totalResponses: number;
  botMessages: number;
  robotMessages: number;
  templateMessages: number;
  carouselMessages: number;
  commentReplies: number;
  totalOrders: number;
  totalOrderAmount: number;
  loading: boolean;
  allTimeStats: AllTimeStats;
}

export default function Dashboard() {
  // Get tenentId from localStorage
  const [tenentId, setTenentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Updated color palette to match the image
  const COLORS = {
    salesBlue: "#3B82F6",
    marketingPurple: "#8B5CF6",
    statusGreen: "#10B981",
    statusTeal: "#14B8A6",
    statusBlue: "#0EA5E9",
    statusIndigo: "#6366F1",
    statusViolet: "#8B5CF6",
    categoryBlue: "#3B82F6",
    categoryIndigo: "#6366F1",
    categoryPurple: "#8B5CF6",
    categoryPink: "#EC4899",
    gradientStart: "#3B82F6",
    gradientEnd: "#8B5CF6"
  };

  const [stats, setStats] = useState<DashboardStats>({
    totalResponses: 0,
    botMessages: 0,
    robotMessages: 0,
    templateMessages: 0, 
    carouselMessages: 0,
    commentReplies: 0,
    totalOrders: 0,
    totalOrderAmount: 0.00,
    loading: true,
    allTimeStats: {
      totalOrders: 0,
      totalRevenue: 0.00,
      totalCount: 0,
      activeCustomers: 0,
      totalStoryComments: 0 // Initial state for story comments
    }
  });
  
  const [timeframe, setTimeframe] = useState("today");

  // Initialize tenentId from localStorage on component mount
  useEffect(() => {
    const storedTenentId = localStorage.getItem('tenentid');
    console.log('🔍 FRONTEND: Retrieved tenentId from localStorage:', storedTenentId);
    setTenentId(storedTenentId);
  }, []);

  // Enhanced fetch data function with better error handling and logging
  const fetchData = async () => {
    if (!tenentId) {
      console.warn("❌ FRONTEND: No tenentId found in localStorage");
      setError("No tenant ID found");
      return;
    }

    console.log(`🚀 FRONTEND: Starting API call for tenentId: ${tenentId}, timeframe: ${timeframe}`);
    
    try {
      setStats(prev => ({ ...prev, loading: true }));
      setError(null);
      
      // Add additional headers for ngrok
      const apiUrl = `https://ddcf6bc6761a.ngrok-free.app/api/dashboardroute/dashboard?timeframe=${timeframe}&tenentId=${tenentId}`;
      console.log('📍 FRONTEND: API URL:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true', // Skip ngrok browser warning
          'Accept': 'application/json',
        },
      });

      console.log('📡 FRONTEND: Response status:', response.status);
      console.log('📡 FRONTEND: Response headers:', response.headers);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('📊 FRONTEND: Raw API response:', data);

      if (data.success) {
        console.log('✅ FRONTEND: API call successful, updating state...');
        console.log('📊 FRONTEND: Orders data from API:', {
          totalOrders: data.totalOrders,
          totalOrderAmount: data.totalOrderAmount,
          allTimeOrders: data.allTimeStats?.totalOrders,
          allTimeRevenue: data.allTimeStats?.totalRevenue
        });

        const newStats = {
          totalResponses: data.totalResponses || 0,
          botMessages: data.botMessages || 0,
          robotMessages: data.robotMessages || 0,
          templateMessages: data.templateMessages || 0,
          carouselMessages: data.carouselMessages || 0,
          commentReplies: data.commentReplies || 0,
          totalOrders: data.totalOrders || 0,
          totalOrderAmount: data.totalOrderAmount || 0.00,
          loading: false,
          allTimeStats: {
            totalOrders: data.allTimeStats?.totalOrders || 0,
            totalRevenue: data.allTimeStats?.totalRevenue || 0.00,
            totalCount: data.allTimeStats?.totalCount || 0,
            activeCustomers: data.allTimeStats?.activeCustomers || 0,
            totalStoryComments: data.allTimeStats?.totalStoryComments || 0 // Get story comments from API
          }
        };

        console.log('🔄 FRONTEND: Setting new stats:', newStats);
        setStats(newStats);
      } else {
        console.error('❌ FRONTEND: API returned success: false', data);
        setError(data.message || 'API call failed');
        setStats(prev => ({ ...prev, loading: false }));
      }
    } catch (error) {
      console.error("❌ FRONTEND: Failed to fetch dashboard data:", error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
      setStats(prev => ({ ...prev, loading: false }));
    }
  };

  // Effect to fetch data when tenentId or timeframe changes
  useEffect(() => {
    if (tenentId) {
      console.log('🔄 FRONTEND: tenentId or timeframe changed, fetching data...');
      fetchData();
    }
  }, [tenentId, timeframe]);

  const handleTimeframeChange = (selectedTimeframe: string) => {
    console.log(`🔄 FRONTEND: Timeframe changed to: ${selectedTimeframe}`);
    setTimeframe(selectedTimeframe);
  };

  // Get timeframe display text
  const getTimeframeDisplayText = () => {
    switch (timeframe) {
      case 'today':
        return 'Today';
      case 'week':
        return 'Last 7 Days';
      case 'month':
        return 'Last 30 Days';
      case 'year':
        return 'Last 12 Months';
      default:
        return 'Today';
    }
  };

  // Get growth percentage text based on timeframe
  const getGrowthText = () => {
    switch (timeframe) {
      case 'today':
        return 'vs yesterday';
      case 'week':
        return 'vs last week';
      case 'month':
        return 'vs last month';
      case 'year':
        return 'vs last year';
      default:
        return 'vs previous period';
    }
  };

  // Show loading or error state if no tenentId
  if (!tenentId) {
    return (
      <div className="min-h-screen p-6 bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-600 mb-4">
            <Instagram className="w-12 h-12 mx-auto mb-2" style={{ color: COLORS.salesBlue }} />
            No Tenant ID Found
          </div>
          <p className="text-gray-500">Please ensure you're logged in properly.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-black mb-2">Instagram Analytics Dashboard</h1>
            <p className="text-gray-600">Analytics for {getTimeframeDisplayText()}</p>
           
            {error && (
              <div className="text-red-500 text-sm mt-2 p-2 bg-red-50 rounded">
                Error: {error}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <select 
              value={timeframe}
              onChange={(e) => handleTimeframeChange(e.target.value)}
              className="bg-white px-3 py-2 rounded-lg border-2 border-blue-500 shadow-lg text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={stats.loading}
            >
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="year">Last 12 Months</option>
            </select>
            
            <div className="bg-white p-2 rounded-lg shadow-lg flex items-center gap-2 border-2 border-blue-500">
              <Calendar className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-gray-600">Last updated:</span>
              <span className="text-sm font-medium text-gray-800">{new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* All Time Statistics Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-black mb-4">All Time Statistics</h2>
          
          {/* Updated grid to be responsive for 4 items */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="shadow-xl hover:shadow-2xl transition-all duration-300 border-2 border-blue-500 bg-white hover:bg-gray-50 transform hover:-translate-y-1">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Orders</p>
                    <p className="text-xs text-gray-500 mb-1">All processed orders</p>
                    <h3 className="text-2xl font-bold text-gray-800 mt-1">{stats.allTimeStats.totalOrders}</h3>
                  </div>
                  <div 
                    className="p-3 rounded-full shadow-lg"
                    style={{ background: `linear-gradient(135deg, ${COLORS.salesBlue}, ${COLORS.marketingPurple})` }}
                  >
                    <ShoppingCart className="w-5 h-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-xl hover:shadow-2xl transition-all duration-300 border-2 border-purple-500 bg-white hover:bg-gray-50 transform hover:-translate-y-1">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                    <p className="text-xs text-gray-500 mb-1">From all orders</p>
                    <h3 className="text-2xl font-bold text-gray-800 mt-1">₹{stats.allTimeStats.totalRevenue.toLocaleString()}</h3>
                  </div>
                  <div 
                    className="p-3 rounded-full shadow-lg"
                    style={{ background: `linear-gradient(135deg, ${COLORS.marketingPurple}, ${COLORS.statusIndigo})` }}
                  >
                    <DollarSign className="w-5 h-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-xl hover:shadow-2xl transition-all duration-300 border-2 border-green-500 bg-white hover:bg-gray-50 transform hover:-translate-y-1">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Customers</p>
                    <p className="text-xs text-gray-500 mb-1">Repeat customers</p>
                    <h3 className="text-2xl font-bold text-gray-800 mt-1">
                      {stats.allTimeStats.activeCustomers || 0}
                    </h3>
                  </div>
                  <div 
                    className="p-3 rounded-full shadow-lg"
                    style={{ background: `linear-gradient(135deg, ${COLORS.statusGreen}, ${COLORS.statusTeal})` }}
                  >
                    <Hash className="w-5 h-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* New Card for Story Comments */}
            <Card className="shadow-xl hover:shadow-2xl transition-all duration-300 border-2 border-pink-500 bg-white hover:bg-gray-50 transform hover:-translate-y-1">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Story Comments</p>
                    <p className="text-xs text-gray-500 mb-1">All automated story replies</p>
                    <h3 className="text-2xl font-bold text-gray-800 mt-1">
                      {stats.allTimeStats.totalStoryComments.toLocaleString()}
                    </h3>
                  </div>
                  <div 
                    className="p-3 rounded-full shadow-lg"
                    style={{ background: `linear-gradient(135deg, ${COLORS.categoryPink}, ${COLORS.marketingPurple})` }}
                  >
                    <MessageSquare className="w-5 h-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Current Period Statistics */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-black mb-4">{getTimeframeDisplayText()} Analytics</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="shadow-xl hover:shadow-2xl transition-all duration-300 border-2 border-blue-500 bg-white hover:bg-gray-50 transform hover:-translate-y-1">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Orders - {getTimeframeDisplayText()}</p>
                    <p className="text-xs text-gray-500 mb-1">Total orders in {getTimeframeDisplayText().toLowerCase()}</p>
                    <h3 className="text-2xl font-bold text-gray-800 mt-1">{stats.totalOrders}</h3>
                  </div>
                  <div 
                    className="p-3 rounded-full shadow-lg"
                    style={{ background: `linear-gradient(135deg, ${COLORS.salesBlue}, ${COLORS.marketingPurple})` }}
                  >
                    <ShoppingCart className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div className="flex items-center mt-2 text-xs font-medium" style={{ color: COLORS.salesBlue }}>
                  <ArrowUpRight className="w-3 h-3 mr-1" />
                  <span>18% {getGrowthText()}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-xl hover:shadow-2xl transition-all duration-300 border-2 border-purple-500 bg-white hover:bg-gray-50 transform hover:-translate-y-1">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Revenue - {getTimeframeDisplayText()}</p>
                    <p className="text-xs text-gray-500 mb-1">Total revenue in {getTimeframeDisplayText().toLowerCase()}</p>
                    <h3 className="text-2xl font-bold text-gray-800 mt-1">₹{stats.totalOrderAmount.toLocaleString()}</h3>
                  </div>
                  <div 
                    className="p-3 rounded-full shadow-lg"
                    style={{ background: `linear-gradient(135deg, ${COLORS.marketingPurple}, ${COLORS.statusIndigo})` }}
                  >
                    <DollarSign className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div className="flex items-center mt-2 text-xs font-medium" style={{ color: COLORS.marketingPurple }}>
                  <ArrowUpRight className="w-3 h-3 mr-1" />
                  <span>22% {getGrowthText()}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {stats.loading ? (
          <div className="flex justify-center items-center h-64">
            <div 
              className="animate-spin rounded-full h-12 w-12 border-4 border-blue-300"
              style={{ borderTopColor: COLORS.salesBlue }}
            ></div>
            <span className="ml-4 text-gray-600">Loading dashboard data...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {/* Total Bot Responses Card */}
              <Card className="shadow-xl hover:shadow-2xl transition-all duration-300 border-2 border-blue-500 bg-white hover:bg-gray-50 transform hover:-translate-y-1">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Bot Responses</p>
                      <h3 className="text-2xl font-bold text-gray-800 mt-1">{stats.totalResponses.toLocaleString()}</h3>
                    </div>
                    <div 
                      className="p-2 rounded-full shadow-lg"
                      style={{ background: `linear-gradient(135deg, ${COLORS.salesBlue}, ${COLORS.marketingPurple})` }}
                    >
                      <Instagram className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div className="flex items-center mt-2 text-xs font-medium" style={{ color: COLORS.salesBlue }}>
                    <ArrowUpRight className="w-3 h-3 mr-1" />
                    <span>18% {getGrowthText()}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Robot Messages Card */}
              <Card className="shadow-xl hover:shadow-2xl transition-all duration-300 border-2 border-blue-500 bg-white hover:bg-gray-50 transform hover:-translate-y-1">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Robot Messages 🤖</p>
                      <h3 className="text-2xl font-bold text-gray-800 mt-1">{stats.robotMessages.toLocaleString()}</h3>
                    </div>
                    <div 
                      className="p-2 rounded-full shadow-lg"
                      style={{ background: `linear-gradient(135deg, ${COLORS.marketingPurple}, ${COLORS.statusIndigo})` }}
                    >
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div className="flex items-center mt-2 text-xs font-medium" style={{ color: COLORS.marketingPurple }}>
                    <ArrowUpRight className="w-3 h-3 mr-1" />
                    <span>15% {getGrowthText()}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Template Messages Card */}
              <Card className="shadow-xl hover:shadow-2xl transition-all duration-300 border-2 border-purple-500 bg-white hover:bg-gray-50 transform hover:-translate-y-1">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Template Messages</p>
                      <h3 className="text-2xl font-bold text-gray-800 mt-1">{stats.templateMessages.toLocaleString()}</h3>
                    </div>
                    <div 
                      className="p-2 rounded-full shadow-lg"
                      style={{ background: `linear-gradient(135deg, ${COLORS.statusIndigo}, ${COLORS.statusViolet})` }}
                    >
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div className="flex items-center mt-2 text-xs font-medium" style={{ color: COLORS.statusIndigo }}>
                    <ArrowUpRight className="w-3 h-3 mr-1" />
                    <span>22% {getGrowthText()}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Carousel Messages Card */}
              <Card className="shadow-xl hover:shadow-2xl transition-all duration-300 border-2 border-green-500 bg-white hover:bg-gray-50 transform hover:-translate-y-1">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Carousel Messages</p>
                      <h3 className="text-2xl font-bold text-gray-800 mt-1">{stats.carouselMessages.toLocaleString()}</h3>
                    </div>
                    <div 
                      className="p-2 rounded-full shadow-lg"
                      style={{ background: `linear-gradient(135deg, ${COLORS.statusGreen}, ${COLORS.statusTeal})` }}
                    >
                      <Layers className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div className="flex items-center mt-2 text-xs font-medium" style={{ color: COLORS.statusGreen }}>
                    <ArrowUpRight className="w-3 h-3 mr-1" />
                    <span>12% {getGrowthText()}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Comment Replies Card */}
              <Card className="shadow-xl hover:shadow-2xl transition-all duration-300 border-2 border-teal-500 bg-white hover:bg-gray-50 transform hover:-translate-y-1">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Comment Replies</p>
                      <h3 className="text-2xl font-bold text-gray-800 mt-1">{stats.commentReplies.toLocaleString()}</h3>
                    </div>
                    <div 
                      className="p-2 rounded-full shadow-lg"
                      style={{ background: `linear-gradient(135deg, ${COLORS.statusTeal}, ${COLORS.statusBlue})` }}
                    >
                      <MessageSquare className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div className="flex items-center mt-2 text-xs font-medium" style={{ color: COLORS.statusTeal }}>
                    <ArrowUpRight className="w-3 h-3 mr-1" />
                    <span>10% {getGrowthText()}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
