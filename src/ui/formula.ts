import type { FaixaConfianca, ModoPendulo } from '../physics/types.js'
import type { Store } from '../state/store.js'
import { formatarDecimal, modeloFormula, type ModeloFormula } from './formula-model.js'

export { formatarDecimal, modeloFormula, texDoTermo, texFormula } from './formula-model.js'
export type { ModeloFormula } from './formula-model.js'

type RenderizarKatex = (expressao: string, elemento: HTMLElement, opcoes: OpcoesKatex) => void

export interface PainelFormula {
  readonly elemento: HTMLElement
  atualizar(): void
  destruir(): void
}

const ROTULO_CONFIANCA: Readonly<Record<FaixaConfianca, string>> = {
  excelente: 'excelente',
  boa: 'boa',
  limitada: 'limitada',
  inadequada: 'inadequada',
}

interface LinhaFormula {
  readonly raiz: HTMLElement
  readonly titulo: HTMLElement
  readonly expressao: HTMLElement
  readonly termos: HTMLElement
  readonly metricas: Map<string, HTMLOutputElement>
  readonly explicacao: HTMLElement
  assinaturaTex: string
  modo: ModoPendulo
}

function criarLinha(rotulo: string): LinhaFormula {
  const raiz = document.createElement('article')
  raiz.className = 'formula-linha'
  const titulo = document.createElement('h3')
  titulo.textContent = rotulo
  const equacao = document.createElement('div')
  equacao.className = 'formula-equacao'
  const lhs = document.createElement('span')
  lhs.className = 'formula-lhs'
  lhs.textContent = 'T'
  const igual = document.createElement('span')
  igual.className = 'formula-igual'
  igual.textContent = '='
  const expressao = document.createElement('div')
  expressao.className = 'formula-expressao'
  equacao.append(lhs, igual, expressao)
  const termos = document.createElement('div')
  termos.className = 'formula-slots'
  termos.setAttribute('aria-label', 'Termos e contribuições numéricas')
  const metricasRaiz = document.createElement('dl')
  metricasRaiz.className = 'formula-metricas'
  const metricas = new Map<string, HTMLOutputElement>()
  for (const [id, nome] of [
    ['T0', 'T₀'], ['T', 'T'], ['razao', 'T/T₀'], ['erroRelativo', 'Erro relativo'],
    ['erroAbsoluto', 'Erro absoluto'], ['confianca', 'Confiança'],
  ] as const) {
    const grupo = document.createElement('div')
    const dt = document.createElement('dt')
    dt.textContent = nome
    const dd = document.createElement('dd')
    const output = document.createElement('output')
    output.dataset.metrica = id
    dd.append(output)
    grupo.append(dt, dd)
    metricasRaiz.append(grupo)
    metricas.set(id, output)
  }
  const explicacao = document.createElement('p')
  explicacao.className = 'formula-explicacao'
  explicacao.setAttribute('aria-live', 'polite')
  raiz.append(titulo, equacao, termos, metricasRaiz, explicacao)
  return { raiz, titulo, expressao, termos, metricas, explicacao, assinaturaTex: '', modo: 'simples' }
}

function renderizarExpressao(linha: LinhaFormula, modelo: ModeloFormula, prefixo: string, renderizar: RenderizarKatex): void {
  if (linha.assinaturaTex === modelo.tex) return
  linha.assinaturaTex = modelo.tex
  renderizar(modelo.tex, linha.expressao, {
    displayMode: true,
    output: 'htmlAndMathml',
    throwOnError: false,
    strict: 'ignore',
    trust: (contexto) => contexto.command === '\\htmlId',
  })
  for (const termo of modelo.resultado.termos) {
    const ancora = linha.expressao.querySelector<HTMLElement>(`.katex-html #${prefixo}-termo-${termo.n}`)
    if (ancora === null) continue
    ancora.dataset.termo = String(termo.n)
  }
}

function atualizarLinha(
  linha: LinhaFormula,
  modelo: ModeloFormula,
  prefixo: string,
  renderizar: RenderizarKatex,
): void {
  linha.modo = modelo.modo
  linha.titulo.textContent = modelo.modo === 'simples' ? 'Pêndulo simples' : 'Pêndulo cicloidal'
  linha.raiz.dataset.modoFormula = modelo.modo
  renderizarExpressao(linha, modelo, prefixo, renderizar)
  linha.termos.replaceChildren()
  for (const termo of modelo.resultado.termos) {
    const botao = document.createElement('button')
    botao.type = 'button'
    botao.className = 'formula-slot'
    botao.dataset.termo = String(termo.n)
    botao.dataset.ativo = String(termo.ativo)
    botao.setAttribute('aria-pressed', 'false')
    botao.innerHTML = `<strong>n=${termo.n}</strong><span>${formatarDecimal(termo.contribuicao, 6)}</span><small>${formatarDecimal(termo.contribuicaoTempo, 6)} s</small>`
    if (!termo.ativo) botao.setAttribute('aria-disabled', 'true')
    linha.termos.append(botao)
    const ancora = linha.expressao.querySelector<HTMLElement>(`.katex-html #${prefixo}-termo-${termo.n}`)
    if (ancora !== null) ancora.dataset.ativo = String(termo.ativo)
  }
  linha.metricas.get('T0')!.value = `${formatarDecimal(modelo.resultado.T0, 6)} s`
  linha.metricas.get('T')!.value = `${formatarDecimal(modelo.resultado.T, 6)} s`
  linha.metricas.get('razao')!.value = formatarDecimal(modelo.resultado.razao, 6)
  linha.metricas.get('erroRelativo')!.value = `${formatarDecimal(modelo.resultado.erroRelativo * 100, 4)} %`
  linha.metricas.get('erroAbsoluto')!.value = `${formatarDecimal(Math.abs(modelo.resultado.erroAbsoluto), 6)} s`
  const confianca = linha.metricas.get('confianca')!
  confianca.value = ROTULO_CONFIANCA[modelo.resultado.faixaConfianca]
  confianca.dataset.confianca = modelo.resultado.faixaConfianca
  linha.explicacao.textContent = modelo.modo === 'cicloidal'
    ? 'Os termos n ≥ 1 são anulados por χ(n, cicloidal) = 0; o período é exatamente T₀.'
    : 'Explore um termo com o cursor ou o teclado para ver sua contribuição.'
}

