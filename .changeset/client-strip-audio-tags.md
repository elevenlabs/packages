---
"@elevenlabs/client": minor
---

Add an opt-in `stripAudioTags` session option that removes expressive audio tags such as `[laughs]` from agent messages passed to `onMessage` and `onAgentResponseCorrection`, and export the `stripAudioTags` helper. Stripped text no longer lines up character-for-character with `onAudioAlignment` timings, so leave the option off if you rely on them.
