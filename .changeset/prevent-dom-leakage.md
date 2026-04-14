---
"@elevenlabs/types": minor
"@elevenlabs/client": minor
"@elevenlabs/react-native": patch
---

Prevent DOM/web API leakage into platform-agnostic code

- Replace `Event`/`CloseEvent` DOM types in `DisconnectionDetails` with platform-agnostic `DisconnectionEvent`/`DisconnectionCloseEvent` interfaces (structurally compatible, backwards-safe)
- Add `readonly type` discriminant (`"webrtc" | "websocket"`) to `BaseConnection` and its subclasses
- Split `VoiceSessionSetup.ts` into core `VoiceSessionStrategy.ts` (no web imports) and web-only `webSessionSetup.ts`, breaking the import chain that caused `livekit-client` to load at module scope in React Native
- Add `@elevenlabs/client/web` entry point for platform-specific code that needs the web session setup
- Replace `new CloseEvent()`/`new Event()` browser constructors with plain objects in `BaseConversation.ts`
- Add ESLint `no-restricted-globals` rules to prevent browser-only globals in core files
