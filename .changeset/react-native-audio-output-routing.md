---
"@elevenlabs/client": minor
"@elevenlabs/react-native": patch
---

Fix @elevenlabs/react-native always routing conversation audio to the phone speaker on Android, even with a Bluetooth or wired headset connected. `preferredOutputList` no longer hard-codes `["speaker"]` and now defaults to the native module's own routing order (bluetooth, then headset, then speaker, then earpiece), which a new `webRtc.reactNative.audioSession` option can override. The resolved order is always sent to the native AudioSession rather than omitted, so an override applied to one conversation no longer persists into later conversations in the same app session, and a list containing duplicate outputs is rejected up front instead of crashing the app from the native audio switch.
