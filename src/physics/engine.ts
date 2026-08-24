/**
 * Motor de simulação: passo fixo com acumulador, buffers circulares e sensor.
 *
 * **Passo fixo é requisito, não preferência** (Princípio V). Integrar o
 * `deltaTime` cru do quadro tornaria a trajetória dependente da carga da
 * máquina: os testes deixariam de ser reproduzíveis e um estado compartilhado
 * por endereço não reproduziria a mesma simulação em outro computador.
 *
 * O acumulador converte tempo real em um número inteiro de passos, e o teto
 * anti-espiral impede a "espiral da morte" quando a aba fica suspensa e volta
 * com vários segundos acumulados de uma vez.
 */

import { ACUMULADOR_MAX_S, PASSO_PADRAO_S } from './constants.js'
import { energias, type Energias } from './energy.js'
import { passo, type EstadoQ, type MetodoIntegracao } from './integrators.js'
import {
  anguloDaCoordenada,
  coordenadaDoAngulo,
  ehConservativo,
  validarEstadoCicloidalInicial,
  type ParametrosDinamica,
} from './ode.js'
import { SensorZero, type EventoPassagem } from './sensor.js'
import {
  ErroDeDominio,
  joule,
  radPorS,
  segundo,
  type Joule,
  type Rad,
  type Segundo,
} from './units.js'

/** Uma amostra da trajetória, guardada no buffer circular. */
export interface Amostra {
  readonly t: Segundo
  readonly q: number
  readonly qPonto: number
  readonly theta: number
  readonly energiaTotal: number
}

/** Buffer circular de tamanho fixo: a memória não cresce com o tempo (RNF-020). */
export class BufferCircular<T> {
  private readonly itens: (T | undefined)[]
  private inicio = 0
  private tamanho = 0

  constructor(readonly capacidade: number) {
    if (!Number.isInteger(capacidade) || capacidade < 1) {
      throw new ErroDeDominio('capacidade', capacidade, 'inteiro ≥ 1')
    }
    this.itens = new Array<T | undefined>(capacidade)
  }

  push(item: T): void {
    const indice = (this.inicio + this.tamanho) % this.capacidade
    this.itens[indice] = item
    if (this.tamanho < this.capacidade) {
      this.tamanho += 1
    } else {
      this.inicio = (this.inicio + 1) % this.capacidade
    }
  }

  get comprimento(): number {
    return this.tamanho
  }

  /** Do mais antigo ao mais recente. */
  paraArray(): T[] {
    const saida: T[] = []
    for (let i = 0; i < this.tamanho; i++) {
      saida.push(this.itens[(this.inicio + i) % this.capacidade] as T)
    }
    return saida
  }

  ultimo(): T | undefined {
    if (this.tamanho === 0) return undefined
    return this.itens[(this.inicio + this.tamanho - 1) % this.capacidade]
  }

  limpar(): void {
    this.inicio = 0
    this.tamanho = 0
    this.itens.fill(undefined)
  }
}

export interface OpcoesMotor {
  readonly h?: number
  readonly metodo?: MetodoIntegracao
  readonly capacidadeBuffer?: number
  readonly intervaloMinimoSensor?: Segundo
  /** Velocidade angular inicial do fio, em rad/s. */
  readonly omegaInicial?: number
  /** Reproduz deterministicamente a trajetória até este instante. */
  readonly tempoInicial?: number
}

/**
 * O motor.
 *
 * Uso típico: `new MotorPendulo(params, alpha)` e depois `avancar(dtReal)` a
 * cada quadro, ou `avancarPassos(n)` nos testes, onde não existe tempo real.
 */
export class MotorPendulo {
  private estado: EstadoQ
  private acumulador = 0
  private readonly buffer: BufferCircular<Amostra>
  readonly sensor: SensorZero
  readonly h: number
  readonly metodo: MetodoIntegracao
  private readonly energiaInicial: Joule

