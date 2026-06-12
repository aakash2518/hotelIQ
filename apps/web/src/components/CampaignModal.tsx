'use client'

import { useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { runAgentWorkflow } from '@/lib/api'

interface CampaignModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void
}

export function CampaignModal({ isOpen, onClose, onSuccess, onShowToast }: CampaignModalProps) {
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState('')

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      // Show loading steps
      setCurrentStep('🔍 Researching market...')
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      setCurrentStep('🧠 Making decisions...')
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      setCurrentStep('✍️ Generating content...')
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Run the actual workflow
      await runAgentWorkflow(query || undefined)
      
      setCurrentStep('✅ Campaign ready!')
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      onSuccess()
      setQuery('')
      setCurrentStep('')
    } catch (error) {
      console.error('Failed to create campaign:', error)
      setCurrentStep('❌ Failed to create campaign')
      onShowToast(error instanceof Error ? error.message : 'Failed to create campaign', 'error')
      await new Promise(resolve => setTimeout(resolve, 2000))
      setCurrentStep('')
    } finally {
      setIsLoading(false)
    }
  }


  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="relative transform overflow-hidden rounded-lg bg-[#111111] border border-[#1f1f1f] px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
          <div className="absolute right-0 top-0 pr-4 pt-4">
            <button
              onClick={onClose}
              className="rounded-md text-gray-400 hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="sm:flex sm:items-start">
            <div className="mt-3 text-center sm:ml-0 sm:mt-0 sm:text-left w-full">
              <h3 className="text-lg font-semibold leading-6 text-white mb-4">
                Create New Campaign
              </h3>

              {isLoading ? (
                <div className="text-center py-8">
                  <div className="text-2xl mb-4">{currentStep}</div>
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto"></div>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className="mb-4">
                    <label htmlFor="query" className="block text-sm font-medium text-gray-300 mb-2">
                      Campaign Query (optional)
                    </label>
                    <textarea
                      id="query"
                      rows={4}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="block w-full rounded-md border border-[#1f1f1f] bg-[#0a0a0a] px-3 py-2 text-white placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="e.g., Find opportunities for budget travelers in European cities..."
                    />
                    <p className="mt-2 text-sm text-gray-400">
                      Leave blank to let the AI find the best opportunities automatically.
                    </p>
                  </div>

                  <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                    <button
                      type="submit"
                      className="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:ml-3 sm:w-auto"
                    >
                      Create Campaign
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="mt-3 inline-flex w-full justify-center rounded-md bg-[#1f1f1f] px-3 py-2 text-sm font-semibold text-gray-300 shadow-sm hover:bg-[#2a2a2a] focus:outline-none focus:ring-2 focus:ring-gray-500 sm:mt-0 sm:w-auto"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}