import { GAMEPLAY } from '../config/gameplay.js';

const RESOURCE_KEYS = Object.freeze(['wood', 'stone', 'artifact', 'ammoReserve']);

export class Inventory {
  constructor(eventBus, initialState = {}) {
    this.eventBus = eventBus;
    this.state = this.sanitize({
      wood: 0,
      stone: 0,
      artifact: 0,
      ammoReserve: GAMEPLAY.weapon.startingReserve,
      ...initialState
    });
  }

  get(resource) {
    return this.state[resource] ?? 0;
  }

  add(resource, amount, source = 'unknown') {
    this.assertResource(resource);
    const normalizedAmount = this.normalizeAmount(amount);

    if (normalizedAmount === 0) {
      return this.get(resource);
    }

    this.state[resource] += normalizedAmount;
    this.notify(resource, normalizedAmount, source);
    return this.state[resource];
  }

  canAfford(cost) {
    return Object.entries(cost).every(([resource, amount]) => this.get(resource) >= amount);
  }

  spend(cost, source = 'unknown') {
    if (!this.canAfford(cost)) {
      return false;
    }

    Object.entries(cost).forEach(([resource, amount]) => {
      this.assertResource(resource);
      this.state[resource] -= this.normalizeAmount(amount);
    });
    this.eventBus?.emit('inventory:changed', {
      inventory: this.snapshot(),
      source,
      delta: Object.fromEntries(Object.entries(cost).map(([key, value]) => [key, -value]))
    });
    return true;
  }

  replace(nextState, source = 'load') {
    this.state = this.sanitize(nextState);
    this.eventBus?.emit('inventory:changed', {
      inventory: this.snapshot(),
      source,
      delta: null
    });
  }

  snapshot() {
    return { ...this.state };
  }

  notify(resource, amount, source) {
    this.eventBus?.emit('inventory:changed', {
      inventory: this.snapshot(),
      source,
      delta: { [resource]: amount }
    });
  }

  sanitize(state) {
    return Object.fromEntries(
      RESOURCE_KEYS.map((resource) => [resource, this.normalizeAmount(state?.[resource])])
    );
  }

  normalizeAmount(value) {
    return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  }

  assertResource(resource) {
    if (!RESOURCE_KEYS.includes(resource)) {
      throw new Error(`Unknown inventory resource: ${resource}`);
    }
  }
}

