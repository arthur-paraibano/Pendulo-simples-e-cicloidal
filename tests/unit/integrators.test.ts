import { describe, expect, it } from 'vitest'
import { passo, rk4, velocityVerlet, type EstadoQ } from '../../src/physics/integrators.js'
import {
  aceleracaoGeneralizada,
  anguloDaCoordenada,
  coordenadaDoAngulo,
  dinamicaIdeal,
  ehConservativo,
  exigirModeloAtritoImplementado,
  omegaZeroQuadrado,
  type ParametrosDinamica,
} from '../../src/physics/ode.js'
import { G_TERRA } from '../../src/physics/constants.js'
import {
  ErroDeDominio,
  deg,
  grausParaRad,
  kg,
  metro,
  segundo,
  type Rad,
} from '../../src/physics/units.js'

const g = (graus: number) => grausParaRad(deg(graus))
const L1 = metro(1)
const m1 = kg(1)
const idealSimples = dinamicaIdeal(L1, G_TERRA, m1, 'simples')
const idealCicloidal = dinamicaIdeal(L1, G_TERRA, m1, 'cicloidal')

describe('selecao do modelo de atrito', () => {
  it('rejeita atrito no pivo em vez de converte-lo silenciosamente', () => {
    expect(() => exigirModeloAtritoImplementado('pivo')).toThrow(/coeficiente de torque/)
    expect(exigirModeloAtritoImplementado('quadratico')).toBe('quadratico')
  })
})

const inicial = (alpha: Rad, p: ParametrosDinamica): EstadoQ => ({
  t: segundo(0),
  q: coordenadaDoAngulo(alpha, p.modo),
  qPonto: 0,
})

describe('omegaZeroQuadrado', () => {
  it('vale g/L', () => {
    expect(omegaZeroQuadrado(L1, G_TERRA)).toBeCloseTo(9.81, 12)
    expect(omegaZeroQuadrado(metro(4), G_TERRA)).toBeCloseTo(9.81 / 4, 12)
  })

  it('rejeita L ou g não positivos', () => {
    expect(() => omegaZeroQuadrado(metro(0), G_TERRA)).toThrow(ErroDeDominio)
  })
})

describe('aceleracaoGeneralizada', () => {
  it('é nula em repouso no ponto zero', () => {
    expect(aceleracaoGeneralizada(0, 0, segundo(0), idealSimples)).toBe(0)
  })

  it('usa sen q no modo simples e q no cicloidal — a única diferença', () => {
    const q = 1 // rad, bem fora do regime linear
    const aSimples = aceleracaoGeneralizada(q, 0, segundo(0), idealSimples)
    const aCicloidal = aceleracaoGeneralizada(q, 0, segundo(0), idealCicloidal)
    expect(aSimples).toBeCloseTo(-9.81 * Math.sin(1), 12)
    expect(aCicloidal).toBeCloseTo(-9.81 * 1, 12)
    expect(aSimples).not.toBeCloseTo(aCicloidal, 3)
  })

  it('as duas convergem em ângulos pequenos, e a diferença cai com q²', () => {
    const desvioRelativo = (q: number): number => {
      const aS = aceleracaoGeneralizada(q, 0, segundo(0), idealSimples)
      const aC = aceleracaoGeneralizada(q, 0, segundo(0), idealCicloidal)
      return Math.abs(aS - aC) / Math.abs(aC)
    }
    // sen q ≈ q − q³/6, então o desvio relativo é ≈ q²/6.
    expect(desvioRelativo(0.01)).toBeCloseTo(0.01 ** 2 / 6, 8)
    expect(desvioRelativo(0.001)).toBeCloseTo(0.001 ** 2 / 6, 10)
    // Cem vezes menor ao reduzir o ângulo por dez.
    expect(desvioRelativo(0.01) / desvioRelativo(0.001)).toBeCloseTo(100, 0)
  })

  it('é sempre restauradora para |q| < π', () => {
    for (const q of [0.1, 0.5, 1, 2, 3]) {
      expect(aceleracaoGeneralizada(q, 0, segundo(0), idealSimples)).toBeLessThan(0)
      expect(aceleracaoGeneralizada(-q, 0, segundo(0), idealSimples)).toBeGreaterThan(0)
    }
  })

  it('o amortecimento viscoso opõe-se à velocidade', () => {
    const p: ParametrosDinamica = { ...idealSimples, modeloAtrito: 'viscoso', gamma: 0.5 }
    const semVelocidade = aceleracaoGeneralizada(0.5, 0, segundo(0), p)
    const comVelocidade = aceleracaoGeneralizada(0.5, 2, segundo(0), p)
    expect(comVelocidade).toBeCloseTo(semVelocidade - 0.5 * 2, 12)
  })

  it('o arrasto quadrático opõe-se à velocidade e é par em módulo', () => {
    const p: ParametrosDinamica = { ...idealSimples, modeloAtrito: 'quadratico', cq: 0.3 }
    const positiva = aceleracaoGeneralizada(0, 2, segundo(0), p)
    const negativa = aceleracaoGeneralizada(0, -2, segundo(0), p)
    expect(positiva).toBeCloseTo(-0.3 * 4, 12)
    expect(negativa).toBeCloseTo(0.3 * 4, 12)
  })

  it('o forçamento entra como termo dependente do tempo', () => {
    const p: ParametrosDinamica = {
      ...idealSimples,
      amplitudeForcamento: 1,
      omegaForcamento: Math.PI,
      faseForcamento: 0,
    }
    expect(aceleracaoGeneralizada(0, 0, segundo(0), p)).toBeCloseTo(1, 12)
    expect(aceleracaoGeneralizada(0, 0, segundo(1), p)).toBeCloseTo(-1, 12)
  })
})

