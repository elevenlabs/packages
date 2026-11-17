---
"@elevenlabs/client": minor
"@elevenlabs/react": patch
"@elevenlabs/react-native": minor
---

Add a `preferredOutputDevices` session option to choose which audio output a conversation prefers (`"bluetooth"`, `"headset"`, `"speaker"`, `"earpiece"`), most preferred first. Outputs you don't list fall back to the default order: Bluetooth, wired headset, speaker, earpiece. It applies when the session starts and is used by `@elevenlabs/react-native`; it is ignored on web. On Android, a connected Bluetooth or wired headset is now used instead of always playing through the phone speaker.
