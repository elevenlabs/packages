---
"@elevenlabs/client": patch
"@elevenlabs/react": patch
"@elevenlabs/react-native": patch
---

Replace microbundle with rolldown for IIFE builds (client, react) and tsc-only builds (react-native). No public API changes — the CDN bundle format changes from UMD to IIFE.
