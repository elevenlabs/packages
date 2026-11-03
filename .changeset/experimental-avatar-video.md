---
"@elevenlabs/client": minor
"@elevenlabs/react": minor
---

Add experimental avatar video under the `./experimental` subpath. Call `enableAvatarVideo()` to request an avatar, then read its video track with `onAvatarVideoTrack(conversation, callback)` or, in React, `useAvatarVideoTrack()`. While the avatar is in a WebRTC call, the SDK plays its audio and follows its speech. If it leaves, the call continues on the agent's voice. These exports may change in any release.
