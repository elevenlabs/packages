---
"@elevenlabs/client": minor
---

**Breaking:** `VoiceConversation.changeInputDevice()` now returns `void` instead of the input instance. The `input` property is now typed as `InputController & InputEventTarget` interface rather than the concrete implementation, preparing for unified handling of WebSocket and WebRTC input sources. The `Input` class is no longer exported from the package; use the `InputController` interface type instead.
