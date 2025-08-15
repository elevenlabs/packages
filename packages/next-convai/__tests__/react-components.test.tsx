import React from 'react'
import { ConvaiProvider, useConvai, ConvaiWidget } from '../src/index'

// Mock fetch
global.fetch = jest.fn()

// Mock DOM methods
Object.defineProperty(document, 'createElement', {
  value: jest.fn().mockImplementation((tagName) => {
    if (tagName === 'script') {
      return {
        id: '',
        src: '',
        async: false,
        onload: null,
        onerror: null,
        setAttribute: jest.fn(),
        addEventListener: jest.fn()
      }
    }
    if (tagName === 'elevenlabs-convai') {
      return {
        id: '',
        className: '',
        setAttribute: jest.fn(),
        addEventListener: jest.fn(),
        remove: jest.fn()
      }
    }
    return {
      id: '',
      className: '',
      setAttribute: jest.fn(),
      addEventListener: jest.fn(),
      remove: jest.fn()
    }
  })
})

Object.defineProperty(document, 'getElementById', {
  value: jest.fn().mockReturnValue(null)
})

Object.defineProperty(document.head, 'appendChild', {
  value: jest.fn()
})

Object.defineProperty(document.head, 'removeChild', {
  value: jest.fn()
})

Object.defineProperty(document.body, 'appendChild', {
  value: jest.fn()
})

describe('React Components', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Reset global mocks
    global.fetch = jest.fn()
    
    // Mock window location
    Object.defineProperty(window, 'location', {
      value: { pathname: '/', href: '' },
      writable: true
    })
    
    // Mock document
    Object.defineProperty(document, 'title', {
      value: 'Test App',
      writable: true
    })
  })

  describe('Component Imports', () => {
    it('should import ConvaiProvider successfully', () => {
      expect(ConvaiProvider).toBeDefined()
      expect(typeof ConvaiProvider).toBe('function')
    })

    it('should import useConvai hook successfully', () => {
      expect(useConvai).toBeDefined()
      expect(typeof useConvai).toBe('function')
    })

    it('should import ConvaiWidget successfully', () => {
      expect(ConvaiWidget).toBeDefined()
      expect(typeof ConvaiWidget).toBe('function')
    })
  })

  describe('ConvaiProvider Basic Functionality', () => {
    it('should create ConvaiProvider instance without errors', () => {
      expect(() => {
        React.createElement(ConvaiProvider, { 
          agentId: 'test-123', 
          enabled: false,
          children: null
        })
      }).not.toThrow()
    })

    it('should handle auto-detection props', () => {
      expect(() => {
        React.createElement(ConvaiProvider, { 
          autoDetectAgent: true,
          environment: 'dev',
          enabled: false,
          children: null
        })
      }).not.toThrow()
    })

    it('should handle custom domain prop', () => {
      expect(() => {
        React.createElement(ConvaiProvider, { 
          agentId: 'test-123',
          customDomain: 'https://custom.example.com',
          enabled: false,
          children: null
        })
      }).not.toThrow()
    })
  })

  describe('ConvaiWidget Basic Functionality', () => {
    it('should create ConvaiWidget instance without errors', () => {
      expect(() => {
        React.createElement(ConvaiWidget, { 
          agentId: 'test-123',
          variant: 'expandable',
          className: 'custom-class'
        })
      }).not.toThrow()
    })

    it('should handle different variants', () => {
      expect(() => {
        React.createElement(ConvaiWidget, { variant: 'full' })
      }).not.toThrow()
      
      expect(() => {
        React.createElement(ConvaiWidget, { variant: 'expandable' })
      }).not.toThrow()
    })
  })

  describe('TypeScript Compatibility', () => {
    it('should work with TypeScript prop types', () => {
      // Test that the components accept the correct prop types
      const providerProps = {
        agentId: 'test-123',
        autoDetectAgent: true,
        environment: 'dev' as const,
        customDomain: 'https://example.com',
        enabled: true,
        onReady: jest.fn(),
        onError: jest.fn(),
        onPageNavigation: jest.fn(),
        children: null
      }

      const widgetProps = {
        agentId: 'test-123',
        variant: 'expandable' as const,
        className: 'test-class'
      }

      expect(() => {
        React.createElement(ConvaiProvider, providerProps)
        React.createElement(ConvaiWidget, widgetProps)
      }).not.toThrow()
    })
  })

  describe('Hook Error Handling', () => {
    it('should throw error when useConvai is called outside provider context', () => {
      // Create a mock context that returns null (outside provider)
      const originalCreateContext = React.createContext
      const mockCreateContext = jest.fn().mockReturnValue({
        Provider: ({ children }: any) => children,
        Consumer: ({ children }: any) => children(null)
      })
      
      // Mock useContext to return null (simulating outside provider)
      const originalUseContext = React.useContext
      React.useContext = jest.fn().mockReturnValue(null)

      expect(() => {
        useConvai()
      }).toThrow('useConvai must be used within a ConvaiProvider')

      // Restore original functions
      React.useContext = originalUseContext
    })
  })
})