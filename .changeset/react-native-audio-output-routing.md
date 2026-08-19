---
"@elevenlabs/client": patch
"@elevenlabs/react-native": patch
---

Fix @elevenlabs/react-native always routing conversation audio to the phone speaker on Android, even with a Bluetooth or wired headset connected. `preferredOutputList` no longer hard-codes `["speaker"]`; it now defers to the native module's own default routing order (bluetooth, then headset, then speaker, then earpiece) unless a new `webRtc.reactNative.audioSession` option overrides it.
