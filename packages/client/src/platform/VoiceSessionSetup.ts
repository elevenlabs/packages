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
import { createConnection } from "../utils/ConnectionFactory";

export type VoiceSessionSetupResult = {
  connection: BaseConnection;
  input: InputController;
  output: OutputController;
  playbackEventTarget: PlaybackEventTarget | null;
  detach: () => void;
};

export type VoiceSessionSetupStrategy = (
  options: Options
) => Promise<VoiceSessionSetupResult>;

/**
 * Sets up input and output controllers for an existing connection.
 * Shared helper used by platform-specific setup strategies.
 */
export async function setupInputOutput(
  options: Options,
  connection: BaseConnection
): Promise<Omit<VoiceSessionSetupResult, "connection">> {
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

/**
 * The active session setup strategy.
 * Defaults to web platform strategy.
 * Can be overridden by platform-specific entrypoints (e.g. React Native).
 */
export let setupStrategy: VoiceSessionSetupStrategy = webSessionSetup;

/**
 * Override the voice session setup strategy.
 * Called by platform-specific entrypoints to inject their own setup handling.
 */
export function setSetupStrategy(strategy: VoiceSessionSetupStrategy) {
  setupStrategy = strategy;
}
