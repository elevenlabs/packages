---
"@elevenlabs/client": patch
---

Align `changeInputDevice`/`changeOutputDevice` across connection types: the WebRTC path now ignores `sampleRate`, `format` and `preferHeadphonesForIosDevices` instead of throwing, matching the WebSocket path, so a device switch that succeeds on one connection type no longer fails on the other.
