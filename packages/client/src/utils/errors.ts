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
