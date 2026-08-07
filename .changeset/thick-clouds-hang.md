---
"@elevenlabs/client": minor
---

Add on-prem session support. Passing `onPremConfig` to `Conversation.startSession` routes the conversation WebSocket to a self-hosted orchestrator and sends the agent configuration at connection time, mirroring the Python SDK's `OnPremInitiationData`.
