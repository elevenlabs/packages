---
"@elevenlabs/client": minor
---

Add `workletPaths.scribeAudioProcessor` to `Scribe.connect({ microphone })` so the Scribe audio worklet can be self-hosted, matching the existing `Conversation` `workletPaths` option. This lets strict CSPs (`script-src`/`script-src-elem` without `blob:`/`data:`) load the worklet from a same-origin URL instead of falling back to a blob or data URL.

The generated worklet processors (including `scribeAudioProcessor.js`) are now also published as static assets under `@elevenlabs/client/worklets/*`, so bundlers can copy them into your own static assets and serve them under `script-src 'self'`.
