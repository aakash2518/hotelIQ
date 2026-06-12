const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

// Mock data for demo purposes
const MOCK_DATA = {
  hotels: [
    {
      id: '1',
      name: 'Paris Grand Hotel',
      city: 'Paris',
      country: 'France',
      starRating: 5,
      createdAt: new Date().toISOString(),
      latestPrice: {
        id: '1',
        hotelId: '1',
        source: 'booking.com',
        priceUSD: 299,
        checkIn: '2026-07-01',
        checkOut: '2026-07-03',
        recordedAt: new Date().toISOString()
      }
    },
    {
      id: '2',
      name: 'Dubai Marina Resort',
      city: 'Dubai',
      country: 'UAE',
      starRating: 4,
      createdAt: new Date().toISOString(),
      latestPrice: {
        id: '2',
        hotelId: '2',
        source: 'expedia.com',
        priceUSD: 189,
        checkIn: '2026-07-01',
        checkOut: '2026-07-03',
        recordedAt: new Date().toISOString()
      }
    },
    {
      id: '3',
      name: 'Tokyo Bay Hotel',
      city: 'Tokyo',
      country: 'Japan',
      starRating: 4,
      createdAt: new Date().toISOString(),
      latestPrice: {
        id: '3',
        hotelId: '3',
        source: 'hotels.com',
        priceUSD: 245,
        checkIn: '2026-07-01',
        checkOut: '2026-07-03',
        recordedAt: new Date().toISOString()
      }
    }
  ],
  campaigns: [
    {
      id: '1',
      name: 'Summer Paris Getaway',
      targetCity: 'Paris',
      targetSegment: 'luxury',
      channel: 'email',
      content: 'Discover the magic of Paris this summer with exclusive luxury hotel deals.',
      status: 'active',
      metrics: { sent: 5000, opened: 1250, clicked: 187, converted: 23 },
      agentDecision: { reasoning: 'High engagement for luxury Paris hotels in summer', confidence: 0.85, expectedCTR: 3.5 },
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: '2',
      name: 'Dubai Business Travel',
      targetCity: 'Dubai',
      targetSegment: 'business',
      channel: 'push',
      content: 'Premium business accommodations in Dubai Marina. Book now for Q3 travel.',
      status: 'active',
      metrics: { sent: 3200, opened: 896, clicked: 108, converted: 15 },
      agentDecision: { reasoning: 'Strong business travel demand to Dubai', confidence: 0.78, expectedCTR: 3.2 },
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: '3',
      name: 'Tokyo Culture Experience',
      targetCity: 'Tokyo',
      targetSegment: 'leisure',
      channel: 'sms',
      content: 'Experience authentic Tokyo culture. Limited-time offers on traditional district hotels.',
      status: 'draft',
      agentDecision: { reasoning: 'Growing interest in cultural tourism to Japan', confidence: 0.72, expectedCTR: 2.8 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  agentLogs: [
    {
      id: '1',
      agentName: 'research',
      action: 'analyze_market_trends',
      input: { city: 'Paris', segment: 'luxury' },
      output: { trend: 'increasing', confidence: 0.85, insights: 'Summer luxury bookings up 23%' },
      latencyMs: 2340,
      tokenCost: 150,
      confidence: 0.85,
      createdAt: new Date().toISOString()
    },
    {
      id: '2',
      agentName: 'decisioning',
      action: 'create_campaign_strategy',
      input: { insights: 'Summer luxury bookings up 23%' },
      output: { strategy: 'email campaign', reasoning: 'High engagement for luxury segment' },
      latencyMs: 1890,
      tokenCost: 120,
      confidence: 0.78,
      createdAt: new Date().toISOString()
    },
    {
      id: '3',
      agentName: 'execution',
      action: 'generate_content',
      input: { strategy: 'email campaign', city: 'Paris' },
      output: { content: 'Discover the magic of Paris this summer...', channel: 'email' },
      latencyMs: 3120,
      tokenCost: 200,
      confidence: 0.82,
      createdAt: new Date().toISOString()
    }
  ]
}

// Check if we're in production and API is not available
const USE_MOCK_DATA = !process.env.NEXT_PUBLIC_API_URL

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
  if (USE_MOCK_DATA) {
    const campaigns = MOCK_DATA.campaigns
    const agentLogs = MOCK_DATA.agentLogs
    
    const totalCampaigns = campaigns.length
    const activeCampaigns = campaigns.filter(c => c.status === 'active').length
    
    // Calculate average CTR from mock campaigns
    const campaignsWithMetrics = campaigns.filter(c => c.metrics && c.metrics.sent > 0)
    const avgCTR = campaignsWithMetrics.length > 0
      ? campaignsWithMetrics.reduce((sum, c) => {
          const ctr = c.metrics && c.metrics.sent ? (c.metrics.clicked / c.metrics.sent) * 100 : 0
          return sum + ctr
        }, 0) / campaignsWithMetrics.length
      : 0

    return {
      totalCampaigns,
      activeCampaigns, 
      avgCTR: Math.round(avgCTR * 100) / 100,
      agentRunsToday: agentLogs.length
    }
  }

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
  if (USE_MOCK_DATA) {
    return Promise.resolve(MOCK_DATA.campaigns)
  }

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
  if (USE_MOCK_DATA) {
    return Promise.resolve(MOCK_DATA.hotels)
  }

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
  if (USE_MOCK_DATA) {
    const hotel = MOCK_DATA.hotels.find(h => h.id === id)
    if (!hotel) {
      throw new Error(`Hotel ${id} not found`)
    }
    return Promise.resolve(hotel)
  }

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
  if (USE_MOCK_DATA) {
    return Promise.resolve(MOCK_DATA.agentLogs.slice(0, limit))
  }

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
  if (USE_MOCK_DATA) {
    // Simulate agent workflow with mock data
    await new Promise(resolve => setTimeout(resolve, 2000)) // Simulate API delay
    
    return Promise.resolve({
      research: {
        insights: 'Market analysis complete. High demand detected for luxury accommodations.',
        confidence: 0.85,
        sources: ['booking.com', 'expedia.com', 'hotels.com']
      },
      decision: {
        strategy: 'Premium email campaign targeting luxury segment',
        reasoning: 'Data shows 23% increase in luxury bookings for summer season',
        confidence: 0.82,
        expectedCTR: 3.5
      },
      campaign: {
        name: `AI-Generated Campaign ${Date.now()}`,
        content: 'Experience luxury like never before. Exclusive summer deals on premium accommodations.',
        channel: 'email',
        targetSegment: 'luxury'
      },
      summary: {
        totalLatencyMs: 2000,
        totalTokens: 450,
        success: true
      }
    })
  }

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
  if (USE_MOCK_DATA) {
    // Simulate updating mock data
    const campaign = MOCK_DATA.campaigns.find(c => c.id === id)
    if (campaign) {
      campaign.metrics = metrics
      campaign.updatedAt = new Date().toISOString()
    }
    return Promise.resolve()
  }

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