import type { DelayConfig } from "./BaseConnection.js";

/**
 * Resolves a platform-specific delay from a DelayConfig.
 * The `platform` parameter is determined by the caller (e.g. via
 * `compatibility.ts` on the web, or from the React Native runtime).
 */
const DEFAULT_DELAY: DelayConfig = {
  default: 0,
  // Give the Android AudioManager enough time to switch to the correct audio mode
  android: 3_000,
};

export function resolveDelay(
  delayConfig: DelayConfig | undefined,
  platform: "android" | "ios" | "default" = "default"
): number {
  const config = delayConfig ?? DEFAULT_DELAY;
  if (platform === "android") return config.android ?? config.default;
  if (platform === "ios") return config.ios ?? config.default;
  return config.default;
}

export async function applyDelay(delayMs: number) {
  if (delayMs > 0) {
    await new Promise<void>(resolve => setTimeout(resolve, delayMs));
  }
}
