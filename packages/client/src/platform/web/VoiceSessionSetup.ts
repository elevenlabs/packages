import type { Options } from "../../BaseConversation.js";
import type { BaseConnection } from "../../utils/BaseConnection.js";
import {
  setSetupStrategy,
  setupWebRTCSession,
  type VoiceSessionSetupResult,
} from "../VoiceSessionSetup.js";
import { MediaDeviceOutput } from "./output.js";
import { MediaDeviceInput } from "./input.js";
import { WebSocketConnection } from "../../utils/WebSocketConnection.js";
import { WebRTCConnection } from "../../utils/WebRTCConnection.js";
import { attachInputToConnection } from "../../utils/attachInputToConnection.js";
import { attachConnectionToOutput } from "../../utils/attachConnectionToOutput.js";
import { createConnection } from "../../utils/ConnectionFactory.js";
import { applyDelay, resolveDelay } from "../../utils/applyDelay.js";
import { isAndroidDevice, isIosDevice } from "./compatibility.js";
import {
  discardStashedAudioContext,
  takeUnlockedAudioContext,
} from "./audioUnlock.js";
import {
  observeWithCancellation,
  registerSessionCleanup,
  throwIfSessionAborted,
} from "../../utils/cancellation.js";

function detectPlatform(): "android" | "ios" | "default" {
  if (isAndroidDevice()) return "android";
  if (isIosDevice()) return "ios";
  return "default";
}

async function requestWakeLock(): Promise<WakeLockSentinel | null> {
  if ("wakeLock" in navigator) {
    // unavailable without HTTPS, including localhost in dev
    try {
      return await navigator.wakeLock.request("screen");
    } catch (_e) {
      // Wake Lock is not required for the conversation to work
    }
  }
  return null;
}

/**
 * Sets up WebSocket-specific input and output controllers using
 * web MediaDevice APIs (AudioContext, AudioWorklet, etc.).
 */
async function setupWebSocketIO(
  options: Options,
  connection: WebSocketConnection,
  audioContext: AudioContext | null
): Promise<Omit<VoiceSessionSetupResult, "connection">> {
  const [input, output] = await Promise.all([
    MediaDeviceInput.create({
      ...connection.inputFormat,
      preferHeadphonesForIosDevices: options.preferHeadphonesForIosDevices,
      inputDeviceId: options.inputDeviceId,
      inputChunkDurationMs: options.inputChunkDurationMs,
      workletPaths: options.workletPaths,
      libsampleratePath: options.libsampleratePath,
    }),
    MediaDeviceOutput.create({
      ...connection.outputFormat,
      outputDeviceId: options.outputDeviceId,
      workletPaths: options.workletPaths,
      audioContext: audioContext ?? undefined,
    }),
  ]);

  const detachInput = attachInputToConnection(input, connection);
  const detachOutput = attachConnectionToOutput(connection, output);

  return {
    input,
    output,
    playbackEventTarget: output,
    detach: async () => {
      detachInput();
      detachOutput();
    },
  };
}

/**
 * Web platform session setup strategy.
 * Handles wake lock, preliminary mic permission, platform-specific delay,
 * connection creation, and input/output setup.
 */
export async function webSessionSetup(
  options: Options
): Promise<VoiceSessionSetupResult> {
  const useWakeLock = options.useWakeLock ?? true;
  let wakeLock: WakeLockSentinel | null = null;
  let preliminaryInputStream: MediaStream | null = null;
  let unlockedAudioContext: AudioContext | null = null;

  try {
    throwIfSessionAborted(options.signal);
    if (useWakeLock) {
      const wakeLockRequest = requestWakeLock();
      const wakeLockCleanup = wakeLockRequest.then(
        async lock => {
          if (options.signal?.aborted) {
            await lock?.release().catch(() => {});
          }
        },
        () => {}
      );
      registerSessionCleanup(options.signal, wakeLockCleanup);
      wakeLock = await observeWithCancellation(wakeLockRequest, options.signal);
    }

    // Some browsers won't allow calling getSupportedConstraints or
    // enumerateDevices before getting approval for microphone access.
    const preliminaryInputRequest = navigator.mediaDevices.getUserMedia({
      audio: true,
    });
    const preliminaryInputCleanup = preliminaryInputRequest.then(
      stream => {
        if (options.signal?.aborted) {
          for (const track of stream.getTracks()) {
            try {
              track.stop();
            } catch (_error) {}
          }
        }
      },
      () => {}
    );
    registerSessionCleanup(options.signal, preliminaryInputCleanup);
    preliminaryInputStream = await observeWithCancellation(
      preliminaryInputRequest,
      options.signal
    );

    const platform = detectPlatform();
    await observeWithCancellation(
      applyDelay(resolveDelay(options.connectionDelay, platform)),
      options.signal
    );

    const connection = await createConnection(options);

    let result: VoiceSessionSetupResult | null = null;
    try {
      if (connection instanceof WebSocketConnection) {
        unlockedAudioContext = takeUnlockedAudioContext();
        result = {
          connection,
          ...(await setupWebSocketIO(
            options,
            connection,
            unlockedAudioContext
          )),
        };
        // Ownership transferred to MediaDeviceOutput.
        unlockedAudioContext = null;
      } else {
        // WebRTC doesn't use the unlocked context — discard the stash so it
        // doesn't sit until the TTL fires.
        discardStashedAudioContext();
        result = setupWebRTCSession(connection);
      }
      throwIfSessionAborted(options.signal);
    } catch (ioError) {
      await unlockedAudioContext?.close().catch(() => {});
      unlockedAudioContext = null;
      await result?.detach().catch(() => {});
      await connection.close();
      await result?.input.close().catch(() => {});
      await result?.output.close().catch(() => {});
      throw ioError;
    }

    // Stop the preliminary stream after setting up the session.
    // Its only purpose was triggering the browser's microphone permission
    // prompt; it must remain alive until the strategy finishes because
    // MediaDeviceInput.create (WebSocket path) needs mic access granted.
    if (preliminaryInputStream) {
      for (const track of preliminaryInputStream.getTracks()) {
        track.stop();
      }
      preliminaryInputStream = null;
    }

    // Set up visibility change handler for wake lock re-acquisition.
    // Wake locks are automatically released when a page is hidden (e.g.
    // switching tabs), so attempt to re-acquire when visible again.
    let visibilityChangeHandler: (() => void) | null = null;
    if (wakeLock) {
      visibilityChangeHandler = () => {
        if (document.visibilityState === "visible" && wakeLock?.released) {
          requestWakeLock().then(lock => {
            wakeLock = lock;
          });
        }
      };
      document.addEventListener("visibilitychange", visibilityChangeHandler);
    }

    const originalDetach = result.detach;
    return {
      ...result,
      detach: async () => {
        await originalDetach();
        if (visibilityChangeHandler) {
          document.removeEventListener(
            "visibilitychange",
            visibilityChangeHandler
          );
        }
        try {
          await wakeLock?.release();
          wakeLock = null;
        } catch (_e) {}
      },
    };
  } catch (error) {
    // Clean up on setup failure
    if (preliminaryInputStream) {
      for (const track of preliminaryInputStream.getTracks()) {
        track.stop();
      }
    }
    try {
      await wakeLock?.release();
      wakeLock = null;
    } catch (_e) {}
    discardStashedAudioContext();
    throw error;
  }
}

// Register the web strategy as the default
setSetupStrategy(webSessionSetup);
