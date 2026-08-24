import type { DefinicaoParametro } from '../state/tipos.js'
import type { ResultadoEscrita, Store } from '../state/store.js'
import { interpretarEntradaNumerica } from '../state/numeric-input.js'

export { avaliarExpressaoNumerica, interpretarEntradaNumerica } from '../state/numeric-input.js'
export type { ResultadoEntradaNumerica } from '../state/numeric-input.js'

export interface ParamControl {
  readonly elemento: HTMLElement
  readonly entrada: HTMLInputElement
  readonly slider: HTMLInputElement
  atualizar(): void
  destruir(): void
}

type Anunciar = (mensagem: string, erro?: boolean) => void


const NOMES_UNIDADE: Readonly<Record<string, string>> = {
  m: 'metros', mm: 'milímetros', kg: 'quilogramas', s: 'segundos', '°': 'graus',
  rad: 'radianos', 'rad/s': 'radianos por segundo', 'm/s²': 'metros por segundo ao quadrado',
  'kg/s': 'quilogramas por segundo', 'kg/m³': 'quilogramas por metro cúbico', Hz: 'hertz', J: 'joules',
}

export function formatarValorParametro(valor: number, definicao: DefinicaoParametro): string {
  const casas = definicao.precisao ?? (definicao.tipo === 'inteiro' ? 0 : 3)
  return valor.toFixed(casas).replace('.', ',')
}

function casasDoPasso(passo: number): number {
  const texto = passo.toExponential()
  const expoente = Number(texto.split('e')[1] ?? 0)
  return Math.max(0, -expoente)
}

function anunciarResultado(resultado: ResultadoEscrita, anunciar: Anunciar): void {
  if (resultado.mensagem !== undefined) anunciar(resultado.mensagem, !resultado.aplicado)
}

