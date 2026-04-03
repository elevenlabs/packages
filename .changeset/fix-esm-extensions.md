---
"@elevenlabs/client": patch
"@elevenlabs/react": patch
"@elevenlabs/react-native": patch
---

fix: use explicit .js extensions in ESM imports for Node.js compatibility

Switch `moduleResolution` from `bundler` to `nodenext` and add `.js` extensions to all relative imports. The published packages use `"type": "module"` but the compiled output had extensionless imports, which breaks Node.js ESM resolution.
