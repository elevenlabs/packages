---
"@elevenlabs/client": patch
"@elevenlabs/react": patch
---

Fix conversation startup readiness so `onConnect` runs after the session is marked connected and React has synchronized `conversationRef`. Also expose and forward `onConversationCreated` for consumers that need the created `Conversation` instance before `onConnect`.
