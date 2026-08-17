---
"@elevenlabs/client": patch
---

Pass `workletPaths` through on the WebRTC connection path, so self-hosted AudioWorklet files are used for output capture instead of falling back to `blob:`/`data:` URLs under a strict CSP.
