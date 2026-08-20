// React Native bundlers resolve @elevenlabs/client here via the "react-native"
// export condition. The implementations themselves live in
// @elevenlabs/react-native — it polyfills the WebRTC globals, configures the
// native audio session and registers the setup strategy — so all this entry
// point can do is say so if the app never imported it.
import { setPlatformSetupHint } from "../diagnostics.js";

setPlatformSetupHint(
  "It looks like you're using @elevenlabs/client in React Native without " +
    'importing @elevenlabs/react-native. Add `import "@elevenlabs/react-native";` ' +
    "before any other ElevenLabs imports."
);

export * from "../../index.js";
