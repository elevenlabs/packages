---
"@elevenlabs/client": patch
"@elevenlabs/react": patch
---

Fix a microphone-setup failure wedging `useScribe`, so a denied or dismissed
permission prompt can be retried without remounting.

A microphone-mode session whose `getUserMedia` call rejects can never send
audio, but the socket was left open holding that session. `useScribe` kept its
connection ref, and every later `connect()` short-circuited on `"Already
connected"`. The failed setup now closes the connection, which releases the
stranded socket and lets the hook's existing close handling clear the ref.
`onError` still fires first; the session then ends as `disconnected` with the
error preserved.

The hook's close handler also nulled its ref for whichever connection reported
a close, so a late close from a replaced socket tore down the session that had
replaced it — the race a consumer hit when working around the above with
disconnect-then-reconnect. A close is now ignored when a newer connection owns
the ref, while an explicit `disconnect()` still reports normally.
