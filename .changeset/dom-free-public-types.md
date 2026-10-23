---
"@elevenlabs/client": minor
"@elevenlabs/react": patch
---

Published declarations no longer depend on DOM types, so they type-check for consumers without the DOM lib, including with `skipLibCheck: false`. Fixes the `Cannot find name 'MediaDeviceConstraint'` error in the Scribe declarations.

- New exported types: `DeviceIdConstraint`, `DeviceIdConstraintParameters`, `BlobLike`, `ResponseLike`, `AbortSignalLike`, `CloseEventLike`, `WebSocketLike`, `MediaStreamTrackLike` and `AnalyserNodeLike`. The `*Like` types resolve to the platform's own type when it is declared (DOM, `@types/node`), so DOM users keep the full types.
- `inputDeviceId` and `WebRTCConnection.setAudioInputDevice` now accept a `DeviceIdConstraint`. A plain string keeps its current behavior; constraint objects and lists of IDs are applied as given.
- `useScribe`'s `onError` callback is typed as receiving an `Error`, which is the only value it has ever been called with.
