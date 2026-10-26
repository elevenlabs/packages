---
"@elevenlabs/client": minor
---

Self-hosted worklets (`workletPaths`) are now checked against the installed version of the client. Each worklet registers its processor under a name that includes a hash of its source, so a copy from another release now fails at session start with an error naming the worklet and path, instead of running mismatched audio code. Because self-hosted worklets are deployed separately from the client, this ensures the worklet that loads matches what the client expects of it; previously a mismatched copy could load and play audio while silently misbehaving. Re-copy the files from `@elevenlabs/client/worklets/*` when upgrading.
