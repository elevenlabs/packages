# @elevenlabs/client

## 0.14.0

### Minor Changes

- 5a9d468: Reduce audio chunk length from 250ms to 100ms for lower latency

### Patch Changes

- 23ed493: Normalize the `textOnly` option (passable both on the top-level and via the overrides object): Providing one will propagate to the other, with the top-level taking precedence, in case of conflict.
- Updated dependencies [f364f50]
  - @elevenlabs/types@0.5.0

## 0.14.0-beta.0

### Minor Changes

- b559f42: Reduce audio chunk length from 250ms to 100ms for lower latency

## 0.13.1

### Patch Changes

- 73cbdae: Fixed an issue where input audio would not get re-established after permission revocation. Now input audio is re-established and the agent can hear the user, when permissions are granted or when permissions are ready to be prompted while a conversation is active.
