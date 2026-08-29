import { describe, expect, it } from 'vitest'
import {
  casasDoPasso,
  desprojetar,
  dominioDe,
  dominioLogDe,
  ErroDeEscala,
  marcas,
  marcasLineares,
  marcasLogaritmicas,
  passoRedondo,
  PISO_LOG,
  projetar,
} from '../../src/render/charts/escala.js'

describe('projetar', () => {
  it('mapeia os extremos do domínio nos extremos da faixa', () => {
    const dominio = { min: 0, max: 10 }
    const faixa = { inicio: 0, fim: 100 }
    expect(projetar(0, dominio, faixa)).toBe(0)
    expect(projetar(10, dominio, faixa)).toBe(100)
    expect(projetar(5, dominio, faixa)).toBe(50)
  })

  it('aceita faixa invertida — o eixo vertical do canvas cresce para baixo', () => {
    const dominio = { min: 0, max: 10 }
    const faixa = { inicio: 200, fim: 0 }
    expect(projetar(0, dominio, faixa)).toBe(200)
    expect(projetar(10, dominio, faixa)).toBe(0)
  })

  it('devolve o centro quando o domínio é degenerado, em vez de dividir por zero', () => {
    expect(projetar(5, { min: 5, max: 5 }, { inicio: 0, fim: 100 })).toBe(50)
  })

  it('extrapola fora do domínio sem travar', () => {
    expect(projetar(20, { min: 0, max: 10 }, { inicio: 0, fim: 100 })).toBe(200)
    expect(projetar(-5, { min: 0, max: 10 }, { inicio: 0, fim: 100 })).toBe(-50)
  })

  it('na escala logarítmica, cada década ocupa a mesma distância', () => {
    const dominio = { min: 0.001, max: 10 }
    const faixa = { inicio: 0, fim: 400 }
    const decadas = [0.001, 0.01, 0.1, 1, 10].map((v) => projetar(v, dominio, faixa, 'logaritmica'))
    for (let i = 1; i < decadas.length; i++) {
      expect(decadas[i]! - decadas[i - 1]!).toBeCloseTo(100, 6)
    }
  })

  it('na logarítmica usa o módulo: o erro da série é negativo, mas o desenho é do tamanho', () => {
    const dominio = { min: 1e-6, max: 1 }
    const faixa = { inicio: 0, fim: 300 }
    expect(projetar(-0.01, dominio, faixa, 'logaritmica')).toBeCloseTo(
      projetar(0.01, dominio, faixa, 'logaritmica'),
      9,
    )
  })

  it('na logarítmica trata o zero pelo piso, sem produzir -Infinity', () => {
    const resultado = projetar(0, { min: 1e-6, max: 1 }, { inicio: 0, fim: 300 }, 'logaritmica')
    expect(Number.isFinite(resultado)).toBe(true)
  })
})

describe('desprojetar', () => {
  it('é o inverso exato de projetar na escala linear', () => {
    const dominio = { min: -3, max: 7 }
    const faixa = { inicio: 20, fim: 220 }
    for (const valor of [-3, -1, 0, 2.5, 7]) {
      const posicao = projetar(valor, dominio, faixa)
      expect(desprojetar(posicao, dominio, faixa)).toBeCloseTo(valor, 10)
    }
  })

  it('é o inverso de projetar na escala logarítmica', () => {
    const dominio = { min: 1e-4, max: 1 }
    const faixa = { inicio: 0, fim: 300 }
    for (const valor of [1e-4, 1e-3, 0.01, 0.5, 1]) {
      const posicao = projetar(valor, dominio, faixa, 'logaritmica')
      expect(desprojetar(posicao, dominio, faixa, 'logaritmica')).toBeCloseTo(valor, 8)
    }
  })

  it('devolve o mínimo quando a faixa é degenerada', () => {
    expect(desprojetar(50, { min: 2, max: 9 }, { inicio: 10, fim: 10 })).toBe(2)
  })
})

