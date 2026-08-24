import { afterEach, describe, expect, it, vi } from 'vitest'
import { desenharFacesETrajetoria, desenharFioCicloidal } from '../../src/render/cycloid-face.js'
import { desenharInstrumentosEstaticos, desenharSeta, desenharVetores } from '../../src/render/instruments.js'
import { CamadasCanvas } from '../../src/render/layers.js'
import { ControladorPaleta, type PaletaCena } from '../../src/render/palette.js'
import { RenderizadorCena } from '../../src/render/scene.js'
import { desenharSensorZero } from '../../src/render/sensor-marker.js'
import { desenharRastroDePeriodo, RastroDePeriodo, RastroIncremental } from '../../src/render/trace.js'
import { TransformacaoMundo } from '../../src/render/transform.js'
import type { EstadoPenduloCena, OpcoesCena, QuadroCena } from '../../src/render/types.js'

function contextoFalso(): CanvasRenderingContext2D {
  const funcao = () => undefined
  return {
    save: vi.fn(funcao), restore: vi.fn(funcao), beginPath: vi.fn(funcao), closePath: vi.fn(funcao),
    moveTo: vi.fn(funcao), lineTo: vi.fn(funcao), arc: vi.fn(funcao), rect: vi.fn(funcao),
    clip: vi.fn(funcao), stroke: vi.fn(funcao), fill: vi.fn(funcao), fillRect: vi.fn(funcao),
    clearRect: vi.fn(funcao), fillText: vi.fn(funcao), setLineDash: vi.fn(funcao),
    setTransform: vi.fn(funcao),
  } as unknown as CanvasRenderingContext2D
}

const paleta: PaletaCena = {
  fundo: '#fff', grade: '#777', eixo: '#666', faceCicloidal: '#111', trajetoria: '#666',
  sensor: '#080', sensorDisparo: '#0f0', simples: '#b00', cicloidal: '#06c', referenciaT0: '#777',
  texto: '#111', textoSuave: '#555', borda: '#666', energiaCinetica: '#06c',
  energiaPotencial: '#73c', energiaTermica: '#b50', energiaTotal: '#111',
}

const estado = (modo: 'simples' | 'cicloidal', parcial = {}): EstadoPenduloCena => ({
  id: modo, modo, L: 1, m: 1, g: 9.81, alphaInicial: Math.PI / 4, theta: 0.3,
  qPonto: 0.7, qDoisPontos: -2, tempo: 0.4, ultimoDisparoSensor: 0.35,
  T0: 2, periodo: modo === 'simples' ? 2.1 : 2, modeloAtrito: 'viscoso', gamma: 0.2,
  cq: 0.1, aceleracaoExterna: 0.3, ...parcial,
})

const opcoes: OpcoesCena = {
  zoom: 1, exibirEvoluta: true, exibirInvoluta: true, transferidor: true, regua: true,
  linhaVertical: true, arcoAmplitude: true, rastro: true, duracaoRastro: 4, rastroPeriodo: false,
  vetorVelocidade: true, vetorAceleracao: true, decomporAceleracao: true,
  vetoresForca: ['peso', 'tracao', 'arrasto', 'externa', 'resultante'], escalaVetores: 1,
  estroboscopio: true, intervaloEstroboscopio: 0.1, imagensEstroboscopio: 5,
  penduloFantasma: true, grade: { ligada: true, espacamento: 0.25 },
}

