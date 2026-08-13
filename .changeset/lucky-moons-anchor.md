---
"@elevenlabs/convai-widget-core": patch
---

Fix the language dropdown being positioned away from its trigger when the widget is embedded inside a CSS container-query element (`container-type: inline-size`). Floating UI treats such an ancestor as a containing block for `position: fixed` descendants while browsers do not, so the dropdown was offset by the ancestor's position on the page. The widget's overlay root now establishes a containing block of its own, making the dropdown position independent of the host page's ancestor styles.
