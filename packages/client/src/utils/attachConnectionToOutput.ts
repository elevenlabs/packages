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
    output.playAudio(base64ToArrayBuffer(event.audio_base_64), event.metadata);
  };

  connection.addListener(listener);

  return () => {
    connection.removeListener(listener);
  };
}
