---
"@elevenlabs/client": patch
---

Fix iOS Safari dropping the first message's audio on WebSocket voice sessions.

iOS Safari blocks `HTMLAudioElement` autoplay (including elements fed by `MediaStreamDestination`) when the underlying `AudioContext` wasn't started synchronously inside a user gesture, and additionally needs the audio element to have an explicit `play()` call against a non-empty playback graph. The web setup chain awaits `getUserMedia`, the connection handshake, and the audio worklet load before `MediaDeviceOutput` would have created its `AudioContext`, so by then the gesture is already consumed. The first agent message would arrive into a suspended context and never play; subsequent messages worked because the mic capture had reactivated iOS's audio session by then.

The fix has two parts:

- On import, the web entry point installs capture-phase `touchstart`/`touchend`/`click` listeners on `document`. The first user interaction creates and unlocks an `AudioContext` (silent `BufferSource.start(0)` + `resume()`) and stashes it for the next session. The stash auto-discards after 30s if no session starts. Capture-phase is needed because the convai widget awaits a terms-modal promise between the user's tap and `Conversation.startSession`, which would otherwise consume the gesture before any session code runs.
- After the worklet is wired up, `MediaDeviceOutput` on iOS posts ~100ms of silence to the worklet and explicitly calls `audioElement.play()` to prime the MediaStream → HTMLAudioElement pipeline.

Non-iOS is unchanged: it still lazily creates the context with the requested sample-rate constraint and does not register the document listeners.

WebRTC voice sessions are unaffected by this change.
