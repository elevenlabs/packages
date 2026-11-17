---
"@elevenlabs/react-native": patch
---

Fix conversation audio always playing through the phone speaker on Android, even with a Bluetooth or wired headset connected. Output now prefers a Bluetooth headset, then a wired headset, then the speaker, then the earpiece.
