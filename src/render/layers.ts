export type NomeCamada = 'estatica' | 'rastro' | 'dinamica'

export interface CamadaCanvas {
  readonly elemento: HTMLCanvasElement
  readonly contexto: CanvasRenderingContext2D
}

export interface DimensoesCamadas {
  readonly largura: number
  readonly altura: number
  readonly dpr: number
}

export interface OpcoesCamadas {
  readonly obterDpr?: () => number
  readonly criarObservador?: (callback: ResizeObserverCallback) => ResizeObserver
}

/** Teto declarado pelo Princípio VIII: mais que 2× custa muito e pouco agrega. */
export const DPR_MAXIMO = 2

export function limitarDpr(valor: number): number {
  return Number.isFinite(valor) && valor > 0 ? Math.min(DPR_MAXIMO, valor) : 1
}

/** Ajusta o bitmap ao DPR sem alterar o sistema de coordenadas em pixels CSS. */
export function ajustarCanvas(
  canvas: HTMLCanvasElement,
  contexto: CanvasRenderingContext2D,
  largura: number,
  altura: number,
  dpr: number,
): boolean {
  const larguraBitmap = Math.max(1, Math.round(largura * dpr))
  const alturaBitmap = Math.max(1, Math.round(altura * dpr))
  const mudou = canvas.width !== larguraBitmap || canvas.height !== alturaBitmap
  if (mudou) {
    canvas.width = larguraBitmap
    canvas.height = alturaBitmap
  }
  canvas.style.width = `${largura}px`
  canvas.style.height = `${altura}px`
  contexto.setTransform(dpr, 0, 0, dpr, 0, 0)
  return mudou
}

export class CamadasCanvas {
  readonly estatica: CamadaCanvas
  readonly rastro: CamadaCanvas
  readonly dinamica: CamadaCanvas
  readonly overlay: HTMLDivElement
  readonly controleRegua: HTMLButtonElement
  private readonly observador: ResizeObserver
  private dimensoesAtuais: DimensoesCamadas = { largura: 1, altura: 1, dpr: 1 }
  private readonly ouvintes = new Set<(dimensoes: DimensoesCamadas) => void>()
  private readonly obterDpr: () => number
  private readonly ouvintesRegua = new Set<() => void>()
  private deslocamentoReguaAtual = -100
  private origemRegua = { x: 0, y: 0 }
  private limitesRegua = { min: -30, max: 30 }
  private arrastandoRegua = false
  private chaveApresentacaoRegua = ''

  /**
   * Achata as três camadas num único canvas, para a exportação de imagem.
   *
   * As camadas existem porque cada uma tem cadência própria de redesenho; a
   * imagem exportada, porém, é um instante só, e precisa das três empilhadas na
   * mesma ordem em que a tela as compõe (RF-110).
   */
  compor(): HTMLCanvasElement | null {
    const base = this.estatica.elemento
    if (base.width === 0 || base.height === 0) return null
    const destino = document.createElement('canvas')
    destino.width = base.width
    destino.height = base.height
    const contexto = destino.getContext('2d')
    if (contexto === null) return null
    for (const camada of [this.estatica, this.rastro, this.dinamica]) {
      contexto.drawImage(camada.elemento, 0, 0)
    }
    return destino
  }

  constructor(readonly recipiente: HTMLElement, opcoes: OpcoesCamadas = {}) {
    recipiente.classList.add('palco-canvas')
    this.estatica = this.criarCamada('estatica')
    this.rastro = this.criarCamada('rastro')
    this.dinamica = this.criarCamada('dinamica')
    this.overlay = document.createElement('div')
    this.overlay.className = 'cena-overlay'
    this.overlay.setAttribute('role', 'img')
    recipiente.append(this.overlay)
    this.controleRegua = document.createElement('button')
    this.controleRegua.type = 'button'
    this.controleRegua.className = 'controle-regua'
    this.controleRegua.setAttribute('role', 'slider')
    this.controleRegua.setAttribute('aria-label', 'Posição horizontal da régua')
    this.controleRegua.setAttribute('aria-description', 'Distância horizontal em pixels CSS a partir do pivô; use as setas esquerda e direita.')
    this.controleRegua.title = 'Arraste ou use as setas para reposicionar a régua'
    this.controleRegua.hidden = true
    this.controleRegua.addEventListener('pointerdown', this.iniciarArrastoRegua)
    this.controleRegua.addEventListener('pointercancel', this.terminarArrastoRegua)
    this.controleRegua.addEventListener('lostpointercapture', this.terminarArrastoRegua)
    this.controleRegua.addEventListener('keydown', this.moverReguaPorTeclado)
    recipiente.append(this.controleRegua)

    this.obterDpr = opcoes.obterDpr ?? (() => window.devicePixelRatio || 1)
    const criar = opcoes.criarObservador ?? ((callback) => new ResizeObserver(callback))
    this.observador = criar(() => this.redimensionar())
    this.observador.observe(recipiente)
    window.addEventListener('resize', this.aoResizeJanela)
    this.redimensionar()
  }

