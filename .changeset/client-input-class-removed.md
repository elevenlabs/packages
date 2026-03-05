---
"@elevenlabs/client": major
---

**Breaking:** `Input` class removed from exports; `VoiceConversation.input` is now private; `changeInputDevice()` returns `void`.

The `Input` class is no longer exported. The `input` field on `VoiceConversation` is now private. `changeInputDevice()` returns `Promise<void>` instead of `Promise<Input>`.

**Before:**
```ts
import { Input } from "@elevenlabs/client";

const input: Input = conversation.input;
input.analyser.getByteFrequencyData(data);
input.setMuted(true);

const newInput: Input = await conversation.changeInputDevice(config);
newInput.worklet.port.postMessage(…);
```

**After:**
```ts
import type { InputController } from "@elevenlabs/client";

conversation.getInputByteFrequencyData(); // replaces input.analyser.getByteFrequencyData
conversation.setMicMuted(true);           // replaces input.setMuted

await conversation.changeInputDevice(config); // return value dropped
```

**Migration:**
1. Replace `import { Input }` with `import type { InputController }` if you need the type.
2. Replace `conversation.input.analyser.getByteFrequencyData(data)` with `conversation.getInputByteFrequencyData()`.
3. Replace `conversation.input.setMuted(v)` with `conversation.setMicMuted(v)`.
4. Drop the return value of `changeInputDevice()`.
