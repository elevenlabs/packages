import { ConvaiCLI } from '../src/convai-cli-wrapper'
import { AgentConfig } from '../src/agent-generator'
import fs from 'fs-extra'
import path from 'path'

// Mock fs-extra
jest.mock('fs-extra')

// Mock child_process and util with a factory function
jest.mock('child_process', () => ({
  exec: jest.fn()
}))

jest.mock('util', () => {
  const mockExecAsync = jest.fn()
  return {
    promisify: jest.fn().mockReturnValue(mockExecAsync)
  }
})

const mockFs = fs as jest.Mocked<typeof fs>

// Access the mocked execAsync through the module
const { promisify } = require('util')
const mockExecAsync = promisify()

describe('ConvaiCLI', () => {
  let convaiCLI: ConvaiCLI
  const testProjectDir = '/test/project'

  beforeEach(() => {
    convaiCLI = new ConvaiCLI(testProjectDir)
    jest.clearAllMocks()
  })

  const mockAgentConfig: AgentConfig = {
    name: 'Test Agent (dev)',
    conversation_config: {
      agent: {
        prompt: 'Test prompt',
        llm: { model: 'eleven-multilingual-v1', temperature: 0.3 },
        language: 'en',
        tools: []
      },
      tts: { model: 'eleven-multilingual-v1', voice_id: 'test-voice-id' },
      asr: { model: 'nova-2-general', language: 'auto' },
      conversation: { max_duration_seconds: 1800, text_only: false }
    },
    platform_settings: {
      widget: {
        conversation_starters: ['Hello!'],
        branding: { primary_color: '#007bff' }
      }
    }
  }

  describe('ConvaiCLI Exists', () => {
    it('should create ConvaiCLI instance', () => {
      expect(convaiCLI).toBeDefined()
      expect(convaiCLI).toBeInstanceOf(ConvaiCLI)
    })

    it('should have init method', () => {
      expect(typeof convaiCLI.init).toBe('function')
    })

    it('should have createAgent method', () => {
      expect(typeof convaiCLI.createAgent).toBe('function')
    })

    it('should have updateAgent method', () => {
      expect(typeof convaiCLI.updateAgent).toBe('function')
    })
  })

  describe('Basic Mock Tests', () => {
    it('should call execAsync for init', async () => {
      mockExecAsync.mockResolvedValue({ stdout: 'ConvAI initialized', stderr: '' })

      await convaiCLI.init()

      expect(mockExecAsync).toHaveBeenCalledWith(
        'convai init',
        { cwd: testProjectDir }
      )
    })

    it('should handle init error', async () => {
      const error = new Error('command not found: convai')
      mockExecAsync.mockRejectedValue(error)

      await expect(convaiCLI.init()).rejects.toThrow(
        'ElevenLabs ConvAI CLI not found. Please install it first:\nnpm install -g @elevenlabs/convai-cli'
      )
    })

    it('should create agent with proper mocking', async () => {
      ;(mockFs.writeJson as any).mockResolvedValue(undefined)
      ;(mockFs.remove as any).mockResolvedValue(undefined)
      
      mockExecAsync
        .mockResolvedValueOnce({
          stdout: 'Agent created successfully!\nAgent ID: test-agent-123\nEnvironment: dev',
          stderr: ''
        })
        .mockResolvedValueOnce({
          stdout: 'Synced successfully',
          stderr: ''
        })

      const agentId = await convaiCLI.createAgent(mockAgentConfig, 'dev')

      expect(agentId).toBe('test-agent-123')
      expect(mockFs.writeJson).toHaveBeenCalled()
      expect(mockFs.remove).toHaveBeenCalled()
    })

    it('should handle agent creation error', async () => {
      ;(mockFs.writeJson as any).mockResolvedValue(undefined)
      ;(mockFs.remove as any).mockResolvedValue(undefined)
      
      const error = new Error('Command failed')
      mockExecAsync.mockRejectedValue(error)

      await expect(convaiCLI.createAgent(mockAgentConfig, 'dev')).rejects.toThrow('Command failed')
      expect(mockFs.remove).toHaveBeenCalled()
    })

    it('should update agent with proper mocking', async () => {
      ;(mockFs.writeJson as any).mockResolvedValue(undefined)
      ;(mockFs.remove as any).mockResolvedValue(undefined)
      
      mockExecAsync
        .mockResolvedValueOnce({ stdout: 'Agent updated', stderr: '' })
        .mockResolvedValueOnce({ stdout: 'Synced', stderr: '' })

      await convaiCLI.updateAgent('existing-agent-123', mockAgentConfig, 'staging')

      expect(mockFs.writeJson).toHaveBeenCalled()
      expect(mockFs.remove).toHaveBeenCalled()
    })

    it('should handle update error', async () => {
      ;(mockFs.writeJson as any).mockResolvedValue(undefined)
      ;(mockFs.remove as any).mockResolvedValue(undefined)
      
      const error = new Error('Update failed')
      mockExecAsync.mockRejectedValue(error)

      await expect(convaiCLI.updateAgent('agent-123', mockAgentConfig, 'dev')).rejects.toThrow('Update failed')
      expect(mockFs.remove).toHaveBeenCalled()
    })
  })
})