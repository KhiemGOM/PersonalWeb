import { marked } from 'marked';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { el } from '../lib/dom.js';
import article from '../content/minecraft-pathfinding.md?raw';

const modes = ['NONE', 'AIR_POTENTIAL', 'MANHATTAN', 'NEAREST_AIR', 'HYBRID'];
const figures = {
  history: {
    type: 'bar',
    title: '01 / The candidates that never reach the search',
    note: 'Historical k2 measurements. MINE candidates per search; zero-based bars.',
    headers: ['Version', 'Candidates'],
    rows: [['Before Air Potential', '2,390,000'], ['Hard prune', '121,000']],
    series: [{ label: 'MINE candidates', values: [2390000, 121000] }],
  },
  corpus: {
    type: 'bar',
    title: '02 / Eight additional real-terrain regions',
    note: 'Largest walk-reachable connected component, in cells. The 12 bundled regions are additional.',
    headers: ['Region', 'Walkable cells'],
    rows: [
      ['1uIGhtjEX_r_neg1_0', '11,030'], ['1uIGhtjEX_r_0_0', '43,403'],
      ['a6A6Hpahj_r_neg1_0', '16,520'], ['a6A6Hpahj_r_0_0', '18,124'],
      ['BX7TX6pyc_r_0_0', '24,269'], ['BX7TX6pyc_r_neg1_0', '10,381'],
      ['dTP0SNSDT_r_0_neg1', '16,816'], ['CZIDc4D02_r_0_0', '10,866'],
    ],
    series: [{ label: 'Walkable cells', values: [11030, 43403, 16520, 18124, 24269, 10381, 16816, 10866] }],
  },
  // Two measures per mode that only mean something together (a mode that "wins" is
  // trading one against the other) -- a bar chart per measure hides exactly the
  // tradeoff this figure exists to show. AIR_POTENTIAL and HYBRID land almost on top
  // of each other here, which is the finding from the hybrid section rendered as
  // geometry instead of restated as prose.
  aggregate: {
    type: 'scatter',
    title: '03 / Less search, sometimes a more expensive path',
    note: 'Reported averages over 40 region/epsilon pairs, relative to NONE. Cost and expansion failures are reported as region counts.',
    headers: ['Mode', 'Expansions vs NONE', 'Cost vs NONE', 'Worse cost: regions', 'Worse expansions: regions'],
    rows: [
      ['AIR_POTENTIAL', '−5.32%', '+0.072%', '4', '1'],
      ['NEAREST_AIR', '−3.09%', '0.000%', '0', '0'],
      ['MANHATTAN', '−0.46%', '+0.592%', '7', '5'],
      ['HYBRID', '−5.20%', '+0.072%', '4', '1'],
    ],
    xAxis: { label: 'Expansion reduction (%)', domain: [0, 6], ticks: [0, 2, 4, 6], tickSuffix: '%' },
    yAxis: { label: 'Cost increase (%)', domain: [0, 0.65], ticks: [0, 0.3, 0.6], tickSuffix: '%' },
    points: [
      { label: 'AIR_POTENTIAL', x: 5.32, y: 0.072, dx: -6, dy: -12, anchor: 'end' },
      { label: 'NEAREST_AIR', x: 3.09, y: 0.000, dx: 0, dy: -12, anchor: 'middle' },
      { label: 'MANHATTAN', x: 0.46, y: 0.592, dx: 10, dy: -6, anchor: 'start' },
      { label: 'HYBRID', x: 5.20, y: 0.072, dx: -6, dy: 18, anchor: 'end' },
    ],
  },
  timing: {
    type: 'bar',
    title: '04 / An expansion is not a fixed amount of work',
    note: 'Microseconds per expansion. Lower is better. Recorded timing subset: 21 measurements with ≥50K expansions; see the sample-count caveat above.',
    headers: ['Mode', 'Mean µs/expansion'],
    rows: modes.map((m, i) => [m, ['3.933', '3.731', '3.734', '4.636', '4.219'][i]]),
    series: [{ label: 'µs per expansion', values: [3.933, 3.731, 3.734, 4.636, 4.219], digits: 3 }],
  },
  // Same shape of problem as the aggregate figure, at one scenario: cost and
  // expansions only matter as a pair, and this is the one place Air Potential loses
  // on both at once. A joint plot shows that as "worst quadrant", not two bars a
  // reader has to mentally recombine.
  interior: {
    type: 'scatter',
    title: '05 / Deep interior: a stress case, not the headline use case',
    note: 'Epsilon 1.0. Start (22,78,329) → goal (57,41,140). Missing timings remain qualitative; no values have been invented.',
    headers: ['Mode', 'Cost (simulated)', 'Expansions', 'Elapsed time'],
    rows: [
      ['NONE', '74.24', '15.63M', '~77–82s'],
      ['AIR_POTENTIAL', '75.07 (+1.1%)', '16.63M (+6.4%)', 'Slower than NONE'],
      ['MANHATTAN', '74.77 (+0.7%)', '15.97M (+2.2%)', 'Not reported'],
      ['NEAREST_AIR', '74.24 (tied)', '15.48M', 'Slowest'],
      ['HYBRID', '75.07', '16.64M', 'Between Air Potential and Nearest Air'],
    ],
    xAxis: { label: 'Path cost (simulated)', domain: [74, 75.2], ticks: [74, 74.6, 75.2] },
    yAxis: { label: 'Expansions (millions)', domain: [15.2, 17.0], ticks: [15.2, 16.1, 17.0] },
    points: [
      { label: 'NONE', x: 74.24, y: 15.63, dx: -8, dy: -8, anchor: 'end', muted: true },
      { label: 'AIR_POTENTIAL', x: 75.07, y: 16.63, dx: -6, dy: -12, anchor: 'end' },
      { label: 'MANHATTAN', x: 74.77, y: 15.97, dx: 10, dy: 4, anchor: 'start' },
      { label: 'NEAREST_AIR', x: 74.24, y: 15.48, dx: -8, dy: 18, anchor: 'end' },
      { label: 'HYBRID', x: 75.07, y: 16.64, dx: 10, dy: 14, anchor: 'start' },
    ],
  },
  // Cost is identical across every mode here (57.67, stated in prose and in the
  // table) -- charting it would be five bars of equal length. What actually varies
  // is speed, so the chart plots the two measures that vary against each other.
  perimeter: {
    type: 'scatter',
    title: '06 / Perimeter approach: every mode ties on cost',
    note: 'Epsilon 1.0. Start (22,78,329) → goal (55,43,153). All costs are simulated seconds; elapsed time measures the search. Cost is not charted, it is identical across every mode.',
    headers: ['Mode', 'Cost (simulated)', 'Expansions', 'Elapsed time'],
    rows: [
      ['NONE', '57.67', '1.655M', '6,116 ms'],
      ['AIR_POTENTIAL', '57.67', '1.625M (−1.8%)', '5,849 ms'],
      ['MANHATTAN', '57.67', '1.607M (−2.9%)', '5,479 ms'],
      ['NEAREST_AIR', '57.67', '1.646M (−0.5%)', '7,213 ms'],
      ['HYBRID', '57.67', '1.625M', '6,354 ms'],
    ],
    xAxis: { label: 'Elapsed search time (ms)', domain: [5300, 7400], ticks: [5300, 6350, 7400] },
    yAxis: { label: 'Expansions (millions)', domain: [1.595, 1.665], ticks: [1.595, 1.63, 1.665] },
    points: [
      { label: 'NONE', x: 6116, y: 1.655, dx: 0, dy: -12, anchor: 'middle', muted: true },
      { label: 'AIR_POTENTIAL', x: 5849, y: 1.625, dx: -8, dy: 16, anchor: 'end' },
      { label: 'MANHATTAN', x: 5479, y: 1.607, dx: 0, dy: 18, anchor: 'middle' },
      { label: 'NEAREST_AIR', x: 7213, y: 1.646, dx: 0, dy: -12, anchor: 'middle' },
      { label: 'HYBRID', x: 6354, y: 1.625, dx: 10, dy: -8, anchor: 'start' },
    ],
  },
  // Not a comparison across categories at all -- the point is where three values sit
  // relative to one cutoff. A number line with the threshold marked is the honest
  // shape of that question; a bar chart of "0.30 vs 0.35 vs 0.844" answers a
  // question ("which is biggest") nobody asked.
  density: {
    type: 'threshold',
    title: '07 / A thin wall falls below the switch',
    note: 'Stone fraction is averaged over a 4 × 4 × 4 chunk. The thin-wall range is an illustrative estimate, not a measurement.',
    headers: ['Sample', 'Stone fraction', 'Filter selected'],
    rows: [['Thin wall (illustrative)', '0.20–0.30', 'Air Potential'], ['Switch threshold', '0.35', 'Nearest Air at or above'], ['Interior goal (measured)', '0.844', 'Nearest Air']],
    domain: [0, 1],
    threshold: { value: 0.35, label: '0.35 switch threshold' },
    items: [
      { label: 'Thin wall (illustrative)', range: [0.20, 0.30] },
      { label: 'Interior goal (measured)', value: 0.844 },
    ],
  },
};

