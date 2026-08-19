import { describe, expect, it } from 'vitest'
import {
  compararInferencias,
  inferirComprimento,
  inferirGravidade,
  inferirGravidadeIngenua,
} from '../../src/physics/inference.js'
import { periodoExato, periodoSerie } from '../../src/physics/period.js'
import { G_TERRA } from '../../src/physics/constants.js'
import {
  ErroDeDominio,
  deg,
  grausParaRad,
  metro,
  mPorS2,
  segundo,
} from '../../src/physics/units.js'

const g = (graus: number) => grausParaRad(deg(graus))
const L1 = metro(1)
const gT = G_TERRA

describe('inferirGravidadeIngenua', () => {
  it('inverte T = 2π√(L/g) diretamente', () => {
    expect(inferirGravidadeIngenua(segundo(2.006067), L1)).toBeCloseTo(9.81, 5)
  })

  it('reproduz a Tabela D de research.md — o erro que a coluna expõe', () => {
    const casos: Array<[number, number]> = [
      [5, 9.800664],
      [10, 9.772688],
      [20, 9.661247],
      [45, 9.070361],
      [60, 8.517698],
      [90, 7.041324],
    ]
    for (const [graus, esperado] of casos) {
      const T = periodoExato(L1, gT, g(graus), 'simples')
      expect(inferirGravidadeIngenua(T, L1)).toBeCloseTo(esperado, 6)
    }
  })

  it('o erro cresce com a amplitude e é sempre para menos', () => {
    let anterior = 9.81
    for (const graus of [5, 10, 20, 45, 60, 90]) {
      const T = periodoExato(L1, gT, g(graus), 'simples')
      const inferido = inferirGravidadeIngenua(T, L1)
      expect(inferido).toBeLessThan(anterior)
      anterior = inferido
    }
  })

  it('rejeita período ou comprimento não positivos', () => {
    expect(() => inferirGravidadeIngenua(segundo(0), L1)).toThrow(ErroDeDominio)
    expect(() => inferirGravidadeIngenua(segundo(2), metro(0))).toThrow(ErroDeDominio)
  })
})

describe('inferirGravidade', () => {
  it('reproduz a coluna corrigida da Tabela D', () => {
    const casos: Array<[number, number]> = [
      [5, 9.81],
      [10, 9.809999],
      [20, 9.809947],
      [45, 9.803478],
      [60, 9.775424],
      [90, 9.477358],
    ]
    for (const [graus, esperado] of casos) {
      const T = periodoExato(L1, gT, g(graus), 'simples')
      expect(inferirGravidade(T, L1, g(graus), 2, 'simples')).toBeCloseTo(esperado, 5)
    }
  })

  it('é o inverso exato de periodoSerie — invariante de inversão', () => {
    for (const graus of [5, 10, 45, 90, 150]) {
      for (const N of [0, 1, 2, 5, 10]) {
        const T = periodoSerie(L1, gT, g(graus), N, 'simples')
        const recuperado = inferirGravidade(T, L1, g(graus), N, 'simples')
        expect(Math.abs(recuperado - gT) / gT).toBeLessThan(1e-10)
      }
    }
  })

  it('recupera g exatamente em qualquer amplitude no modo cicloidal', () => {
    for (const graus of [5, 30, 45, 60, 90]) {
      const T = periodoSerie(L1, gT, g(graus), 2, 'cicloidal')
      expect(inferirGravidade(T, L1, g(graus), 2, 'cicloidal')).toBeCloseTo(9.81, 10)
    }
  })

  it('funciona com outras gravidades e comprimentos', () => {
    const L = metro(2.5)
    const gLua = mPorS2(1.62)
    const T = periodoSerie(L, gLua, g(30), 2, 'simples')
    expect(inferirGravidade(T, L, g(30), 2, 'simples')).toBeCloseTo(1.62, 10)
  })
})

describe('compararInferencias — as duas colunas lado a lado', () => {
  it('no cicloidal as duas coincidem, em qualquer amplitude', () => {
    for (const graus of [5, 45, 90]) {
      const T = periodoSerie(L1, gT, g(graus), 2, 'cicloidal')
      const c = compararInferencias(T, L1, g(graus), 2, 'cicloidal')
      expect(c.coincidem).toBe(true)
      expect(c.correta).toBeCloseTo(c.ingenua, 12)
      expect(c.erroRelativoIngenua).toBeCloseTo(0, 12)
    }
  })

  it('no simples divergem, e a diferença cresce com a amplitude', () => {
    const T45 = periodoExato(L1, gT, g(45), 'simples')
    const c45 = compararInferencias(T45, L1, g(45), 2, 'simples')
    expect(c45.coincidem).toBe(false)
    expect(c45.correta).toBeCloseTo(9.803478, 5)
    expect(c45.ingenua).toBeCloseTo(9.070361, 5)
    // Erro de −7,5 %: é erro de modelo, e nenhum instrumento melhor corrige.
    expect(c45.erroRelativoIngenua).toBeCloseTo(-0.0748, 3)

    const T10 = periodoExato(L1, gT, g(10), 'simples')
    const c10 = compararInferencias(T10, L1, g(10), 2, 'simples')
    expect(Math.abs(c10.erroRelativoIngenua)).toBeLessThan(Math.abs(c45.erroRelativoIngenua))
  })

  it('a ingênua sempre subestima g no pêndulo simples', () => {
    for (const graus of [10, 20, 45, 60, 90]) {
      const T = periodoExato(L1, gT, g(graus), 'simples')
      const c = compararInferencias(T, L1, g(graus), 2, 'simples')
      expect(c.ingenua).toBeLessThan(c.correta)
    }
  })

  it('em amplitudes muito pequenas as duas praticamente coincidem', () => {
    const T = periodoExato(L1, gT, g(1), 'simples')
    const c = compararInferencias(T, L1, g(1), 2, 'simples')
    expect(Math.abs(c.erroRelativoIngenua)).toBeLessThan(1e-4)
  })
})

describe('inferirComprimento', () => {
  it('é o inverso de periodoSerie no comprimento', () => {
    for (const graus of [10, 45, 90]) {
      const T = periodoSerie(L1, gT, g(graus), 2, 'simples')
      expect(inferirComprimento(T, gT, g(graus), 2, 'simples')).toBeCloseTo(1, 10)
    }
  })

  it('recupera o comprimento no modo cicloidal', () => {
    const L = metro(1.5)
    const T = periodoSerie(L, gT, g(60), 2, 'cicloidal')
    expect(inferirComprimento(T, gT, g(60), 2, 'cicloidal')).toBeCloseTo(1.5, 10)
  })

  it('rejeita entradas não positivas', () => {
    expect(() => inferirComprimento(segundo(0), gT, g(10), 2, 'simples')).toThrow(ErroDeDominio)
    expect(() => inferirComprimento(segundo(2), mPorS2(0), g(10), 2, 'simples')).toThrow(
      ErroDeDominio,
    )
  })
})
