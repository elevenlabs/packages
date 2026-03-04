---
"@elevenlabs/client": major
---

**Breaking:** `Output` class removed from exports; `VoiceConversation.output` is now private; `changeOutputDevice()` returns `void`.

The `Output` class is no longer exported. The `output` field on `VoiceConversation` is now private. `changeOutputDevice()` returns `Promise<void>` instead of `Promise<Output>`.

**Before:**
```ts
import { Output } from "@elevenlabs/client";

const output: Output = conversation.output;
output.gain.gain.value = 0.5;
output.analyser.getByteFrequencyData(data);
output.worklet.port.postMessage({ type: "interrupt" });

const newOutput: Output = await conversation.changeOutputDevice(config);
```

**After:**
```ts
import type { OutputController } from "@elevenlabs/client";

conversation.setVolume({ volume: 0.5 });      // replaces output.gain.gain.value
conversation.getOutputByteFrequencyData();    // replaces output.analyser.getByteFrequencyData
// interruption is handled internally by VoiceConversation

await conversation.changeOutputDevice(config); // return value dropped
```

**Migration:**
1. Replace `import { Output }` with `import type { OutputController }` if you need the type.
2. Replace `conversation.output.gain.gain.value = v` with `conversation.setVolume({ volume: v })`.
3. Replace `conversation.output.analyser.getByteFrequencyData(data)` with `conversation.getOutputByteFrequencyData()`.
4. Drop the return value of `changeOutputDevice()`.
