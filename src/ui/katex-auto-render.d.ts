declare module 'katex/contrib/auto-render' {
  interface Options {
    delimiters?: { left: string; right: string; display: boolean }[];
    throwOnError?: boolean;
  }
  export default function renderMathInElement(el: HTMLElement, options?: Options): void;
}
