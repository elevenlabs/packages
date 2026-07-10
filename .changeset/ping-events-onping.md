---
"@elevenlabs/client": minor
"@elevenlabs/react": minor
"@elevenlabs/types": patch
---

Add a dedicated `onPing` callback that surfaces `ping` events (including the estimated `ping_ms`) to consumers. The SDK still replies to pings with a `pong` automatically; the callback is informational, useful for e.g. reporting connection latency. Also clarifies the documentation for `ping_ms`: "Estimated ping in milliseconds, based on previous ping/pong timing."
