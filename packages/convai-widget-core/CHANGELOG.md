# @elevenlabs/convai-widget-core

## 0.10.1

### Patch Changes

- 29e1dfc: Fix widget crash on Wix sites where addEventListener is made non-writable by Wix security hardening

## 0.10.0

### Minor Changes

- 3a2d602: Propagate event_id through transcript and streaming callbacks. Refactor tool status from Map-based tracking to inline transcript entries with display-transcript utility.
- 70257ce: Add `show-conversation-id` config option to control visibility of conversation ID in disconnection messages. Defaults to `true`. Error messages always show the conversation ID regardless of this setting.

### Patch Changes

- Updated dependencies [3a2d602]
  - @elevenlabs/client@0.15.0

## 0.9.1

### Patch Changes

- 6946723: Fix style does not show correctly in safari.

## 0.9.0

### Minor Changes

- 6846068: Ability to show agent tool usage status
- 6846068: New agent status badge for long tool call

### Patch Changes

- a71950d: strip emotion tag
- 8b75875: Fix rating and feedback submission so it supports widget embedding using only a signed-url attribute

## 0.8.2

### Patch Changes

- Updated dependencies [23ed493]
- Updated dependencies [5a9d468]
  - @elevenlabs/client@0.14.0

## 0.0.0-beta.0

### Patch Changes

- Updated dependencies [b559f42]
  - @elevenlabs/client@0.14.0-beta.0

## 0.8.1

### Patch Changes

- c96feb1: Reset microphone mute state when call ends to prevent UI/audio desync on subsequent calls

## 0.8.0

### Minor Changes

- 75b01f2: Fix styling issue in shadow root

## 0.7.0

### Minor Changes

- 44525f6: Bump tailwind to v4
- 29ef161: Allow the widget to be dismissable via an optional parameter.

### Patch Changes

- Updated dependencies [73cbdae]
  - @elevenlabs/client@0.13.1
