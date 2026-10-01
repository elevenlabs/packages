import { afterEach, describe, expect, it, vi } from "vitest";
import type { Options } from "../../BaseConversation.js";
import { WebSocketConnection } from "../../utils/WebSocketConnection.js";
import { WebRTCConnection } from "../../utils/WebRTCConnection.js";
import {
  registerSessionCleanup,
  waitForSessionCleanup,
} from "../../utils/cancellation.js";

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

function listenForUnhandledRejections() {
  const reasons: unknown[] = [];
  const listener = (reason: unknown) => reasons.push(reason);
  const processEvents = (
    globalThis as typeof globalThis & {
      process: {
        on: (event: "unhandledRejection", callback: typeof listener) => void;
        off: (event: "unhandledRejection", callback: typeof listener) => void;
      };
    }
  ).process;
  processEvents.on("unhandledRejection", listener);
  return {
    reasons,
    stop: () => processEvents.off("unhandledRejection", listener),
  };
}

describe("webSessionSetup cancellation", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("does not gate cleanup on an unanswered microphone prompt and stops a late stream", async () => {
    const { promise, resolve } = createDeferred<MediaStream>();
    const getUserMedia = vi.fn(() => promise);
    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia,
      },
    });
    const stopFirst = vi.fn();
    const stopSecond = vi.fn();
    const stream = {
      getTracks: () => [{ stop: stopFirst }, { stop: stopSecond }],
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
    expect(stopFirst).not.toHaveBeenCalled();
    expect(stopSecond).not.toHaveBeenCalled();
    expect(getUserMedia).toHaveBeenCalledTimes(1);

    await waitForSessionCleanup(controller.signal);
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(stopFirst).not.toHaveBeenCalled();
    expect(stopSecond).not.toHaveBeenCalled();

    resolve(stream);
    await vi.waitFor(() => {
      expect(stopFirst).toHaveBeenCalledTimes(1);
      expect(stopSecond).toHaveBeenCalledTimes(1);
    });
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
    await waitForSessionCleanup(controller.signal);
    expect(release).not.toHaveBeenCalled();
    expect(getUserMedia).not.toHaveBeenCalled();

    wakeLockRequest.resolve({ release } as unknown as WakeLockSentinel);
    await vi.waitFor(() => expect(release).toHaveBeenCalledTimes(1));
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
    const unhandled = listenForUnhandledRejections();
    try {
      const setupPromise = webSessionSetup({
        signedUrl: "wss://example.test/session",
        connectionType: "websocket",
        connectionDelay: { default: 0 },
        useWakeLock: false,
        signal: controller.signal,
      } as Options);
      await vi.waitFor(() =>
        expect(mocks.createInput).toHaveBeenCalledTimes(1)
      );

      controller.abort();
      inputReady.resolve(input);
      await expect(setupPromise).rejects.toMatchObject({ name: "AbortError" });

      expect(mocks.detachInput).toHaveBeenCalledTimes(1);
      expect(mocks.detachOutput).toHaveBeenCalledTimes(1);
      expect(connection.close).toHaveBeenCalledTimes(1);
      expect(input.close).toHaveBeenCalledTimes(1);
      expect(output.close).toHaveBeenCalledTimes(1);
      expect(preliminaryStop).toHaveBeenCalledTimes(1);

      await new Promise(resolve => setTimeout(resolve, 0));
      expect(mocks.detachInput).toHaveBeenCalledTimes(1);
      expect(mocks.detachOutput).toHaveBeenCalledTimes(1);
      expect(connection.close).toHaveBeenCalledTimes(1);
      expect(input.close).toHaveBeenCalledTimes(1);
      expect(output.close).toHaveBeenCalledTimes(1);
      expect(unhandled.reasons).toEqual([]);
    } finally {
      unhandled.stop();
    }
  });

  it("keeps cancelled WebSocket IO teardown visible to cleanup waiters", async () => {
    const inputReady = createDeferred<any>();
    const inputClosed = createDeferred<void>();
    const input = { close: vi.fn(() => inputClosed.promise) };
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
    vi.stubGlobal("navigator", {
      userAgent: "test",
      mediaDevices: {
        getUserMedia: vi.fn(() =>
          Promise.resolve({
            getTracks: () => [{ stop: vi.fn() }],
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
    expect(input.close).toHaveBeenCalledTimes(1);

    let cleanupSettled = false;
    const cleanupPromise = waitForSessionCleanup(controller.signal).then(() => {
      cleanupSettled = true;
    });
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(cleanupSettled).toBe(false);

    inputClosed.resolve();
    await cleanupPromise;
    expect(cleanupSettled).toBe(true);
  });

  it("rejects cancelled setup promptly while WebRTC disconnect remains cleanup", async () => {
    const disconnect = createDeferred<void>();
    const inputClose = vi.fn(() => Promise.resolve());
    const outputClose = vi.fn(() => Promise.resolve());
    const controller = new AbortController();
    const close = vi.fn(() => {
      registerSessionCleanup(controller.signal, disconnect.promise);
      return disconnect.promise;
    });
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
    const setupExpectation = expect(setupPromise).rejects.toMatchObject({
      name: "AbortError",
    });
    await vi.waitFor(() => expect(close).toHaveBeenCalledTimes(1));
    await setupExpectation;
    expect(setupSettled).toBe(true);
    expect(inputClose).toHaveBeenCalledTimes(1);
    expect(outputClose).toHaveBeenCalledTimes(1);
    expect(preliminaryStop).toHaveBeenCalledTimes(1);

    let cleanupSettled = false;
    const cleanupPromise = waitForSessionCleanup(controller.signal).then(() => {
      cleanupSettled = true;
    });
    await Promise.resolve();
    expect(cleanupSettled).toBe(false);

    disconnect.resolve();
    await cleanupPromise;
    expect(cleanupSettled).toBe(true);
  });
});
