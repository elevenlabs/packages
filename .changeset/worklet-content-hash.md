---
"@elevenlabs/client": minor
---

Self-hosted worklets (`workletPaths`) are now checked against the installed version of the client. Each worklet registers its processor under a name that includes a hash of its source, so a copy from another release now fails at session start with an error naming the worklet and path, instead of running mismatched audio code. Re-copy the files from `@elevenlabs/client/worklets/*` when upgrading.
