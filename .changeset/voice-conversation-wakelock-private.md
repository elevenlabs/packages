---
"@elevenlabs/client": major
---

**Breaking:** `VoiceConversation.wakeLock` is now private.

The `wakeLock` field is no longer accessible on `VoiceConversation`. It was always an internal detail for preventing screen sleep during a session and was never intended as stable public API.

**Before:**
```ts
const lock: WakeLockSentinel | null = conversation.wakeLock;
if (lock) {
  await lock.release();
}
```

**After:** Wake lock lifecycle is managed entirely by `VoiceConversation`. There is no replacement — the lock is released automatically when the session ends. If you need to suppress wake locking entirely, pass `useWakeLock: false` in the session options.

```ts
const conversation = await Conversation.startSession({
  // …
  useWakeLock: false, // opt out of wake lock management
});
```
