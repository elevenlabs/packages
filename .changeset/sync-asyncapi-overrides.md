---
"@elevenlabs/types": minor
"@elevenlabs/client": minor
"@elevenlabs/react": minor
---

Sync the conversation initiation contract with the published AsyncAPI spec and expose the new options on the session config:

- `overrides.agent.prompt` accepts `knowledge_base`, `tool_ids`, `tool_ids_strict`, `reasoning_effort` and `native_mcp_server_ids`.
- `overrides.agent.maxConversationDurationMessage`, `overrides.tts.pronunciationDictionaryLocators`, `overrides.tts.supportedVoices`, `overrides.conversation.maxDurationSeconds` and a new `overrides.turn` (`softTimeoutConfig`, `noisyEnvironmentMessage`).
- `branchId`, `startingWorkflowNodeId`, `procedureIds` and `startProcedureIds` are sent with `conversation_initiation_client_data`.
- New `KnowledgeBaseLocator`, `PronunciationDictionaryLocator` and `SupportedVoice` type exports.

Each override still has to be allowed in the agent's override settings.
