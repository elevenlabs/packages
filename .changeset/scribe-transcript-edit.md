---
"@elevenlabs/client": minor
"@elevenlabs/types": minor
---

Add the `transcriptEdit` option to `Scribe.connect()` and dispatch the new `edited_transcript` server message:

- `transcriptEdit`: a natural-language instruction applied to each committed transcript (max 2000 characters), sent as the `transcript_edit` query param. Cannot be combined with `entityDetection`.
- `edited_transcript` (`RealtimeEvents.EDITED_TRANSCRIPT`), carrying the committed `text` and its `edited_text` (`EditedTranscriptMessage`). `edited_text` equals `text` when the instruction changed nothing.
