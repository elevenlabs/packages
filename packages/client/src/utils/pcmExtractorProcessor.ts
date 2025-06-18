import { createWorkletModuleLoader } from "./createWorkletModuleLoader";

export const loadPcmExtractorProcessor = createWorkletModuleLoader(
  "pcm-extractor-processor",
  // language=JavaScript
  `
class PcmExtractorProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
  }

  process(inputs) {
    const input = inputs[0];
    if (input.length > 0) {
      const channelData = input[0]; // Get the first channel's data
      if (channelData && channelData.length > 0) {
        // Convert Float32Array [-1, 1] to Int16 PCM
        const pcm = new Int16Array(channelData.length);
        for (let i = 0; i < channelData.length; i++) {
          pcm[i] = Math.max(-1, Math.min(1, channelData[i])) * 32767;
        }
        // Send PCM data to main thread
        this.port.postMessage(pcm);
      }
    }
    return true; // Continue processing
  }
}

registerProcessor("pcm-extractor-processor", PcmExtractorProcessor);
`
);
