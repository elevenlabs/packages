import { afterEach, describe, it, expect, vi } from "vitest";

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
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the registered strategy", async () => {
    const { ensureSetupStrategy, setSetupStrategy } = await freshModule();
    const strategy = vi.fn();
    setSetupStrategy(strategy);

    expect(ensureSetupStrategy()).toBe(strategy);
  });

  it("points a browser user at the platform entry point", async () => {
    const { ensureSetupStrategy } = await freshModule();

    expect(() => ensureSetupStrategy()).toThrow(
      'Import the platform-specific entry point (e.g. @elevenlabs/client via the "browser" export).'
    );
  });

  it("points a React Native user at @elevenlabs/react-native", async () => {
    vi.stubGlobal("navigator", { product: "ReactNative" });
    const { ensureSetupStrategy } = await freshModule();

    expect(() => ensureSetupStrategy()).toThrow(
      "@elevenlabs/client in React Native without importing @elevenlabs/react-native"
    );
  });

  it("detects React Native via the Hermes global too", async () => {
    vi.stubGlobal("HermesInternal", {});
    const { ensureSetupStrategy } = await freshModule();

    expect(() => ensureSetupStrategy()).toThrow(
      "@elevenlabs/client in React Native without importing @elevenlabs/react-native"
    );
  });

  it("does not mention React Native in a browser-like environment", async () => {
    vi.stubGlobal("navigator", { product: "Gecko" });
    const { ensureSetupStrategy } = await freshModule();

    expect(() => ensureSetupStrategy()).not.toThrow("React Native");
  });

  it("never throws the browser message once a strategy is registered in React Native", async () => {
    vi.stubGlobal("navigator", { product: "ReactNative" });
    const { ensureSetupStrategy, setSetupStrategy } = await freshModule();
    const strategy = vi.fn();
    setSetupStrategy(strategy);

    expect(ensureSetupStrategy()).toBe(strategy);
  });
});
