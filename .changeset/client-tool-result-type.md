---
"@elevenlabs/client": minor
"@elevenlabs/react": minor
---

Widen the client tool return type to everything the SDK already coerces. `BaseConversation` serialises an object result with `JSON.stringify` and sends anything else through `String`, but the declared type stopped at `string | number | void`, so returning an object or a boolean was a type error even though it worked. Both packages now share one exported `ClientToolResult`, so `clientTools`, `ClientTool` and `useConversationClientTool` accept the same results. No runtime change.
