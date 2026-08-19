import { describe, expect, it } from 'vitest'
import { agm, integralElipticaK, razaoPeriodoExata } from '../../src/physics/elliptic.js'
import { ErroDeDominio, deg, grausParaRad } from '../../src/physics/units.js'

const g = (graus: number) => grausParaRad(deg(graus))

/** Caminho independente: quadratura de Simpson sobre a integral elíptica. */
function KporQuadratura(k: number, subdivisoes = 100_000): number {
  const f = (u: number) => 1 / Math.sqrt(1 - k * k * Math.sin(u) ** 2)
  const a = 0
  const b = Math.PI / 2
  const h = (b - a) / subdivisoes
  let soma = f(a) + f(b)
  for (let i = 1; i < subdivisoes; i++) soma += f(a + i * h) * (i % 2 === 0 ? 2 : 4)
  return (h / 3) * soma
}

describe('agm', () => {
  it('é idempotente para argumentos iguais', () => {
    expect(agm(1, 1)).toBe(1)
    expect(agm(7.5, 7.5)).toBeCloseTo(7.5, 15)
  })

  it('fica entre os dois argumentos', () => {
    const m = agm(1, 0.5)
    expect(m).toBeGreaterThan(0.5)
    expect(m).toBeLessThan(1)
  })

  it('é simétrica', () => {
    expect(agm(1, 0.3)).toBeCloseTo(agm(0.3, 1), 15)
  })

  it('converge quadraticamente: cinco iterações bastam para um double', () => {
    // Reproduz a iteração à mão e confere que já estabilizou em cinco passos.
    let x = 1
    let y = Math.cos(Math.PI / 4)
    for (let i = 0; i < 5; i++) [x, y] = [(x + y) / 2, Math.sqrt(x * y)]
    expect(x).toBeCloseTo(agm(1, Math.cos(Math.PI / 4)), 15)
  })

  it('não entra em ciclo-limite nos casos que quebram a parada por igualdade', () => {
    // Constituição, Princípio I, regra 5: α = 90° e α = 179° são os casos citados.
    for (const graus of [90, 179, 179.9]) {
      const valor = agm(1, Math.cos(g(graus) / 2))
      expect(Number.isFinite(valor)).toBe(true)
      expect(valor).toBeGreaterThan(0)
    }
  })

  it('rejeita argumentos não positivos', () => {
    expect(() => agm(0, 1)).toThrow(ErroDeDominio)
    expect(() => agm(1, -1)).toThrow(ErroDeDominio)
    expect(() => agm(Number.NaN, 1)).toThrow(ErroDeDominio)
  })
})

describe('integralElipticaK', () => {
  it('vale π/2 em k = 0', () => {
    expect(integralElipticaK(0)).toBeCloseTo(Math.PI / 2, 15)
  })

  it('concorda com a quadratura numérica, que é um caminho independente', () => {
    for (const k of [0.1, 0.3, 0.5, 0.7071067811865476, 0.9]) {
      expect(integralElipticaK(k)).toBeCloseTo(KporQuadratura(k), 10)
    }
  })

  it('é crescente e nunca menor que π/2', () => {
    let anterior = Math.PI / 2
    for (const k of [0.1, 0.3, 0.5, 0.7, 0.9, 0.99]) {
      const K = integralElipticaK(k)
      expect(K).toBeGreaterThan(anterior)
      anterior = K
    }
  })

  it('rejeita k fora de [0, 1)', () => {
    expect(() => integralElipticaK(1)).toThrow(ErroDeDominio)
    expect(() => integralElipticaK(-0.1)).toThrow(ErroDeDominio)
    expect(() => integralElipticaK(1.5)).toThrow(ErroDeDominio)
    expect(() => integralElipticaK(Number.NaN)).toThrow(ErroDeDominio)
  })
})

describe('razaoPeriodoExata', () => {
  it('reproduz a coluna "exato" da tabela de referência', () => {
    expect(razaoPeriodoExata(g(10))).toBeCloseTo(1.001907, 6)
    expect(razaoPeriodoExata(g(20))).toBeCloseTo(1.007669, 6)
    expect(razaoPeriodoExata(g(45))).toBeCloseTo(1.039973, 6)
    expect(razaoPeriodoExata(g(90))).toBeCloseTo(1.180341, 6)
    expect(razaoPeriodoExata(g(120))).toBeCloseTo(1.372881, 6)
    expect(razaoPeriodoExata(g(179))).toBeCloseTo(3.901065, 6)
  })

  it('vale exatamente 1 em α = 0', () => {
    expect(razaoPeriodoExata(g(0))).toBe(1)
  })

  it('coincide com (2/π)·K(sen(α/2))', () => {
    for (const graus of [10, 45, 90, 150]) {
      const k = Math.sin(g(graus) / 2)
      expect(razaoPeriodoExata(g(graus))).toBeCloseTo((2 / Math.PI) * integralElipticaK(k), 12)
    }
  })

  it('cresce monotonicamente e diverge ao se aproximar de 180°', () => {
    let anterior = 1
    for (const graus of [1, 10, 45, 90, 150, 179, 179.9]) {
      const v = razaoPeriodoExata(g(graus))
      expect(v).toBeGreaterThan(anterior)
      anterior = v
    }
    // Em 179,9° o período real já é mais de quatro vezes o de pequenas oscilações,
    // enquanto a série truncada em N = 2 está presa em 1,39.
    expect(razaoPeriodoExata(g(179.9))).toBeGreaterThan(4)
  })

  it('é par: o sinal da amplitude não importa', () => {
    expect(razaoPeriodoExata(g(-45))).toBeCloseTo(razaoPeriodoExata(g(45)), 15)
  })

  it('rejeita amplitudes de 180° ou mais', () => {
    expect(() => razaoPeriodoExata(g(180))).toThrow(ErroDeDominio)
    expect(() => razaoPeriodoExata(g(200))).toThrow(ErroDeDominio)
    expect(() => razaoPeriodoExata(Number.NaN as never)).toThrow(ErroDeDominio)
  })
})
