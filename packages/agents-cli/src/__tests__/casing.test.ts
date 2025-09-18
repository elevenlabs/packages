import { createAgentApi, updateAgentApi, getAgentApi } from "../elevenlabs-api";

describe("Key casing normalization", () => {
  function makeMockClient() {
    const create = jest.fn().mockResolvedValue({ agentId: "agent_123" });
    const update = jest.fn().mockResolvedValue({ agentId: "agent_123" });
    const get = jest.fn().mockResolvedValue({
      agentId: "agent_123",
      name: "Test Agent",
      conversationConfig: {
        conversation: {
          clientEvents: ["audio", "agent_response"],
        },
        agent: {
          prompt: {
            prompt: "Hi",
            temperature: 0,
          },
        },
      },
      platformSettings: {
        widget: { textInputEnabled: true },
      },
      tags: ["prod"],
    });

    return {
      conversationalAi: {
        agents: { create, update, get },
      },
    } as any;
  }

  it("createAgentApi camelizes outbound conversation_config and platform_settings", async () => {
    const client = makeMockClient();
    const conversation_config = {
      conversation: {
        client_events: ["audio", "interruption"],
      },
      agent: { prompt: { prompt: "hi", temperature: 0 } },
    } as unknown as Record<string, unknown>;
    const platform_settings = {
      widget: { text_input_enabled: true },
    } as unknown as Record<string, unknown>;

    await createAgentApi(
      client,
      "Name",
      conversation_config,
      platform_settings,
      ["prod"]
    );

    expect(client.conversationalAi.agents.create).toHaveBeenCalledTimes(1);
    const [, payload] = [
      (client.conversationalAi.agents.create as jest.Mock).mock.calls[0][0]
        .name,
      (client.conversationalAi.agents.create as jest.Mock).mock.calls[0][0],
    ];

    expect(payload).toEqual(
      expect.objectContaining({
        name: "Name",
        conversationConfig: expect.objectContaining({
          conversation: expect.objectContaining({
            clientEvents: ["audio", "interruption"],
          }),
        }),
        platformSettings: expect.objectContaining({
          widget: expect.objectContaining({ textInputEnabled: true }),
        }),
        tags: ["prod"],
      })
    );
  });

  it("updateAgentApi camelizes outbound conversation_config", async () => {
    const client = makeMockClient();
    const conversation_config = {
      conversation: {
        client_events: ["audio", "agent_response"],
      },
    } as unknown as Record<string, unknown>;

    await updateAgentApi(
      client,
      "agent_123",
      "Name",
      conversation_config,
      undefined,
      ["prod"]
    );

    expect(client.conversationalAi.agents.update).toHaveBeenCalledTimes(1);
    const [agentId, payload] = (
      client.conversationalAi.agents.update as jest.Mock
    ).mock.calls[0];
    expect(agentId).toBe("agent_123");
    expect(payload).toEqual(
      expect.objectContaining({
        name: "Name",
        conversationConfig: expect.objectContaining({
          conversation: expect.objectContaining({
            clientEvents: ["audio", "agent_response"],
          }),
        }),
        tags: ["prod"],
      })
    );
  });

  it("getAgentApi snake_cases inbound response for writing to disk", async () => {
    const client = makeMockClient();
    const response = await getAgentApi(client, "agent_123");

    expect(client.conversationalAi.agents.get).toHaveBeenCalledWith(
      "agent_123"
    );
    expect(response).toEqual(
      expect.objectContaining({
        agent_id: "agent_123",
        conversation_config: expect.objectContaining({
          conversation: expect.objectContaining({
            client_events: ["audio", "agent_response"],
          }),
        }),
        platform_settings: expect.objectContaining({
          widget: expect.objectContaining({ text_input_enabled: true }),
        }),
        tags: ["prod"],
      })
    );
  });
});
