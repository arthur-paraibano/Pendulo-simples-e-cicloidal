interface OpcoesKatex {
  readonly displayMode?: boolean
  readonly output?: 'html' | 'mathml' | 'htmlAndMathml'
  readonly throwOnError?: boolean
  readonly trust?: boolean | ((contexto: { readonly command?: string }) => boolean)
  readonly strict?: boolean | 'ignore' | 'warn' | 'error'
}

interface KatexGlobal {
  readonly version: string
  render(expressao: string, elemento: HTMLElement, opcoes?: OpcoesKatex): void
  renderToString(expressao: string, opcoes?: OpcoesKatex): string
}

declare const katex: KatexGlobal

/**
 * O alias `katex` do Vite aponta para o bundle UMD vendorizado. A declaração
 * abaixo dá tipo ao import e mantém a mesma forma do objeto global.
 */
declare module 'katex' {
  const katex: KatexGlobal
  export default katex
}