// Only repository-owned Markdown is accepted here. Raw HTML is disabled; math
// placeholders are inserted after Markdown parsing, outside fenced source blocks.
function markdown(source) {
  const math = [];
  const prepared = source.split(/(```[\s\S]*?```)/g).map((part) => {
    if (part.startsWith('```')) return part;
    return part.replace(/\$\$([\s\S]*?)\$\$|\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)/g, (_, a, b, c) => {
      const id = math.length;
      math.push(katex.renderToString(a ?? b ?? c, { displayMode: c === undefined, throwOnError: false, trust: false }));
      return `MATHPLACEHOLDER${id}END`;
    });
  }).join('');
  const renderer = new marked.Renderer();
  renderer.html = () => '';
  const node = el('div', { className: 'research__prose' });
  node.innerHTML = marked.parse(prepared, { renderer, async: false }).replace(/MATHPLACEHOLDER(\d+)END/g, (_, i) => math[i]);
  node.querySelectorAll('a').forEach((a) => {
    if (!/^(https?:|#|\/)/i.test(a.getAttribute('href') ?? '')) a.removeAttribute('href');
    else if (a.href.startsWith('http')) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
  });
  node.querySelectorAll('table').forEach((table) => {
    const wrap = el('div', { className: 'research__table-scroll', tabIndex: 0, role: 'region', 'aria-label': 'Scrollable data table' });
    table.replaceWith(wrap); wrap.append(table);
    table.querySelectorAll('thead th').forEach((th) => th.setAttribute('scope', 'col'));
  });
  return node;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

function svgEl(tag, attrs) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs ?? {})) node.setAttribute(key, String(value));
  return node;
}

