---
"@elevenlabs/convai-widget-core": patch
---

Treat null top-level `terms_html`/`terms_text` as a kill switch for the T&C modal. Previously, agents with the dashboard "Enable terms & conditions" toggle off but stale per-language preset terms would still show the modal because the widget always preferred `language_presets[lang].terms_html`. Per-language presets are now only consulted as overrides when the feature is enabled at top level.
