---
"@elevenlabs/react": patch
---

Fix `useScribe` calling stale callbacks and reconnecting on its own. The hook captured the callbacks passed on the render that called `connect()`, so a session kept calling the first render's `onCommittedTranscript`, `onError` and the rest. Because those callbacks were also dependencies of `connect`, passing new functions on each render changed `connect` and re-ran the `autoConnect` effect, which started a new session after any close. The hook now reads the latest callbacks through a ref.
