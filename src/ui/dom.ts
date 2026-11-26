/** Helpers mínimos de DOM: sin framework, con tipos. */
type AttrValue = string | number | boolean | null | undefined | EventListener;
type Attrs = Record<string, AttrValue>;
export type Child = Node | string | number | null | undefined | false;

/**
 * h('button', { class: 'btn', onclick: fn }, 'Texto')
 * Los atributos on* se registran como listeners; true/false controlan atributos booleanos.
 * El texto de los hijos se inserta como texto (escapado), nunca como HTML.
 */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v as EventListener);
    else if (k === 'html') el.innerHTML = String(v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  append(el, ...children);
  return el;
}

export function append(el: Element, ...children: Child[]): void {
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    el.append(typeof c === 'number' ? String(c) : c);
  }
}

/** Fragmento HTML de contenido propio de la OVA (nunca entrada del usuario). */
export function html(markup: string): DocumentFragment {
  const t = document.createElement('template');
  t.innerHTML = markup.trim();
  return t.content;
}

export function clear(el: Element): void {
  el.replaceChildren();
}

let uid = 0;
export const nextId = (prefix = 'id'): string => `${prefix}-${++uid}`;

/** Lee una variable CSS del tema actual (para dibujar en canvas/SVG). */
export const cssVar = (name: string): string => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export const SVG_NS = 'http://www.w3.org/2000/svg';
export function svg<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}, text?: string): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  if (text !== undefined) el.textContent = text;
  return el;
}

/** Campo con etiqueta asociada (accesibilidad: cada input tiene <label>). */
export function field(label: string, input: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, hint?: string): HTMLLabelElement {
  return h('label', { class: 'field' }, label, hint ? h('small', {}, hint) : null, input);
}

export function button(label: string, onclick: () => void, cls = 'btn', extra: Attrs = {}): HTMLButtonElement {
  return h('button', { type: 'button', class: cls, onclick: onclick as EventListener, ...extra }, label);
}

export function select(options: [value: string, label: string][], onchange?: (v: string) => void, attrs: Attrs = {}): HTMLSelectElement {
  const s = h('select', { class: 'select', ...attrs }, ...options.map(([v, l]) => h('option', { value: v }, l)));
  if (onchange) s.addEventListener('change', () => onchange(s.value));
  return s;
}

export function input(attrs: Attrs = {}): HTMLInputElement {
  return h('input', { class: 'input', type: 'text', autocomplete: 'off', spellcheck: 'false', ...attrs });
}
