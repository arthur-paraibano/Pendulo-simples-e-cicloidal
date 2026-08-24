import { describe, expect, it, vi } from 'vitest'
import {
  amostrarFaceCicloidal,
  amostrarTrajetoriaCicloidal,
  geometriaCicloidal,
} from '../../src/render/cycloid-face.js'
import { calcularVetores } from '../../src/render/instruments.js'
import { ajustarCanvas, DPR_MAXIMO, limitarDpr } from '../../src/render/layers.js'
import { resolverPaleta } from '../../src/render/palette.js'
import { anguloFantasmaT0, HistoricoEstroboscopio } from '../../src/render/scene.js'
import { sensorEmDisparo } from '../../src/render/sensor-marker.js'
import { opacidadeDeDesvanecimento, RastroDePeriodo } from '../../src/render/trace.js'
import { calcularVistas, TransformacaoMundo } from '../../src/render/transform.js'
import type { EstadoPenduloCena } from '../../src/render/types.js'

const estado = (parcial: Partial<EstadoPenduloCena> = {}): EstadoPenduloCena => ({
  id: 'p1',
  modo: 'simples',
  L: 1,
  m: 2,
  g: 9.81,
  alphaInicial: Math.PI / 6,
  theta: 0,
  qPonto: 0,
  qDoisPontos: 0,
  tempo: 0,
  ultimoDisparoSensor: null,
  T0: 2,
  periodo: 2.1,
  modeloAtrito: 'nenhum',
  gamma: 0,
  cq: 0,
  aceleracaoExterna: 0,
  ...parcial,
})

describe('camadas Canvas e DPR', () => {
  it('dimensiona o bitmap pelo DPR e mantem pixels CSS no contexto', () => {
    const canvas = { width: 1, height: 1, style: { width: '', height: '' } } as unknown as HTMLCanvasElement
    const setTransform = vi.fn()
    const contexto = { setTransform } as unknown as CanvasRenderingContext2D
    expect(ajustarCanvas(canvas, contexto, 320, 180, 2)).toBe(true)
    expect(canvas.width).toBe(640)
    expect(canvas.height).toBe(360)
    expect(canvas.style.width).toBe('320px')
    expect(setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0)
    expect(ajustarCanvas(canvas, contexto, 320, 180, 2)).toBe(false)
  })

  it('aceita DPR fracionário sem impor suposição de mínimo 1', () => {
    const canvas = { width: 1, height: 1, style: { width: '', height: '' } } as unknown as HTMLCanvasElement
    const contexto = { setTransform: vi.fn() } as unknown as CanvasRenderingContext2D
    ajustarCanvas(canvas, contexto, 320, 180, 0.75)
    expect(canvas.width).toBe(240)
    expect(canvas.height).toBe(135)
  })

  it('declara teto de DPR e normaliza leituras inválidas', () => {
    expect(DPR_MAXIMO).toBe(2)
    expect(limitarDpr(4)).toBe(2)
    expect(limitarDpr(1.25)).toBe(1.25)
    expect(limitarDpr(0)).toBe(1)
    expect(limitarDpr(Number.NaN)).toBe(1)
  })
})

describe('transformacao mundo e tela', () => {
  it('faz ida e volta sem perder a escala e aplica zoom', () => {
    const t = new TransformacaoMundo({ x: 100, y: 40 }, 80, 1.5)
    const tela = t.mundoParaTela({ x: -0.25, y: 1.2 })
    expect(tela).toEqual({ x: 70, y: 184 })
    expect(t.telaParaMundo(tela).x).toBeCloseTo(-0.25, 12)
    expect(t.telaParaMundo(tela).y).toBeCloseTo(1.2, 12)
    expect(t.metrosParaPixels(1)).toBe(120)
  })

  it('em comparacao alinha os pivos e usa uma escala comum', () => {
    const vistas = calcularVistas(1000, 600, 1, 1, 'comparacao')
    expect(vistas).toHaveLength(2)
    expect(vistas[0]!.transformacao.origem.y).toBe(vistas[1]!.transformacao.origem.y)
    expect(vistas[0]!.transformacao.pixelsPorMetro).toBe(vistas[1]!.transformacao.pixelsPorMetro)
    expect(vistas[0]!.modo).toBe('simples')
    expect(vistas[1]!.modo).toBe('cicloidal')
  })

  it('rejeita escala ou zoom nao positivos', () => {
    expect(() => new TransformacaoMundo({ x: 0, y: 0 }, 0)).toThrow(RangeError)
    expect(() => new TransformacaoMundo({ x: 0, y: 0 }, 1, 0)).toThrow(RangeError)
  })
})

