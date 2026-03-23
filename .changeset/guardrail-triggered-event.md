---
"@elevenlabs/types": minor
"@elevenlabs/client": minor
---

Add `guardrail_triggered` server-to-client event and `onGuardrailTriggered` callback.

```js
const conversation = await Conversation.startSession({
  agentId: "your-agent-id",
  onGuardrailTriggered: () => {
    console.log("A guardrail was triggered");
  },
});
```
