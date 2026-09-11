---
"@elevenlabs/client": minor
---

Add `setOnHold` / `isOnHold` to voice conversations, for apps that hand control back and forth between the agent and something else on the page. Putting a conversation on hold stops the agent mid-utterance instead of letting it play to completion, silences audio that keeps arriving, mutes the microphone so nothing nearby starts a turn, and sends `user_activity` periodically so the agent does not speak up on its own while it is held. The connection, conversation id and context all stay, so releasing the hold costs no reconnect: the microphone and the volume the caller asked for come back, and audio buffered during the hold is dropped rather than resumed mid-sentence. `setVolume` and `setMicMuted` calls made during a hold are applied when it is released.
