---
"@elevenlabs/client": major
---

**Breaking:** `Conversation` is no longer a class — it is now a plain namespace object and a type alias for `TextConversation | VoiceConversation`.

`instanceof Conversation` no longer compiles. Subclassing `Conversation` is no longer possible. The `startSession()` call is unchanged.

**Before:**
```ts
import { Conversation } from "@elevenlabs/client";

// instanceof check compiled fine
if (session instanceof Conversation) { … }

// subclassing was possible
class MyConversation extends Conversation { … }

// startSession returned the class type
const session: Conversation = await Conversation.startSession(options);
```

**After:**
```ts
import { Conversation } from "@elevenlabs/client";
import type { Conversation, TextConversation, VoiceConversation } from "@elevenlabs/client";

// startSession call is unchanged
const session: Conversation = await Conversation.startSession(options);

// Narrow using the concrete types or duck-typing instead of instanceof
if ("changeInputDevice" in session) {
  // session is VoiceConversation
}
```

**Migration:**
1. Remove `instanceof Conversation` checks. Narrow on `TextConversation` or `VoiceConversation` using `"changeInputDevice" in session` (voice) or duck-typing on the methods you need.
2. Remove any subclasses of `Conversation` — implement the `BaseConversation` interface directly or compose instead.
3. The `startSession()` call is unchanged and requires no migration.
