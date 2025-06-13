"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  MessageSquare,
  Bot,
  FileText,
  BarChart4,
  PieChart,
  Calendar,
  Layers,
  TrendingUp,
  Instagram,
  Filter,
  ChevronDown
} from "lucide-react"
import axios from "axios"

interface DailyStats {
  date: string
  robotMessages: number
  templateMessages: number
  carouselMessages: number
  commentReplies: number
  totalMessages?: number
}

interface ChartData {
  dailyStats: DailyStats[]
}

interface DashboardStats {
  totalResponses: number
  botMessages: number
  robotMessages: number
  templateMessages: number
  carouselMessages: number
  commentReplies: number
  loading: boolean
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalResponses: 0,
    botMessages: 0,
    robotMessages: 0,
    templateMessages: 0,
    carouselMessages: 0,
    commentReplies: 0,
    loading: true,
  })

  const [timeframe, setTimeframe] = useState("week")
  const [chartData, setChartData] = useState<ChartData | null>(null)
  const [] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  useEffect(() => {
    fetchDashboardData()

    const handleClickOutside = (event: MouseEvent) => {
      const dropdown = document.getElementById("timeframe-dropdown")
      if (
        dropdown &&
        !dropdown.contains(event.target as Node) &&
        !(event.target as Element).closest('button[type="button"]')
      ) {
        dropdown.classList.add("hidden")
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [timeframe])

  const handleTimeframeChange = (value: string) => {
    setTimeframe(value)
    setDropdownOpen(false)
  }

  const fetchDashboardData = async () => {
    try {
      if (typeof window === "undefined") {
        setMockData()
        return
      }

      const tenentId = localStorage.getItem("tenentid")

      if (!tenentId) {
        setMockData()
        return
      }

      const response = await axios.get(
        `/api/dashboardroute/dashboard?tenentId=${tenentId}&timeframe=${timeframe}`
      )

      if (response.data.success) {
        setStats({
          totalResponses: response.data.totalResponses || 0,
          botMessages: response.data.botMessages || 0,
          robotMessages: response.data.robotMessages || 0,
          templateMessages: response.data.templateMessages || 0,
          carouselMessages: response.data.carouselMessages || 0,
          commentReplies: response.data.commentReplies || 0,
          loading: false,
        })

        setChartData(response.data.chartData)
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
      setMockData()
    }
  }

  const setMockData = () => {
    setStats({
      totalResponses: 15,
      botMessages: 11,
      robotMessages: 11,
      templateMessages: 4,
      carouselMessages: 0,
      commentReplies: 0,
      loading: false,
    })

    setChartData({
      dailyStats: [
        {
          date: "2025-05-08",
          robotMessages: 2,
          templateMessages: 1,
          carouselMessages: 0,
          commentReplies: 0,
        },
        {
          date: "2025-05-09",
          robotMessages: 1,
          templateMessages: 0,
          carouselMessages: 0,
          commentReplies: 0,
        },
        {
          date: "2025-05-10",
          robotMessages: 2,
          templateMessages: 1,
          carouselMessages: 0,
          commentReplies: 0,
        },
        {
          date: "2025-05-11",
          robotMessages: 1,
          templateMessages: 0,
          carouselMessages: 0,
          commentReplies: 0,
        },
        {
          date: "2025-05-12",
          robotMessages: 2,
          templateMessages: 1,
          carouselMessages: 0,
          commentReplies: 0,
        },
        {
          date: "2025-05-13",
          robotMessages: 1,
          templateMessages: 0,
          carouselMessages: 0,
          commentReplies: 0,
        },
        {
          date: "2025-05-14",
          robotMessages: 2,
          templateMessages: 1,
          carouselMessages: 0,
          commentReplies: 0,
        },
      ],
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 p-3 sm:p-5 md:p-8">
      <div className="max-w-7xl mx-auto">
      {/* Enhanced Header with Better UI */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 sm:mb-12 gap-4 sm:gap-0">
        {/* Logo/Title Section */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="bg-gradient-to-br from-pink-500 to-purple-600 p-2.5 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
            <Instagram className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800 bg-clip-text text-transparent bg-gradient-to-r from-pink-600 to-purple-600 truncate">
              Instagram Analytics
            </h1>
            <p className="text-sm text-gray-500 mt-1 hidden sm:block">
              Track your Instagram automation performance
            </p>
          </div>
        </div>

        {/* Controls Section - Enhanced */}
        <div className="flex flex-col sm:flex-row items-stretch gap-3 w-full sm:w-auto">
          {/* Enhanced Timeframe Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="bg-white w-full sm:w-48 flex items-center justify-between gap-2 px-4 py-3 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 text-gray-700 font-medium group"
            >
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-purple-500 group-hover:text-purple-600 transition-colors" />
                <span className="truncate">
                  {timeframe === "week" 
                    ? "Last 7 Days" 
                    : timeframe === "month" 
                      ? "Last 30 Days" 
                      : "Last 12 Months"}
                </span>
              </div>
              <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {dropdownOpen && (
              <div className="absolute mt-2 w-full sm:w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-10 overflow-hidden">
                <button
                  onClick={() => handleTimeframeChange("week")}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    timeframe === "week" 
                      ? "bg-purple-100 text-purple-700 font-medium" 
                      : "hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  Last 7 Days
                </button>
                <div className="border-t border-gray-100"></div>
                <button
                  onClick={() => handleTimeframeChange("month")}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    timeframe === "month" 
                      ? "bg-purple-100 text-purple-700 font-medium" 
                      : "hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  Last 30 Days
                </button>
                <div className="border-t border-gray-100"></div>
                <button
                  onClick={() => handleTimeframeChange("year")}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    timeframe === "year" 
                      ? "bg-purple-100 text-purple-700 font-medium" 
                      : "hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  Last 12 Months
                </button>
              </div>
            )}
          </div>

          {/* Enhanced Last Updated Card */}
          <div className="w-full md:w-auto bg-white px-4 py-2.5 rounded-lg shadow-md border border-gray-100 flex items-center gap-2">
      <Calendar className="h-4 w-4 text-purple-500" />
      <span className="text-sm text-gray-500">Last updated:</span>
      <span className="text-sm font-medium text-gray-700">
        {new Date().toLocaleDateString()}
      </span>
    </div>
  </div>
</div>
        {/* Loading State */}
        {stats.loading ? (
          <div className="flex justify-center items-center h-64 bg-white/50 backdrop-blur-sm rounded-2xl shadow-md">
            <div className="flex flex-col items-center">
              <div className="h-14 w-14 rounded-full border-4 border-t-purple-500 border-r-purple-300 border-b-purple-100 border-l-purple-300 animate-spin mb-4"></div>
              <p className="text-base text-gray-600 font-medium">Loading analytics data...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Stats Cards with Enhanced Styling */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 mb-8">
              {/* Card 1 - Total Responses */}
              <Card className="shadow-lg hover:shadow-xl transition-all duration-300 bg-white border-0 overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1.5">Total Responses</p>
                      <h3 className="text-3xl font-bold text-gray-800 mb-1">{stats.totalResponses}</h3>
                      <div className="flex items-center mt-2 text-sm text-green-600">
                        <TrendingUp className="w-4 h-4 mr-1" />
                        <span>12% from last {timeframe}</span>
                      </div>
                    </div>
                    <div className="bg-blue-100 p-3 rounded-xl group-hover:bg-blue-500 group-hover:text-white transition-colors duration-300">
                      <MessageSquare className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors duration-300" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Card 2 - Robot Messages */}
              <Card className="shadow-lg hover:shadow-xl transition-all duration-300 bg-white border-0 overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1.5">Robot Messages</p>
                      <h3 className="text-3xl font-bold text-gray-800 mb-1">{stats.robotMessages}</h3>
                      <div className="flex items-center mt-2 text-sm text-green-600">
                        <TrendingUp className="w-4 h-4 mr-1" />
                        <span>8% from last {timeframe}</span>
                      </div>
                    </div>
                    <div className="bg-indigo-100 p-3 rounded-xl group-hover:bg-indigo-500 group-hover:text-white transition-colors duration-300">
                      <Bot className="w-6 h-6 text-indigo-600 group-hover:text-white transition-colors duration-300" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Card 3 - Template Messages */}
              <Card className="shadow-lg hover:shadow-xl transition-all duration-300 bg-white border-0 overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1.5">Template Messages</p>
                      <h3 className="text-3xl font-bold text-gray-800 mb-1">{stats.templateMessages}</h3>
                      <div className="flex items-center mt-2 text-sm text-green-600">
                        <TrendingUp className="w-4 h-4 mr-1" />
                        <span>15% from last {timeframe}</span>
                      </div>
                    </div>
                    <div className="bg-purple-100 p-3 rounded-xl group-hover:bg-purple-500 group-hover:text-white transition-colors duration-300">
                      <FileText className="w-6 h-6 text-purple-600 group-hover:text-white transition-colors duration-300" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Card 4 - Carousel Messages */}
              <Card className="shadow-lg hover:shadow-xl transition-all duration-300 bg-white border-0 overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1.5">Carousel Messages</p>
                      <h3 className="text-3xl font-bold text-gray-800 mb-1">{stats.carouselMessages}</h3>
                      <div className="flex items-center mt-2 text-sm text-green-600">
                        <TrendingUp className="w-4 h-4 mr-1" />
                        <span>9% from last {timeframe}</span>
                      </div>
                    </div>
                    <div className="bg-green-100 p-3 rounded-xl group-hover:bg-green-500 group-hover:text-white transition-colors duration-300">
                      <Layers className="w-6 h-6 text-green-600 group-hover:text-white transition-colors duration-300" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Card 5 - Comment Replies */}
              <Card className="shadow-lg hover:shadow-xl transition-all duration-300 bg-white border-0 overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-pink-500"></div>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1.5">Comment Replies</p>
                      <h3 className="text-3xl font-bold text-gray-800 mb-1">{stats.commentReplies}</h3>
                      <div className="flex items-center mt-2 text-sm text-green-600">
                        <TrendingUp className="w-4 h-4 mr-1" />
                        <span>10% from last {timeframe}</span>
                      </div>
                    </div>
                    <div className="bg-pink-100 p-3 rounded-xl group-hover:bg-pink-500 group-hover:text-white transition-colors duration-300">
                      <MessageSquare className="w-6 h-6 text-pink-600 group-hover:text-white transition-colors duration-300" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts with Enhanced Styling */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
             {/* Chart 1 - Distribution */}
<Card className="shadow-lg bg-white border-0 overflow-hidden">
  <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-purple-50 to-pink-50 p-6">
    <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
      <PieChart className="w-5 h-5 text-purple-500" />
      Message Type Distribution
    </CardTitle>
  </CardHeader>
  <CardContent className="h-80 p-6">
    {stats.totalResponses > 0 ? (
      <div className="w-full h-full flex flex-col items-center justify-center gap-8">
        {/* Enhanced Circular Visualization */}
        <div className="relative w-48 h-48">
          {/* Background circle */}
          <div className="absolute inset-0 rounded-full border-8 border-gray-100"></div>
          
          {/* Dynamic Pie Chart using conic-gradient */}
          <div 
            className="absolute inset-0 rounded-full"
            style={{
              background: `conic-gradient(
                #6366F1 0% ${(stats.robotMessages / stats.totalResponses) * 100}%,
                #8B5CF6 ${(stats.robotMessages / stats.totalResponses) * 100}% ${((stats.robotMessages + stats.templateMessages) / stats.totalResponses) * 100}%,
                #10B981 ${((stats.robotMessages + stats.templateMessages) / stats.totalResponses) * 100}% ${((stats.robotMessages + stats.templateMessages + stats.carouselMessages) / stats.totalResponses) * 100}%,
                #EC4899 ${((stats.robotMessages + stats.templateMessages + stats.carouselMessages) / stats.totalResponses) * 100}% 100%
              )`,
              transform: 'rotate(0deg)'
            }}
          ></div>
          
          {/* Center text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-white rounded-full w-24 h-24 flex items-center justify-center shadow-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-800">
                  {stats.totalResponses}
                </div>
                <div className="text-xs text-gray-500">Total</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Enhanced Legend */}
        <div className="grid grid-cols-2 gap-4 w-full max-w-md">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-indigo-500 mr-3"></div>
              <span className="text-sm font-medium">Robot</span>
            </div>
            <span className="font-bold text-gray-800">
              {Math.round((stats.robotMessages / stats.totalResponses) * 100)}%
            </span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-purple-500 mr-3"></div>
              <span className="text-sm font-medium">Templates</span>
            </div>
            <span className="font-bold text-gray-800">
              {Math.round((stats.templateMessages / stats.totalResponses) * 100)}%
            </span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-green-500 mr-3"></div>
              <span className="text-sm font-medium">Carousel</span>
            </div>
            <span className="font-bold text-gray-800">
              {Math.round((stats.carouselMessages / stats.totalResponses) * 100)}%
            </span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-pink-500 mr-3"></div>
              <span className="text-sm font-medium">Replies</span>
            </div>
            <span className="font-bold text-gray-800">
              {Math.round((stats.commentReplies / stats.totalResponses) * 100)}%
            </span>
          </div>
        </div>
      </div>
    ) : (
      <div className="flex flex-col items-center justify-center gap-4 w-full h-full">
        <div className="bg-gray-100 p-6 rounded-full">
          <PieChart className="w-12 h-12 text-gray-400" />
        </div>
        <div className="text-base text-gray-500 text-center">
          No data available for the selected timeframe
        </div>
      </div>
    )}
  </CardContent>
</Card>
              {/* Chart 2 - Trends */}
              <Card className="shadow-lg bg-white border-0 overflow-hidden">
                <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
                  <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <BarChart4 className="w-5 h-5 text-blue-500" />
                    Response Trends
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-80 p-6">
                  {chartData?.dailyStats && chartData.dailyStats.length > 0 ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-8">
                      {/* Simple bar visualization */}
                      <div className="w-full flex items-end justify-between h-32 px-4">
                        {chartData.dailyStats.map((day, index) => {
                          const total = day.robotMessages + day.templateMessages + day.carouselMessages + day.commentReplies;
                          const height = total > 0 ? (total / 3) * 100 : 5; // Scale for visualization
                          return (
                            <div key={index} className="flex flex-col items-center gap-1 w-1/8">
                              <div 
                                className="w-6 rounded-t-md bg-gradient-to-t from-purple-500 to-indigo-500"
                                style={{ height: `${Math.min(100, height)}%` }}
                              ></div>
                              <span className="text-xs text-gray-500 mt-1">
                                {new Date(day.date).toLocaleDateString(undefined, { day: 'numeric' })}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-x-8 gap-y-4 w-full max-w-md">
                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                          <div className="text-sm text-gray-500 mb-1">Robot Messages</div>
                          <div className="text-lg font-bold text-indigo-600">
                            {chartData.dailyStats.reduce((sum, day) => sum + day.robotMessages, 0)}
                          </div>
                        </div>
                        
                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                          <div className="text-sm text-gray-500 mb-1">Template Messages</div>
                          <div className="text-lg font-bold text-purple-600">
                            {chartData.dailyStats.reduce((sum, day) => sum + day.templateMessages, 0)}
                          </div>
                        </div>
                        
                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                          <div className="text-sm text-gray-500 mb-1">Carousel Messages</div>
                          <div className="text-lg font-bold text-green-600">
                            {chartData.dailyStats.reduce((sum, day) => sum + day.carouselMessages, 0)}
                          </div>
                        </div>
                        
                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                          <div className="text-sm text-gray-500 mb-1">Comment Replies</div>
                          <div className="text-lg font-bold text-pink-600">
                            {chartData.dailyStats.reduce((sum, day) => sum + day.commentReplies, 0)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-4 w-full h-full">
                      <div className="bg-gray-100 p-6 rounded-full">
                        <BarChart4 className="w-12 h-12 text-gray-400" />
                      </div>
                      <div className="text-base text-gray-500 text-center">
                        No trend data available for the selected timeframe
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  )
}