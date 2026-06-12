import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import './globals.css'
import { Sidebar } from '@/components/Sidebar'
import { TopNavbar } from '@/components/TopNavbar'

export const metadata: Metadata = {
  title: 'HotelIQ - Agentic Travel Marketing Intelligence',
  description: 'AI-powered marketing intelligence platform for the travel and hospitality industry',
}

export interface RootLayoutProps {
  children: React.ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {

  return (
    <html lang="en" className={GeistSans.className}>
      <body className="bg-[#0a0a0a] text-white min-h-screen">
        <div className="flex h-screen">
          {/* Sidebar */}
          <Sidebar />
          
          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <TopNavbar />
            <main className="flex-1 overflow-y-auto p-6">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  )
}