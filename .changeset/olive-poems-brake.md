---
"@elevenlabs/convai-widget-core": minor
"@elevenlabs/convai-widget-embed": minor
---

Add experimental self-hosted orchestrator support. Setting the `orchestrator-url` attribute (optionally with `orchestrator-agent-config` carrying the exported agent configuration JSON) connects the widget to a self-hosted orchestrator instead of the ElevenLabs cloud, with no HTTP config fetch. Like the client SDK's `orchestrator` session option, these attributes are experimental and may change without a major version bump.
