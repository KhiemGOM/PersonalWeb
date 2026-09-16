import { marked } from 'marked';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { el } from '../lib/dom.js';
import article from '../content/minecraft-pathfinding.md?raw';

const modes = ['NONE', 'AIR_POTENTIAL', 'MANHATTAN', 'NEAREST_AIR', 'HYBRID'];
const figures = {
  history: {
    title: '01 / The candidates that never reach the search',
    note: 'Historical k2 measurements. MINE candidates per search; zero-based bars.',
    headers: ['Version', 'Candidates'],
    rows: [['Before Air Potential', '2,390,000'], ['Hard prune', '121,000']],
    series: [{ label: 'MINE candidates', values: [2390000, 121000] }],
  },
  corpus: {
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
  aggregate: {
    title: '03 / Less search, sometimes a more expensive path',
    note: 'Reported averages over 40 region/epsilon pairs, relative to NONE. Cost and expansion failures are reported as region counts.',
    headers: ['Mode', 'Expansions vs NONE', 'Cost vs NONE', 'Worse cost: regions', 'Worse expansions: regions'],
    rows: [
      ['AIR_POTENTIAL', '−5.32%', '+0.072%', '4', '1'],
      ['NEAREST_AIR', '−3.09%', '0.000%', '0', '0'],
      ['MANHATTAN', '−0.46%', '+0.592%', '7', '5'],
      ['HYBRID', '−5.20%', '+0.072%', '4', '1'],
    ],
    series: [
      { label: 'Expansion reduction (%) · more is better', values: [5.32, 3.09, 0.46, 5.20], digits: 2, suffix: '%' },
      { label: 'Cost increase (%) · less is better', values: [0.072, 0, 0.592, 0.072], digits: 3, suffix: '%', adverse: true },
    ],
  },
  timing: {
    title: '04 / An expansion is not a fixed amount of work',
    note: 'Microseconds per expansion. Lower is better. Recorded timing subset: 21 measurements with ≥50K expansions; see the sample-count caveat above.',
    headers: ['Mode', 'Mean µs/expansion'],
    rows: modes.map((m, i) => [m, ['3.933', '3.731', '3.734', '4.636', '4.219'][i]]),
    series: [{ label: 'µs per expansion', values: [3.933, 3.731, 3.734, 4.636, 4.219], digits: 3 }],
  },
  interior: {
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
    series: [
      { label: 'Path cost (simulated)', values: [74.24, 75.07, 74.77, 74.24, 75.07], digits: 2 },
      { label: 'Expansions (millions)', values: [15.63, 16.63, 15.97, 15.48, 16.64], digits: 2, suffix: 'M' },
    ],
  },
  perimeter: {
    title: '06 / Perimeter approach: every mode ties on cost',
    note: 'Epsilon 1.0. Start (22,78,329) → goal (55,43,153). All costs are simulated seconds; elapsed time measures the search.',
    headers: ['Mode', 'Cost (simulated)', 'Expansions', 'Elapsed time'],
    rows: [
      ['NONE', '57.67', '1.655M', '6,116 ms'],
      ['AIR_POTENTIAL', '57.67', '1.625M (−1.8%)', '5,849 ms'],
      ['MANHATTAN', '57.67', '1.607M (−2.9%)', '5,479 ms'],
      ['NEAREST_AIR', '57.67', '1.646M (−0.5%)', '7,213 ms'],
      ['HYBRID', '57.67', '1.625M', '6,354 ms'],
    ],
    series: [
      { label: 'Elapsed search time (ms)', values: [6116, 5849, 5479, 7213, 6354], suffix: ' ms' },
      { label: 'Expansions (millions)', values: [1.655, 1.625, 1.607, 1.646, 1.625], digits: 3, suffix: 'M' },
    ],
  },
  density: {
    title: '07 / A thin wall falls below the switch',
    note: 'Stone fraction is averaged over a 4 × 4 × 4 chunk. The thin-wall range is an illustrative estimate, not a measurement.',
    headers: ['Sample', 'Stone fraction', 'Filter selected'],
    rows: [['Thin wall (illustrative)', '0.20–0.30', 'Air Potential'], ['Switch threshold', '0.35', 'Nearest Air at or above'], ['Interior goal (measured)', '0.844', 'Nearest Air']],
    series: [{ label: 'Stone fraction · upper end shown for thin-wall range', values: [0.30, 0.35, 0.844], digits: 3, max: 1 }],
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

function figure(data) {
  return el('figure', { className: 'research__figure' },
    el('figcaption', null, el('h3', null, data.title), el('p', null, data.note)),
    el('div', { className: 'research__charts' }, data.series.map((series) => {
      const max = series.max ?? Math.max(...series.values);
      return el('div', { className: 'research__chart' },
        el('p', { className: 'research__chart-label' }, series.label),
        series.values.map((value, i) => el('div', { className: 'research__bar-row' },
          el('span', { className: 'research__bar-label' }, data.rows[i][0].replaceAll('_', ' ')),
          el('span', { className: 'research__bar-track', 'aria-hidden': 'true' },
            el('span', { className: `research__bar${series.adverse ? ' research__bar--adverse' : ''}`, style: { width: `${value / max * 100}%` } })),
          el('span', { className: 'research__bar-value' }, value.toLocaleString('en-US', { minimumFractionDigits: series.digits ?? 0, maximumFractionDigits: series.digits ?? 0 }) + (series.suffix ?? '')))),
        el('p', { className: 'research__axis' }, `0 → ${max.toLocaleString('en-US')} ${series.suffix ?? ''} · linear scale`));
    })),
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
