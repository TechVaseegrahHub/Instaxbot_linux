import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Bot, FileText, ArrowUpRight, Calendar, Layers, Instagram, ShoppingCart, DollarSign, Hash } from "lucide-react";
import { PieChart as RechartsPie, Pie, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, BarChart, Bar } from "recharts";

// Define types for chart data
interface DailyStats {
  date: string;
  robotMessages: number;
  templateMessages: number;
  carouselMessages: number;
  commentReplies: number;
  orders: number;
  orderAmount?: number;
  totalMessages?: number;
}

interface ChartData {
  dailyStats: DailyStats[];
}

interface AllTimeStats {
  totalOrders: number;
  totalRevenue: number;
  totalCount: number;
  activeCustomers?: number;
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
      activeCustomers: 0
    }
  });
  
  const [timeframe, setTimeframe] = useState("month");
  const [chartData, setChartData] = useState<ChartData | null>(null);

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
      const apiUrl = `https://8def-2401-4900-8827-18db-d531-34b1-a4f4-2ef9.ngrok-free.app/api/dashboardroute/dashboard?timeframe=${timeframe}&tenentId=${tenentId}`;
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
            activeCustomers: data.allTimeStats?.activeCustomers || 0
          }
        };

        console.log('🔄 FRONTEND: Setting new stats:', newStats);
        setStats(newStats);

        if (data.chartData?.dailyStats) {
          console.log('📈 FRONTEND: Setting chart data:', data.chartData.dailyStats);
          setChartData(data.chartData);
        }
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

  // Generate pie chart data with new color scheme
  const getPieChartData = () => {
    return [
      { name: 'Robot Messages', value: stats.robotMessages, color: COLORS.salesBlue },
      { name: 'Templates', value: stats.templateMessages, color: COLORS.marketingPurple },
      { name: 'Carousel', value: stats.carouselMessages, color: COLORS.statusGreen },
      { name: 'Comment Replies', value: stats.commentReplies, color: COLORS.statusTeal },
    ];
  };

  // Generate template usage data with new colors
  const getTemplateUsageData = () => {
    return [
      { name: 'Order Inquiry', value: 65, color: COLORS.salesBlue },
      { name: 'Payment Help', value: 25, color: COLORS.marketingPurple },
      { name: 'Shipping Status', value: 10, color: COLORS.statusGreen },
    ];
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
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                    <span>18% from last {timeframe}</span>
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
                    <span>15% from last {timeframe}</span>
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
                    <span>22% from last {timeframe}</span>
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
                    <span>12% from last {timeframe}</span>
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
                    <span>10% from last {timeframe}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* First row of charts - Message Type Distribution & Response Trends */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Message Type Distribution */}
              <Card className="shadow-xl border-2 border-blue-500 bg-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium text-gray-800">Message Type Distribution</CardTitle>
                </CardHeader>
                <CardContent className="h-80">
                  {stats.totalResponses > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPie>
                        <Pie
                          data={getPieChartData()}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {getPieChartData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value, name) => [`${value} messages`, name]}
                          contentStyle={{
                            borderRadius: '0.5rem',
                            borderColor: COLORS.salesBlue,
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                          }}
                        />
                      </RechartsPie>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center w-full h-full">
                      <div className="text-gray-500">No data available</div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Response Trends */}
              <Card className="shadow-xl border-2 border-blue-500 bg-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium text-gray-800">Response Trends</CardTitle>
                </CardHeader>
                <CardContent className="h-80">
                  {chartData?.dailyStats && chartData.dailyStats.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData.dailyStats} margin={{ top: 5, right: 30, left: 20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#EFF6FF" />
                        <XAxis dataKey="date" tick={{fontSize: 11}} height={40} />
                        <YAxis tick={{fontSize: 11}} width={50} />
                        <Tooltip 
                          contentStyle={{
                            borderRadius: '0.5rem',
                            borderColor: COLORS.salesBlue,
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                          }}
                        />
                        <Legend verticalAlign="top" height={36}/>
                       <Line 
                         type="monotone" 
                         dataKey="robotMessages" 
                         name="Robot Messages" 
                         stroke={COLORS.salesBlue} 
                         strokeWidth={3} 
                         activeDot={{ r: 6 }} 
                       />
                       <Line 
                         type="monotone" 
                         dataKey="templateMessages" 
                         name="Templates" 
                         stroke={COLORS.marketingPurple} 
                         strokeWidth={3} 
                       />
                       <Line 
                         type="monotone" 
                         dataKey="carouselMessages" 
                         name="Carousels" 
                         stroke={COLORS.statusGreen} 
                         strokeWidth={3} 
                       />
                       <Line 
                         type="monotone" 
                         dataKey="commentReplies" 
                         name="Comment Replies" 
                         stroke={COLORS.statusTeal} 
                         strokeWidth={3} 
                       />
                     </LineChart>
                   </ResponsiveContainer>
                 ) : (
                   <div className="flex items-center justify-center w-full h-full">
                     <div className="text-gray-500">No trend data available</div>
                   </div>
                 )}
               </CardContent>
             </Card>
           </div>

           {/* Second row of charts - Template Usage & Orders Overview */}
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             {/* Template Usage */}
             <Card className="shadow-xl border-2 border-blue-500 bg-white">
               <CardHeader className="pb-2">
                 <CardTitle className="text-lg font-medium text-gray-800">Template Usage</CardTitle>
               </CardHeader>
               <CardContent className="h-80">
                 <ResponsiveContainer width="100%" height="100%">
                   <RechartsPie>
                     <Pie
                       data={getTemplateUsageData()}
                       cx="50%"
                       cy="50%"
                       outerRadius={90}
                       dataKey="value"
                       label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                       labelLine={false}
                     >
                       {getTemplateUsageData().map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={entry.color} />
                       ))}
                     </Pie>
                     <Tooltip 
                       formatter={(value, name) => [`${value} uses`, name]}
                       contentStyle={{
                         borderRadius: '0.5rem',
                         borderColor: COLORS.salesBlue,
                         boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                       }}
                     />
                   </RechartsPie>
                 </ResponsiveContainer>
               </CardContent>
             </Card>

             {/* Orders Bar Chart */}
             <Card className="shadow-xl border-2 border-blue-500 bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium text-gray-800">Orders Overview</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              {chartData?.dailyStats && chartData.dailyStats.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.dailyStats} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EFF6FF" />
                    <XAxis 
                      dataKey="date" 
                      tick={{fontSize: 11}} 
                      height={40}
                      angle={-45}
                      textAnchor="end"
                    />
                    <YAxis 
                      yAxisId="left" 
                      orientation="left" 
                      tick={{fontSize: 11}} 
                      width={50}
                      label={{ value: 'Orders', angle: -90, position: 'insideLeft' }}
                    />
                    <YAxis 
                      yAxisId="right" 
                      orientation="right" 
                      tick={{fontSize: 11}} 
                      width={70}
                      label={{ value: 'Amount (₹)', angle: 90, position: 'insideRight' }}
                    />
                    <Tooltip 
                      formatter={(value, name) => {
                        if (name === 'Orders') {
                          return [`${value} orders`, 'Orders'];
                        } else if (name === 'Amount (₹)') {
                          return [`₹${Number(value).toFixed(2)}`, 'Amount'];
                        }
                        return [value, name];
                      }}
                      labelFormatter={(label) => `Date: ${label}`}
                      contentStyle={{
                        borderRadius: '0.5rem',
                        borderColor: COLORS.salesBlue,
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                      }}
                    />
                    <Legend />
                    <Bar 
                      yAxisId="left"
                      dataKey="orders" 
                      name="Orders"
                      fill={COLORS.salesBlue}
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar 
                      yAxisId="right"
                      dataKey="orderAmount" 
                      name="Amount (₹)"
                      fill={COLORS.marketingPurple}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center w-full h-full">
                  <div className="text-center">
                    <div className="text-gray-500 mb-2">No orders data available</div>
                    <div className="text-sm text-gray-400">
                      Debug info: {chartData ? `${chartData.dailyStats?.length || 0} data points` : 'No chart data'}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
           </div>
         </div>
       )}
     </div>
   </div>
 );
}