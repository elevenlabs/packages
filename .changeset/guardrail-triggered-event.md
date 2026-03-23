---
"@elevenlabs/types": minor
"@elevenlabs/client": minor
"@elevenlabs/react": minor
"@elevenlabs/react-native": minor
---

Add `guardrail_triggered` server-to-client WebSocket event, emitted when a guardrail is triggered during the conversation.

**New callback:** `onGuardrailTriggered` on `Callbacks` — fires when the server detects a guardrail violation.

```js
const conversation = await Conversation.startSession({
  agentId: "your-agent-id",
  onGuardrailTriggered: () => {
    console.log("A guardrail was triggered");
  },
});
```
