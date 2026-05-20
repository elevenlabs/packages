import type {
  ScribeMicrophoneConfig,
  ScribeMicrophoneResult,
  ScribeMicrophoneSetup,
} from "../../scribe/microphone.js";
import { arrayBufferToBase64 } from "../../utils/audio.js";
import { loadScribeAudioProcessor } from "./scribeAudioProcessor.generated.js";

const TARGET_SAMPLE_RATE = 16000;

/**
 * Web implementation of Scribe microphone streaming.
 *
 * Uses `navigator.mediaDevices.getUserMedia`, `AudioContext`, and an
 * `AudioWorkletNode` to capture, resample, and encode microphone audio
 * as base64 PCM16 chunks.
 */
export const webScribeMicrophoneSetup: ScribeMicrophoneSetup = async (
  config: ScribeMicrophoneConfig,
  onAudioData: (base64Audio: string) => void
): Promise<ScribeMicrophoneResult> => {
  // Get microphone access
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      deviceId: config.deviceId,
      echoCancellation: config.echoCancellation ?? true,
      noiseSuppression: config.noiseSuppression ?? true,
      autoGainControl: config.autoGainControl ?? true,
      channelCount: config.channelCount ?? 1,
      sampleRate: { ideal: TARGET_SAMPLE_RATE },
    },
  });

  // Get the actual sample rate from the stream — the ideal may not have been honored
  const [audioTrack] = stream.getAudioTracks();
  const streamSampleRate = audioTrack?.getSettings().sampleRate;

  // Create audio context matching the stream's sample rate to avoid Firefox errors.
  // Firefox requires the AudioContext to match the microphone's native sample rate.
  const audioContext = new AudioContext(
    streamSampleRate ? { sampleRate: streamSampleRate } : {}
  );

  // Load scribe worklet
  await loadScribeAudioProcessor(audioContext.audioWorklet);

  // Set up audio pipeline
  const source = audioContext.createMediaStreamSource(stream);
  const scribeNode = new AudioWorkletNode(audioContext, "scribeAudioProcessor");

  // Configure the worklet with sample rate info for resampling
  // (only needed when AudioContext sample rate differs from target)
  if (audioContext.sampleRate !== TARGET_SAMPLE_RATE) {
    scribeNode.port.postMessage({
      type: "configure",
      inputSampleRate: audioContext.sampleRate,
      outputSampleRate: TARGET_SAMPLE_RATE,
    });
  }

  // Handle audio data from worklet
  scribeNode.port.onmessage = event => {
    onAudioData(arrayBufferToBase64(event.data.audioData));
  };

  // Connect audio pipeline
  source.connect(scribeNode);

  // Resume audio context if needed
  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }

  return {
    mediaStreamTrack: audioTrack,
    cleanup: () => {
      for (const track of stream.getTracks()) {
        track.stop();
      }
      source.disconnect();
      scribeNode.disconnect();
      void audioContext.close();
    },
  };
};
