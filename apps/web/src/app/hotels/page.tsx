'use client'

import { useState, useEffect, useCallback } from 'react'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { ErrorState } from '@/components/ErrorState'
import { Toast } from '@/components/Toast'
import { 
  fetchHotels, 
  calculatePriceTrend, 
  formatCurrency,
  type Hotel 
} from '@/lib/api'

const filterOptions = [
  { key: 'all', label: 'All' },
  { key: 'budget', label: 'Budget' },
  { key: 'mid-range', label: 'Mid-range' },
  { key: 'luxury', label: 'Luxury' },
]

const cityFlags: { [key: string]: string } = {
  'Paris': '🇫🇷',
  'Dubai': '🇦🇪',
  'Tokyo': '🇯🇵',
  'New York': '🇺🇸',
  'Barcelona': '🇪🇸',
}

export default function HotelsPage() {
  const [hotels, setHotels] = useState<Hotel[]>([])
  const [filteredHotels, setFilteredHotels] = useState<Hotel[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  const filterHotels = useCallback(() => {
    let filtered = hotels

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(hotel =>
        hotel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        hotel.city.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Filter by category
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(hotel => {
        const price = hotel.latestPrice?.priceUSD || 0
        switch (selectedFilter) {
          case 'budget': return price < 150
          case 'mid-range': return price >= 150 && price < 300
          case 'luxury': return price >= 300
          default: return true
        }
      })
    }

    setFilteredHotels(filtered)
  }, [hotels, searchQuery, selectedFilter])

  useEffect(() => {
    loadHotels()
  }, [])

  useEffect(() => {
    filterHotels()
  }, [filterHotels])

  const loadHotels = async () => {
    try {
      const data = await fetchHotels()
      setHotels(data)
      setError(null)
    } catch (err) {
      console.error('Failed to load hotels:', err)
      setError(err instanceof Error ? err.message : 'Failed to load hotels')
    } finally {
      setIsLoading(false)
    }
  }

  const getStarRating = (rating: number) => {
    return '⭐'.repeat(rating)
  }

  const getTrendIndicator = (hotel: Hotel) => {
    if (!hotel.prices || hotel.prices.length < 2) return '🟡'
    
    const trend = calculatePriceTrend(hotel.prices)
    switch (trend) {
      case 'up': return '🔴'
      case 'down': return '🟢'
      default: return '🟡'
    }
  }

  const getSparklineData = (hotel: Hotel) => {
    if (!hotel.prices) return []
    
    return hotel.prices
      .slice(0, 7)
      .reverse()
      .map((price, index) => ({
        x: index,
        y: price.priceUSD
      }))
  }

  if (error) {
    return <ErrorState message={error} onRetry={async () => {
      setIsLoading(true)
      setError(null)
      await loadHotels()
    }} />
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 bg-gray-800 rounded w-1/4 animate-pulse mb-2"></div>
          <div className="h-4 bg-gray-800 rounded w-1/2 animate-pulse"></div>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="h-10 bg-gray-800 rounded flex-1 animate-pulse"></div>
          <div className="h-10 bg-gray-800 rounded w-48 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="card p-6 h-64"><LoadingSkeleton rows={5} /></div>
          <div className="card p-6 h-64"><LoadingSkeleton rows={5} /></div>
          <div className="card p-6 h-64"><LoadingSkeleton rows={5} /></div>
        </div>
      </div>
    )
  }


  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Hotels</h1>
        <p className="mt-1 text-gray-400">Explore hotel pricing trends across our network</p>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by hotel name or city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-[#1f1f1f] bg-[#111111] rounded-md leading-5 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="flex space-x-1">
          {filterOptions.map((option) => (
            <button
              key={option.key}
              onClick={() => setSelectedFilter(option.key)}
              className={`
                px-4 py-2 text-sm font-medium rounded-md transition-colors
                ${selectedFilter === option.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-[#1f1f1f] text-gray-300 hover:bg-[#2a2a2a]'
                }
              `}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Hotels Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredHotels.map((hotel) => (
          <div key={hotel.id} className="card p-6 hover:border-blue-500 transition-colors">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center mb-1">
                  <h3 className="text-lg font-semibold text-white mr-2">{hotel.name}</h3>
                  <span className="text-lg">{cityFlags[hotel.city] || '🏨'}</span>
                </div>
                <p className="text-gray-400">{hotel.city}, {hotel.country}</p>
                <div className="flex items-center mt-1">
                  <span className="text-sm">{getStarRating(hotel.starRating)}</span>
                  <span className="ml-2 text-sm text-gray-400">({hotel.starRating} stars)</span>
                </div>
              </div>
              <div className="text-2xl">{getTrendIndicator(hotel)}</div>
            </div>

            {/* Price */}
            <div className="mb-4">
              <div className="text-2xl font-bold text-white">
                {hotel.latestPrice ? formatCurrency(hotel.latestPrice.priceUSD) : 'N/A'}
              </div>
              <div className="text-sm text-gray-400">per night</div>
            </div>

            {/* Sparkline */}
            {getSparklineData(hotel).length > 1 && (
              <div className="mb-4">
                <div className="text-xs text-gray-400 mb-1">7-day trend</div>
                <ResponsiveContainer width="100%" height={40}>
                  <LineChart data={getSparklineData(hotel)}>
                    <Line 
                      type="monotone" 
                      dataKey="y" 
                      stroke="#3b82f6" 
                      strokeWidth={2} 
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Source */}
            {hotel.latestPrice && (
              <div className="text-xs text-gray-400">
                Latest price from {hotel.latestPrice.source}
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredHotels.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400">
            {searchQuery || selectedFilter !== 'all' 
              ? 'No hotels match your search criteria'
              : 'No hotels available'
            }
          </div>
          {(searchQuery || selectedFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('')
                setSelectedFilter('all')
              }}
              className="mt-2 text-blue-400 hover:text-blue-300"
            >
              Clear filters
            </button>
          )}
        </div>
      )}


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
