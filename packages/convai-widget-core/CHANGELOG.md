# @elevenlabs/convai-widget-core

## 0.14.5

### Patch Changes

- Updated dependencies [71bc3d5]
  - @elevenlabs/client@1.12.1

## 0.14.4

### Patch Changes

- Updated dependencies [c086dad]
- Updated dependencies [bce3fac]
  - @elevenlabs/client@1.12.0

## 0.14.3

### Patch Changes

- Updated dependencies [8b362c9]
  - @elevenlabs/client@1.11.2

## 0.14.2

### Patch Changes

- @elevenlabs/client@1.11.1

## 0.14.1

### Patch Changes

- Updated dependencies [062d715]
  - @elevenlabs/client@1.11.0

## 0.14.0

### Minor Changes

- fdad576: Add support for external_agent_joined and agent_typing events.

  These events are send when an external agent takes over from the ai agent,
  and when an agent is currently typing, respectively.

  Show an "Agent is typing ..." indicator when the external agent is typing.

### Patch Changes

- Updated dependencies [fdad576]
  - @elevenlabs/client@1.10.0

## 0.13.1

### Patch Changes

- 75f6be3: Fix compact and full trigger control alignment.

## 0.13.0

### Minor Changes

- 6458543: Add call and message entry points to the widget launcher.
  - Multimodal agents show both; voice-only shows call; text-only shows message.
  - Call connects directly on click; message opens the chat focused on the input.
  - The message entry point uses the existing `start_chat` text key.

## 0.12.9

### Patch Changes

- Updated dependencies [d1cadcd]
  - @elevenlabs/client@1.9.0

## 0.12.8

### Patch Changes

- 0f7e2e5: Style emotion/audio tags in voice transcripts when `strip_audio_tags` is off. Voice agent messages render plain text with tag pills instead of markdown; text chat still uses markdown.
- cf75e07: Treat null top-level `terms_html`/`terms_text` as a kill switch for the T&C modal. Previously, agents with the dashboard "Enable terms & conditions" toggle off but stale per-language preset terms would still show the modal because the widget always preferred `language_presets[lang].terms_html`. Per-language presets are now only consulted as overrides when the feature is enabled at top level.

## 0.12.7

### Patch Changes

- Updated dependencies [a9dcb56]
  - @elevenlabs/client@1.8.1

## 0.12.6

### Patch Changes

- Updated dependencies [796ade1]
  - @elevenlabs/client@1.8.0

## 0.12.5

### Patch Changes

- Updated dependencies [ae50508]
  - @elevenlabs/client@1.7.1

## 0.12.4

### Patch Changes

- 2cb042f: Fix voice widget transcripts so streamed agent response parts are ignored for voice sessions and late user transcripts are inserted before their matching agent response.

## 0.12.3

### Patch Changes

- 0b36f6b: Break ties on shared `eventId` with user-before-agent in transcript ordering. Fixes voice/DTMF turns where the agent message could render before the user transcript when both events of the turn carry the same `event_id`.

## 0.12.2

### Patch Changes

- Updated dependencies [1216ded]
  - @elevenlabs/client@1.7.0

## 0.12.1

### Patch Changes

- 6f13d2f: Fix text input submission for IME users by ignoring Enter keydowns while composition is active.
- Updated dependencies [84ec003]
- Updated dependencies [3b40bda]
  - @elevenlabs/client@1.6.0

## 0.12.0

### Minor Changes

- 8fe2d6a: Add file upload support to the embedded ConvAI widget

### Patch Changes

- Updated dependencies [8c6213f]
- Updated dependencies [1153428]
  - @elevenlabs/client@1.5.0

## 0.11.7

### Patch Changes

- Updated dependencies [a8c2d5d]
- Updated dependencies [a8c2d5d]
- Updated dependencies [3a9d14a]
  - @elevenlabs/client@1.4.0

## 0.11.6

### Patch Changes

- Updated dependencies [748cbe0]
  - @elevenlabs/client@1.3.1

## 0.11.5

### Patch Changes

- Updated dependencies [606d018]
  - @elevenlabs/client@1.3.0

## 0.11.4

### Patch Changes

- Updated dependencies [4237f72]
  - @elevenlabs/client@1.2.1

## 0.11.3

### Patch Changes

- 4bc8747: Fix transcript message ordering in voice mode where agent responses could appear before user messages.
- Updated dependencies [0d5c368]
  - @elevenlabs/client@1.2.0

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
