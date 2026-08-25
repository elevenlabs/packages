# @elevenlabs/convai-widget-core

## 0.17.0

### Minor Changes

- b60d460: Draw rich content alongside the first message, and echo button taps back to the
  server.

  A `first_message_rich_content` entry on the widget config is painted with the
  first message before any connection exists, so a text-only widget shows its
  buttons on a cold start. Tapping one starts the conversation with that button's
  message, the same way typing into the input does — previously a button was
  disabled until connected, which left a first-message button waiting for the
  session it would itself begin.

  A row the customer has already answered is retired rather than left sitting in
  the transcript. Whether a component does this is per-component, so display
  components can later stay and merely de-emphasise instead of disappearing.

  `sendUserMessage` accepts an optional attribution (`richContentId`) that rides
  the `user_message` event as `rich_content_id`; the widget sends it automatically
  when a button is tapped, on both the mid-conversation and conversation-starting
  paths. It names the row the button belonged to rather than the button itself —
  given the row, the message text says which button was pressed. Purely additive:
  servers that predate the field ignore it, and the message text alone remains
  what the agent acts on.

- d4313cc: Support concurrency wait-queue (`queue_status`) server events: show a waiting status while all agents are busy, hide the typing indicator and block text/attachment sending while queued, and render a friendly non-error message when the queue wait times out.
- be9cb0c: Add support for the `external_agent_disconnected` client event. The client SDK exposes a new `onExternalAgentDisconnected` callback, and the widget leaves external-agent mode (and clears the typing indicator) when the external human agent disconnects and the AI agent resumes control.
- cc0c20c: Add a `show_language_selector_on_trigger` widget config option (and matching `show-language-selector-on-trigger` embed attribute). Default `true` keeps the language dropdown on the collapsed launcher. Set to `false` to hide it there; the expanded sheet header still shows it.

### Patch Changes

- ba87df2: Show the agent's first message in text mode for agents that support both text and
  voice, not just text-only ones. Text mode drops the server-sent first message —
  it belongs to a turn the user's opening message immediately interrupts — and the
  local re-render that compensates was gated to text-only widgets, so Text & Voice
  agents showed no welcome message at all, including via `override-first-message`,
  which feeds the same suppressed path. It now renders for any agent that supports
  text mode with the text input enabled, as a preview before connecting and through
  a text conversation; voice conversations still use the server-sent copy, so there
  is never a duplicate. Because a voice-capable agent writes `first_message` for
  TTS, the local copy honours `strip_audio_tags` the way voice bubbles do, so tags
  like `[happy]` don't leak into the text bubble.

  First-message rich content follows the same rule, so a greeting that offers
  buttons no longer renders without them before the conversation starts.

  Side effect: the open-but-disconnected sheet now has a non-empty transcript, so
  the orb shrinks to the corner avatar, the call button moves from the orb into the
  action row, and the resize button appears — the same layout previously reached on
  the user's first message.

- Updated dependencies [b60d460]
- Updated dependencies [be9cb0c]
- Updated dependencies [dce9815]
- Updated dependencies [ce34dbc]
- Updated dependencies [ce34dbc]
- Updated dependencies [79a9d4f]
  - @elevenlabs/client@1.22.0

## 0.16.4

### Patch Changes

- Updated dependencies [eea19d2]
- Updated dependencies [e3d1c40]
  - @elevenlabs/client@1.21.0

## 0.16.3

### Patch Changes

- Updated dependencies [d73eca4]
  - @elevenlabs/client@1.20.0

## 0.16.2

### Patch Changes

- Updated dependencies [a82a0c5]
- Updated dependencies [118fd04]
- Updated dependencies [f4c5588]
  - @elevenlabs/client@1.19.1

## 0.16.1

### Patch Changes

- Updated dependencies [880edd2]
- Updated dependencies [a068144]
  - @elevenlabs/client@1.19.0

## 0.16.0

### Minor Changes

- 1cf281e: Add experimental self-hosted orchestrator support. Setting the `orchestrator-url` attribute (optionally with `orchestrator-agent-config` carrying the exported agent configuration JSON) connects the widget to a self-hosted orchestrator instead of the ElevenLabs cloud, with no HTTP config fetch. Like the client SDK's `orchestrator` session option, these attributes are experimental and may change without a major version bump.
- c7afdba: Render rich content components the agent sends, inline in the transcript,
  starting with quick reply buttons. A message button sends its text as the
  user's own turn; a link button opens its url in a new tab.

  Properties are validated before rendering, so a malformed or unrecognised
  component shows a short notice instead of breaking the transcript, and a
  component stays where it arrived with no message moved across it.

  Validation is built on `zod/mini`, which adds roughly 5 KB gzipped.

### Patch Changes

- 78cc4c1: Fix markdown not rendering in voice transcripts. Voice agent messages regressed to plain text in 0.12.6, so `**bold**`, lists, tables and links showed as literal markdown syntax while text chat rendered them correctly. Voice messages now go through the same markdown renderer as text, with emotion/audio tags styled by a rehype plugin that runs after sanitization (and skips code blocks).
- 97c9571: Fix the language dropdown being positioned away from its trigger when the widget is embedded inside a CSS container-query element (`container-type: inline-size`). Floating UI treats such an ancestor as a containing block for `position: fixed` descendants while browsers do not, so the dropdown was offset by the ancestor's position on the page. The widget's overlay root now establishes a containing block of its own, making the dropdown position independent of the host page's ancestor styles.
- Updated dependencies [92e70c6]
- Updated dependencies [93cf08c]
- Updated dependencies [1a1f440]
- Updated dependencies [fb06e12]
  - @elevenlabs/client@1.18.0

## 0.15.1

### Patch Changes

- Updated dependencies [a96f220]
  - @elevenlabs/client@1.17.0

## 0.15.0

### Minor Changes

- f7f6391: Add a `show_resize_button` widget config option (and matching
  `show-resize-button` embed attribute) that controls the expand/collapse resize
  button in the widget header. Defaults to `true`; set to `false` to hide it.

### Patch Changes

- Updated dependencies [139ed79]
  - @elevenlabs/client@1.16.0

## 0.14.12

### Patch Changes

- Updated dependencies [6b1f43d]
  - @elevenlabs/client@1.15.2

## 0.14.11

### Patch Changes

- Updated dependencies [df7f31a]
- Updated dependencies [bb001b1]
- Updated dependencies [d8892fd]
- Updated dependencies [0f12b01]
  - @elevenlabs/client@1.15.1

## 0.14.10

### Patch Changes

- Updated dependencies [f149d9d]
  - @elevenlabs/client@1.15.0

## 0.14.9

### Patch Changes

- 0a53f6c: Render markdown for text-only agent responses that arrive without streaming parts.
- 62e0992: Fix transcript rendering for turns that interleave text and tool calls: keep text segments split by a tool call as separate bubbles, and show the tool status badge only once per turn
  - @elevenlabs/client@1.14.1

## 0.14.8

### Patch Changes

- 009d28f: Re-enable agent_chat_response_part streaming in voice sessions

## 0.14.7

### Patch Changes

- Updated dependencies [2277139]
  - @elevenlabs/client@1.14.0

## 0.14.6

### Patch Changes

- Updated dependencies [44336a2]
  - @elevenlabs/client@1.13.0

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
