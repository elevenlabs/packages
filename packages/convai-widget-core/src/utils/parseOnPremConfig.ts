import type { OnPremConfig, OnPremWebhookConfig } from "@elevenlabs/client";

function parseWebhook(value: unknown): OnPremWebhookConfig | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const webhook = value as { url?: unknown; hmac_secret?: unknown };
  if (typeof webhook.url !== "string" || !webhook.url) {
    return undefined;
  }
  return {
    url: webhook.url,
    ...(typeof webhook.hmac_secret === "string"
      ? { hmacSecret: webhook.hmac_secret }
      : {}),
  };
}

export function parseOnPremConfig(
  rawConversationUrl: string,
  agentConfigJSON: string | undefined
): OnPremConfig | null {
  const conversationUrl = rawConversationUrl
    .replace(/^https:\/\//, "wss://")
    .replace(/^http:\/\//, "ws://");

  if (!agentConfigJSON) {
    return { conversationUrl };
  }

  try {
    const parsed = JSON.parse(agentConfigJSON);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      console.error(
        "[ConversationalAI] on-prem-agent-config must be a JSON object"
      );
      return null;
    }
    return {
      conversationUrl,
      agentConfig: parsed.agent_config_dict ?? parsed.agent_config ?? undefined,
      overrideAgentConfigList:
        parsed.override_agent_config_list ??
        parsed.override_agent_config ??
        undefined,
      toolsConfigList:
        parsed.tools_config_list ?? parsed.tools_config ?? undefined,
      promptKnowledgeBase: parsed.prompt_knowledge_base ?? undefined,
      postCallTranscriptionWebhook: parseWebhook(
        parsed.post_call_transcription_webhook
      ),
      postCallAudioWebhook: parseWebhook(parsed.post_call_audio_webhook),
    };
  } catch (error) {
    console.error(
      `[ConversationalAI] Cannot parse on-prem-agent-config: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return null;
  }
}
