import { describe, expect, it } from 'vitest'
import {
  classificarConfianca,
  LIMIARES_N2_GRAUS,
  periodoExato,
  periodoPequenaAmplitude,
  periodoSerie,
  razaoPeriodo,
  resultadoPeriodo,
} from '../../src/physics/period.js'
import { G_TERRA } from '../../src/physics/constants.js'
import {
  ErroDeDominio,
  deg,
  grausParaRad,
  metro,
  mPorS2,
  type Metro,
} from '../../src/physics/units.js'

const g = (graus: number) => grausParaRad(deg(graus))
const L1 = metro(1)
const gTerra = G_TERRA

describe('periodoPequenaAmplitude', () => {
  it('produz o T₀ de referência do projeto', () => {
    expect(periodoPequenaAmplitude(L1, gTerra)).toBeCloseTo(2.006067, 6)
  })

  it('não depende da massa nem da amplitude — só de L e g', () => {
    expect(periodoPequenaAmplitude(metro(4), gTerra)).toBeCloseTo(
      2 * periodoPequenaAmplitude(L1, gTerra),
      12,
    )
  })

  it('rejeita L ou g não positivos, em vez de devolver NaN ou infinito', () => {
    expect(() => periodoPequenaAmplitude(metro(0), gTerra)).toThrow(ErroDeDominio)
    expect(() => periodoPequenaAmplitude(L1, mPorS2(0))).toThrow(ErroDeDominio)
    expect(() => periodoPequenaAmplitude(metro(-1), gTerra)).toThrow(ErroDeDominio)
  })
})

describe('periodoSerie — pêndulo simples', () => {
  it('reproduz a tabela de fixtures do quickstart', () => {
    expect(periodoSerie(L1, gTerra, g(10), 2, 'simples')).toBeCloseTo(2.009893, 6)
    expect(periodoSerie(L1, gTerra, g(20), 2, 'simples')).toBeCloseTo(2.021446, 6)
    expect(periodoSerie(L1, gTerra, g(45), 2, 'simples')).toBeCloseTo(2.085562, 6)
    expect(periodoSerie(L1, gTerra, g(60), 2, 'simples')).toBeCloseTo(2.149077, 6)
    expect(periodoSerie(L1, gTerra, g(90), 2, 'simples')).toBeCloseTo(2.327351, 6)
    expect(periodoSerie(L1, gTerra, g(120), 2, 'simples')).toBeCloseTo(2.540887, 6)
  })

  it('com N = 0 devolve exatamente T₀', () => {
    expect(periodoSerie(L1, gTerra, g(90), 0, 'simples')).toBe(
      periodoPequenaAmplitude(L1, gTerra),
    )
  })
})

describe('periodoSerie — pêndulo cicloidal é isócrono', () => {
  it('devolve o MESMO período para qualquer amplitude', () => {
    const T0 = periodoPequenaAmplitude(L1, gTerra)
    for (const graus of [1, 5, 10, 30, 45, 60, 90]) {
      expect(periodoSerie(L1, gTerra, g(graus), 2, 'cicloidal')).toBe(T0)
    }
  })

  it('é indiferente ao número de termos', () => {
    const referencia = periodoSerie(L1, gTerra, g(45), 2, 'cicloidal')
    for (const N of [0, 1, 5, 20, 50]) {
      expect(periodoSerie(L1, gTerra, g(45), N, 'cicloidal')).toBe(referencia)
    }
  })

  it('difere do simples exatamente pelos termos de correção', () => {
    const simples = periodoSerie(L1, gTerra, g(45), 2, 'simples')
    const cicloidal = periodoSerie(L1, gTerra, g(45), 2, 'cicloidal')
    expect(simples).toBeGreaterThan(cicloidal)
    expect(simples / cicloidal).toBeCloseTo(1.039628, 6)
  })
})

describe('periodoExato', () => {
  it('reproduz os valores exatos de referência', () => {
    expect(periodoExato(L1, gTerra, g(10), 'simples')).toBeCloseTo(2.009893, 6)
    expect(periodoExato(L1, gTerra, g(45), 'simples')).toBeCloseTo(2.086256, 6)
    expect(periodoExato(L1, gTerra, g(90), 'simples')).toBeCloseTo(2.367842, 6)
    expect(periodoExato(L1, gTerra, g(179), 'simples')).toBeCloseTo(7.825797, 6)
  })

  it('no modo cicloidal é T₀, exato em qualquer amplitude', () => {
    const T0 = periodoPequenaAmplitude(L1, gTerra)
    expect(periodoExato(L1, gTerra, g(90), 'cicloidal')).toBe(T0)
    expect(periodoExato(L1, gTerra, g(5), 'cicloidal')).toBe(T0)
  })

  it('é sempre maior ou igual ao período da série truncada', () => {
    // Toda truncagem subestima: os coeficientes descartados são positivos.
    for (const graus of [10, 45, 90, 150]) {
      expect(periodoExato(L1, gTerra, g(graus), 'simples')).toBeGreaterThanOrEqual(
        periodoSerie(L1, gTerra, g(graus), 2, 'simples'),
      )
    }
  })
})

