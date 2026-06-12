'use client'

import { useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { updateCampaignMetrics, formatDateTime, type Campaign } from '@/lib/api'

interface CampaignSlideOverProps {
  campaign: Campaign | null
  onClose: () => void
  onUpdate: () => void
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void
}

export function CampaignSlideOver({ campaign, onClose, onUpdate, onShowToast }: CampaignSlideOverProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [metrics, setMetrics] = useState({
    sent: 1000,
    opened: 250,
    clicked: 85,
    converted: 12
  })

  if (!campaign) return null

  const handleMarkCompleted = async () => {
    setIsUpdating(true)
    try {
      await updateCampaignMetrics(campaign.id, metrics)
      onUpdate()
      onClose()
      onShowToast('Campaign marked as completed!', 'success')
    } catch (error) {
      console.error('Failed to update campaign:', error)
      onShowToast(error instanceof Error ? error.message : 'Failed to update campaign', 'error')
    } finally {
      setIsUpdating(false)
    }
  }


  const getConfidenceBadgeClass = (confidence: number) => {
    if (confidence > 0.8) return 'confidence-high'
    if (confidence > 0.6) return 'confidence-medium'
    return 'confidence-low'
  }

  const calculateCTR = () => {
    const currentMetrics = campaign.metrics || metrics
    if (currentMetrics.sent === 0) return 'N/A'
    return `${((currentMetrics.clicked / currentMetrics.sent) * 100).toFixed(1)}%`
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
          <div className="pointer-events-none relative w-screen max-w-md">
            <div className="pointer-events-auto flex h-full flex-col overflow-y-scroll bg-[#111111] border-l border-[#1f1f1f] py-6 shadow-xl">
              {/* Header */}
              <div className="px-4 sm:px-6">
                <div className="flex items-start justify-between">
                  <h2 className="text-lg font-medium text-white">Campaign Details</h2>
                  <div className="ml-3 flex h-7 items-center">
                    <button
                      onClick={onClose}
                      className="rounded-md text-gray-400 hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="relative mt-6 flex-1 px-4 sm:px-6">
                <div className="space-y-6">
                  {/* Campaign Info */}
                  <div>
                    <h3 className="text-lg font-medium text-white mb-3">{campaign.name}</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">City:</span>
                        <div className="text-white">{campaign.targetCity}</div>
                      </div>
                      <div>
                        <span className="text-gray-400">Segment:</span>
                        <div className="text-white capitalize">{campaign.targetSegment}</div>
                      </div>
                      <div>
                        <span className="text-gray-400">Channel:</span>
                        <div className="text-white capitalize">{campaign.channel}</div>
                      </div>
                      <div>
                        <span className="text-gray-400">Status:</span>
                        <div className="text-white capitalize">{campaign.status}</div>
                      </div>
                    </div>
                  </div>

                  {/* Campaign Content */}
                  <div>
                    <h4 className="text-md font-medium text-white mb-2">Campaign Content</h4>
                    <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-md p-4">
                      <pre className="text-sm text-gray-300 whitespace-pre-wrap">{campaign.content}</pre>
                    </div>
                  </div>

                  {/* Agent Decision */}
                  {campaign.agentDecision && (
                    <div>
                      <h4 className="text-md font-medium text-white mb-2">Agent Reasoning</h4>
                      <div className="space-y-3">
                        <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-md p-4">
                          <div className="text-sm text-gray-300">{campaign.agentDecision.reasoning}</div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div>
                            <span className="text-gray-400 text-sm">Confidence:</span>
                            <span className={`
                              ml-2 px-2 py-1 rounded-full text-xs font-medium
                              ${getConfidenceBadgeClass(campaign.agentDecision.confidence)}
                            `}>
                              {Math.round(campaign.agentDecision.confidence * 100)}%
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400 text-sm">Expected CTR:</span>
                            <span className="text-white ml-2">{campaign.agentDecision.expectedCTR}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Metrics */}
                  <div>
                    <h4 className="text-md font-medium text-white mb-2">Campaign Metrics</h4>
                    {campaign.metrics ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-md p-3 text-center">
                          <div className="text-lg font-semibold text-white">{campaign.metrics.sent.toLocaleString()}</div>
                          <div className="text-sm text-gray-400">Sent</div>
                        </div>
                        <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-md p-3 text-center">
                          <div className="text-lg font-semibold text-white">{campaign.metrics.opened.toLocaleString()}</div>
                          <div className="text-sm text-gray-400">Opened</div>
                        </div>
                        <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-md p-3 text-center">
                          <div className="text-lg font-semibold text-white">{campaign.metrics.clicked.toLocaleString()}</div>
                          <div className="text-sm text-gray-400">Clicked</div>
                        </div>
                        <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-md p-3 text-center">
                          <div className="text-lg font-semibold text-white">{campaign.metrics.converted.toLocaleString()}</div>
                          <div className="text-sm text-gray-400">Converted</div>
                        </div>
                        <div className="col-span-2 bg-[#0a0a0a] border border-[#1f1f1f] rounded-md p-3 text-center">
                          <div className="text-lg font-semibold text-white">{calculateCTR()}</div>
                          <div className="text-sm text-gray-400">CTR</div>
                        </div>
                      </div>
                    ) : campaign.status === 'active' ? (
                      <div>
                        <p className="text-gray-400 text-sm mb-4">Update metrics to mark campaign as completed:</p>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="block text-sm text-gray-400 mb-1">Sent</label>
                            <input
                              type="number"
                              value={metrics.sent}
                              onChange={(e) => setMetrics(prev => ({ ...prev, sent: parseInt(e.target.value) }))}
                              className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded px-3 py-2 text-white text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-400 mb-1">Opened</label>
                            <input
                              type="number"
                              value={metrics.opened}
                              onChange={(e) => setMetrics(prev => ({ ...prev, opened: parseInt(e.target.value) }))}
                              className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded px-3 py-2 text-white text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-400 mb-1">Clicked</label>
                            <input
                              type="number"
                              value={metrics.clicked}
                              onChange={(e) => setMetrics(prev => ({ ...prev, clicked: parseInt(e.target.value) }))}
                              className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded px-3 py-2 text-white text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-400 mb-1">Converted</label>
                            <input
                              type="number"
                              value={metrics.converted}
                              onChange={(e) => setMetrics(prev => ({ ...prev, converted: parseInt(e.target.value) }))}
                              className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded px-3 py-2 text-white text-sm"
                            />
                          </div>
                        </div>
                        <button
                          onClick={handleMarkCompleted}
                          disabled={isUpdating}
                          className={`
                            w-full px-4 py-2 rounded-md text-sm font-medium transition-colors
                            ${isUpdating
                              ? 'bg-blue-400 text-white cursor-not-allowed'
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }
                          `}
                        >
                          {isUpdating ? 'Updating...' : 'Mark as Completed'}
                        </button>
                      </div>
                    ) : (
                      <div className="text-gray-400 text-sm">No metrics available for this campaign.</div>
                    )}
                  </div>

                  {/* Timestamps */}
                  <div className="text-sm text-gray-400 space-y-1">
                    <div>Created: {formatDateTime(campaign.createdAt)}</div>
                    <div>Updated: {formatDateTime(campaign.updatedAt)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}