export function isJsonObject(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

export async function extractApiErrorMessage(
  response: Response
): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (!isJsonObject(body)) return response.statusText || "Unknown error";
    const rawDetail = body.detail;
    const detail = isJsonObject(rawDetail) ? rawDetail.message : rawDetail;
    if (typeof detail === "string") {
      return detail;
    }
  } catch (error) {
    console.warn("Failed to parse API error response as JSON:", error);
  }
  return response.statusText || "Unknown error";
}

export class SessionConnectionError extends Error {
  public readonly closeCode?: number;
  public readonly closeReason?: string;

  constructor(
    message: string,
    options?: { closeCode?: number; closeReason?: string }
  ) {
    super(message);
    this.name = "SessionConnectionError";
    this.closeCode = options?.closeCode;
    this.closeReason = options?.closeReason;
  }
}
