/** KaTeX empaquetado localmente: la OVA funciona sin conexión y dentro de un paquete SCORM. */
import katex from 'katex';
import renderMathInElement from 'katex/contrib/auto-render';
import 'katex/dist/katex.min.css';

const DELIMITERS = [
  { left: '$$', right: '$$', display: true },
  { left: '$', right: '$', display: false },
];

/** Renderiza todas las fórmulas $…$ y $$…$$ dentro de un elemento. */
export function renderMath(el: Element): void {
  renderMathInElement(el as HTMLElement, { delimiters: DELIMITERS, throwOnError: false });
}

/** HTML de una fórmula suelta. */
export const tex = (src: string, displayMode = false): string => katex.renderToString(src, { displayMode, throwOnError: false });
