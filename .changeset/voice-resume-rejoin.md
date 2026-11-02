---
"@elevenlabs/client": minor
"@elevenlabs/convai-widget-core": minor
---

With `persistent-session` enabled, a voice call can now resume after a same-tab page navigation. The next page shows the previous turns with "Resume talking?" and End buttons, and resuming continues the same conversation without a new greeting. `persistentSession` in the client now accepts `resumeOnly`, which ends the session with its connection so the next one resumes it from the stored transcript. Needs a backend that supports resume-only persistent sessions.
