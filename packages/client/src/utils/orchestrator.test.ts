import { describe, it, expect } from "vitest";
import { constructEnclaveSetupConfig } from "./orchestrator.js";

describe("constructEnclaveSetupConfig", () => {
  it("maps unset fields to nulls", () => {
    expect(
      constructEnclaveSetupConfig({
        url: "ws://localhost:8000/sagemaker/convai/conversation",
      })
    ).toEqual({
      type: "enclave_setup_config",
      agent_config_dict: null,
      override_agent_config_list: null,
      tools_config_list: null,
      prompt_knowledge_base: null,
    });
  });

  it("maps all fields to the wire format", () => {
    expect(
      constructEnclaveSetupConfig({
        url: "ws://localhost:8000/sagemaker/convai/conversation",
        agentConfig: { name: "agent" },
        overrideAgentConfigList: [{ language: "en" }],
        toolsConfigList: [{ type: "webhook" }],
        promptKnowledgeBase: ["fact"],
        postCallTranscriptionWebhook: {
          url: "https://example.com/transcript",
          hmacSecret: "0123456789abcdef",
        },
        postCallAudioWebhook: { url: "https://example.com/audio" },
      })
    ).toEqual({
      type: "enclave_setup_config",
      agent_config_dict: { name: "agent" },
      override_agent_config_list: [{ language: "en" }],
      tools_config_list: [{ type: "webhook" }],
      prompt_knowledge_base: ["fact"],
      post_call_transcription_webhook: {
        url: "https://example.com/transcript",
        hmac_secret: "0123456789abcdef",
      },
      post_call_audio_webhook: { url: "https://example.com/audio" },
    });
  });
});
