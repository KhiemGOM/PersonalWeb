/**
 * Sound toggle.
 *
 * Sound is off until asked for. Browsers require a user gesture before audio can start
 * anyway, so a control is not optional — and a site that beeps at you unprompted has
 * made a decision it was not entitled to make.
 */

import { el } from '../lib/dom.js';
import { sound } from '../core/sound.js';

export function createSoundToggle() {
  const label = el('span', { className: 'sound-toggle__label' });

  const button = el(
    'button',
    {
      className: 'sound-toggle',
      type: 'button',
      onclick: () => sound.toggle(),
    },
    el('span', { className: 'sound-toggle__icon', 'aria-hidden': 'true' }),
    label
  );

  sound.subscribe((on) => {
    button.dataset.on = String(on);
    button.setAttribute('aria-pressed', String(on));
    button.setAttribute('aria-label', on ? 'Turn sound off' : 'Turn sound on');
    label.textContent = on ? 'Sound on' : 'Sound off';
  });

  document.body.appendChild(button);
  return { element: button, destroy: () => button.remove() };
}
