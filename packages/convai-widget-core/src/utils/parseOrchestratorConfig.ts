import type {
  OrchestratorConfig,
  PostCallWebhookConfig,
} from "@elevenlabs/client";

function parseWebhook(value: unknown): PostCallWebhookConfig | undefined {
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

export function parseOrchestratorConfig(
  rawUrl: string,
  agentConfigJSON: string | undefined
): OrchestratorConfig | null {
  const url = rawUrl
    .replace(/^https:\/\//, "wss://")
    .replace(/^http:\/\//, "ws://");

  if (!agentConfigJSON) {
    return { url };
  }

  try {
    const parsed = JSON.parse(agentConfigJSON);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      console.error(
        "[ConversationalAI] orchestrator-agent-config must be a JSON object"
      );
      return null;
    }
    return {
      url,
      agentConfig: parsed.agent_config_dict ?? parsed.agent_config ?? undefined,
      overrideAgentConfigList:
        parsed.override_agent_config_list ??
        parsed.override_agent_config ??
        undefined,
      toolsConfigList:
        parsed.tools_config_list ?? parsed.tools_config ?? undefined,
      promptKnowledgeBase: parsed.prompt_knowledge_base ?? undefined,
      bedrockInferenceProfile:
        typeof parsed.bedrock_inference_profile === "string"
          ? parsed.bedrock_inference_profile
          : undefined,
      postCallTranscriptionWebhook: parseWebhook(
        parsed.post_call_transcription_webhook
      ),
      postCallAudioWebhook: parseWebhook(parsed.post_call_audio_webhook),
    };
  } catch (error) {
    console.error(
      `[ConversationalAI] Cannot parse orchestrator-agent-config: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return null;
  }
}