  get dimensoes(): DimensoesCamadas {
    return this.dimensoesAtuais
  }

  get deslocamentoReguaPx(): number {
    return this.deslocamentoReguaAtual
  }

  aoMoverRegua(ouvinte: () => void): () => void {
    this.ouvintesRegua.add(ouvinte)
    return () => this.ouvintesRegua.delete(ouvinte)
  }

  definirReguaVisivel(
    visivel: boolean,
    origemX?: number,
    origemY?: number,
    limitesX?: { readonly min: number; readonly max: number },
  ): void {
    if (this.controleRegua.hidden === visivel) this.controleRegua.hidden = !visivel
    if (!visivel || origemX === undefined || origemY === undefined) return
    this.origemRegua = { x: origemX, y: origemY }
    if (limitesX !== undefined) {
      this.limitesRegua = limitesX
    } else {
      this.limitesRegua = {
        min: 22 - origemX,
        max: this.dimensoesAtuais.largura - 22 - origemX,
      }
    }
    this.deslocamentoReguaAtual = Math.max(this.limitesRegua.min, Math.min(this.limitesRegua.max, this.deslocamentoReguaAtual))
    const chave = `${origemX}|${origemY}|${this.limitesRegua.min}|${this.limitesRegua.max}|${this.deslocamentoReguaAtual}`
    if (chave === this.chaveApresentacaoRegua) return
    this.chaveApresentacaoRegua = chave
    this.atualizarPosicaoControleRegua()
  }

  aoRedimensionar(ouvinte: (dimensoes: DimensoesCamadas) => void): () => void {
    this.ouvintes.add(ouvinte)
    return () => this.ouvintes.delete(ouvinte)
  }

  redimensionar(): void {
    const caixa = this.recipiente.getBoundingClientRect()
    const largura = Math.max(1, Math.round(caixa.width))
    const altura = Math.max(1, Math.round(caixa.height))
    const dpr = limitarDpr(this.obterDpr())
    let mudou = false
    // Nao usar Array.some aqui: ele interromperia no primeiro `true` e deixaria
    // as camadas seguintes com o bitmap padrao de 300 x 150.
    for (const camada of [this.estatica, this.rastro, this.dinamica]) {
      mudou = ajustarCanvas(camada.elemento, camada.contexto, largura, altura, dpr) || mudou
    }
    this.dimensoesAtuais = { largura, altura, dpr }
    if (mudou) for (const ouvinte of this.ouvintes) ouvinte(this.dimensoesAtuais)
  }

  /** Detecta zoom/mudança de monitor mesmo quando a caixa CSS não mudou. */
  verificarDpr(): boolean {
    const mudou = limitarDpr(this.obterDpr()) !== this.dimensoesAtuais.dpr
    if (mudou) this.redimensionar()
    return mudou
  }

  limpar(camada: NomeCamada): void {
    const alvo = this[camada]
    alvo.contexto.clearRect(0, 0, this.dimensoesAtuais.largura, this.dimensoesAtuais.altura)
  }

