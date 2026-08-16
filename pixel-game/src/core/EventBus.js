export class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  on(eventName, listener) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }

    const listeners = this.listeners.get(eventName);
    listeners.add(listener);
    return () => this.off(eventName, listener);
  }

  off(eventName, listener) {
    const listeners = this.listeners.get(eventName);

    if (!listeners) {
      return;
    }

    listeners.delete(listener);

    if (listeners.size === 0) {
      this.listeners.delete(eventName);
    }
  }

  emit(eventName, payload) {
    const listeners = this.listeners.get(eventName);

    if (!listeners) {
      return;
    }

    [...listeners].forEach((listener) => listener(payload));
  }

  clear() {
    this.listeners.clear();
  }
}

