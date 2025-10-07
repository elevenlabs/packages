import { describe, it, expect } from "@jest/globals";
import {
  getBasicLLMTestTemplate,
  getToolTestTemplate,
  getConversationFlowTestTemplate,
  getCustomerServiceTestTemplate,
  getTestTemplateOptions,
  getTestTemplateByName,
  TestConfig,
} from "../test-templates";

describe("Test Templates", () => {
  describe("getBasicLLMTestTemplate", () => {
    it("should create a basic LLM test with default values", () => {
      const testName = "Basic Test";
      const config = getBasicLLMTestTemplate(testName);

      expect(config.name).toBe(testName);
      expect(config.type).toBe("llm");
      expect(config.chat_history).toHaveLength(1);
      expect(config.chat_history[0].role).toBe("user");
      expect(config.chat_history[0].message).toBe("Hello");
      expect(config.success_condition).toBe(
        "The agent responds in a helpful and professional manner"
      );
      expect(config.success_examples).toHaveLength(2);
      expect(config.failure_examples).toHaveLength(2);
    });

    it("should create a basic LLM test with custom values", () => {
      const testName = "Custom Test";
      const userMessage = "How are you?";
      const successCondition = "Agent responds politely";

      const config = getBasicLLMTestTemplate(
        testName,
        userMessage,
        successCondition
      );

      expect(config.name).toBe(testName);
      expect(config.chat_history[0].message).toBe(userMessage);
      expect(config.success_condition).toBe(successCondition);
    });
  });

  describe("getToolTestTemplate", () => {
    it("should create a tool test with required parameters", () => {
      const testName = "Tool Test";
      const toolName = "weather_tool";
      const toolId = "tool_123";
      const userMessage = "What's the weather?";

      const config = getToolTestTemplate(
        testName,
        toolName,
        toolId,
        userMessage
      );

      expect(config.name).toBe(testName);
      expect(config.type).toBe("tool");
      expect(config.chat_history[0].message).toBe(userMessage);
      expect(config.success_condition).toBe(
        `The agent successfully calls the ${toolName} tool`
      );
      expect(config.tool_call_parameters?.referenced_tool?.id).toBe(toolId);
      expect(config.tool_call_parameters?.referenced_tool?.type).toBe(
        "webhook"
      );
      expect(config.tool_call_parameters?.verify_absence).toBe(false);
    });

    it("should create a tool test with default message", () => {
      const config = getToolTestTemplate("Test", "tool", "id");
      expect(config.chat_history[0].message).toBe("Please use the tool");
    });
  });

  describe("getConversationFlowTestTemplate", () => {
    it("should create a multi-turn conversation test", () => {
      const testName = "Conversation Test";
      const config = getConversationFlowTestTemplate(testName);

      expect(config.name).toBe(testName);
      expect(config.type).toBe("llm");
      expect(config.chat_history).toHaveLength(3);

      // Check conversation flow
      expect(config.chat_history[0].role).toBe("user");
      expect(config.chat_history[1].role).toBe("agent");
      expect(config.chat_history[2].role).toBe("user");

      expect(config.chat_history[0].message).toContain("account");
      expect(config.chat_history[2].message).toContain("log in");
    });
  });

  describe("getCustomerServiceTestTemplate", () => {
    it("should create a customer service test", () => {
      const testName = "CS Test";
      const config = getCustomerServiceTestTemplate(testName);

      expect(config.name).toBe(testName);
      expect(config.type).toBe("llm");
      expect(config.chat_history).toHaveLength(1);
      expect(config.chat_history[0].message).toContain("frustrated");
      expect(config.chat_history[0].message).toContain("damaged");
      expect(config.success_condition).toContain("empathy");
      expect(config.success_condition).toContain("solution");
    });
  });

  describe("getTestTemplateOptions", () => {
    it("should return available template options", () => {
      const options = getTestTemplateOptions();

      expect(options).toHaveProperty("basic-llm");
      expect(options).toHaveProperty("tool");
      expect(options).toHaveProperty("conversation-flow");
      expect(options).toHaveProperty("customer-service");

      expect(typeof options["basic-llm"]).toBe("string");
      expect(options["basic-llm"]).toContain("Basic LLM");
    });
  });

  describe("getTestTemplateByName", () => {
    it("should return basic-llm template by default", () => {
      const config = getTestTemplateByName("Test");
      expect(config.type).toBe("llm");
      expect(config.chat_history).toHaveLength(1);
    });

    it("should return basic-llm template when specified", () => {
      const config = getTestTemplateByName("Test", "basic-llm");
      expect(config.type).toBe("llm");
      expect(config.success_condition).toContain("helpful and professional");
    });

    it("should return tool template when specified", () => {
      const config = getTestTemplateByName("Test", "tool", {
        toolName: "my_tool",
        toolId: "tool_456",
      });
      expect(config.type).toBe("tool");
      expect(config.tool_call_parameters?.referenced_tool?.id).toBe("tool_456");
    });

    it("should return conversation-flow template when specified", () => {
      const config = getTestTemplateByName("Test", "conversation-flow");
      expect(config.type).toBe("llm");
      expect(config.chat_history).toHaveLength(3);
    });

    it("should return customer-service template when specified", () => {
      const config = getTestTemplateByName("Test", "customer-service");
      expect(config.type).toBe("llm");
      expect(config.chat_history[0].message).toContain("frustrated");
    });

    it("should throw error for unknown template type", () => {
      expect(() => {
        getTestTemplateByName("Test", "unknown-template");
      }).toThrow("Unknown test template type");
    });

    it("should use custom options for basic-llm template", () => {
      const config = getTestTemplateByName("Test", "basic-llm", {
        userMessage: "Custom message",
        successCondition: "Custom condition",
      });

      expect(config.chat_history[0].message).toBe("Custom message");
      expect(config.success_condition).toBe("Custom condition");
    });

    it("should use custom options for tool template", () => {
      const config = getTestTemplateByName("Test", "tool", {
        toolName: "custom_tool",
        toolId: "custom_id",
        userMessage: "Use custom tool",
      });

      expect(config.chat_history[0].message).toBe("Use custom tool");
      expect(config.success_condition).toContain("custom_tool");
      expect(config.tool_call_parameters?.referenced_tool?.id).toBe(
        "custom_id"
      );
    });
  });

  describe("TestConfig interface validation", () => {
    it("should have valid structure for all templates", () => {
      const templates = [
        getBasicLLMTestTemplate("Test"),
        getToolTestTemplate("Test", "tool", "id"),
        getConversationFlowTestTemplate("Test"),
        getCustomerServiceTestTemplate("Test"),
      ];

      templates.forEach((config: TestConfig) => {
        // Required fields
        expect(config).toHaveProperty("name");
        expect(config).toHaveProperty("chat_history");
        expect(config).toHaveProperty("success_condition");
        expect(config).toHaveProperty("success_examples");
        expect(config).toHaveProperty("failure_examples");

        // Type validation
        expect(typeof config.name).toBe("string");
        expect(Array.isArray(config.chat_history)).toBe(true);
        expect(typeof config.success_condition).toBe("string");
        expect(Array.isArray(config.success_examples)).toBe(true);
        expect(Array.isArray(config.failure_examples)).toBe(true);

        // Chat history structure
        config.chat_history.forEach(entry => {
          expect(entry).toHaveProperty("role");
          expect(entry).toHaveProperty("time_in_call_secs");
          expect(["user", "agent"]).toContain(entry.role);
          expect(typeof entry.time_in_call_secs).toBe("number");
        });

        // Examples structure
        config.success_examples.forEach(example => {
          expect(example).toHaveProperty("response");
          expect(example).toHaveProperty("type");
          expect(example.type).toBe("success");
        });

        config.failure_examples.forEach(example => {
          expect(example).toHaveProperty("response");
          expect(example).toHaveProperty("type");
          expect(example.type).toBe("failure");
        });
      });
    });
  });
});
