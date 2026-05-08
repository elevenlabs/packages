# @elevenlabs/convai-widget-embed

## 0.12.1

## 0.12.0

## 0.11.7

## 0.11.6

## 0.11.5

## 0.11.4

## 0.11.3

## 0.11.2

## 0.11.1

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

## 0.10.5

## 0.10.4

## 0.10.3

## 0.10.2

## 0.10.1

## 0.10.1-next.0

## 0.10.0

## 0.9.1

### Patch Changes

- 6946723: Fix style does not show correctly in safari.

## 0.9.0

### Minor Changes

- 6846068: Ability to show agent tool usage status
- 6846068: New agent status badge for long tool call

### Patch Changes

- a71950d: strip emotion tag

## 0.8.2

## 0.0.0-beta.0

## 0.8.1

### Patch Changes

- c96feb1: Reset microphone mute state when call ends to prevent UI/audio desync on subsequent calls

## 0.8.0

### Minor Changes

- 75b01f2: Fix styling issue in shadow root

## 0.7.0

### Minor Changes

- 29ef161: Allow the widget to be dismissable via an optional parameter.
