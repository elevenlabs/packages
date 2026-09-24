import { describe, it, expect, beforeAll, vi } from "vitest";
import { MediaDeviceOutput } from "../platform/web/output.js";

// MediaDeviceOutput.create() needs a real AudioContext/AudioWorklet, which
// this package's Node test project does not provide (only src/utils/input.ts
// runs in the browser project, and output's own setup, unlike input's,
// depends on AudioContext.resume() settling, which headless Chromium's
// autoplay policy leaves permanently pending outside a real browser test
// environment). The sampleRate/format guard below runs before setDevice
// touches any instance state, so it is exercised directly against the class's
// real setDevice implementation, without going through create().
describe("MediaDeviceOutput.setDevice", () => {
  beforeAll(() => {
    function FakeHTMLAudioElement() {}
    FakeHTMLAudioElement.prototype = { setSinkId: () => {} };
    vi.stubGlobal("HTMLAudioElement", FakeHTMLAudioElement);
  });

  function uncreatedOutput(): MediaDeviceOutput {
    return Object.create(MediaDeviceOutput.prototype) as MediaDeviceOutput;
  }

  it("rejects a sampleRate change, even alongside a device id", async () => {
    await expect(
      uncreatedOutput().setDevice({
        sampleRate: 48000,
        outputDeviceId: "speaker-2",
      })
    ).rejects.toThrow(/sampleRate or format/);
  });

  it("rejects a format change", async () => {
    await expect(
      uncreatedOutput().setDevice({ format: "ulaw" })
    ).rejects.toThrow(/sampleRate or format/);
  });
});
