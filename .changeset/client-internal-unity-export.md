---
"@elevenlabs/client": minor
---

Add `@elevenlabs/client/internal/unity` sub-path export for the Unity SDK's WebGL bridge.

- New `./internal/unity` entrypoint exposing `MediaDeviceInput`, `MediaDeviceOutput`, `attachInputToConnection`, `attachConnectionToOutput`, and `setWebRTCAudioAdapterFactory` as runtime values, plus `WebRTCAudioAdapter`, `AnalysisResult`, `MediaDeviceInputConfig`, `MediaDeviceOutputConfig`, and `WebRTCConnectionConfig` as type-only exports.
- New named type aliases `MediaDeviceInputConfig`, `MediaDeviceOutputConfig`, and `WebRTCConnectionConfig` (the last replaces the previous `ConnectionConfig`, which is kept as a deprecated alias).
