# Dynamic Variables Auto-Fill Feature

## Problem

When your ElevenLabs agent has tools that reference dynamic variables, the server validates that all referenced dynamic variables are provided during conversation initiation. If any required dynamic variable is missing, you'll receive an error like:

```
This conversation failed with the following reason:
Missing required dynamic variables in tools: {'previous_clients', 'clients', 'previous_matters', 'conversation_history', 'previous_submissions', 'matters'}
```

This creates a challenge when:
- Different parts of your application provide different sets of dynamic variables
- Your colleague adds new dynamic variables to the agent's tools without your knowledge
- You don't always have values for all required dynamic variables

## Solution

The ElevenLabs SDKs now support automatic filling of missing dynamic variables with default values. You can specify which dynamic variables your agent expects and what default value to use for any that aren't provided.

## Usage

### Option 1: Specify Expected Dynamic Variables

Tell the SDK which dynamic variables your agent expects, and it will automatically fill in any missing ones:

```typescript
import { useConversation } from '@elevenlabs/react';

function MyComponent() {
  const conversation = useConversation({
    onConnect: () => console.log('Connected'),
  });

  const startConversation = () => {
    conversation.startSession({
      agentId: 'your-agent-id',

      // The dynamic variables you have available
      dynamicVariables: {
        clients: 'Client A',
        matters: 'Matter B',
        conversation_history: 'Previous discussion...',
      },

      // List ALL dynamic variables your agent's tools expect
      expectedDynamicVariables: [
        'clients',
        'matters',
        'previous_clients',
        'previous_matters',
        'conversation_history',
        'previous_submissions',
      ],

      // Default value for missing variables (defaults to null)
      missingDynamicVariableDefault: null,
    });
  };

  return <button onClick={startConversation}>Start</button>;
}
```

In this example:
- You provide 3 dynamic variables: `clients`, `matters`, `conversation_history`
- The agent expects 6 dynamic variables
- Missing variables (`previous_clients`, `previous_matters`, `previous_submissions`) are automatically filled with `null`

### Option 2: Use Different Default Values

You can use different default values depending on your use case:

```typescript
// Use empty string as default
conversation.startSession({
  agentId: 'your-agent-id',
  dynamicVariables: { clients: 'Client A' },
  expectedDynamicVariables: ['clients', 'matters', 'notes'],
  missingDynamicVariableDefault: '', // Empty string instead of null
});

// Use a placeholder string
conversation.startSession({
  agentId: 'your-agent-id',
  dynamicVariables: { clients: 'Client A' },
  expectedDynamicVariables: ['clients', 'matters', 'notes'],
  missingDynamicVariableDefault: 'N/A',
});

// Use number 0
conversation.startSession({
  agentId: 'your-agent-id',
  dynamicVariables: { count: 5 },
  expectedDynamicVariables: ['count', 'total', 'average'],
  missingDynamicVariableDefault: 0,
});

// Use boolean false
conversation.startSession({
  agentId: 'your-agent-id',
  dynamicVariables: { isActive: true },
  expectedDynamicVariables: ['isActive', 'isComplete', 'isApproved'],
  missingDynamicVariableDefault: false,
});
```

## Examples by SDK

### React SDK (Web)

```typescript
import { useConversation } from '@elevenlabs/react';

function App() {
  const conversation = useConversation();

  const handleStart = () => {
    conversation.startSession({
      agentId: 'your-agent-id',
      dynamicVariables: {
        user_name: 'John Doe',
        user_email: 'john@example.com',
      },
      expectedDynamicVariables: [
        'user_name',
        'user_email',
        'previous_orders',
        'loyalty_points',
        'support_history',
      ],
      missingDynamicVariableDefault: null,
    });
  };

  return <button onClick={handleStart}>Start Chat</button>;
}
```

### React Native SDK

```typescript
import { useConversation } from '@elevenlabs/react-native';

function ChatScreen() {
  const { conversation } = useConversation();

  const startChat = async () => {
    await conversation.startSession({
      agentId: 'your-agent-id',
      dynamicVariables: {
        user_id: '12345',
        device_type: 'mobile',
      },
      expectedDynamicVariables: [
        'user_id',
        'device_type',
        'session_history',
        'preferences',
      ],
      missingDynamicVariableDefault: '',
    });
  };

  return <Button title="Start Chat" onPress={startChat} />;
}
```