  constructor(
    private readonly params: ParametrosDinamica,
    alphaInicial: Rad,
    opcoes: OpcoesMotor = {},
  ) {
    this.h = opcoes.h ?? PASSO_PADRAO_S
    this.metodo = opcoes.metodo ?? 'verlet'
    this.buffer = new BufferCircular<Amostra>(opcoes.capacidadeBuffer ?? 3600)
    this.sensor = new SensorZero(opcoes.intervaloMinimoSensor ?? segundo(0))

    validarEstadoCicloidalInicial(alphaInicial, opcoes.omegaInicial ?? 0, params)

    this.estado = {
      t: segundo(0),
      q: coordenadaDoAngulo(alphaInicial, params.modo),
      // No cicloidal q = sen(theta), portanto q' = cos(theta) theta'.
      qPonto: params.modo === 'cicloidal'
        ? Math.cos(alphaInicial) * (opcoes.omegaInicial ?? 0)
        : (opcoes.omegaInicial ?? 0),
    }
    this.energiaInicial = this.energias().total
    this.registrarAmostra()
    const tempoInicial = opcoes.tempoInicial ?? 0
    if (!Number.isFinite(tempoInicial) || tempoInicial < 0) {
      throw new ErroDeDominio('tempoInicial', tempoInicial, 'número finito ≥ 0')
    }
    if (tempoInicial > 0) {
      const razao = tempoInicial / this.h
      const inteiroMaisProximo = Math.round(razao)
      // Evita perder um passo por ruído binário em valores como 2,5/0,001.
      const passos = Math.abs(razao - inteiroMaisProximo) <= 1e-9
        ? inteiroMaisProximo
        : Math.floor(razao)
      this.avancarPassos(passos)
      this.acumulador = Math.max(0, tempoInicial - passos * this.h)
    }
  }

  /** Estado corrente na coordenada generalizada. */
  get atual(): EstadoQ {
    return this.estado
  }

  /** Ângulo do fio, em radianos — o que a cena desenha. */
  get theta(): number {
    return anguloDaCoordenada(this.estado.q, this.params.modo)
  }

  get tempo(): Segundo {
    return this.estado.t
  }

  /** Instante pedido ao motor, incluindo o resíduo menor que um passo fixo. */
  get tempoSolicitado(): number {
    return this.estado.t + this.acumulador
  }

  get amostras(): Amostra[] {
    return this.buffer.paraArray()
  }

  /** Energias do estado corrente, já resolvendo a sutileza do regime. */
  energias(): Energias {
    // Em ambos os regimes a velocidade da massa vale L·q̇, então a cinética tem
    // a mesma forma. A potencial é que difere, e `energias` já trata isso pelo
    // modo — desde que receba o ângulo do fio.
    return energias(
      this.params.m,
      this.params.L,
      this.params.g,
      anguloDaCoordenada(this.estado.q, this.params.modo) as Rad,
      radPorS(this.estado.qPonto),
      this.params.modo,
      joule(0),
    )
  }

  /** Deriva relativa da energia desde o início. Só significativa se conservativo. */
  derivaDeEnergia(): number {
    if (this.energiaInicial === 0) return 0
    return (this.energias().total - this.energiaInicial) / this.energiaInicial
  }

  get conservativo(): boolean {
    return ehConservativo(this.params)
  }

  /** Avança exatamente `n` passos de integração. Determinístico. */
  avancarPassos(n: number): EventoPassagem[] {
    if (!Number.isInteger(n) || n < 0) {
      throw new ErroDeDominio('n', n, 'inteiro ≥ 0')
    }
    const eventos: EventoPassagem[] = []
    for (let i = 0; i < n; i++) {
      const anterior = this.estado
      this.estado = passo(anterior, this.h, this.params, this.metodo)
      // Não esconda um estado fisicamente impossível com `asin(clamp(q))`.
      // A conversão valida a fronteira e produz uma mensagem acionável.
      anguloDaCoordenada(this.estado.q, this.params.modo)
      const evento = this.sensor.processar(anterior, this.estado)
      if (evento !== null) eventos.push(evento)
      this.registrarAmostra()
    }
    return eventos
  }

  /**
   * Consome `dtReal` segundos de tempo real, avançando um número **inteiro** de
   * passos. O resto fica no acumulador para o próximo quadro.
   *
   * @param escala fator de câmera lenta: escala o tempo simulado, nunca a taxa
   *   de quadros (AD-07).
   */
  avancar(dtReal: number, escala = 1): EventoPassagem[] {
    if (!Number.isFinite(dtReal) || dtReal < 0) {
      throw new ErroDeDominio('dtReal', dtReal, 'número finito ≥ 0')
    }
    // Teto anti-espiral: uma aba que volta de suspensão não pode pedir minutos
    // de simulação de uma vez.
    this.acumulador += Math.min(dtReal * escala, ACUMULADOR_MAX_S)

    const passos = Math.floor(this.acumulador / this.h)
    this.acumulador -= passos * this.h
    return this.avancarPassos(passos)
  }

  /** Resíduo ainda não integrado, em segundos. */
  get residuo(): number {
    return this.acumulador
  }

  private registrarAmostra(): void {
    this.buffer.push({
      t: this.estado.t,
      q: this.estado.q,
      qPonto: this.estado.qPonto,
      theta: anguloDaCoordenada(this.estado.q, this.params.modo),
      energiaTotal: this.energias().total,
    })
  }
}
