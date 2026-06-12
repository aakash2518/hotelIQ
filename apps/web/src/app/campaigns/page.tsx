'use client'

import { useState, useEffect } from 'react'
import { PlusIcon } from '@heroicons/react/24/outline'
import { CampaignModal } from '@/components/CampaignModal'
import { CampaignSlideOver } from '@/components/CampaignSlideOver'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { ErrorState } from '@/components/ErrorState'
import { Toast } from '@/components/Toast'
import { 
  fetchCampaigns, 
  formatDate,
  type Campaign 
} from '@/lib/api'

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  useEffect(() => {
    loadCampaigns()
  }, [])

  const loadCampaigns = async () => {
    try {
      const data = await fetchCampaigns()
      setCampaigns(data)
      setError(null)
    } catch (err) {
      console.error('Failed to load campaigns:', err)
      setError(err instanceof Error ? err.message : 'Failed to load campaigns')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'draft': return 'status-draft'
      case 'active': return 'status-active'
      case 'completed': return 'status-completed'
      default: return 'status-draft'
    }
  }

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email': return '📧'
      case 'push': return '📱'
      case 'sms': return '💬'
      default: return '📝'
    }
  }

  const calculateCTR = (campaign: Campaign) => {
    if (!campaign.metrics || campaign.metrics.sent === 0) return 'N/A'
    return `${((campaign.metrics.clicked / campaign.metrics.sent) * 100).toFixed(1)}%`
  }

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type })
  }

  if (error) {
    return <ErrorState message={error} onRetry={async () => {
      setIsLoading(true)
      setError(null)
      await loadCampaigns()
    }} />
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 bg-gray-800 rounded w-1/4 animate-pulse"></div>
          <div className="h-10 bg-gray-800 rounded w-32 animate-pulse"></div>
        </div>
        <div className="card p-6">
          <LoadingSkeleton rows={10} />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Campaigns</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon className="mr-2 h-4 w-4" />
          New Campaign
        </button>
      </div>

      {/* Campaigns Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#1f1f1f]">
            <thead className="bg-[#0a0a0a]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  City
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Segment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Channel
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  CTR
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f1f1f]">
              {campaigns.map((campaign) => (
                <tr
                  key={campaign.id}
                  onClick={() => setSelectedCampaign(campaign)}
                  className="hover:bg-[#1a1a1a] cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-white">{campaign.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-300">{campaign.targetCity}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-300 capitalize">{campaign.targetSegment}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="mr-2">{getChannelIcon(campaign.channel)}</span>
                      <span className="text-sm text-gray-300 capitalize">{campaign.channel}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`
                      inline-flex px-2 py-1 text-xs font-semibold rounded-full
                      ${getStatusBadgeClass(campaign.status)}
                    `}>
                      {campaign.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {calculateCTR(campaign)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {formatDate(campaign.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {campaigns.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400">No campaigns found</div>
              <button
                onClick={() => setIsModalOpen(true)}
                className="mt-2 text-blue-400 hover:text-blue-300"
              >
                Create your first campaign
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <CampaignModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          loadCampaigns()
          setIsModalOpen(false)
          showToast('Campaign created successfully!', 'success')
        }}
        onShowToast={showToast}
      />

      <CampaignSlideOver
        campaign={selectedCampaign}
        onClose={() => setSelectedCampaign(null)}
        onUpdate={loadCampaigns}
        onShowToast={showToast}
      />

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