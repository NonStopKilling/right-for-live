export class GameHud {
  constructor(root) {
    this.root = root;
    this.element = document.createElement('div');
    this.element.className = 'game-hud';
    this.element.innerHTML = `
      <div class="hud-panel">
        <div class="hud-day">DIA 01</div>
        <div class="hud-bars" aria-hidden="true">
          <span class="hud-bar hud-bar--life"><i></i></span>
          <span class="hud-bar hud-bar--stamina"><i></i></span>
          <span class="hud-bar hud-bar--warmth"><i></i></span>
        </div>
      </div>
      <div class="hud-slots" aria-hidden="true">
        <span class="hud-slot is-active"><b></b></span>
        <span class="hud-slot"><b></b></span>
        <span class="hud-slot"><b></b></span>
        <span class="hud-slot"><b></b></span>
        <span class="hud-slot"><b></b></span>
      </div>
    `;
    this.root.append(this.element);
  }

  dispose() {
    this.element.remove();
  }
}
