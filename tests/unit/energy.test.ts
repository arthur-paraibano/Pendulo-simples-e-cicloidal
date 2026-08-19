import { describe, expect, it } from 'vitest'
import {
  alturaAcimaDoPontoZero,
  energiaDeLargada,
  energias,
} from '../../src/physics/energy.js'
import { G_TERRA } from '../../src/physics/constants.js'
import {
  ErroDeDominio,
  deg,
  grausParaRad,
  joule,
  kg,
  metro,
  mPorS2,
  radPorS,
} from '../../src/physics/units.js'

const g = (graus: number) => grausParaRad(deg(graus))
const L1 = metro(1)
const m1 = kg(1)
const gT = G_TERRA

describe('alturaAcimaDoPontoZero', () => {
  it('usa L(1 − cos θ) no pêndulo simples', () => {
    expect(alturaAcimaDoPontoZero(L1, g(60), 'simples')).toBeCloseTo(0.5, 12)
    expect(alturaAcimaDoPontoZero(L1, g(90), 'simples')).toBeCloseTo(1, 12)
    expect(alturaAcimaDoPontoZero(L1, g(0), 'simples')).toBeCloseTo(0, 15)
  })

  it('usa L·sen²θ/2 no cicloidal — fórmula diferente, não a mesma', () => {
    expect(alturaAcimaDoPontoZero(L1, g(60), 'cicloidal')).toBeCloseTo(0.375, 12)
    expect(alturaAcimaDoPontoZero(L1, g(90), 'cicloidal')).toBeCloseTo(0.5, 12)
  })

  it('as duas convergem em pequenos ângulos, ambas para L·θ²/2', () => {
    const theta = g(2)
    const simples = alturaAcimaDoPontoZero(L1, theta, 'simples')
    const cicloidal = alturaAcimaDoPontoZero(L1, theta, 'cicloidal')
    expect(simples).toBeCloseTo(cicloidal, 6)
    expect(simples).toBeCloseTo((theta * theta) / 2, 6)
  })

  it('divergem quando a amplitude cresce — e é aí que o produto olha', () => {
    const simples = alturaAcimaDoPontoZero(L1, g(90), 'simples')
    const cicloidal = alturaAcimaDoPontoZero(L1, g(90), 'cicloidal')
    expect(simples).toBeCloseTo(2 * cicloidal, 12)
  })

  it('rejeita comprimento não positivo', () => {
    expect(() => alturaAcimaDoPontoZero(metro(0), g(45), 'simples')).toThrow(ErroDeDominio)
  })
})

describe('energias', () => {
  it('zera tudo no repouso no ponto zero', () => {
    const e = energias(m1, L1, gT, g(0), radPorS(0), 'simples')
    expect(e.cinetica).toBe(0)
    expect(e.potencial).toBe(0)
    expect(e.termica).toBe(0)
    expect(e.total).toBe(0)
  })

  it('calcula a cinética como ½mL²ω²', () => {
    const e = energias(m1, L1, gT, g(0), radPorS(2), 'simples')
    expect(e.cinetica).toBeCloseTo(2, 12)
    expect(e.potencial).toBeCloseTo(0, 12)
  })

  it('calcula a potencial como mgh', () => {
    const e = energias(m1, L1, gT, g(90), radPorS(0), 'simples')
    expect(e.potencial).toBeCloseTo(9.81, 12)
  })

  it('soma a energia térmica ao total', () => {
    const e = energias(m1, L1, gT, g(0), radPorS(0), 'simples', joule(3))
    expect(e.total).toBeCloseTo(3, 12)
  })

  it('conserva a energia total ao longo da oscilação sem dissipação', () => {
    // Solta em α = 30°; em qualquer θ vale ½mL²ω² + mgh = mgh(α).
    const alpha = g(30)
    const E0 = energiaDeLargada(m1, L1, gT, alpha, 'simples')
    for (const graus of [0, 5, 10, 20, 29.9]) {
      const theta = g(graus)
      const h = alturaAcimaDoPontoZero(L1, theta, 'simples')
      const omega = radPorS(Math.sqrt((2 * (E0 - m1 * gT * h)) / (m1 * L1 * L1)))
      const e = energias(m1, L1, gT, theta, omega, 'simples')
      expect(e.total).toBeCloseTo(E0, 10)
    }
  })

  it('rejeita massa, comprimento ou gravidade não positivos', () => {
    expect(() => energias(kg(0), L1, gT, g(10), radPorS(0), 'simples')).toThrow(ErroDeDominio)
    expect(() => energias(m1, metro(0), gT, g(10), radPorS(0), 'simples')).toThrow(ErroDeDominio)
    expect(() => energias(m1, L1, mPorS2(0), g(10), radPorS(0), 'simples')).toThrow(ErroDeDominio)
  })
})

describe('energiaDeLargada', () => {
  it('é a potencial na amplitude, com velocidade nula', () => {
    expect(energiaDeLargada(m1, L1, gT, g(90), 'simples')).toBeCloseTo(9.81, 12)
    expect(energiaDeLargada(m1, L1, gT, g(90), 'cicloidal')).toBeCloseTo(9.81 * 0.5, 12)
  })

  it('cresce com a amplitude', () => {
    expect(energiaDeLargada(m1, L1, gT, g(60), 'simples')).toBeGreaterThan(
      energiaDeLargada(m1, L1, gT, g(30), 'simples'),
    )
  })
})
