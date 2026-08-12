---
"@elevenlabs/client": minor
---

Add an optional `rtcConfig` session option, passed through to LiveKit's `room.connect()` as `RTCConfiguration` overrides for WebRTC connections. This allows, for example, forcing TURN relay candidates with `{ iceTransportPolicy: "relay" }` on networks that drop direct UDP flows, without patching the global `RTCPeerConnection`.
