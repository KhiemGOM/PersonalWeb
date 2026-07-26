/**
 * Minimal DOM construction helpers.
 *
 * No framework here, so this is the shared vocabulary for building elements. It stays
 * deliberately small: create, set properties, append children. Anything more elaborate
 * belongs in a component, not in here.
 */

/**
 * Create an element.
 *
 * Props are assigned as DOM properties where possible (`className`, `textContent`,
 * `onclick`) and fall back to attributes for anything hyphenated or namespaced
 * (`data-*`, `aria-*`). `style` accepts an object. Children may be nodes, strings,
 * or nested arrays; null and false are skipped so `cond && el(...)` works inline.
 *
 * @template {keyof HTMLElementTagNameMap} K
 * @param {K} tag
 * @param {Record<string, any> | null} [props]
 * @param {...(Node | string | number | null | undefined | false | Array<Node|string|null|undefined|false>)} children
 * @returns {HTMLElementTagNameMap[K]}
 */
export function el(tag, props, ...children) {
  const node = document.createElement(tag);

  for (const [key, value] of Object.entries(props ?? {})) {
    if (value == null || value === false) continue;

    if (key === 'style' && typeof value === 'object') {
      setStyle(node, value);
    } else if (key === 'dataset' && typeof value === 'object') {
      Object.assign(node.dataset, value);
    } else if (key.includes('-')) {
      node.setAttribute(key, String(value));
    } else if (key in node) {
      // @ts-expect-error — indexed property assignment on a known-good key
      node[key] = value;
    } else {
      node.setAttribute(key, String(value));
    }
  }

  append(node, children);
  return node;
}

/**
 * Apply a style object.
 *
 * Custom properties must go through setProperty. Plain assignment (`style['--x'] = ...`,
 * which is what Object.assign does) attaches an ordinary JS property to the
 * CSSStyleDeclaration and never reaches CSS — silently, with no error. Since scene object
 * placement is driven entirely by `--x` / `--y` / `--scale`, that failure mode collapses
 * every object to zero size.
 *
 * @param {HTMLElement} node
 * @param {Record<string, string | number>} styles
 */
export function setStyle(node, styles) {
  for (const [property, value] of Object.entries(styles)) {
    if (value == null) continue;

    if (property.startsWith('--')) {
      node.style.setProperty(property, String(value));
    } else {
      // @ts-expect-error — camelCase style keys are valid indexed access
      node.style[property] = value;
    }
  }
}

/**
 * Append children, flattening arrays and skipping empty values.
 * @param {Node} parent
 * @param {any[]} children
 */
export function append(parent, children) {
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false || child === '') continue;
    parent.appendChild(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

/**
 * @param {string} selector
 * @param {ParentNode} [scope]
 * @returns {HTMLElement}
 */
export function must(selector, scope = document) {
  const node = scope.querySelector(selector);
  if (!node) throw new Error(`expected element not found: ${selector}`);
  return /** @type {HTMLElement} */ (node);
}
