import type { OutputDeviceKind } from "../OutputController.js";

export const DEFAULT_OUTPUT_DEVICE_ORDER: readonly OutputDeviceKind[] = [
  "bluetooth",
  "headset",
  "speaker",
  "earpiece",
];

export function resolveOutputDeviceOrder(
  preferred: readonly OutputDeviceKind[] = []
): OutputDeviceKind[] {
  return [...new Set([...preferred, ...DEFAULT_OUTPUT_DEVICE_ORDER])];
}