function fmtNum(value, digits, suffix) {
  return value.toLocaleString('en-US', { minimumFractionDigits: digits ?? 0, maximumFractionDigits: digits ?? 0 }) + (suffix ?? '');
}

/** Every category-comparison figure still charts as bars -- that form is correct
 *  for them, it was never the problem. */
function barChart(data) {
  return el('div', { className: 'research__charts' }, data.series.map((series) => {
    const max = series.max ?? Math.max(...series.values);
    return el('div', { className: 'research__chart' },
      el('p', { className: 'research__chart-label' }, series.label),
      series.values.map((value, i) => el('div', { className: 'research__bar-row' },
        el('span', { className: 'research__bar-label' }, data.rows[i][0].replaceAll('_', ' ')),
        el('span', { className: 'research__bar-track', 'aria-hidden': 'true' },
          el('span', { className: `research__bar${series.adverse ? ' research__bar--adverse' : ''}`, style: { width: `${value / max * 100}%` } })),
        el('span', { className: 'research__bar-value' }, fmtNum(value, series.digits, series.suffix)))),
      el('p', { className: 'research__axis' }, `0 → ${max.toLocaleString('en-US')} ${series.suffix ?? ''} · linear scale`));
  }));
}

const SCATTER = { width: 360, height: 220, padLeft: 48, padRight: 20, padTop: 20, padBottom: 34 };

/** Two measures per item, plotted against each other instead of as separate bars --
 *  for a figure whose whole point is a tradeoff (this axis costs that axis), a
 *  reader should not have to mentally recombine two charts to see it. */
