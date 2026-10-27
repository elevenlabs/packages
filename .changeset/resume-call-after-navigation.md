---
"@elevenlabs/convai-widget-core": minor
---

Offer to pick a voice call back up after a page navigation tears the widget down. With `resume-call-after-navigation` enabled, the next page reopens the widget showing the conversation so far, including any cards the agent drew, and a "Resume talking?" button. Pressing it starts a call that carries on from those turns instead of greeting the visitor again, and answering the offer by typing continues the same conversation in text, with the turns handed to the agent as context. Starting a call any other way begins a fresh conversation and clears what was carried over. Off by default; text chats are unaffected.

An agent that greets needs to allow the first message override, since a continued conversation is started without a first message so the agent picks up where it left off instead of greeting partway through.
