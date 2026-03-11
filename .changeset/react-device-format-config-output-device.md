---
"@elevenlabs/react": major
---

**Breaking:** `DeviceFormatConfig` and `DeviceInputConfig` have been removed. Use `FormatConfig` and `InputDeviceConfig` from `@elevenlabs/client` instead.

These were duplicates of types already exported by `@elevenlabs/client`. `changeOutputDevice()` now accepts `FormatConfig & OutputConfig` (previously `DeviceFormatConfig & OutputConfig`).

**Before:**
```ts
import type { DeviceFormatConfig, DeviceInputConfig } from "@elevenlabs/react";

await conversation.changeInputDevice({ format: "pcm", sampleRate: 16000, inputDeviceId: "my-device" });
await conversation.changeOutputDevice({ format: "pcm", sampleRate: 16000, outputDeviceId: "my-device" });
```

**After:**
```ts
import type { FormatConfig, InputDeviceConfig, OutputConfig } from "@elevenlabs/client";

await conversation.changeInputDevice({ format: "pcm", sampleRate: 16000, inputDeviceId: "my-device" });
await conversation.changeOutputDevice({ format: "pcm", sampleRate: 16000, outputDeviceId: "my-device" });
```

**Migration:** Replace `DeviceFormatConfig` with `FormatConfig` and `DeviceInputConfig` with `InputDeviceConfig`, both imported from `@elevenlabs/client`. The runtime values are unchanged — only the type imports need updating.
