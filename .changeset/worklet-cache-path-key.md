---
"@elevenlabs/client": patch
---

Key the worklet module cache by the requested source as well as the worklet name, so a self-hosted `workletPaths` entry is no longer served an inlined `blob:` URL cached by an earlier load.
