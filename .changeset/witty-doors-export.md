---
"@elevenlabs/client": minor
---

Re-export the `MessageAttachment` type from the package entry point so consumers can `import type { MessageAttachment } from "@elevenlabs/client"` instead of deriving it from the `onMessage` callback signature.
