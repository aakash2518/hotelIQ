'use client'

import { useState, useEffect } from 'react'
import { 
  MegaphoneIcon,
  PlayCircleIcon,
  ChartBarIcon,
  CpuChipIcon 
} from '@heroicons/react/24/outline'
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts'
import { MetricCard } from '@/components/MetricCard'
import { LiveIndicator } from '@/components/LiveIndicator'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { ErrorState } from '@/components/ErrorState'
import { Toast } from '@/components/Toast'
import { 
  fetchDashboardMetrics, 
  fetchHotels, 
  fetchCampaigns, 
  fetchAgentLogs,
  runAgentWorkflow,
  formatCurrency,
  formatDateTime
} from '@/lib/api'
import type { DashboardMetrics, Hotel, Campaign, AgentLog } from '@/lib/api'

export default function Dashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [priceChartData, setPriceChartData] = useState<any[]>([])
  const [campaignChartData, setCampaignChartData] = useState<any[]>([])
  const [latestInsights, setLatestInsights] = useState<AgentLog[]>([])
  const [isLive, setIsLive] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [isLoadingWorkflow, setIsLoadingWorkflow] = useState(false)

  useEffect(() => {
    let active = true;
    
    const initializeData = async () => {
      try {
        await loadDashboardData()
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
      } finally {
        if (active) setIsLoading(false)
      }
    };
    
    initializeData();

    // Set up live polling
    setIsLive(true)
    const interval = setInterval(async () => {
      try {
        await loadDashboardData()
      } catch (err) {
        console.error('Silent dashboard polling update failed:', err)
      }
    }, 10000)
    
    return () => {
      active = false
      clearInterval(interval)
      setIsLive(false)
    }
  }, [])

  const loadDashboardData = async () => {
    const [metricsData, hotels, campaigns, logs] = await Promise.all([
      fetchDashboardMetrics(),
      fetchHotels(),
      fetchCampaigns(),
      fetchAgentLogs(50)
    ])

    setMetrics(metricsData)
    
    // Process price chart data (top 3 cities: Paris, Dubai, Tokyo)
    const topCities = ['Paris', 'Dubai', 'Tokyo']
    const cityPrices: { [date: string]: { [key: string]: string | number } } = {}
    
    // Get last 30 days of data
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    
    topCities.forEach(city => {
      const cityHotels = hotels.filter(h => h.city === city)
      const dailyPrices: { [date: string]: number[] } = {}
      
      cityHotels.forEach(hotel => {
        if (hotel.prices) {
          hotel.prices
            .filter(p => new Date(p.recordedAt) >= thirtyDaysAgo)
            .forEach(price => {
              const date = new Date(price.recordedAt).toISOString().split('T')[0]
              if (!dailyPrices[date]) dailyPrices[date] = []
              dailyPrices[date].push(price.priceUSD)
            })
        }
      })
      
      // Calculate daily averages
      Object.entries(dailyPrices).forEach(([date, prices]) => {
        if (!cityPrices[date]) {
          cityPrices[date] = { date }
        }
        cityPrices[date][city] = prices.reduce((sum, p) => sum + p, 0) / prices.length
      })
    })
    
    const priceData = Object.values(cityPrices)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-30)
    
    setPriceChartData(priceData)

    // Process campaign performance data
    const channelPerformance: { [channel: string]: { clicks: number; sent: number } } = {}
    
    campaigns.forEach(campaign => {
      if (campaign.metrics?.sent && campaign.metrics.sent > 0) {
        if (!channelPerformance[campaign.channel]) {
          channelPerformance[campaign.channel] = { clicks: 0, sent: 0 }
        }
        channelPerformance[campaign.channel].clicks += campaign.metrics?.clicked || 0
        channelPerformance[campaign.channel].sent += campaign.metrics?.sent || 0
      }
    })

    const campaignData = Object.entries(channelPerformance).map(([channel, data]) => ({
      channel: channel.charAt(0).toUpperCase() + channel.slice(1),
      conversionRate: data.sent > 0 ? (data.clicks / data.sent) * 100 : 0
    }))

    setCampaignChartData(campaignData)

    // Get latest research insights
    const researchLogs = logs
      .filter(log => log.agentName === 'research')
      .slice(0, 3)
    
    setLatestInsights(researchLogs)
    setError(null)
  }

  const handleRunAnalysis = async () => {
    setIsLoadingWorkflow(true)
    try {
      await runAgentWorkflow('Analyze current hotel market trends and find new opportunities')
      setToast({ message: 'New analysis completed successfully!', type: 'success' })
      await loadDashboardData()
    } catch (error) {
      console.error('Failed to run analysis:', error)
      setToast({ message: 'Analysis failed. Please try again.', type: 'error' })
    } finally {
      setIsLoadingWorkflow(false)
    }
  }

  const getConfidenceBadgeClass = (confidence: number) => {
    if (confidence > 0.8) return 'confidence-high'
    if (confidence > 0.6) return 'confidence-medium'
    return 'confidence-low'
  }

  if (error) {
    return <ErrorState message={error} onRetry={async () => {
      setIsLoading(true);
      setError(null);
      try {
        await loadDashboardData();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to reload dashboard');
      } finally {
        setIsLoading(false);
      }
    }} />;
  }

  if (isLoading || !metrics) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-800 rounded w-1/4 animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <LoadingSkeleton rows={3} className="card p-6 h-28" />
          <LoadingSkeleton rows={3} className="card p-6 h-28" />
          <LoadingSkeleton rows={3} className="card p-6 h-28" />
          <LoadingSkeleton rows={3} className="card p-6 h-28" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-6 h-80">
            <LoadingSkeleton rows={8} />
          </div>
          <div className="card p-6 h-80">
            <LoadingSkeleton rows={8} />
          </div>
        </div>
      </div>
    )
  }


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <LiveIndicator isActive={isLive} />
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Campaigns"
          value={metrics.totalCampaigns}
          icon={MegaphoneIcon}
        />
        <MetricCard
          title="Active Campaigns"
          value={metrics.activeCampaigns}
          icon={PlayCircleIcon}
        />
        <MetricCard
          title="Avg Campaign CTR"
          value={`${metrics.avgCTR}%`}
          icon={ChartBarIcon}
        />
        <MetricCard
          title="Agent Runs Today"
          value={metrics.agentRunsToday}
          icon={CpuChipIcon}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Price Trends Chart */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Hotel Price Trends (30 Days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={priceChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
              <XAxis 
                dataKey="date" 
                stroke="#6b7280"
                fontSize={12}
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis 
                stroke="#6b7280"
                fontSize={12}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#111111',
                  border: '1px solid #1f1f1f',
                  borderRadius: '6px',
                  color: '#ffffff'
                }}
                labelFormatter={(value) => new Date(value).toLocaleDateString()}
                formatter={(value, name) => {
                  const numValue = Number(value) || 0;
                  return [`$${Math.round(numValue)}`, name || ''];
                }}
              />
              <Line type="monotone" dataKey="Paris" stroke="#3b82f6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Dubai" stroke="#10b981" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Tokyo" stroke="#f59e0b" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Campaign Performance Chart */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Campaign Performance by Channel</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={campaignChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
              <XAxis dataKey="channel" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} tickFormatter={(value) => `${value}%`} />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#111111',
                  border: '1px solid #1f1f1f',
                  borderRadius: '6px',
                  color: '#ffffff'
                }}
                formatter={(value, name) => {
                  const numValue = Number(value) || 0;
                  return [`${numValue.toFixed(1)}%`, name || 'Conversion Rate'];
                }}
              />
              <Bar dataKey="conversionRate" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Latest Agent Insights */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Latest Agent Insights</h3>
          <button
            type="button"
            onClick={handleRunAnalysis}
            disabled={isLoadingWorkflow}
            className={`
              px-4 py-2 rounded-md text-sm font-medium transition-colors
              ${isLoadingWorkflow
                ? 'bg-blue-400 text-white cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
              }
            `}
          >
            {isLoadingWorkflow ? 'Running...' : 'Run New Analysis'}
          </button>
        </div>
        
        {latestInsights.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            No insights available yet. Run a new analysis to get started.
          </div>
        ) : (
          <div className="space-y-4">
            {latestInsights.map((insight) => (
              <div key={insight.id} className="border border-[#1f1f1f] rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-gray-400">
                    {formatDateTime(insight.createdAt)}
                  </div>
                  {insight.confidence && (
                    <span className={`
                      px-2 py-1 rounded-full text-xs font-medium
                      ${getConfidenceBadgeClass(insight.confidence)}
                    `}>
                      {Math.round(insight.confidence * 100)}% confidence
                    </span>
                  )}
                </div>
                <div className="text-white">
                  {insight.output?.insights || 'Analysis completed'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}