### Web Widget (HTML)

```html
<elevenlabs-convai-widget
  agent-id="your-agent-id"
  dynamic-variables='{"clients":"Client A","matters":"Matter B"}'
  expected-dynamic-variables='["clients","matters","previous_clients","previous_matters","conversation_history","previous_submissions"]'
  missing-dynamic-variable-default="null"
></elevenlabs-convai-widget>
```

Or with JavaScript:

```html
<elevenlabs-convai-widget id="chat-widget"></elevenlabs-convai-widget>

<script>
  const widget = document.getElementById('chat-widget');

  widget.setAttribute('agent-id', 'your-agent-id');
  widget.setAttribute('dynamic-variables', JSON.stringify({
    clients: 'Client A',
    matters: 'Matter B'
  }));
  widget.setAttribute('expected-dynamic-variables', JSON.stringify([
    'clients',
    'matters',
    'previous_clients',
    'previous_matters',
    'conversation_history',
    'previous_submissions'
  ]));
  widget.setAttribute('missing-dynamic-variable-default', 'null');
</script>
```

### Vanilla JavaScript (Client SDK)

```typescript
import { Conversation } from '@elevenlabs/client';

const conversation = new Conversation();

conversation.startSession({
  agentId: 'your-agent-id',
  connectionType: 'webrtc',
  dynamicVariables: {
    session_id: 'abc123',
    user_role: 'admin',
  },
  expectedDynamicVariables: [
    'session_id',
    'user_role',
    'permissions',
    'team_id',
    'workspace',
  ],
  missingDynamicVariableDefault: null,
});
```

## How to Find Which Dynamic Variables Your Agent Expects

If you don't know which dynamic variables your agent's tools require, you can:

1. **Check the error message**: When a conversation fails, the error lists the missing variables
2. **Review tool configurations**: Check your agent's tool definitions in the ElevenLabs dashboard
3. **Coordinate with your team**: Ask whoever configured the agent which dynamic variables are needed
4. **Use a comprehensive list**: Include all possible variables your application might use

## Best Practices

1. **Be Comprehensive**: List ALL dynamic variables that any of your agent's tools might reference
2. **Use Appropriate Defaults**: Choose default values that make sense for your use case
   - `null`: When the absence of data should be explicit
   - `""` (empty string): When tools expect string values
   - `0`: When tools expect numeric values
   - `false`: When tools expect boolean values

3. **Document Your Variables**: Keep a list of all dynamic variables used by your agent in your codebase
4. **Validate Critical Data**: If certain variables are truly required for your business logic, validate them before starting the session

## Migration Guide

### Before (Would Fail)

```typescript
conversation.startSession({
  agentId: 'your-agent-id',
  dynamicVariables: {
    clients: 'Client A',
    matters: 'Matter B',
  },
});
// Error: Missing required dynamic variables in tools:
// {'previous_clients', 'previous_matters', 'conversation_history'}
```

### After (Works!)

```typescript
conversation.startSession({
  agentId: 'your-agent-id',
  dynamicVariables: {
    clients: 'Client A',
    matters: 'Matter B',
  },
  expectedDynamicVariables: [
    'clients',
    'matters',
    'previous_clients',
    'previous_matters',
    'conversation_history',
  ],
  missingDynamicVariableDefault: null,
});
// Success! Missing variables are automatically filled with null
```

## TypeScript Support

The feature is fully typed in TypeScript:

```typescript
interface SessionConfig {
  dynamicVariables?: Record<string, string | number | boolean>;
  expectedDynamicVariables?: string[];
  missingDynamicVariableDefault?: string | number | boolean | null;
  // ... other config options
}
```

## Notes

- The `missingDynamicVariableDefault` option only takes effect when `expectedDynamicVariables` is specified
- Provided dynamic variables are never overwritten by the default value
- If you don't specify `missingDynamicVariableDefault`, it defaults to `null`
- The feature works across all SDKs: React, React Native, Web Widget, and vanilla JavaScript client

## Support

If you encounter issues or have questions, please file an issue at:
https://github.com/elevenlabs/packages/issues
