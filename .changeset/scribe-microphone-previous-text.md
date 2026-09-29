---
"@elevenlabs/client": minor
"@elevenlabs/react": minor
---

Add a `previousText` option to `Scribe.connect()` and `useScribe()` in microphone mode. It is sent with the first microphone audio chunk to give the model context, such as existing document text, for casing, punctuation and sentence continuation.
