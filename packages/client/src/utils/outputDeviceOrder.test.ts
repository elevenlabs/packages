import { describe, expect, it } from "vitest";
import {
  DEFAULT_OUTPUT_DEVICE_ORDER,
  resolveOutputDeviceOrder,
} from "./outputDeviceOrder.js";

describe("resolveOutputDeviceOrder", () => {
  it("returns the default order without preferences", () => {
    expect(resolveOutputDeviceOrder()).toEqual(DEFAULT_OUTPUT_DEVICE_ORDER);
    expect(resolveOutputDeviceOrder([])).toEqual(DEFAULT_OUTPUT_DEVICE_ORDER);
  });

  it("puts preferences first and keeps the unlisted defaults as fallbacks", () => {
    expect(resolveOutputDeviceOrder(["earpiece", "speaker"])).toEqual([
      "earpiece",
      "speaker",
      "bluetooth",
      "headset",
    ]);
  });

  it("drops duplicate preferences", () => {
    expect(resolveOutputDeviceOrder(["speaker", "speaker"])).toEqual([
      "speaker",
      "bluetooth",
      "headset",
      "earpiece",
    ]);
  });
});
