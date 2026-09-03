/**
 * Roteiros guiados e o desafio do Planeta X (RF-100, RF-101, RF-104).
 *
 * Um roteiro é uma lista de passos curtos; cada passo aplica uma configuração e
 * propõe uma pergunta. O progresso vive aqui, fora do DOM, para que "alterar um
 * parâmetro à mão não encerra o roteiro" (RF-101) possa ser provado por teste
 * em vez de conferido clicando.
 */

import type { ValorParametro } from './tipos.js'
import { periodoExato } from '../physics/period.js'
import { grausParaRad, deg, metro, mPorS2 } from '../physics/units.js'
import type { Store } from './store.js'

export interface PassoRoteiro {
  readonly titulo: string
  /** A pergunta que o passo propõe. É o que o torna um roteiro, e não um tour. */
  readonly pergunta: string
  readonly parametros: Readonly<Record<string, ValorParametro>>
}

export interface Roteiro {
  readonly id: string
  readonly nome: string
  readonly descricao: string
  readonly passos: readonly PassoRoteiro[]
}

export const ROTEIROS: readonly Roteiro[] = [
  {
    id: 'por-que-a-amplitude-importa',
    nome: 'Por que a amplitude importa',
    descricao: 'De onde vem o erro da fórmula que a escola ensina.',
    passos: [
      {
        titulo: 'A fórmula que você aprendeu',
        pergunta: 'A 5°, quanto a série truncada difere do valor exato?',
        parametros: { modo: 'simples', L: 1, g: 9.81, theta0: 5, N: 2 },
      },
      {
        titulo: 'Amplitude grande',
        pergunta: 'A 90°, o período cresce 16 %. Isso é erro de medição ou de modelo?',
        parametros: { theta0: 90 },
      },
      {
        titulo: 'Mais termos',
        pergunta: 'Com N = 10 o erro cai para 0,002 %. Por que ele nunca chega a zero?',
        parametros: { N: 10 },
      },
      {
        titulo: 'Perto de 180°',
        pergunta: 'A 179°, nem 50 termos bastam. O que acontece com o pêndulo nesse limite?',
        parametros: { theta0: 179, N: 50 },
      },
    ],
  },
  {
    id: 'a-tautocrona-de-huygens',
    nome: 'A tautócrona de Huygens',
    descricao: 'Por que a face cicloidal faz o período parar de depender da amplitude.',
    passos: [
      {
        titulo: 'O problema',
        pergunta: 'No simples, duas amplitudes dão dois períodos. Como fazer um relógio assim?',
        parametros: { modo: 'simples', L: 1, theta0: 45, N: 2 },
      },
      {
        titulo: 'A solução de 1659',
        pergunta: 'Na face cicloidal, mude a amplitude. Por que o período não se mexe?',
        parametros: { modo: 'cicloidal', theta0: 45 },
      },
      {
        titulo: 'Três massas',
        pergunta: 'Soltas de alturas diferentes, elas chegam juntas. O que se cancela?',
        parametros: { numeroPendulos: 3, fonteMovimento: 'integracao' },
      },
    ],
  },
]

export interface EstadoRoteiro {
  readonly roteiro: Roteiro
  readonly indice: number
  readonly passo: PassoRoteiro
  readonly primeiro: boolean
  readonly ultimo: boolean
}

/**
 * Progresso de um roteiro em curso.
 *
 * O passo é aplicado sobre o estado corrente, sem restaurar os padrões: mexer
 * num parâmetro e seguir para o próximo passo tem de preservar o que se mexeu,
 * ou o roteiro deixaria de ser uma exploração e viraria um trilho (RF-101).
 */
export class ProgressoRoteiro {
  private indiceAtual = 0

  constructor(private readonly roteiro: Roteiro) {}

  get estado(): EstadoRoteiro {
    return {
      roteiro: this.roteiro,
      indice: this.indiceAtual,
      passo: this.roteiro.passos[this.indiceAtual]!,
      primeiro: this.indiceAtual === 0,
      ultimo: this.indiceAtual === this.roteiro.passos.length - 1,
    }
  }

  aplicar(store: Store): void {
    // O índice é mantido dentro da faixa por `avancar`, `voltar` e `irPara`,
    // então o passo existe sempre.
    const passo = this.roteiro.passos[this.indiceAtual]!
    store.emLote(() => {
      for (const [id, valor] of Object.entries(passo.parametros)) {
        store.definirIndexado(id, null, valor, 'roteiro')
      }
    })
  }

  avancar(store: Store): boolean {
    if (this.indiceAtual >= this.roteiro.passos.length - 1) return false
    this.indiceAtual += 1
    this.aplicar(store)
    return true
  }

  voltar(store: Store): boolean {
    if (this.indiceAtual === 0) return false
    this.indiceAtual -= 1
    this.aplicar(store)
    return true
  }

  irPara(indice: number, store: Store): boolean {
    if (!Number.isInteger(indice) || indice < 0 || indice >= this.roteiro.passos.length) {
      return false
    }
    this.indiceAtual = indice
    this.aplicar(store)
    return true
  }
}

export function buscarRoteiro(id: string): Roteiro | undefined {
  return ROTEIROS.find((r) => r.id === id)
}

// ── Desafio do Planeta X (RF-104) ────────────────────────────────────────────

export interface ResultadoDesafio {
  readonly estimativa: number
  readonly verdadeiro: number
  readonly erroRelativo: number
  /** Fração do erro, em porcentagem com sinal. */
  readonly erroPercentual: number
  readonly acertou: boolean
}

/** Tolerância de acerto: 1 % é o que uma medição cuidadosa alcança. */
export const TOLERANCIA_DESAFIO = 0.01

/**
 * Confere a estimativa de `g` contra o valor verdadeiro.
 *
 * A comparação só existe **depois** da submissão: enquanto o desafio está
 * ativo, revelar o valor tiraria o sentido de medir (RF-104).
 */
export function conferirDesafio(estimativa: number, verdadeiro: number): ResultadoDesafio {
  const erroRelativo = (estimativa - verdadeiro) / verdadeiro
  return {
    estimativa,
    verdadeiro,
    erroRelativo,
    erroPercentual: erroRelativo * 100,
    acertou: Math.abs(erroRelativo) <= TOLERANCIA_DESAFIO,
  }
}

/** O valor de `g` deve aparecer, ou o desafio está em curso? */
export function gravidadeOculta(store: Store): boolean {
  return store.booleano('desafioPlanetaX') && !store.booleano('desafioSubmetido')
}

/**
 * Estima `g` a partir de um período medido, invertendo o período exato.
 *
 * Inverte por bisseção em vez de usar a fórmula de pequenos ângulos: é
 * justamente a diferença entre as duas que o desafio ensina, e a 60° a versão
 * ingênua erra 13 %.
 */
export function estimarGravidade(
  T: number,
  L: number,
  alphaGraus: number,
  modo: 'simples' | 'cicloidal',
): number {
  if (!(T > 0) || !(L > 0)) return Number.NaN
  const alpha = grausParaRad(deg(Math.abs(alphaGraus)))
  const periodoCom = (g: number): number => periodoExato(metro(L), mPorS2(g), alpha, modo)

  // O período decresce monotonicamente com g, então a bisseção é segura.
  let baixo = 0.01
  let alto = 100
  for (let i = 0; i < 200; i++) {
    const meio = (baixo + alto) / 2
    if (periodoCom(meio) > T) baixo = meio
    else alto = meio
  }
  return (baixo + alto) / 2
}
