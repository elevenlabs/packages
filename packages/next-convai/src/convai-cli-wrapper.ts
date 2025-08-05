import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs-extra'
import { AgentConfig } from './agent-generator'

const execAsync = promisify(exec)

export class ConvaiCLI {
  constructor(private projectDir: string) {}

  async init(): Promise<void> {
    try {
      await execAsync('convai init', { cwd: this.projectDir })
    } catch (error: any) {
      // If convai CLI is not installed, provide helpful error
      if (error.message.includes('command not found')) {
        throw new Error('ElevenLabs ConvAI CLI not found. Please install it first:\nnpm install -g @elevenlabs/convai-cli')
      }
      throw error
    }
  }

  async createAgent(config: AgentConfig, environment: string): Promise<string> {
    // Write agent config to temporary file
    const configPath = path.join(this.projectDir, '.convai', `temp-agent-${environment}.json`)
    await fs.writeJson(configPath, config, { spaces: 2 })

    try {
      // Create agent using convai CLI
      const { stdout } = await execAsync(
        `convai add agent "${config.name}" --template custom --config-path "${configPath}" --env ${environment}`,
        { cwd: this.projectDir }
      )

      // Parse agent ID from output
      const agentIdMatch = stdout.match(/Agent ID: ([a-zA-Z0-9-]+)/)
      if (!agentIdMatch) {
        throw new Error('Could not extract agent ID from convai CLI output')
      }

      // Sync to platform
      await execAsync(`convai sync --env ${environment}`, { cwd: this.projectDir })

      // Clean up temp file
      await fs.remove(configPath)

      return agentIdMatch[1]
    } catch (error) {
      // Clean up temp file on error
      await fs.remove(configPath).catch(() => {})
      throw error
    }
  }

  async updateAgent(agentId: string, config: AgentConfig, environment: string): Promise<void> {
    const configPath = path.join(this.projectDir, '.convai', `temp-agent-${environment}.json`)
    await fs.writeJson(configPath, config, { spaces: 2 })

    try {
      await execAsync(
        `convai update agent "${agentId}" --config-path "${configPath}" --env ${environment}`,
        { cwd: this.projectDir }
      )
      
      await execAsync(`convai sync --env ${environment}`, { cwd: this.projectDir })
      await fs.remove(configPath)
    } catch (error) {
      await fs.remove(configPath).catch(() => {})
      throw error
    }
  }
}