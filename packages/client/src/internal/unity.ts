/**
 * @internal
 *
 * `@elevenlabs/client/internal/unity`
 *
 * A curated, low-level surface of `@elevenlabs/client` shaped to the needs of
 * the [ElevenLabs Unity SDK](https://github.com/elevenlabs/unity)'s WebGL
 * bridge.
 *
 * ## Stability contract
 *
 * This entrypoint carries **no semver guarantees**.  It is stable only for the
 * Unity SDK's own use.  Any external consumer must accept that additions,
 * removals, or renames may happen in any release without a major-version bump.
 *
 * ## Why it exists
 *
 * On WebGL the Unity SDK's C# `Conversation` type delegates to this library
 * via an Emscripten jslib bridge.  The bridge bypasses `Conversation` /
 * `VoiceConversation` entirely and drives three smaller objects directly:
 *
 * ```
 * C# Conversation
 *   ├── IConnection           → wraps WebSocketConnection / WebRTCConnection
 *   ├── IInputController      → wraps MediaDeviceInput
 *   └── IOutputController     → wraps MediaDeviceOutput
 * ```
 *
 * The concrete platform classes (`MediaDeviceInput`, `MediaDeviceOutput`) and
 * the audio-wiring helpers (`attachInputToConnection`,
 * `attachConnectionToOutput`) are not exposed on the public `.` entrypoint
 * because they are too low-level for general consumers.  This sub-path
 * collects exactly the symbols the Unity bridge needs behind one stable import,
 * without pulling any unrelated SDK code into a size-sensitive WebGL bundle.
 *
 * ## How to evolve it
 *
 * - **Additions** — safe; add them here and mirror in `elevenlabs/unity`.
 * - **Removals / renames** — require a coordinated change with
 *   `elevenlabs/unity` (see the cleanup checklist in Plan B).
 * - **Sibling consumers** — add a parallel sub-path
 *   (`./internal/react-native`, `./internal/godot`, etc.) following the same
 *   pattern.
 *
 * Plan B (the Unity SDK plan this entrypoint serves):
 * https://github.com/elevenlabs/unity/blob/main/Docs~/plans/plan-b.md
 */

// ── Runtime values ────────────────────────────────────────────────────────────

// Concrete platform classes the Unity bridge instantiates from C#.
// (Unity calls .create() on these from its JS factory glue.)
export { MediaDeviceInput } from "../platform/web/input.js";
export { MediaDeviceOutput } from "../platform/web/output.js";

// I/O ↔ connection wiring primitives.  Unity's audio-glue.ts composes
// these (plus a Unity-local audio-payload-stripping wrapper) into its own
// `attachDefaultAudio` factory — the SDK does not ship that composition.
export { attachInputToConnection } from "../utils/attachInputToConnection.js";
export { attachConnectionToOutput } from "../utils/attachConnectionToOutput.js";

// v0.3: Unity-routed audio adapter slot.  Already exported from ./internal —
// re-exported here so all Unity-consumed symbols live behind one import.
export { setWebRTCAudioAdapterFactory } from "../WebRTCAudioAdapter.js";

// ── Types only (erased at compile time, never reach the consumer's bundle) ────

// Adapter slot's interface + result shape.  v0.3 Unity-routed audio.
export type {
  WebRTCAudioAdapter,
  AnalysisResult,
} from "../WebRTCAudioAdapter.js";

// Named convenience aliases for the MediaDevice* config shapes.
export type { MediaDeviceInputConfig } from "../platform/web/input.js";
export type { MediaDeviceOutputConfig } from "../platform/web/output.js";

// WebRTCConnection's config type under a stable, descriptive name.
export type { WebRTCConnectionConfig } from "../utils/WebRTCConnection.js";
