---
"@elevenlabs/client": minor
---

Add an optional `webRtc.singlePeerConnection` session option for WebRTC connections. Set it to `false` to force LiveKit's dual peer connection path, which restores the microphone request timing used before livekit-client began defaulting to the v1 join protocol. Leaving it unset keeps livekit-client's own default.
