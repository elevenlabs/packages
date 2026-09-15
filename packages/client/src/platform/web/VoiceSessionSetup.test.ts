import { afterEach, describe, expect, it, vi } from "vitest";
import type { Options } from "../../BaseConversation.js";
import { WebSocketConnection } from "../../utils/WebSocketConnection.js";
import { WebRTCConnection } from "../../utils/WebRTCConnection.js";
import { waitForSessionCleanup } from "../../utils/cancellation.js";

const mocks = vi.hoisted(() => ({
  createConnection: vi.fn(),
  createInput: vi.fn(),
  createOutput: vi.fn(),
  detachInput: vi.fn(),
  detachOutput: vi.fn(),
}));

vi.mock("../../utils/ConnectionFactory.js", () => ({
  createConnection: mocks.createConnection,
}));
vi.mock("./input.js", () => ({
  MediaDeviceInput: { create: mocks.createInput },
}));
vi.mock("./output.js", () => ({
  MediaDeviceOutput: { create: mocks.createOutput },
}));
vi.mock("../../utils/attachInputToConnection.js", () => ({
  attachInputToConnection: vi.fn(() => mocks.detachInput),
}));
vi.mock("../../utils/attachConnectionToOutput.js", () => ({
  attachConnectionToOutput: vi.fn(() => mocks.detachOutput),
}));

import { webSessionSetup } from "./VoiceSessionSetup.js";

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe("webSessionSetup cancellation", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("stops a preliminary microphone track acquired after cancellation", async () => {
    const { promise, resolve } = createDeferred<MediaStream>();
    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia: vi.fn(() => promise),
      },
    });
    const stop = vi.fn();
    const stream = {
      getTracks: () => [{ stop }],
    } as unknown as MediaStream;
    const controller = new AbortController();

    const setupPromise = webSessionSetup({
      conversationToken: "test-token",
      connectionType: "webrtc",
      useWakeLock: false,
      signal: controller.signal,
    } as Options);

    controller.abort();
    await expect(setupPromise).rejects.toMatchObject({ name: "AbortError" });
    expect(stop).not.toHaveBeenCalled();

    let cleanupSettled = false;
    const cleanupPromise = waitForSessionCleanup(controller.signal).then(() => {
      cleanupSettled = true;
    });
    await Promise.resolve();
    expect(cleanupSettled).toBe(false);

    resolve(stream);
    await cleanupPromise;
    expect(cleanupSettled).toBe(true);
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it("releases a wake lock acquired after cancellation", async () => {
    const wakeLockRequest = createDeferred<WakeLockSentinel>();
    const release = vi.fn(() => Promise.resolve());
    const getUserMedia = vi.fn();
    vi.stubGlobal("navigator", {
      wakeLock: { request: vi.fn(() => wakeLockRequest.promise) },
      mediaDevices: { getUserMedia },
    });
    const controller = new AbortController();

    const setupPromise = webSessionSetup({
      conversationToken: "test-token",
      connectionType: "webrtc",
      signal: controller.signal,
    } as Options);

    controller.abort();
    await expect(setupPromise).rejects.toMatchObject({ name: "AbortError" });
    let cleanupSettled = false;
    const cleanupPromise = waitForSessionCleanup(controller.signal).then(() => {
      cleanupSettled = true;
    });
    await Promise.resolve();
    expect(cleanupSettled).toBe(false);

    wakeLockRequest.resolve({ release } as unknown as WakeLockSentinel);
    await cleanupPromise;

    expect(cleanupSettled).toBe(true);
    expect(release).toHaveBeenCalledTimes(1);
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it("closes WebSocket IO created after cancellation", async () => {
    const inputReady = createDeferred<any>();
    const input = { close: vi.fn(() => Promise.resolve()) };
    const output = { close: vi.fn(() => Promise.resolve()) };
    mocks.createInput.mockReturnValueOnce(inputReady.promise);
    mocks.createOutput.mockResolvedValueOnce(output);

    const connection = Object.assign(
      Object.create(WebSocketConnection.prototype),
      {
        inputFormat: { format: "pcm", sampleRate: 16000 },
        outputFormat: { format: "pcm", sampleRate: 16000 },
        close: vi.fn(),
      }
    ) as WebSocketConnection;
    mocks.createConnection.mockResolvedValueOnce(connection);

    const preliminaryStop = vi.fn();
    vi.stubGlobal("navigator", {
      userAgent: "test",
      mediaDevices: {
        getUserMedia: vi.fn(() =>
          Promise.resolve({
            getTracks: () => [{ stop: preliminaryStop }],
          } as unknown as MediaStream)
        ),
      },
    });
    const controller = new AbortController();
    const setupPromise = webSessionSetup({
      signedUrl: "wss://example.test/session",
      connectionType: "websocket",
      connectionDelay: { default: 0 },
      useWakeLock: false,
      signal: controller.signal,
    } as Options);
    await vi.waitFor(() => expect(mocks.createInput).toHaveBeenCalledTimes(1));

    controller.abort();
    inputReady.resolve(input);
    await expect(setupPromise).rejects.toMatchObject({ name: "AbortError" });

    expect(mocks.detachInput).toHaveBeenCalledTimes(1);
    expect(mocks.detachOutput).toHaveBeenCalledTimes(1);
    expect(connection.close).toHaveBeenCalledTimes(1);
    expect(input.close).toHaveBeenCalledTimes(1);
    expect(output.close).toHaveBeenCalledTimes(1);
    expect(preliminaryStop).toHaveBeenCalledTimes(1);
  });

  it("waits for WebRTC disconnect after cancellation wins setup", async () => {
    const disconnect = createDeferred<void>();
    const inputClose = vi.fn(() => Promise.resolve());
    const outputClose = vi.fn(() => Promise.resolve());
    const close = vi.fn(() => disconnect.promise);
    const connection = Object.assign(
      Object.create(WebRTCConnection.prototype),
      {
        input: { close: inputClose },
        output: { close: outputClose },
        close,
      }
    ) as WebRTCConnection;
    const preliminaryStop = vi.fn();
    vi.stubGlobal("navigator", {
      userAgent: "test",
      mediaDevices: {
        getUserMedia: vi.fn(() =>
          Promise.resolve({
            getTracks: () => [{ stop: preliminaryStop }],
          } as unknown as MediaStream)
        ),
      },
    });
    const controller = new AbortController();
    mocks.createConnection.mockImplementationOnce(async () => {
      controller.abort();
      return connection;
    });

    let setupSettled = false;
    const setupPromise = webSessionSetup({
      conversationToken: "test-token",
      connectionType: "webrtc",
      connectionDelay: { default: 0 },
      useWakeLock: false,
      signal: controller.signal,
    } as Options).finally(() => {
      setupSettled = true;
    });
    await vi.waitFor(() => expect(close).toHaveBeenCalledTimes(1));
    expect(setupSettled).toBe(false);
    expect(inputClose).not.toHaveBeenCalled();
    expect(outputClose).not.toHaveBeenCalled();

    disconnect.resolve();
    await expect(setupPromise).rejects.toMatchObject({ name: "AbortError" });

    expect(inputClose).toHaveBeenCalledTimes(1);
    expect(outputClose).toHaveBeenCalledTimes(1);
    expect(preliminaryStop).toHaveBeenCalledTimes(1);
  });
});
