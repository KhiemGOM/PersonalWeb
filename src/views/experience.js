import { scaffold } from './shared.js';

export const title = 'Experience — Khiem';

export function render() {
  return scaffold({
    label: '404, on purpose',
    title: "I have not been hired yet.",
    body: 'The robot trips, the page reassembles into the pitch. Animation lands in Phase 2.',
    links: [{ href: '/', text: '← Home' }],
  });
}
