import type {
  ScribeMicrophoneConfig,
  ScribeMicrophoneResult,
  ScribeMicrophoneSetup,
} from "../../scribe/microphone.js";
import { arrayBufferToBase64 } from "../../utils/audio.js";
import { addLibsamplerateModule } from "./addLibsamplerateModule.js";
import { loadScribeAudioProcessor } from "./scribeAudioProcessor.generated.js";
import { waitForResampler } from "./waitForResampler.js";

const TARGET_SAMPLE_RATE = 16000;

// Firefox requires the AudioContext to match the microphone's native sample rate
function audioContextOptions(track?: MediaStreamTrack): AudioContextOptions {
  if (navigator.mediaDevices.getSupportedConstraints().sampleRate) {
    return { sampleRate: TARGET_SAMPLE_RATE };
  }
  const trackSampleRate = track?.getSettings().sampleRate;
  return trackSampleRate ? { sampleRate: trackSampleRate } : {};
}

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
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: config.deviceId,
        echoCancellation: config.echoCancellation ?? true,
        noiseSuppression: config.noiseSuppression ?? true,
        autoGainControl: config.autoGainControl ?? true,
        channelCount: config.channelCount ?? 1,
        sampleRate: { ideal: TARGET_SAMPLE_RATE },
      },
    });
    const [audioTrack] = stream.getAudioTracks();
    audioContext = new AudioContext(audioContextOptions(audioTrack));

    // resample
    if (audioContext.sampleRate !== TARGET_SAMPLE_RATE) {
      await addLibsamplerateModule(
        audioContext,
        config.workletPaths?.libsamplerate
      );
    }
    scribeNode = await loadScribeAudioProcessor(
      audioContext,
      config.workletPaths?.scribeAudioProcessor
    );
    const resamplerReady = waitForResampler(scribeNode);
    scribeNode.port.postMessage({
      type: "configure",
      outputSampleRate: TARGET_SAMPLE_RATE,
    });
    await resamplerReady;

    // stream
    scribeNode.port.onmessage = event => {
      onAudioData(arrayBufferToBase64(event.data.audioData));
    };
    source = audioContext.createMediaStreamSource(stream);
    source.connect(scribeNode);
    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    return { mediaStreamTrack: audioTrack, cleanup };
  } catch (error) {
    cleanup();
    throw error;
  }
};
