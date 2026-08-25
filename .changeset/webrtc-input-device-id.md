---
"@elevenlabs/client": patch
---

Publish the selected `inputDeviceId` on WebRTC session start instead of the
browser default microphone.

`WebRTCConnection.create()` enabled the microphone with
`setMicrophoneEnabled(true)`, which always captures the browser's default
device and ignores a configured `inputDeviceId`. The selected device only
drove the local level meter, so a user on a non-default mic sent a silent or
wrong track to the agent with no error surfaced — and the documented
workaround of calling `changeInputDevice` after `startSession` republished
the live track mid-connect and could leave the mic dead when re-acquire
threw. `create()` now publishes a `createLocalAudioTrack({ deviceId: { exact }
})` up front when an `inputDeviceId` is set, skipping the post-connect
republish entirely. `setAudioInputDevice` also now acquires the new track
before stopping the old one, so a failed re-acquire can no longer tear down
the live mic.
