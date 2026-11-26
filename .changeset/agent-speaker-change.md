---
"@elevenlabs/client": minor
"@elevenlabs/react": minor
"@elevenlabs/types": minor
---

Add `onAgentSpeakerChange(voiceId)`, called when audio in a different voice starts playing. Interrupted audio never reports its voice. On WebRTC it is called when the server announces the speaker. `@elevenlabs/types` gains the `agent_speaker` event.
