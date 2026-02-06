# @elevenlabs/react-native

## 0.5.10

### Patch Changes

- 3a8cc56: Fix establishing text-only conversations. Note: This change also regresses a bug-fix where access to audio input is requested, even for text-only conversations.

## 0.5.9

### Patch Changes

- 9caf68f: Add missing top-level `textOnly` option and ensure normalization with the existing option passable via the overrides object: Providing one will propagate to the other, with the top-level taking precedence, in case of conflict.
- Updated dependencies [f364f50]
  - @elevenlabs/types@0.5.0

## 0.5.8

### Patch Changes

- e7ad363: Minor change to the README.
