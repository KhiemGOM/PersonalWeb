/**
 * Shuffle a point-cloud cleaning pipeline: toggle stages, reorder them, watch accuracy and
 * speed respond. Mount target for `robocup-at-home`.
 */

import { el } from '../../lib/dom.js';
import { STAGES, BASE_ACCURACY, TARGET_ACCURACY, SPEED_BUDGET, computePipeline } from './robocup-cleanup-logic.js';
import './robocup-cleanup.css';

const SVG_NS = 'http://www.w3.org/2000/svg';

function svgEl(tag, attrs) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs ?? {})) node.setAttribute(key, String(value));
  return node;
}

/** Deterministic pseudo-random point-cloud layout, seeded by index so it never flickers. */
const CLOUD_SIZE = 70;
const CLOUD_POINTS = Array.from({ length: CLOUD_SIZE }, (_, i) => {
  const seed = Math.sin(i * 12.9898) * 43758.5453;
  const frac = seed - Math.floor(seed);
  return {
    x: 10 + ((i * 37) % 300),
    y: 10 + ((i * 53 + Math.floor(frac * 97)) % 180),
    noise: i % 3 === 0,
  };
});

/** @param {HTMLElement} container */
export function mount(container) {
  /** @type {{id: string, enabled: boolean}[]} Visitor's working order, all stages present. */
  let order = STAGES.map((stage) => ({ id: stage.id, enabled: false }));

  const hud = el('p', { className: 'rcup__hud' });
  const message = el('p', { className: 'rcup__message' });
  const stageList = el('ul', { className: 'rcup__stages' });
  const svg = svgEl('svg', { viewBox: '0 0 320 200', class: 'rcup__svg' });
  const dots = CLOUD_POINTS.map((p) => {
    const dot = svgEl('circle', { cx: p.x, cy: p.y, r: 3, class: 'rcup__point' });
    svg.appendChild(dot);
    return dot;
  });

  function move(index, dir) {
    const target = index + dir;
    if (target < 0 || target >= order.length) return;
    [order[index], order[target]] = [order[target], order[index]];
    render();
  }

  function toggle(index) {
    order[index] = { ...order[index], enabled: !order[index].enabled };
    render();
  }

  function render() {
    const enabledOrder = order.filter((s) => s.enabled).map((s) => s.id);
    const { accuracy, speed } = computePipeline(enabledOrder);
    const passed = accuracy >= TARGET_ACCURACY && speed <= SPEED_BUDGET;

    hud.textContent = `Accuracy: ${accuracy.toFixed(1)}% · Speed: ${speed.toFixed(1)}ms`;
    message.textContent = passed
      ? `Ships it. Target was ${TARGET_ACCURACY}% under ${SPEED_BUDGET}ms.`
      : '';

    const cleanFraction = Math.max(0, Math.min(1, (accuracy - BASE_ACCURACY) / (100 - BASE_ACCURACY)));
    const noiseCount = CLOUD_POINTS.filter((p) => p.noise).length;
    let cleaned = 0;
    const target = Math.round(noiseCount * cleanFraction);
    CLOUD_POINTS.forEach((p, i) => {
      const isClean = p.noise && cleaned < target;
      if (isClean) cleaned += 1;
      dots[i].setAttribute('class', p.noise && !isClean ? 'rcup__point rcup__point--noise' : 'rcup__point');
    });

    stageList.replaceChildren(
      ...order.map((entry, index) => {
        const stage = STAGES.find((s) => s.id === entry.id);
        return el(
          'li',
          { className: 'rcup__stage', dataset: { enabled: String(entry.enabled) } },
          el(
            'label',
            { className: 'rcup__stage-label' },
            el('input', {
              type: 'checkbox',
              checked: entry.enabled,
              onchange: () => toggle(index),
            }),
            el('span', null, stage.label)
          ),
          el(
            'div',
            { className: 'rcup__stage-move' },
            el(
              'button',
              { type: 'button', disabled: index === 0, onclick: () => move(index, -1), 'aria-label': 'Move earlier' },
              '↑'
            ),
            el(
              'button',
              { type: 'button', disabled: index === order.length - 1, onclick: () => move(index, 1), 'aria-label': 'Move later' },
              '↓'
            )
          )
        );
      })
    );
  }

  render();

  container.append(svg, hud, stageList, message);

  return {
    destroy() {
      container.replaceChildren();
    },
  };
}
