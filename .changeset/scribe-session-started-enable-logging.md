---
"@elevenlabs/types": minor
---

Rename `disable_logging` to `enable_logging` in the Scribe `session_started` config to match the field the server actually reports. `disable_logging` was never sent on the wire.
