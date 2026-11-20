// Consumer code that must compile whether or not the DOM lib is loaded.
// Every negative case uses @ts-expect-error, so a public type that silently
// degrades to `any` (an unresolved name under skipLibCheck) fails the build.

import {
  RealtimeEvents,
  postOverallFeedback,
  type AbortSignalLike,
  type AnalyserNodeLike,
  type BlobLike,
  type CloseEventLike,
  type DeviceIdConstraint,
  type InputController,
  type InputDeviceConfig,
  type MCPToolApprovalHandler,
  type MediaStreamTrackLike,
  type MicrophoneOptions,
  type OutputController,
  type RealtimeConnection,
  type ResponseLike,
  type VoiceConversation,
  type WebRTCConnection,
  type WebSocketLike,
} from "@elevenlabs/client";
import type {
  ConversationControlsValue,
  ScribeCallbacks,
  ScribeHookOptions,
  UseConversationOptions,
} from "@elevenlabs/react";
import type { Assert, Equals } from "./assert.js";

declare const conversation: VoiceConversation;
declare const controls: ConversationControlsValue;
declare const webRTCConnection: WebRTCConnection;
declare const realtimeConnection: RealtimeConnection;
declare const blob: BlobLike;

// Device ID constraints are accepted wherever an input device is chosen.
export const deviceIds: DeviceIdConstraint[] = [
  "mic",
  ["mic", "fallback"],
  { exact: "mic" },
  { ideal: ["mic", "fallback"] },
];
// @ts-expect-error device IDs are strings
export const numericDeviceId: DeviceIdConstraint = 42;

export const inputDevice: InputDeviceConfig = {
  inputDeviceId: { exact: "mic" },
};
// @ts-expect-error device IDs are strings
export const numericInputDevice: InputDeviceConfig = { inputDeviceId: 42 };

export const scribeMicrophone: NonNullable<MicrophoneOptions["microphone"]> = {
  deviceId: { ideal: "mic" },
};
export const numericScribeMicrophone: NonNullable<
  MicrophoneOptions["microphone"]
> = {
  // @ts-expect-error device IDs are strings
  deviceId: 42,
};

export const hookMicrophone: NonNullable<ScribeHookOptions["microphone"]> = {
  deviceId: ["mic", "fallback"],
};
export const hookOptions: UseConversationOptions = {
  inputDeviceId: { exact: "mic" },
};

void webRTCConnection.setAudioInputDevice({ exact: "mic" });
// @ts-expect-error device IDs are strings
void webRTCConnection.setAudioInputDevice(42);
void controls.changeInputDevice({ inputDeviceId: ["mic", "fallback"] });

// File uploads take the platform Blob.
void conversation.uploadFile(blob);
void controls.uploadFile(blob);
// @ts-expect-error uploads take a Blob
void conversation.uploadFile("not a blob");
// @ts-expect-error uploads take a Blob
void controls.uploadFile("not a blob");

// Objects handed to callbacks expose typed members.
export const approvalHandler: MCPToolApprovalHandler = (_toolCall, context) => {
  context.signal.addEventListener("abort", () => {}, { once: true });
  // @ts-expect-error not an AbortSignal member
  void context.signal.notAMember;
  return !context.signal.aborted;
};
export type SignalIsTyped = Assert<
  Equals<
    Parameters<MCPToolApprovalHandler>[1]["signal"]["aborted"],
    AbortSignalLike["aborted"]
  >
>;

realtimeConnection.on(RealtimeEvents.CLOSE, event => {
  const code: number = event.code;
  // @ts-expect-error not a CloseEvent member
  void event.notAMember;
  void code;
});

export async function sendFeedback(): Promise<boolean> {
  const response = await postOverallFeedback("conversation-id", true);
  // @ts-expect-error not a Response member
  void response.notAMember;
  return response.ok;
}

declare const input: InputController;
declare const output: OutputController;
export const frequencyBinCounts: number[] = [
  input.getAnalyser()?.frequencyBinCount ?? 0,
  output.getAnalyser()?.frequencyBinCount ?? 0,
];
// @ts-expect-error not an AnalyserNode member
void input.getAnalyser()?.notAMember;

export const onScribeError: NonNullable<ScribeCallbacks["onError"]> = error => {
  const message: string = error.message;
  void message;
};

export type ExportedPlatformTypes = Assert<
  Equals<
    [
      BlobLike["size"],
      ResponseLike["ok"],
      AbortSignalLike["aborted"],
      CloseEventLike["code"],
      WebSocketLike["readyState"],
      MediaStreamTrackLike["enabled"],
      AnalyserNodeLike["frequencyBinCount"],
    ],
    [number, boolean, boolean, number, number, boolean, number]
  >
>;
