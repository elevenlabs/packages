---
"@elevenlabs/convai-widget-core": minor
"@elevenlabs/convai-widget-embed": patch
---

Support concurrency wait-queue (`queue_status`) server events: show a waiting status while all agents are busy, hide the typing indicator and block text/attachment sending while queued, and render a friendly non-error message when the queue wait times out.
