import { describe, expect, it } from "vitest";

import { constructOverrides } from "./overrides.js";
import type {
  BaseSessionConfig,
  ConversationConfigOverrideAgentPrompt,
  KnowledgeBaseLocator,
} from "./BaseConnection.js";

describe("constructOverrides", () => {
  it("includes asr keywords in conversation_config_override", () => {
    const event = constructOverrides({
      agentId: "agent_123",
      overrides: {
        asr: {
          keywords: ["Cvent", "registration"],
        },
      },
    });

    expect(event.conversation_config_override?.asr?.keywords).toEqual([
      "Cvent",
      "registration",
    ]);
  });

  it("omits asr when keywords are not provided", () => {
    const event = constructOverrides({
      agentId: "agent_123",
      overrides: {
        agent: {
          firstMessage: "Hello",
        },
      },
    });

    expect(event.conversation_config_override?.asr).toBeUndefined();
  });

  it("includes asr with an empty keywords array when explicitly provided", () => {
    const event = constructOverrides({
      agentId: "agent_123",
      overrides: {
        asr: {
          keywords: [],
        },
      },
    });

    expect(event.conversation_config_override?.asr?.keywords).toEqual([]);
  });

  it("maps tts modelId to model_id in conversation_config_override", () => {
    const event = constructOverrides({
      agentId: "agent_123",
      overrides: {
        tts: {
          voiceId: "voice_123",
          modelId: "eleven_flash_v2_5",
        },
      },
    });

    expect(event.conversation_config_override?.tts).toMatchObject({
      voice_id: "voice_123",
      model_id: "eleven_flash_v2_5",
    });
  });

  it.each([
    "eleven_turbo_v2",
    "eleven_turbo_v2_5",
    "eleven_flash_v2",
    "eleven_flash_v2_5",
    "eleven_multilingual_v2",
    "eleven_v3_conversational",
    "eleven_v4",
    "eleven_v4_turbo",
  ] as const)("serializes TTS model %s as model_id", modelId => {
    const event = constructOverrides({
      agentId: "agent_123",
      overrides: { tts: { modelId } },
    });

    expect(
      JSON.parse(JSON.stringify(event)).conversation_config_override.tts
    ).toEqual({ model_id: modelId });
  });

  it("forwards model ids outside the documented list unchanged", () => {
    const event = constructOverrides({
      agentId: "agent_123",
      overrides: { tts: { modelId: "eleven_future_model" } },
    });

    expect(event.conversation_config_override?.tts?.model_id).toBe(
      "eleven_future_model"
    );
  });

  it("preserves existing tts overrides alongside model_id", () => {
    const event = constructOverrides({
      agentId: "agent_123",
      overrides: {
        tts: {
          modelId: "eleven_v3_conversational",
          voiceId: "voice_123",
          speed: 1.2,
          stability: 0.5,
          similarityBoost: 0.8,
        },
      },
    });

    expect(
      JSON.parse(JSON.stringify(event)).conversation_config_override.tts
    ).toEqual({
      model_id: "eleven_v3_conversational",
      voice_id: "voice_123",
      speed: 1.2,
      stability: 0.5,
      similarity_boost: 0.8,
    });
  });

  it.each([
    { tts: { voiceId: "voice_123" } },
    { tts: {} },
    { tts: { modelId: undefined } },
    { agent: { firstMessage: "Hello" } },
  ])(
    "leaves model_id out of the tts overrides when unspecified (%j)",
    overrides => {
      const event = constructOverrides({ agentId: "agent_123", overrides });

      expect(event.conversation_config_override?.tts).not.toHaveProperty(
        "model_id"
      );
      expect(
        JSON.parse(JSON.stringify(event)).conversation_config_override.tts
      ).not.toHaveProperty("model_id");
    }
  );

  it("omits conversation_config_override when no overrides are provided", () => {
    const event = constructOverrides({ agentId: "agent_123" });

    expect(event).not.toHaveProperty("conversation_config_override");
  });

  it("maps tts cloneStrength to clone_strength in conversation_config_override", () => {
    const event = constructOverrides({
      agentId: "agent_123",
      overrides: {
        tts: {
          cloneStrength: 0.4,
        },
      },
    });

    expect(event.conversation_config_override?.tts?.clone_strength).toBe(0.4);
  });

  it("forwards prompt knowledge_base and tool overrides unchanged", () => {
    const prompt: ConversationConfigOverrideAgentPrompt = {
      prompt: "You are a helpful assistant.",
      llm: "gemini-2.5-flash",
      reasoning_effort: "low",
      tool_ids: ["tool_1"],
      tool_ids_strict: true,
      native_mcp_server_ids: ["mcp_1"],
      knowledge_base: [
        { type: "file", name: "Handbook", id: "kb_1", usage_mode: "prompt" },
        { type: "url", name: "Docs", id: "kb_2" },
      ],
    };

    const event = constructOverrides({
      agentId: "agent_123",
      overrides: { agent: { prompt } },
    });

    expect(
      JSON.parse(JSON.stringify(event)).conversation_config_override.agent
    ).toEqual({ prompt });
  });

  it("maps the remaining agent, tts and conversation overrides", () => {
    const locators = [
      { pronunciation_dictionary_id: "dict_1", version_id: "ver_1" },
    ];
    const supportedVoices = [
      { label: "Narrator", voice_id: "voice_2", language: "de" },
    ];

    const event = constructOverrides({
      agentId: "agent_123",
      overrides: {
        agent: { maxConversationDurationMessage: "We are out of time." },
        tts: {
          pronunciationDictionaryLocators: locators,
          supportedVoices,
        },
        conversation: { maxDurationSeconds: 600 },
      },
    });

    expect(
      JSON.parse(JSON.stringify(event)).conversation_config_override
    ).toEqual({
      agent: { max_conversation_duration_message: "We are out of time." },
      tts: {
        pronunciation_dictionary_locators: locators,
        supported_voices: supportedVoices,
      },
      conversation: { max_duration_seconds: 600 },
    });
  });

  it("maps turn overrides to snake_case", () => {
    const event = constructOverrides({
      agentId: "agent_123",
      overrides: {
        turn: {
          softTimeoutConfig: {
            message: "Hmm, one moment.",
            additionalSoftTimeoutMessages: ["Still thinking."],
          },
          noisyEnvironmentMessage: "It's a bit loud on your end.",
        },
      },
    });

    expect(event.conversation_config_override?.turn).toEqual({
      soft_timeout_config: {
        message: "Hmm, one moment.",
        additional_soft_timeout_messages: ["Still thinking."],
      },
      noisy_environment_message: "It's a bit loud on your end.",
    });
  });

  it("omits turn when no turn overrides are provided", () => {
    const event = constructOverrides({
      agentId: "agent_123",
      overrides: { turn: { noisyEnvironmentMessage: "Loud." } },
    });
    const withoutTurn = constructOverrides({
      agentId: "agent_123",
      overrides: { agent: { firstMessage: "Hello" } },
    });

    expect(event.conversation_config_override?.turn).not.toHaveProperty(
      "soft_timeout_config"
    );
    expect(withoutTurn.conversation_config_override).not.toHaveProperty("turn");
  });
});

