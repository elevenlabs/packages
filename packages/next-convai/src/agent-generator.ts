import fs from 'fs-extra'
import path from 'path'
import { SiteAnalysis, PageInfo } from './page-analyzer'

export interface AgentConfig {
  name: string
  conversation_config: {
    asr: {
      quality: string
      provider: string
      user_input_audio_format: string
      keywords: string[]
    }
    turn: {
      turn_timeout: number
      silence_end_call_timeout: number
      mode: string
    }
    tts: {
      model_id: string
      voice_id: string
      supported_voices: string[]
      agent_output_audio_format: string
      optimize_streaming_latency: number
      stability: number
      speed: number
      similarity_boost: number
      pronunciation_dictionary_locators: string[]
    }
    conversation: {
      text_only: boolean
      max_duration_seconds: number
      client_events: string[]
    }
    language_presets: Record<string, any>
    agent: {
      first_message: string
      language: string
      dynamic_variables: {
        dynamic_variable_placeholders: Record<string, any>
      }
      prompt: {
        prompt: string
        llm: string
        temperature: number
        max_tokens: number
        tools: any[]
        tool_ids: string[]
        mcp_server_ids: string[]
        native_mcp_server_ids: string[]
        knowledge_base: any[]
        ignore_default_personality: boolean
        rag: {
          enabled: boolean
          embedding_model: string
          max_vector_distance: number
          max_documents_length: number
          max_retrieved_rag_chunks_count: number
        }
        custom_llm: null | any
      }
    }
  }
  platform_settings: {
    auth: {
      enable_auth: boolean
      allowlist: string[]
      shareable_token: null | string
    }
    evaluation: {
      criteria: any[]
    }
    widget: {
      variant: string
      placement: string
      expandable: string
      avatar: {
        type: string
        color_1: string
        color_2: string
      }
      feedback_mode: string
      bg_color: string
      text_color: string
      btn_color: string
      btn_text_color: string
      border_color: string
      focus_color: string
      shareable_page_show_terms: boolean
      show_avatar_when_collapsed: boolean
      disable_banner: boolean
      mic_muting_enabled: boolean
      transcript_enabled: boolean
      text_input_enabled: boolean
      text_contents: {
        main_label: null | string
        start_call: null | string
        new_call: null | string
        end_call: null | string
        mute_microphone: null | string
        change_language: null | string
        collapse: null | string
        expand: null | string
        copied: null | string
        accept_terms: null | string
        dismiss_terms: null | string
        listening_status: null | string
        speaking_status: null | string
        connecting_status: null | string
        input_label: null | string
        input_placeholder: null | string
        user_ended_conversation: null | string
        agent_ended_conversation: null | string
        conversation_id: null | string
        error_occurred: null | string
        copy_id: null | string
      }
      language_selector: boolean
      supports_text_only: boolean
      language_presets: Record<string, any>
      styles: {
        base: null | string
        base_hover: null | string
        base_active: null | string
        base_border: null | string
        base_subtle: null | string
        base_primary: null | string
        base_error: null | string
        accent: null | string
        accent_hover: null | string
        accent_active: null | string
        accent_border: null | string
        accent_subtle: null | string
        accent_primary: null | string
        overlay_padding: null | string
        button_radius: null | string
        input_radius: null | string
        bubble_radius: null | string
        sheet_radius: null | string
        compact_sheet_radius: null | string
        dropdown_sheet_radius: null | string
      }
      border_radius: null | string
      btn_radius: null | string
      action_text: null | string
      start_call_text: null | string
      end_call_text: null | string
      expand_text: null | string
      listening_text: null | string
      speaking_text: null | string
      shareable_page_text: null | string
      terms_text: null | string
      terms_html: null | string
      terms_key: null | string
      override_link: null | string
      custom_avatar_path: null | string
    }
    data_collection: Record<string, any>
    overrides: {
      conversation_config_override: {
        tts: {
          voice_id: boolean
        }
        conversation: {
          text_only: boolean
        }
        agent: {
          first_message: boolean
          language: boolean
          prompt: {
            prompt: boolean
          }
        }
      }
      custom_llm_extra_body: boolean
      enable_conversation_initiation_client_data_from_webhook: boolean
    }
    call_limits: {
      agent_concurrency_limit: number
      daily_limit: number
      bursting_enabled: boolean
    }
    privacy: {
      record_voice: boolean
      retention_days: number
      delete_transcript_and_pii: boolean
      delete_audio: boolean
      apply_to_existing_conversations: boolean
      zero_retention_mode: boolean
    }
    workspace_overrides: {
      webhooks: {
        post_call_webhook_id: null | string
      }
      conversation_initiation_client_data_webhook: null | string
    }
  }
  tags: string[]
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
    