describe('geometria cicloidal desenhavel', () => {
  it.each([0, 10, 45, 89])('preserva o fio L = enrolado + livre a %i graus', (graus) => {
    const theta = (graus * Math.PI) / 180
    const g = geometriaCicloidal(1, theta)
    expect(g.raioGerador).toBeCloseTo(0.25, 14)
    expect(g.comprimentoTotal).toBeCloseTo(1, 14)
    expect(g.comprimentoEnrolado + g.comprimentoLivre).toBeCloseTo(1, 14)
    expect(Math.hypot(g.massa.x - g.contato.x, g.massa.y - g.contato.y)).toBeCloseTo(g.comprimentoLivre, 12)
  })

  it('distingue a evoluta da trajetoria e ambas partem do lugar correto', () => {
    const face = amostrarFaceCicloidal(1, -Math.PI / 3, Math.PI / 3, 10)
    const trajetoria = amostrarTrajetoriaCicloidal(1, Math.PI / 3, 10)
    expect(face).toHaveLength(11)
    expect(trajetoria).toHaveLength(11)
    expect(face[5]).toEqual({ x: 0, y: 0 })
    expect(trajetoria[5]).toEqual({ x: 0, y: 1 })
    expect(face[0]).not.toEqual(trajetoria[0])
  })

  it('rejeita uma amostragem de face sem segmentos', () => {
    expect(() => amostrarFaceCicloidal(1, 0, 1, 0)).toThrow(/segmentos/)
  })

  it('recusa angulo que exigiria mais fio do que existe', () => {
    expect(() => geometriaCicloidal(1, Math.PI / 2 + 0.01)).toThrow(RangeError)
  })
})

describe('paleta, sensor, rastro e estroboscopio', () => {
  it('resolve cada cor a partir dos tokens CSS, sem valores hardcoded', () => {
    const estilos = { getPropertyValue: (nome: string) => ` valor-${nome} ` }
    const paleta = resolverPaleta(estilos)
    expect(paleta.fundo).toBe('valor---cor-cena-fundo')
    expect(paleta.simples).toBe('valor---cor-pendulo-simples')
    expect(paleta.sensorDisparo).toBe('valor---cor-sensor-disparo')
  })

  it('faz o sensor piscar apenas na janela de disparo', () => {
    expect(sensorEmDisparo(1, null)).toBe(false)
    expect(sensorEmDisparo(1.1, 1)).toBe(true)
    expect(sensorEmDisparo(1.181, 1)).toBe(false)
    expect(sensorEmDisparo(0.9, 1)).toBe(false)
  })

  it('calcula desvanecimento incremental estavel', () => {
    expect(opacidadeDeDesvanecimento(0, 4)).toBe(0)
    expect(opacidadeDeDesvanecimento(4, 4)).toBeCloseTo(1 - Math.exp(-1), 12)
    expect(opacidadeDeDesvanecimento(1, 0)).toBe(1)
  })

  it('respeita intervalo, limite e reinicio temporal do estroboscopio', () => {
    const h = new HistoricoEstroboscopio()
    h.atualizar('p', 0, { x: 0, y: 0 }, 0.1, 2)
    h.atualizar('p', 0.05, { x: 1, y: 0 }, 0.1, 2)
    h.atualizar('p', 0.1, { x: 2, y: 0 }, 0.1, 2)
    h.atualizar('p', 0.2, { x: 3, y: 0 }, 0.1, 2)
    expect(h.obter('p').map((a) => a.ponto.x)).toEqual([2, 3])
    h.atualizar('p', 0, { x: 9, y: 0 }, 0.1, 2)
    expect(h.obter('p').map((a) => a.ponto.x)).toEqual([9])
    expect(h.obter('ausente')).toEqual([])
    const visitarAusente = vi.fn()
    h.paraCada('ausente', visitarAusente)
    expect(visitarAusente).not.toHaveBeenCalled()
  })

  it('compacta o estroboscópio por índice e percorre só a janela ativa', () => {
    const h = new HistoricoEstroboscopio()
    for (let t = 0; t < 2100; t++) h.atualizar('p', t, { x: t, y: 0 }, 1, 2)
    const tempos: number[] = []
    h.paraCada('p', (amostra) => tempos.push(amostra.tempo))
    expect(tempos).toEqual([2098, 2099])
  })

  it('preserva todas as amostras estroboscopicas atravessadas por um quadro lento', () => {
    const h = new HistoricoEstroboscopio()
    h.atualizar('p', 0, { x: 0, y: 0 }, 0.1, 10)
    h.atualizar('p', 0.35, { x: 3.5, y: 0 }, 0.1, 10)
    expect(h.obter('p').map((a) => a.tempo)).toEqual([0, 0.1, 0.2, 0.30000000000000004])
    expect(h.obter('p')[2]!.ponto.x).toBeCloseTo(2, 12)
  })

  it('mantem no rastro de periodo somente a janela temporal mais recente', () => {
    const h = new RastroDePeriodo()
    for (let t = 0; t <= 4; t += 0.5) h.adicionar('p', { x: t, y: 0 }, t, 2)
    expect(h.obter('p').at(0)!.tempo).toBeGreaterThanOrEqual(2)
    expect(h.obter('p').at(-1)!.tempo).toBe(4)
    h.adicionar('p', { x: 0, y: 0 }, 0, 2)
    expect(h.obter('p')).toHaveLength(1)
    expect(h.obter('ausente')).toEqual([])
    h.adicionar('p', { x: 0, y: 0 }, 0, 2)
  })

  it('compacta o rastro de período por índice sem shift no hot loop', () => {
    const h = new RastroDePeriodo()
    for (let t = 0; t < 2100; t++) h.adicionar('p', { x: t, y: 0 }, t, 0)
    expect(h.obter('p').at(-1)!.tempo).toBe(2099)
  })
})

