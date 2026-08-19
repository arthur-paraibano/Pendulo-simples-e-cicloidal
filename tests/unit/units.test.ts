import { describe, expect, it } from 'vitest'
import {
  deg,
  ErroDeDominio,
  exigirInteiroNaFaixa,
  exigirNaFaixa,
  exigirPositivo,
  GRAUS_POR_RAD,
  grausParaRad,
  joule,
  kg,
  metro,
  mPorS2,
  rad,
  RAD_POR_GRAU,
  radParaGraus,
  radPorS,
  segundo,
  valor,
} from '../../src/physics/units.js'

describe('construtores de unidade', () => {
  it('preservam o valor numérico', () => {
    expect(rad(1.5)).toBe(1.5)
    expect(deg(90)).toBe(90)
    expect(metro(1)).toBe(1)
    expect(kg(0.5)).toBe(0.5)
    expect(segundo(2.006067)).toBe(2.006067)
    expect(mPorS2(9.81)).toBe(9.81)
    expect(radPorS(-3)).toBe(-3)
    expect(joule(0)).toBe(0)
    expect(valor(42)).toBe(42)
  })
})

describe('conversão grau ↔ radiano', () => {
  it('converte os valores citados no roteiro alemão', () => {
    // O PDF registra 10° = 0,17453 rad e 20° = 0,34907 rad.
    expect(grausParaRad(deg(10))).toBeCloseTo(0.17453, 5)
    expect(grausParaRad(deg(20))).toBeCloseTo(0.34907, 5)
  })

  it('converte os marcos usuais', () => {
    expect(grausParaRad(deg(0))).toBe(0)
    expect(grausParaRad(deg(180))).toBeCloseTo(Math.PI, 15)
    expect(radParaGraus(rad(Math.PI))).toBeCloseTo(180, 12)
    expect(radParaGraus(rad(Math.PI / 2))).toBeCloseTo(90, 12)
  })

  it('é reversível dentro da precisão de ponto flutuante', () => {
    for (const g of [0.1, 1, 5, 10, 45, 90, 179.9]) {
      expect(radParaGraus(grausParaRad(deg(g)))).toBeCloseTo(g, 12)
    }
  })

  it('expõe fatores de conversão coerentes entre si', () => {
    expect(GRAUS_POR_RAD * RAD_POR_GRAU).toBeCloseTo(1, 15)
  })
})

describe('ErroDeDominio', () => {
  it('carrega parâmetro, valor recebido e restrição legíveis', () => {
    const erro = new ErroDeDominio('g', -1, 'g > 0')
    expect(erro).toBeInstanceOf(Error)
    expect(erro.name).toBe('ErroDeDominio')
    expect(erro.parametro).toBe('g')
    expect(erro.valorRecebido).toBe(-1)
    expect(erro.restricao).toBe('g > 0')
    // RNF-023: a mensagem nomeia parâmetro, valor recusado e limite.
    expect(erro.message).toContain('g')
    expect(erro.message).toContain('-1')
    expect(erro.message).toContain('g > 0')
  })
})

describe('exigirPositivo', () => {
  it('aceita valores finitos positivos', () => {
    expect(() => exigirPositivo('L', 1)).not.toThrow()
    expect(() => exigirPositivo('L', 1e-9)).not.toThrow()
  })

  it('rejeita zero, negativos e não finitos', () => {
    expect(() => exigirPositivo('L', 0)).toThrow(ErroDeDominio)
    expect(() => exigirPositivo('L', -1)).toThrow(ErroDeDominio)
    expect(() => exigirPositivo('L', Number.NaN)).toThrow(ErroDeDominio)
    expect(() => exigirPositivo('L', Number.POSITIVE_INFINITY)).toThrow(ErroDeDominio)
  })

  it('nunca devolve NaN silencioso: lança para g = 0', () => {
    // Caso-limite documentado: g = 0 não é "período infinito", é erro de domínio.
    expect(() => exigirPositivo('g', 0)).toThrow(/g/)
  })
})

describe('exigirNaFaixa', () => {
  it('aceita os extremos e o interior', () => {
    expect(() => exigirNaFaixa('α', 0, 0, 179.9)).not.toThrow()
    expect(() => exigirNaFaixa('α', 179.9, 0, 179.9)).not.toThrow()
    expect(() => exigirNaFaixa('α', 10, 0, 179.9)).not.toThrow()
  })

  it('rejeita abaixo, acima e não finito', () => {
    expect(() => exigirNaFaixa('α', -0.1, 0, 179.9)).toThrow(ErroDeDominio)
    expect(() => exigirNaFaixa('α', 180, 0, 179.9)).toThrow(ErroDeDominio)
    expect(() => exigirNaFaixa('α', Number.NaN, 0, 179.9)).toThrow(ErroDeDominio)
  })
})

describe('exigirInteiroNaFaixa', () => {
  it('aceita inteiros dentro da faixa, incluindo os extremos', () => {
    expect(() => exigirInteiroNaFaixa('N', 0, 0, 50)).not.toThrow()
    expect(() => exigirInteiroNaFaixa('N', 2, 0, 50)).not.toThrow()
    expect(() => exigirInteiroNaFaixa('N', 50, 0, 50)).not.toThrow()
  })

  it('rejeita fracionários e fora da faixa', () => {
    expect(() => exigirInteiroNaFaixa('N', 2.5, 0, 50)).toThrow(ErroDeDominio)
    expect(() => exigirInteiroNaFaixa('N', -1, 0, 50)).toThrow(ErroDeDominio)
    expect(() => exigirInteiroNaFaixa('N', 51, 0, 50)).toThrow(ErroDeDominio)
    expect(() => exigirInteiroNaFaixa('N', Number.NaN, 0, 50)).toThrow(ErroDeDominio)
  })
})
