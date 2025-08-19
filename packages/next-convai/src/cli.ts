#!/usr/bin/env node
import { Command } from 'commander'
import { PageAnalyzer } from './page-analyzer'
import { AgentGenerator } from './agent-generator'
import { ConvaiCLI } from './convai-cli-wrapper'
import path from 'path'
import fs from 'fs-extra'

const program = new Command()

program
  .name('next-convai')
  .description('Auto-generate ConvAI agents for Next.js applications')
  .version('1.0.0')

program
  .command('init')
  .description('Initialize ConvAI integration for your Next.js app')
  .option('-d, --dir <directory>', 'Next.js project directory', process.cwd())
  .action(async (options) => {
    try {
      console.log('🚀 Initializing ConvAI for Next.js...')
      
      const projectDir = path.resolve(options.dir)
      const configDir = path.join(projectDir, '.convai')
      
      // Create .convai directory
      await fs.ensureDir(configDir)
      
      // Initialize ConvAI CLI in project
      const convaiCLI = new ConvaiCLI(projectDir)
      await convaiCLI.init()
      
      // Create next-convai config
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
  })

program
  .command('analyze')
  .description('Analyze your Next.js pages and extract metadata')
  .option('-d, --dir <directory>', 'Next.js project directory', process.cwd())
  .action(async (options) => {
    try {
      console.log('🔍 Analyzing Next.js pages...')
      
      const projectDir = path.resolve(options.dir)
      const analyzer = new PageAnalyzer(projectDir)
      
      const analysis = await analyzer.analyzePagesStructure()
      
      // Save analysis results
      const configDir = path.join(projectDir, '.convai')
      await fs.writeJson(path.join(configDir, 'pages-analysis.json'), analysis, { spaces: 2 })
      
      console.log(`✅ Analyzed ${analysis.pages.length} pages`)
      console.log(`📊 Found ${analysis.routes.length} routes`)
      console.log(`🏷️  Extracted metadata from ${analysis.pages.filter(p => p.metadata).length} pages`)
      
    } catch (error: any) {
      console.error('❌ Error analyzing pages:', error)
      process.exit(1)
    }
  })

program
  .command('generate')
  .description('Generate ConvAI agent with page navigation capabilities')
  .option('-d, --dir <directory>', 'Next.js project directory', process.cwd())
  .option('-e, --env <environment>', 'Target environment', 'dev')
  .action(async (options) => {
    try {
      console.log('🤖 Generating ConvAI agent...')
      
      const projectDir = path.resolve(options.dir)
      const generator = new AgentGenerator(projectDir)
      
      const agentConfig = await generator.generateAgentConfig(options.env)
      
      // Create agent using ConvAI CLI
      const convaiCLI = new ConvaiCLI(projectDir)
      const agentId = await convaiCLI.createAgent(agentConfig, options.env)
      
      console.log(`✅ Agent created successfully!`)
      console.log(`🆔 Agent ID: ${agentId}`)
      console.log(`🌐 Environment: ${options.env}`)
      
      // Save agent info for the React component
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
  })

program.parse()