function scatterChart(data) {
  const { width: W, height: H, padLeft, padRight, padTop, padBottom } = SCATTER;
  const toX = (x) => padLeft + ((x - data.xAxis.domain[0]) / (data.xAxis.domain[1] - data.xAxis.domain[0])) * (W - padLeft - padRight);
  const toY = (y) => (H - padBottom) - ((y - data.yAxis.domain[0]) / (data.yAxis.domain[1] - data.yAxis.domain[0])) * (H - padTop - padBottom);

  const svg = svgEl('svg', {
    viewBox: `0 0 ${W} ${H}`, class: 'research__scatter',
    role: 'img',
    'aria-label': `Scatter plot of ${data.yAxis.label} against ${data.xAxis.label}, one point per mode. Exact values are in the table below.`,
  });

  svg.append(
    svgEl('line', { x1: padLeft, y1: padTop, x2: padLeft, y2: H - padBottom, class: 'research__scatter-axis' }),
    svgEl('line', { x1: padLeft, y1: H - padBottom, x2: W - padRight, y2: H - padBottom, class: 'research__scatter-axis' })
  );

  for (const t of data.xAxis.ticks) {
    const x = toX(t);
    svg.append(
      svgEl('line', { x1: x, y1: H - padBottom, x2: x, y2: H - padBottom + 4, class: 'research__scatter-tick' }),
      svgEl('text', { x, y: H - padBottom + 15, class: 'research__scatter-tick-label', 'text-anchor': 'middle' })
    );
    svg.lastChild.textContent = t.toLocaleString('en-US') + (data.xAxis.tickSuffix ?? '');
  }
  for (const t of data.yAxis.ticks) {
    const y = toY(t);
    svg.append(
      svgEl('line', { x1: padLeft - 4, y1: y, x2: padLeft, y2: y, class: 'research__scatter-tick' }),
      svgEl('text', { x: padLeft - 8, y: y + 3, class: 'research__scatter-tick-label', 'text-anchor': 'end' })
    );
    svg.lastChild.textContent = t.toLocaleString('en-US') + (data.yAxis.tickSuffix ?? '');
  }

  for (const point of data.points) {
    const x = toX(point.x);
    const y = toY(point.y);
    const dot = svgEl('circle', {
      cx: x, cy: y, r: point.muted ? 5 : 6,
      class: `research__scatter-dot${point.muted ? ' research__scatter-dot--muted' : ''}`,
    });
    dot.append(svgEl('title', {}));
    dot.lastChild.textContent = `${point.label}: ${data.xAxis.label} ${point.x}, ${data.yAxis.label} ${point.y}`;
    const label = svgEl('text', {
      x: x + point.dx, y: y + point.dy, 'text-anchor': point.anchor,
      class: `research__scatter-label${point.muted ? ' research__scatter-label--muted' : ''}`,
    });
    label.textContent = point.label.replaceAll('_', ' ');
    svg.append(dot, label);
  }

  return el('div', { className: 'research__chart research__chart--scatter' },
    el('p', { className: 'research__chart-label' }, `${data.yAxis.label} vs ${data.xAxis.label}`),
    svg);
}

const THRESHOLD = { width: 360, height: 90, padLeft: 30, padRight: 30, lineY: 26 };

/** Not a comparison between items -- a position relative to one cutoff. A number
 *  line with the threshold marked answers that directly; a bar chart of three
 *  unrelated magnitudes does not. */