    const agentConfig: AgentConfig = {
      name: `${config.projectName}_assistant_${environment}`,
      conversation_config: {
        asr: {
          quality: "high",
          provider: "elevenlabs",
          user_input_audio_format: "pcm_48000",
          keywords: []
        },
        turn: {
          turn_timeout: 7.0,
          silence_end_call_timeout: -1.0,
          mode: "turn"
        },
        tts: {
          model_id: "eleven_turbo_v2",
          voice_id: "cjVigY5qzO86Huf0OWal",
          supported_voices: [],
          agent_output_audio_format: "pcm_48000",
          optimize_streaming_latency: 3,
          stability: 0.5,
          speed: 1.0,
          similarity_boost: 0.8,
          pronunciation_dictionary_locators: []
        },
        conversation: {
          text_only: false,
          max_duration_seconds: 600,
          client_events: ["audio", "interruption"]
        },
        language_presets: {},
        agent: {
          first_message: `Hi! I can help you navigate ${config.projectName}. What are you looking for?`,
          language: "en",
          dynamic_variables: {
            dynamic_variable_placeholders: {}
          },
          prompt: {
            prompt,
            llm: "gemini-2.0-flash",
            temperature: 0.0,
            max_tokens: -1,
            tools,
            tool_ids: [],
            mcp_server_ids: [],
            native_mcp_server_ids: [],
            knowledge_base: [],
            ignore_default_personality: false,
            rag: {
              enabled: false,
              embedding_model: "e5_mistral_7b_instruct",
              max_vector_distance: 0.6,
              max_documents_length: 50000,
              max_retrieved_rag_chunks_count: 20
            },
            custom_llm: null
          }
        }
      },
      platform_settings: {
        auth: {
          enable_auth: false,
          allowlist: [],
          shareable_token: null
        },
        evaluation: {
          criteria: []
        },
        widget: {
          variant: "full",
          placement: "bottom-right",
          expandable: "never",
          avatar: {
            type: "orb",
            color_1: "#2792dc",
            color_2: "#9ce6e6"
          },
          feedback_mode: "none",
          bg_color: "#ffffff",
          text_color: "#000000",
          btn_color: "#000000",
          btn_text_color: "#ffffff",
          border_color: "#e1e1e1",
          focus_color: "#000000",
          shareable_page_show_terms: true,
          show_avatar_when_collapsed: false,
          disable_banner: false,
          mic_muting_enabled: false,
          transcript_enabled: false,
          text_input_enabled: true,
          text_contents: {
            main_label: null,
            start_call: null,
            new_call: null,
            end_call: null,
            mute_microphone: null,
            change_language: null,
            collapse: null,
            expand: null,
            copied: null,
            accept_terms: null,
            dismiss_terms: null,
            listening_status: null,
            speaking_status: null,
            connecting_status: null,
            input_label: null,
            input_placeholder: null,
            user_ended_conversation: null,
            agent_ended_conversation: null,
            conversation_id: null,
            error_occurred: null,
            copy_id: null
          },
          language_selector: false,
          supports_text_only: true,
          language_presets: {},
          styles: {
            base: null,
            base_hover: null,
            base_active: null,
            base_border: null,
            base_subtle: null,
            base_primary: null,
            base_error: null,
            accent: null,
            accent_hover: null,
            accent_active: null,
            accent_border: null,
            accent_subtle: null,
            accent_primary: null,
            overlay_padding: null,
            button_radius: null,
            input_radius: null,
            bubble_radius: null,
            sheet_radius: null,
            compact_sheet_radius: null,
            dropdown_sheet_radius: null
          },
          border_radius: null,
          btn_radius: null,
          action_text: null,
          start_call_text: null,
          end_call_text: null,
          expand_text: null,
          listening_text: null,
          speaking_text: null,
          shareable_page_text: null,
          terms_text: null,
          terms_html: null,
          terms_key: null,
          override_link: null,
          custom_avatar_path: null
        },
        data_collection: {},
        overrides: {
          conversation_config_override: {
            tts: {
              voice_id: true
            },
            conversation: {
              text_only: true
            },
            agent: {
              first_message: false,
              language: false,
              prompt: {
                prompt: false
              }
            }
          },
          custom_llm_extra_body: false,
          enable_conversation_initiation_client_data_from_webhook: false
        },
        call_limits: {
          agent_concurrency_limit: -1,
          daily_limit: 100000,
          bursting_enabled: true
        },
        privacy: {
          record_voice: true,
          retention_days: -1,
          delete_transcript_and_pii: false,
          delete_audio: false,
          apply_to_existing_conversations: false,
          zero_retention_mode: false
        },
        workspace_overrides: {
          webhooks: {
            post_call_webhook_id: null
          },
          conversation_initiation_client_data_webhook: null
        }
      },
      tags: []
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

}