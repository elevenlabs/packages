---
"@elevenlabs/types": minor
"@elevenlabs/client": minor
"@elevenlabs/react": minor
"@elevenlabs/convai-widget-core": minor
---

Add support for the `external_agent_disconnected` client event. The client SDK exposes a new `onExternalAgentDisconnected` callback, and the widget leaves external-agent mode (and clears the typing indicator) when the external human agent disconnects and the AI agent resumes control.
