import type { Options } from "../BaseConversation";
import type { BaseConnection } from "../utils/BaseConnection";
import type { InputController } from "../InputController";
import type { OutputController } from "../OutputController";
import { MediaDeviceOutput, type PlaybackEventTarget } from "../utils/output";
import { MediaDeviceInput } from "../utils/input";
import { WebSocketConnection } from "../utils/WebSocketConnection";
import { WebRTCConnection } from "../utils/WebRTCConnection";
import { attachInputToConnection } from "../utils/attachInputToConnection";
import { attachConnectionToOutput } from "../utils/attachConnectionToOutput";

export type VoiceSessionSetupResult = {
  input: InputController;
  output: OutputController;
  playbackEventTarget: PlaybackEventTarget | null;
  detach: () => void;
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
    return {
      input: connection.input,
      output: connection.output,
      playbackEventTarget: null,
      detach: () => {},
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
  } else {
    throw new Error(
      `Unsupported connection type: ${connection.constructor.name}`
    );
  }
}

/**
 * The active session setup strategy.
 * Defaults to web platform strategy.
 * Can be overridden by platform-specific entrypoints (e.g. React Native).
 */
export let setupStrategy: VoiceSessionSetupStrategy = webSessionSetup;

/**
 * Override the voice session setup strategy.
 * Called by platform-specific entrypoints to inject their own input/output handling.
 */
export function setSetupStrategy(strategy: VoiceSessionSetupStrategy) {
  setupStrategy = strategy;
}
