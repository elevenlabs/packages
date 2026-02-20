import type { Options } from "../BaseConversation";
import type { BaseConnection } from "../utils/BaseConnection";
import type { InputController } from "../InputController";
import { Output } from "../utils/output";
import { MediaDeviceInput } from "../utils/input";
import { WebSocketConnection } from "../utils/WebSocketConnection";
import { WebRTCConnection } from "../utils/WebRTCConnection";
import { attachInputToConnection } from "../utils/attachInputToConnection";

export type VoiceSessionSetupResult = {
  input: InputController;
  output: Output;
  detachInput: (() => void) | null;
};

export type VoiceSessionSetupStrategy = (
  options: Options,
  connection: BaseConnection
) => Promise<VoiceSessionSetupResult>;

/**
 * Web platform session setup strategy.
 * Handles both WebSocket and WebRTC connections:
 * - WebSocket: Creates MediaDeviceInput/Output, attaches input to connection
 * - WebRTC: Uses connection.input property, creates Output
 */
export async function webSessionSetup(
  options: Options,
  connection: BaseConnection
): Promise<VoiceSessionSetupResult> {
  if (connection instanceof WebRTCConnection) {
    // WebRTC: Connection exposes input controller as a property
    const output = await Output.create({
      ...connection.outputFormat,
      outputDeviceId: options.outputDeviceId,
      workletPaths: options.workletPaths,
    });

    return {
      input: connection.input, // Use the connection's input property
      output,
      detachInput: null, // No detach needed - audio flows through LiveKit tracks
    };
  } else if (connection instanceof WebSocketConnection) {
    // WebSocket: Create separate input and attach it to the connection
    const [input, output] = await Promise.all([
      MediaDeviceInput.create({
        ...connection.inputFormat,
        preferHeadphonesForIosDevices: options.preferHeadphonesForIosDevices,
        deviceId: options.deviceId,
        workletPaths: options.workletPaths,
        libsampleratePath: options.libsampleratePath,
      }),
      Output.create({
        ...connection.outputFormat,
        outputDeviceId: options.outputDeviceId,
        workletPaths: options.workletPaths,
      }),
    ]);

    const detachInput = attachInputToConnection(input, connection);

    return {
      input,
      output,
      detachInput,
    };
  } else {
    throw new Error(
      `Unsupported connection type: ${connection.constructor.name}`
    );
  }
}

/**
 * The active session setup strategy.
 * Defaults to web platform strategy.
 * In the future, this could be swapped out for React Native or other platforms.
 */
export const setupStrategy: VoiceSessionSetupStrategy = webSessionSetup;
