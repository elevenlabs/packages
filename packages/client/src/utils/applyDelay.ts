import type { DelayConfig } from "./BaseConnection.js";

/**
 * Resolves a platform-specific delay from a DelayConfig.
 * The `platform` parameter is determined by the caller (e.g. via
 * `compatibility.ts` on the web, or from the React Native runtime).
 */
export function resolveDelay(
  delayConfig: DelayConfig | undefined,
  platform: "android" | "ios" | "default" = "default"
): number {
  if (!delayConfig) return 0;
  if (platform === "android") return delayConfig.android ?? delayConfig.default;
  if (platform === "ios") return delayConfig.ios ?? delayConfig.default;
  return delayConfig.default;
}

export async function applyDelay(delayMs: number) {
  if (delayMs > 0) {
    await new Promise<void>(resolve => setTimeout(resolve, delayMs));
  }
}
