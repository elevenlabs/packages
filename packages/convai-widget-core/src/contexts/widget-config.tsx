import {
  ReadonlySignal,
  useComputed,
  useSignal,
  useSignalEffect,
} from "@preact/signals";
import { TinyColor } from "@ctrl/tinycolor";
import { ComponentChildren } from "preact";
import { createContext } from "preact/compat";
import {
  DefaultStyles,
  parsePlacement,
  parseVariant,
  type SyntaxHighlightTheme,
  type WidgetConfig,
} from "../types/config";
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
  const signedUrl = useAttribute("signed-url");
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
    let currentAgentId: string | undefined = agentId.value;
    let conversationSignature: string | undefined;
    if (signedUrl.value) {
      const params = new URL(signedUrl.value).searchParams;
      currentAgentId = params.get("agent_id") ?? agentId.value;
      conversationSignature = params.get("conversation_signature") ?? undefined;
    }

    if (!currentAgentId) {
      fetchedConfig.value = null;
      return;
    }

    const abort = new AbortController();
    fetchConfig(
      currentAgentId,
      serverUrl.value,
      abort.signal,
      conversationSignature
    )
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
  const dismissible = useAttribute("dismissible");
  const stripAudioTags = useAttribute("strip-audio-tags");
  const overrideTextOnly = useAttribute("override-text-only");
  const useRtc = useAttribute("use-rtc");

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
    const patchedDismissible =
      parseBoolAttribute(dismissible.value) ??
      fetchedConfig.value.dismissible ??
      false;
    const patchedStripAudioTags =
      parseBoolAttribute(stripAudioTags.value) ??
      fetchedConfig.value.strip_audio_tags ??
      !textOnly;
    const patchedUseRtc =
      parseBoolAttribute(useRtc.value) ?? fetchedConfig.value.use_rtc ?? false;

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
      dismissible: patchedDismissible,
      strip_audio_tags: patchedStripAudioTags,
      use_rtc: patchedUseRtc,
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

export function useTextInputEnabled() {
  const config = useWidgetConfig();
  return useComputed(() => config.value.text_input_enabled ?? false);
}

export function useLocalizedTerms() {
  const config = useWidgetConfig();
  const { language } = useLanguageConfig();

  return useComputed(() => {
    const languagePreset = config.value.language_presets?.[language.value.languageCode];

    return {
      terms_html: languagePreset?.terms_html ?? config.value.terms_html,
      terms_text: languagePreset?.terms_text ?? config.value.terms_text,
      terms_key: languagePreset?.terms_key ?? config.value.terms_key,
    };
  });
}

export function useWebRTC() {
  const config = useWidgetConfig();
  return useComputed(() => config.value.use_rtc ?? false);
}

export function useEndFeedbackType() {
  const config = useWidgetConfig();
  return useComputed(() => config.value.end_feedback?.type ?? null);
}

export interface MarkdownLinkConfig {
  allowedHosts: string[];
  includeWww: boolean;
  allowHttp: boolean;
}

export function useMarkdownLinkConfig() {
  const overrideHosts = useAttribute("markdown-link-allowed-hosts");
  const overrideIncludeWww = useAttribute("markdown-link-include-www");
  const overrideAllowHttp = useAttribute("markdown-link-allow-http");
  const config = useWidgetConfig();

  return useComputed<MarkdownLinkConfig>(() => {
    let allowedHosts: string[] = [];

    if (overrideHosts.value) {
      allowedHosts = overrideHosts.value
        .split(",")
        .map(d => d.trim())
        .filter(Boolean);
    } else {
      const hosts = config.value.markdown_link_allowed_hosts;
      if (hosts && hosts.length > 0) {
        const hasWildcard = hosts.some(h => h.hostname === "*");
        if (hasWildcard) {
          allowedHosts = ["*"];
        } else {
          allowedHosts = hosts.map(h => h.hostname);
        }
      }
    }

    const includeWww =
      parseBoolAttribute(overrideIncludeWww.value) ??
      config.value.markdown_link_include_www ??
      true;

    const allowHttp =
      parseBoolAttribute(overrideAllowHttp.value) ??
      config.value.markdown_link_allow_http ??
      true;

    return { allowedHosts, includeWww, allowHttp };
  });
}

export function useSyntaxTheme() {
  const override = useAttribute("syntax-highlight-theme");
  const config = useWidgetConfig();

  return useComputed<SyntaxHighlightTheme>(() => {
    // Explicit override takes priority
    const explicitValue = override.value ?? config.value.syntax_highlight_theme;
    if (explicitValue === "light" || explicitValue === "dark") {
      return explicitValue;
    }
    // Auto-detect based on base_active background color
    const baseActive =
      config.value.styles?.base_active ?? DefaultStyles.base_active;
    const color = new TinyColor(baseActive);

    if (!color.isValid) {
      return "light";
    }
    return color.isDark() ? "dark" : "light";
  });
}

async function fetchConfig(
  agentId: string,
  serverUrl: string,
  signal: AbortSignal,
  conversationSignature?: string
): Promise<WidgetConfig> {
  const response = await fetch(
    `${serverUrl}/v1/convai/agents/${agentId}/widget${conversationSignature ? `?conversation_signature=${encodeURIComponent(conversationSignature)}` : ""}`,
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
