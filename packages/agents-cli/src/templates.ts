/**
 * Agent configuration template functions
 */

import { ElevenLabs } from "@elevenlabs/elevenlabs-js";

export interface AgentConfig {
  name: string;
  conversation_config: ElevenLabs.ConversationalConfig,
  platform_settings?: ElevenLabs.AgentPlatformSettingsRequestModel
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
        userInputAudioFormat: "pcm_16000",
        keywords: []
      },
      turn: {
        turnTimeout: 7.0,
        silenceEndCallTimeout: -1.0,
        mode: "turn"
      },
      tts: {
        modelId: "eleven_turbo_v2",
        voiceId: "cjVigY5qzO86Huf0OWal",  // Default voice ID
        supportedVoices: [],
        agentOutputAudioFormat: "pcm_16000",
        optimizeStreamingLatency: 3,
        stability: 0.5,
        speed: 1.0,
        similarityBoost: 0.8,
        pronunciationDictionaryLocators: []
      },
      conversation: {
        textOnly: false,
        maxDurationSeconds: 600,
        clientEvents: [
          "audio",
          "interruption"
        ]
      },
      languagePresets: {},
      agent: {
        firstMessage: "",
        language: "en",
        dynamicVariables: {
          dynamicVariablePlaceholders: {}
        },
        prompt: {
          prompt: `You are ${name}, a helpful AI assistant.`,
          llm: "gemini-2.0-flash",
          temperature: 0.0,
          maxTokens: -1,
          tools: [],
          toolIds: [],
          mcpServerIds: [],
          nativeMcpServerIds: [],
          knowledgeBase: [],
          ignoreDefaultPersonality: false,
          rag: {
            enabled: false,
            embeddingModel: "e5_mistral_7b_instruct",
            maxVectorDistance: 0.6,
            maxDocumentsLength: 50000,
            maxRetrievedRagChunksCount: 20
          },
          customLlm: undefined
        }
      }
    },
    platform_settings: {
      auth: {
        enableAuth: false,
        allowlist: [],
        shareableToken: undefined
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
          color1: "#2792dc",
          color2: "#9ce6e6"
        },
        feedbackMode: "none",
        bgColor: "#ffffff",
        textColor: "#000000",
        btnColor: "#000000",
        btnTextColor: "#ffffff",
        borderColor: "#e1e1e1",
        focusColor: "#000000",
        shareablePageShowTerms: true,
        showAvatarWhenCollapsed: false,
        disableBanner: false,
        micMutingEnabled: false,
        transcriptEnabled: false,
        textInputEnabled: true,
        textContents: {
          mainLabel: undefined,
          startCall: undefined,
          newCall: undefined,
          endCall: undefined,
          muteMicrophone: undefined,
          changeLanguage: undefined,
          collapse: undefined,
          expand: undefined,
          copied: undefined,
          acceptTerms: undefined,
          dismissTerms: undefined,
          listeningStatus: undefined,
          speakingStatus: undefined,
          connectingStatus: undefined,
          inputLabel: undefined,
          inputPlaceholder: undefined,
          userEndedConversation: undefined,
          agentEndedConversation: undefined,
          conversationId: undefined,
          errorOccurred: undefined,
          copyId: undefined
        },
        languageSelector: false,
        supportsTextOnly: true,
        languagePresets: {},
        styles: {
          base: undefined,
          baseHover: undefined,
          baseActive: undefined,
          baseBorder: undefined,
          baseSubtle: undefined,
          basePrimary: undefined,
          baseError: undefined,
          accent: undefined,
          accentHover: undefined,
          accentActive: undefined,
          accentBorder: undefined,
          accentSubtle: undefined,
          accentPrimary: undefined,
          overlayPadding: undefined,
          buttonRadius: undefined,
          inputRadius: undefined,
          bubbleRadius: undefined,
          sheetRadius: undefined,
          compactSheetRadius: undefined,
          dropdownSheetRadius: undefined
        },
        borderRadius: undefined,
        btnRadius: undefined,
        actionText: undefined,
        startCallText: undefined,
        endCallText: undefined,
        expandText: undefined,
        listeningText: undefined,
        speakingText: undefined,
        shareablePageText: undefined,
        termsText: undefined,
        termsHtml: undefined,
        termsKey: undefined,
        overrideLink: undefined,
        customAvatarPath: undefined
      },
      dataCollection: {},
      overrides: {
        conversationConfigOverride: {
          tts: {
            voiceId: false
          },
          conversation: {
            textOnly: true
          },
          agent: {
            firstMessage: false,
            language: false,
            prompt: {
              prompt: false
            }
          }
        },
        customLlmExtraBody: false,
        enableConversationInitiationClientDataFromWebhook: false
      },
      callLimits: {
        agentConcurrencyLimit: -1,
        dailyLimit: 100000,
        burstingEnabled: true
      },
      privacy: {
        recordVoice: true,
        retentionDays: -1,
        deleteTranscriptAndPii: false,
        deleteAudio: false,
        applyToExistingConversations: false,
        zeroRetentionMode: false
      },
      workspaceOverrides: {
        webhooks: {
          postCallWebhookId: undefined
        },
        conversationInitiationClientDataWebhook: undefined
      },
      testing: {
        attachedTests: []
      },
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
        textOnly: false
      },
      tts: {
        modelId: "eleven_turbo_v2",
        voiceId: "cjVigY5qzO86Huf0OWal"
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
  if (template.conversation_config.conversation){
    template.conversation_config.conversation.textOnly = false;
  }
  if (template.platform_settings?.widget) {
    template.platform_settings.widget.supportsTextOnly = false;
    template.platform_settings.widget.textInputEnabled = false;
  }
  return template;
}

