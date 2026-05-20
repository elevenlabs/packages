export function isJsonObject(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

export function assertJsonObject(
  value: unknown,
  message = "Expected a JSON object"
): asserts value is Record<string, unknown> {
  if (!isJsonObject(value)) {
    throw new Error(message);
  }
}