describe('razaoPeriodo', () => {
  it('não depende de L nem de g', () => {
    const combinacoes: Array<[Metro, number]> = [
      [metro(0.5), 1.62],
      [metro(1), 9.81],
      [metro(9), 24.79],
    ]
    const referencia = razaoPeriodo(g(45), 2, 'simples')
    for (const [L, gv] of combinacoes) {
      const T = periodoSerie(L, mPorS2(gv), g(45), 2, 'simples')
      const T0 = periodoPequenaAmplitude(L, mPorS2(gv))
      expect(T / T0).toBeCloseTo(referencia, 12)
    }
  })
})

describe('classificarConfianca', () => {
  it('classifica pelas quatro faixas', () => {
    expect(classificarConfianca(0)).toBe('excelente')
    expect(classificarConfianca(-0.0005)).toBe('excelente')
    expect(classificarConfianca(-0.005)).toBe('boa')
    expect(classificarConfianca(-0.03)).toBe('limitada')
    expect(classificarConfianca(-0.2)).toBe('inadequada')
  })

  it('usa o módulo do erro', () => {
    expect(classificarConfianca(0.03)).toBe(classificarConfianca(-0.03))
  })

  it('os limiares tabelados caem de fato na fronteira das faixas', () => {
    // Logo abaixo do limiar ainda é a faixa melhor; logo acima já é a pior.
    const erroEm = (graus: number): number => {
      const T = periodoSerie(L1, gTerra, g(graus), 2, 'simples')
      const Te = periodoExato(L1, gTerra, g(graus), 'simples')
      return (T - Te) / Te
    }
    expect(classificarConfianca(erroEm(LIMIARES_N2_GRAUS.excelente - 0.01))).toBe('excelente')
    expect(classificarConfianca(erroEm(LIMIARES_N2_GRAUS.excelente + 0.01))).toBe('boa')
    expect(classificarConfianca(erroEm(LIMIARES_N2_GRAUS.boa + 0.01))).toBe('limitada')
    expect(classificarConfianca(erroEm(LIMIARES_N2_GRAUS.limitada + 0.01))).toBe('inadequada')
  })
})

describe('resultadoPeriodo — a fachada do painel da fórmula', () => {
  it('entrega o estado completo do caso padrão α = 10°', () => {
    const r = resultadoPeriodo({ L: L1, g: gTerra, alpha: g(10), N: 2, modo: 'simples' })
    expect(r.T0).toBeCloseTo(2.006067, 6)
    expect(r.T).toBeCloseTo(2.009893, 6)
    expect(r.Texato).toBeCloseTo(2.009893, 6)
    expect(r.razao).toBeCloseTo(1.001907, 6)
    expect(r.termos).toHaveLength(3)
    expect(r.faixaConfianca).toBe('excelente')
    expect(r.NparaMilesimo).toBe(1)
    // Auto-consistência: comparar contra o literal arredondado de T introduziria
    // um erro de 2×10⁻⁷ vindo do próprio arredondamento, não do código.
    expect(r.frequencia).toBeCloseTo(1 / r.T, 15)
    expect(r.omegaAngular).toBeCloseTo((2 * Math.PI) / r.T, 15)
    expect(r.frequencia).toBeCloseTo(0.49754, 5)
  })

  it('expõe erro negativo em α = 90°: a série subestima', () => {
    const r = resultadoPeriodo({ L: L1, g: gTerra, alpha: g(90), N: 2, modo: 'simples' })
    expect(r.erroRelativo).toBeLessThan(0)
    expect(r.erroRelativo).toBeCloseTo(-0.01710, 4)
    expect(r.erroAbsoluto).toBeCloseTo(2.327351 - 2.367842, 6)
    expect(r.faixaConfianca).toBe('limitada')
    expect(r.NparaMilesimo).toBe(6)
    expect(r.NparaDecimoMilesimo).toBe(9)
  })

  it('no modo cicloidal T, T₀ e o exato coincidem e o erro é zero', () => {
    const r = resultadoPeriodo({ L: L1, g: gTerra, alpha: g(90), N: 2, modo: 'cicloidal' })
    expect(r.T).toBe(r.T0)
    expect(r.Texato).toBe(r.T0)
    expect(r.erroRelativo).toBe(0)
    expect(r.erroAbsoluto).toBe(0)
    expect(r.faixaConfianca).toBe('excelente')
    // Nenhum termo de correção é necessário: o primeiro já é exato.
    expect(r.NparaMilesimo).toBe(0)
    expect(r.NparaDecimoMilesimo).toBe(0)
  })

  it('o erro é sempre não positivo no modo simples, em toda a faixa', () => {
    for (const graus of [1, 10, 45, 90, 120, 150, 179]) {
      const r = resultadoPeriodo({ L: L1, g: gTerra, alpha: g(graus), N: 2, modo: 'simples' })
      expect(r.erroRelativo).toBeLessThanOrEqual(0)
    }
  })

  it('a soma das contribuições dos termos reproduz a razão', () => {
    const r = resultadoPeriodo({ L: L1, g: gTerra, alpha: g(60), N: 5, modo: 'simples' })
    const soma = r.termos.reduce((acc, t) => acc + t.contribuicao, 0)
    expect(soma).toBeCloseTo(r.razao, 15)
  })
})
