import type { ConversationConfig, InitiationClientDataEvent } from "../types";
import { PACKAGE_VERSION } from "../version";

export function constructOverrides(
  config: ConversationConfig
): InitiationClientDataEvent {
  const overridesEvent: InitiationClientDataEvent = {
    type: "conversation_initiation_client_data",
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
      },
      conversation: {
        text_only: config.overrides.conversation?.textOnly,
      },
      source_info: {
        source: "react_native_sdk",
        version: config.overrides?.client?.version || PACKAGE_VERSION,
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
    overridesEvent.user_id = String(config.userId);
  }

  return overridesEvent;
}
