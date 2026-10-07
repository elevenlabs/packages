---
"@elevenlabs/client": patch
---

Skip the iOS audio-unlock gesture listener when Web Audio is unavailable (e.g. iOS Lockdown Mode), instead of throwing `ReferenceError: Can't find variable: AudioContext` on every tap or click.
