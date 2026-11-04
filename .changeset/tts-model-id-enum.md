---
"@elevenlabs/client": minor
"@elevenlabs/types": minor
---

Type `overrides.tts.modelId` with the documented ElevenAgents TTS model values (`eleven_turbo_v2`, `eleven_turbo_v2_5`, `eleven_flash_v2`, `eleven_flash_v2_5`, `eleven_multilingual_v2`, `eleven_v3_conversational`, `eleven_v4`, `eleven_v4_turbo`) instead of a plain `string`. `model_id` is only added to `conversation_config_override.tts` when `modelId` is provided. `@elevenlabs/types` adds the `ConversationConfigOverrideTtsModelId` union, and `@elevenlabs/client` re-exports `ConversationConfigOverrideTts`.
