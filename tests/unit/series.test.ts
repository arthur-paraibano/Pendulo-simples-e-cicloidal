import { describe, expect, it } from 'vitest'
import {
  coeficienteSerie,
  coeficienteSerieFracao,
  fatorModo,
  saturacaoSerie,
  somatorioSerie,
  termosNecessarios,
  termosSerie,
} from '../../src/physics/series.js'
import { ErroDeDominio, deg, grausParaRad, segundo } from '../../src/physics/units.js'

const g = (graus: number) => grausParaRad(deg(graus))

describe('coeficienteSerie', () => {
  it('reproduz os seis primeiros coeficientes da fórmula do usuário', () => {
    expect(coeficienteSerie(0)).toBe(1)
    expect(coeficienteSerie(1)).toBeCloseTo(1 / 4, 15)
    expect(coeficienteSerie(2)).toBeCloseTo(9 / 64, 15)
    expect(coeficienteSerie(3)).toBeCloseTo(25 / 256, 15)
    expect(coeficienteSerie(4)).toBeCloseTo(1225 / 16384, 15)
    expect(coeficienteSerie(5)).toBeCloseTo(3969 / 65536, 15)
  })

  it('bate com a definição [C(2n,n)/4ⁿ]² calculada por binomial', () => {
    const binomialCentral = (n: number): number => {
      let r = 1
      for (let i = 1; i <= n; i++) r = (r * (n + i)) / i
      return r
    }
    for (let n = 0; n <= 20; n++) {
      const esperado = (binomialCentral(n) / 4 ** n) ** 2
      expect(coeficienteSerie(n)).toBeCloseTo(esperado, 15)
    }
  })

  it('é estritamente decrescente e positivo', () => {
    for (let n = 1; n <= 50; n++) {
      expect(coeficienteSerie(n)).toBeGreaterThan(0)
      expect(coeficienteSerie(n)).toBeLessThan(coeficienteSerie(n - 1))
    }
  })

  it('não estoura para N grande, ao contrário do cálculo por fatoriais', () => {
    // (2·50)! é infinito em ponto flutuante; a recorrência atravessa sem problema.
    expect(Number.isFinite(coeficienteSerie(50))).toBe(true)
    expect(coeficienteSerie(50)).toBeGreaterThan(0)
  })

  it('rejeita índice não inteiro ou fora da faixa', () => {
    expect(() => coeficienteSerie(-1)).toThrow(ErroDeDominio)
    expect(() => coeficienteSerie(2.5)).toThrow(ErroDeDominio)
    expect(() => coeficienteSerie(51)).toThrow(ErroDeDominio)
  })
})

describe('coeficienteSerieFracao', () => {
  it('devolve a forma exata reduzida', () => {
    expect(coeficienteSerieFracao(0)).toBe('1')
    expect(coeficienteSerieFracao(1)).toBe('1/4')
    expect(coeficienteSerieFracao(2)).toBe('9/64')
    expect(coeficienteSerieFracao(3)).toBe('25/256')
    expect(coeficienteSerieFracao(4)).toBe('1225/16384')
    expect(coeficienteSerieFracao(5)).toBe('3969/65536')
    expect(coeficienteSerieFracao(6)).toBe('53361/1048576')
  })

  it('a fração avaliada coincide com o valor numérico', () => {
    for (let n = 0; n <= 12; n++) {
      const texto = coeficienteSerieFracao(n)
      const [num, den] = texto.includes('/') ? texto.split('/') : [texto, '1']
      expect(Number(num) / Number(den)).toBeCloseTo(coeficienteSerie(n), 15)
    }
  })

  it('rejeita índice inválido', () => {
    expect(() => coeficienteSerieFracao(-1)).toThrow(ErroDeDominio)
  })
})

describe('fatorModo — o χ(n, modo) do Princípio IV', () => {
  it('mantém todos os termos acesos no modo simples', () => {
    for (let n = 0; n <= 5; n++) expect(fatorModo(n, 'simples')).toBe(1)
  })

  it('apaga os termos de n ≥ 1 no modo cicloidal', () => {
    expect(fatorModo(0, 'cicloidal')).toBe(1)
    for (let n = 1; n <= 5; n++) expect(fatorModo(n, 'cicloidal')).toBe(0)
  })
})

describe('somatorioSerie', () => {
  it('reproduz os valores de referência do pêndulo simples', () => {
    expect(somatorioSerie(g(10), 2, 'simples')).toBeCloseTo(1.001907, 6)
    expect(somatorioSerie(g(20), 2, 'simples')).toBeCloseTo(1.007666, 6)
    expect(somatorioSerie(g(45), 2, 'simples')).toBeCloseTo(1.039628, 6)
    expect(somatorioSerie(g(90), 2, 'simples')).toBeCloseTo(1.160156, 6)
    expect(somatorioSerie(g(90), 10, 'simples')).toBeCloseTo(1.180315, 6)
    expect(somatorioSerie(g(179), 2, 'simples')).toBeCloseTo(1.390585, 6)
  })

  it('vale exatamente 1 no modo cicloidal, para qualquer amplitude e N', () => {
    // A isocronia, no nível da fórmula.
    for (const graus of [0, 5, 10, 45, 60, 90]) {
      for (const N of [0, 1, 2, 5, 50]) {
        expect(somatorioSerie(g(graus), N, 'cicloidal')).toBe(1)
      }
    }
  })

  it('reduz-se exatamente a 1 com N = 0 ou α = 0', () => {
    expect(somatorioSerie(g(90), 0, 'simples')).toBe(1)
    expect(somatorioSerie(g(0), 2, 'simples')).toBe(1)
  })

  it('cresce com a amplitude e com o número de termos', () => {
    let anterior = 1
    for (const graus of [1, 10, 30, 60, 90, 120]) {
      const v = somatorioSerie(g(graus), 2, 'simples')
      expect(v).toBeGreaterThan(anterior)
      anterior = v
    }
    let anteriorN = somatorioSerie(g(90), 1, 'simples')
    for (const N of [2, 3, 5, 10, 20]) {
      const v = somatorioSerie(g(90), N, 'simples')
      expect(v).toBeGreaterThan(anteriorN)
      anteriorN = v
    }
  })

  it('é par em α: o sinal da amplitude não altera o período', () => {
    expect(somatorioSerie(g(-45), 2, 'simples')).toBeCloseTo(
      somatorioSerie(g(45), 2, 'simples'),
      15,
    )
  })

  it('rejeita N inválido', () => {
    expect(() => somatorioSerie(g(10), -1, 'simples')).toThrow(ErroDeDominio)
    expect(() => somatorioSerie(g(10), 51, 'simples')).toThrow(ErroDeDominio)
  })
})