describe('passoRedondo', () => {
  it('escolhe 1, 2, 5 ou 10 vezes a potência de dez', () => {
    expect(passoRedondo(0.9)).toBeCloseTo(1, 12)
    expect(passoRedondo(1.5)).toBeCloseTo(2, 12)
    expect(passoRedondo(3)).toBeCloseTo(5, 12)
    expect(passoRedondo(7)).toBeCloseTo(10, 12)
    expect(passoRedondo(0.03)).toBeCloseTo(0.05, 12)
    expect(passoRedondo(230)).toBeCloseTo(500, 12)
  })

  it('nunca devolve passo menor que o bruto', () => {
    for (const bruto of [0.013, 0.47, 1.1, 6.6, 88, 1234]) {
      expect(passoRedondo(bruto)).toBeGreaterThanOrEqual(bruto)
    }
  })

  it('rejeita entrada não positiva ou não finita', () => {
    expect(() => passoRedondo(0)).toThrow(ErroDeEscala)
    expect(() => passoRedondo(-1)).toThrow(ErroDeEscala)
    expect(() => passoRedondo(Number.NaN)).toThrow(ErroDeEscala)
  })
})

describe('casasDoPasso', () => {
  it('dá casas suficientes para distinguir marcas vizinhas', () => {
    expect(casasDoPasso(1)).toBe(0)
    expect(casasDoPasso(10)).toBe(0)
    expect(casasDoPasso(0.5)).toBe(1)
    expect(casasDoPasso(0.05)).toBe(2)
    expect(casasDoPasso(0.002)).toBe(3)
  })

  it('limita a seis casas e tolera passo inválido', () => {
    expect(casasDoPasso(1e-12)).toBe(6)
    expect(casasDoPasso(0)).toBe(0)
  })
})

describe('marcasLineares', () => {
  it('cai em valores redondos', () => {
    const valores = marcasLineares({ min: 0, max: 10 }, 5).map((m) => m.valor)
    expect(valores).toEqual([0, 2, 4, 6, 8, 10])
  })

  it('mantém todas as marcas dentro do domínio', () => {
    for (const dominio of [
      { min: -3.7, max: 8.2 },
      { min: 1.998, max: 2.004 },
      { min: -100, max: -10 },
    ]) {
      for (const marca of marcasLineares(dominio)) {
        expect(marca.valor).toBeGreaterThanOrEqual(dominio.min - 1e-9)
        expect(marca.valor).toBeLessThanOrEqual(dominio.max + 1e-9)
      }
    }
  })

  it('produz uma quantidade próxima do alvo', () => {
    const quantidade = marcasLineares({ min: 0, max: 10 }, 6).length
    expect(quantidade).toBeGreaterThanOrEqual(4)
    expect(quantidade).toBeLessThanOrEqual(12)
  })

  it('rotula em português, com vírgula decimal', () => {
    const rotulos = marcasLineares({ min: 0, max: 1 }, 5).map((m) => m.rotulo)
    expect(rotulos).toContain('0,2')
    expect(rotulos.join(' ')).not.toContain('.')
  })

  it('não produz o rótulo "-0"', () => {
    const rotulos = marcasLineares({ min: -1, max: 1 }, 4).map((m) => m.rotulo)
    expect(rotulos).not.toContain('-0')
    expect(rotulos).not.toContain('-0,0')
    // As casas são as mesmas em todas as marcas do eixo, então o zero aparece
    // como "0,0" quando o passo tem uma casa — alinhamento é legibilidade.
    expect(rotulos).toContain('0,0')
  })

  it('devolve uma marca só quando o domínio é degenerado', () => {
    expect(marcasLineares({ min: 5, max: 5 })).toHaveLength(1)
  })

  it('rejeita alvo insuficiente', () => {
    expect(() => marcasLineares({ min: 0, max: 1 }, 1)).toThrow(ErroDeEscala)
  })
})

