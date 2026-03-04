---
"@elevenlabs/react": major
---

**Breaking:** `DeviceFormatConfig.outputDeviceId` has been removed. `changeOutputDevice()` now accepts `DeviceFormatConfig & OutputConfig`.

`outputDeviceId` described device routing, not audio format, so it did not belong on `DeviceFormatConfig`. It is now part of `OutputConfig` from `@elevenlabs/client`.

**Before:**
```ts
import type { DeviceFormatConfig } from "@elevenlabs/react";

const config: DeviceFormatConfig = {
  format: "pcm",
  sampleRate: 16000,
  outputDeviceId: "my-device-id", // was on DeviceFormatConfig
};
await conversation.changeOutputDevice(config);
```

**After:**
```ts
import type { DeviceFormatConfig } from "@elevenlabs/react";
import type { OutputConfig } from "@elevenlabs/client";

const config: DeviceFormatConfig & OutputConfig = {
  format: "pcm",
  sampleRate: 16000,
  outputDeviceId: "my-device-id", // now on OutputConfig
};
await conversation.changeOutputDevice(config);
```

**Migration:** Intersect `DeviceFormatConfig` with `OutputConfig` from `@elevenlabs/client` when passing `outputDeviceId` to `changeOutputDevice()`. The runtime value is unchanged — only the type annotation needs updating.
