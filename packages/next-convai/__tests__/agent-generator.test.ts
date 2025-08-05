import { AgentGenerator } from '../src/agent-generator'
import fs from 'fs-extra'
import { SiteAnalysis } from '../src/page-analyzer'

jest.mock('fs-extra')

const mockFs = fs as jest.Mocked<typeof fs>

describe('AgentGenerator', () => {
  let generator: AgentGenerator
  const testProjectDir = '/test/project'

  beforeEach(() => {
    generator = new AgentGenerator(testProjectDir)
    jest.clearAllMocks()
  })

  const mockSiteAnalysis: SiteAnalysis = {
    pages: [
      {
        filePath: 'pages/index.tsx',
        route: '/',
        type: 'page',
        metadata: { title: 'Home', description: 'Welcome home' },
        exports: ['default']
      },
      {
        filePath: 'pages/about.tsx',
        route: '/about',
        type: 'page',
        metadata: { title: 'About', description: 'About us' },
        exports: ['default']
      },
      {
        filePath: 'pages/contact.tsx',
        route: '/contact',
        type: 'page',
        metadata: { title: 'Contact', description: 'Get in touch' },
        exports: ['default']
      }
    ],
    routes: ['/', '/about', '/contact'],
    sitemap: {
      '/': { title: 'Home', description: 'Welcome home' },
      '/about': { title: 'About', description: 'About us' },
      '/contact': { title: 'Contact', description: 'Get in touch' }
    },
    metadata: {
      globalMeta: {},
      pageSpecificMeta: {
        '/': { title: 'Home', description: 'Welcome home' },
        '/about': { title: 'About', description: 'About us' },
        '/contact': { title: 'Contact', description: 'Get in touch' }
      }
    }
  }

  const mockConfig = {
    projectName: 'Test Project',
    environments: ['dev', 'staging', 'prod'],
    pageAnalysis: {
      enabled: true,
      includePatterns: ['pages/**/*.{js,jsx,ts,tsx}'],
      excludePatterns: ['pages/api/**/*'],
      metadataFields: ['title', 'description', 'keywords', 'purpose', 'navigation']
    },
    agent: {
      name: 'Test Project Assistant',
      template: 'website-navigator',
      features: ['page-navigation', 'content-understanding', 'user-guidance']
    }
  }

  describe('generateAgentConfig', () => {
    beforeEach(() => {
      mockFs.readJson
        .mockResolvedValueOnce(mockSiteAnalysis) // pages-analysis.json
        .mockResolvedValueOnce(mockConfig) // config.json
    })

    it('should generate complete agent configuration', async () => {
      const result = await generator.generateAgentConfig('dev')

      expect(result.name).toBe('Test Project Assistant (dev)')
      expect(result.conversation_config.agent.prompt).toContain('Test Project')
      expect(result.conversation_config.agent.prompt).toContain('3 main pages')
      expect(result.conversation_config.agent.tools).toHaveLength(4)
      expect(result.platform_settings.widget.conversation_starters).toHaveLength(4)
    })

    it('should include navigation tools with correct routes', async () => {
      const result = await generator.generateAgentConfig('prod')

      const goToRouteTool = result.conversation_config.agent.tools.find(
        tool => tool.name === 'go_to_route'
      )
      
      expect(goToRouteTool).toBeDefined()
      expect(goToRouteTool?.parameters.properties.path.enum).toEqual(['/', '/about', '/contact'])
    })

    it('should generate context-aware conversation starters', async () => {
      const result = await generator.generateAgentConfig('staging')

      const starters = result.platform_settings.widget.conversation_starters
      
      // Should contain default starters and at least the about starter (contact may be cut off due to 4-limit)
      expect(starters).toContain('Want to learn more about us? I can tell you about our company.')
      expect(starters.length).toBeLessThanOrEqual(4)
      expect(starters.length).toBeGreaterThan(3)
    })

    it('should configure LLM settings correctly', async () => {
      const result = await generator.generateAgentConfig('dev')

      expect(result.conversation_config.agent.llm.model).toBe('eleven-multilingual-v1')
      expect(result.conversation_config.agent.llm.temperature).toBe(0.3)
      expect(result.conversation_config.agent.language).toBe('en')
    })

    it('should configure TTS and ASR settings', async () => {
      const result = await generator.generateAgentConfig('dev')

      expect(result.conversation_config.tts.model).toBe('eleven-multilingual-v1')
      expect(result.conversation_config.tts.voice_id).toBe('pNInz6obpgDQGcFmaJgB')
      expect(result.conversation_config.asr.model).toBe('nova-2-general')
      expect(result.conversation_config.asr.language).toBe('auto')
    })

    it('should set conversation limits', async () => {
      const result = await generator.generateAgentConfig('dev')

      expect(result.conversation_config.conversation.max_duration_seconds).toBe(1800)
      expect(result.conversation_config.conversation.text_only).toBe(false)
    })
  })

  describe('generateSiteAwarePrompt', () => {
    it('should create a comprehensive prompt', () => {
      const prompt = (generator as any).generateSiteAwarePrompt(mockSiteAnalysis, mockConfig)

      expect(prompt).toContain('Test Project')
      expect(prompt).toContain('3 main pages')
      expect(prompt).toContain('Page Navigation')
      expect(prompt).toContain('Content Understanding')
      expect(prompt).toContain('User Guidance')
      expect(prompt).toContain('Site Overview')
    })

    it('should include sitemap information', () => {
      const prompt = (generator as any).generateSiteAwarePrompt(mockSiteAnalysis, mockConfig)

      expect(prompt).toContain('"/"')
      expect(prompt).toContain('"title": "Home"')
      expect(prompt).toContain('"title": "About"')
      expect(prompt).toContain('"title": "Contact"')
    })
  })

  describe('generateNavigationTools', () => {
    it('should create all required navigation tools', () => {
      const tools = (generator as any).generateNavigationTools(mockSiteAnalysis)

      expect(tools).toHaveLength(4)
      
      const toolNames = tools.map((tool: any) => tool.name)
      expect(toolNames).toContain('go_to_route')
      expect(toolNames).toContain('get_page_info')
      expect(toolNames).toContain('search_pages')
      expect(toolNames).toContain('get_site_overview')
    })

    it('should configure go_to_route tool with valid routes', () => {
      const tools = (generator as any).generateNavigationTools(mockSiteAnalysis)
      const goToRouteTool = tools.find((tool: any) => tool.name === 'go_to_route')

      expect(goToRouteTool.type).toBe('client')
      expect(goToRouteTool.parameters.properties.path.enum).toEqual(['/', '/about', '/contact'])
      expect(goToRouteTool.parameters.required).toContain('path')
    })

    it('should filter out API routes', () => {
      const analysisWithApi = {
        ...mockSiteAnalysis,
        routes: ['/', '/about', '/api/users', '/api/posts', '/contact']
      }
      
      const tools = (generator as any).generateNavigationTools(analysisWithApi)
      const goToRouteTool = tools.find((tool: any) => tool.name === 'go_to_route')

      expect(goToRouteTool.parameters.properties.path.enum).toEqual(['/', '/about', '/contact'])
    })

    it('should configure function tools correctly', () => {
      const tools = (generator as any).generateNavigationTools(mockSiteAnalysis)
      
      const getPageInfoTool = tools.find((tool: any) => tool.name === 'get_page_info')
      expect(getPageInfoTool.type).toBe('function')
      expect(getPageInfoTool.parameters.properties.route.enum).toEqual(['/', '/about', '/contact'])

      const searchPagesTool = tools.find((tool: any) => tool.name === 'search_pages')
      expect(searchPagesTool.type).toBe('function')
      expect(searchPagesTool.parameters.properties.query.type).toBe('string')

      const getSiteOverviewTool = tools.find((tool: any) => tool.name === 'get_site_overview')
      expect(getSiteOverviewTool.type).toBe('function')
      expect(getSiteOverviewTool.parameters.required).toEqual([])
    })
  })

  describe('generateConversationStarters', () => {
    it('should include default conversation starters', () => {
      const starters = (generator as any).generateConversationStarters(mockSiteAnalysis)

      expect(starters).toContain('Hi! I can help you navigate this website. What are you looking for?')
      expect(starters).toContain('Welcome! I know all about this site\'s pages and content. How can I assist you?')
      expect(starters).toContain('Hello! Need help finding something specific on this website?')
    })

    it('should add page-specific starters based on common pages', () => {
      const starters = (generator as any).generateConversationStarters(mockSiteAnalysis)

      expect(starters).toContain('Want to learn more about us? I can tell you about our company.')
      // Contact starter should be present initially but may be limited to 4 total
      expect(starters.length).toBeLessThanOrEqual(4)
      expect(starters.length).toBeGreaterThan(3)
    })

    it('should limit starters to 4 items', () => {
      const starters = (generator as any).generateConversationStarters(mockSiteAnalysis)
      expect(starters.length).toBeLessThanOrEqual(4)
    })

    it('should handle sites without common pages', () => {
      const minimalAnalysis = {
        ...mockSiteAnalysis,
        pages: [
          {
            filePath: 'pages/dashboard.tsx',
            route: '/dashboard',
            type: 'page' as const,
            metadata: { title: 'Dashboard' },
            exports: ['default']
          }
        ]
      }

      const starters = (generator as any).generateConversationStarters(minimalAnalysis)
      
      // Should still have default starters
      expect(starters.length).toBeGreaterThanOrEqual(3)
      expect(starters[0]).toContain('Hi! I can help you navigate')
    })
  })
})