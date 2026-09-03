/**
 * Painel de créditos e rastreabilidade (RF-125, RNF-021).
 *
 * Casca fina sobre `state/creditos.ts`: aqui só há DOM. A lista de fontes e o
 * vínculo entre número e procedência vivem do lado de fora, onde o teste
 * unitário alcança.
 */

import {
  AFIRMACOES,
  buscarFonte,
  fontesDaCategoria,
  ORDEM_CATEGORIAS,
  ROTULO_CATEGORIA,
} from '../../state/creditos.js'

export interface PainelCreditos {
  readonly elemento: HTMLElement
  destruir(): void
}

export interface OpcoesCreditos {
  /**
   * Reabre a orientação de primeiro uso. Injetada em vez de importada: os
   * créditos não precisam saber que existe um painel de introdução, só que
   * existe algo a reabrir — e quando não houver, o botão nem aparece.
   */
  readonly aoReverIntroducao?: () => void
  /** Injetável para teste; por padrão, o mesmo KaTeX que o painel de fórmula usa. */
  readonly renderizar?: (expressao: string, elemento: HTMLElement) => void
}

const renderizarKatex = (expressao: string, elemento: HTMLElement): void => {
  katex.render(expressao, elemento, {
    displayMode: false,
    output: 'htmlAndMathml',
    throwOnError: false,
  })
}

function itemDeFonte(titulo: string, detalhe: string, url?: string): HTMLLIElement {
  const item = document.createElement('li')
  item.className = 'credito-fonte'

  const nome = document.createElement('strong')
  nome.textContent = titulo
  item.append(nome)

  const texto = document.createElement('p')
  texto.textContent = detalhe
  item.append(texto)

  if (url !== undefined) {
    const link = document.createElement('a')
    link.href = url
    link.textContent = url
    link.rel = 'noreferrer'
    link.target = '_blank'
    item.append(link)
  }

  return item
}

/**
 * Tabela do RNF-021: cada número de referência ao lado da fonte que o sustenta.
 *
 * A fonte é resolvida na hora. Se um dia uma afirmação apontar para um `id`
 * inexistente, a célula diz isso em voz alta em vez de ficar em branco — e o
 * teste unitário de `afirmacoesSemFonte()` já teria falhado antes.
 */
function tabelaDeRastreabilidade(
  renderizar: (expressao: string, elemento: HTMLElement) => void,
): HTMLTableElement {
  const tabela = document.createElement('table')
  tabela.className = 'creditos-tabela'

  const cabecalho = document.createElement('thead')
  const linhaCabecalho = document.createElement('tr')
  for (const rotulo of ['Afirmação', 'Valor', 'Fonte']) {
    const celula = document.createElement('th')
    celula.scope = 'col'
    celula.textContent = rotulo
    linhaCabecalho.append(celula)
  }
  cabecalho.append(linhaCabecalho)
  tabela.append(cabecalho)

  const corpo = document.createElement('tbody')
  for (const afirmacao of AFIRMACOES) {
    const linha = document.createElement('tr')
    linha.dataset.afirmacao = afirmacao.id

    const rotulo = document.createElement('th')
    rotulo.scope = 'row'
    rotulo.textContent = afirmacao.rotulo
    if (afirmacao.nota !== undefined) {
      const nota = document.createElement('small')
      nota.textContent = afirmacao.nota
      rotulo.append(nota)
    }

    const valor = document.createElement('td')
    valor.className = 'creditos-valor'
    if (afirmacao.latex === true) {
      // Fórmula é fórmula, e não código-fonte de fórmula: mostrar o LaTeX cru
      // aqui seria pedir ao leitor que compilasse a expressão de cabeça.
      valor.classList.add('creditos-valor-formula')
      renderizar(afirmacao.valor, valor)
    } else {
      valor.textContent = afirmacao.valor
    }

    const fonte = document.createElement('td')
    const referencia = buscarFonte(afirmacao.fonte)
    fonte.textContent = referencia?.titulo ?? `sem fonte: ${afirmacao.fonte}`

    linha.append(rotulo, valor, fonte)
    corpo.append(linha)
  }
  tabela.append(corpo)

  return tabela
}

export function criarPainelCreditos(
  recipiente: HTMLElement,
  opcoes: OpcoesCreditos = {},
): PainelCreditos {
  const raiz = document.createElement('section')
  raiz.className = 'painel-creditos'

  const titulo = document.createElement('h2')
  titulo.textContent = 'Créditos e fontes'
  raiz.append(titulo)

  const introducao = document.createElement('p')
  introducao.className = 'creditos-nota'
  introducao.textContent =
    'Todo número de referência mostrado nesta aplicação — coeficiente, limiar de erro, valor de ' +
    'gravidade ou fórmula aproximada — vem de uma das fontes abaixo.'
  raiz.append(introducao)

  for (const categoria of ORDEM_CATEGORIAS) {
    const fontes = fontesDaCategoria(categoria)
    if (fontes.length === 0) continue

    const subtitulo = document.createElement('h3')
    subtitulo.textContent = ROTULO_CATEGORIA[categoria]

    const lista = document.createElement('ul')
    lista.className = 'creditos-lista'
    lista.dataset.categoria = categoria
    for (const fonte of fontes) lista.append(itemDeFonte(fonte.titulo, fonte.detalhe, fonte.url))

    raiz.append(subtitulo, lista)
  }

  const detalhes = document.createElement('details')
  detalhes.className = 'creditos-rastreabilidade'
  const resumo = document.createElement('summary')
  resumo.textContent = 'De onde vem cada número'
  detalhes.append(resumo, tabelaDeRastreabilidade(opcoes.renderizar ?? renderizarKatex))
  raiz.append(detalhes)

  const rever = opcoes.aoReverIntroducao
  let botaoRever: HTMLButtonElement | null = null
  if (rever !== undefined) {
    botaoRever = document.createElement('button')
    botaoRever.type = 'button'
    botaoRever.dataset.acao = 'rever-introducao'
    botaoRever.textContent = 'Rever a orientação inicial'
    botaoRever.addEventListener('click', rever)
    raiz.append(botaoRever)
  }

  recipiente.append(raiz)

  return {
    elemento: raiz,
    destruir: () => {
      if (botaoRever !== null && rever !== undefined) {
        botaoRever.removeEventListener('click', rever)
      }
      raiz.remove()
    },
  }
}
