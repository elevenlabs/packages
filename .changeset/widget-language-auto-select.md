---
"@elevenlabs/convai-widget-core": minor
"@elevenlabs/convai-widget-embed": minor
---

Auto-select widget language from localStorage history and browser language preferences.

When no explicit `language` attribute is set, the widget now resolves the initial language by checking (in order):

1. The `language` attribute on the widget element
2. The last language the user selected (persisted in localStorage)
3. The user's browser language preferences (`navigator.languages`)
4. The agent's default language

Language selections are persisted to localStorage so returning users see their preferred language automatically.
