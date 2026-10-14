---
"@elevenlabs/client": minor
"@elevenlabs/react": minor
---

Add an `onAudioAlignmentPlayback` callback, called with `{ event_id, alignment }` when an aligned audio chunk starts playing, for syncing text with speech. On WebRTC it fires when the chunk is received instead.
