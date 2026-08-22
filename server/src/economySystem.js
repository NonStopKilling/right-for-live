import { httpError } from './validators.js';

export const MERCHANT_DEFINITIONS = Object.freeze([
  {
    id: 'field_trader',
    name: 'Mercader de avanzada',
    role: 'Suministros',
    cycleMs: 15 * 60 * 1000,
    offers: [
      {
        id: 'buy_ammo',
        label: 'Municion recuperada',
        kind: 'buy',
        gives: { ammoReserve: 18 },
        takes: { wood: 3, stone: 1 },
        baseStock: 6,
        demand: 1
      },
      {
        id: 'buy_potion',
        label: 'Pocion estabilizada',
        kind: 'buy',
        gives: { healingPotion: 1 },
        takes: { artifact: 1, wood: 2 },
        baseStock: 4,
        demand: 1.15
      },
      {
        id: 'sell_wood',
        label: 'Vender madera',
        kind: 'sell',
        gives: { stone: 1 },
        takes: { wood: 5 },
        baseStock: 999,
        demand: 0.8
      }
    ]
  },
  {
    id: 'blacksmith',
    name: 'Herrero itinerante',
    role: 'Mejoras',
    cycleMs: 20 * 60 * 1000,
    offers: [
      {
        id: 'reinforce_parts',
        label: 'Repuestos reforzados',
        kind: 'craft',
        gives: { stone: 2 },
        takes: { wood: 4, artifact: 1 },
        baseStock: 3,
        demand: 1.25
      },
      {
        id: 'refine_artifact',
        label: 'Tasacion de artefacto',
        kind: 'craft',
        gives: { experience: 12 },
        takes: { artifact: 1, stone: 2 },
        baseStock: 5,
        demand: 1.05
      }
    ]
  }
]);

const MERCHANTS_BY_ID = new Map(MERCHANT_DEFINITIONS.map((merchant) => [merchant.id, merchant]));
const RESOURCE_KEYS = Object.freeze(['wood', 'stone', 'artifact', 'ammoReserve', 'healingPotion', 'experience']);

export class EconomySystem {
  constructor(store, { now = () => Date.now() } = {}) {
    this.store = store;
    this.now = now;
  }

  getSnapshot() {
    const state = this.ensureState();

    return {
      updatedAt: new Date(this.now()).toISOString(),
      merchants: MERCHANT_DEFINITIONS.map((merchant) => this.serializeMerchant(merchant, state[merchant.id]))
    };
  }

  trade(profileId, merchantId, offerId, inventoryInput) {
    const profile = this.store.getProfile(profileId);

    if (!profile) {
      throw httpError(404, 'Profile not found');
    }

    const merchant = MERCHANTS_BY_ID.get(merchantId);
    const offer = merchant?.offers.find((item) => item.id === offerId);

    if (!merchant || !offer) {
      throw httpError(404, 'Offer not found');
    }

    const state = this.ensureState();
    const merchantState = state[merchant.id];
    const offerState = merchantState.offers[offer.id];
    const costs = this.resolveCost(offer, offerState);
    const inventory = sanitizeInventory(inventoryInput);

    if (offerState.stock <= 0) {
      throw httpError(409, 'Offer out of stock');
    }

    if (!canAfford(inventory, costs)) {
      throw httpError(409, 'Not enough resources');
    }

    for (const [resource, amount] of Object.entries(costs)) {
      inventory[resource] -= amount;
    }

    for (const [resource, amount] of Object.entries(offer.gives)) {
      inventory[resource] += normalizeAmount(amount);
    }

    offerState.stock -= 1;
    offerState.sold += 1;
    offerState.demand = Math.min(2.4, offerState.demand + 0.08);
    merchantState.updatedAt = this.now();
    this.store.putEconomyState(state);

    return {
      inventory,
      receipt: {
        merchantId,
        offerId,
        label: offer.label,
        paid: costs,
        received: sanitizeInventory(offer.gives)
      },
      economy: this.getSnapshot()
    };
  }

  ensureState() {
    const state = this.store.getEconomyState();
    let changed = false;

    for (const merchant of MERCHANT_DEFINITIONS) {
      state[merchant.id] ??= { offers: {}, cycleStartedAt: this.now(), updatedAt: this.now() };
      const merchantState = state[merchant.id];

      if (this.now() - Number(merchantState.cycleStartedAt ?? 0) >= merchant.cycleMs) {
        merchantState.offers = {};
        merchantState.cycleStartedAt = this.now();
        changed = true;
      }

      for (const offer of merchant.offers) {
        if (!merchantState.offers[offer.id]) {
          merchantState.offers[offer.id] = {
            stock: offer.baseStock,
            sold: 0,
            demand: offer.demand
          };
          changed = true;
        }
      }
    }

    if (changed) {
      this.store.putEconomyState(state);
    }

    return state;
  }

  serializeMerchant(merchant, state) {
    return {
      id: merchant.id,
      name: merchant.name,
      role: merchant.role,
      restocksInMs: Math.max(0, merchant.cycleMs - (this.now() - Number(state.cycleStartedAt ?? 0))),
      offers: merchant.offers.map((offer) => {
        const offerState = state.offers[offer.id];

        return {
          id: offer.id,
          label: offer.label,
          kind: offer.kind,
          gives: sanitizeInventory(offer.gives),
          takes: this.resolveCost(offer, offerState),
          stock: offerState.stock,
          sold: offerState.sold,
          priceFactor: Math.round(resolvePriceFactor(offerState) * 100) / 100
        };
      })
    };
  }

  resolveCost(offer, state) {
    const factor = resolvePriceFactor(state);

    return Object.fromEntries(
      Object.entries(offer.takes).map(([resource, amount]) => [
        resource,
        Math.max(1, Math.ceil(normalizeAmount(amount) * factor))
      ])
    );
  }
}

function resolvePriceFactor(state) {
  return Math.max(0.75, Math.min(2.5, Number(state?.demand ?? 1) + Number(state?.sold ?? 0) * 0.04));
}

function canAfford(inventory, costs) {
  return Object.entries(costs).every(([resource, amount]) => inventory[resource] >= amount);
}

function sanitizeInventory(input) {
  return Object.fromEntries(
    RESOURCE_KEYS.map((resource) => [resource, normalizeAmount(input?.[resource])])
  );
}

function normalizeAmount(value) {
  return Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : 0;
}
