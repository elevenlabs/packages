---
"@elevenlabs/react-native": patch
---

Add missing top-level `textOnly` option and ensure normalization with the existing option passable via the overrides object: Providing one will propagate to the other, with the top-level taking precedence, in case of conflict.
