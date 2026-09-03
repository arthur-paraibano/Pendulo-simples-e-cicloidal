import type { Store } from '../state/store.js'

export interface GerenciadorA11y {
  readonly anunciador: { elemento: HTMLElement; anunciar(mensagem: string): void }
  destruir(): void
}

export function criarAnunciadorLiveRegion(recipiente: HTMLElement = document.body): {
  elemento: HTMLElement
  anunciar(mensagem: string): void
} {
  const elemento = document.createElement('div')
  elemento.id = 'a11y-live-region'
  elemento.className = 'sr-only'
  elemento.setAttribute('aria-live', 'polite')
  elemento.setAttribute('aria-atomic', 'true')
  elemento.setAttribute('role', 'status')
  recipiente.appendChild(elemento)

  return {
    elemento,
    anunciar(mensagem: string): void {
      elemento.textContent = ''
      // Força o navegador a reconhecer a alteração de conteúdo
      requestAnimationFrame(() => {
        elemento.textContent = mensagem
      })
    },
  }
}

export function criarSkipLinks(): HTMLElement {
  const nav = document.createElement('nav')
  nav.className = 'skip-links'
  nav.setAttribute('aria-label', 'Atalhos de navegação')

  const linkPrincipal = document.createElement('a')
  linkPrincipal.href = '#principal'
  linkPrincipal.className = 'skip-link'
  linkPrincipal.textContent = 'Pular para o conteúdo principal'

  const linkParametros = document.createElement('a')
  linkParametros.href = '#painel-parametros'
  linkParametros.className = 'skip-link'
  linkParametros.textContent = 'Pular para o painel de parâmetros'

  nav.append(linkPrincipal, linkParametros)
  return nav
}

/**
 * Foco roteirizado sobre a tabela (RF-116, Cenário 11.5).
 *
 * A tabela precisa de **um** ponto de entrada: sem uma célula com
 * `tabindex="0"`, nenhuma delas é alcançável por Tab e as setas nunca chegam a
 * ser acionadas. E precisa de exatamente um: cem linhas com `tabindex="0"`
 * transformariam a tabela numa armadilha de tabulação.
 *
 * A entrada é reposta a cada mudança do corpo da tabela, porque a coleta
 * redesenha as linhas e levaria embora a célula marcada.
 */
function garantirEntradaDeFoco(recipiente: HTMLElement): void {
  const celulas = [...recipiente.querySelectorAll<HTMLElement>('tbody td')]
  if (celulas.length === 0) return
  if (celulas.some((c) => c.tabIndex === 0)) return
  for (const celula of celulas) celula.tabIndex = -1
  celulas[0]!.tabIndex = 0
}

/**
 * @param recipiente contêiner da tabela, e não a tabela.
 *
 * O painel de coleta se redesenha por `innerHTML`, o que descarta o elemento
 * `<table>` inteiro a cada atualização. Um ouvinte preso à tabela morreria na
 * primeira medição coletada; preso ao contêiner, que sobrevive, ele continua
 * valendo — e é por isso que o alvo do evento é consultado a cada tecla.
 */