function thresholdChart(data) {
  const { width: W, height: H, padLeft, padRight, lineY } = THRESHOLD;
  const toX = (v) => padLeft + ((v - data.domain[0]) / (data.domain[1] - data.domain[0])) * (W - padLeft - padRight);

  const svg = svgEl('svg', {
    viewBox: `0 0 ${W} ${H}`, class: 'research__threshold',
    role: 'img',
    'aria-label': `Number line from ${data.domain[0]} to ${data.domain[1]} with a threshold at ${data.threshold.value}. Exact values are in the table below.`,
  });

  svg.append(svgEl('line', { x1: padLeft, y1: lineY, x2: W - padRight, y2: lineY, class: 'research__threshold-line' }));
  for (const t of [data.domain[0], (data.domain[0] + data.domain[1]) / 2, data.domain[1]]) {
    const x = toX(t);
    svg.append(
      svgEl('line', { x1: x, y1: lineY - 4, x2: x, y2: lineY + 4, class: 'research__scatter-tick' }),
      svgEl('text', { x, y: lineY + 18, class: 'research__scatter-tick-label', 'text-anchor': 'middle' })
    );
    svg.lastChild.textContent = t.toLocaleString('en-US');
  }

  const tx = toX(data.threshold.value);
  svg.append(svgEl('line', { x1: tx, y1: lineY - 16, x2: tx, y2: lineY + 16, class: 'research__threshold-marker' }));
  const thresholdLabel = svgEl('text', { x: tx, y: lineY - 20, class: 'research__scatter-label', 'text-anchor': 'middle' });
  thresholdLabel.textContent = data.threshold.label;
  svg.append(thresholdLabel);

  data.items.forEach((item, i) => {
    const below = item.value !== undefined ? item.value < data.threshold.value : item.range[1] <= data.threshold.value;
    const cls = below ? 'research__threshold-item--below' : 'research__threshold-item--above';
    const labelY = lineY + (i % 2 === 0 ? 36 : 50);

    if (item.range) {
      const x0 = toX(item.range[0]);
      const x1 = toX(item.range[1]);
      svg.append(svgEl('line', { x1: x0, y1: lineY, x2: x1, y2: lineY, class: `research__threshold-range ${cls}` }));
      const label = svgEl('text', { x: (x0 + x1) / 2, y: labelY, class: 'research__scatter-label', 'text-anchor': 'middle' });
      label.textContent = `${item.label} (${item.range[0]}–${item.range[1]})`;
      svg.append(label);
    } else {
      const x = toX(item.value);
      svg.append(svgEl('circle', { cx: x, cy: lineY, r: 6, class: `research__threshold-dot ${cls}` }));
      const label = svgEl('text', { x, y: labelY, class: 'research__scatter-label', 'text-anchor': 'middle' });
      label.textContent = `${item.label} (${item.value})`;
      svg.append(label);
    }
  });

  return el('div', { className: 'research__chart research__chart--threshold' },
    el('p', { className: 'research__chart-label' }, `Stone fraction, 0 to 1, against the ${data.threshold.value} switch threshold`),
    svg);
}

function figure(data) {
  const chart = data.type === 'scatter' ? scatterChart(data)
    : data.type === 'threshold' ? thresholdChart(data)
    : barChart(data);
  return el('figure', { className: 'research__figure' },
    el('figcaption', null, el('h3', null, data.title), el('p', null, data.note)),
    data.type === 'bar' ? chart : el('div', { className: 'research__charts' }, chart),
    el('div', { className: 'research__table-scroll', tabIndex: 0, role: 'region', 'aria-label': data.title + ' exact values' },
      el('table', null,
        el('caption', { className: 'research__table-caption' }, 'Exact reported values'),
        el('thead', null, el('tr', null, data.headers.map((h) => el('th', { scope: 'col' }, h)))),
        el('tbody', null, data.rows.map((row) => el('tr', null, row.map((v, i) => el(i ? 'td' : 'th', i ? null : { scope: 'row' }, v))))))));
}

function demo() {
  const frame = el('iframe', {
    src: '/demos/bastion-pathfinder-demo.html',
    title: 'Bastion pathfinder: animated mining and bridging lab with real Nether routes',
    loading: 'lazy', allow: 'fullscreen; pointer-lock', allowFullscreen: true,
    sandbox: 'allow-scripts allow-same-origin allow-pointer-lock',
    className: 'research__demo',
  });
  return el('figure', { className: 'research__demo-wrap', id: 'pathfinder-lab' }, frame,
    el('figcaption', null, 'Six synthetic labs · three real Nether regions',
      el('a', { href: '/demos/bastion-pathfinder-demo.html', target: '_blank', rel: 'noopener', 'data-native': '' }, 'Open full viewer ↗')));
}

export function renderResearchPost() {
  const body = el('div', { className: 'blog__body research' });
  for (const part of article.split(/<!-- (\w+) -->/g)) {
    body.append(part === 'demo' ? demo() : figures[part] ? figure(figures[part]) : markdown(part));
  }
  const nav = el('nav', { className: 'research__toc', 'aria-label': 'In this article' }, el('p', { className: 'label' }, 'In this article'));
  body.querySelectorAll(':scope > .research__prose > h2').forEach((heading, index) => {
    heading.id = `section-${index + 1}`;
    const link = el('a', { href: `#${heading.id}`, 'data-native': '' }, heading.textContent);
    nav.append(link);
  });
  body.prepend(nav);
  return body;
}