describe('desenho Canvas exercitado sem navegador', () => {
  const t = new TransformacaoMundo({ x: 200, y: 50 }, 100)

  it('desenha geometria, instrumentos, setas e sensor em todos os ramos', () => {
    const c = contextoFalso()
    desenharFacesETrajetoria(c, t, 1, Math.PI / 4, paleta, true, true)
    const g = desenharFioCicloidal(c, t, 1, 0.4, paleta.cicloidal)
    expect(g.comprimentoTotal).toBeCloseTo(1, 12)
    desenharInstrumentosEstaticos(c, t, 1, -Math.PI / 4, {
      linhaVertical: true, transferidor: true, regua: true, arcoAmplitude: true,
      deslocamentoReguaPx: -80,
    }, paleta)
    desenharVetores(c, t, g.massa, estado('cicloidal'), {
      velocidade: true, aceleracao: true, decomporAceleracao: true,
      forcas: opcoes.vetoresForca, escala: 1,
    }, paleta)
    desenharSeta(c, { x: 0, y: 0 }, { x: 0.1, y: 0.1 }, '#000', 'x')
    desenharSensorZero(c, t, { x: 0, y: 1 }, 0.4, 0.35, paleta)
    expect(c.stroke).toHaveBeenCalled()
    expect(c.fillText).toHaveBeenCalled()

    const vazio = contextoFalso()
    desenharFacesETrajetoria(vazio, t, 1, 0, paleta, false, false)
    desenharInstrumentosEstaticos(vazio, t, 1, 0, {
      linhaVertical: false, transferidor: false, regua: false, arcoAmplitude: false,
    }, paleta)
    desenharInstrumentosEstaticos(vazio, t, 1, 0, {
      linhaVertical: false, transferidor: false, regua: true, arcoAmplitude: false,
    }, paleta)
    desenharVetores(vazio, t, { x: 0, y: 1 }, estado('simples', { modeloAtrito: 'nenhum' }), {
      velocidade: false, aceleracao: false, decomporAceleracao: false, forcas: [], escala: 1,
    }, paleta)
    desenharVetores(vazio, t, { x: 0, y: 1 }, estado('simples'), {
      velocidade: true, aceleracao: false, decomporAceleracao: false, forcas: ['peso'], escala: 1,
    }, paleta)
  })

  it('exercita rastro incremental, desvanecimento, recuo temporal e rastro vetorial', () => {
    const c = contextoFalso()
    const r = new RastroIncremental()
    r.atualizarDesvanecimento(c, 400, 300, 0, 4)
    r.atualizarDesvanecimento(c, 400, 300, 1, 4)
    r.adicionar(c, 'p', { x: 0, y: 0 }, 0, t, '#000')
    r.adicionar(c, 'p', { x: 1, y: 1 }, 1, t, '#000', true)
    r.adicionar(c, 'p', { x: 2, y: 2 }, 0.5, t, '#000')
    desenharRastroDePeriodo(c, [{ ponto: { x: 0, y: 0 }, tempo: 0 }], t, '#000')
    desenharRastroDePeriodo(c, [
      { ponto: { x: 0, y: 0 }, tempo: 0 }, { ponto: { x: 1, y: 1 }, tempo: 1 },
    ], t, '#000', true)
    r.reiniciar()
    const periodo = new RastroDePeriodo()
    periodo.desenhar('ausente', c, t, '#000')
    periodo.adicionar('p', { x: 0, y: 0 }, 0, 1)
    periodo.desenhar('p', c, t, '#000')
    periodo.adicionar('p', { x: 1, y: 1 }, 1, 1)
    periodo.desenhar('p', c, t, '#000', true)
    expect(c.fillRect).toHaveBeenCalled()
    expect(c.stroke).toHaveBeenCalled()
  })
})

class ObservadorMutacaoFalso {
  static ultimo: ObservadorMutacaoFalso | undefined
  readonly disconnect = vi.fn()
  readonly observe = vi.fn()
  constructor(readonly callback: MutationCallback) { ObservadorMutacaoFalso.ultimo = this }
}

describe('paleta e renderizador composto', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('invalida paleta, recorta vistas, desenha efeitos e faz teardown', () => {
    vi.stubGlobal('MutationObserver', ObservadorMutacaoFalso)
    vi.stubGlobal('getComputedStyle', () => ({ getPropertyValue: () => '#123456' }))
    const invalidar = vi.fn()
    const controlador = new ControladorPaleta({} as HTMLElement, invalidar)
    expect(controlador.atual.fundo).toBe('#123456')
    ObservadorMutacaoFalso.ultimo!.callback([{ attributeName: 'data-tema' } as MutationRecord], {} as MutationObserver)
    expect(invalidar).toHaveBeenCalled()
    ObservadorMutacaoFalso.ultimo!.callback([{ attributeName: 'class' } as MutationRecord], {} as MutationObserver)
    controlador.destruir()

    const contextos = { estatica: contextoFalso(), rastro: contextoFalso(), dinamica: contextoFalso() }
    let resize: (() => void) | undefined
    let moverRegua: (() => void) | undefined
    const camadas = {
      dimensoes: { largura: 900, altura: 540, dpr: 1 },
      estatica: { contexto: contextos.estatica }, rastro: { contexto: contextos.rastro },
      dinamica: { contexto: contextos.dinamica }, overlay: { setAttribute: vi.fn() },
      recipiente: { dataset: {} }, deslocamentoReguaPx: -90,
      aoRedimensionar: (f: () => void) => { resize = f; return vi.fn() },
      aoMoverRegua: (f: () => void) => { moverRegua = f; return vi.fn() },
      definirReguaVisivel: vi.fn(), limpar: vi.fn(),
    } as unknown as CamadasCanvas
    const cena = new RenderizadorCena(camadas, {} as HTMLElement)
    const quadro: QuadroCena = {
      visualizacao: 'comparacao', pendulos: [estado('simples'), estado('cicloidal')], opcoes,
    }
    cena.renderizar(quadro)
    expect(camadas.overlay.setAttribute).toHaveBeenCalledTimes(1)
    cena.invalidarDescricao()
    cena.renderizar(quadro)
    expect(camadas.overlay.setAttribute).toHaveBeenCalledTimes(2)
    ;(camadas.limpar as ReturnType<typeof vi.fn>).mockClear()
    cena.renderizar({ ...quadro, opcoes: { ...opcoes, intervaloEstroboscopio: 0.2 } })
    expect(camadas.limpar).toHaveBeenCalledWith('rastro')
    ;(camadas.limpar as ReturnType<typeof vi.fn>).mockClear()
    cena.renderizar({ ...quadro, visualizacao: 'simples', pendulos: [estado('simples')] })
    expect(camadas.limpar).toHaveBeenCalledWith('rastro')
    cena.renderizar({ ...quadro, opcoes: { ...opcoes, zoom: 1.2, rastroPeriodo: true } })
    cena.renderizar({ ...quadro, pendulos: [estado('simples', { tempo: 0.8 })], visualizacao: 'simples' })
    cena.renderizar({
      visualizacao: 'simples',
      pendulos: [estado('simples', { tempo: 1 })],
      opcoes: {
        ...opcoes,
        grade: { ligada: true, espacamento: 0 },
        rastro: false,
        rastroPeriodo: false,
        estroboscopio: false,
        penduloFantasma: false,
        vetorVelocidade: false,
        vetorAceleracao: false,
        vetoresForca: [],
      },
    })
    cena.renderizar({ visualizacao: 'simples', pendulos: [], opcoes: { ...opcoes, regua: false } })
    resize!()
    moverRegua!()
    cena.renderizar(quadro)
    cena.destruir()
    expect(contextos.estatica.clip).toHaveBeenCalled()
    expect(contextos.dinamica.clip).toHaveBeenCalled()
    expect(camadas.definirReguaVisivel).toHaveBeenCalled()
  })
})