describe("overrides.agent.prompt.knowledge_base typing", () => {
  it("accepts KnowledgeBaseLocator entries and rejects unknown types", () => {
    const valid: KnowledgeBaseLocator[] = [
      { type: "folder", name: "Policies", id: "kb_3", usage_mode: "auto" },
    ];
    const overrides: BaseSessionConfig["overrides"] = {
      agent: { prompt: { knowledge_base: valid } },
    };
    const invalid: BaseSessionConfig["overrides"] = {
      agent: {
        prompt: {
          // @ts-expect-error knowledge base type must be a documented value
          knowledge_base: [{ type: "pdf", name: "Doc", id: "kb_4" }],
        },
      },
    };

    expect([overrides, invalid]).toHaveLength(2);
  });
});

describe("constructOverrides initiation fields", () => {
  it("maps branch, workflow and procedure options", () => {
    const event = constructOverrides({
      agentId: "agent_123",
      branchId: "branch_1",
      startingWorkflowNodeId: "node_1",
      procedureIds: ["proc_1", "proc_2"],
      startProcedureIds: ["proc_1"],
    });

    expect(event).toMatchObject({
      branch_id: "branch_1",
      starting_workflow_node_id: "node_1",
      procedure_ids: ["proc_1", "proc_2"],
      start_procedure_ids: ["proc_1"],
    });
  });

  it("maps environment to environment", () => {
    const event = constructOverrides({
      agentId: "agent_123",
      environment: "staging",
    });

    expect(event.environment).toBe("staging");
  });

  it("sends an explicitly empty procedureIds list", () => {
    const event = constructOverrides({
      agentId: "agent_123",
      procedureIds: [],
    });

    expect(event.procedure_ids).toEqual([]);
  });

  it("leaves initiation fields out when unspecified", () => {
    const event = constructOverrides({ agentId: "agent_123" });

    for (const key of [
      "branch_id",
      "environment",
      "starting_workflow_node_id",
      "procedure_ids",
      "start_procedure_ids",
    ]) {
      expect(event).not.toHaveProperty(key);
    }
  });
});
