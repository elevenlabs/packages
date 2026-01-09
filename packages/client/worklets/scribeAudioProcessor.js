/*
 * Scribe Audio Processor for converting microphone audio to PCM16 format
 * Supports resampling for browsers like Firefox that don't support
 * AudioContext sample rate constraints.
 * USED BY @elevenlabs/client
 */

class ScribeAudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = [];
    this.bufferSize = 4096; // Buffer size for optimal chunk transmission

    // Resampling state
    this.inputSampleRate = null;
    this.outputSampleRate = null;
    this.resampleRatio = 1;
    this.lastSample = 0;
    this.resampleAccumulator = 0;

    this.port.onmessage = ({ data }) => {
      if (data.type === "configure") {
        this.inputSampleRate = data.inputSampleRate;
        this.outputSampleRate = data.outputSampleRate;
        if (this.inputSampleRate && this.outputSampleRate) {
          this.resampleRatio = this.inputSampleRate / this.outputSampleRate;
        }
      }
    };
  }

  // Linear interpolation resampling
  resample(inputData) {
    if (this.resampleRatio === 1 || !this.inputSampleRate) {
      return inputData;
    }

    const outputSamples = [];

    for (let i = 0; i < inputData.length; i++) {
      const currentSample = inputData[i];

      // Generate output samples using linear interpolation
      while (this.resampleAccumulator < 1) {
        const interpolated =
          this.lastSample +
          (currentSample - this.lastSample) * this.resampleAccumulator;
        outputSamples.push(interpolated);
        this.resampleAccumulator += this.resampleRatio;
      }

      this.resampleAccumulator -= 1;
      this.lastSample = currentSample;
    }

    return new Float32Array(outputSamples);
  }

  process(inputs) {
    const input = inputs[0];
    if (input.length > 0) {
      let channelData = input[0]; // Get first channel (mono)

      // Resample if needed (for Firefox and other browsers that don't
      // support AudioContext sample rate constraints)
      if (this.resampleRatio !== 1) {
        channelData = this.resample(channelData);
      }

      // Add incoming audio to buffer
      for (let i = 0; i < channelData.length; i++) {
        this.buffer.push(channelData[i]);
      }

      // When buffer reaches threshold, convert and send
      if (this.buffer.length >= this.bufferSize) {
        const float32Array = new Float32Array(this.buffer);
        const int16Array = new Int16Array(float32Array.length);

        // Convert Float32 [-1, 1] to Int16 [-32768, 32767]
        for (let i = 0; i < float32Array.length; i++) {
          // Clamp the value to prevent overflow
          const sample = Math.max(-1, Math.min(1, float32Array[i]));
          // Scale to PCM16 range
          int16Array[i] = sample < 0 ? sample * 32768 : sample * 32767;
        }

        // Send to main thread as transferable ArrayBuffer
        this.port.postMessage(
          {
            audioData: int16Array.buffer
          },
          [int16Array.buffer]
        );

        // Clear buffer
        this.buffer = [];
      }
    }

    return true; // Continue processing
  }
}

registerProcessor("scribeAudioProcessor", ScribeAudioProcessor);

