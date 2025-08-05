import { ReactNode } from 'react'

export interface ConvaiProviderProps {
  children: ReactNode
  agentId?: string
  autoDetectAgent?: boolean
  environment?: 'dev' | 'staging' | 'prod'
  customDomain?: string
  enabled?: boolean
  onReady?: () => void
  onError?: (error: Error) => void
  onPageNavigation?: (path: string) => void
}

export interface ConvaiContextType {
  agentId: string
  isLoaded: boolean
  error: Error | null
  currentPage: string
  navigate: (path: string) => void
}

declare global {
  interface Window {
    convaiWidget?: {
      configure: (config: any) => void
      sendContext: (context: any) => void
    }
    next?: {
      router?: {
        push: (path: string) => void
        events: {
          on: (event: string, handler: () => void) => void
          off: (event: string, handler: () => void) => void
        }
      }
    }
  }
}