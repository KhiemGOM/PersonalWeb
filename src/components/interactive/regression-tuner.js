/**
 * Hand-tune a linear regression against a scatter of points. Mount target for `ioai-voai`.
 */

import { el } from '../../lib/dom.js';
import { POINTS, leastSquares, sumSquaredError } from './regression-logic.js';
import './regression-tuner.css';

const WIDTH = 320;
const HEIGHT = 220;
const PAD = 24;

const X_MIN = 0;
const X_MAX = 10;
const Y_MIN = -5;
const Y_MAX = 35;

function toPx(x) {
  return PAD + ((x - X_MIN) / (X_MAX - X_MIN)) * (WIDTH - PAD * 2);
}

function toPy(y) {
  const clamped = Math.max(Y_MIN, Math.min(Y_MAX, y));
  return HEIGHT - PAD - ((clamped - Y_MIN) / (Y_MAX - Y_MIN)) * (HEIGHT - PAD * 2);
}

const SVG_NS = 'http://www.w3.org/2000/svg';

function svgEl(tag, attrs) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs ?? {})) node.setAttribute(key, String(value));
  return node;
}

/** @param {HTMLElement} container */
export function mount(container) {
  const par = sumSquaredError(POINTS, ...Object.values(leastSquares(POINTS)));

  let slope = 0;
  let intercept = 10;

  const svg = svgEl('svg', { viewBox: `0 0 ${WIDTH} ${HEIGHT}`, class: 'rtuner__svg' });
  const fitLine = svgEl('line', { class: 'rtuner__fit' });
  svg.appendChild(fitLine);
  for (const p of POINTS) {
    svg.appendChild(svgEl('circle', { class: 'rtuner__point', cx: toPx(p.x), cy: toPy(p.y), r: 4 }));
  }

  const hud = el('p', { className: 'rtuner__hud' });
  const message = el('p', { className: 'rtuner__message' });

  const slopeInput = el('input', {
    type: 'range',
    min: -1,
    max: 4,
    step: 0.05,
    value: slope,
    'aria-label': 'Slope',
    oninput: (e) => {
      slope = Number(e.target.value);
      render();
    },
  });
  const interceptInput = el('input', {
    type: 'range',
    min: -5,
    max: 20,
    step: 0.5,
    value: intercept,
    'aria-label': 'Intercept',
    oninput: (e) => {
      intercept = Number(e.target.value);
      render();
    },
  });

  const revealButton = el(
    'button',
    {
      type: 'button',
      className: 'rtuner__button',
      onclick: () => {
        const best = leastSquares(POINTS);
        slope = best.slope;
        intercept = best.intercept;
        slopeInput.value = String(slope);
        interceptInput.value = String(intercept);
        render();
      },
    },
    'Reveal best fit'
  );

  function render() {
    fitLine.setAttribute('x1', String(toPx(X_MIN)));
    fitLine.setAttribute('y1', String(toPy(slope * X_MIN + intercept)));
    fitLine.setAttribute('x2', String(toPx(X_MAX)));
    fitLine.setAttribute('y2', String(toPy(slope * X_MAX + intercept)));

    const error = sumSquaredError(POINTS, slope, intercept);
    hud.textContent = `Error: ${error.toFixed(1)} · Par: ${par.toFixed(1)}`;
    message.textContent =
      error <= par * 1.1 ? 'Within noise of the best possible fit.' : '';
  }

  render();

  container.append(
    svg,
    hud,
    el(
      'label',
      { className: 'rtuner__control' },
      el('span', null, 'Slope'),
      slopeInput
    ),
    el(
      'label',
      { className: 'rtuner__control' },
      el('span', null, 'Intercept'),
      interceptInput
    ),
    message,
    revealButton
  );

  return {
    destroy() {
      container.replaceChildren();
    },
  };
}
