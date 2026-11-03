---
"@elevenlabs/client": minor
"@elevenlabs/react": minor
---

Add an experimental `./experimental` subpath with avatar video. Call `enableAvatarVideo()` to request an avatar for sessions started afterwards, then read the avatar's video track with `onAvatarVideoTrack(conversation, callback)` or, in React, `useAvatarVideoTrack()`. While the avatar is in a WebRTC call, the SDK plays its audio, and output volume, audio callbacks and speaking mode follow it. If the avatar leaves, the call continues on the agent's voice. These exports have no semver guarantees and may change in any release.
