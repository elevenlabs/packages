# @elevenlabs/convai-widget-core

## 0.11.2

### Patch Changes

- Updated dependencies [50ea6ef]
  - @elevenlabs/client@1.1.2

## 0.11.1

### Patch Changes

- Updated dependencies [f29c44b]
  - @elevenlabs/client@1.1.1

## 0.11.0

### Minor Changes

- e656158: Auto-select widget language from localStorage history and browser language preferences.

  When no explicit `language` attribute is set, the widget now resolves the initial language by checking (in order):
  1. The `language` attribute on the widget element
  2. The last language the user selected (persisted in localStorage)
  3. The user's browser language preferences (`navigator.languages`)
  4. The agent's default language

  Language selections are persisted to localStorage so returning users see their preferred language automatically.

## 0.10.6

### Patch Changes

- Updated dependencies [1b84231]
- Updated dependencies [2e37cd9]
  - @elevenlabs/client@0.16.0

## 0.10.5

### Patch Changes

- Updated dependencies [a85e24d]
  - @elevenlabs/client@0.15.2

## 0.10.4

### Patch Changes

- 424225c: Fix audio tag stripping to only apply to voice transcripts, not text chat responses
- 17cf538: Update the widget's branding

## 0.10.3

### Patch Changes

- Updated dependencies [7368ccd]
  - @elevenlabs/client@0.15.1

## 0.10.2

### Patch Changes

- e454b9a: Register livekit-client pnpm patch in patchedDependencies (missing from PR #556 cherry-pick)

## 0.10.1

### Patch Changes

- 29e1dfc: Fix widget crash on Wix sites where addEventListener is made non-writable by Wix security hardening

## 0.10.1-next.0

### Patch Changes

- f15891e: Fix widget crash on Wix sites caused by frozen RTCPeerConnection prototype

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
