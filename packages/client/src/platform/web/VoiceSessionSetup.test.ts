import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("livekit-client", () => ({
  Room: vi.fn(),
  RoomEvent: {},
  Track: { Kind: { Audio: "audio" }, Source: { Microphone: "microphone" } },
  ConnectionState: {},
  createLocalAudioTrack: vi.fn(),
}));
vi.mock("./input.js", () => ({ MediaDeviceInput: { create: vi.fn() } }));
vi.mock("./output.js", () => ({ MediaDeviceOutput: { create: vi.fn() } }));
vi.mock("./audioUnlock.js", () => ({
  takeUnlockedAudioContext: vi.fn(() => null),
  discardStashedAudioContext: vi.fn(),
}));
vi.mock("../../utils/ConnectionFactory.js", () => ({
  createConnection: vi.fn(),
}));

import { BaseConversation } from "../../BaseConversation.js";
import { createConnection } from "../../utils/ConnectionFactory.js";
import { WebSocketConnection } from "../../utils/WebSocketConnection.js";
import { MediaDeviceInput } from "./input.js";
import { MediaDeviceOutput } from "./output.js";
import { webSessionSetup } from "./VoiceSessionSetup.js";

function createController() {
  return { close: vi.fn().mockResolvedValue(undefined) };
}

describe("webSessionSetup with a WebSocket connection", () => {
  const track = { stop: vi.fn() };

  beforeEach(() => {
    vi.stubGlobal("navigator", {
      userAgent: "test",
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [track] }),
      },
    });
    const connection = Object.create(WebSocketConnection.prototype, {
      inputFormat: { value: { sampleRate: 16000, format: "pcm" } },
      outputFormat: { value: { sampleRate: 16000, format: "pcm" } },
      close: { value: vi.fn() },
    });
    vi.mocked(createConnection).mockResolvedValue(connection);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  function options() {
    return {
      ...BaseConversation.getFullOptions({ agentId: "agent" }),
      useWakeLock: false,
      connectionDelay: { default: 0 },
    };
  }

  it("closes the output when the input fails to open", async () => {
    const output = createController();
    const failure = new Error("microphone unavailable");
    vi.mocked(MediaDeviceInput.create).mockRejectedValue(failure);
    vi.mocked(MediaDeviceOutput.create).mockResolvedValue(output as never);

    await expect(webSessionSetup(options())).rejects.toBe(failure);

    expect(output.close).toHaveBeenCalledTimes(1);
  });

  it("closes the input when the output fails to open", async () => {
    const input = createController();
    const failure = new Error("audio worklet failed to load");
    vi.mocked(MediaDeviceInput.create).mockResolvedValue(input as never);
    vi.mocked(MediaDeviceOutput.create).mockRejectedValue(failure);

    await expect(webSessionSetup(options())).rejects.toBe(failure);

    expect(input.close).toHaveBeenCalledTimes(1);
  });
});
