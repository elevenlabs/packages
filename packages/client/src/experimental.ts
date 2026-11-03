// Unstable: anything here may change or disappear in any release.
import type { Conversation } from "./index.js";
import { WebRTCConnection } from "./utils/WebRTCConnection.js";

export { enableAvatarVideo } from "./utils/overrides.js";

export function onAvatarVideoTrack(
  conversation: Conversation,
  callback: (track: MediaStreamTrack | null) => void
): () => void {
  const connection = conversation["connection"];
  if (connection instanceof WebRTCConnection) {
    return connection["onAvatarVideoTrack"](callback);
  }
  callback(null);
  return () => {};
}
