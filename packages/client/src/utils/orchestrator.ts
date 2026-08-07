import type {
  OrchestratorConfig,
  PostCallWebhookConfig,
} from "./BaseConnection.js";

export const ENCLAVE_SETUP_CONFIG_TYPE = "enclave_setup_config";

export type EnclaveSetupConfigEvent = {
  type: typeof ENCLAVE_SETUP_CONFIG_TYPE;
  agent_config_dict: Record<string, unknown> | null;
  override_agent_config_list: Record<string, unknown>[] | null;
  tools_config_list: Record<string, unknown>[] | null;
  prompt_knowledge_base: string[] | null;
  post_call_transcription_webhook?: { url: string; hmac_secret?: string };
  post_call_audio_webhook?: { url: string; hmac_secret?: string };
};

function webhookToWire(webhook: PostCallWebhookConfig) {
  return {
    url: webhook.url,
    ...(webhook.hmacSecret !== undefined
      ? { hmac_secret: webhook.hmacSecret }
      : {}),
  };
}

export function constructEnclaveSetupConfig(
  config: OrchestratorConfig
): EnclaveSetupConfigEvent {
  const event: EnclaveSetupConfigEvent = {
    type: ENCLAVE_SETUP_CONFIG_TYPE,
    agent_config_dict: config.agentConfig ?? null,
    override_agent_config_list: config.overrideAgentConfigList ?? null,
    tools_config_list: config.toolsConfigList ?? null,
    prompt_knowledge_base: config.promptKnowledgeBase ?? null,
  };

  if (config.postCallTranscriptionWebhook) {
    event.post_call_transcription_webhook = webhookToWire(
      config.postCallTranscriptionWebhook
    );
  }
  if (config.postCallAudioWebhook) {
    event.post_call_audio_webhook = webhookToWire(config.postCallAudioWebhook);
  }

  return event;
}
