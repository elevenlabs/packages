import type { SessionConfig } from "./BaseConnection";
import type { InitiationClientDataEvent } from "./events";

export const CONVERSATION_INITIATION_CLIENT_DATA_TYPE =
  "conversation_initiation_client_data";

// Extended type to include branch field which may not be in generated types yet
export type ExtendedInitiationClientDataEvent = InitiationClientDataEvent & {
  branch?: string;
};

export function constructOverrides(
  config: SessionConfig
): ExtendedInitiationClientDataEvent {
  const overridesEvent: ExtendedInitiationClientDataEvent = {
    type: CONVERSATION_INITIATION_CLIENT_DATA_TYPE,
  };

  if (config.overrides) {
    overridesEvent.conversation_config_override = {
      agent: {
        prompt: config.overrides.agent?.prompt,
        first_message: config.overrides.agent?.firstMessage,
        language: config.overrides.agent?.language,
      },
      tts: {
        voice_id: config.overrides.tts?.voiceId,
        speed: config.overrides.tts?.speed,
        stability: config.overrides.tts?.stability,
        similarity_boost: config.overrides.tts?.similarityBoost,
      },
      conversation: {
        text_only: config.overrides.conversation?.textOnly,
      },
    };
  }

  if (config.customLlmExtraBody) {
    overridesEvent.custom_llm_extra_body = config.customLlmExtraBody;
  }

  if (config.dynamicVariables) {
    overridesEvent.dynamic_variables = config.dynamicVariables;
  }

  if (config.userId) {
    overridesEvent.user_id = config.userId;
  }

  if (config.overrides?.client) {
    overridesEvent.source_info = {
      source: config.overrides.client.source,
      version: config.overrides.client.version,
    };
  }

  if (config.branch) {
    overridesEvent.branch = config.branch;
  }

  return overridesEvent;
}
