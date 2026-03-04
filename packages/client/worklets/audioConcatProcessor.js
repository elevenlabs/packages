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
    this.bufferIndex = 0;
    this.cursor = 0;
    this.wasInterrupted = false;
    this.finished = false;

    this.port.onmessage = ({ data }) => {
      switch (data.type) {
        case "setFormat":
          this.format = data.format;
          break;
        case "buffer":
          this.wasInterrupted = false;
          const buffer =
            this.format === "ulaw"
              ? new Uint8Array(data.buffer)
              : new Int16Array(data.buffer);

          if (buffer.length > 0) {
            this.buffers.push(buffer);
          }

          if (this.bufferIndex > 8) {
            this.buffers = this.buffers.slice(this.bufferIndex);
            this.bufferIndex = 0;
          }

          break;
        case "interrupt":
          this.wasInterrupted = true;
          break;
        case "clearInterrupted":
          if (this.wasInterrupted) {
            this.wasInterrupted = false;
            this.buffers = [];
            this.bufferIndex = 0;
          }
      }
    };
  }
  process(_, outputs) {
    let finished = false;
    const output = outputs[0];
    for (let i = 0; i < output[0].length; i++) {
      const currentBuffer = this.buffers[this.bufferIndex];
      if (!currentBuffer) {
        finished = true;
        for (let channel = 0; channel < output.length; channel++) {
          output[channel][i] = 0;
        }
        continue;
      }

      let value = currentBuffer[this.cursor];
      if (this.format === "ulaw") {
        value = decodeSample(value);
      }

      for (let channel = 0; channel < output.length; channel++) {
        output[channel][i] = value / 32768;
      }

      this.cursor++;
      if (this.cursor >= currentBuffer.length) {
        this.bufferIndex++;
        this.cursor = 0;
      }
    }

    if (this.finished !== finished) {
      this.finished = finished;
      this.port.postMessage({ type: "process", finished });
    }

    return true; // Continue processing
  }
}

registerProcessor("audioConcatProcessor", AudioConcatProcessor);