export function criarParamControl(
  definicao: DefinicaoParametro,
  store: Store,
  anunciar: Anunciar = () => undefined,
): ParamControl {
  if (definicao.tipo !== 'numero' && definicao.tipo !== 'inteiro') {
    throw new TypeError(`ParamControl requer parâmetro numérico; recebeu ${definicao.tipo}.`)
  }

  const raiz = document.createElement('div')
  raiz.className = 'param-control'
  raiz.dataset.parametro = definicao.id
  const cabecalho = document.createElement('div')
  cabecalho.className = 'param-control-cabecalho'
  const label = document.createElement('label')
  const idEntrada = `param-${definicao.id}`
  label.htmlFor = idEntrada
  label.innerHTML = `<strong>${definicao.simbolo}</strong><span>${definicao.nome}</span>`
  const unidade = document.createElement('span')
  unidade.className = 'param-unidade'
  unidade.textContent = definicao.unidade ?? ''
  const entrada = document.createElement('input')
  entrada.id = idEntrada
  entrada.type = 'text'
  entrada.inputMode = 'decimal'
  entrada.autocomplete = 'off'
  entrada.spellcheck = false
  const nomeUnidade = definicao.unidade === null ? '' : (NOMES_UNIDADE[definicao.unidade] ?? definicao.unidade)
  entrada.setAttribute('aria-label', `${definicao.nome}${nomeUnidade === '' ? '' : `, em ${nomeUnidade}`}`)
  entrada.setAttribute('aria-describedby', `${idEntrada}-descricao`)
  const descricao = document.createElement('small')
  descricao.id = `${idEntrada}-descricao`
  descricao.className = 'param-descricao'
  descricao.textContent = `${definicao.descricao} Faixa válida atual exibida no controle deslizante.`
  const slider = document.createElement('input')
  slider.type = 'range'
  slider.dataset.slider = definicao.id
  slider.setAttribute('aria-label', `${definicao.nome}${nomeUnidade === '' ? '' : `, em ${nomeUnidade}`}, controle deslizante`)
  const restaurar = document.createElement('button')
  restaurar.type = 'button'
  restaurar.className = 'param-restaurar'
  restaurar.textContent = '↺'
  restaurar.title = `Restaurar ${definicao.simbolo} para o padrão`
  restaurar.setAttribute('aria-label', `Restaurar ${definicao.nome} para o padrão`)
  const linha = document.createElement('div')
  linha.className = 'param-entrada'
  linha.append(entrada, unidade, restaurar)
  cabecalho.append(label, linha)
  raiz.append(cabecalho, slider, descricao)

  let editando = false
  let destruido = false
  // A apresentação pode arredondar (α = 10,11 aparece como 10,1), mas a base
  // usada pelo teclado continua sendo o valor completo armazenado.
  let valorInterno = store.numero(definicao.id)
  const faixa = (): { min: number; max: number } => store.faixaEfetiva(definicao)
  const atualizar = (): void => {
    if (destruido) return
    const atual = store.numero(definicao.id)
    valorInterno = atual
    entrada.dataset.valorExato = String(atual)
    const limites = faixa()
    slider.min = String(limites.min)
    slider.max = String(limites.max)
    const passoSlider = definicao.passo ?? 1
    slider.step = String(passoSlider)
    slider.value = String(atual)
    const casasAcessiveis = Math.max(definicao.precisao ?? 0, casasDoPasso(passoSlider))
    const valorAcessivel = atual.toFixed(casasAcessiveis).replace('.', ',')
    slider.setAttribute('aria-valuetext', `${valorAcessivel} ${nomeUnidade}`.trim())
    if (!editando) {
      entrada.value = formatarValorParametro(atual, definicao)
      entrada.removeAttribute('aria-invalid')
    }
  }
  const confirmar = (): boolean => {
    const analise = interpretarEntradaNumerica(entrada.value, definicao)
    if (!analise.valido || analise.valor === undefined) {
      entrada.setAttribute('aria-invalid', 'true')
      anunciar(analise.mensagem ?? `${definicao.simbolo} inválido.`, true)
      return false
    }
    const resultado = store.definirParametro(definicao.id, analise.valor)
    anunciarResultado(resultado, anunciar)
    editando = false
    atualizar()
    return resultado.aplicado
  }
  const cancelarEdicao = (): void => {
    editando = false
    atualizar()
  }
  const alterarPorTecla = (direcao: 1 | -1, grande: boolean, fino: boolean): void => {
    const passo = fino ? (definicao.passoFino ?? (definicao.passo ?? 1) / 10) : (definicao.passo ?? 1)
    const multiplicador = grande ? 10 : 1
    const base = editando
      ? (interpretarEntradaNumerica(entrada.value, definicao).valor ?? valorInterno)
      : valorInterno
    editando = false
    const resultado = store.definirParametro(definicao.id, base + direcao * passo * multiplicador)
    anunciarResultado(resultado, anunciar)
    atualizar()
  }
  const aoDigitar = (): void => {
    editando = true
    const analise = interpretarEntradaNumerica(entrada.value, definicao)
    entrada.setAttribute('aria-invalid', String(!analise.valido))
  }
  const aoTeclar = (evento: KeyboardEvent): void => {
    if (evento.key === 'Enter') {
      evento.preventDefault()
      confirmar()
    } else if (evento.key === 'Escape') {
      evento.preventDefault()
      cancelarEdicao()
    } else if (evento.key === 'Home' || evento.key === 'End') {
      evento.preventDefault()
      editando = false
      const limites = faixa()
      anunciarResultado(store.definirParametro(definicao.id, evento.key === 'Home' ? limites.min : limites.max), anunciar)
      atualizar()
    } else if (evento.key === 'ArrowUp' || evento.key === 'ArrowDown' || evento.key === 'PageUp' || evento.key === 'PageDown') {
      evento.preventDefault()
      const direcao = evento.key === 'ArrowUp' || evento.key === 'PageUp' ? 1 : -1
      alterarPorTecla(direcao, evento.key.startsWith('Page'), evento.altKey || evento.shiftKey)
    }
  }
  const aoSlider = (): void => {
    editando = false
    const resultado = store.definirParametro(definicao.id, Number(slider.value))
    anunciarResultado(resultado, anunciar)
  }
  const aoRestaurar = (): void => {
    editando = false
    anunciarResultado(store.restaurarParametro(definicao.id), anunciar)
    atualizar()
  }
  entrada.addEventListener('input', aoDigitar)
  entrada.addEventListener('keydown', aoTeclar)
  entrada.addEventListener('blur', confirmar)
  slider.addEventListener('input', aoSlider)
  restaurar.addEventListener('click', aoRestaurar)
  atualizar()

  return {
    elemento: raiz,
    entrada,
    slider,
    atualizar,
    destruir: () => {
      destruido = true
      entrada.removeEventListener('input', aoDigitar)
      entrada.removeEventListener('keydown', aoTeclar)
      entrada.removeEventListener('blur', confirmar)
      slider.removeEventListener('input', aoSlider)
      restaurar.removeEventListener('click', aoRestaurar)
      raiz.remove()
    },
  }
}
