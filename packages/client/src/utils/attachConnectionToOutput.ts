import type { OutputEventTarget, OutputListener } from "./output.js";
import { base64ToArrayBuffer } from "./audio.js";

export function attachConnectionToOutput(
  connection: OutputEventTarget,
  output: { playAudio(chunk: ArrayBuffer): void }
): () => void {
  const listener: OutputListener = event => {
    output.playAudio(base64ToArrayBuffer(event.audio_base_64));
  };

  connection.addListener(listener);

  return () => {
    connection.removeListener(listener);
  };
}
