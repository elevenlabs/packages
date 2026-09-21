---
"@elevenlabs/client": minor
"@elevenlabs/types": minor
"@elevenlabs/react": minor
---

Add the `transcriptEdit` option to `Scribe.connect()` and dispatch the new `edited_transcript` server message:

- `transcriptEdit`: a natural-language instruction applied to each committed transcript (max 2000 characters), sent as the `transcript_edit` query param. Cannot be combined with `entityDetection`.
- `edited_transcript` (`RealtimeEvents.EDITED_TRANSCRIPT`), carrying the committed `text` and its `edited_text` (`EditedTranscriptMessage`). `edited_text` equals `text` when the instruction changed nothing.
- `useScribe()` accepts the same `transcriptEdit` option, exposes an `onEditedTranscript` callback and attaches the edited text to the matching entry in `committedTranscripts` as `editedText`.
