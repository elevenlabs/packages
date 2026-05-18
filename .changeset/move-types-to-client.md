---
"@elevenlabs/types": minor
---

Remove manually maintained types (`Role`, `Mode`, `Status`, `Callbacks`, `CALLBACK_KEYS`, `DisconnectionDetails`, `MessagePayload`, `AudioAlignmentEvent`) from `@elevenlabs/types`. These types now live in `@elevenlabs/client` — import them from there instead. The types package now contains only generated code.
