'use client'

import { useState } from 'react'
import { PlayIcon } from '@heroicons/react/24/solid'
import { runAgentWorkflow } from '@/lib/api'
import { Toast } from './Toast'

export interface TopNavbarProps {}

export function TopNavbar(_props: TopNavbarProps) {
  const [isRunning, setIsRunning] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  const handleRunWorkflow = async () => {
    setIsRunning(true)
    try {
      await runAgentWorkflow()
      setToast({ message: 'Agent workflow completed successfully!', type: 'success' })
    } catch (error) {
      console.error('Failed to run workflow:', error)
      setToast({ message: 'Workflow failed. Please try again.', type: 'error' })
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="flex h-16 items-center justify-between border-b border-[#1f1f1f] bg-[#111111] px-6">
      <div className="md:hidden">
        <h1 className="text-xl font-bold text-white">HotelIQ</h1>
      </div>
      
      <div className="flex items-center space-x-4">
        <button
          onClick={handleRunWorkflow}
          disabled={isRunning}
          className={`
            inline-flex items-center rounded-md px-4 py-2 text-sm font-medium text-white shadow-sm
            ${isRunning
              ? 'bg-blue-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500'
            }
            transition-colors duration-200
          `}
        >
          <PlayIcon className={`mr-2 h-4 w-4 ${isRunning ? 'animate-pulse' : ''}`} />
          {isRunning ? 'Running...' : 'Run Agent Workflow'}
        </button>
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