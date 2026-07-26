import { scaffold } from './shared.js';

export const title = 'About — Khiem';

export function render() {
  return scaffold({
    label: 'About',
    title: 'The one room that is not a trophy case.',
    body: 'Theoretical physics, anime, Minecraft. Interactive rather than a bio paragraph.',
    links: [{ href: '/', text: '← Home' }],
  });
}
