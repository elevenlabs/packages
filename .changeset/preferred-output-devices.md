---
"@elevenlabs/client": minor
"@elevenlabs/react-native": minor
---

Add a `preferredOutputDevices` session option to choose which audio output a conversation prefers (`"bluetooth"`, `"headset"`, `"speaker"`, `"earpiece"`), most preferred first. Outputs you don't list fall back to the default order: Bluetooth, wired headset, speaker, earpiece. It is supported by `@elevenlabs/react-native` when starting a session. Passing it to `changeOutputDevice` during a session, or starting a session with it on web, throws for now, so pass it only on native platforms (for example with `Platform.select`). On Android, a connected Bluetooth or wired headset is now used instead of always playing through the phone speaker.
