# @elevenlabs/react

## 1.0.0-next.0

### Major Changes

- 81013c0: **Breaking:** `DeviceFormatConfig.outputDeviceId` has been removed. `changeOutputDevice()` now accepts `DeviceFormatConfig & OutputConfig`.

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

### Patch Changes

- Updated dependencies [81013c0]
- Updated dependencies [81013c0]
- Updated dependencies [81013c0]
- Updated dependencies [81013c0]
- Updated dependencies [81013c0]
  - @elevenlabs/client@1.0.0-next.0

## 0.14.1

### Patch Changes

- Updated dependencies [3a2d602]
  - @elevenlabs/client@0.15.0

## 0.14.0

### Minor Changes

- 5a9d468: Reduce audio chunk length from 250ms to 100ms for lower latency

### Patch Changes

- Updated dependencies [23ed493]
- Updated dependencies [5a9d468]
  - @elevenlabs/client@0.14.0

## 0.14.0-beta.0

### Minor Changes

- b559f42: Reduce audio chunk length from 250ms to 100ms for lower latency

### Patch Changes

- Updated dependencies [b559f42]
  - @elevenlabs/client@0.14.0-beta.0

## 0.13.1

### Patch Changes

- Updated dependencies [73cbdae]
  - @elevenlabs/client@0.13.1
