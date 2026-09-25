---
"@elevenlabs/react": patch
---

Fix `useScribe` dropping the `secondaryLanguages` option, so a session that sets it now sends `secondary_languages` on the realtime WebSocket URL instead of only `language_code`. The option was added to `Scribe.connect()` but never forwarded by the hook, which passed a fixed subset of the client options.

`filterBackgroundAudio` was missing for the same reason and is now forwarded too. Both are accepted as hook options and as `connect()` options, like the options around them.

The two `Scribe.connect()` calls behind the hook's microphone and manual-audio modes now share one options object, so a client option only has to be forwarded once.
