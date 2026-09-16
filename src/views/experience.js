import { scaffold } from './shared.js';
import { getContact, getNarrator } from '../core/shell.js';
import { markSaid } from '../core/spoken.js';

export const title = 'Experience · Khiem';

export function render() {
  // An aside, not a hub introduction — same register as an achievement reaction (see
  // item.js), and once only: the callback to the intro's "one of them is a lie" line
  // is a payoff the first time and a stuck record on every reopen after that.
  if (markSaid('experience:reveal')) {
    getNarrator()?.react('In my defense, I did say one of the rooms was a lie.');
  }

  return scaffold({
    back: { href: '/', text: '← Home' },
    label: '404',
    title: "I have not been hired yet.",
    body: "Want to be first? That's what the button in the corner is for, or just use this one.",
    links: [{ text: 'Contact me', onClick: () => getContact()?.open() }],
  });
}