/**
 * Returns a template optimized for text-only conversations.
 */
export function getTextOnlyTemplate(name: string): AgentConfig {
  const template = getDefaultAgentTemplate(name);
  if (template.conversation_config.conversation){
    template.conversation_config.conversation.textOnly = true;
  }
  if (template.platform_settings?.widget) {
    template.platform_settings.widget.supportsTextOnly = true;
  }
  if (template.platform_settings?.overrides?.conversationConfigOverride?.conversation) {
    template.platform_settings.overrides.conversationConfigOverride.conversation.textOnly = false;
  }
  return template;
}

/**
 * Returns a template pre-configured for customer service scenarios.
 */
export function getCustomerServiceTemplate(name: string): AgentConfig {
  const template = getDefaultAgentTemplate(name);

  //todo angelo fix these shitty compile issues 
  if (template.conversation_config.agent && template.conversation_config.agent.prompt) {
    template.conversation_config.agent.prompt.prompt = `You are ${name}, a helpful customer service representative. You are professional, empathetic, and focused on solving customer problems efficiently.`;
    template.conversation_config.agent.prompt.temperature = 0.1; // More consistent responses
  }
  if (template.conversation_config.conversation){
    template.conversation_config.conversation.maxDurationSeconds = 1800;
  }
  
  
  if (template.platform_settings?.callLimits) {
    template.platform_settings.callLimits.dailyLimit = 10000;
  }

  if (template.platform_settings?.evaluation) {
    template.platform_settings.evaluation.criteria = [
      {
        name: "helpfulness",
        id: "helpfulness",
        conversationGoalPrompt: "was the agent helpful to the user?",
      },
      {
        name: "resolution",
        id: "resolution",
        conversationGoalPrompt: "did the agent resolve the user's issue",
      }
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
  if (template.conversation_config.agent?.prompt) {
    template.conversation_config.agent.prompt.prompt = `You are ${name}, a knowledgeable and helpful AI assistant. You can help with a wide variety of tasks including answering questions, providing explanations, helping with analysis, and creative tasks.`;
    template.conversation_config.agent.prompt.temperature = 0.3; // Balanced creativity
    template.conversation_config.agent.prompt.maxTokens = 1000;
  }
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