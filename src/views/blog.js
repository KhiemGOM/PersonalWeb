import { el } from '../lib/dom.js';
import { POSTS, formatPostDate } from '../content/posts.js';
import '../styles/blog.css';

export const title = 'Blog — Khiem';

export function render() {
  const sorted = [...POSTS].sort((a, b) => b.date.localeCompare(a.date));

  return el(
    'section',
    { className: 'blog', 'data-lit': '' },

    el('a', { className: 'blog__back', href: '/' }, '← Home'),

    el(
      'header',
      { className: 'blog__header' },
      el('p', { className: 'label' }, 'Blog'),
      el('h1', { className: 'blog__title' }, 'The log.'),
      el(
        'p',
        { className: 'blog__intro' },
        'Reverse-chronological. Hub objects cross-link into their writeups.'
      )
    ),

    sorted.length > 0
      ? el(
          'ul',
          { className: 'blog__list' },
          sorted.map((post) =>
            el(
              'li',
              null,
              el(
                'a',
                { className: 'blog__entry-link', href: `/blog/${post.id}` },
                el(
                  'time',
                  { className: 'blog__date', dateTime: post.date },
                  formatPostDate(post.date)
                ),
                el('h2', { className: 'blog__entry-title' }, post.title),
                el('p', { className: 'blog__entry-excerpt' }, post.excerpt)
              )
            )
          )
        )
      : el('p', { className: 'blog__empty' }, 'Nothing here yet.')
  );
}
