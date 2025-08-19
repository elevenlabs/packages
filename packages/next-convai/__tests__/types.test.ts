import { ConvaiProviderProps, ConvaiContextType } from '../src/types'

describe('Types', () => {
  describe('ConvaiProviderProps', () => {
    it('should accept valid props', () => {
      const validProps: ConvaiProviderProps = {
        children: null,
        agentId: 'test-agent-123',
        autoDetectAgent: true,
        environment: 'dev',
        customDomain: 'https://custom.example.com',
        enabled: true,
        onReady: () => console.log('ready'),
        onError: (error: Error) => console.error(error),
        onPageNavigation: (path: string) => console.log('navigated to', path)
      }

      expect(validProps).toBeDefined()
      expect(validProps.agentId).toBe('test-agent-123')
      expect(validProps.environment).toBe('dev')
    })

    it('should accept minimal props', () => {
      const minimalProps: ConvaiProviderProps = {
        children: null
      }

      expect(minimalProps).toBeDefined()
      expect(minimalProps.agentId).toBeUndefined()
      expect(minimalProps.enabled).toBeUndefined()
    })

    it('should enforce environment type constraints', () => {
      const validEnvironments: ConvaiProviderProps['environment'][] = ['dev', 'staging', 'prod']
      
      validEnvironments.forEach(env => {
        const props: ConvaiProviderProps = {
          children: null,
          environment: env
        }
        expect(props.environment).toBe(env)
      })
    })
  })

  describe('ConvaiContextType', () => {
    it('should define correct context structure', () => {
      const contextValue: ConvaiContextType = {
        agentId: 'test-agent-123',
        isLoaded: true,
        error: null,
        currentPage: '/dashboard',
        navigate: (path: string) => {
          console.log('Navigating to:', path)
        }
      }

      expect(contextValue.agentId).toBe('test-agent-123')
      expect(contextValue.isLoaded).toBe(true)
      expect(contextValue.error).toBeNull()
      expect(contextValue.currentPage).toBe('/dashboard')
      expect(typeof contextValue.navigate).toBe('function')
    })

    it('should handle error states', () => {
      const contextWithError: ConvaiContextType = {
        agentId: '',
        isLoaded: false,
        error: new Error('Failed to load ConvAI widget'),
        currentPage: '/',
        navigate: jest.fn()
      }

      expect(contextWithError.error).toBeInstanceOf(Error)
      expect(contextWithError.error?.message).toBe('Failed to load ConvAI widget')
      expect(contextWithError.isLoaded).toBe(false)
    })
  })

  describe('Global Window Interface', () => {
    it('should extend window with convai properties', () => {
      // Test that the global window interface is properly extended
      const mockWindow = global.window as any

      // These properties should be available based on the type definition
      mockWindow.convaiWidget = {
        configure: jest.fn(),
        sendContext: jest.fn()
      }

      mockWindow.next = {
        router: {
          push: jest.fn(),
          events: {
            on: jest.fn(),
            off: jest.fn()
          }
        }
      }

      expect(mockWindow.convaiWidget.configure).toBeDefined()
      expect(mockWindow.convaiWidget.sendContext).toBeDefined()
      expect(mockWindow.next.router.push).toBeDefined()
      expect(mockWindow.next.router.events.on).toBeDefined()
      expect(mockWindow.next.router.events.off).toBeDefined()
    })
  })

  describe('Type Safety', () => {
    it('should enforce required properties', () => {
      // This test ensures TypeScript compilation catches missing required props
      
      // ConvaiContextType requires all properties
      const incompleteContext = {
        agentId: 'test',
        isLoaded: true
        // Missing error, currentPage, navigate - this would cause TS error
      }

      // We can't actually test compilation errors in Jest, but we can ensure
      // the types are properly structured by creating valid instances
      const completeContext: ConvaiContextType = {
        ...incompleteContext,
        error: null,
        currentPage: '/',
        navigate: jest.fn()
      }

      expect(completeContext).toBeDefined()
    })

    it('should allow optional properties in ConvaiProviderProps', () => {
      // All properties except children should be optional
      const propsWithOnlyChildren: ConvaiProviderProps = {
        children: null
      }

      expect(propsWithOnlyChildren).toBeDefined()

      // Adding optional properties should work
      const propsWithOptionals: ConvaiProviderProps = {
        ...propsWithOnlyChildren,
        agentId: 'test',
        enabled: true
      }

      expect(propsWithOptionals.agentId).toBe('test')
      expect(propsWithOptionals.enabled).toBe(true)
    })
  })
})