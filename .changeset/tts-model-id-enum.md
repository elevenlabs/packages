---
"@elevenlabs/client": minor
"@elevenlabs/types": minor
---

Type the existing `overrides.tts.modelId` from the spec. `@elevenlabs/types` now declares the documented ElevenAgents TTS models (`eleven_turbo_v2`, `eleven_turbo_v2_5`, `eleven_flash_v2`, `eleven_flash_v2_5`, `eleven_multilingual_v2`, `eleven_v3_conversational`, `eleven_v4`, `eleven_v4_turbo`) as `ConversationConfigOverrideTtsModelId`, and `@elevenlabs/client` suggests them when setting `modelId`. Any other string is still accepted so that newly released or deprecated models are never rejected by the compiler, but the API may reject ids outside the documented list at runtime. `model_id` is only added to `conversation_config_override.tts` when `modelId` is provided.
