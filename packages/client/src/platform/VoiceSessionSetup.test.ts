import { describe, it, expect, vi } from "vitest";

vi.mock("livekit-client", () => ({
  Room: vi.fn(),
  RoomEvent: {},
  Track: { Kind: { Audio: "audio" }, Source: { Microphone: "microphone" } },
  ConnectionState: {},
  createLocalAudioTrack: vi.fn(),
}));

import { setupWebRTCSession } from "./VoiceSessionSetup.js";
import { WebRTCConnection } from "../utils/WebRTCConnection.js";
import { WebSocketConnection } from "../utils/WebSocketConnection.js";

// `setupStrategy` is module-level state with no reset, so each case that cares
// about it works against a freshly imported copy of the module.
async function freshModule() {
  vi.resetModules();
  return import("./VoiceSessionSetup.js");
}

describe("setupWebRTCSession", () => {
  it("returns input/output from a WebRTCConnection", () => {
    const mockInput = { close: vi.fn(), setMuted: vi.fn() };
    const mockOutput = { close: vi.fn(), setVolume: vi.fn() };

    // Create a minimal object that passes the instanceof check
    const connection = Object.create(WebRTCConnection.prototype, {
      input: { value: mockInput },
      output: { value: mockOutput },
    });

    const result = setupWebRTCSession(connection);

    expect(result.connection).toBe(connection);
    expect(result.input).toBe(mockInput);
    expect(result.output).toBe(mockOutput);
    expect(result.playbackEventTarget).toBeNull();
    expect(result.detach).toBeTypeOf("function");
  });

  it("detach is a no-op", () => {
    const connection = Object.create(WebRTCConnection.prototype, {
      input: { value: {} },
      output: { value: {} },
    });

    const result = setupWebRTCSession(connection);
    expect(() => result.detach()).not.toThrow();
  });

  it("throws when given a WebSocketConnection", () => {
    const connection = Object.create(WebSocketConnection.prototype);

    expect(() => setupWebRTCSession(connection)).toThrow(
      "setupWebRTCSession requires a WebRTCConnection"
    );
  });

  it("throws when given a plain object", () => {
    const connection = { input: {}, output: {} } as any;

    expect(() => setupWebRTCSession(connection)).toThrow(
      "setupWebRTCSession requires a WebRTCConnection"
    );
  });

  it("throws with a descriptive message when given null", () => {
    expect(() => setupWebRTCSession(null as any)).toThrow("Received: object");
  });

  it("throws with a descriptive message when given undefined", () => {
    expect(() => setupWebRTCSession(undefined as any)).toThrow(
      "Received: undefined"
    );
  });
});

describe("ensureSetupStrategy", () => {
  it("returns the registered strategy", async () => {
    const { ensureSetupStrategy, setSetupStrategy } = await freshModule();
    const strategy = vi.fn();
    setSetupStrategy(strategy);

    expect(ensureSetupStrategy()).toBe(strategy);
  });

  it("points at the platform entry point when none is registered", async () => {
    const { ensureSetupStrategy } = await freshModule();

    expect(() => ensureSetupStrategy()).toThrow(
      'No voice session setup strategy registered. Import the platform-specific entry point (e.g. @elevenlabs/client via the "browser" export).'
    );
  });

  it("uses the hint the entry point injected", async () => {
    const { ensureSetupStrategy } = await freshModule();
    const { setPlatformSetupHint } = await import("./diagnostics.js");
    setPlatformSetupHint("Do the platform-specific thing.");

    expect(() => ensureSetupStrategy()).toThrow(
      "No voice session setup strategy registered. Do the platform-specific thing."
    );
  });
});
