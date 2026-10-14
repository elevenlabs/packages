import type {
  OutputChunkMetadata,
  OutputEventTarget,
  OutputListener,
} from "../OutputController.js";
import { base64ToArrayBuffer } from "./audio.js";

export function attachConnectionToOutput(
  connection: OutputEventTarget,
  output: {
    playAudio(chunk: ArrayBuffer, metadata?: OutputChunkMetadata): void;
  }
): () => void {
  const listener: OutputListener = event => {
    const chunk = base64ToArrayBuffer(event.audio_base_64);
    if (event.alignment && event.event_id !== undefined) {
      output.playAudio(chunk, {
        event_id: event.event_id,
        alignment: event.alignment,
      });
    } else {
      output.playAudio(chunk);
    }
  };

  connection.addListener(listener);

  return () => {
    connection.removeListener(listener);
  };
}
