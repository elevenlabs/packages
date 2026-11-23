---
"@elevenlabs/client": minor
"@elevenlabs/types": minor
"@elevenlabs/react": minor
---

Add the `diarize` and `inferSpeakerNames` options to `Scribe.connect()` and dispatch the new `diarized_transcript`, `speakers_merged` and `speaker_names` server messages:

- `diarize`: adds `words` to every `partial_transcript`, each with a `speaker_id` (`speaker_0`, `speaker_1`, ...) that is `null` until the speaker is identified, and a `segment_index` to every `committed_transcript`. Only supported by `scribe_v3_live`. Cannot be combined with `filterBackgroundAudio`.
- `inferSpeakerNames`: infer speaker names from the conversation (introductions, greetings, people addressed by name) and send them in `speaker_names` events. Requires `diarize`. Cannot be combined with `entityRedaction`.
- `diarized_transcript` (`RealtimeEvents.DIARIZED_TRANSCRIPT`), carrying a committed transcript's `words` with their final speakers (`DiarizedTranscriptMessage`). It is sent after its committed transcript, in commit order, with the same `segment_index`.
- `speakers_merged` (`RealtimeEvents.SPEAKERS_MERGED`), reporting that `from_speaker_id` and `to_speaker_id` are the same person (`SpeakersMergedMessage`): every earlier use of `from_speaker_id` is `to_speaker_id`. Merges chain, so apply them in the order received.
- `speaker_names` (`RealtimeEvents.SPEAKER_NAMES`), carrying all inferred names keyed by speaker ID (`SpeakerNamesMessage`). It is sent in full each time a name changes.
- `Word` and React's `WordTimestamp` now type `start`, `end`, `speaker_id`, `characters` and `channel_index` as nullable, matching the `null` the server sends: for times until a word is aligned, for characters on partial and diarized words, for the channel on single-channel audio, and for the speaker when none is identified.
- `useScribe()` accepts the same `diarize` and `inferSpeakerNames` options, types the partial `words` and committed `segment_index` passed to `onPartialTranscript` and `onCommittedTranscript`, and exposes `onDiarizedTranscript`, `onSpeakersMerged` and `onSpeakerNames` callbacks.
