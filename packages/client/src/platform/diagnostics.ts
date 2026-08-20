/**
 * Guidance for errors raised when nothing registered a platform
 * implementation. Injected by the platform entry points at import time, so
 * the core never has to detect the runtime it is executing in.
 */

const DEFAULT_SETUP_HINT =
  'Import the platform-specific entry point (e.g. @elevenlabs/client via the "browser" export).';

let setupHint = DEFAULT_SETUP_HINT;

/**
 * Replaces the remediation advice in "nothing registered" errors with
 * something the platform entry point knows to be actionable.
 */
export function setPlatformSetupHint(hint: string): void {
  setupHint = hint;
}

/** @param subject - What is missing, e.g. "voice session setup strategy". */
export function missingRegistrationError(subject: string): Error {
  return new Error(`No ${subject} registered. ${setupHint}`);
}
