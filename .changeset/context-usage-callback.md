---
"@elevenlabs/client": minor
"@elevenlabs/react": minor
"@elevenlabs/types": patch
---

Add support for the `context_usage` server event via a new `onContextUsage` callback. The event is emitted after each completed agent turn and reports `{ event_id, model, context_tokens, context_limit_tokens }`, where `context_tokens` is the prompt size of the turn's last LLM generation and `context_limit_tokens` is that model's maximum context window — useful for surfacing how close a long conversation is to the context limit.
