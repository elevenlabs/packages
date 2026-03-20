const PREFIX = "agent-testbench" as const;
type StorageKey = `${string}-isMuted`;

export class LocalStorage {
  private static getItem<ReturnType>(key: StorageKey): ReturnType | null {
    if (typeof window === "undefined") {
      return null;
    }

    try {
      const raw = window.localStorage.getItem(String(key));
      if (raw === null) {
        return null;
      }
      return JSON.parse(raw) as ReturnType;
    } catch {
      return null;
    }
  }

  private static setItem<InputType>(key: StorageKey, value: InputType): void {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(String(key), JSON.stringify(value));
    } catch {
      // Intentionally swallow to avoid runtime failures in restricted environments.
    }
  }

  static getIsMuted() {
    return this.getItem<boolean>(`${PREFIX}-isMuted`);
  }

  static setIsMuted(isMuted: boolean) {
    this.setItem<boolean>(`${PREFIX}-isMuted`, isMuted);
  }
}
