import { describe, expect, it } from 'vitest'
import {
  alturaParaAngulo,
  amostrarTrajetoria,
  amplitudeMaximaCicloidal,
  anguloParaAltura,
  comprimentoDoFio,
  pontoCicloide,
  pontoZero,
  raioGerador,
  trajetoriaMassa,
} from '../../src/physics/cycloid.js'
import { ErroDeDominio, deg, grausParaRad, metro, rad } from '../../src/physics/units.js'

const g = (graus: number) => grausParaRad(deg(graus))
const L1 = metro(1)
const r1 = raioGerador(L1) // 0,25 m

/**
 * Comprimento de arco da trajetória por quadratura de Simpson sobre a curva
 * paramétrica — caminho totalmente independente da forma fechada `s = L·sen θ`.
 * É este teste que impede uma geometria plausível mas errada.
 */
function arcoPorQuadratura(r: number, theta: number, subdivisoes = 20_000): number {
  const velocidade = (t: number): number => {
    const dx = 2 * r * (1 + Math.cos(2 * t))
    const dy = 2 * r * Math.sin(2 * t)
    return Math.hypot(dx, dy)
  }
  const h = theta / subdivisoes
  let soma = velocidade(0) + velocidade(theta)
  for (let i = 1; i < subdivisoes; i++) soma += velocidade(i * h) * (i % 2 === 0 ? 2 : 4)
  return (h / 3) * soma
}

describe('vínculo L = 4r', () => {
  it('converte nos dois sentidos', () => {
    expect(raioGerador(L1)).toBeCloseTo(0.25, 15)
    expect(comprimentoDoFio(metro(0.25))).toBeCloseTo(1, 15)
  })

  it('é reversível', () => {
    for (const L of [0.05, 1, 2.5, 10]) {
      expect(comprimentoDoFio(raioGerador(metro(L)))).toBeCloseTo(L, 12)
    }
  })

  it('rejeita comprimentos não positivos', () => {
    expect(() => raioGerador(metro(0))).toThrow(ErroDeDominio)
    expect(() => comprimentoDoFio(metro(-1))).toThrow(ErroDeDominio)
  })
})

describe('pontoCicloide — a curva geradora das faces', () => {
  it('tem a cúspide na origem', () => {
    const p = pontoCicloide(r1, rad(0))
    expect(p.x).toBeCloseTo(0, 15)
    expect(p.y).toBeCloseTo(0, 15)
  })

  it('tem o ponto mais baixo em (rπ, −2r)', () => {
    const p = pontoCicloide(r1, rad(Math.PI))
    expect(p.x).toBeCloseTo(r1 * Math.PI, 12)
    expect(p.y).toBeCloseTo(-2 * r1, 12)
  })

  it('rejeita raio não positivo', () => {
    expect(() => pontoCicloide(metro(0), rad(1))).toThrow(ErroDeDominio)
  })
})

describe('trajetoriaMassa', () => {
  it('no ponto zero o fio está todo livre e a massa está na origem', () => {
    const e = trajetoriaMassa(r1, rad(0))
    expect(e.posicao.x).toBeCloseTo(0, 15)
    expect(e.posicao.y).toBeCloseTo(0, 15)
    expect(e.s).toBeCloseTo(0, 15)
    expect(e.comprimentoLivre).toBeCloseTo(1, 15)
    expect(e.comprimentoEnrolado).toBeCloseTo(0, 15)
    expect(e.altura).toBeCloseTo(0, 15)
  })

  it('mantém o invariante pitagórico s² + ℓ² = L² para todo θ', () => {
    // Este é o invariante que realmente valida a geometria — e não a soma
    // livre + enrolado = L, que é verdadeira por construção.
    for (let graus = -90; graus <= 90; graus += 3) {
      const e = trajetoriaMassa(r1, g(graus))
      expect(e.s ** 2 + e.comprimentoLivre ** 2).toBeCloseTo(1, 12)
    }
  })

  it('conserva o comprimento total do fio', () => {
    for (const graus of [0, 15, 30, 45, 60, 90]) {
      const e = trajetoriaMassa(r1, g(graus))
      expect(e.comprimentoLivre + e.comprimentoEnrolado).toBeCloseTo(1, 12)
    }
  })

  it('o comprimento livre encurta como L·cos θ — a compensação de Huygens', () => {
    for (const graus of [0, 30, 45, 60, 90]) {
      const e = trajetoriaMassa(r1, g(graus))
      expect(e.comprimentoLivre).toBeCloseTo(Math.cos(g(graus)), 12)
    }
    // Encurtamento monotônico.
    expect(trajetoriaMassa(r1, g(60)).comprimentoLivre).toBeLessThan(
      trajetoriaMassa(r1, g(30)).comprimentoLivre,
    )
  })

  it('o arco fechado s = L·sen θ bate com a quadratura da curva paramétrica', () => {
    for (const graus of [10, 30, 45, 60, 90]) {
      const e = trajetoriaMassa(r1, g(graus))
      expect(e.s).toBeCloseTo(arcoPorQuadratura(r1, g(graus)), 9)
    }
  })

  it('é ímpar em θ na posição e no arco, e par na altura', () => {
    const mais = trajetoriaMassa(r1, g(45))
    const menos = trajetoriaMassa(r1, g(-45))
    expect(menos.posicao.x).toBeCloseTo(-mais.posicao.x, 12)
    expect(menos.s).toBeCloseTo(-mais.s, 12)
    expect(menos.posicao.y).toBeCloseTo(mais.posicao.y, 12)
    expect(menos.altura).toBeCloseTo(mais.altura, 12)
  })

  it('no limite de 90° a massa alcança a cúspide, a 2r de altura', () => {
    const e = trajetoriaMassa(r1, g(90))
    expect(e.s).toBeCloseTo(1, 12)
    expect(e.comprimentoLivre).toBeCloseTo(0, 12)
    expect(e.altura).toBeCloseTo(2 * r1, 12)
    expect(e.posicao.x).toBeCloseTo(r1 * Math.PI, 12)
  })

  it('a corda nunca excede o arco', () => {
    for (const graus of [10, 30, 45, 60, 90]) {
      const e = trajetoriaMassa(r1, g(graus))
      const corda = Math.hypot(e.posicao.x, e.posicao.y)
      expect(corda).toBeLessThanOrEqual(Math.abs(e.s) + 1e-12)
    }
  })

  it('recusa amplitudes acima de 90°, por não haver fio para desenrolar', () => {
    expect(() => trajetoriaMassa(r1, g(91))).toThrow(ErroDeDominio)
    expect(() => trajetoriaMassa(r1, g(-91))).toThrow(ErroDeDominio)
    expect(() => trajetoriaMassa(r1, g(120))).toThrow(/90°/)
    expect(() => trajetoriaMassa(r1, Number.NaN as never)).toThrow(ErroDeDominio)
  })
})

