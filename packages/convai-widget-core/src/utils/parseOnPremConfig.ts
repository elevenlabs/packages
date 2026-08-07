import type { OnPremConfig, OnPremWebhookConfig } from "@elevenlabs/client";

function parseWebhook(value: unknown): OnPremWebhookConfig | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const webhook = value as { url?: string; hmac_secret?: string };
  if (!webhook.url) {
    return undefined;
  }
  return {
    url: webhook.url,
    ...(webhook.hmac_secret !== undefined
      ? { hmacSecret: webhook.hmac_secret }
      : {}),
  };
}

export function parseOnPremConfig(
  conversationUrl: string,
  agentConfigJSON: string | undefined
): OnPremConfig | null {
  if (!agentConfigJSON) {
    return { conversationUrl };
  }

  try {
    const parsed = JSON.parse(agentConfigJSON);
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
