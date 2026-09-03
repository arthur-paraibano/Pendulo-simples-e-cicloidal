/**
 * Instrumentos de medição — a lógica, sem DOM.
 *
 * Cronômetro manual, fotoporta móvel e ruído de medição vivem aqui como estado
 * puro, para que a correção possa ser provada por teste em vez de conferida
 * clicando na tela.
 */

import type { EventoPassagem } from '../physics/sensor.js'

// ── Cronômetro manual (T104, RF-090 e RF-093) ────────────────────────────────

export type EstadoCronometro = 'zerado' | 'contando' | 'parado'

/**
 * Cronômetro que o usuário aciona à mão.
 *
 * O tempo entra por argumento, nunca lido do relógio: sem isso o teste não
 * seria reproduzível, e o Princípio V vale para os instrumentos também.
 */
export class Cronometro {
  private inicio = 0
  private acumulado = 0
  private estadoAtual: EstadoCronometro = 'zerado'
  private readonly voltas: number[] = []

  get estado(): EstadoCronometro {
    return this.estadoAtual
  }

  get contando(): boolean {
    return this.estadoAtual === 'contando'
  }

  decorrido(agora: number): number {
    return this.estadoAtual === 'contando' ? this.acumulado + (agora - this.inicio) : this.acumulado
  }

  iniciar(agora: number): void {
    if (this.estadoAtual === 'contando') return
    this.inicio = agora
    this.estadoAtual = 'contando'
  }

  parar(agora: number): void {
    if (this.estadoAtual !== 'contando') return
    this.acumulado += agora - this.inicio
    this.estadoAtual = 'parado'
  }

  zerar(): void {
    this.inicio = 0
    this.acumulado = 0
    this.estadoAtual = 'zerado'
    this.voltas.length = 0
  }

  /** Registra uma volta sem interromper a contagem. */
  marcarVolta(agora: number): number {
    const t = this.decorrido(agora)
    this.voltas.push(t)
    return t
  }

  get marcas(): readonly number[] {
    return this.voltas
  }

  /**
   * Período médio de `n` oscilações cronometradas (RF-093).
   *
   * Cronometrar n períodos e dividir é o que reduz o erro de reação humana:
   * o erro do operador se dilui por n, e é por isso que a prática existe.
   */
  periodoMedio(n: number, agora: number): number | null {
    if (!Number.isInteger(n) || n < 1) return null
    const total = this.decorrido(agora)
    return total > 0 ? total / n : null
  }
}

// ── Fotoporta móvel (T105, RF-091 e RF-092) ──────────────────────────────────

export type ModoFotoporta = 'meioPeriodo' | 'periodoCompleto'

export interface LeituraFotoporta {
  /** Instante da passagem pela posição da fotoporta. */
  readonly t: number
  readonly sentido: -1 | 1
}

/**
 * Fotoporta posicionável ao longo do arco.
 *
 * Instrumento **distinto** do sensor fixo no ponto zero: aquele é fixo por
 * exigência de comparabilidade, este é livre para exploração. As leituras dos
 * dois nunca se misturam, e a interface rotula qual está falando.
 *
 * Fora do ponto zero, a massa passa duas vezes por período em cada sentido, e o
 * intervalo entre passagens **não** é simétrico: a leitura só faz sentido entre
 * passagens de mesmo sentido, e é isso que o modo de período completo mede.
 */
export class FotoportaMovel {
  private readonly leituras: LeituraFotoporta[] = []

  constructor(
    /** Posição angular, em graus. Zero coincide com o sensor fixo. */
    public posicaoGraus: number = 0,
  ) {}

  /**
   * Registra a passagem pela posição da fotoporta entre dois instantes.
   *
   * @returns a leitura, ou `null` se a massa não cruzou a posição no intervalo.
   */
  processar(
    thetaAnterior: number,
    thetaAtual: number,
    tAnterior: number,
    tAtual: number,
  ): LeituraFotoporta | null {
    const alvo = (this.posicaoGraus * Math.PI) / 180
    const antes = thetaAnterior - alvo
    const depois = thetaAtual - alvo
    if (antes === 0 || antes * depois > 0 || depois === 0) return null

    const fracao = antes / (antes - depois)
    const t = tAnterior + (tAtual - tAnterior) * fracao
    const leitura: LeituraFotoporta = { t, sentido: depois > antes ? 1 : -1 }
    this.leituras.push(leitura)
    return leitura
  }

  get passagens(): readonly LeituraFotoporta[] {
    return this.leituras
  }

  zerar(): void {
    this.leituras.length = 0
  }

  /** Período conforme o modo de contagem, ou `null` sem passagens suficientes. */
  periodo(modo: ModoFotoporta): number | null {
    if (modo === 'meioPeriodo') {
      if (this.leituras.length < 2) return null
      return this.leituras.at(-1)!.t - this.leituras.at(-2)!.t
    }
    const ultima = this.leituras.at(-1)
    if (ultima === undefined) return null
    for (let i = this.leituras.length - 2; i >= 0; i--) {
      const candidata = this.leituras[i]!
      if (candidata.sentido === ultima.sentido) return ultima.t - candidata.t
    }
    return null
  }
}

// ── Ruído de medição (T106, RF-094) ──────────────────────────────────────────

/**
 * Gerador congruente linear com semente explícita.
 *
 * `Math.random` está proibido no núcleo pelo Princípio V, e com razão: mesma
 * semente tem de dar a mesma sequência, ou uma medição ruidosa deixa de ser
 * reproduzível e o estado compartilhado por endereço não reproduz o mesmo
 * experimento.
 */
export class GeradorComSemente {
  private estado: number

  constructor(semente: number) {
    // Zero é ponto fixo do gerador; desloca-se para uma semente utilizável.
    this.estado = (Math.floor(Math.abs(semente)) % 2147483647) || 1
  }

  /** Próximo valor em [0, 1). */
  proximo(): number {
    this.estado = (this.estado * 16807) % 2147483647
    return (this.estado - 1) / 2147483646
  }

  /** Amostra de uma normal padrão, por Box-Muller. */
  normal(): number {
    const u1 = Math.max(this.proximo(), Number.EPSILON)
    const u2 = this.proximo()
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  }

  reiniciar(semente: number): void {
    this.estado = (Math.floor(Math.abs(semente)) % 2147483647) || 1
  }
}

/**
 * Aplica ruído de medição a um período, em segundos.
 *
 * @param desvioMs desvio padrão do ruído, em milissegundos.
 */
export function comRuido(periodo: number, desvioMs: number, gerador: GeradorComSemente): number {
  if (desvioMs <= 0) return periodo
  return Math.max(0, periodo + (gerador.normal() * desvioMs) / 1000)
}

/** Média e dispersão de uma amostra, para a leitura dos instrumentos. */
export function resumo(valores: readonly number[]): {
  media: number | null
  desvio: number | null
} {
  if (valores.length === 0) return { media: null, desvio: null }
  const media = valores.reduce((a, b) => a + b, 0) / valores.length
  if (valores.length < 2) return { media, desvio: null }
  const variancia = valores.reduce((acc, v) => acc + (v - media) ** 2, 0) / (valores.length - 1)
  return { media, desvio: Math.sqrt(variancia) }
}

/** Converte eventos do sensor fixo em leituras, para comparar instrumentos. */
export function leiturasDoSensor(eventos: readonly EventoPassagem[]): LeituraFotoporta[] {
  return eventos.map((e) => ({ t: e.t, sentido: e.sentido }))
}
