/**
 * Test configuration template functions
 */

export interface TestConfig {
  [key: string]: unknown;
  chat_history: Array<{
    role: 'user' | 'agent';
    time_in_call_secs: number;
    message?: string;
    agent_metadata?: {
      agent_id?: string;
      workflow_node_id?: string;
    };
    tool_calls?: Array<{
      request_id: string;
      tool_name: string;
      params_as_json: string;
      tool_has_been_called: boolean;
      type?: 'system' | 'webhook' | 'client' | 'mcp' | 'workflow';
    }>;
    tool_results?: unknown[];
    feedback?: {
      score: 'like' | 'dislike';
      time_in_call_secs: number;
    };
  }>;
  success_condition: string;
  success_examples: Array<{
    response: string;
    type: 'success';
  }>;
  failure_examples: Array<{
    response: string;
    type: 'failure';
  }>;
  name: string;
  tool_call_parameters?: {
    parameters?: Array<{
      eval: {
        type: 'llm' | 'regex' | 'exact' | 'anything';
        description?: string;
        pattern?: string;
        expected_value?: string;
      };
      path: string;
    }>;
    referenced_tool?: {
      id: string;
      type: 'system' | 'webhook' | 'client' | 'mcp' | 'workflow';
    };
    verify_absence?: boolean;
  };
  dynamic_variables?: Record<string, string | number | boolean | null>;
  type?: 'llm' | 'tool';
}

/**
 * Returns a basic LLM test template.
 *
 * @param name - The name of the test
 * @param userMessage - The user message to test
 * @param successCondition - Condition that defines success
 * @returns A basic LLM test configuration
 */
export function getBasicLLMTestTemplate(
  name: string,
  userMessage: string = "Hello",
  successCondition: string = "The agent responds in a helpful and professional manner"
): TestConfig {
  return {
    name,
    chat_history: [
      {
        role: 'user',
        time_in_call_secs: 1,
        message: userMessage
      }
    ],
    success_condition: successCondition,
    success_examples: [
      {
        response: "Hello! How can I help you today?",
        type: 'success'
      },
      {
        response: "Hi there! I'm here to assist you.",
        type: 'success'
      }
    ],
    failure_examples: [
      {
        response: "I don't understand",
        type: 'failure'
      },
      {
        response: "Error",
        type: 'failure'
      }
    ],
    type: 'llm'
  };
}

/**
 * Returns a tool-based test template.
 *
 * @param name - The name of the test
 * @param toolName - The name of the tool to test
 * @param toolId - The ID of the tool to test
 * @param userMessage - The user message that should trigger the tool
 * @returns A tool test configuration
 */
export function getToolTestTemplate(
  name: string,
  toolName: string,
  toolId: string,
  userMessage: string = "Please use the tool"
): TestConfig {
  return {
    name,
    chat_history: [
      {
        role: 'user',
        time_in_call_secs: 1,
        message: userMessage
      }
    ],
    success_condition: `The agent successfully calls the ${toolName} tool`,
    success_examples: [
      {
        response: `I'll use the ${toolName} tool to help you with that.`,
        type: 'success'
      }
    ],
    failure_examples: [
      {
        response: "I don't have access to that tool",
        type: 'failure'
      }
    ],
    tool_call_parameters: {
      parameters: [
        {
          eval: {
            type: 'anything'
          },
          path: 'tool_name'
        }
      ],
      referenced_tool: {
        id: toolId,
        type: 'webhook'
      },
      verify_absence: false
    },
    type: 'tool'
  };
}

/**
 * Returns a conversational flow test template.
 *
 * @param name - The name of the test
 * @returns A multi-turn conversation test
 */
export function getConversationFlowTestTemplate(name: string): TestConfig {
  return {
    name,
    chat_history: [
      {
        role: 'user',
        time_in_call_secs: 1,
        message: "Hello, I need help with my account"
      },
      {
        role: 'agent',
        time_in_call_secs: 3,
        message: "I'd be happy to help you with your account. What specific issue are you experiencing?"
      },
      {
        role: 'user',
        time_in_call_secs: 5,
        message: "I can't log in"
      }
    ],
    success_condition: "The agent provides helpful troubleshooting steps for login issues",
    success_examples: [
      {
        response: "Let me help you troubleshoot your login issue. First, please try resetting your password.",
        type: 'success'
      }
    ],
    failure_examples: [
      {
        response: "I don't know how to help with that",
        type: 'failure'
      }
    ],
    type: 'llm'
  };
}

/**
 * Returns a customer service test template.
 *
 * @param name - The name of the test
 * @returns A customer service scenario test
 */
export function getCustomerServiceTestTemplate(name: string): TestConfig {
  return {
    name,
    chat_history: [
      {
        role: 'user',
        time_in_call_secs: 1,
        message: "I'm frustrated with my recent order. It arrived damaged and I want a refund."
      }
    ],
    success_condition: "The agent responds with empathy, acknowledges the issue, and offers a solution",
    success_examples: [
      {
        response: "I'm really sorry to hear about the damaged order. I understand how frustrating that must be. Let me help you get this resolved right away with a full refund.",
        type: 'success'
      }
    ],
    failure_examples: [
      {
        response: "That's not my problem",
        type: 'failure'
      },
      {
        response: "You'll have to contact someone else",
        type: 'failure'
      }
    ],
    type: 'llm'
  };
}

/**
 * Returns available test template options with descriptions.
 *
 * @returns A map of template names to descriptions
 */
export function getTestTemplateOptions(): Record<string, string> {
  return {
    "basic-llm": "Basic LLM response test with simple user input",
    "tool": "Tool usage test to verify agent calls specific tools",
    "conversation-flow": "Multi-turn conversation flow test",
    "customer-service": "Customer service scenario with empathy testing"
  };
}

/**
 * Returns a test template by name.
 *
 * @param name - The test name
 * @param templateType - The type of template to generate
 * @param options - Additional options for template customization
 * @returns A test configuration template
 * @throws {Error} If template_type is not recognized
 */
export function getTestTemplateByName(
  name: string,
  templateType: string = "basic-llm",
  options: {
    userMessage?: string;
    successCondition?: string;
    toolName?: string;
    toolId?: string;
  } = {}
): TestConfig {
  const templateFunctions: Record<string, (name: string, options?: Record<string, unknown>) => TestConfig> = {
    "basic-llm": (name: string, opts: Record<string, unknown> = {}) => getBasicLLMTestTemplate(
      name,
      opts.userMessage as string | undefined,
      opts.successCondition as string | undefined
    ),
    "tool": (name: string, opts: Record<string, unknown> = {}) => getToolTestTemplate(
      name,
      (opts.toolName as string) || "example_tool",
      (opts.toolId as string) || "tool_123",
      opts.userMessage as string | undefined
    ),
    "conversation-flow": getConversationFlowTestTemplate,
    "customer-service": getCustomerServiceTestTemplate
  };

  if (!(templateType in templateFunctions)) {
    const available = Object.keys(templateFunctions).join(", ");
    throw new Error(`Unknown test template type '${templateType}'. Available: ${available}`);
  }

  return templateFunctions[templateType](name, options);
}