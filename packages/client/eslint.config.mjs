/**
 * Core files: platform-agnostic code that must not use browser-only globals.
 * These files are safe to import in React Native and other non-browser environments.
 *
 * When adding new files, they should go here by default. Only omit a file
 * from this list if it legitimately needs browser-only APIs (DOM, Web Audio, etc.).
 */
const CORE_FILES = [
  "src/BaseConversation.ts",
  "src/TextConversation.ts",
  "src/InputController.ts",
  "src/OutputController.ts",
  "src/internal.ts",
  "src/sourceInfo.ts",
  "src/version.ts",
  "src/platform/VoiceSessionSetup.ts",
  "src/utils/BaseConnection.ts",
  "src/utils/events.ts",
  "src/utils/overrides.ts",
  "src/utils/errors.ts",
  "src/utils/location.ts",
  "src/utils/mergeOptions.ts",
  "src/utils/calculateVolume.ts",
  "src/utils/volumeProvider.ts",
  "src/utils/postOverallFeedback.ts",
];

const BROWSER_ONLY_GLOBALS = [
  { name: "window", message: "Not available in React Native. Use globalThis if needed." },
  { name: "document", message: "Not available in React Native. Move to a web-only file." },
  { name: "navigator", message: "Not available in React Native. Move to a web-only file." },
  { name: "CloseEvent", message: "Not available in React Native. Use plain objects satisfying DisconnectionCloseEvent." },
  { name: "Event", message: "Not available in React Native. Use plain objects satisfying DisconnectionEvent." },
  { name: "DOMException", message: "Not available in React Native." },
  { name: "HTMLAudioElement", message: "Not available in React Native. Move to a web-only file." },
  { name: "Audio", message: "Not available in React Native. Move to a web-only file." },
  { name: "AudioContext", message: "Not available in React Native. Move to a web-only file." },
];

export default [
  { ignores: ["dist/**"] },
  {
    files: CORE_FILES,
    rules: {
      "no-restricted-globals": ["error", ...BROWSER_ONLY_GLOBALS],
      "no-restricted-syntax": [
        "error",
        {
          selector: "ImportDeclaration[source.value='livekit-client']:not([importKind='type'])",
          message: "livekit-client must not be imported in core files (causes React Native crashes at module load time). Use a dynamic import() inside an async function instead.",
        },
      ],
    },
  },
];