describe('vetores e referencia T0', () => {
  it('decompoe aceleracao na soma tangencial e centripeta', () => {
    const vetores = calcularVetores(estado({ theta: 0.4, qPonto: 1.2, qDoisPontos: -2.1 }))
    expect(vetores.aceleracao.x).toBeCloseTo(vetores.aceleracaoTangencial.x + vetores.aceleracaoCentripeta.x, 12)
    expect(vetores.aceleracao.y).toBeCloseTo(vetores.aceleracaoTangencial.y + vetores.aceleracaoCentripeta.y, 12)
  })

  it.each([87, 89])('preserva a curvatura cicloidal analítica a %d graus', (graus) => {
    const theta = (graus * Math.PI) / 180
    const amostra = estado({ modo: 'cicloidal', theta, qPonto: 0.3 })
    const vetores = calcularVetores(amostra)
    const esperado = -(amostra.L * amostra.qPonto ** 2) / Math.cos(theta)
    const radial = { x: Math.sin(theta), y: Math.cos(theta) }
    expect(vetores.aceleracaoCentripeta.x).toBeCloseTo(radial.x * esperado, 10)
    expect(vetores.aceleracaoCentripeta.y).toBeCloseTo(radial.y * esperado, 10)
  })

  it('tem limite finito e nulo na cúspide cicloidal admissível', () => {
    const vetores = calcularVetores(estado({ modo: 'cicloidal', theta: Math.PI / 2, qPonto: 0 }))
    expect(vetores.aceleracaoCentripeta).toEqual({ x: 0, y: 0 })
  })

  it('em repouso no ponto zero a tracao equilibra exatamente o peso', () => {
    const vetores = calcularVetores(estado())
    expect(vetores.resultante.x).toBeCloseTo(0, 12)
    expect(vetores.resultante.y).toBeCloseTo(0, 12)
    expect(vetores.peso.y).toBeCloseTo(19.62, 12)
    expect(vetores.tracao.y).toBeCloseTo(-19.62, 12)
    expect(vetores.moduloTracao).toBeCloseTo(19.62, 12)
  })

  it('separa arrasto viscoso e forca externa sem mascara-los como tracao', () => {
    const vetores = calcularVetores(estado({
      theta: 0,
      qPonto: 2,
      qDoisPontos: -1,
      modeloAtrito: 'viscoso',
      gamma: 0.5,
      aceleracaoExterna: 0.25,
    }))
    expect(vetores.arrasto.x).toBeCloseTo(-2, 12)
    expect(vetores.externa.x).toBeCloseTo(0.5, 12)
    expect(vetores.resultante.x).toBeCloseTo(
      vetores.peso.x + vetores.tracao.x + vetores.arrasto.x + vetores.externa.x,
      12,
    )
    expect(vetores.resultante.y).toBeCloseTo(
      vetores.peso.y + vetores.tracao.y + vetores.arrasto.y + vetores.externa.y,
      12,
    )
  })

  it('arrasto quadratico sempre se opoe a velocidade', () => {
    const positivo = calcularVetores(estado({ qPonto: 2, modeloAtrito: 'quadratico', cq: 0.3 }))
    const negativo = calcularVetores(estado({ qPonto: -2, modeloAtrito: 'quadratico', cq: 0.3 }))
    expect(positivo.arrasto.x).toBeLessThan(0)
    expect(negativo.arrasto.x).toBeGreaterThan(0)
    expect(Math.hypot(positivo.arrasto.x, positivo.arrasto.y)).toBeCloseTo(
      Math.hypot(negativo.arrasto.x, negativo.arrasto.y),
      12,
    )
  })

  it('o fantasma T0 completa meia oscilacao em T0/2', () => {
    const inicial = estado({ tempo: 0 })
    const meia = estado({ tempo: 1 })
    expect(anguloFantasmaT0(inicial)).toBeCloseTo(inicial.alphaInicial, 12)
    expect(anguloFantasmaT0(meia)).toBeCloseTo(-meia.alphaInicial, 12)
  })

  it('no cicloidal o fantasma evolui harmonicamente em s/L', () => {
    const cicloidal = estado({ modo: 'cicloidal', tempo: 0.5 })
    expect(anguloFantasmaT0(cicloidal)).toBeCloseTo(0, 12)
  })
})
