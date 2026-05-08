---
"@elevenlabs/types": minor
"@elevenlabs/client": minor
"@elevenlabs/react": minor
"@elevenlabs/react-native": minor
---

Add `onAgentToolResponseFullPayload` callback for the `agent_tool_response_full_payload` server event.

The agent platform can now emit the full tool result payload as an opaque string alongside the existing `agent_tool_response` summary. Subscribe via the new callback to receive the raw `full_tool_result` (and the `truncated` flag indicating whether the server hit the 64 KB cap). The agent must include `agent_tool_response_full_payload` in its `client_events` config to deliver this event.

```tsx
import { ConversationProvider } from "@elevenlabs/react-native";

<ConversationProvider
  agentId="…"
  onAgentToolResponseFullPayload={payload => {
    if (payload.truncated) {
      console.warn("full payload truncated to 64 KB");
    }
    console.log(payload.tool_name, payload.full_tool_result);
  }}
>
  …
</ConversationProvider>
```

The same callback is available on `useConversation`, `startSession`, and the lower-level `Conversation.startSession` in `@elevenlabs/client`.