describe('ehConservativo', () => {
  it('só é verdadeiro sem atrito e sem forçamento', () => {
    expect(ehConservativo(idealSimples)).toBe(true)
    expect(ehConservativo({ ...idealSimples, modeloAtrito: 'viscoso', gamma: 0.1 })).toBe(false)
    expect(ehConservativo({ ...idealSimples, amplitudeForcamento: 1 })).toBe(false)
  })
})

describe('conversão coordenada ↔ ângulo', () => {
  it('é identidade no modo simples', () => {
    expect(coordenadaDoAngulo(0.7, 'simples')).toBe(0.7)
    expect(anguloDaCoordenada(0.7, 'simples')).toBe(0.7)
  })

  it('rejeita q não finito ou materialmente fora do domínio cicloidal', () => {
    expect(() => anguloDaCoordenada(Number.NaN, 'cicloidal')).toThrow(/q/)
    expect(() => anguloDaCoordenada(1.01, 'cicloidal')).toThrow(/q/)
  })

  it('no cicloidal usa q = sen θ', () => {
    expect(coordenadaDoAngulo(g(30), 'cicloidal')).toBeCloseTo(0.5, 12)
    expect(anguloDaCoordenada(0.5, 'cicloidal')).toBeCloseTo(g(30), 12)
  })

  it('é reversível e trunca ruído fora de [−1, 1]', () => {
    for (const graus of [0, 10, 45, 90]) {
      expect(anguloDaCoordenada(coordenadaDoAngulo(g(graus), 'cicloidal'), 'cicloidal')).toBeCloseTo(
        g(graus),
        12,
      )
    }
    expect(anguloDaCoordenada(1.0000000001, 'cicloidal')).toBeCloseTo(Math.PI / 2, 9)
    expect(anguloDaCoordenada(-1.0000000001, 'cicloidal')).toBeCloseTo(-Math.PI / 2, 9)
  })
})

describe('integradores: validação de passo', () => {
  it('rejeitam passo não positivo ou grande demais', () => {
    const e = inicial(g(10), idealSimples)
    for (const f of [velocityVerlet, rk4]) {
      expect(() => f(e, 0, idealSimples)).toThrow(ErroDeDominio)
      expect(() => f(e, -0.001, idealSimples)).toThrow(ErroDeDominio)
      expect(() => f(e, 0.05, idealSimples)).toThrow(ErroDeDominio)
    }
  })

  it('avançam o tempo exatamente por h', () => {
    const e = inicial(g(10), idealSimples)
    expect(velocityVerlet(e, 1 / 600, idealSimples).t).toBeCloseTo(1 / 600, 15)
    expect(rk4(e, 1 / 600, idealSimples).t).toBeCloseTo(1 / 600, 15)
  })

  it('`passo` despacha para o método escolhido', () => {
    const e = inicial(g(10), idealSimples)
    const h = 1 / 600
    expect(passo(e, h, idealSimples, 'verlet')).toEqual(velocityVerlet(e, h, idealSimples))
    expect(passo(e, h, idealSimples, 'rk4')).toEqual(rk4(e, h, idealSimples))
  })
})

describe('integradores: fidelidade ao oscilador harmônico', () => {
  // No modo cicloidal a solução exata é q(t) = q₀·cos(ω₀t) — dá para comparar
  // contra a forma fechada, sem depender de nenhuma outra parte do motor.
  const w0 = Math.sqrt(9.81)

  it('velocity-Verlet segue a solução analítica exata', () => {
    const q0 = 0.5
    let e: EstadoQ = { t: segundo(0), q: q0, qPonto: 0 }
    const h = 1 / 600
    for (let i = 0; i < 600; i++) e = velocityVerlet(e, h, idealCicloidal)
    expect(e.q).toBeCloseTo(q0 * Math.cos(w0 * e.t), 5)
    // A velocidade é de segunda ordem como a posição, porém com constante maior:
    // após 1 s o desvio é ~6×10⁻⁶ sobre uma amplitude de 1,57 — 4×10⁻⁶ relativo,
    // vinte e cinco vezes abaixo do portão de 1×10⁻⁴ da fase.
    const velocidadeExata = -q0 * w0 * Math.sin(w0 * e.t)
    expect(Math.abs(e.qPonto - velocidadeExata) / (q0 * w0)).toBeLessThan(1e-5)
  })

  it('RK4 segue a solução analítica exata', () => {
    const q0 = 0.5
    let e: EstadoQ = { t: segundo(0), q: q0, qPonto: 0 }
    const h = 1 / 600
    for (let i = 0; i < 600; i++) e = rk4(e, h, idealCicloidal)
    expect(e.q).toBeCloseTo(q0 * Math.cos(w0 * e.t), 8)
  })
})

