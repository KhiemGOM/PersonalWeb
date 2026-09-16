import { scaffold } from './shared.js';

export const title = 'About · Khiem';

export function render() {
  return scaffold({
    back: { href: '/', text: '← Home' },
    label: 'About',
    title: 'The one room that is not a trophy case.',
    body: 'Theoretical physics, anime, Minecraft. Interactive rather than a bio paragraph.',
    sections: [
      {
        label: 'Blog',
        links: [{ href: '/blog', text: 'Read the blog →' }],
      },
      {
        label: 'Contact',
        links: [
          { href: 'tel:+6585357475', text: '+65 8535 7475' },
          { href: 'mailto:dangkhie001@e.ntu.edu.sg', text: 'dangkhie001@e.ntu.edu.sg (work)' },
          { href: 'mailto:khiem06072007@gmail.com', text: 'khiem06072007@gmail.com (personal)' },
          { href: 'https://github.com/KhiemGOM', text: 'github.com/KhiemGOM' },
        ],
      },
    ],
  });
}
