import { SessionConfig } from "@elevenlabs/client";
import { ReadonlySignal, useComputed } from "@preact/signals";
import { ComponentChildren } from "preact";
import { createContext } from "preact/compat";
import { useAttribute } from "./attributes";
import { useLanguageConfig } from "./language-config";
import { useServerLocation } from "./server-location";

import { useContextSafely } from "../utils/useContextSafely";
import { parseBoolAttribute } from "../types/attributes";
import { useTextOnly } from "./widget-config";

type DynamicVariables = Record<string, string | number | boolean>;

const SessionConfigContext =
  createContext<ReadonlySignal<SessionConfig> | null>(null);

interface SessionConfigProviderProps {
  children: ComponentChildren;
}

export function SessionConfigProvider({
  children,
}: SessionConfigProviderProps) {
  const { language } = useLanguageConfig();
  const overridePrompt = useAttribute("override-prompt");
  const overrideFirstMessage = useAttribute("override-first-message");
  const overrideVoiceId = useAttribute("override-voice-id");
  const overrideTextOnly = useAttribute("override-text-only");
  const overrides = useComputed<SessionConfig["overrides"]>(() => ({
    agent: {
      prompt: {
        prompt: overridePrompt.value,
      },
      firstMessage: overrideFirstMessage.value,
      language: language.value.languageCode,
    },
    tts: {
      voiceId: overrideVoiceId.value,
    },
    conversation: {
      textOnly: parseBoolAttribute(overrideTextOnly.value) ?? undefined,
    },
  }));

  const dynamicVariablesJSON = useAttribute("dynamic-variables");
  const dynamicVariables = useComputed(() => {
    if (dynamicVariablesJSON.value) {
      try {
        return JSON.parse(dynamicVariablesJSON.value) as DynamicVariables;
      } catch (e: any) {
        console.error(
          `[ConversationalAI] Cannot parse dynamic-variables: ${e?.message}`
        );
      }
    }

    return undefined;
  });

  const { webSocketUrl } = useServerLocation();
  const agentId = useAttribute("agent-id");
  const signedUrl = useAttribute("signed-url");
  const textOnly = useTextOnly();
  const value = useComputed<SessionConfig | null>(() => {
    const commonConfig = {
      dynamicVariables: dynamicVariables.value,
      overrides: overrides.value,
      connectionDelay: { default: 300 },
      textOnly: textOnly.value,
      connectionType: "websocket" as const,
    };

    if (agentId.value) {
      return {
        agentId: agentId.value,
        origin: webSocketUrl.value,
        ...commonConfig,
      };
    }

    if (signedUrl.value) {
      return {
        signedUrl: signedUrl.value,
        ...commonConfig,
      };
    }

    console.error(
      "[ConversationalAI] Either agent-id or signed-url is required"
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
