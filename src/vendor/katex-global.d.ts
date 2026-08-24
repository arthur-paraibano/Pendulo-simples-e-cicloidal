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
