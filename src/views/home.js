import { scaffold } from './shared.js';
import { HUB_ORDER } from '../content/hubs.js';

export const title = "Khiem's personal dimension";

export function render() {
  return scaffold({
    label: 'Home',
    title: "Khiem's personal dimension",
    body: 'Intro reveal, visitor branch, and the scroll-driven robot journey land here.',
    links: [
      ...HUB_ORDER.map((hub) => ({ href: `/${hub.slug}`, text: hub.title })),
      { href: '/about', text: 'About' },
      { href: '/blog', text: 'Blog' },
      { href: '/experience', text: 'Experience' },
      { href: '/nonsense', text: 'A broken link' },
    ],
  });
}
