/**
 * Sensor **fixo no ponto zero** — a barreira óptica do roteiro alemão.
 *
 * Detecta cada passagem da massa pelo ponto mais baixo da trajetória e devolve
 * o instante **interpolado** do cruzamento. A posição é constante e não
 * arrastável (RF-134): é essa fixação que torna as medições comparáveis entre
 * execuções, e no modo cicloidal ela coincide com a cúspide inferior, ponto
 * comum a todas as trajetórias qualquer que seja a amplitude de largada.
 *
 * ## Por que interpolar
 *
 * Sem interpolação, a resolução do período ficaria limitada ao passo de
 * integração — com `h = 1/600 s`, cerca de 1,7 ms. A diferença que o produto
 * precisa demonstrar é de **+3,826 ms** entre α = 0 e α = 10° (L = 1 m): o
 * efeito ficaria afogado no ruído de discretização. Interpolando linearmente o
 * instante do cruzamento, o erro cai para a ordem de `h²` e some do problema.
 *
 * ## Convenção de leitura (RF-137)
 *
 *   passagens consecutivas      → **meio período**
 *   passagens de mesmo sentido  → **período completo**
 *
 * A barreira de luz do roteiro alemão mede meio período, e confundir as duas
 * grandezas é o erro mais comum ao reproduzir o experimento — por isso a
 * grandeza exibida é sempre rotulada.
 */

import type { EstadoQ } from './integrators.js'
import { ErroDeDominio, segundo, type Segundo } from './units.js'

export type ModoContagem = 'meioPeriodo' | 'periodoCompleto'

export interface EventoPassagem {
  /** Instante interpolado do cruzamento. */
  readonly t: Segundo
  /** Sinal da velocidade generalizada no cruzamento. */
  readonly sentido: -1 | 1
  /** Velocidade generalizada no instante do cruzamento. */
  readonly qPonto: number
  /** Contador desde o início da medição. */
  readonly numeroTravessia: number
}

/** Duas passagens do mesmo sentido, com a intermediária, bastam para T. */
export const MAX_EVENTOS_SENSOR = 3

/**
 * Detecta a passagem por `q = 0` entre dois passos consecutivos e interpola o
 * instante:
 *
 *     t_cruz = t_ant + h · q_ant / (q_ant − q_atual)
 *
 * @returns o evento, ou `null` se não houve cruzamento neste passo.
 */
export function detectarCruzamento(
  anterior: EstadoQ,
  atual: EstadoQ,
  numeroTravessia = 0,
): EventoPassagem | null {
  const h = atual.t - anterior.t
  if (!(h > 0)) {
    throw new ErroDeDominio('h', h, 'os dois estados devem estar separados por um passo positivo')
  }

  const q0 = anterior.q
  const q1 = atual.q

  // Sem troca de sinal não há passagem. Tocar o zero e voltar sem atravessar
  // (q1 === 0 com q0 e o passo seguinte do mesmo lado) é tratado no passo
  // seguinte, quando o sinal de fato mudar.
  if (q0 === 0 || q0 * q1 > 0) return null
  if (q1 === 0) return null

  const fracao = q0 / (q0 - q1)
  const tCruz = segundo(anterior.t + h * fracao)
  const qPonto = anterior.qPonto + (atual.qPonto - anterior.qPonto) * fracao

  return {
    t: tCruz,
    sentido: qPonto >= 0 ? 1 : -1,
    qPonto,
    numeroTravessia,
  }
}

/**
 * Sensor com estado: acumula as passagens e sabe converter em período.
 *
 * A posição é sempre o ponto zero — não há campo de posição a configurar,
 * porque não há posição a escolher.
 */
export class SensorZero {
  /** Posição fixa, por construção. */
  readonly posicao = 'zero' as const
  /** Nunca arrastável (RF-134). */
  readonly arrastavel = false as const

  private readonly eventos: EventoPassagem[] = []
  private contador = 0
  private descartados = 0

  /**
   * @param intervaloMinimo intervalo abaixo do qual duas detecções são tratadas
   *   como repique do sensor e a segunda é descartada, em segundos.
   */
  constructor(private readonly intervaloMinimo: Segundo = segundo(0)) {}

  /**
   * Processa um passo de integração.
   *
   * @returns o evento registrado, ou `null` se não houve passagem válida.
   */
  processar(anterior: EstadoQ, atual: EstadoQ): EventoPassagem | null {
    const bruto = detectarCruzamento(anterior, atual, this.contador)
    if (bruto === null) return null

    const ultimo = this.eventos.at(-1)
    if (ultimo !== undefined && bruto.t - ultimo.t < this.intervaloMinimo) {
      this.descartados += 1
      return null
    }

    const evento: EventoPassagem = { ...bruto, numeroTravessia: this.contador }
    this.contador += 1
    this.eventos.push(evento)
    if (this.eventos.length > MAX_EVENTOS_SENSOR) {
      this.eventos.splice(0, this.eventos.length - MAX_EVENTOS_SENSOR)
    }
    return evento
  }

  /** Todos os eventos registrados, do mais antigo ao mais recente. */
  get passagens(): readonly EventoPassagem[] {
    return this.eventos
  }

  /** Quantas detecções foram descartadas por repique (RF-214). */
  get eventosDescartados(): number {
    return this.descartados
  }

  /** Esquece o histórico, preservando a configuração. */
  zerar(): void {
    this.eventos.length = 0
    this.contador = 0
    this.descartados = 0
  }

  /** Período corrente, na grandeza pedida, ou `null` se ainda faltam passagens. */
  periodo(modo: ModoContagem): Segundo | null {
    return periodoDeEventos(this.eventos, modo)
  }
}

/**
 * Período a partir de uma lista de passagens.
 *
 * - `'meioPeriodo'`: diferença entre as **duas últimas** passagens.
 * - `'periodoCompleto'`: diferença entre as duas últimas de **mesmo sentido**.
 *
 * @returns `null` quando não há passagens suficientes.
 */
export function periodoDeEventos(
  eventos: readonly EventoPassagem[],
  modo: ModoContagem,
): Segundo | null {
  if (modo === 'meioPeriodo') {
    if (eventos.length < 2) return null
    const ultimo = eventos.at(-1)!
    const penultimo = eventos.at(-2)!
    return segundo(ultimo.t - penultimo.t)
  }

  const ultimo = eventos.at(-1)
  if (ultimo === undefined) return null
  for (let i = eventos.length - 2; i >= 0; i--) {
    const candidato = eventos[i]!
    if (candidato.sentido === ultimo.sentido) {
      return segundo(ultimo.t - candidato.t)
    }
  }
  return null
}

/**
 * Média dos períodos completos observados, útil para reduzir ruído de medição.
 *
 * @returns `null` se não houver ao menos dois períodos completos.
 */
export function periodoMedio(eventos: readonly EventoPassagem[]): Segundo | null {
  const mesmoSentido = eventos.filter((e) => e.sentido === eventos[0]?.sentido)
  if (mesmoSentido.length < 2) return null
  const primeiro = mesmoSentido[0]!
  const ultimo = mesmoSentido.at(-1)!
  return segundo((ultimo.t - primeiro.t) / (mesmoSentido.length - 1))
}
