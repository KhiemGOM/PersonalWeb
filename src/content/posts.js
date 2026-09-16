/**
 * Blog posts, content as data, same pattern as items.js.
 *
 * Real markdown files are the eventual plan (a build-time parsing step), but that's
 * separate work from actually having posts to show, so this ships first.
 *
 * @typedef {Object} Post
 * @property {string} id            Matches the /blog/:id route param
 * @property {string} title
 * @property {string} date          ISO date, oldest info wins on a tie when sorting
 * @property {string} excerpt       One line, shown in the list view
 * @property {string[]} body        Paragraphs
 */

/** @type {Post[]} */
export const POSTS = [
  {
    id: 'minecraft-pathfinding',
    title: 'Which walls are worth breaking?',
    date: '2026-09-10',
    excerpt: 'Air Potential, four alternatives, and 200 searches through real Nether terrain. The speed gains, the bad calls, and an animated pathfinding lab.',
    research: true,
    body: [],
  },
];

/** @param {string} id */
export function getPost(id) {
  return POSTS.find((post) => post.id === id);
}

/** @param {string} iso */
export function formatPostDate(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