describe('amplitudeMaximaCicloidal e pontoZero', () => {
  it('a amplitude máxima é 90° em radianos', () => {
    expect(amplitudeMaximaCicloidal()).toBeCloseTo(Math.PI / 2, 15)
  })

  it('o ponto zero é a origem — onde o sensor fica fixo', () => {
    expect(pontoZero()).toEqual({ x: 0, y: 0 })
  })
})

describe('altura de largada', () => {
  it('segue h = L·sen²θ / 2', () => {
    expect(alturaParaAngulo(L1, g(30))).toBeCloseTo(0.125, 12)
    expect(alturaParaAngulo(L1, g(45))).toBeCloseTo(0.25, 12)
    expect(alturaParaAngulo(L1, g(60))).toBeCloseTo(0.375, 12)
    expect(alturaParaAngulo(L1, g(90))).toBeCloseTo(0.5, 12)
  })

  it('no topo vale L/2, que é a altura 2r da cicloide', () => {
    expect(alturaParaAngulo(L1, g(90))).toBeCloseTo(2 * r1, 12)
  })

  it('coincide com a altura devolvida pela trajetória', () => {
    for (const graus of [10, 45, 90]) {
      expect(alturaParaAngulo(L1, g(graus))).toBeCloseTo(trajetoriaMassa(r1, g(graus)).altura, 12)
    }
  })

  it('é reversível: ângulo → altura → ângulo', () => {
    for (const graus of [0, 10, 30, 45, 60, 90]) {
      const h = alturaParaAngulo(L1, g(graus))
      expect(anguloParaAltura(L1, h)).toBeCloseTo(g(graus), 10)
    }
  })

  it('recusa altura acima do topo da face', () => {
    expect(() => anguloParaAltura(L1, metro(0.6))).toThrow(ErroDeDominio)
    expect(() => anguloParaAltura(L1, metro(-0.1))).toThrow(ErroDeDominio)
    expect(() => anguloParaAltura(L1, Number.NaN as never)).toThrow(ErroDeDominio)
    expect(() => alturaParaAngulo(metro(0), g(45))).toThrow(ErroDeDominio)
  })
})

describe('amostrarTrajetoria', () => {
  it('devolve passos + 1 pontos, simétricos em torno do ponto zero', () => {
    const pontos = amostrarTrajetoria(r1, g(45), 8)
    expect(pontos).toHaveLength(9)
    expect(pontos[0]?.x).toBeCloseTo(-(pontos[8]?.x ?? 0), 12)
    expect(pontos[4]?.x).toBeCloseTo(0, 12)
    expect(pontos[4]?.y).toBeCloseTo(0, 12)
  })

  it('produz uma curva monotônica em x', () => {
    const pontos = amostrarTrajetoria(r1, g(90), 64)
    for (let i = 1; i < pontos.length; i++) {
      expect(pontos[i]!.x).toBeGreaterThan(pontos[i - 1]!.x)
    }
  })

  it('rejeita número de passos inválido', () => {
    expect(() => amostrarTrajetoria(r1, g(45), 0)).toThrow(ErroDeDominio)
    expect(() => amostrarTrajetoria(r1, g(45), 2.5)).toThrow(ErroDeDominio)
  })
})
