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
    title: "Pathfinding through a world you're allowed to dig through",
    // TODO(copy): confirm the actual date this was written/shipped.
    date: '2026-01-01',
    excerpt: "Why A* stops making sense the moment the agent is allowed to change the map it's standing on.",
    body: [
      "`A*` assumes the map holds still. Give it a graph and a cost function, and it will find the cheapest path through both, but the whole guarantee rests on neither of them changing while it works. That assumption is free in most games, because most game worlds don't move. Minecraft's do, if the thing walking through them is allowed to mine.",
      "I built an agent that can dig, which meant every block next to it became a possible move, not just the open ones. Naive `A*` doesn't distinguish between walking into an open cell and mining through solid stone to make one, so the moment digging was on the table everywhere, the **branching factor** stopped being a handful of directions and became every diggable neighbor at every single step. The search didn't get a little slower. Node expansions *went insane*, considering tunnelling in a dozen directions from every cell along the way, almost none of which any sane path would actually take.",
      "The fix was to make tunnelling expensive by default instead of free by default. The **air-potential heuristic** scores the open space ahead of the agent, so a route through existing open air reads as cheaper than mining a new one unless digging is genuinely shorter. That's what brought the node count back down: most of those diggable neighbors get pruned before the search ever wastes time on them, and digging survives only where it was actually the better move.",
      "> The result reads less like a maze-solver and more like something that's actually deciding whether to go around or go through, which was the whole point of letting it dig in the first place.",
    ],
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
