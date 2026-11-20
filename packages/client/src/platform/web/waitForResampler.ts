export type ResamplerMessage =
  | { type: "resampler_ready" }
  | { type: "resampler_error"; message: string };

export function waitForResampler(worklet: AudioWorkletNode): Promise<void> {
  return new Promise((resolve, reject) => {
    const onMessage = ({ data }: MessageEvent<ResamplerMessage>) => {
      if (data.type === "resampler_ready") {
        worklet.port.removeEventListener("message", onMessage);
        resolve();
      } else if (data.type === "resampler_error") {
        worklet.port.removeEventListener("message", onMessage);
        reject(new Error(`Failed to create audio resampler: ${data.message}`));
      }
    };
    worklet.port.addEventListener("message", onMessage);
    worklet.port.start();
  });
}
