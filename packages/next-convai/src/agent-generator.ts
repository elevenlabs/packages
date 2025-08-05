import fs from 'fs-extra'
import path from 'path'
import { SiteAnalysis, PageInfo } from './page-analyzer'

export interface AgentConfig {
  name: string
  conversation_config: {
    agent: {
      prompt: string
      llm: {
        model: string
        temperature: number
      }
      language: string
      tools: Array<{
        type: string
        name: string
        description: string
        parameters: any
      }>
    }
    tts: {
      model: string
      voice_id: string
    }
    asr: {
      model: string
      language: string
    }
    conversation: {
      max_duration_seconds: number
      text_only: boolean
    }
  }
  platform_settings: {
    widget: {
      conversation_starters: string[]
      branding: Record<string, any>
    }
  }
}

export class AgentGenerator {
  constructor(private projectDir: string) {}

  async generateAgentConfig(environment: string): Promise<AgentConfig> {
    // Load site analysis
    const analysisPath = path.join(this.projectDir, '.convai', 'pages-analysis.json')
    const analysis: SiteAnalysis = await fs.readJson(analysisPath)
    
    // Load project config
    const configPath = path.join(this.projectDir, '.convai', 'config.json')
    const config = await fs.readJson(configPath)

    // Generate prompt with site knowledge
    const prompt = this.generateSiteAwarePrompt(analysis, config)
    
    // Generate navigation tools
    const tools = this.generateNavigationTools(analysis)
    
    // Generate conversation starters
    const conversationStarters = this.generateConversationStarters(analysis)

    const agentConfig: AgentConfig = {
      name: `${config.projectName} Assistant (${environment})`,
      conversation_config: {
        agent: {
          prompt,
          llm: {
            model: "eleven-multilingual-v1",
            temperature: 0.3
          },
          language: "en",
          tools
        },
        tts: {
          model: "eleven-multilingual-v1",
          voice_id: "pNInz6obpgDQGcFmaJgB"
        },
        asr: {
          model: "nova-2-general",
          language: "auto"
        },
        conversation: {
          max_duration_seconds: 1800,
          text_only: false
        }
      },
      platform_settings: {
        widget: {
          conversation_starters: conversationStarters,
          branding: {
            primary_color: "#007bff",
            secondary_color: "#6c757d"
          }
        }
      }
    }

    return agentConfig
  }

  private generateSiteAwarePrompt(analysis: SiteAnalysis, config: any): string {
    const sitemap = JSON.stringify(analysis.sitemap, null, 2)
    const pageCount = analysis.pages.filter(p => p.type === 'page').length
    
    return `You are an intelligent website assistant for ${config.projectName}. You have complete knowledge of the website's structure and can help users navigate and understand the content.

## Website Structure
This website has ${pageCount} main pages with the following structure:
${sitemap}

## Your Capabilities
1. **Page Navigation**: You can guide users to specific pages and explain what they'll find there
2. **Content Understanding**: You understand the purpose and content of each page based on their metadata
3. **User Guidance**: You can suggest relevant pages based on user questions and needs
4. **Site Overview**: You can explain the overall site structure and help users find what they're looking for

## Navigation Rules
- Always provide clear, helpful directions to relevant pages
- Explain what users will find on each page before suggesting they visit
- Use the page metadata to understand content and purpose
- When users ask about specific topics, suggest the most relevant pages
- Provide direct links when possible using the route information

## Conversation Style
- Be helpful, friendly, and knowledgeable about the website
- Ask clarifying questions when user needs are unclear
- Provide context about why you're suggesting specific pages
- Keep responses concise but informative

Remember: Your primary goal is to help users navigate and understand this website effectively. Use your knowledge of the site structure to provide the most relevant and helpful responses.`
  }

  private generateNavigationTools(analysis: SiteAnalysis): Array<any> {
    const routes = analysis.routes.filter(route => route !== '/api' && !route.includes('/api/'))
    
    return [
      {
        type: "client",
        name: "go_to_route",
        description: "Navigate the user to a specific page on the website",
        parameters: {
          type: "object",
          properties: {
            path: {
              type: "string",
              enum: routes,
              description: "The route/path to navigate to (without domain)"
            }
          },
          required: ["path"]
        }
      },
      {
        type: "function",
        name: "get_page_info",
        description: "Get detailed information about a specific page",
        parameters: {
          type: "object",
          properties: {
            route: {
              type: "string",
              enum: routes,
              description: "The route/path to get information about"
            }
          },
          required: ["route"]
        }
      },
      {
        type: "function",
        name: "search_pages",
        description: "Search for pages related to a specific topic or keyword",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query or topic"
            }
          },
          required: ["query"]
        }
      },
      {
        type: "function",
        name: "get_site_overview",
        description: "Provide an overview of the entire website structure and main sections",
        parameters: {
          type: "object",
          properties: {},
          required: []
        }
      }
    ]
  }

  private generateConversationStarters(analysis: SiteAnalysis): string[] {
    const starters = [
      "Hi! I can help you navigate this website. What are you looking for?",
      "Welcome! I know all about this site's pages and content. How can I assist you?",
      "Hello! Need help finding something specific on this website?"
    ]

    // Add page-specific starters based on common pages
    const commonPages = analysis.pages.filter(p => 
      p.route && ['/', '/about', '/contact', '/services', '/products', '/blog'].includes(p.route)
    )

    if (commonPages.find(p => p.route === '/about')) {
      starters.push("Want to learn more about us? I can tell you about our company.")
    }
    
    if (commonPages.find(p => p.route === '/services' || p.route === '/products')) {
      starters.push("Looking for our services or products? I can guide you there!")
    }

    if (commonPages.find(p => p.route === '/contact')) {
      starters.push("Need to get in touch? I can show you how to contact us.")
    }

    return starters.slice(0, 4) // Limit to 4 starters
  }
}