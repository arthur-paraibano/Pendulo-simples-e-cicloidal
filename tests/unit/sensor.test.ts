import { describe, expect, it } from 'vitest'
import {
  detectarCruzamento,
  MAX_EVENTOS_SENSOR,
  periodoDeEventos,
  periodoMedio,
  SensorZero,
  type EventoPassagem,
} from '../../src/physics/sensor.js'
import type { EstadoQ } from '../../src/physics/integrators.js'
import { ErroDeDominio, segundo } from '../../src/physics/units.js'

const est = (t: number, q: number, qPonto: number): EstadoQ => ({ t: segundo(t), q, qPonto })

const evento = (t: number, sentido: -1 | 1): EventoPassagem => ({
  t: segundo(t),
  sentido,
  qPonto: sentido,
  numeroTravessia: 0,
})

describe('detectarCruzamento', () => {
  it('não detecta nada sem troca de sinal', () => {
    expect(detectarCruzamento(est(0, 0.5, -1), est(0.1, 0.4, -1))).toBeNull()
    expect(detectarCruzamento(est(0, -0.5, 1), est(0.1, -0.4, 1))).toBeNull()
  })

  it('interpola o instante exato do cruzamento', () => {
    // De +1 a −1 em 1 s: o zero está exatamente no meio.
    const e = detectarCruzamento(est(0, 1, -2), est(1, -1, -2))
    expect(e).not.toBeNull()
    expect(e!.t).toBeCloseTo(0.5, 12)
  })

  it('interpola corretamente fora do meio do passo', () => {
    // De +3 a −1: o zero está a 3/4 do passo.
    const e = detectarCruzamento(est(0, 3, -4), est(1, -1, -4))
    expect(e!.t).toBeCloseTo(0.75, 12)
  })

  it('a precisão do instante é muito melhor que o passo — o requisito do produto', () => {
    // Passo de 1,7 ms; queremos erro bem abaixo de 0,1 ms.
    const h = 1 / 600
    const w = 3.13
    // q(t) = sen(w(t − t0)) com t0 conhecido: o cruzamento verdadeiro é t0.
    const t0 = 0.4 + h * 0.37
    const q = (t: number): number => Math.sin(w * (t - t0))
    const tA = 0.4
    const tB = tA + h
    const e = detectarCruzamento(est(tA, q(tA), w), est(tB, q(tB), w))
    expect(Math.abs(e!.t - t0)).toBeLessThan(1e-4)
  })

  it('lê o sentido a partir da velocidade no cruzamento', () => {
    expect(detectarCruzamento(est(0, 1, -2), est(1, -1, -2))!.sentido).toBe(-1)
    expect(detectarCruzamento(est(0, -1, 2), est(1, 1, 2))!.sentido).toBe(1)
  })

  it('não detecta quando um dos extremos é exatamente zero', () => {
    // Tocar o zero sem atravessar é resolvido no passo seguinte.
    expect(detectarCruzamento(est(0, 0, 1), est(1, 1, 1))).toBeNull()
    expect(detectarCruzamento(est(0, 1, -1), est(1, 0, -1))).toBeNull()
  })

  it('exige passo positivo entre os estados', () => {
    expect(() => detectarCruzamento(est(1, 1, -1), est(1, -1, -1))).toThrow(ErroDeDominio)
    expect(() => detectarCruzamento(est(1, 1, -1), est(0, -1, -1))).toThrow(ErroDeDominio)
  })
})

