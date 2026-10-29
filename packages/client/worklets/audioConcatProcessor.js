/*
 * ulaw decoding logic taken from the wavefile library
 * https://github.com/rochars/wavefile/blob/master/lib/codecs/mulaw.js
 * USED BY @elevenlabs/client
 */

const decodeTable = [0, 132, 396, 924, 1980, 4092, 8316, 16764];

function decodeSample(muLawSample) {
  let sign;
  let exponent;
  let mantissa;
  let sample;
  muLawSample = ~muLawSample;
  sign = muLawSample & 0x80;
  exponent = (muLawSample >> 4) & 0x07;
  mantissa = muLawSample & 0x0f;
  sample = decodeTable[exponent] + (mantissa << (exponent + 3));
  if (sign !== 0) sample = -sample;

  return sample;
}

class AudioConcatProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffers = []; // Initialize an empty buffer
    this.cursor = 0;
    this.currentBuffer = null;
    this.wasInterrupted = false;
    this.finished = false;
    this.lastBufferSequence = 0;
    this.lastFinishedBufferSequence = 0;

    this.port.onmessage = ({ data }) => {
      switch (data.type) {
        case "setFormat":
          // A second resampler could finish last and replace the first with the wrong rate
          if (this.format !== undefined) {
            throw new Error("setFormat can only be sent once");
          }
          this.format = data.format;
          if (sampleRate !== data.sampleRate) {
            this.createResampler(data.sampleRate).then(
              () => this.port.postMessage({ type: "resampler_ready" }),
              error =>
                this.port.postMessage({
                  type: "resampler_error",
                  message:
                    error instanceof Error ? error.message : String(error),
                })
            );
          }
          break;
        case "buffer":
          this.wasInterrupted = false;
          this.lastBufferSequence =
            data.bufferSequence ?? this.lastBufferSequence;
          this.buffers.push({
            samples:
              this.format === "ulaw"
                ? new Uint8Array(data.buffer)
                : new Int16Array(data.buffer),
            chunkId: data.chunkId,
          });
          break;
        case "interrupt":
          this.wasInterrupted = true;
          break;
        case "clearInterrupted":
          if (this.wasInterrupted) {
            this.wasInterrupted = false;
            this.buffers = [];
            this.currentBuffer = null;
          }
      }
    };
  }
  async createResampler(inputSampleRate) {
    if (!globalThis.LibSampleRate) {
      throw new Error("libsamplerate is not loaded");
    }
    this.resampler = await globalThis.LibSampleRate.create(
      1,
      inputSampleRate,
      sampleRate
    );
  }
  process(_, outputs) {
    let finished = false;
    const output = outputs[0][0];
    for (let i = 0; i < output.length; i++) {
      if (!this.currentBuffer) {
        if (this.buffers.length === 0) {
          finished = true;
          break;
        }
        const { samples, chunkId } = this.buffers.shift();
        this.currentBuffer = samples;
        if (chunkId !== undefined) {
          this.port.postMessage({ type: "chunk_start", chunkId });
        }
        if (this.resampler) {
          this.currentBuffer = this.resampler.full(this.currentBuffer);
        }
        this.cursor = 0;
      }

      let value = this.currentBuffer[this.cursor];
      if (this.format === "ulaw") {
        value = decodeSample(value);
      }
      output[i] = value / 32768;
      this.cursor++;

      if (this.cursor >= this.currentBuffer.length) {
        this.currentBuffer = null;
      }
    }

    // A short buffer can finish within one render quantum while already idle.
    // Report its completion even when the finished state has not changed.
    if (
      this.finished !== finished ||
      (finished && this.lastFinishedBufferSequence !== this.lastBufferSequence)
    ) {
      this.finished = finished;
      if (finished) {
        this.lastFinishedBufferSequence = this.lastBufferSequence;
      }
      this.port.postMessage({
        type: "process",
        finished,
        bufferSequence: this.lastBufferSequence,
      });
    }

    return true; // Continue processing
  }
}

registerProcessor("audioConcatProcessor@9c58fa2cda75d303", AudioConcatProcessor);
