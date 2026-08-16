import { Game } from './core/Game.js';
import '../style.css';

const app = document.querySelector('#app');

if (!app) {
  throw new Error('Missing #app mount point.');
}

let game = null;

if (isWebGLAvailable()) {
  game = new Game(app);
  game.start();
} else {
  renderWebGLError(app);
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    game?.dispose();
  });
}

function isWebGLAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl2') ||
          canvas.getContext('webgl') ||
          canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

function renderWebGLError(root) {
  root.replaceChildren();

  const section = document.createElement('section');
  section.className = 'webgl-error';

  const panel = document.createElement('div');
  panel.className = 'webgl-error__panel';

  const title = document.createElement('h1');
  title.textContent = 'WebGL no esta disponible';

  const copy = document.createElement('p');
  copy.textContent =
    'Activa la aceleracion grafica del navegador o prueba con un navegador compatible para ejecutar este prototipo.';

  panel.append(title, copy);
  section.append(panel);
  root.append(section);
}