describe('SensorZero', () => {
  it('é fixo no ponto zero e não arrastável', () => {
    const s = new SensorZero()
    expect(s.posicao).toBe('zero')
    expect(s.arrastavel).toBe(false)
  })

  it('acumula passagens numeradas em sequência', () => {
    const s = new SensorZero()
    s.processar(est(0, 1, -2), est(1, -1, -2))
    s.processar(est(1, -1, 2), est(2, 1, 2))
    expect(s.passagens).toHaveLength(2)
    expect(s.passagens[0]?.numeroTravessia).toBe(0)
    expect(s.passagens[1]?.numeroTravessia).toBe(1)
    expect(s.passagens[0]?.sentido).toBe(-1)
    expect(s.passagens[1]?.sentido).toBe(1)
  })

  it('descarta repique dentro do intervalo mínimo e contabiliza o descarte', () => {
    const s = new SensorZero(segundo(0.5))
    expect(s.processar(est(0, 1, -2), est(1, -1, -2))).not.toBeNull()
    // Primeiro cruzamento em t = 0,5; este cai em t = 0,9 — 0,4 s depois,
    // dentro da guarda de 0,5 s.
    expect(s.processar(est(0.8, -1, 2), est(1.0, 1, 2))).toBeNull()
    expect(s.eventosDescartados).toBe(1)
    expect(s.passagens).toHaveLength(1)
  })

  it('aceita a passagem seguinte quando o intervalo é respeitado', () => {
    const s = new SensorZero(segundo(0.1))
    s.processar(est(0, 1, -2), est(1, -1, -2))
    expect(s.processar(est(2, -1, 2), est(3, 1, 2))).not.toBeNull()
    expect(s.eventosDescartados).toBe(0)
  })

  it('zerar esquece o histórico mas preserva a configuração', () => {
    const s = new SensorZero(segundo(0.5))
    s.processar(est(0, 1, -2), est(1, -1, -2))
    s.zerar()
    expect(s.passagens).toHaveLength(0)
    expect(s.eventosDescartados).toBe(0)
    expect(s.processar(est(0, 1, -2), est(1, -1, -2))?.numeroTravessia).toBe(0)
  })

  it('expõe o período nas duas grandezas', () => {
    const s = new SensorZero()
    s.processar(est(0, 1, -2), est(1, -1, -2)) // t = 0,5, sentido −1
    s.processar(est(1, -1, 2), est(2, 1, 2)) // t = 1,5, sentido +1
    s.processar(est(2, 1, -2), est(3, -1, -2)) // t = 2,5, sentido −1
    expect(s.periodo('meioPeriodo')).toBeCloseTo(1, 12)
    expect(s.periodo('periodoCompleto')).toBeCloseTo(2, 12)
  })

  it('mantém apenas o histórico mínimo necessário para calcular o período', () => {
    const s = new SensorZero()
    for (let i = 0; i < 20; i++) {
      const sinal = i % 2 === 0 ? 1 : -1
      s.processar(est(i, sinal, -sinal), est(i + 1, -sinal, -sinal))
    }
    expect(s.passagens).toHaveLength(MAX_EVENTOS_SENSOR)
    expect(s.periodo('periodoCompleto')).toBeCloseTo(2, 12)
  })
})

describe('periodoDeEventos', () => {
  it('devolve null sem passagens suficientes', () => {
    expect(periodoDeEventos([], 'meioPeriodo')).toBeNull()
    expect(periodoDeEventos([evento(1, 1)], 'meioPeriodo')).toBeNull()
    expect(periodoDeEventos([], 'periodoCompleto')).toBeNull()
    expect(periodoDeEventos([evento(1, 1)], 'periodoCompleto')).toBeNull()
  })

  it('meio período é a diferença entre as duas últimas passagens', () => {
    const eventos = [evento(0.5, -1), evento(1.5, 1), evento(2.5, -1)]
    expect(periodoDeEventos(eventos, 'meioPeriodo')).toBeCloseTo(1, 12)
  })

  it('período completo é a diferença entre as duas últimas de mesmo sentido', () => {
    const eventos = [evento(0.5, -1), evento(1.5, 1), evento(2.5, -1)]
    expect(periodoDeEventos(eventos, 'periodoCompleto')).toBeCloseTo(2, 12)
  })

  it('o período completo vale o dobro do meio período no movimento simétrico', () => {
    const eventos = [evento(0.5, -1), evento(1.5, 1), evento(2.5, -1), evento(3.5, 1)]
    const meio = periodoDeEventos(eventos, 'meioPeriodo')!
    const completo = periodoDeEventos(eventos, 'periodoCompleto')!
    expect(completo).toBeCloseTo(2 * meio, 12)
  })

  it('devolve null se não houver duas passagens de mesmo sentido', () => {
    expect(periodoDeEventos([evento(0.5, -1), evento(1.5, 1)], 'periodoCompleto')).toBeNull()
  })
})

describe('periodoMedio', () => {
  it('promedia os períodos completos observados', () => {
    const eventos = [
      evento(0.5, 1),
      evento(1.5, -1),
      evento(2.5, 1),
      evento(3.5, -1),
      evento(4.5, 1),
    ]
    expect(periodoMedio(eventos)).toBeCloseTo(2, 12)
  })

  it('devolve null com menos de dois períodos completos', () => {
    expect(periodoMedio([])).toBeNull()
    expect(periodoMedio([evento(0.5, 1), evento(1.5, -1)])).toBeNull()
  })
})
