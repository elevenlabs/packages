---
"@elevenlabs/client": minor
"@elevenlabs/types": minor
"@elevenlabs/react": minor
---

Add the `entityRedaction` and `entityRedactionMode` options to `Scribe.connect()` and dispatch the new `redacted_transcript` server message:

- `entityRedaction`: redact entities from committed transcripts. Accepts the same values as `entityDetection` (`"all"`, a category, a specific entity type, or a list), sent as repeated `entity_redaction` query params. Cannot be combined with `transcriptEdit`.
- `entityRedactionMode` (`EntityRedactionMode`): how redacted entities are marked, `"redacted"` (`{REDACTED}`), `"entity_type"` (`{NAME}`) or `"enumerated_entity_type"` (`{NAME_0}`, the server default). Sent as the `entity_redaction_mode` query param only when set.
- `redacted_transcript` (`RealtimeEvents.REDACTED_TRANSCRIPT`), carrying the committed `text` and its `redacted_text` (`RedactedTranscriptMessage`). It is sent after its committed transcript, in commit order; partial and committed transcripts stay unredacted.
- `useScribe()` accepts the same `entityRedaction` and `entityRedactionMode` options, exposes an `onRedactedTranscript` callback and attaches the redacted text to the matching entry in `committedTranscripts` as `redactedText`.
