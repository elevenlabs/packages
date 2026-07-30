---
"@elevenlabs/client": minor
"@elevenlabs/react": minor
---

Add `enableLogging` option (`boolean`) to the Scribe realtime API, available on `Scribe.connect` and the `useScribe` hook. Setting it to `false` sends `enable_logging=false` on the WebSocket URL, which runs the session in zero retention mode so history features are unavailable for it. Zero retention mode may only be used by enterprise customers.
