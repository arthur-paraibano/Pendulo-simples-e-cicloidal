import { describe, expect, it } from 'vitest'
import {
  estatisticas,
  termosNecessarios,
  varreduraPeriodoPorAmplitude,
} from '../../src/physics/analysis.js'
import { G_TERRA } from '../../src/physics/constants.js'
import { ErroDeDominio, deg, grausParaRad, metro } from '../../src/physics/units.js'

const g = (graus: number) => grausParaRad(deg(graus))
const L1 = metro(1)
const gT = G_TERRA

describe('varreduraPeriodoPorAmplitude', () => {
  it('devolve passos + 1 pontos', () => {
    const v = varreduraPeriodoPorAmplitude(L1, gT, 2, 'simples', g(0), g(90), 10)
    expect(v).toHaveLength(11)
  })

  it('no modo simples a curva T(α) é estritamente crescente', () => {
    const v = varreduraPeriodoPorAmplitude(L1, gT, 2, 'simples', g(1), g(90), 20)
    for (let i = 1; i < v.length; i++) {
      expect(v[i]!.T).toBeGreaterThan(v[i - 1]!.T)
    }
  })

  it('no modo cicloidal a curva é uma reta horizontal — a assinatura da isocronia', () => {
    const v = varreduraPeriodoPorAmplitude(L1, gT, 2, 'cicloidal', g(1), g(90), 20)
    const primeiro = v[0]!.T
    for (const ponto of v) {
      expect(ponto.T).toBe(primeiro)
      expect(ponto.Texato).toBe(primeiro)
      expect(ponto.erroRelativo).toBe(0)
    }
  })

  it('o erro da série truncada nunca é positivo', () => {
    const v = varreduraPeriodoPorAmplitude(L1, gT, 2, 'simples', g(0), g(150), 30)
    for (const ponto of v) expect(ponto.erroRelativo).toBeLessThanOrEqual(0)
  })

  it('o erro cresce em módulo com a amplitude', () => {
    const v = varreduraPeriodoPorAmplitude(L1, gT, 2, 'simples', g(10), g(150), 20)
    for (let i = 1; i < v.length; i++) {
      expect(Math.abs(v[i]!.erroRelativo)).toBeGreaterThanOrEqual(
        Math.abs(v[i - 1]!.erroRelativo),
      )
    }
  })

  it('reproduz os valores de referência nas extremidades', () => {
    const v = varreduraPeriodoPorAmplitude(L1, gT, 2, 'simples', g(10), g(90), 8)
    expect(v[0]!.T).toBeCloseTo(2.009893, 6)
    expect(v[8]!.T).toBeCloseTo(2.327351, 6)
    expect(v[8]!.Texato).toBeCloseTo(2.367842, 6)
  })

  it('rejeita passos inválidos e faixa invertida', () => {
    expect(() => varreduraPeriodoPorAmplitude(L1, gT, 2, 'simples', g(0), g(90), 0)).toThrow(
      ErroDeDominio,
    )
    expect(() => varreduraPeriodoPorAmplitude(L1, gT, 2, 'simples', g(0), g(90), 1.5)).toThrow(
      ErroDeDominio,
    )
    expect(() => varreduraPeriodoPorAmplitude(L1, gT, 2, 'simples', g(90), g(10), 4)).toThrow(
      ErroDeDominio,
    )
  })
})

describe('estatisticas', () => {
  it('devolve tudo nulo para amostra vazia', () => {
    const e = estatisticas([])
    expect(e.contagem).toBe(0)
    expect(e.media).toBeNull()
    expect(e.desvioPadrao).toBeNull()
    expect(e.erroPadrao).toBeNull()
    expect(e.minimo).toBeNull()
    expect(e.maximo).toBeNull()
  })

  it('com um único valor não afirma dispersão: nulo, jamais zero', () => {
    // Zero afirmaria uma precisão que não foi medida.
    const e = estatisticas([2.0099])
    expect(e.contagem).toBe(1)
    expect(e.media).toBeCloseTo(2.0099, 12)
    expect(e.desvioPadrao).toBeNull()
    expect(e.erroPadrao).toBeNull()
    expect(e.minimo).toBeCloseTo(2.0099, 12)
  })

  it('usa desvio padrão amostral, com denominador n − 1', () => {
    const e = estatisticas([2, 4, 4, 4, 5, 5, 7, 9])
    expect(e.media).toBeCloseTo(5, 12)
    // Populacional daria 2; amostral dá √(32/7) ≈ 2,13809.
    expect(e.desvioPadrao).toBeCloseTo(Math.sqrt(32 / 7), 10)
    expect(e.erroPadrao).toBeCloseTo(Math.sqrt(32 / 7) / Math.sqrt(8), 10)
  })

  it('reporta mínimo e máximo', () => {
    const e = estatisticas([3, 1, 2])
    expect(e.minimo).toBe(1)
    expect(e.maximo).toBe(3)
    expect(e.contagem).toBe(3)
  })

  it('dá desvio nulo para valores idênticos — aí sim medido', () => {
    const e = estatisticas([2, 2, 2])
    expect(e.desvioPadrao).toBeCloseTo(0, 15)
  })
})

describe('termosNecessarios', () => {
  const em = (graus: number) => grausParaRad(deg(graus))

  it('responde o custo tabelado do quickstart', () => {
    // Cenário 3.8 e 9.8: a 90° bastam poucos termos; a 150° o custo explode.
    expect(termosNecessarios(em(90), 1e-3)).toBe(6)
    expect(termosNecessarios(em(90), 1e-4)).toBe(9)
  })

  it('a 150° a resposta matemática (53) ultrapassa o teto da série', () => {
    // Cenário 9.8: o custo explode perto de 180°. Como N_MAXIMO é 50, a busca
    // devolve nulo — e é essa impossibilidade, não um número, que a interface
    // precisa comunicar.
    expect(termosNecessarios(em(150), 1e-3)).toBeNull()
    expect(termosNecessarios(em(150), 1e-2)).toBe(27)
  })

  it('é monotônico: exigir mais precisão nunca pede menos termos', () => {
    let anterior = 0
    for (const tol of [1e-1, 1e-2, 1e-3, 1e-4, 1e-5]) {
      const n = termosNecessarios(em(90), tol)!
      expect(n).toBeGreaterThanOrEqual(anterior)
      anterior = n
    }
  })

  it('cresce com a amplitude, que é a razão de o exato existir', () => {
    const custos = [30, 60, 90, 120].map((a) => termosNecessarios(em(a), 1e-3)!)
    for (let i = 1; i < custos.length; i++) expect(custos[i]!).toBeGreaterThan(custos[i - 1]!)
  })

  it('em amplitude pequena o primeiro termo já basta', () => {
    expect(termosNecessarios(em(1), 1e-3)).toBe(0)
  })

  it('no cicloidal N = 0 é exato em qualquer amplitude', () => {
    expect(termosNecessarios(em(90), 1e-12, 'cicloidal')).toBe(0)
  })

  it('devolve nulo quando o teto de termos não basta', () => {
    // Perto de 180° nenhuma truncagem razoável alcança precisão de máquina.
    expect(termosNecessarios(em(179), 1e-12)).toBeNull()
    // O teto nunca escapa do domínio do somatório, mesmo se pedido acima dele.
    expect(termosNecessarios(em(90), 1e-3, 'simples', 5000)).toBe(6)
  })

  it('recusa tolerância não positiva', () => {
    expect(() => termosNecessarios(em(90), 0)).toThrow(ErroDeDominio)
    expect(() => termosNecessarios(em(90), -1e-3)).toThrow(ErroDeDominio)
  })
})
