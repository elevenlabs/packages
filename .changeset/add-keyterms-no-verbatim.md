---
"@elevenlabs/client": minor
"@elevenlabs/react": minor
"@elevenlabs/types": minor
---

Add `keyterms` option (`string[]`) to the Scribe realtime API. Biases the model towards specific terms (max 50 keyterms, each up to 20 chars), passed as repeated query params on the WebSocket URL.
