import { describe, expect, it } from 'vitest'
import {
  buscarRoteiro,
  conferirDesafio,
  estimarGravidade,
  gravidadeOculta,
  ProgressoRoteiro,
  ROTEIROS,
  TOLERANCIA_DESAFIO,
} from '../../src/state/roteiros.js'
import { Store } from '../../src/state/store.js'
import { POR_ID } from '../../src/state/schema.js'

describe('catálogo de roteiros', () => {
  it('todo passo aplica parâmetros que existem', () => {
    for (const roteiro of ROTEIROS) {
      for (const passo of roteiro.passos) {
        for (const id of Object.keys(passo.parametros)) {
          expect(POR_ID.has(id), `${roteiro.id}: ${id}`).toBe(true)
        }
      }
    }
  })

  it('todo passo propõe uma pergunta — é o que o faz roteiro, e não passeio', () => {
    for (const roteiro of ROTEIROS) {
      expect(roteiro.passos.length).toBeGreaterThan(0)
      for (const passo of roteiro.passos) {
        expect(passo.pergunta.trim()).not.toBe('')
        expect(passo.pergunta).toContain('?')
      }
    }
  })

  it('os identificadores são únicos', () => {
    expect(new Set(ROTEIROS.map((r) => r.id)).size).toBe(ROTEIROS.length)
  })

  it('busca por identificador', () => {
    expect(buscarRoteiro('a-tautocrona-de-huygens')?.passos).toHaveLength(3)
    expect(buscarRoteiro('inexistente')).toBeUndefined()
  })
})

describe('ProgressoRoteiro (RF-100, RF-101)', () => {
  const progresso = (): { p: ProgressoRoteiro; s: Store } => ({
    p: new ProgressoRoteiro(buscarRoteiro('por-que-a-amplitude-importa')!),
    s: new Store(),
  })

  it('começa no primeiro passo', () => {
    const { p } = progresso()
    expect(p.estado.indice).toBe(0)
    expect(p.estado.primeiro).toBe(true)
    expect(p.estado.ultimo).toBe(false)
  })

  it('aplicar escreve a configuração do passo', () => {
    const { p, s } = progresso()
    p.aplicar(s)
    expect(s.numero('theta0')).toBeCloseTo(5, 6)
    expect(s.numero('N')).toBe(2)
  })

  it('avança e volta pelos passos', () => {
    const { p, s } = progresso()
    p.aplicar(s)
    expect(p.avancar(s)).toBe(true)
    expect(s.numero('theta0')).toBeCloseTo(90, 6)
    expect(p.voltar(s)).toBe(true)
    expect(s.numero('theta0')).toBeCloseTo(5, 6)
  })

  it('não passa das bordas', () => {
    const { p, s } = progresso()
    expect(p.voltar(s)).toBe(false)
    while (p.avancar(s)) {
      /* até o fim */
    }
    expect(p.estado.ultimo).toBe(true)
    expect(p.avancar(s)).toBe(false)
  })

  it('alterar um parâmetro à mão não encerra nem rebobina o roteiro (RF-101)', () => {
    const { p, s } = progresso()
    p.aplicar(s)
    p.avancar(s)
    s.definirParametro('L', 2)
    expect(p.estado.indice).toBe(1)

    // E o que foi mexido à mão sobrevive ao passo seguinte, porque o passo
    // escreve por cima do estado corrente em vez de restaurar os padrões.
    p.avancar(s)
    expect(s.numero('L')).toBe(2)
    expect(s.numero('N')).toBe(10)
  })

  it('salta direto para um passo, recusando índice fora da faixa', () => {
    const { p, s } = progresso()
    expect(p.irPara(2, s)).toBe(true)
    expect(p.estado.indice).toBe(2)
    expect(p.irPara(99, s)).toBe(false)
    expect(p.irPara(-1, s)).toBe(false)
    expect(p.irPara(1.5, s)).toBe(false)
    expect(p.estado.indice).toBe(2)
  })
})

describe('desafio do Planeta X (RF-104)', () => {
  it('a gravidade fica oculta enquanto o desafio corre', () => {
    const s = new Store()
    expect(gravidadeOculta(s)).toBe(false)
    s.definirParametro('desafioPlanetaX', true)
    expect(gravidadeOculta(s)).toBe(true)
    s.definirParametro('desafioSubmetido', true)
    expect(gravidadeOculta(s)).toBe(false)
  })

  it('confere a estimativa e classifica o acerto', () => {
    const bom = conferirDesafio(14.15, 14.2)
    expect(bom.acertou).toBe(true)
    expect(bom.erroPercentual).toBeCloseTo(-0.352, 2)

    const ruim = conferirDesafio(12.4, 14.2)
    expect(ruim.acertou).toBe(false)
    expect(ruim.erroPercentual).toBeCloseTo(-12.68, 1)
  })

  it('a tolerância é simétrica em torno do valor verdadeiro', () => {
    const g = 14.2
    expect(conferirDesafio(g * (1 + TOLERANCIA_DESAFIO), g).acertou).toBe(true)
    expect(conferirDesafio(g * (1 - TOLERANCIA_DESAFIO), g).acertou).toBe(true)
    expect(conferirDesafio(g * 1.011, g).acertou).toBe(false)
  })
})

describe('estimarGravidade', () => {
  it('recupera a gravidade do período medido, em pequena amplitude', () => {
    // T₀ = 2π√(L/g) com L = 1 e g = 9,81 dá 2,006067 s.
    expect(estimarGravidade(2.006067, 1, 0.001, 'simples')).toBeCloseTo(9.81, 4)
  })

  it('recupera mesmo em amplitude grande, porque usa o período exato', () => {
    // A 60°, o período exato com g = 9,81 é 2,153 s. A fórmula ingênua
    // devolveria ≈ 8,5 m/s², errando 13 % — que é a lição do Cenário 8.4.
    const T = 2.1531
    expect(estimarGravidade(T, 1, 60, 'simples')).toBeCloseTo(9.81, 2)
    const ingenuo = (4 * Math.PI ** 2 * 1) / T ** 2
    expect(Math.abs(ingenuo - 9.81) / 9.81).toBeGreaterThan(0.12)
  })

  it('no cicloidal a amplitude não interfere', () => {
    expect(estimarGravidade(2.006067, 1, 5, 'cicloidal')).toBeCloseTo(9.81, 4)
    expect(estimarGravidade(2.006067, 1, 80, 'cicloidal')).toBeCloseTo(9.81, 4)
  })

  it('descobre a gravidade do Planeta X', () => {
    const T = 2 * Math.PI * Math.sqrt(1 / 14.2)
    expect(estimarGravidade(T, 1, 0.001, 'simples')).toBeCloseTo(14.2, 3)
  })

  it('recusa entrada sem sentido físico em vez de devolver número inventado', () => {
    expect(estimarGravidade(0, 1, 10, 'simples')).toBeNaN()
    expect(estimarGravidade(-1, 1, 10, 'simples')).toBeNaN()
    expect(estimarGravidade(2, 0, 10, 'simples')).toBeNaN()
  })
})
