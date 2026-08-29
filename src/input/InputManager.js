const OPTIONS_KEY = 'voxel-survival-options-v1';

const DEFAULT_KEYBINDS = Object.freeze({
  moveForward: 'KeyW',
  moveBackward: 'KeyS',
  moveLeft: 'KeyA',
  moveRight: 'KeyD',
  interact: 'KeyE',
  reload: 'KeyR',
  build: 'KeyB',
  craftPotion: 'KeyC',
  usePotion: 'Digit1',
  mute: 'KeyM',
  chat: 'Enter'
});

export class InputManager {
  constructor(target = window) {
    this.target = target;
    this.keybinds = loadKeybinds();
    this.keys = new Set();
    this.zoomDelta = 0;
    this.chunkDebugToggle = false;
    this.reloadRequested = false;
    this.buildToggleRequested = false;
    this.craftPotionRequested = false;
    this.usePotionRequested = false;
    this.interactRequested = false;
    this.cancelRequested = false;
    this.muteToggleRequested = false;
    this.primaryActionRequested = false;
    this.pointer = { x: 0, y: 0, inside: false };

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleWheel = this.handleWheel.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerLeave = this.handlePointerLeave.bind(this);

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    target.addEventListener('wheel', this.handleWheel, { passive: false });
    target.addEventListener('pointermove', this.handlePointerMove);
    target.addEventListener('pointerdown', this.handlePointerDown);
    target.addEventListener('pointerleave', this.handlePointerLeave);
  }

  getMovement() {
    const x = Number(this.keys.has(this.keybinds.moveRight) || this.keys.has('ArrowRight')) -
      Number(this.keys.has(this.keybinds.moveLeft) || this.keys.has('ArrowLeft'));
    const y = Number(this.keys.has(this.keybinds.moveForward) || this.keys.has('ArrowUp')) -
      Number(this.keys.has(this.keybinds.moveBackward) || this.keys.has('ArrowDown'));

    return { x, y };
  }

  reloadSettings() {
    this.keybinds = loadKeybinds();
    this.keys.clear();
  }

  consumeZoomDelta() {
    const delta = this.zoomDelta;
    this.zoomDelta = 0;
    return delta;
  }

  consumeChunkDebugToggle() {
    const requested = this.chunkDebugToggle;
    this.chunkDebugToggle = false;
    return requested;
  }

  isInteractHeld() {
    return this.keys.has(this.keybinds.interact);
  }

  consumeInteract() {
    return this.consumeFlag('interactRequested');
  }

  consumeReload() {
    return this.consumeFlag('reloadRequested');
  }

  consumeBuildToggle() {
    return this.consumeFlag('buildToggleRequested');
  }

  consumeCraftPotion() {
    return this.consumeFlag('craftPotionRequested');
  }

  consumeUsePotion() {
    return this.consumeFlag('usePotionRequested');
  }

  consumeCancel() {
    return this.consumeFlag('cancelRequested');
  }

  consumeMuteToggle() {
    return this.consumeFlag('muteToggleRequested');
  }

  consumePrimaryAction() {
    return this.consumeFlag('primaryActionRequested');
  }

  getPointer() {
    return { ...this.pointer };
  }

  consumeFlag(name) {
    const requested = this[name];
    this[name] = false;
    return requested;
  }

  handleKeyDown(event) {
    if (isTypingTarget(event.target)) {
      return;
    }

    this.keys.add(event.code);

    if (event.code === 'F2' && !event.repeat) {
      event.preventDefault();
      this.chunkDebugToggle = true;
    }

    if (event.repeat) {
      return;
    }

    if (event.code === this.keybinds.reload) {
      this.reloadRequested = true;
    } else if (event.code === this.keybinds.interact) {
      this.interactRequested = true;
    } else if (event.code === this.keybinds.build) {
      this.buildToggleRequested = true;
    } else if (event.code === this.keybinds.craftPotion) {
      this.craftPotionRequested = true;
    } else if (event.code === this.keybinds.usePotion) {
      this.usePotionRequested = true;
    } else if (event.code === 'Escape') {
      this.cancelRequested = true;
    } else if (event.code === this.keybinds.mute) {
      this.muteToggleRequested = true;
    }
  }

  handleKeyUp(event) {
    if (isTypingTarget(event.target)) {
      return;
    }

    this.keys.delete(event.code);
  }

  handleWheel(event) {
    event.preventDefault();
    this.zoomDelta += Math.sign(event.deltaY);
  }

  handlePointerMove(event) {
    const bounds = this.target.getBoundingClientRect();
    this.pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    this.pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
    this.pointer.inside = true;
  }

  handlePointerDown(event) {
    if (event.button !== 0) {
      return;
    }

    this.handlePointerMove(event);
    this.primaryActionRequested = true;
  }

  handlePointerLeave() {
    this.pointer.inside = false;
  }

  dispose() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.target.removeEventListener('wheel', this.handleWheel);
    this.target.removeEventListener('pointermove', this.handlePointerMove);
    this.target.removeEventListener('pointerdown', this.handlePointerDown);
    this.target.removeEventListener('pointerleave', this.handlePointerLeave);
  }
}

function loadKeybinds() {
  try {
    const options = JSON.parse(window.localStorage.getItem(OPTIONS_KEY) ?? '{}');
    return { ...DEFAULT_KEYBINDS, ...options.keybinds };
  } catch {
    return { ...DEFAULT_KEYBINDS };
  }
}

function isTypingTarget(target) {
  const tagName = target?.tagName;
  return target?.isContentEditable || tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT';
}
