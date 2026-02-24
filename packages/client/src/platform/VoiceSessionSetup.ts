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
 * Sets up input and output for a connection based on the connection type.
 */
export async function webSessionSetup(
  options: Options,
  connection: BaseConnection
): Promise<VoiceSessionSetupResult> {
  if (connection instanceof WebRTCConnection) {
    const output = await Output.create({
      ...connection.outputFormat,
      outputDeviceId: options.outputDeviceId,
      workletPaths: options.workletPaths,
    });

    return {
      input: connection.input,
      output,
      detachInput: null,
    };
  } else if (connection instanceof WebSocketConnection) {
    const [input, output] = await Promise.all([
      MediaDeviceInput.create({
        ...connection.inputFormat,
        preferHeadphonesForIosDevices: options.preferHeadphonesForIosDevices,
        inputDeviceId: options.inputDeviceId,
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
