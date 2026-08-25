---
"@elevenlabs/client": patch
---

Publish the configured `inputDeviceId` when a WebRTC session starts, instead of the browser's default microphone. The mic was enabled with LiveKit's `setMicrophoneEnabled(true)`, which always captures the default device, so the selected device only drove the local level meter while the agent received a wrong or silent track. `changeInputDevice` now also acquires the new track before stopping the old one, so a failed re-acquire leaves the current microphone live instead of tearing it down.
