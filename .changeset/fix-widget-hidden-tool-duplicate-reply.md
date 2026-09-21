---
"@elevenlabs/types": patch
"@elevenlabs/client": patch
"@elevenlabs/convai-widget-core": patch
---

Expose stable response IDs for agent messages and use them to prevent a reply
from rendering twice when it is resent during a turn, while retaining
compatibility with older orchestrators.
