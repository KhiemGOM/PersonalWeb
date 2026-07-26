/**
 * Path inspector — dev only. Toggle with Shift+D, or load with ?debug=path.
 *
 * Draws the robot's route in DOCUMENT space, over the real page, together with the text
 * blocks it has to avoid. Collisions are computed live and drawn in red.
 *
 * This exists because the collision problem is invisible from any single screenful. The
 * robot is anchored in the document, so its route is a single line running the whole
 * length of the page, and whether it clears the copy is a question about geometry you
 * cannot see without drawing all of it at once. The first version of the path ran
 * through all five text blocks and looked fine at every individual scroll position.
 */

import { el } from '../lib/dom.js';
import { getPositionAtProgress } from '../lib/path.js';
import { JOURNEY } from '../content/journey.js';

const NS = 'http://www.w3.org/2000/svg';

/** Robot half-extents, matching the rendered rig. */
const RX = 75;
const RY = 72;

/** @param {string} tag @param {Record<string,string|number>} attrs */
function svg(tag, attrs = {}) {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}

export function createPathDebug() {
  let visible = new URLSearchParams(location.search).get('debug') === 'path';

  const layer = el('div', { className: 'path-debug', hidden: !visible });
  document.body.appendChild(layer);

  function draw() {
    layer.replaceChildren();
    if (!visible) return;

    const W = window.innerWidth;
    const H = window.innerHeight;
    const docH = document.documentElement.scrollHeight;
    const maxScroll = Math.max(1, docH - H);

    const root = svg('svg', { width: '100%', height: docH, viewBox: `0 0 ${W} ${docH}` });

    const texts = [...document.querySelectorAll('.landing__section')].map((s) => {
      const box = /** @type {HTMLElement} */ (s.querySelector('.landing__text')).getBoundingClientRect();
      return {
        id: /** @type {HTMLElement} */ (s).id,
        x0: box.left,
        x1: box.right,
        y0: box.top + window.scrollY,
        y1: box.bottom + window.scrollY,
      };
    });

    for (const t of texts) {
      root.appendChild(
        svg('rect', {
          x: t.x0, y: t.y0, width: t.x1 - t.x0, height: t.y1 - t.y0,
          class: 'path-debug__text',
        })
      );
      const label = svg('text', { x: t.x0 + 6, y: t.y0 + 16, class: 'path-debug__label' });
      label.textContent = t.id;
      root.appendChild(label);
    }

    // Section boundaries.
    for (let k = 1; k * H < docH; k++) {
      root.appendChild(svg('line', { x1: 0, y1: k * H, x2: W, y2: k * H, class: 'path-debug__edge' }));
    }

    // The route, sampled finely, with the robot's footprint tested at every sample.
    let points = '';
    let collisions = 0;
    for (let i = 0; i <= 600; i++) {
      const p = i / 600;
      const pt = getPositionAtProgress(p, JOURNEY);
      const px = pt.x * W;
      const py = p * maxScroll + pt.y * H;
      points += `${px},${py} `;

      const hit = texts.some((t) => px + RX > t.x0 && px - RX < t.x1 && py + RY > t.y0 && py - RY < t.y1);
      if (hit) {
        collisions++;
        root.appendChild(svg('rect', {
          x: px - RX, y: py - RY, width: RX * 2, height: RY * 2, class: 'path-debug__hit',
        }));
      }
    }
    root.appendChild(svg('polyline', { points, class: 'path-debug__route' }));

    // Waypoints, with the robot's footprint drawn at each one.
    for (const w of JOURNEY) {
      const px = w.x * W;
      const py = w.progress * maxScroll + w.y * H;
      root.appendChild(svg('rect', {
        x: px - RX, y: py - RY, width: RX * 2, height: RY * 2, class: 'path-debug__rig',
      }));
      root.appendChild(svg('circle', { cx: px, cy: py, r: w.stop ? 7 : 4, class: w.stop ? 'path-debug__stop' : 'path-debug__mid' }));
      const label = svg('text', { x: px + 12, y: py + 4, class: 'path-debug__label' });
      label.textContent = `${w.progress.toFixed(2)}${w.stop ? ` ${w.stop}` : ''}`;
      root.appendChild(label);
    }

    layer.appendChild(root);
    layer.appendChild(
      el('p', { className: 'path-debug__readout' },
        collisions === 0 ? '0 collisions across 601 samples' : `${collisions} COLLIDING samples of 601`)
    );
  }

  /** @param {KeyboardEvent} e */
  function onKey(e) {
    if (e.key !== 'D' || !e.shiftKey) return;
    visible = !visible;
    layer.hidden = !visible;
    draw();
  }

  window.addEventListener('keydown', onKey);
  window.addEventListener('resize', draw);
  // Text boxes only settle once fonts have loaded and the view has rendered.
  document.fonts?.ready.then(() => draw());
  draw();

  return {
    redraw: draw,
    destroy() {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', draw);
      layer.remove();
    },
  };
}
