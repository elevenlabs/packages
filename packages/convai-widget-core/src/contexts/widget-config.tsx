import {
  ReadonlySignal,
  useComputed,
  useSignal,
  useSignalEffect,
} from "@preact/signals";
import { ComponentChildren } from "preact";
import { createContext } from "preact/compat";
import { parsePlacement, parseVariant, WidgetConfig } from "../types/config";
import { useAttribute } from "./attributes";
import { useServerLocation } from "./server-location";

import { useContextSafely } from "../utils/useContextSafely";
import { parseBoolAttribute } from "../types/attributes";
import { useLanguageConfig } from "./language-config";
import { useConversation } from "./conversation";

const WidgetConfigContext = createContext<ReadonlySignal<WidgetConfig> | null>(
  null
);

interface WidgetConfigProviderProps {
  children: ComponentChildren;
}

export function WidgetConfigProvider({ children }: WidgetConfigProviderProps) {
  const { serverUrl } = useServerLocation();
  const agentId = useAttribute("agent-id");
  const overrideConfig = useAttribute("override-config");
  const fetchedConfig = useSignal<WidgetConfig | null>(null);

  useSignalEffect(() => {
    if (overrideConfig.value) {
      try {
        const config = JSON.parse(overrideConfig.value);
        if (config) {
          fetchedConfig.value = config;
          return;
        }
      } catch (error: any) {
        console.error(
          `[ConversationalAI] Cannot parse override-config: ${error?.message}`
        );
      }
    }

    if (!agentId.value) {
      fetchedConfig.value = null;
      return;
    }

    const abort = new AbortController();
    fetchConfig(agentId.value, serverUrl.value, abort.signal)
      .then(config => {
        if (!abort.signal.aborted) {
          fetchedConfig.value = config;
        }
      })
      .catch(error => {
        console.error(
          `[ConversationalAI] Cannot fetch config for agent ${agentId.value}: ${error?.message}`
        );
        if (!abort.signal.aborted) {
          fetchedConfig.value = null;
        }
      });

    return () => {
      abort.abort();
    };
  });

  const variant = useAttribute("variant");
  const placement = useAttribute("placement");
  const termsKey = useAttribute("terms-key");
  const micMuting = useAttribute("mic-muting");
  const transcript = useAttribute("transcript");
  const textInput = useAttribute("text-input");
  const defaultExpanded = useAttribute("default-expanded");
  const alwaysExpanded = useAttribute("always-expanded");
  const overrideTextOnly = useAttribute("override-text-only");

  const value = useComputed<WidgetConfig | null>(() => {
    if (!fetchedConfig.value) {
      return null;
    }

    const patchedVariant = variant.value ?? fetchedConfig.value.variant;
    const patchedPlacement = placement.value ?? fetchedConfig.value.placement;
    const patchedTermsKey = termsKey.value ?? fetchedConfig.value.terms_key;

    const textOnly =
      parseBoolAttribute(overrideTextOnly.value) ??
      fetchedConfig.value.text_only ??
      false;

    const patchedMicMuting =
      parseBoolAttribute(micMuting.value) ??
      fetchedConfig.value.mic_muting_enabled;
    const patchedTranscript =
      parseBoolAttribute(transcript.value) ??
      fetchedConfig.value.transcript_enabled;
    const patchedTextInput =
      parseBoolAttribute(textInput.value) ??
      fetchedConfig.value.text_input_enabled;
    const patchedAlwaysExpanded =
      parseBoolAttribute(alwaysExpanded.value) ??
      fetchedConfig.value.always_expanded ??
      false;
    const patchedDefaultExpanded =
      parseBoolAttribute(defaultExpanded.value) ??
      fetchedConfig.value.default_expanded ??
      false;

    return {
      ...fetchedConfig.value,
      variant: parseVariant(patchedVariant),
      placement: parsePlacement(patchedPlacement),
      terms_key: patchedTermsKey,
      mic_muting_enabled: !textOnly && patchedMicMuting,
      transcript_enabled: textOnly || patchedTranscript,
      text_input_enabled: textOnly || patchedTextInput,
      always_expanded: patchedAlwaysExpanded,
      default_expanded: patchedDefaultExpanded,
    };
  });

  if (!value.value) {
    return null;
  }

  return (
    <WidgetConfigContext.Provider value={value as ReadonlySignal<WidgetConfig>}>
      {children}
    </WidgetConfigContext.Provider>
  );
}

export function useWidgetConfig() {
  return useContextSafely(WidgetConfigContext);
}

export function useTextOnly() {
  const override = useAttribute("override-text-only");
  const config = useWidgetConfig();

  return useComputed(
    () => parseBoolAttribute(override.value) ?? config.value.text_only ?? false
  );
}

export function useIsConversationTextOnly() {
  const textOnly = useTextOnly();
  const { conversationTextOnly } = useConversation();

  return useComputed(() => conversationTextOnly.value ?? textOnly.value);
}

export function useFirstMessage() {
  const override = useAttribute("override-first-message");
  const config = useWidgetConfig();
  const { language } = useLanguageConfig();
  return useComputed(
    () =>
      override.value ??
      config.value.language_presets?.[language.value.languageCode]
        ?.first_message ??
      config.value.first_message ??
      null
  );
}

export function useWebRTC() {
  const config = useWidgetConfig();
  return useComputed(() => config.value.use_rtc ?? false);
}

async function fetchConfig(
  agentId: string,
  serverUrl: string,
  signal: AbortSignal
): Promise<WidgetConfig> {
  const response = await fetch(
    `${serverUrl}/v1/convai/agents/${agentId}/widget`,
    {
      signal,
    }
  );
  const data = await response.json();
  if (!data.widget_config) {
    throw new Error("Response does not contain widget_config");
  }
  return data.widget_config;
}
