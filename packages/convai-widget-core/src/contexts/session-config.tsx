import { SessionConfig, AudioWorkletConfig } from "@elevenlabs/client";
import { ReadonlySignal, useComputed } from "@preact/signals";
import { ComponentChildren } from "preact";
import { createContext } from "preact/compat";
import { useAttribute } from "./attributes";
import { useLanguageConfig } from "./language-config";
import { useServerLocation } from "./server-location";

import { useContextSafely } from "../utils/useContextSafely";
import { parseBoolAttribute } from "../types/attributes";
import { isValidLanguage } from "../types/languages";
import { useTextOnly, useWebRTC, useWidgetConfig } from "./widget-config";
import { parseDynamicVariables } from "../utils/dynamicVariables";
import { parseOrchestratorConfig } from "../utils/parseOrchestratorConfig";

const SessionConfigContext =
  createContext<ReadonlySignal<SessionConfig> | null>(null);

interface SessionConfigProviderProps {
  children: ComponentChildren;
}

export function SessionConfigProvider({
  children,
}: SessionConfigProviderProps) {
  const { language, languageChosen } = useLanguageConfig();
  const overridePrompt = useAttribute("override-prompt");
  const overrideLLM = useAttribute("override-llm");
  const overrideSpeed = useAttribute("override-speed");
  const overrideStability = useAttribute("override-stability");
  const overrideSimilarityBoost = useAttribute("override-similarity-boost");
  const overrideFirstMessage = useAttribute("override-first-message");
  const overrideVoiceId = useAttribute("override-voice-id");
  const overrideTextOnly = useAttribute("override-text-only");
  const userId = useAttribute("user-id");
  const overrides = useComputed<SessionConfig["overrides"]>(() => ({
    agent: {
      prompt: {
        prompt: overridePrompt.value,
        llm: overrideLLM.value,
      },
      firstMessage: overrideFirstMessage.value,
      language: language.value.languageCode,
    },
    tts: {
      voiceId: overrideVoiceId.value,
      speed: overrideSpeed.value ? parseFloat(overrideSpeed.value) : undefined,
      stability: overrideStability.value
        ? parseFloat(overrideStability.value)
        : undefined,
      similarityBoost: overrideSimilarityBoost.value
        ? parseFloat(overrideSimilarityBoost.value)
        : undefined,
    },
    conversation: {
      textOnly: parseBoolAttribute(overrideTextOnly.value) ?? undefined,
    },
  }));

  const dynamicVariablesJSON = useAttribute("dynamic-variables");
  const dynamicVariables = useComputed(() =>
    parseDynamicVariables(dynamicVariablesJSON.value)
  );

  const rawAudioProcessor = useAttribute("worklet-path-raw-audio-processor");
  const audioConcatProcessor = useAttribute(
    "worklet-path-audio-concat-processor"
  );
  const libsamplerate = useAttribute("worklet-path-libsamplerate");

  const { webSocketUrl } = useServerLocation();
  const agentId = useAttribute("agent-id");
  const signedUrl = useAttribute("signed-url");
  const orchestratorUrl = useAttribute("orchestrator-url");
  const orchestratorAgentConfig = useAttribute("orchestrator-agent-config");
  const overrideLanguage = useAttribute("override-language");
  const languageAttribute = useAttribute("language");
  const widgetConfig = useWidgetConfig();
  const environment = useAttribute("environment");
  const textOnly = useTextOnly();
  const useWebRTCEnabled = useWebRTC();
  const parsedOrchestratorConfig = useComputed(() =>
    orchestratorUrl.value
      ? parseOrchestratorConfig(
          orchestratorUrl.value,
          orchestratorAgentConfig.value
        )
      : null
  );
  const value = useComputed<SessionConfig | null>(() => {
    const isWebRTC = useWebRTCEnabled.value;
    const baseConfig = {
      dynamicVariables: dynamicVariables.value,
      overrides: overrides.value,
      connectionDelay: { default: 300 },
      textOnly: textOnly.value,
      userId: userId.value || undefined,
      libsampleratePath: libsamplerate.value,
      workletPaths: {
        rawAudioProcessor: rawAudioProcessor.value,
        audioConcatProcessor: audioConcatProcessor.value,
      },
    } as const satisfies Partial<SessionConfig | AudioWorkletConfig>;

    if (orchestratorUrl.value) {
      const orchestrator = parsedOrchestratorConfig.value;
      if (!orchestrator) {
        return null;
      }
      if (agentId.value || signedUrl.value) {
        console.warn(
          "[ConversationalAI] orchestrator-url takes precedence; agent-id and signed-url are ignored"
        );
      }
      // The agent config carries its own language, so only clear intent
      // forces one: override-language, a picker choice, a resolved language
      // that differs from the appearance default, or a language attribute
      // honoured against a declared supported set. A bare language attribute
      // with no supported set stays inert, as embed boilerplate ships
      // language="en".
      const resolvedLanguage = language.value.languageCode;
      const languageAttributeHonoured =
        (widgetConfig.value.supported_language_overrides ?? []).length > 0 &&
        isValidLanguage(languageAttribute.value) &&
        languageAttribute.value === resolvedLanguage;
      const languageOverride =
        isValidLanguage(overrideLanguage.value) ||
        languageChosen.value ||
        resolvedLanguage !== widgetConfig.value.language ||
        languageAttributeHonoured
          ? resolvedLanguage
          : undefined;

      // Self-hosted orchestrators only expose the conversation WebSocket
      return {
        orchestrator,
        connectionType: "websocket" as const,
        ...baseConfig,
        overrides: {
          ...overrides.value,
          agent: {
            ...overrides.value?.agent,
            language: languageOverride,
          },
        },
      };
    }

    const cloudBaseConfig = {
      ...baseConfig,
      environment: environment.value || undefined,
    };

    if (agentId.value) {
      if (isWebRTC) {
        return {
          agentId: agentId.value,
          origin: webSocketUrl.value,
          connectionType: "webrtc" as const,
          ...cloudBaseConfig,
        };
      } else {
        return {
          agentId: agentId.value,
          origin: webSocketUrl.value,
          connectionType: "websocket" as const,
          ...cloudBaseConfig,
        };
      }
    }

    if (signedUrl.value) {
      // signedUrl only supports websocket connections
      return {
        signedUrl: signedUrl.value,
        connectionType: "websocket" as const,
        ...cloudBaseConfig,
      };
    }

    console.error(
      "[ConversationalAI] Either agent-id, signed-url or orchestrator-url is required"
    );
    return null;
  });

  if (!value.value) {
    return null;
  }

  return (
    <SessionConfigContext.Provider
      value={value as ReadonlySignal<SessionConfig>}
    >
      {children}
    </SessionConfigContext.Provider>
  );
}

export function useSessionConfig() {
  return useContextSafely(SessionConfigContext);
}