function destacar(linha: LinhaFormula, prefixo: string, n: number, ativo: boolean): void {
  const seletor = `[data-termo="${n}"]`
  for (const elemento of linha.raiz.querySelectorAll<HTMLElement>(seletor)) {
    elemento.classList.toggle('termo-destacado', ativo)
    if (elemento instanceof HTMLButtonElement) elemento.setAttribute('aria-pressed', String(ativo))
  }
  const slot = linha.raiz.querySelector<HTMLButtonElement>(`.formula-slot${seletor}`)
  const ancora = linha.expressao.querySelector<HTMLElement>(`.katex-html #${prefixo}-termo-${n}`)
  if (ativo && slot !== null) {
    linha.explicacao.textContent = `Termo n=${n}: valor ${slot.querySelector('span')?.textContent ?? '—'}; contribuição ${slot.querySelector('small')?.textContent ?? '—'}.`
  }
  if (ancora !== null) ancora.classList.toggle('termo-destacado', ativo)
}

function instalarInteracao(linha: LinhaFormula, prefixo: string): () => void {
  const termoDoEvento = (evento: Event): HTMLElement | null => {
    const alvo = evento.target
    return alvo instanceof Element ? alvo.closest<HTMLElement>('[data-termo]') : null
  }
  const entrar = (evento: Event): void => {
    const alvo = termoDoEvento(evento)
    if (alvo !== null) destacar(linha, prefixo, Number(alvo.dataset.termo), true)
  }
  const sair = (evento: Event): void => {
    const alvo = termoDoEvento(evento)
    if (alvo !== null) destacar(linha, prefixo, Number(alvo.dataset.termo), false)
  }
  const teclado = (evento: KeyboardEvent): void => {
    const alvo = termoDoEvento(evento)
    if (alvo === null) return
    const atual = Number(alvo.dataset.termo)
    if (evento.key === 'Enter' || evento.key === ' ') {
      evento.preventDefault()
      destacar(linha, prefixo, atual, true)
      return
    }
    if (evento.key !== 'ArrowLeft' && evento.key !== 'ArrowRight') return
    evento.preventDefault()
    const botoes = [...linha.termos.querySelectorAll<HTMLButtonElement>('.formula-slot')]
    const indice = botoes.findIndex((botao) => Number(botao.dataset.termo) === atual)
    const proximo = Math.max(0, Math.min(botoes.length - 1, indice + (evento.key === 'ArrowRight' ? 1 : -1)))
    botoes[proximo]?.focus()
  }
  linha.raiz.addEventListener('pointerover', entrar)
  linha.raiz.addEventListener('pointerout', sair)
  linha.raiz.addEventListener('focusin', entrar)
  linha.raiz.addEventListener('focusout', sair)
  linha.raiz.addEventListener('keydown', teclado)
  return () => {
    linha.raiz.removeEventListener('pointerover', entrar)
    linha.raiz.removeEventListener('pointerout', sair)
    linha.raiz.removeEventListener('focusin', entrar)
    linha.raiz.removeEventListener('focusout', sair)
    linha.raiz.removeEventListener('keydown', teclado)
  }
}

export function criarPainelFormula(
  recipiente: HTMLElement,
  store: Store,
  renderizar: RenderizarKatex = (expressao, elemento, opcoes) => katex.render(expressao, elemento, opcoes),
): PainelFormula {
  recipiente.hidden = false
  recipiente.className = 'painel-formula'
  const cabecalho = document.createElement('header')
  cabecalho.innerHTML = '<div><span class="formula-sobrancelha">A fórmula é a interface</span><h2>Período pela série geral</h2></div><p>T = T₀ · S(α, N, modo)</p>'
  const linhas = document.createElement('div')
  linhas.className = 'formula-linhas'
  const primaria = criarLinha('Pêndulo simples')
  const secundaria = criarLinha('Pêndulo cicloidal')
  linhas.append(primaria.raiz, secundaria.raiz)
  recipiente.replaceChildren(cabecalho, linhas)
  const cancelarInteracoes = [instalarInteracao(primaria, 'formula-primaria'), instalarInteracao(secundaria, 'formula-secundaria')]

  let destruido = false
  const atualizar = (): void => {
    if (destruido) return
    const visualizacao = store.texto('modo')
    const modoPrimario: ModoPendulo = visualizacao === 'cicloidal' ? 'cicloidal' : 'simples'
    atualizarLinha(primaria, modeloFormula(store, modoPrimario, 'formula-primaria'), 'formula-primaria', renderizar)
    secundaria.raiz.hidden = visualizacao !== 'comparacao'
    if (visualizacao === 'comparacao') {
      atualizarLinha(secundaria, modeloFormula(store, 'cicloidal', 'formula-secundaria'), 'formula-secundaria', renderizar)
    }
    linhas.dataset.visualizacao = visualizacao
  }
  const cancelarStore = store.assinar(['L', 'g', 'alpha', 'N', 'modo'], atualizar)
  atualizar()
  return {
    elemento: recipiente,
    atualizar,
    destruir: () => {
      destruido = true
      cancelarStore()
      for (const cancelar of cancelarInteracoes) cancelar()
      recipiente.replaceChildren()
    },
  }
}
