import { scaffold } from './shared.js';

export const title = 'Blog — Khiem';

export function render() {
  return scaffold({
    label: 'Blog',
    title: 'The log.',
    body: 'Reverse-chronological. Hub objects cross-link into their writeups.',
    links: [
      { href: '/blog/minecraft-pathfinding', text: 'Sample post →' },
      { href: '/', text: '← Home' },
    ],
  });
}
