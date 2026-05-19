---
"@elevenlabs/client": minor
---

Replace DOM `Event`/`CloseEvent` constructors in `DisconnectionDetails` with a platform-agnostic `DisconnectionContext` type. The `context` property on disconnection details is now `{ type: string; reason?: string; code?: number }` instead of a DOM event object. This fixes runtime failures on React Native where `Event` and `CloseEvent` constructors are not available.
