export async function extractApiErrorMessage(
  response: Response
): Promise<string> {
  try {
    const body = await response.json();
    const detail = body?.detail?.message ?? body?.detail;
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
