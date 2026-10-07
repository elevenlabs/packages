---
"@elevenlabs/client": patch
---

Run the gesture-time audio unlock and playback priming on desktop Safari as
well as iOS. Both follow the same WebKit autoplay policy, so without it the
agent could be silent on macOS when session setup outlived the user gesture.
