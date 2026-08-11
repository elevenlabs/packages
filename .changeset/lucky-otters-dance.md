---
"@elevenlabs/client": minor
"@elevenlabs/types": minor
---

Expose missing realtime speech-to-text options on `Scribe.connect()`, matching [elevenlabs-js#436](https://github.com/elevenlabs/elevenlabs-js/pull/436):

- `secondaryLanguages`: additional language codes that may be present in the audio, sent as repeated `secondary_languages` query params.
- `entityDetection`: detect entities (PII, PHI, PCI, offensive language, or specific types) on committed transcripts. Accepts a single value or a list.
- `filterBackgroundAudio`: enable background speech filtering to reduce false activations from nearby conversations and ambient noise.

New server messages are now dispatched instead of being dropped:

- `final_transcript` and `final_transcript_with_timestamps` (`RealtimeEvents.FINAL_TRANSCRIPT` / `FINAL_TRANSCRIPT_WITH_TIMESTAMPS`)
- `committed_transcript_entities`, carrying `DetectedEntity[]` (`RealtimeEvents.COMMITTED_TRANSCRIPT_ENTITIES`)
- `invalid_request`, sent when the server rejects the connection parameters (`RealtimeEvents.INVALID_REQUEST`), emitted alongside the generic `ERROR` event

Also fixes `vadSilenceThresholdSecs`, `minSpeechDurationMs`, and `minSilenceDurationMs` lower-bound validation to treat the bound as inclusive, matching the API (e.g. `vadSilenceThresholdSecs: 0.3` is now accepted instead of being rejected client-side).

The `scribe.asyncapi.yaml` schema (and the generated `Word`/`CommittedTranscriptWithTimestampsMessage`/`FinalTranscriptWithTimestampsMessage` types) was cross-checked against the live contract at `https://api.elevenlabs.io/speech-to-text-asyncapi.yml`. The `words[]` shape is identical between `committed_transcript_with_timestamps` and `final_transcript_with_timestamps` on that contract (both support `"audio_event"`, per-character timings, and `channel_index`), so both messages now share a single `Word` type instead of the narrower shape `committed_transcript_with_timestamps` previously used. `Config` also gained `timestamps_granularity` and `max_tokens_to_recompute` to match the session config the server echoes back.
