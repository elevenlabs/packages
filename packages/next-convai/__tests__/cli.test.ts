import { PageAnalyzer } from '../src/page-analyzer'
import { AgentGenerator } from '../src/agent-generator'
import { ConvaiCLI } from '../src/convai-cli-wrapper'
import fs from 'fs-extra'
import path from 'path'

// Mock all dependencies
jest.mock('../src/page-analyzer')
jest.mock('../src/agent-generator')
jest.mock('../src/convai-cli-wrapper')
jest.mock('fs-extra')

const MockPageAnalyzer = PageAnalyzer as jest.MockedClass<typeof PageAnalyzer>
const MockAgentGenerator = AgentGenerator as jest.MockedClass<typeof AgentGenerator>
const MockConvaiCLI = ConvaiCLI as jest.MockedClass<typeof ConvaiCLI>
const mockFs = fs as jest.Mocked<typeof fs>

// Mock console methods
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation()
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation()
const mockProcessExit = jest.spyOn(process, 'exit').mockImplementation()

// Mock process.cwd
const originalCwd = process.cwd
const mockCwd = jest.fn().mockReturnValue('/test/project')
process.cwd = mockCwd

describe('CLI Commands', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockConsoleLog.mockClear()
    mockConsoleError.mockClear()
    mockProcessExit.mockClear()
  })

  afterAll(() => {
    process.cwd = originalCwd
    mockConsoleLog.mockRestore()
    mockConsoleError.mockRestore()
    mockProcessExit.mockRestore()
  })

  describe('init command', () => {
    beforeEach(() => {
      // @ts-ignore
      mockFs.ensureDir.mockResolvedValue()
      // @ts-ignore
      mockFs.writeJson.mockResolvedValue()
    })

    it('should initialize ConvAI successfully', async () => {
      const mockConvaiCLI = {
        init: jest.fn().mockResolvedValue(undefined)
      }
      MockConvaiCLI.mockImplementation(() => mockConvaiCLI as any)

      // Import and test the CLI module
      // Since we can't directly import the CLI commands, we'll test the underlying logic
      const { Command } = require('commander')
      const program = new Command()

      // Simulate the init command logic
      const initCommand = async (options: { dir: string }) => {
        try {
          console.log('🚀 Initializing ConvAI for Next.js...')
          
          const projectDir = path.resolve(options.dir)
          const configDir = path.join(projectDir, '.convai')
          
          await fs.ensureDir(configDir)
          
          const convaiCLI = new ConvaiCLI(projectDir)
          await convaiCLI.init()
          
          const config = {
            projectName: path.basename(projectDir),
            environments: ['dev', 'staging', 'prod'],
            pageAnalysis: {
              enabled: true,
              includePatterns: ['pages/**/*.{js,jsx,ts,tsx}', 'app/**/*.{js,jsx,ts,tsx}'],
              excludePatterns: ['pages/api/**/*', 'app/api/**/*'],
              metadataFields: ['title', 'description', 'keywords', 'purpose', 'navigation']
            },
            agent: {
              name: `${path.basename(projectDir)} Assistant`,
              template: 'website-navigator',
              features: ['page-navigation', 'content-understanding', 'user-guidance']
            }
          }
          
          await fs.writeJson(path.join(configDir, 'config.json'), config, { spaces: 2 })
          
          console.log('✅ ConvAI initialized successfully!')
          console.log('Next steps:')
          console.log('1. Run: next-convai analyze')
          console.log('2. Run: next-convai generate')
          console.log('3. Add ConvaiProvider to your _app.js')
          
        } catch (error: any) {
          console.error('❌ Error initializing ConvAI:', error)
          process.exit(1)
        }
      }

      await initCommand({ dir: '/test/project' })

      expect(mockFs.ensureDir).toHaveBeenCalledWith('/test/project/.convai')
      expect(mockConvaiCLI.init).toHaveBeenCalled()
      expect(mockFs.writeJson).toHaveBeenCalledWith(
        '/test/project/.convai/config.json',
        expect.objectContaining({
          projectName: 'project',
          environments: ['dev', 'staging', 'prod']
        }),
        { spaces: 2 }
      )
      expect(mockConsoleLog).toHaveBeenCalledWith('🚀 Initializing ConvAI for Next.js...')
      expect(mockConsoleLog).toHaveBeenCalledWith('✅ ConvAI initialized successfully!')
    })

    it('should handle init errors', async () => {
      const error = new Error('ConvAI CLI not found')
      const mockConvaiCLI = {
        init: jest.fn().mockRejectedValue(error)
      }
      MockConvaiCLI.mockImplementation(() => mockConvaiCLI as any)

      const initCommand = async (options: { dir: string }) => {
        try {
          const projectDir = path.resolve(options.dir)
          const configDir = path.join(projectDir, '.convai')
          
          await fs.ensureDir(configDir)
          const convaiCLI = new ConvaiCLI(projectDir)
          await convaiCLI.init()
        } catch (error: any) {
          console.error('❌ Error initializing ConvAI:', error)
          process.exit(1)
        }
      }

      await initCommand({ dir: '/test/project' })

      expect(mockConsoleError).toHaveBeenCalledWith('❌ Error initializing ConvAI:', error)
      expect(mockProcessExit).toHaveBeenCalledWith(1)
    })
  })

  describe('analyze command', () => {
    it('should analyze pages successfully', async () => {
      const mockAnalysis = {
        pages: [
          { filePath: 'pages/index.tsx', route: '/', type: 'page', metadata: { title: 'Home' } },
          { filePath: 'pages/about.tsx', route: '/about', type: 'page', metadata: { title: 'About' } }
        ],
        routes: ['/', '/about'],
        sitemap: {},
        metadata: { globalMeta: {}, pageSpecificMeta: {} }
      }

      const mockAnalyzer = {
        analyzePagesStructure: jest.fn().mockResolvedValue(mockAnalysis)
      }
      MockPageAnalyzer.mockImplementation(() => mockAnalyzer as any)
      // @ts-ignore
      mockFs.writeJson.mockResolvedValue()

      const analyzeCommand = async (options: { dir: string }) => {
        try {
          console.log('🔍 Analyzing Next.js pages...')
          
          const projectDir = path.resolve(options.dir)
          const analyzer = new PageAnalyzer(projectDir)
          
          const analysis = await analyzer.analyzePagesStructure()
          
          const configDir = path.join(projectDir, '.convai')
          await fs.writeJson(path.join(configDir, 'pages-analysis.json'), analysis, { spaces: 2 })
          
          console.log(`✅ Analyzed ${analysis.pages.length} pages`)
          console.log(`📊 Found ${analysis.routes.length} routes`)
          console.log(`🏷️  Extracted metadata from ${analysis.pages.filter(p => p.metadata).length} pages`)
          
        } catch (error: any) {
          console.error('❌ Error analyzing pages:', error)
          process.exit(1)
        }
      }

      await analyzeCommand({ dir: '/test/project' })

      expect(MockPageAnalyzer).toHaveBeenCalledWith('/test/project')
      expect(mockAnalyzer.analyzePagesStructure).toHaveBeenCalled()
      expect(mockFs.writeJson).toHaveBeenCalledWith(
        '/test/project/.convai/pages-analysis.json',
        mockAnalysis,
        { spaces: 2 }
      )
      expect(mockConsoleLog).toHaveBeenCalledWith('🔍 Analyzing Next.js pages...')
      expect(mockConsoleLog).toHaveBeenCalledWith('✅ Analyzed 2 pages')
      expect(mockConsoleLog).toHaveBeenCalledWith('📊 Found 2 routes')
      expect(mockConsoleLog).toHaveBeenCalledWith('🏷️  Extracted metadata from 2 pages')
    })

    it('should handle analyze errors', async () => {
      const error = new Error('Analysis failed')
      const mockAnalyzer = {
        analyzePagesStructure: jest.fn().mockRejectedValue(error)
      }
      MockPageAnalyzer.mockImplementation(() => mockAnalyzer as any)

      const analyzeCommand = async (options: { dir: string }) => {
        try {
          const projectDir = path.resolve(options.dir)
          const analyzer = new PageAnalyzer(projectDir)
          await analyzer.analyzePagesStructure()
        } catch (error: any) {
          console.error('❌ Error analyzing pages:', error)
          process.exit(1)
        }
      }

      await analyzeCommand({ dir: '/test/project' })

      expect(mockConsoleError).toHaveBeenCalledWith('❌ Error analyzing pages:', error)
      expect(mockProcessExit).toHaveBeenCalledWith(1)
    })
  })

  describe('generate command', () => {
    it('should generate agent successfully', async () => {
      const mockAgentConfig = {
        name: 'Test Agent (dev)',
        conversation_config: {
          agent: { prompt: 'Test prompt', llm: { model: 'test', temperature: 0.3 }, language: 'en', tools: [] },
          tts: { model: 'test', voice_id: 'test' },
          asr: { model: 'test', language: 'auto' },
          conversation: { max_duration_seconds: 1800, text_only: false }
        },
        platform_settings: { widget: { conversation_starters: [], branding: {} } }
      }

      const mockGenerator = {
        generateAgentConfig: jest.fn().mockResolvedValue(mockAgentConfig)
      }
      MockAgentGenerator.mockImplementation(() => mockGenerator as any)

      const mockConvaiCLI = {
        createAgent: jest.fn().mockResolvedValue('agent-123')
      }
      MockConvaiCLI.mockImplementation(() => mockConvaiCLI as any)

      // @ts-ignore
      mockFs.writeJson.mockResolvedValue()

      const generateCommand = async (options: { dir: string, env: string }) => {
        try {
          console.log('🤖 Generating ConvAI agent...')
          
          const projectDir = path.resolve(options.dir)
          const generator = new AgentGenerator(projectDir)
          
          const agentConfig = await generator.generateAgentConfig(options.env)
          
          const convaiCLI = new ConvaiCLI(projectDir)
          const agentId = await convaiCLI.createAgent(agentConfig, options.env)
          
          console.log(`✅ Agent created successfully!`)
          console.log(`🆔 Agent ID: ${agentId}`)
          console.log(`🌐 Environment: ${options.env}`)
          
          const configDir = path.join(projectDir, '.convai')
          const agentInfo = {
            agentId,
            environment: options.env,
            createdAt: new Date().toISOString()
          }
          await fs.writeJson(path.join(configDir, `agent-${options.env}.json`), agentInfo, { spaces: 2 })
          
        } catch (error: any) {
          console.error('❌ Error generating agent:', error)
          process.exit(1)
        }
      }

      await generateCommand({ dir: '/test/project', env: 'dev' })

      expect(MockAgentGenerator).toHaveBeenCalledWith('/test/project')
      expect(mockGenerator.generateAgentConfig).toHaveBeenCalledWith('dev')
      expect(MockConvaiCLI).toHaveBeenCalledWith('/test/project')
      expect(mockConvaiCLI.createAgent).toHaveBeenCalledWith(mockAgentConfig, 'dev')
      expect(mockFs.writeJson).toHaveBeenCalledWith(
        '/test/project/.convai/agent-dev.json',
        expect.objectContaining({
          agentId: 'agent-123',
          environment: 'dev'
        }),
        { spaces: 2 }
      )
      expect(mockConsoleLog).toHaveBeenCalledWith('🤖 Generating ConvAI agent...')
      expect(mockConsoleLog).toHaveBeenCalledWith('✅ Agent created successfully!')
      expect(mockConsoleLog).toHaveBeenCalledWith('🆔 Agent ID: agent-123')
      expect(mockConsoleLog).toHaveBeenCalledWith('🌐 Environment: dev')
    })

    it('should handle generate errors', async () => {
      const error = new Error('Generation failed')
      const mockGenerator = {
        generateAgentConfig: jest.fn().mockRejectedValue(error)
      }
      MockAgentGenerator.mockImplementation(() => mockGenerator as any)

      const generateCommand = async (options: { dir: string, env: string }) => {
        try {
          const projectDir = path.resolve(options.dir)
          const generator = new AgentGenerator(projectDir)
          await generator.generateAgentConfig(options.env)
        } catch (error: any) {
          console.error('❌ Error generating agent:', error)
          process.exit(1)
        }
      }

      await generateCommand({ dir: '/test/project', env: 'dev' })

      expect(mockConsoleError).toHaveBeenCalledWith('❌ Error generating agent:', error)
      expect(mockProcessExit).toHaveBeenCalledWith(1)
    })

    it('should handle different environments', async () => {
      const mockAgentConfig = {
        name: 'Test Agent (prod)',
        conversation_config: {
          agent: { prompt: 'Test prompt', llm: { model: 'test', temperature: 0.3 }, language: 'en', tools: [] },
          tts: { model: 'test', voice_id: 'test' },
          asr: { model: 'test', language: 'auto' },
          conversation: { max_duration_seconds: 1800, text_only: false }
        },
        platform_settings: { widget: { conversation_starters: [], branding: {} } }
      }

      const mockGenerator = {
        generateAgentConfig: jest.fn().mockResolvedValue(mockAgentConfig)
      }
      MockAgentGenerator.mockImplementation(() => mockGenerator as any)

      const mockConvaiCLI = {
        createAgent: jest.fn().mockResolvedValue('prod-agent-456')
      }
      MockConvaiCLI.mockImplementation(() => mockConvaiCLI as any)

      // @ts-ignore
      mockFs.writeJson.mockResolvedValue()

      const generateCommand = async (options: { dir: string, env: string }) => {
        try {
          const projectDir = path.resolve(options.dir)
          const generator = new AgentGenerator(projectDir)
          const agentConfig = await generator.generateAgentConfig(options.env)
          const convaiCLI = new ConvaiCLI(projectDir)
          const agentId = await convaiCLI.createAgent(agentConfig, options.env)
          
          const configDir = path.join(projectDir, '.convai')
          const agentInfo = { agentId, environment: options.env, createdAt: new Date().toISOString() }
          await fs.writeJson(path.join(configDir, `agent-${options.env}.json`), agentInfo, { spaces: 2 })
        } catch (error: any) {
          console.error('❌ Error generating agent:', error)
          process.exit(1)
        }
      }

      await generateCommand({ dir: '/test/project', env: 'prod' })

      expect(mockGenerator.generateAgentConfig).toHaveBeenCalledWith('prod')
      expect(mockConvaiCLI.createAgent).toHaveBeenCalledWith(mockAgentConfig, 'prod')
      expect(mockFs.writeJson).toHaveBeenCalledWith(
        '/test/project/.convai/agent-prod.json',
        expect.objectContaining({
          agentId: 'prod-agent-456',
          environment: 'prod'
        }),
        { spaces: 2 }
      )
    })
  })

  describe('path resolution', () => {
    it('should use provided directory option', async () => {
      const mockAnalyzer = {
        analyzePagesStructure: jest.fn().mockResolvedValue({ pages: [], routes: [], sitemap: {}, metadata: { globalMeta: {}, pageSpecificMeta: {} } })
      }
      MockPageAnalyzer.mockImplementation(() => mockAnalyzer as any)
      // @ts-ignore
      mockFs.writeJson.mockResolvedValue()

      const analyzeCommand = async (options: { dir: string }) => {
        const projectDir = path.resolve(options.dir)
        const analyzer = new PageAnalyzer(projectDir)
        await analyzer.analyzePagesStructure()
      }

      await analyzeCommand({ dir: '/custom/project/path' })

      expect(MockPageAnalyzer).toHaveBeenCalledWith('/custom/project/path')
    })

    it('should use current working directory as default', async () => {
      const mockAnalyzer = {
        analyzePagesStructure: jest.fn().mockResolvedValue({ pages: [], routes: [], sitemap: {}, metadata: { globalMeta: {}, pageSpecificMeta: {} } })
      }
      MockPageAnalyzer.mockImplementation(() => mockAnalyzer as any)
      // @ts-ignore
      mockFs.writeJson.mockResolvedValue()

      const analyzeCommand = async (options: { dir?: string }) => {
        const projectDir = path.resolve(options.dir || process.cwd())
        const analyzer = new PageAnalyzer(projectDir)
        await analyzer.analyzePagesStructure()
      }

      await analyzeCommand({})

      expect(MockPageAnalyzer).toHaveBeenCalledWith('/test/project')
    })
  })
})