describe('marcasLogaritmicas', () => {
  it('produz uma marca por década', () => {
    const valores = marcasLogaritmicas({ min: 0.001, max: 10 }).map((m) => m.valor)
    expect(valores).toEqual([0.001, 0.01, 0.1, 1, 10])
  })

  it('rotula como potência de dez, com expoente sobrescrito', () => {
    const rotulos = marcasLogaritmicas({ min: 0.001, max: 1 }).map((m) => m.rotulo)
    expect(rotulos).toContain('10⁻³')
    expect(rotulos).toContain('10⁰')
  })

  it('nunca devolve lista vazia', () => {
    expect(marcasLogaritmicas({ min: 1, max: 1 }).length).toBeGreaterThan(0)
    expect(marcasLogaritmicas({ min: 0, max: 0 }).length).toBeGreaterThan(0)
  })
})

describe('marcas — despacho por tipo', () => {
  it('encaminha para a implementação correspondente', () => {
    expect(marcas({ min: 0, max: 10 }, 'linear', 5).map((m) => m.valor)).toEqual([0, 2, 4, 6, 8, 10])
    expect(marcas({ min: 0.01, max: 1 }, 'logaritmica').map((m) => m.valor)).toEqual([0.01, 0.1, 1])
  })
})

describe('dominioDe', () => {
  it('cobre os valores com folga proporcional', () => {
    const dominio = dominioDe([0, 10], 0.1)
    expect(dominio.min).toBeCloseTo(-1, 9)
    expect(dominio.max).toBeCloseTo(11, 9)
  })

  it('abre uma faixa visível para série constante — a reta da isocronia', () => {
    // No modo cicloidal, T(α) é uma horizontal: sem esta folga a curva sumiria
    // colada no eixo, e a assinatura visual da isocronia se perderia.
    const dominio = dominioDe([2.006067, 2.006067, 2.006067])
    expect(dominio.max).toBeGreaterThan(dominio.min)
    expect(dominio.min).toBeLessThan(2.006067)
    expect(dominio.max).toBeGreaterThan(2.006067)
  })

  it('trata série constante em zero sem colapsar', () => {
    const dominio = dominioDe([0, 0, 0])
    expect(dominio.max).toBeGreaterThan(dominio.min)
  })

  it('ignora valores não finitos', () => {
    const dominio = dominioDe([1, Number.NaN, 3, Number.POSITIVE_INFINITY])
    expect(dominio.min).toBeLessThan(1)
    expect(dominio.max).toBeGreaterThan(3)
    expect(Number.isFinite(dominio.min)).toBe(true)
  })

  it('devolve faixa unitária para amostra vazia', () => {
    expect(dominioDe([])).toEqual({ min: 0, max: 1 })
  })
})

describe('dominioLogDe', () => {
  it('arredonda para décadas inteiras', () => {
    expect(dominioLogDe([0.0023, 0.47])).toEqual({ min: 0.001, max: 1 })
  })

  it('usa o módulo: o erro da série é negativo', () => {
    const dominio = dominioLogDe([-0.0171, -0.0003])
    expect(dominio.min).toBeLessThanOrEqual(0.0001)
    expect(dominio.max).toBeGreaterThanOrEqual(0.1)
  })

  it('descarta zeros, que não têm lugar na escala', () => {
    const dominio = dominioLogDe([0, 0, 0.5])
    expect(dominio.min).toBeGreaterThan(0)
    expect(Number.isFinite(dominio.max)).toBe(true)
  })

  it('cai no piso quando não há valor positivo', () => {
    expect(dominioLogDe([0, 0])).toEqual({ min: PISO_LOG, max: 1 })
  })

  it('abre uma década quando todos os valores são iguais', () => {
    const dominio = dominioLogDe([0.01, 0.01])
    expect(dominio.max / dominio.min).toBeGreaterThanOrEqual(10)
  })
})
