import type { Options } from "../BaseConversation.js";
import type { BaseConnection } from "../utils/BaseConnection.js";
import { MediaDeviceOutput } from "../utils/output.js";
import { MediaDeviceInput } from "../utils/input.js";
import { WebSocketConnection } from "../utils/WebSocketConnection.js";
import { WebRTCConnection } from "../utils/WebRTCConnection.js";
import { attachInputToConnection } from "../utils/attachInputToConnection.js";
import { attachConnectionToOutput } from "../utils/attachConnectionToOutput.js";
import { createConnection } from "../utils/ConnectionFactory.js";
import type { VoiceSessionSetupResult } from "./VoiceSessionStrategy.js";

/**
 * Sets up input and output controllers for an existing connection.
 * Shared helper used by platform-specific setup strategies.
 */
export async function setupInputOutput(
  options: Options,
  connection: BaseConnection
): Promise<Omit<VoiceSessionSetupResult, "connection">> {
  if (connection.type === "webrtc") {
    const rtcConnection = connection as WebRTCConnection;
    return {
      input: rtcConnection.input,
      output: rtcConnection.output,
      playbackEventTarget: null,
      detach: () => {},
    };
  } else if (connection.type === "websocket") {
    const wsConnection = connection as WebSocketConnection;
    const [input, output] = await Promise.all([
      MediaDeviceInput.create({
        ...wsConnection.inputFormat,
        preferHeadphonesForIosDevices: options.preferHeadphonesForIosDevices,
        inputDeviceId: options.inputDeviceId,
        workletPaths: options.workletPaths,
        libsampleratePath: options.libsampleratePath,
      }),
      MediaDeviceOutput.create({
        ...wsConnection.outputFormat,
        outputDeviceId: options.outputDeviceId,
        workletPaths: options.workletPaths,
      }),
    ]);

    const detachInput = attachInputToConnection(input, wsConnection);
    const detachOutput = attachConnectionToOutput(wsConnection, output);

    return {
      input,
      output,
      playbackEventTarget: output,
      detach: () => {
        detachInput();
        detachOutput();
      },
    };
  } else {
    throw new Error(
      `Unsupported connection type: ${connection.constructor.name}`
    );
  }
}

/**
 * Web platform session setup strategy.
 * Creates a connection and sets up input/output based on the connection type.
 */
export async function webSessionSetup(
  options: Options
): Promise<VoiceSessionSetupResult> {
  const connection = await createConnection(options);
  const io = await setupInputOutput(options, connection);
  return { connection, ...io };
}
