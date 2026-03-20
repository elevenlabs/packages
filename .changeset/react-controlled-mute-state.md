---
"@elevenlabs/react": minor
---

Add controlled mute state support to `ConversationProvider`. Pass `isMuted` and `onMutedChange` props to own the microphone mute lifecycle externally (e.g. persist in localStorage across sessions). When omitted, mute state is managed internally as before.
