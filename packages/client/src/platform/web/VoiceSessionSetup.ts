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
  connection: WebSocketConnection
): Promise<Omit<VoiceSessionSetupResult, "connection">> {
  const [input, output] = await Promise.all([
    MediaDeviceInput.create({
      ...connection.inputFormat,
      preferHeadphonesForIosDevices: options.preferHeadphonesForIosDevices,
      inputDeviceId: options.inputDeviceId,
      workletPaths: options.workletPaths,
      libsampleratePath: options.libsampleratePath,
    }),
    MediaDeviceOutput.create({
      ...connection.outputFormat,
      outputDeviceId: options.outputDeviceId,
      workletPaths: options.workletPaths,
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

  try {
    if (useWakeLock) {
      wakeLock = await requestWakeLock();
    }

    // Some browsers won't allow calling getSupportedConstraints or
    // enumerateDevices before getting approval for microphone access.
    preliminaryInputStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });

    const platform = detectPlatform();
    await applyDelay(resolveDelay(options.connectionDelay, platform));

    const connection = await createConnection(options);

    let result: VoiceSessionSetupResult;
    try {
      if (connection instanceof WebSocketConnection) {
        result = {
          connection,
          ...(await setupWebSocketIO(options, connection)),
        };
      } else {
        result = setupWebRTCSession(connection);
      }
    } catch (ioError) {
      connection.close();
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
    throw error;
  }
}

// Register the web strategy as the default
setSetupStrategy(webSessionSetup);
