import React, { createContext, useContext, useEffect, useState } from 'react'
import { ConvaiProviderProps, ConvaiContextType } from './types'

const ConvaiContext = createContext<ConvaiContextType | null>(null)

export function ConvaiProvider({ 
  children, 
  agentId: providedAgentId,
  autoDetectAgent = true,
  environment = process.env.NODE_ENV === 'development' ? 'dev' : 'prod',
  customDomain,
  enabled = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production',
  onReady,
  onError,
  onPageNavigation
}: ConvaiProviderProps) {
  const [agentId, setAgentId] = useState<string>(providedAgentId || '')
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [currentPage, setCurrentPage] = useState<string>('')

  // Auto-detect agent ID from generated config
  useEffect(() => {
    if (autoDetectAgent && !providedAgentId && typeof window !== 'undefined') {
      const loadAgentConfig = async () => {
        try {
          // This would be bundled/available at build time
          const response = await fetch(`/.convai/agent-${environment}.json`)
          if (response.ok) {
            const config = await response.json()
            setAgentId(config.agentId)
          }
        } catch (e) {
          console.warn('Could not auto-detect ConvAI agent ID')
        }
      }
      loadAgentConfig()
    }
  }, [autoDetectAgent, environment, providedAgentId])

  // Track current page for agent context
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const updateCurrentPage = () => {
        const newPage = window.location.pathname
        setCurrentPage(newPage)
        
        if (onPageNavigation) {
          onPageNavigation(newPage)
        }
        
        // Send page context to agent
        if (window.convaiWidget && window.convaiWidget.sendContext) {
          window.convaiWidget.sendContext({
            currentPage: newPage,
            pageTitle: document.title,
            timestamp: new Date().toISOString()
          })
        }
      }

      updateCurrentPage()
      window.addEventListener('popstate', updateCurrentPage)
      
      // For client-side navigation (Next.js router)
      const handleRouteChange = () => {
        setTimeout(updateCurrentPage, 100) // Small delay for title updates
      }
      
      if (window.next && window.next.router) {
        window.next.router.events.on('routeChangeComplete', handleRouteChange)
      }

      return () => {
        window.removeEventListener('popstate', updateCurrentPage)
        if (window.next && window.next.router) {
          window.next.router.events.off('routeChangeComplete', handleRouteChange)
        }
      }
    }
  }, [onPageNavigation])

  // Navigation function
  const navigate = (path: string) => {
    if (typeof window !== 'undefined') {
      const router = window?.next?.router
      if (router) {
        router.push(path)
      } else {
        window.location.href = path
      }
    }
  }

  // Load ConvAI widget script
  useEffect(() => {
    if (!enabled || !agentId) return

    const scriptId = 'convai-widget-script'
    
    if (document.getElementById(scriptId)) {
      setIsLoaded(true)
      if (onReady) onReady()
      return
    }

    const script = document.createElement('script')
    script.id = scriptId
    script.src = customDomain 
      ? `${customDomain}/convai-widget-embed.js`
      : 'https://unpkg.com/@elevenlabs/convai-widget-embed'
    script.async = true

    script.onload = () => {
      setIsLoaded(true)
      if (onReady) onReady()
      
      // Initialize with site context
      if (window.convaiWidget) {
        window.convaiWidget.configure({
          agentId,
          context: {
            currentPage: window.location.pathname,
            pageTitle: document.title,
            siteName: document.title.split(' | ')[1] || document.title
          }
        })
      }
    }

    script.onerror = () => {
      const err = new Error('Failed to load ConvAI widget script')
      setError(err)
      if (onError) onError(err)
    }

    document.head.appendChild(script)

    return () => {
      const existingScript = document.getElementById(scriptId)
      if (existingScript) {
        document.head.removeChild(existingScript)
      }
    }
  }, [enabled, agentId, customDomain, onReady, onError])

  const contextValue: ConvaiContextType = {
    agentId,
    isLoaded,
    error,
    currentPage,
    navigate
  }

  return (
    <ConvaiContext.Provider value={contextValue}>
      {children}
    </ConvaiContext.Provider>
  )
}

export function useConvai(): ConvaiContextType {
  const context = useContext(ConvaiContext)
  if (!context) {
    throw new Error('useConvai must be used within a ConvaiProvider')
  }
  return context
}

// Widget component for manual placement
export function ConvaiWidget({ 
  agentId, 
  variant = 'full',
  className = '' 
}: { 
  agentId?: string
  variant?: 'full' | 'expandable'
  className?: string 
}) {
  const { agentId: contextAgentId } = useConvai()
  const finalAgentId = agentId || contextAgentId

  useEffect(() => {
    if (!finalAgentId) return

    const widgetId = `elevenlabs-convai-widget-${finalAgentId}`
    
    // Remove existing widget if it exists
    const existingWidget = document.getElementById(widgetId)
    if (existingWidget) {
      existingWidget.remove()
    }

    // Create new widget
    const widget = document.createElement('elevenlabs-convai')
    widget.id = widgetId
    widget.setAttribute('agent-id', finalAgentId)
    widget.setAttribute('variant', variant)
    widget.className = className

    // Add client tools for navigation
    widget.addEventListener('elevenlabs-convai:call', (event: any) => {
      event.detail.config.clientTools = {
        go_to_route: ({ path }: { path: string }) => {
          const router = window?.next?.router
          if (router) {
            router.push(path)
          } else {
            window.location.href = path
          }
        }
      }
    })

    document.body.appendChild(widget)

    return () => {
      const widget = document.getElementById(widgetId)
      if (widget) {
        widget.remove()
      }
    }
  }, [finalAgentId, variant, className])

  return null // This component doesn't render anything directly
}