/**
 * Agent configuration template functions
 */

export interface AgentConfig {
  name: string;
  conversation_config: {
    agent: {
      prompt: {
        prompt: string;
        temperature: number;
        max_tokens?: number;
        [key: string]: unknown;
      };
      [key: string]: unknown;
    };
    conversation: {
      text_only: boolean;
      max_duration_seconds?: number;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  platform_settings?: {
    widget?: {
      supports_text_only?: boolean;
      text_input_enabled?: boolean;
      [key: string]: unknown;
    };
    call_limits?: {
      daily_limit?: number;
      [key: string]: unknown;
    };
    evaluation?: {
      criteria?: string[];
      [key: string]: unknown;
    };
    overrides?: {
      conversation_config_override?: {
        conversation?: {
          text_only?: boolean;
          [key: string]: unknown;
        };
        [key: string]: unknown;
      };
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  tags: string[];
}

/**
 * Returns a complete default agent configuration template with all available fields.
 * 
 * @param name - The name of the agent
 * @returns A complete agent configuration template
 */
export function getDefaultAgentTemplate(name: string): AgentConfig {
  return {
    name,
    conversation_config: {
      asr: {
        quality: "high",
        provider: "elevenlabs",
        user_input_audio_format: "pcm_16000",
        keywords: []
      },
      turn: {
        turn_timeout: 7.0,
        silence_end_call_timeout: -1.0,
        mode: "turn"
      },
      tts: {
        model_id: "eleven_turbo_v2",
        voice_id: "cjVigY5qzO86Huf0OWal",  // Default voice ID
        supported_voices: [],
        agent_output_audio_format: "pcm_16000",
        optimize_streaming_latency: 3,
        stability: 0.5,
        speed: 1.0,
        similarity_boost: 0.8,
        pronunciation_dictionary_locators: []
      },
      conversation: {
        text_only: false,
        max_duration_seconds: 600,
        client_events: [
          "audio",
          "interruption"
        ]
      },
      language_presets: {},
      agent: {
        first_message: "",
        language: "en",
        dynamic_variables: {
          dynamic_variable_placeholders: {}
        },
        prompt: {
          prompt: `You are ${name}, a helpful AI assistant.`,
          llm: "gemini-2.0-flash",
          temperature: 0.0,
          max_tokens: -1,
          tools: [],
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
            voice_id: false
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
      },
      safety: {
        is_blocked_ivc: false,
        is_blocked_non_ivc: false,
        ignore_safety_evaluation: false
      },
      ban: null
    },
    tags: []
  };
}

/**
 * Returns a minimal agent configuration template with only essential fields.
 * 
 * @param name - The name of the agent
 * @returns A minimal agent configuration template
 */
export function getMinimalAgentTemplate(name: string): AgentConfig {
  return {
    name,
    conversation_config: {
      agent: {
        prompt: {
          prompt: `You are ${name}, a helpful AI assistant.`,
          llm: "gemini-2.0-flash",
          temperature: 0.0
        },
        language: "en"
      },
      conversation: {
        text_only: false
      },
      tts: {
        model_id: "eleven_turbo_v2",
        voice_id: "cjVigY5qzO86Huf0OWal"
      }
    },
    platform_settings: {},
    tags: []
  };
}

/**
 * Returns available template options with descriptions.
 * 
 * @returns A map of template names to descriptions
 */
export function getTemplateOptions(): Record<string, string> {
  return {
    "default": "Complete configuration with all available fields and sensible defaults",
    "minimal": "Minimal configuration with only essential fields",
    "voice-only": "Optimized for voice-only conversations",
    "text-only": "Optimized for text-only conversations",
    "customer-service": "Pre-configured for customer service scenarios",
    "assistant": "General purpose AI assistant configuration"
  };
}

/**
 * Returns a template optimized for voice-only conversations.
 */
export function getVoiceOnlyTemplate(name: string): AgentConfig {
  const template = getDefaultAgentTemplate(name);
  template.conversation_config.conversation.text_only = false;
  if (template.platform_settings?.widget) {
    template.platform_settings.widget.supports_text_only = false;
    template.platform_settings.widget.text_input_enabled = false;
  }
  return template;
}

/**
 * Returns a template optimized for text-only conversations.
 */
export function getTextOnlyTemplate(name: string): AgentConfig {
  const template = getDefaultAgentTemplate(name);
  template.conversation_config.conversation.text_only = true;
  if (template.platform_settings?.widget) {
    template.platform_settings.widget.supports_text_only = true;
  }
  if (template.platform_settings?.overrides?.conversation_config_override?.conversation) {
    template.platform_settings.overrides.conversation_config_override.conversation.text_only = false;
  }
  return template;
}

/**
 * Returns a template pre-configured for customer service scenarios.
 */
export function getCustomerServiceTemplate(name: string): AgentConfig {
  const template = getDefaultAgentTemplate(name);
  template.conversation_config.agent.prompt.prompt = `You are ${name}, a helpful customer service representative. You are professional, empathetic, and focused on solving customer problems efficiently.`;
  template.conversation_config.agent.prompt.temperature = 0.1; // More consistent responses
  template.conversation_config.conversation.max_duration_seconds = 1800; // 30 minutes
  if (template.platform_settings?.call_limits) {
    template.platform_settings.call_limits.daily_limit = 10000;
  }
  if (template.platform_settings?.evaluation) {
    template.platform_settings.evaluation.criteria = [
      "Helpfulness",
      "Professionalism", 
      "Problem Resolution",
      "Response Time"
    ];
  }
  template.tags = ["customer-service"];
  return template;
}

/**
 * Returns a general purpose AI assistant template.
 */
export function getAssistantTemplate(name: string): AgentConfig {
  const template = getDefaultAgentTemplate(name);
  template.conversation_config.agent.prompt.prompt = `You are ${name}, a knowledgeable and helpful AI assistant. You can help with a wide variety of tasks including answering questions, providing explanations, helping with analysis, and creative tasks.`;
  template.conversation_config.agent.prompt.temperature = 0.3; // Balanced creativity
  template.conversation_config.agent.prompt.max_tokens = 1000;
  template.tags = ["assistant", "general-purpose"];
  return template;
}

/**
 * Returns a template by name and type.
 * 
 * @param name - The agent name
 * @param templateType - The type of template to generate
 * @returns An agent configuration template
 * @throws {Error} If template_type is not recognized
 */
export function getTemplateByName(name: string, templateType: string = "default"): AgentConfig {
  const templateFunctions: Record<string, (name: string) => AgentConfig> = {
    "default": getDefaultAgentTemplate,
    "minimal": getMinimalAgentTemplate,
    "voice-only": getVoiceOnlyTemplate,
    "text-only": getTextOnlyTemplate,
    "customer-service": getCustomerServiceTemplate,
    "assistant": getAssistantTemplate
  };
  
  if (!(templateType in templateFunctions)) {
    const available = Object.keys(templateFunctions).join(", ");
    throw new Error(`Unknown template type '${templateType}'. Available: ${available}`);
  }
  
  return templateFunctions[templateType](name);
} 