class ElementoFalso {
  readonly style: Record<string, string> = {}
  readonly dataset: Record<string, string> = {}
  readonly classList = { add: vi.fn() }
  readonly listeners = new Map<string, EventListener>()
  width = 1
  height = 1
  hidden = false
  type = ''
  className = ''
  title = ''
  readonly remove = vi.fn()
  readonly setAttribute = vi.fn()
  readonly setPointerCapture = vi.fn()
  constructor(readonly contexto = contextoFalso()) {}
  append(..._itens: unknown[]): void {}
  getContext(): CanvasRenderingContext2D { return this.contexto }
  getBoundingClientRect(): DOMRect { return { width: 400, height: 300, left: 0, top: 0 } as DOMRect }
  addEventListener(tipo: string, f: EventListener): void { this.listeners.set(tipo, f) }
  removeEventListener(tipo: string): void { this.listeners.delete(tipo) }
}

describe('gerencia concreta das camadas', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('redimensiona todas, move a regua e remove recursos', () => {
    const criados: ElementoFalso[] = []
    const recipiente = new ElementoFalso()
    const observar = vi.fn()
    const desconectar = vi.fn()
    const janelaListeners = new Map<string, EventListener>()
    vi.stubGlobal('document', {
      createElement: () => { const e = new ElementoFalso(); criados.push(e); return e },
    })
    vi.stubGlobal('window', {
      devicePixelRatio: 0.75,
      addEventListener: (tipo: string, f: EventListener) => janelaListeners.set(tipo, f),
      removeEventListener: (tipo: string) => janelaListeners.delete(tipo),
    })
    const camadas = new CamadasCanvas(recipiente as unknown as HTMLElement, {
      obterDpr: () => 0.75,
      criarObservador: () => ({ observe: observar, disconnect: desconectar }) as unknown as ResizeObserver,
    })
    const redimensionou = vi.fn()
    camadas.aoRedimensionar(redimensionou)
    camadas.redimensionar()
    expect(camadas.estatica.elemento.width).toBe(300)
    expect(camadas.rastro.elemento.width).toBe(300)
    expect(camadas.dinamica.elemento.width).toBe(300)
    camadas.definirReguaVisivel(true, 200, 50)
    expect(criados.at(-1)!.setAttribute).toHaveBeenCalledWith('role', 'slider')
    expect(criados.at(-1)!.setAttribute).toHaveBeenCalledWith('aria-valuenow', '-100')
    const tecla = criados.at(-1)!.listeners.get('keydown')!
    tecla({ key: 'ArrowRight', shiftKey: false, preventDefault: vi.fn() } as unknown as Event)
    expect(camadas.deslocamentoReguaPx).toBe(-95)
    const controle = criados.at(-1)!
    controle.listeners.get('pointerdown')!({ pointerId: 1 } as unknown as Event)
    expect(janelaListeners.has('pointermove')).toBe(true)
    janelaListeners.get('pointermove')!({ clientX: 220 } as unknown as Event)
    expect(camadas.deslocamentoReguaPx).toBe(20)
    controle.listeners.get('pointercancel')!(new Event('pointercancel'))
    expect(janelaListeners.has('pointermove')).toBe(false)
    camadas.limpar('dinamica')
    camadas.destruir()
    expect(desconectar).toHaveBeenCalled()
    expect(criados.every((e) => e.remove.mock.calls.length > 0)).toBe(true)
  })

  it('detecta mudança de DPR, aplica teto e limita a régua à subvista', () => {
    const criados: ElementoFalso[] = []
    const recipiente = new ElementoFalso()
    let dpr = 1
    vi.stubGlobal('document', { createElement: () => { const e = new ElementoFalso(); criados.push(e); return e } })
    vi.stubGlobal('window', { addEventListener: vi.fn(), removeEventListener: vi.fn() })
    const camadas = new CamadasCanvas(recipiente as unknown as HTMLElement, {
      obterDpr: () => dpr,
      criarObservador: () => ({ observe: vi.fn(), disconnect: vi.fn() }) as unknown as ResizeObserver,
    })
    const mudou = vi.fn()
    camadas.aoRedimensionar(mudou)
    dpr = 3
    expect(camadas.verificarDpr()).toBe(true)
    expect(camadas.dimensoes.dpr).toBe(2)
    expect(camadas.estatica.elemento.width).toBe(800)
    expect(mudou).toHaveBeenCalled()
    camadas.definirReguaVisivel(true, 100, 40, { min: -20, max: 30 })
    expect(camadas.deslocamentoReguaPx).toBe(-20)
    expect(criados.at(-1)!.setAttribute).toHaveBeenCalledWith('aria-valuemin', '-20')
    expect(camadas.verificarDpr()).toBe(false)
    camadas.destruir()
  })

  it('cobre defaults, cancelamentos de ouvintes, teclado e falha de Canvas 2D', () => {
    const criados: ElementoFalso[] = []
    const recipiente = new ElementoFalso()
    let callbackResize: ResizeObserverCallback | undefined
    const janelaListeners = new Map<string, EventListener>()
    vi.stubGlobal('ResizeObserver', class {
      observe = vi.fn(); disconnect = vi.fn()
      constructor(callback: ResizeObserverCallback) { callbackResize = callback }
    })
    vi.stubGlobal('document', { createElement: () => { const e = new ElementoFalso(); criados.push(e); return e } })
    vi.stubGlobal('window', {
      devicePixelRatio: 1.5,
      addEventListener: (tipo: string, f: EventListener) => janelaListeners.set(tipo, f),
      removeEventListener: (tipo: string) => janelaListeners.delete(tipo),
    })
    const camadas = new CamadasCanvas(recipiente as unknown as HTMLElement)
    const moveu = vi.fn()
    const cancelarMoveu = camadas.aoMoverRegua(moveu)
    const redimensionou = vi.fn()
    const cancelarResize = camadas.aoRedimensionar(redimensionou)
    callbackResize!([], {} as ResizeObserver)
    camadas.definirReguaVisivel(false)
    camadas.definirReguaVisivel(true, 200, 40, { min: -30, max: 30 })
    const controle = criados.at(-1)!
    const teclado = controle.listeners.get('keydown')!
    teclado({ key: 'Enter', preventDefault: vi.fn() } as unknown as Event)
    teclado({ key: 'ArrowLeft', shiftKey: true, preventDefault: vi.fn() } as unknown as Event)
    teclado({ key: 'ArrowRight', shiftKey: true, preventDefault: vi.fn() } as unknown as Event)
    teclado({ key: 'ArrowRight', shiftKey: true, preventDefault: vi.fn() } as unknown as Event)
    expect(moveu).toHaveBeenCalled()
    cancelarMoveu(); cancelarResize()
    teclado({ key: 'ArrowLeft', shiftKey: false, preventDefault: vi.fn() } as unknown as Event)
    expect(janelaListeners.get('resize')).toBeDefined()
    janelaListeners.get('resize')!(new Event('resize'))
    camadas.destruir()

    vi.stubGlobal('document', {
      createElement: () => {
        const elemento = new ElementoFalso()
        elemento.getContext = () => null as unknown as CanvasRenderingContext2D
        return elemento
      },
    })
    expect(() => new CamadasCanvas(recipiente as unknown as HTMLElement, {
      obterDpr: () => 1,
      criarObservador: () => ({ observe: vi.fn(), disconnect: vi.fn() }) as unknown as ResizeObserver,
    })).toThrow(/Canvas 2D indisponivel/)
  })
})
