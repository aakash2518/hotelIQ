const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

// Types matching Prisma models
export interface Hotel {
  id: string
  name: string
  city: string
  country: string
  starRating: number
  createdAt: string
  latestPrice?: HotelPrice | null
  prices?: HotelPrice[]
}

export interface HotelPrice {
  id: string
  hotelId: string
  source: string
  priceUSD: number
  checkIn: string
  checkOut: string
  recordedAt: string
}

export interface Campaign {
  id: string
  name: string
  targetCity: string
  targetSegment: string
  channel: string
  content: string
  status: string
  metrics?: {
    sent: number
    opened: number
    clicked: number
    converted: number
  }
  agentDecision?: {
    reasoning: string
    confidence: number
    expectedCTR: number
  }
  createdAt: string
  updatedAt: string
}

export interface AgentLog {
  id: string
  agentName: string
  action: string
  input: any
  output: any
  latencyMs: number
  tokenCost?: number
  confidence?: number
  createdAt: string
}

export interface DashboardMetrics {
  totalCampaigns: number
  activeCampaigns: number
  avgCTR: number
  agentRunsToday: number
}

export interface WorkflowResult {
  research: any
  decision: any
  campaign: any
  summary: {
    totalLatencyMs: number
    totalTokens: number
    success: boolean
  }
}

// API Client Functions
export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  try {
    const [campaigns, agentLogs] = await Promise.all([
      fetchCampaigns(),
      fetchAgentLogs()
    ])

    const totalCampaigns = campaigns.length
    const activeCampaigns = campaigns.filter(c => c.status === 'active').length
    
    // Calculate average CTR
    const campaignsWithMetrics = campaigns.filter(c => c.metrics && c.metrics.sent > 0)
    const avgCTR = campaignsWithMetrics.length > 0
      ? campaignsWithMetrics.reduce((sum, c) => {
          const ctr = c.metrics && c.metrics.sent ? (c.metrics.clicked / c.metrics.sent) * 100 : 0
          return sum + ctr
        }, 0) / campaignsWithMetrics.length
      : 0

    // Agent runs today
    const today = new Date().toISOString().split('T')[0]
    const agentRunsToday = agentLogs.filter(log => 
      log.createdAt.startsWith(today) && log.agentName === 'orchestrator'
    ).length

    return {
      totalCampaigns,
      activeCampaigns,
      avgCTR: Math.round(avgCTR * 100) / 100,
      agentRunsToday
    }
  } catch (error) {
    console.error('Failed to fetch dashboard metrics:', error)
    throw new Error('Failed to fetch dashboard metrics')
  }
}

export async function fetchCampaigns(): Promise<Campaign[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/campaigns`)
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || 'Failed to fetch campaigns')
    }
    const result = await response.json()
    return result.data || []
  } catch (error) {
    console.error('Failed to fetch campaigns:', error)
    throw error
  }
}

export async function fetchHotels(): Promise<Hotel[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/hotels`)
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || 'Failed to fetch hotels')
    }
    const result = await response.json()
    return result.data || []
  } catch (error) {
    console.error('Failed to fetch hotels:', error)
    throw error
  }
}

export async function fetchHotel(id: string): Promise<Hotel> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/hotels/${id}`)
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || 'Failed to fetch hotel')
    }
    const result = await response.json()
    return result.data
  } catch (error) {
    console.error(`Failed to fetch hotel ${id}:`, error)
    throw error
  }
}

export async function fetchAgentLogs(limit: number = 50): Promise<AgentLog[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/agents/logs?limit=${limit}`)
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || 'Failed to fetch agent logs')
    }
    const result = await response.json()
    return result.data || []
  } catch (error) {
    console.error('Failed to fetch agent logs:', error)
    throw error
  }
}

export async function runAgentWorkflow(query?: string): Promise<WorkflowResult> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/agents/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || 'Failed to run agent workflow')
    }
    
    const result = await response.json()
    return result.data
  } catch (error) {
    console.error('Failed to run agent workflow:', error)
    throw error
  }
}

export async function updateCampaignMetrics(
  id: string, 
  metrics: { sent: number; opened: number; clicked: number; converted: number }
): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/agents/campaigns/${id}/metrics`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metrics),
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || 'Failed to update campaign metrics')
    }
  } catch (error) {
    console.error(`Failed to update campaign metrics for ${id}:`, error)
    throw error
  }
}


// Utility functions for data processing
export function calculatePriceTrend(prices: HotelPrice[]): 'up' | 'stable' | 'down' {
  if (prices.length < 2) return 'stable'
  
  const recent = prices.slice(0, Math.min(5, prices.length))
  const older = prices.slice(Math.min(5, prices.length), Math.min(10, prices.length))
  
  if (recent.length === 0 || older.length === 0) return 'stable'
  
  const recentAvg = recent.reduce((sum, p) => sum + p.priceUSD, 0) / recent.length
  const olderAvg = older.reduce((sum, p) => sum + p.priceUSD, 0) / older.length
  
  const changePercent = ((recentAvg - olderAvg) / olderAvg) * 100
  
  if (changePercent > 10) return 'up'
  if (changePercent < -10) return 'down'
  return 'stable'
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}