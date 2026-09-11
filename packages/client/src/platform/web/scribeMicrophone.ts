import type {
  ScribeMicrophoneConfig,
  ScribeMicrophoneResult,
  ScribeMicrophoneSetup,
} from "../../scribe/microphone.js";
import { arrayBufferToBase64 } from "../../utils/audio.js";
import { loadScribeAudioProcessor } from "./scribeAudioProcessor.generated.js";

const TARGET_SAMPLE_RATE = 16000;
const DEFAULT_SETUP_TIMEOUT_MS = 10_000;

/**
 * Rejects if `work` has not settled within `timeoutMs`.
 *
 * `AudioContext.resume()` can fail to settle at all in WebKit when it is
 * called several awaits away from the originating user gesture: it neither
 * resolves nor rejects. Without a bound, setup hangs forever, no error is ever
 * reported, and the caller never receives the cleanup function, so the
 * microphone stays open for the lifetime of the page.
 *
 * A non-finite or non-positive timeout waits indefinitely, preserving the old
 * behaviour for callers that want it.
 */
function withSetupTimeout<T>(work: Promise<T>, timeoutMs: number): Promise<T> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return work;
  }
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new Error(
          `Microphone setup timed out after ${timeoutMs}ms waiting for the ` +
            `audio pipeline to start.`
        )
      );
    }, timeoutMs);
    work.then(
      value => {
        clearTimeout(timer);
        resolve(value);
      },
      error => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

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
  let stream: MediaStream | undefined;
  let audioContext: AudioContext | undefined;
  let source: MediaStreamAudioSourceNode | undefined;
  let scribeNode: AudioWorkletNode | undefined;

  const cleanup = () => {
    for (const track of stream?.getTracks() ?? []) {
      track.stop();
    }
    source?.disconnect();
    scribeNode?.disconnect();
    void audioContext?.close();
  };

  try {
    // Get microphone access. Deliberately not bounded by the setup timeout:
    // this is where the browser prompts the user for permission, and how long
    // someone takes to answer that is not the SDK's business.
    const mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: config.deviceId,
        echoCancellation: config.echoCancellation ?? true,
        noiseSuppression: config.noiseSuppression ?? true,
        autoGainControl: config.autoGainControl ?? true,
        channelCount: config.channelCount ?? 1,
        sampleRate: { ideal: TARGET_SAMPLE_RATE },
      },
    });
    stream = mediaStream;

    // Everything past this point runs at machine speed with no user in the
    // loop, so it is safe to bound.
    const audioTrack = await withSetupTimeout(
      (async () => {
        // Get the actual sample rate from the stream — the ideal may not have been honored
        const [audioTrack] = mediaStream.getAudioTracks();
        const streamSampleRate = audioTrack?.getSettings().sampleRate;

        // Create audio context matching the stream's sample rate to avoid Firefox errors.
        // Firefox requires the AudioContext to match the microphone's native sample rate.
        const context = new AudioContext(
          streamSampleRate ? { sampleRate: streamSampleRate } : {}
        );
        audioContext = context;

        // Load scribe worklet
        await loadScribeAudioProcessor(
          context.audioWorklet,
          config.workletPaths?.scribeAudioProcessor
        );

        // Set up audio pipeline
        const mediaSource = context.createMediaStreamSource(mediaStream);
        source = mediaSource;
        const node = new AudioWorkletNode(context, "scribeAudioProcessor");
        scribeNode = node;

        // Configure the worklet with sample rate info for resampling
        // (only needed when AudioContext sample rate differs from target)
        if (context.sampleRate !== TARGET_SAMPLE_RATE) {
          node.port.postMessage({
            type: "configure",
            inputSampleRate: context.sampleRate,
            outputSampleRate: TARGET_SAMPLE_RATE,
          });
        }

        // Handle audio data from worklet
        node.port.onmessage = event => {
          onAudioData(arrayBufferToBase64(event.data.audioData));
        };

        // Connect audio pipeline
        mediaSource.connect(node);

        // Resume audio context if needed
        if (context.state === "suspended") {
          await context.resume();
        }

        return audioTrack;
      })(),
      config.setupTimeoutMs ?? DEFAULT_SETUP_TIMEOUT_MS
    );

    return { mediaStreamTrack: audioTrack, cleanup };
  } catch (error) {
    cleanup();
    throw error;
  }
};
