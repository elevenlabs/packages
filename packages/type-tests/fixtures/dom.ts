// Consumer code that only compiles with the DOM lib: DOM values are accepted
// as inputs, and objects the SDK hands out keep their full DOM types.

import {
  RealtimeEvents,
  postOverallFeedback,
  type AbortSignalLike,
  type AnalyserNodeLike,
  type BlobLike,
  type CloseEventLike,
  type DeviceIdConstraint,
  type InputController,
  type MCPToolApprovalHandler,
  type MediaStreamTrackLike,
  type MicrophoneOptions,
  type RealtimeConnection,
  type ResponseLike,
  type VoiceConversation,
  type WebSocketLike,
} from "@elevenlabs/client";
import type { ConversationControlsValue } from "@elevenlabs/react";
import type { Assert, Equals } from "./assert.js";

declare const conversation: VoiceConversation;
declare const controls: ConversationControlsValue;
declare const realtimeConnection: RealtimeConnection;
declare const input: InputController;

export type PlatformTypesResolveToDom = Assert<
  Equals<
    [
      BlobLike,
      ResponseLike,
      AbortSignalLike,
      CloseEventLike,
      WebSocketLike,
      MediaStreamTrackLike,
      AnalyserNodeLike,
    ],
    [
      Blob,
      Response,
      AbortSignal,
      CloseEvent,
      WebSocket,
      MediaStreamTrack,
      AnalyserNode,
    ]
  >
>;

declare const domConstraint: ConstrainDOMString;
declare const trackConstraints: MediaTrackConstraints;
export const fromDom: DeviceIdConstraint[] = [
  domConstraint,
  trackConstraints.deviceId ?? "default",
];
export const toDom: ConstrainDOMString[] = [
  "mic" satisfies DeviceIdConstraint,
  { exact: ["mic"] } satisfies DeviceIdConstraint,
];
export const scribeMicrophone: NonNullable<MicrophoneOptions["microphone"]> = {
  deviceId: trackConstraints.deviceId,
};

void conversation.uploadFile(new File(["hello"], "hello.txt"));
void controls.uploadFile(new Blob(["hello"]));

export const approvalHandler: MCPToolApprovalHandler = async (
  _toolCall,
  { signal }
) => {
  const response = await fetch("https://example.com/approve", { signal });
  return response.ok;
};

realtimeConnection.on(RealtimeEvents.CLOSE, (event: CloseEvent) => {
  void event.code;
});

export async function feedbackResponse(): Promise<Response> {
  return postOverallFeedback("conversation-id", true);
}

const analyser = input.getAnalyser();
analyser?.connect(new AudioContext().destination);
