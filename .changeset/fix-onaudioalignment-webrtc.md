---
"@elevenlabs/client": patch
---

Fix `onAudioAlignment` callback never firing on the WebRTC transport. The `WebRTCConnection` `DataReceived` handler dropped the entire `type: "audio"` JSON message because audio bytes flow over LiveKit audio tracks, but the same message carries the `alignment` metadata (chars + `char_start_times_ms` + `char_durations_ms`) — which got dropped along with it. Now audio messages are routed through `handleMessage` so `VoiceConversation.handleAudio` can surface alignment, then return before the audio_base_64 playback path (LiveKit still handles playback via the audio track).
