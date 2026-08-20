---
"@elevenlabs/convai-widget-core": patch
---

Show the agent's first message in text mode for agents that support both text and
voice, not just text-only ones. Text mode drops the server-sent first message —
it belongs to a turn the user's opening message immediately interrupts — and the
local re-render that compensates was gated to text-only widgets, so Text & Voice
agents showed no welcome message at all, including via `override-first-message`,
which feeds the same suppressed path. It now renders for any agent that supports
text mode with the text input enabled, as a preview before connecting and through
a text conversation; voice conversations still use the server-sent copy, so there
is never a duplicate. Because a voice-capable agent writes `first_message` for
TTS, the local copy honours `strip_audio_tags` the way voice bubbles do, so tags
like `[happy]` don't leak into the text bubble.

First-message rich content follows the same rule, so a greeting that offers
buttons no longer renders without them before the conversation starts.

Side effect: the open-but-disconnected sheet now has a non-empty transcript, so
the orb shrinks to the corner avatar, the call button moves from the orb into the
action row, and the resize button appears — the same layout previously reached on
the user's first message.
