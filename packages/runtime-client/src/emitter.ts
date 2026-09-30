export type Unsubscribe = () => void;

/** Tiny synchronous event emitter used for runtime subscriptions. */
export class Emitter<T> {
  private readonly listeners = new Set<(value: T) => void>();

  subscribe(listener: (value: T) => void): Unsubscribe {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(value: T): void {
    for (const listener of [...this.listeners]) listener(value);
  }

  get size(): number {
    return this.listeners.size;
  }
}
