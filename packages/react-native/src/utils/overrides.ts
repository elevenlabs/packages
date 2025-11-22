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
    };
  }

  overridesEvent.source_info = {
    source: "react_native_sdk",
    version: config.overrides?.client?.version || PACKAGE_VERSION,
  };

  if (config.customLlmExtraBody) {
    overridesEvent.custom_llm_extra_body = config.customLlmExtraBody;
  }

  // Handle dynamic variables with auto-filling of missing required variables
  if (config.dynamicVariables || config.expectedDynamicVariables) {
    const providedVariables = config.dynamicVariables || {};

    // If expectedDynamicVariables is specified, fill in missing ones with default value
    if (
      config.expectedDynamicVariables &&
      config.expectedDynamicVariables.length > 0
    ) {
      const defaultValue = config.missingDynamicVariableDefault ?? null;
      const filledVariables: Record<string, string | number | boolean | null> =
        { ...providedVariables };

      // Add missing variables with default value
      for (const varName of config.expectedDynamicVariables) {
        if (!(varName in filledVariables)) {
          filledVariables[varName] = defaultValue;
        }
      }

      overridesEvent.dynamic_variables = filledVariables as Record<
        string,
        string | number | boolean
      >;
    } else {
      overridesEvent.dynamic_variables = providedVariables;
    }
  }

  if (config.userId) {
    overridesEvent.user_id = String(config.userId);
  }

  return overridesEvent;
}