  destruir(): void {
    this.observador.disconnect()
    this.ouvintes.clear()
    this.ouvintesRegua.clear()
    this.controleRegua.removeEventListener('pointerdown', this.iniciarArrastoRegua)
    this.controleRegua.removeEventListener('pointercancel', this.terminarArrastoRegua)
    this.controleRegua.removeEventListener('lostpointercapture', this.terminarArrastoRegua)
    this.controleRegua.removeEventListener('keydown', this.moverReguaPorTeclado)
    window.removeEventListener('pointermove', this.arrastarRegua)
    window.removeEventListener('pointerup', this.terminarArrastoRegua)
    window.removeEventListener('pointercancel', this.terminarArrastoRegua)
    window.removeEventListener('resize', this.aoResizeJanela)
    this.estatica.elemento.remove()
    this.rastro.elemento.remove()
    this.dinamica.elemento.remove()
    this.overlay.remove()
    this.controleRegua.remove()
  }

  private criarCamada(nome: NomeCamada): CamadaCanvas {
    const elemento = document.createElement('canvas')
    elemento.className = `camada-canvas camada-${nome}`
    elemento.dataset.camada = nome
    elemento.setAttribute('aria-hidden', 'true')
    const contexto = elemento.getContext('2d')
    if (contexto === null) throw new Error(`Canvas 2D indisponivel para a camada ${nome}.`)
    this.recipiente.append(elemento)
    return { elemento, contexto }
  }

  private readonly iniciarArrastoRegua = (evento: PointerEvent): void => {
    this.arrastandoRegua = true
    this.controleRegua.setPointerCapture?.(evento.pointerId)
    window.addEventListener('pointermove', this.arrastarRegua)
    window.addEventListener('pointerup', this.terminarArrastoRegua)
    window.addEventListener('pointercancel', this.terminarArrastoRegua)
  }

  private readonly arrastarRegua = (evento: PointerEvent): void => {
    if (!this.arrastandoRegua) return
    const caixa = this.recipiente.getBoundingClientRect()
    const pivoAproximado = caixa.width / (this.recipiente.dataset['comparacao'] === 'true' ? 4 : 2)
    this.definirDeslocamentoRegua(evento.clientX - caixa.left - pivoAproximado)
  }

  private readonly terminarArrastoRegua = (): void => {
    this.arrastandoRegua = false
    window.removeEventListener('pointermove', this.arrastarRegua)
    window.removeEventListener('pointerup', this.terminarArrastoRegua)
    window.removeEventListener('pointercancel', this.terminarArrastoRegua)
  }

  private readonly moverReguaPorTeclado = (evento: KeyboardEvent): void => {
    if (evento.key !== 'ArrowLeft' && evento.key !== 'ArrowRight') return
    evento.preventDefault()
    const passo = evento.shiftKey ? 20 : 5
    this.definirDeslocamentoRegua(this.deslocamentoReguaAtual + (evento.key === 'ArrowLeft' ? -passo : passo))
  }

  private definirDeslocamentoRegua(valor: number): void {
    const ajustado = Math.max(this.limitesRegua.min, Math.min(this.limitesRegua.max, valor))
    if (ajustado === this.deslocamentoReguaAtual) return
    this.deslocamentoReguaAtual = ajustado
    this.chaveApresentacaoRegua = ''
    this.atualizarPosicaoControleRegua()
    for (const ouvinte of this.ouvintesRegua) ouvinte()
  }

  private atualizarPosicaoControleRegua(): void {
    this.controleRegua.style.left = `${this.origemRegua.x + this.deslocamentoReguaAtual - 22}px`
    this.controleRegua.style.top = `${this.origemRegua.y + 36}px`
    this.controleRegua.setAttribute('aria-valuemin', String(Math.round(this.limitesRegua.min)))
    this.controleRegua.setAttribute('aria-valuemax', String(Math.round(this.limitesRegua.max)))
    this.controleRegua.setAttribute('aria-valuenow', String(Math.round(this.deslocamentoReguaAtual)))
    const lado = this.deslocamentoReguaAtual < 0 ? 'à esquerda' : this.deslocamentoReguaAtual > 0 ? 'à direita' : 'no pivô'
    this.controleRegua.setAttribute('aria-valuetext', `${Math.abs(Math.round(this.deslocamentoReguaAtual))} pixels CSS ${lado}`)
  }

  private readonly aoResizeJanela = (): void => this.redimensionar()
}
