import { createAgentApi, updateAgentApi, getAgentApi } from "../elevenlabs-api";
import { toCamelCaseKeys } from "../utils";

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

  describe("HTTP header preservation", () => {
    it("should preserve standard HTTP headers with hyphens in array format", () => {
      const webhookConfig = {
        name: "test-webhook",
        api_schema: {
          request_headers: [
            { name: "Content-Type", value: "application/json" },
            { name: "X-Api-Key", value: "secret" },
            { name: "Authorization", value: "Bearer token" },
            { name: "User-Agent", value: "convai-cli" },
            { name: "Accept-Language", value: "en-US" }
          ]
        }
      };

      const result = toCamelCaseKeys(webhookConfig);
      
      // Check that the structure is converted to camelCase
      expect(result).toHaveProperty("apiSchema");
      expect(result).toHaveProperty("apiSchema.requestHeaders");
      
      // Check that HTTP header names are preserved
      const headers = (result as any).apiSchema.requestHeaders;
      expect(headers[0].name).toBe("Content-Type");
      expect(headers[1].name).toBe("X-Api-Key");
      expect(headers[2].name).toBe("Authorization");
      expect(headers[3].name).toBe("User-Agent");
      expect(headers[4].name).toBe("Accept-Language");
    });

    it("should preserve HTTP header names when used as object keys", () => {
      const config = {
        api_schema: {
          request_headers: {
            "Content-Type": "application/json",
            "X-Api-Key": "secret-key",
            "Authorization": "Bearer token",
            "User-Agent": "convai-cli/1.0",
            "Accept-Language": "en-US",
            "x-custom-header": "custom-value"
          }
        }
      };

      const result = toCamelCaseKeys(config);
      
      // Structure should be converted to camelCase
      expect(result).toHaveProperty("apiSchema");
      expect(result).toHaveProperty("apiSchema.requestHeaders");
      
      // HTTP header names should be preserved exactly
      const headers = (result as any).apiSchema.requestHeaders;
      expect(headers).toHaveProperty("Content-Type", "application/json");
      expect(headers).toHaveProperty("X-Api-Key", "secret-key");
      expect(headers).toHaveProperty("Authorization", "Bearer token");
      expect(headers).toHaveProperty("User-Agent", "convai-cli/1.0");
      expect(headers).toHaveProperty("Accept-Language", "en-US");
      expect(headers).toHaveProperty("x-custom-header", "custom-value");
      
      // These should NOT exist (camelCased versions)
      expect(headers).not.toHaveProperty("contentType");
      expect(headers).not.toHaveProperty("xApiKey");
      expect(headers).not.toHaveProperty("userAgent");
      expect(headers).not.toHaveProperty("acceptLanguage");
      expect(headers).not.toHaveProperty("xCustomHeader");
    });

    it("should convert non-header keys to camelCase while preserving header names", () => {
      const toolConfig = {
        tool_name: "webhook-tool",
        response_timeout_secs: 30,
        api_schema: {
          request_headers: [
            { header_type: "value", name: "Content-Type", header_value: "application/json" },
            { header_type: "secret", name: "X-Custom-Header", secret_id: "my_secret" }
          ],
          request_body_schema: {
            schema_id: "body",
            schema_type: "object"
          }
        }
      };

      const result = toCamelCaseKeys(toolConfig);
      
      // Non-header keys should be camelCased
      expect(result).toHaveProperty("toolName", "webhook-tool");
      expect(result).toHaveProperty("responseTimeoutSecs", 30);
      expect(result).toHaveProperty("apiSchema.requestBodySchema.schemaId", "body");
      expect(result).toHaveProperty("apiSchema.requestBodySchema.schemaType", "object");
      
      // Header object properties should be camelCased
      const headers = (result as any).apiSchema.requestHeaders;
      expect(headers[0]).toHaveProperty("headerType", "value");
      expect(headers[0]).toHaveProperty("headerValue", "application/json");
      expect(headers[1]).toHaveProperty("headerType", "secret");
      expect(headers[1]).toHaveProperty("secretId", "my_secret");
      
      // But header names should be preserved
      expect(headers[0].name).toBe("Content-Type");
      expect(headers[1].name).toBe("X-Custom-Header");
    });

    it("should handle edge cases in header names", () => {
      const config = {
        api_schema: {
          request_headers: [
            { name: "x-forwarded-for", value: "127.0.0.1" },
            { name: "AUTHORIZATION", value: "Bearer token" },
            { name: "content-length", value: "100" },
            { name: "X-CUSTOM-HEADER", value: "custom" }
          ]
        }
      };

      const result = toCamelCaseKeys(config);
      const headers = (result as any).apiSchema.requestHeaders;
      
      // All header names should be preserved exactly as they are
      expect(headers[0].name).toBe("x-forwarded-for");
      expect(headers[1].name).toBe("AUTHORIZATION");
      expect(headers[2].name).toBe("content-length");
      expect(headers[3].name).toBe("X-CUSTOM-HEADER");
    });
  });
});