export function navegarTabelaPorTeclado(recipiente: HTMLElement): () => void {
  const aoTeclar = (evento: KeyboardEvent): void => {
    const alvo = evento.target as HTMLElement | null
    if (!alvo || (alvo.tagName !== 'TD' && alvo.tagName !== 'TH')) return

    const tabela = alvo.closest('table')
    if (tabela === null) return

    const celula = alvo as HTMLTableCellElement
    const linha = celula.parentElement as HTMLTableRowElement | null
    if (!linha) return

    const trs = Array.from(tabela.querySelectorAll('tr'))
    const rIdx = trs.indexOf(linha)
    const celulasLinha = Array.from(linha.children) as HTMLElement[]
    const cIdx = celulasLinha.indexOf(celula)

    let proxima: HTMLElement | undefined

    if (evento.key === 'ArrowRight' && cIdx < celulasLinha.length - 1) {
      proxima = celulasLinha[cIdx + 1]
    } else if (evento.key === 'ArrowLeft' && cIdx > 0) {
      proxima = celulasLinha[cIdx - 1]
    } else if (evento.key === 'ArrowDown' && rIdx < trs.length - 1) {
      const proxLinha = trs[rIdx + 1]
      proxima = proxLinha?.children[Math.min(cIdx, proxLinha.children.length - 1)] as HTMLElement | undefined
    } else if (evento.key === 'ArrowUp' && rIdx > 0) {
      const antLinha = trs[rIdx - 1]
      proxima = antLinha?.children[Math.min(cIdx, antLinha.children.length - 1)] as HTMLElement | undefined
    }

    if (proxima) {
      evento.preventDefault()
      celula.tabIndex = -1
      proxima.tabIndex = 0
      proxima.focus()
    }
  }

  recipiente.addEventListener('keydown', aoTeclar)
  garantirEntradaDeFoco(recipiente)

  const observador =
    typeof MutationObserver === 'undefined'
      ? null
      : new MutationObserver(() => garantirEntradaDeFoco(recipiente))
  observador?.observe(recipiente, { childList: true, subtree: true })

  return () => {
    recipiente.removeEventListener('keydown', aoTeclar)
    observador?.disconnect()
  }
}

export function configurarAcessibilidade(
  store: Store,
  opcoes?: {
    recipienteAnunciador?: HTMLElement
    verificarPreferenciaSistema?: boolean
  },
): GerenciadorA11y {
  const verificarSistema = opcoes?.verificarPreferenciaSistema ?? true
  const anunciador = criarAnunciadorLiveRegion(opcoes?.recipienteAnunciador)

  // 1. Movimento reduzido (RF-122)
  const prefereReduzido =
    verificarSistema &&
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  if (prefereReduzido && !store.booleano('movimentoReduzido')) {
    store.definirParametro('movimentoReduzido', true)
  }

  const aplicarMovimentoReduzido = (reduzido: boolean): void => {
    if (reduzido) {
      document.documentElement.dataset.movimentoReduzido = 'true'
      if (store.texto('execucao') === 'rodando') {
        store.definirParametro('execucao', 'pausado')
      }
    } else {
      document.documentElement.removeAttribute('data-movimento-reduzido')
    }
  }

  aplicarMovimentoReduzido(store.booleano('movimentoReduzido'))

  // 2. Paleta para daltonismo (RF-121)
  const aplicarPaletaDaltonismo = (ativa: boolean): void => {
    if (ativa) {
      document.documentElement.dataset.paletaDaltonismo = 'true'
    } else {
      document.documentElement.removeAttribute('data-paleta-daltonismo')
    }
  }
  aplicarPaletaDaltonismo(store.booleano('paletaDaltonismo'))

  // 3. Densidade da interface (P107)
  const aplicarDensidade = (densidade: string): void => {
    document.documentElement.dataset.densidade = densidade
  }
  aplicarDensidade(store.texto('densidadeInterface'))

  // 4. Idioma (P106 / RF-115)
  const aplicarIdioma = (idioma: string): void => {
    document.documentElement.lang = idioma
  }
  aplicarIdioma(store.texto('idioma'))

  // Uma assinatura só para as quatro chaves: `assinar` já entrega o conjunto do
  // que mudou, e quatro assinaturas separadas notificariam quatro vezes a mesma
  // rajada de alterações.
  const cancelarAssinatura = store.assinar(
    ['movimentoReduzido', 'paletaDaltonismo', 'densidadeInterface', 'idioma'],
    (alteradas) => {
      if (alteradas.has('movimentoReduzido')) {
        aplicarMovimentoReduzido(store.booleano('movimentoReduzido'))
      }
      if (alteradas.has('paletaDaltonismo')) {
        aplicarPaletaDaltonismo(store.booleano('paletaDaltonismo'))
      }
      if (alteradas.has('densidadeInterface')) aplicarDensidade(store.texto('densidadeInterface'))
      if (alteradas.has('idioma')) aplicarIdioma(store.texto('idioma'))
    },
  )

  return {
    anunciador,
    destruir(): void {
      cancelarAssinatura()
      anunciador.elemento.remove()
    },
  }
}
