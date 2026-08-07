---
"@elevenlabs/client": minor
---

Add self-hosted orchestrator session support. Passing `orchestratorConfig` to `Conversation.startSession` routes the conversation WebSocket to a self-hosted (private deployment) orchestrator and sends the agent configuration at connection time, mirroring the Python SDK's `OnPremInitiationData`.
