---
"@elevenlabs/client": patch
"@elevenlabs/react": patch
"@elevenlabs/react-native": patch
---

A client tool call for a tool that isn't in `clientTools` is now always answered with an error `client_tool_result`, including when `onUnhandledClientToolCall` is set. Previously, setting that callback stopped the result from being sent, leaving the agent waiting on a tool call nothing would answer. `onUnhandledClientToolCall` is still called, and still replaces the `onError` report.