describe('termosSerie', () => {
  it('devolve N + 1 termos cuja soma reproduz o somatório', () => {
    const termos = termosSerie(g(45), 4, 'simples')
    expect(termos).toHaveLength(5)
    const soma = termos.reduce((acc, t) => acc + t.contribuicao, 0)
    expect(soma).toBeCloseTo(somatorioSerie(g(45), 4, 'simples'), 15)
  })

  it('expõe as contribuições exibidas na tela para α = 10°', () => {
    const termos = termosSerie(g(10), 2, 'simples')
    expect(termos[0]?.contribuicao).toBeCloseTo(1.0, 9)
    expect(termos[1]?.contribuicao).toBeCloseTo(0.001899, 6)
    expect(termos[2]?.contribuicao).toBeCloseTo(0.000008, 6)
  })

  it('apaga e zera os termos de n ≥ 1 no modo cicloidal', () => {
    const termos = termosSerie(g(90), 3, 'cicloidal')
    expect(termos[0]?.ativo).toBe(true)
    expect(termos[0]?.contribuicao).toBe(1)
    for (const t of termos.slice(1)) {
      expect(t.ativo).toBe(false)
      expect(t.contribuicao).toBe(0)
      expect(t.contribuicaoTempo).toBe(0)
      // O coeficiente continua existindo: o termo está apagado, não removido.
      expect(t.coeficiente).toBeGreaterThan(0)
    }
  })

  it('converte contribuição em segundos quando recebe T₀', () => {
    const T0 = segundo(2.006067)
    const termos = termosSerie(g(10), 2, 'simples', T0)
    expect(termos[1]?.contribuicaoTempo).toBeCloseTo(2.006067 * 0.001899, 6)
  })

  it('dá a cada termo uma âncora estável para o destaque na fórmula', () => {
    const termos = termosSerie(g(10), 2, 'simples')
    expect(termos.map((t) => t.idSlot)).toEqual(['termo-0', 'termo-1', 'termo-2'])
    expect(termos.map((t) => t.coeficienteFracao)).toEqual(['1', '1/4', '9/64'])
  })

  it('rejeita N inválido', () => {
    expect(() => termosSerie(g(10), 99, 'simples')).toThrow(ErroDeDominio)
  })
})

describe('saturacaoSerie', () => {
  it('satura em 89/64 com N = 2 — o limite quando α → 180°', () => {
    expect(saturacaoSerie(2)).toBeCloseTo(89 / 64, 15)
    expect(saturacaoSerie(2)).toBeCloseTo(1.390625, 15)
  })

  it('coincide com o limite numérico da série em α → 180°', () => {
    expect(somatorioSerie(g(179.999), 2, 'simples')).toBeCloseTo(saturacaoSerie(2), 6)
  })

  it('cresce com N mas permanece finito, enquanto o período real diverge', () => {
    expect(saturacaoSerie(0)).toBe(1)
    expect(saturacaoSerie(5)).toBeGreaterThan(saturacaoSerie(2))
    expect(Number.isFinite(saturacaoSerie(50))).toBe(true)
  })

  it('rejeita N inválido', () => {
    expect(() => saturacaoSerie(-1)).toThrow(ErroDeDominio)
  })
})

describe('termosNecessarios', () => {
  it('reproduz a tabela de convergência de research.md', () => {
    expect(termosNecessarios(g(10), 0.001)).toBe(1)
    expect(termosNecessarios(g(30), 0.001)).toBe(1)
    expect(termosNecessarios(g(30), 0.0001)).toBe(2)
    expect(termosNecessarios(g(45), 0.001)).toBe(2)
    expect(termosNecessarios(g(45), 0.0001)).toBe(3)
    expect(termosNecessarios(g(60), 0.001)).toBe(3)
    expect(termosNecessarios(g(90), 0.001)).toBe(6)
    expect(termosNecessarios(g(90), 0.0001)).toBe(9)
    expect(termosNecessarios(g(150), 0.001)).toBe(53)
  })

  it('exige mais termos conforme a amplitude cresce', () => {
    let anterior = -1
    for (const graus of [10, 30, 45, 60, 90, 120, 150]) {
      const n = termosNecessarios(g(graus), 0.001)
      expect(n).toBeGreaterThanOrEqual(anterior)
      anterior = n
    }
  })

  it('devolve −1 quando não converge dentro do teto de busca', () => {
    expect(termosNecessarios(g(179.9), 1e-9, 5)).toBe(-1)
  })

  it('rejeita erro alvo fora de (0, 1)', () => {
    expect(() => termosNecessarios(g(10), 0)).toThrow(/Erro alvo/)
    expect(() => termosNecessarios(g(10), 1)).toThrow(/Erro alvo/)
    expect(() => termosNecessarios(g(10), Number.NaN)).toThrow(/Erro alvo/)
  })
})
