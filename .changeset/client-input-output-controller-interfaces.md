---
"@elevenlabs/client": major
---

**Breaking:** `InputController` and `OutputController` interfaces are now exported; `Input` and `Output` class exports are replaced by these interfaces.

**Before:**
```ts
import { Input, Output } from "@elevenlabs/client";
```

**After:**
```ts
import type { InputController, OutputController } from "@elevenlabs/client";
```
