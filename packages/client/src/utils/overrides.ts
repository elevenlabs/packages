import type {
  ConversationConfigOverrideTts,
  SessionConfig,
} from "./BaseConnection.js";
import type { InitiationClientDataEvent } from "./events.js";
import { sourceInfo } from "../sourceInfo.js";

export const CONVERSATION_INITIATION_CLIENT_DATA_TYPE =
  "conversation_initiation_client_data";

let avatarVideo = false;

export function enableAvatarVideo(): void {
  avatarVideo = true;
}

export function constructOverrides(
  config: SessionConfig
): InitiationClientDataEvent {
  const overridesEvent: InitiationClientDataEvent & { avatar_video?: true } = {
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
        // Ids outside the generated union are forwarded as-is; the API is the
        // source of truth for which models are accepted.
        ...(config.overrides.tts?.modelId !== undefined
          ? {
              model_id: config.overrides.tts
                .modelId as ConversationConfigOverrideTts["model_id"],
            }
          : {}),
        speed: config.overrides.tts?.speed,
        stability: config.overrides.tts?.stability,
        similarity_boost: config.overrides.tts?.similarityBoost,
        clone_strength: config.overrides.tts?.cloneStrength,
      },
      ...(config.overrides.asr?.keywords !== undefined
        ? { asr: { keywords: config.overrides.asr.keywords } }
        : {}),
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

  overridesEvent.source_info = {
    source: sourceInfo.name,
    version: sourceInfo.version,
  };

  if (config.toolMockConfig) {
    overridesEvent.tool_mock_config = {
      mocking_strategy: config.toolMockConfig.mockingStrategy,
      mocked_tool_names: config.toolMockConfig.mockedToolNames,
      fallback_strategy: config.toolMockConfig.fallbackStrategy,
    };
  }

  if (avatarVideo) {
    overridesEvent.avatar_video = true;
  }

  return overridesEvent;
}
