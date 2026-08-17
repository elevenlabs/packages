---
"@elevenlabs/client": minor
---

Add an optional `webRtc.iceTransportPolicy` session option for WebRTC connections. Set to `"relay"` to restrict ICE to TURN relay candidates, for networks that drop direct UDP flows, without patching the global `RTCPeerConnection`.
