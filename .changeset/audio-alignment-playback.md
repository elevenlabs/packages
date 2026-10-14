---
"@elevenlabs/client": minor
"@elevenlabs/react": minor
---

Add an `onAudioAlignmentPlayback` callback that receives `{ event_id, alignment }` when an audio chunk with character alignment starts playing, so displayed text can be synced with speech. Chunks discarded by an interruption are skipped. On WebRTC connections it fires when the chunk is received, so timing is approximate. `onAudioAlignment` is unchanged and still fires on receipt.
