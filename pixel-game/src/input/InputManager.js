export class InputManager {
  constructor(target = window) {
    this.target = target;
    this.keys = new Set();
    this.zoomDelta = 0;

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleWheel = this.handleWheel.bind(this);

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    target.addEventListener('wheel', this.handleWheel, { passive: false });
  }

  getMovement() {
    const x = Number(this.keys.has('KeyD') || this.keys.has('ArrowRight')) -
      Number(this.keys.has('KeyA') || this.keys.has('ArrowLeft'));
    const y = Number(this.keys.has('KeyW') || this.keys.has('ArrowUp')) -
      Number(this.keys.has('KeyS') || this.keys.has('ArrowDown'));

    return { x, y };
  }

  consumeZoomDelta() {
    const delta = this.zoomDelta;
    this.zoomDelta = 0;
    return delta;
  }

  handleKeyDown(event) {
    this.keys.add(event.code);
  }

  handleKeyUp(event) {
    this.keys.delete(event.code);
  }

  handleWheel(event) {
    event.preventDefault();
    this.zoomDelta += Math.sign(event.deltaY);
  }

  dispose() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.target.removeEventListener('wheel', this.handleWheel);
  }
}
