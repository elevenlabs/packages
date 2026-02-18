import { arrayBufferToBase64 } from "./audio";
import type { InputEventTarget, InputListener } from "./input";
import type { UserAudioEvent } from "./events";

export function attachInputToConnection(
  input: InputEventTarget,
  connection: {
    sendMessage(message: UserAudioEvent): void;
  }
): () => void {
  const listener: InputListener = event => {
    const rawAudioPcmData = event.data[0];
    connection.sendMessage({
      user_audio_chunk: arrayBufferToBase64(rawAudioPcmData.buffer),
    });
  };
  input.addListener(listener);
  return () => {
    input.removeListener(listener);
  };
}
