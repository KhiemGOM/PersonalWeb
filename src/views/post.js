import { el } from '../lib/dom.js';
import { getPost, formatPostDate } from '../content/posts.js';
import { parseParagraph, richText } from '../lib/richtext.js';
import '../styles/blog.css';

/** @param {import('../core/router.js').ViewContext} ctx */
export const title = (ctx) => {
  const post = getPost(ctx.params.id);
  return `${post?.title ?? 'Not found'} — Khiem`;
};

/** @param {import('../core/router.js').ViewContext} ctx */
export function render(ctx) {
  const post = getPost(ctx.params.id);

  if (!post) {
    return el(
      'article',
      { className: 'blog', 'data-lit': '' },
      el('a', { className: 'blog__back', href: '/blog' }, '← Blog'),
      el(
        'header',
        { className: 'blog__header' },
        el('p', { className: 'label' }, '404'),
        el('h1', { className: 'blog__post-title' }, 'No such post.'),
        el('p', { className: 'blog__intro' }, `Nothing at /blog/${ctx.params.id}.`)
      )
    );
  }

  return el(
    'article',
    { className: 'blog', 'data-lit': '' },

    el('a', { className: 'blog__back', href: '/blog' }, '← Blog'),

    el(
      'header',
      { className: 'blog__header' },
      el('p', { className: 'label' }, 'Blog'),
      el('time', { className: 'blog__date', dateTime: post.date }, formatPostDate(post.date)),
      el('h1', { className: 'blog__post-title' }, post.title)
    ),

    el(
      'div',
      { className: 'blog__body' },
      post.body.map((paragraph) => {
        const { pull, text } = parseParagraph(paragraph);
        return el('p', { className: pull ? 'blog__pull' : undefined }, ...richText(text));
      })
    )
  );
}
