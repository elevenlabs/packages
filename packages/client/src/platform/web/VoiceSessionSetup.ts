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
    detach: () => {
      detachInput();
      detachOutput();
    },
  };
}

/**
 * Web platform session setup strategy.
 * Creates a connection and sets up input/output based on the connection type.
 */
export async function webSessionSetup(
  options: Options
): Promise<VoiceSessionSetupResult> {
  const connection = await createConnection(options);

  if (connection instanceof WebSocketConnection) {
    const io = await setupWebSocketIO(options, connection);
    return { connection, ...io };
  }

  // WebRTC — platform-agnostic setup
  return setupWebRTCSession(connection);
}

// Register the web strategy as the default
setSetupStrategy(webSessionSetup);