describe('integradores: conservação de energia', () => {
  /** Energia adimensional do oscilador harmônico: ½q̇² + ½ω₀²q². */
  const energiaSHM = (e: EstadoQ): number => 0.5 * e.qPonto ** 2 + 0.5 * 9.81 * e.q ** 2

  it('velocity-Verlet mantém a energia LIMITADA por mil períodos', () => {
    // O critério de aceite da Fase 2: deriva < 0,1 % em 1000 períodos.
    let e: EstadoQ = { t: segundo(0), q: 0.5, qPonto: 0 }
    const h = 1 / 600
    const E0 = energiaSHM(e)
    const periodo = (2 * Math.PI) / Math.sqrt(9.81)
    const passos = Math.round((1000 * periodo) / h)

    let maiorDesvio = 0
    for (let i = 0; i < passos; i++) {
      e = velocityVerlet(e, h, idealCicloidal)
      maiorDesvio = Math.max(maiorDesvio, Math.abs(energiaSHM(e) - E0) / E0)
    }
    expect(maiorDesvio).toBeLessThan(0.001)
  })

  it('o desvio do Verlet oscila em vez de crescer — é isso que o torna simplético', () => {
    let e: EstadoQ = { t: segundo(0), q: 0.5, qPonto: 0 }
    const h = 1 / 600
    const E0 = energiaSHM(e)
    const desvios: number[] = []
    for (let ciclo = 0; ciclo < 10; ciclo++) {
      for (let i = 0; i < 1000; i++) e = velocityVerlet(e, h, idealCicloidal)
      desvios.push(Math.abs(energiaSHM(e) - E0) / E0)
    }
    // Se houvesse deriva monotônica, o último desvio seria muito maior que o primeiro.
    const crescimento = Math.max(...desvios) / Math.max(Math.min(...desvios), 1e-18)
    expect(Math.max(...desvios)).toBeLessThan(0.001)
    expect(Number.isFinite(crescimento)).toBe(true)
  })

  it('também conserva no pêndulo simples, fora do regime linear', () => {
    const energiaSimples = (e: EstadoQ): number =>
      0.5 * e.qPonto ** 2 + 9.81 * (1 - Math.cos(e.q))
    let e: EstadoQ = { t: segundo(0), q: g(90), qPonto: 0 }
    const h = 1 / 600
    const E0 = energiaSimples(e)
    let maiorDesvio = 0
    for (let i = 0; i < 100_000; i++) {
      e = velocityVerlet(e, h, idealSimples)
      maiorDesvio = Math.max(maiorDesvio, Math.abs(energiaSimples(e) - E0) / E0)
    }
    expect(maiorDesvio).toBeLessThan(0.001)
  })
})

describe('integradores: dissipação', () => {
  it('o amortecimento viscoso reduz a energia monotonicamente', () => {
    const p: ParametrosDinamica = { ...idealCicloidal, modeloAtrito: 'viscoso', gamma: 0.4 }
    const energiaSHM = (e: EstadoQ): number => 0.5 * e.qPonto ** 2 + 0.5 * 9.81 * e.q ** 2
    let e: EstadoQ = { t: segundo(0), q: 0.5, qPonto: 0 }
    let energiaAnterior = energiaSHM(e)
    for (let ciclo = 0; ciclo < 20; ciclo++) {
      for (let i = 0; i < 600; i++) e = velocityVerlet(e, 1 / 600, p)
      const atual = energiaSHM(e)
      expect(atual).toBeLessThan(energiaAnterior)
      energiaAnterior = atual
    }
  })

  it('a amplitude decai exponencialmente com a taxa prevista', () => {
    // Para q̈ = −ω₀²q − γq̇, a envoltória decai como exp(−γt/2).
    const gamma = 0.2
    const p: ParametrosDinamica = { ...idealCicloidal, modeloAtrito: 'viscoso', gamma }
    let e: EstadoQ = { t: segundo(0), q: 0.5, qPonto: 0 }
    const h = 1 / 2000
    const alvo = 10
    let maximo = 0
    while (e.t < alvo) {
      e = velocityVerlet(e, h, p)
      if (e.t > alvo - 0.1) maximo = Math.max(maximo, Math.abs(e.q))
    }
    expect(maximo).toBeCloseTo(0.5 * Math.exp((-gamma * alvo) / 2), 2)
  })
})
