---
"@elevenlabs/react": minor
---

Add `useConversationClientTool` hook for dynamically registering client tools from React components.

The hook uses a `Proxy`-backed mutable target so tools added or removed after session start are immediately visible to `BaseConversation` at call time. It follows the existing sub-provider pattern with a new `ConversationClientToolsProvider` and `ConversationClientToolsContext`.

The hook accepts an optional `ClientTools` type parameter — an interface mapping tool names to function signatures — enabling type-safe tool name constraints and handler param/return inference.

**New hook:**

- `useConversationClientTool(name, handler)` — registers a client tool that the agent can invoke, automatically cleaning up on unmount.

**New types:** `ClientTool`, `ClientTools`, `ClientToolResult`.

```tsx
// Untyped — parameters are Record<string, unknown>
useConversationClientTool("get_weather", (params) => {
  return `Weather in ${params.city} is sunny.`;
});

// Type-safe — tool names are constrained, params and return types are inferred
type Tools = {
  get_weather: (params: { city: string }) => string;
  set_volume: (params: { level: number }) => void;
};

useConversationClientTool<Tools>("get_weather", (params) => {
  // params: { city: string }, must return string
  return `Weather in ${params.city} is sunny.`;
});
```
