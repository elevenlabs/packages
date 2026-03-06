export class ListenerSet<Args extends unknown[]> {
  private listeners = new Set<(...args: Args) => void>();

  add(fn: (...args: Args) => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  invoke(...args: Args): void {
    for (const fn of this.listeners) fn(...args);
  }

  get size(): number {
    return this.listeners.size;
  }
}
