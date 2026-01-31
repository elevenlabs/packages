---
"@elevenlabs/client": patch
---

Normalize the `textOnly` option (passable both on the top-level and via the overrides object): Providing one will propagate to the other, with the top-level taking precedence, in case of conflict.
