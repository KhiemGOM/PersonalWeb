/**
 * Happy-Wheels-style wacky throw: launch a game object at the scoring zone. Mount target
 * for `ftc`. Aiming only shows the initial velocity vector, not the full precomputed arc,
 * and the zone relocates after every attempt so no angle/power combo stays solved.
 */

import { el } from '../../lib/dom.js';
import {
  computeTrajectory,
  computeAimVector,
  isScore,
  randomZone,
  LAUNCH,
  STAGE,
} from './ftc-throw-logic.js';
import './ftc-throw.css';

const SVG_NS = 'http://www.w3.org/2000/svg';

function svgEl(tag, attrs) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs ?? {})) node.setAttribute(key, String(value));
  return node;
}

function prefersInstant() {
  return (
    document.documentElement.dataset.mode === 'hurry' ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** @param {HTMLElement} container */
export function mount(container) {
  let angle = 45;
  let power = 70;
  let attempts = 0;
  let scored = false;
  let rafId = null;
  let zone = randomZone();

  const svg = svgEl('svg', { viewBox: `0 0 ${STAGE.width} ${STAGE.height}`, class: 'fthrow__svg' });
  svg.appendChild(svgEl('line', {
    x1: 0, y1: LAUNCH.y, x2: STAGE.width, y2: LAUNCH.y, class: 'fthrow__ground',
  }));
  const zoneRect = svgEl('rect', { y: LAUNCH.y - 6, height: 12, class: 'fthrow__zone' });
  svg.appendChild(zoneRect);
  svg.appendChild(svgEl('circle', { cx: LAUNCH.x, cy: LAUNCH.y, r: 5, class: 'fthrow__launcher' }));

  const aimLine = svgEl('line', { class: 'fthrow__aim' });
  const aimTip = svgEl('circle', { r: 3.5, class: 'fthrow__aim-tip' });
  const flightPath = svgEl('polyline', { class: 'fthrow__flight' });
  const projectile = svgEl('circle', { r: 5, class: 'fthrow__projectile' });
  svg.append(aimLine, aimTip, flightPath, projectile);
  projectile.style.display = 'none';

  const hud = el('p', { className: 'fthrow__hud' });
  const message = el('p', { className: 'fthrow__message' });

  const angleInput = el('input', {
    type: 'range',
    min: 10,
    max: 80,
    step: 1,
    value: angle,
    'aria-label': 'Launch angle',
    oninput: (e) => {
      angle = Number(e.target.value);
      renderAim();
    },
  });
  const powerInput = el('input', {
    type: 'range',
    min: 20,
    max: 100,
    step: 1,
    value: power,
    'aria-label': 'Launch power',
    oninput: (e) => {
      power = Number(e.target.value);
      renderAim();
    },
  });

  const launchButton = el(
    'button',
    { type: 'button', className: 'fthrow__button', onclick: () => launch() },
    'Launch'
  );

  function pointsToAttr(points) {
    return points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  }

  function renderAim() {
    const tip = computeAimVector(angle, power);
    aimLine.setAttribute('x1', String(LAUNCH.x));
    aimLine.setAttribute('y1', String(LAUNCH.y));
    aimLine.setAttribute('x2', String(tip.x));
    aimLine.setAttribute('y2', String(tip.y));
    aimTip.setAttribute('cx', String(tip.x));
    aimTip.setAttribute('cy', String(tip.y));
  }

  function renderZone() {
    zoneRect.setAttribute('x', String(zone.min));
    zoneRect.setAttribute('width', String(zone.max - zone.min));
  }

  function renderHud() {
    hud.textContent = `Attempts: ${attempts}${scored ? ' · Scored!' : ''}`;
  }

  function land(landingX) {
    const hit = isScore(landingX, zone);
    scored = scored || hit;
    if (hit) {
      message.textContent = 'Scored!';
    } else if (landingX < zone.min) {
      message.textContent = `Short by ${Math.round(zone.min - landingX)}px.`;
    } else {
      message.textContent = `Long by ${Math.round(landingX - zone.max)}px.`;
    }
    renderHud();

    // The target moves for the next attempt, so the last combo doesn't just keep scoring.
    zone = randomZone();
    renderZone();
  }

  function launch() {
    if (rafId != null) cancelAnimationFrame(rafId);
    attempts += 1;
    const { points, landingX } = computeTrajectory(angle, power);
    flightPath.setAttribute('points', pointsToAttr(points));
    renderHud();
    message.textContent = '';

    if (prefersInstant()) {
      projectile.style.display = 'none';
      land(landingX);
      return;
    }

    projectile.style.display = '';
    const duration = 650;
    const start = performance.now();

    function frame(now) {
      const progress = Math.min(1, (now - start) / duration);
      const index = Math.min(points.length - 1, Math.floor(progress * (points.length - 1)));
      const point = points[index];
      projectile.setAttribute('cx', String(point.x));
      projectile.setAttribute('cy', String(point.y));
      if (progress < 1) {
        rafId = requestAnimationFrame(frame);
      } else {
        rafId = null;
        land(landingX);
      }
    }
    rafId = requestAnimationFrame(frame);
  }

  renderAim();
  renderZone();
  renderHud();

  container.append(
    svg,
    hud,
    el('label', { className: 'fthrow__control' }, el('span', null, 'Angle'), angleInput),
    el('label', { className: 'fthrow__control' }, el('span', null, 'Power'), powerInput),
    message,
    launchButton
  );

  return {
    destroy() {
      if (rafId != null) cancelAnimationFrame(rafId);
      container.replaceChildren();
    },
  };
}
