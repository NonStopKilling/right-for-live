export const QUEST_DEFINITIONS = Object.freeze([
  {
    id: 'north_signal',
    title: 'La senal del norte',
    summary: 'Explora el bosque hasta encontrar el primer marcador oculto.',
    category: 'exploration',
    steps: [
      {
        id: 'reach_marker',
        label: 'Descubre la zona marcada al norte',
        type: 'discovery',
        area: { x: 0, z: -35, radius: 8 }
      },
      {
        id: 'secure_marker',
        label: 'Asegura el punto y reporta la posicion',
        type: 'discovery',
        area: { x: 0, z: -42, radius: 10 }
      }
    ]
  },
  {
    id: 'server_hunter',
    title: 'Contener la horda',
    summary: 'Derriba enemigos autoritativos del servidor para reducir la amenaza.',
    category: 'hunt',
    steps: [
      {
        id: 'kill_server_npcs',
        label: 'Elimina zombies conectados al servidor',
        type: 'kill',
        target: 'server_npc',
        required: 2
      }
    ]
  },
  {
    id: 'field_supplies',
    title: 'Suministros de campo',
    summary: 'Reune materiales basicos para sostener una patrulla larga.',
    category: 'fetch',
    steps: [
      {
        id: 'collect_supplies',
        label: 'Reune 8 madera y 4 piedra',
        type: 'fetch',
        required: { wood: 8, stone: 4 }
      }
    ]
  }
]);

const QUESTS_BY_ID = new Map(QUEST_DEFINITIONS.map((quest) => [quest.id, quest]));

export class QuestSystem {
  constructor(store, { now = () => new Date().toISOString() } = {}) {
    this.store = store;
    this.now = now;
  }

  getSnapshot(profileId) {
    const states = this.ensureProfileStates(profileId);

    return QUEST_DEFINITIONS.map((definition) =>
      this.serializeQuest(definition, states[definition.id])
    );
  }

  startQuest(profileId, questId) {
    const definition = QUESTS_BY_ID.get(questId);

    if (!definition) {
      throw new Error('Quest not found');
    }

    const states = this.ensureProfileStates(profileId);
    const current = states[questId];

    if (current.state !== 'available') {
      return this.serializeQuest(definition, current);
    }

    states[questId] = this.createState(definition, 'active');
    this.store.putQuestStates(profileId, states);
    return this.serializeQuest(definition, states[questId]);
  }

  applyEvent(profileId, event) {
    const states = this.ensureProfileStates(profileId);
    let changed = false;

    for (const definition of QUEST_DEFINITIONS) {
      const state = states[definition.id];

      if (!state || state.state !== 'active') {
        continue;
      }

      const step = definition.steps[state.stepIndex];

      if (!step || !this.eventMatchesStep(step, event)) {
        continue;
      }

      const before = JSON.stringify(state);
      this.applyStepProgress(state, step, event);

      if (this.isStepComplete(state, step)) {
        if (state.stepIndex >= definition.steps.length - 1) {
          state.state = 'completed';
          state.completedAt = this.now();
        } else {
          state.stepIndex += 1;
          state.progress = {};
        }
      }

      state.updatedAt = this.now();
      changed = changed || JSON.stringify(state) !== before;
    }

    if (changed) {
      this.store.putQuestStates(profileId, states);
    }

    return changed ? this.getSnapshot(profileId) : null;
  }

  ensureProfileStates(profileId) {
    const states = this.store.getQuestStates(profileId);

    for (const definition of QUEST_DEFINITIONS) {
      if (!states[definition.id]) {
        states[definition.id] = this.createState(definition);
      }
    }

    this.store.putQuestStates(profileId, states);
    return states;
  }

  createState(definition, state = 'available') {
    return {
      questId: definition.id,
      state,
      stepIndex: 0,
      progress: {},
      completedAt: null,
      updatedAt: this.now()
    };
  }

  eventMatchesStep(step, event) {
    if (step.type === 'kill') {
      return event.type === 'npc:killed' && event.target === step.target;
    }

    if (step.type === 'fetch') {
      return event.type === 'inventory:synced';
    }

    if (step.type === 'discovery') {
      return event.type === 'player:moved' && distance(event, step.area) <= step.area.radius;
    }

    return false;
  }

  applyStepProgress(state, step, event) {
    if (step.type === 'kill') {
      state.progress.count = Math.min(step.required, (state.progress.count ?? 0) + 1);
      return;
    }

    if (step.type === 'fetch') {
      state.progress.inventory = sanitizeInventory(event.inventory);
      return;
    }

    if (step.type === 'discovery') {
      state.progress.discovered = true;
      state.progress.x = round(event.x);
      state.progress.z = round(event.z);
    }
  }

  isStepComplete(state, step) {
    if (step.type === 'kill') {
      return (state.progress.count ?? 0) >= step.required;
    }

    if (step.type === 'fetch') {
      const inventory = state.progress.inventory ?? {};
      return Object.entries(step.required).every(([resource, amount]) => inventory[resource] >= amount);
    }

    if (step.type === 'discovery') {
      return Boolean(state.progress.discovered);
    }

    return false;
  }

  serializeQuest(definition, state) {
    const step = definition.steps[state.stepIndex] ?? definition.steps.at(-1);

    return {
      id: definition.id,
      title: definition.title,
      summary: definition.summary,
      category: definition.category,
      state: state.state,
      stepIndex: state.stepIndex,
      stepCount: definition.steps.length,
      step: step ? this.serializeStep(step, state.progress) : null,
      progress: state.progress,
      completedAt: state.completedAt,
      updatedAt: state.updatedAt
    };
  }

  serializeStep(step, progress) {
    if (step.type === 'kill') {
      return {
        id: step.id,
        label: step.label,
        type: step.type,
        current: progress.count ?? 0,
        required: step.required
      };
    }

    if (step.type === 'fetch') {
      const inventory = progress.inventory ?? {};
      return {
        id: step.id,
        label: step.label,
        type: step.type,
        required: step.required,
        current: Object.fromEntries(
          Object.entries(step.required).map(([resource]) => [resource, inventory[resource] ?? 0])
        )
      };
    }

    return {
      id: step.id,
      label: step.label,
      type: step.type,
      area: step.area,
      discovered: Boolean(progress.discovered)
    };
  }
}

function sanitizeInventory(inventory) {
  return Object.fromEntries(
    ['wood', 'stone', 'artifact', 'ammoReserve', 'healingPotion', 'experience'].map((key) => [
      key,
      Math.max(0, Math.floor(Number(inventory?.[key]) || 0))
    ])
  );
}

function distance(a, b) {
  return Math.hypot(Number(a.x) - Number(b.x), Number(a.z) - Number(b.z));
}

function round(value) {
  return Math.round(Number(value) * 100) / 100;
}
