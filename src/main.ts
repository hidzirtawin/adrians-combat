import './style.css';
import { Game } from './game';
import { settings } from './settings';

if (window.matchMedia('(prefers-reduced-motion: reduce)').matches && !localStorage.getItem('adrianscombat.settings.v1')) {
  settings.reducedMotion = true;
}

function bootDone(): void {
  const boot = document.getElementById('boot');
  if (!boot) return;
  boot.classList.add('done');
  window.setTimeout(() => boot.remove(), 700);
}

function showFatal(message: string): void {
  const fatal = document.getElementById('fatal');
  const text = document.getElementById('fatalText');
  if (!fatal) return;
  if (text) text.textContent = message;
  fatal.classList.remove('hidden');
  const boot = document.getElementById('boot');
  boot?.classList.add('done');
}

window.addEventListener('error', (event) => {
  console.error('[fatal]', event.error ?? event.message);
  showFatal('A script error stopped the game. Reload to restart your run.');
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[fatal] unhandled rejection', event.reason);
  showFatal('A background task failed and the game could not continue. Reload to restart.');
});

document.getElementById('fatalReload')?.addEventListener('click', () => window.location.reload());


try {
  const game = new Game();
  (window as unknown as { adrianGame?: Game }).adrianGame = game;
  window.setTimeout(bootDone, 650);
} catch (error) {
  console.error(error);
  showFatal('WebGL could not start on this device. Try another browser (Chrome or Safari) and reload.');
}
