import type { Amostra } from '../physics/engine.js'
import { MotorPendulo } from '../physics/engine.js'
import { aceleracaoGeneralizada, exigirModeloAtritoImplementado, type ParametrosDinamica } from '../physics/ode.js'
import { periodoExato, periodoPequenaAmplitude } from '../physics/period.js'
import type { EventoPassagem } from '../physics/sensor.js'
import type { ModoPendulo } from '../physics/types.js'
import { grausParaRad, deg, kg, metro, mPorS2, segundo, type Rad } from '../physics/units.js'
import type { EstadoPenduloCena } from '../render/types.js'
import { ControleExecucao, type Comando } from '../state/execucao.js'
import type { Store } from '../state/store.js'

interface RuntimePendulo {
  readonly modo: ModoPendulo
  /** Indice do pendulo, de 1 a n_p. */
  readonly indice: number
  readonly motor: MotorPendulo
  readonly parametros: ParametrosDinamica
  readonly T0: number
  readonly periodo: number
  ultimoDisparo: number | null
  travessiasFormula: number
  estadoCena?: EstadoPenduloCenaMutavel
}

type EstadoPenduloCenaMutavel = { -readonly [K in keyof EstadoPenduloCena]: EstadoPenduloCena[K] }

const CHAVES_DINAMICA = new Set([
  'L', 'alpha', 'theta0', 'omega0', 'g', 'm', 'dt', 'integrador', 'modeloAtrito', 'b', 'zeta', 'cq',
  'amplitudeForcamento', 'omegaForcamento', 'faseForcamento',
  // Criar ou remover um pendulo e estrutural: ha um motor a mais ou a menos.
  'numeroPendulos',
])

/** Chave de um motor: um por (modo, pendulo). */
function chaveRuntime(modo: ModoPendulo, indice: number): string {
  return modo + '#' + String(indice)
}

export interface PassagemRuntime {
  readonly modo: ModoPendulo
  readonly evento: EventoPassagem
  /** Amplitude física equivalente no instante exato da passagem. */
  readonly alpha: Rad
}

type OuvintePassagem = (passagem: PassagemRuntime) => void

/** Runtime sem DOM: coordena Store, relógio e os dois motores testavelmente. */
export class RuntimeCena {
  readonly controle: ControleExecucao
  private readonly runtimes = new Map<string, RuntimePendulo>()
  private readonly erros = new Map<string, string>()
  private readonly ouvintesPassagem = new Set<OuvintePassagem>()
  private tempoFormula: number

  constructor(readonly store: Store) {
    this.controle = new ControleExecucao(store.texto('execucao') as 'parado' | 'rodando' | 'pausado')
    this.tempoFormula = store.numero('t')
    this.reconstruirTodos(false)
  }

  get tempo(): number {
    if (this.store.texto('fonteMovimento') === 'formula') return this.tempoFormula
    let maior = 0
    for (const runtime of this.runtimes.values()) maior = Math.max(maior, runtime.motor.tempoSolicitado)
    return maior
  }

  get erroVisivel(): string | null {
    for (const modo of [...this.modosVisiveis()].reverse()) {
      for (const i of this.store.indicesDePendulo()) {
        const erro = this.erros.get(chaveRuntime(modo, i))
        if (erro !== undefined) return erro
      }
    }
    return null
  }

  temModo(modo: ModoPendulo): boolean {
    return this.runtimes.has(chaveRuntime(modo, 1))
  }

  tempoDoModo(modo: ModoPendulo): number | null {
    return this.doModo(modo)?.motor.tempoSolicitado ?? null
  }

  /**
   * Motor do pendulo em foco de um modo.
   *
   * Paineis que falam de *um* pendulo -- formula, graficos, tabela -- precisam
   * saber de qual. O foco (P113) e a mesma resposta que o console usa para uma
   * atribuicao sem indice, e usar duas nocoes diferentes de "o pendulo" faria a
   * leitura discordar do que a edicao alcanca.
   */
  private doModo(modo: ModoPendulo): RuntimePendulo | undefined {
    const foco = this.store.numero('penduloFoco')
    return this.runtimes.get(chaveRuntime(modo, foco)) ?? this.runtimes.get(chaveRuntime(modo, 1))
  }

  /** Amplitude física corrente, distinta da amplitude inicial configurada. */
  amplitudeDoModo(modo: ModoPendulo): Rad | null {
    const runtime = this.doModo(modo)
    if (runtime === undefined) return null
    if (this.store.texto('fonteMovimento') === 'integracao') {
      const atual = runtime.motor.atual
      return this.amplitudeEquivalente(runtime.modo, atual.q, atual.qPonto, runtime.indice)
    }
    const estado = this.estadoHarmonico(runtime, this.tempoFormula)
    return this.amplitudeEquivalente(runtime.modo, estado.q, estado.qPonto, runtime.indice)
  }

  /** Observa o mesmo sensor fixo que aciona o marcador visual. */
  assinarPassagens(ouvinte: OuvintePassagem): () => void {
    this.ouvintesPassagem.add(ouvinte)
    return () => this.ouvintesPassagem.delete(ouvinte)
  }

  aplicarAlteracoes(
    chaves: ReadonlySet<string>,
    explicitas: ReadonlySet<string> = chaves,
  ): { readonly reiniciou: boolean } {
    if (chaves.has('execucao')) {
      const desejado = this.store.texto('execucao') as 'parado' | 'rodando' | 'pausado'
      if (desejado !== this.controle.estado) this.controle.sincronizar(desejado)
    }
    // Visualização é projeção, não condição inicial: nunca rebobina motores.
    const trocouModo = chaves.has('modo')
    if (trocouModo) this.garantirModosVisiveis()
    const parametrosIniciais = new Set(['alpha', 'theta0', 'h0'])
    const somenteAjusteDeDominio = trocouModo
      && [...chaves].every((id) => id === 'modo' || parametrosIniciais.has(id))
      && ![...explicitas].some((id) => parametrosIniciais.has(id))
    if (somenteAjusteDeDominio) {
      // A entrada no cicloidal pode limitar condições incompatíveis. O
      // motor já em execução e o relógio sobrevivem; apenas um modo que
      // antes não podia existir é criado no mesmo instante corrente.
      this.garantirModosVisiveis()
      return { reiniciou: false }
    }
    let estrutural = false
    for (const id of chaves) {
      if (CHAVES_DINAMICA.has(id)) {
        estrutural = true
        break
      }
    }
    if (!estrutural) return { reiniciou: false }
    this.reconstruirTodos(true)
    if (this.controle.estado !== 'parado') {
      const transicao = this.controle.aplicar('parametroEstrutural')
      queueMicrotask(() => this.store.definirParametro('execucao', transicao.para))
    }
    return { reiniciou: true }
  }

  aplicarComando(comando: Comando): void {
    if (comando === 'reproduzir') this.garantirModosVisiveis()
    const transicao = this.controle.aplicar(comando)
    this.store.definirParametro('execucao', transicao.para)
    if (transicao.reiniciaDinamica) this.reconstruirTodos(true)
  }

  zerar(): void {
    this.reconstruirTodos(true)
  }

  passo(): void {
    const transicao = this.controle.aplicar('passoAPasso')
    this.store.definirParametro('execucao', transicao.para)
    if (transicao.para === 'rodando') return
    if (this.store.texto('fonteMovimento') === 'integracao') {
      for (const runtime of this.runtimes.values()) this.avancarRuntime(runtime, () => runtime.motor.avancarPassos(1))
    } else {
      const inicio = this.tempoFormula
      this.tempoFormula += this.store.numero('dt')
      for (const runtime of this.runtimes.values()) this.emitirTravessiasFormula(runtime, inicio, this.tempoFormula)
    }
    this.sincronizarRelogio()
  }

  avancar(dt: number): void {
    if (!this.controle.rodando) return
    const escala = this.store.numero('escalaTempo')
    const deltaSimulado = Math.min(0.25, Math.max(0, dt) * escala)
    if (this.store.texto('fonteMovimento') === 'integracao') {
      for (const runtime of this.runtimes.values()) {
        this.avancarRuntime(runtime, () => runtime.motor.avancar(dt, escala))
      }
    } else {
      const inicio = this.tempoFormula
      const fim = inicio + deltaSimulado
      for (const runtime of this.runtimes.values()) this.emitirTravessiasFormula(runtime, inicio, fim)
    }
    this.tempoFormula += deltaSimulado
    this.sincronizarRelogio()
  }

  /**
   * Amostras da trajetória de um modo, para os gráficos temporais.
   *
   * Devolve lista vazia quando o modo não está em cena — assim o painel de
   * gráficos não precisa saber nada sobre a montagem dos motores.
   */
  amostrasDoModo(modo: ModoPendulo): readonly Amostra[] {
    return this.doModo(modo)?.motor.amostras ?? []
  }

  /**
   * Modos atualmente em cena, na ordem em que aparecem.
   *
   * Espelha a decisão de `estadosVisiveis`: o valor de comparação é
   * `comparacao`, e tratar qualquer outro valor como "os dois" mascararia um
   * modo inválido em vez de expô-lo.
   */
  modosVisiveis(): readonly ModoPendulo[] {
    const modo = this.store.texto('modo')
    if (modo === 'comparacao') return ['simples', 'cicloidal']
    return modo === 'cicloidal' ? ['cicloidal'] : ['simples']
  }

  estadosVisiveis(saida: EstadoPenduloCena[]): EstadoPenduloCena[] {
    saida.length = 0
    for (const modo of this.modosVisiveis()) {
      for (const i of this.store.indicesDePendulo()) this.adicionarEstado(modo, i, saida)
    }
    return saida
  }

  destruir(): void {
    this.runtimes.clear()
    this.erros.clear()
    this.ouvintesPassagem.clear()
  }

  private parametrosDinamica(modo: ModoPendulo, indice: number): ParametrosDinamica {
    const L = this.store.numeroDoPendulo('L', indice)
    const g = this.store.numeroDoPendulo('g', indice)
    const m = this.store.numeroDoPendulo('m', indice)
    return {
      L: metro(L),
      g: mPorS2(g),
      m: kg(m),
      modo,
      modeloAtrito: exigirModeloAtritoImplementado(this.store.texto('modeloAtrito')),
      gamma: this.store.numero('b') / m + 2 * this.store.numero('zeta') * Math.sqrt(g / L),
      cq: this.store.numero('cq'),
      amplitudeForcamento: this.store.numero('amplitudeForcamento'),
      omegaForcamento: this.store.numero('omegaForcamento'),
      faseForcamento: this.store.numero('faseForcamento'),
    }
  }

  private criarRuntime(
    modo: ModoPendulo,
    indice: number,
    tempoInicial = this.store.numero('t'),
  ): RuntimePendulo {
    const theta0 = grausParaRad(deg(this.store.numeroDoPendulo('theta0', indice)))
    const parametros = this.parametrosDinamica(modo, indice)
    const L = metro(this.store.numeroDoPendulo('L', indice))
    const g = mPorS2(this.store.numeroDoPendulo('g', indice))
    const alpha = grausParaRad(deg(this.store.numeroDoPendulo('alpha', indice)))
    return {
      modo,
      indice,
      motor: new MotorPendulo(parametros, theta0, {
        h: this.store.numero('dt'),
        metodo: this.store.texto('integrador') === 'rk4' ? 'rk4' : 'verlet',
        omegaInicial: this.store.numeroDoPendulo('omega0', indice),
        tempoInicial,
      }),
      parametros,
      T0: periodoPequenaAmplitude(L, g),
      periodo: periodoExato(L, g, alpha, modo),
      ultimoDisparo: null,
      travessiasFormula: 0,
    }
  }

  private garantirModo(
    modo: ModoPendulo,
    indice: number,
    tempoInicial = this.store.numero('t'),
  ): void {
    const chave = chaveRuntime(modo, indice)
    if (this.runtimes.has(chave)) return
    try {
      this.runtimes.set(chave, this.criarRuntime(modo, indice, tempoInicial))
      this.erros.delete(chave)
    } catch (erro) {
      this.erros.set(chave, erro instanceof Error ? erro.message : 'Configuração dinâmica inválida.')
    }
  }

  private garantirModosVisiveis(): void {
    for (const modo of this.modosVisiveis()) {
      for (const i of this.store.indicesDePendulo()) this.garantirModo(modo, i)
    }
  }

  private reconstruirTodos(zerarTempo: boolean): void {
    this.runtimes.clear()
    this.erros.clear()
    const tempoInicial = zerarTempo ? 0 : this.store.numero('t')
    if (zerarTempo) this.tempoFormula = 0
    for (const modo of ['simples', 'cicloidal'] as const) {
      for (const i of this.store.indicesDePendulo()) this.garantirModo(modo, i, tempoInicial)
    }
    this.sincronizarRelogio()
  }

  private avancarRuntime(runtime: RuntimePendulo, acao: () => readonly { readonly t: number }[]): void {
    try {
      const eventos = acao()
      const ultimo = eventos.at(-1)
      if (ultimo !== undefined) runtime.ultimoDisparo = ultimo.t
      for (const evento of eventos as readonly EventoPassagem[]) {
        this.emitirPassagem(
          runtime.modo,
          evento,
          this.amplitudeEquivalente(runtime.modo, 0, evento.qPonto, runtime.indice),
        )
      }
      this.erros.delete(chaveRuntime(runtime.modo, runtime.indice))
    } catch (erro) {
      const chave = chaveRuntime(runtime.modo, runtime.indice)
      this.runtimes.delete(chave)
      this.erros.set(chave, erro instanceof Error ? erro.message : 'Estado físico inválido.')
    }
  }

  private adicionarEstado(modo: ModoPendulo, indice: number, saida: EstadoPenduloCena[]): void {
    const chave = chaveRuntime(modo, indice)
    const runtime = this.runtimes.get(chave)
    if (runtime === undefined) return
    try {
      saida.push(this.store.texto('fonteMovimento') === 'integracao'
        ? this.estadoIntegrado(runtime)
        : this.estadoFormula(runtime))
      this.erros.delete(chave)
    } catch (erro) {
      this.runtimes.delete(chave)
      this.erros.set(chave, erro instanceof Error ? erro.message : 'Estado físico inválido.')
    }
  }

  private estadoFormula(runtime: RuntimePendulo): EstadoPenduloCena {
    if (runtime.modo === 'cicloidal' && this.store.numero('amplitudeForcamento') !== 0) {
      throw new Error('Forçamento externo no cicloidal requer a fonte de movimento por integração numérica.')
    }
    const { q, qPonto, qDoisPontos } = this.estadoHarmonico(runtime, this.tempoFormula)
    let theta: number
    if (runtime.modo === 'cicloidal') {
      if (Math.abs(q) > 1 + 1e-12) {
        throw new Error('Estado cicloidal inválido: |q| excedeu 1; reduza θ₀ ou ω₀.')
      }
      theta = Math.asin(Math.max(-1, Math.min(1, q)))
    } else {
      theta = q
    }
    return this.montarEstado(runtime, theta, qPonto, qDoisPontos, this.tempoFormula)
  }

  private estadoHarmonico(runtime: RuntimePendulo, tempo: number): {
    readonly q: number
    readonly qPonto: number
    readonly qDoisPontos: number
  } {
    const thetaInicial = grausParaRad(deg(this.store.numeroDoPendulo('theta0', runtime.indice)))
    const omegaInicial = this.store.numeroDoPendulo('omega0', runtime.indice)
    const omega = (2 * Math.PI) / runtime.periodo
    const fase = omega * tempo
    const q0 = runtime.modo === 'cicloidal' ? Math.sin(thetaInicial) : thetaInicial
    const qPonto0 = runtime.modo === 'cicloidal'
      ? Math.cos(thetaInicial) * omegaInicial
      : omegaInicial
    const q = q0 * Math.cos(fase) + (qPonto0 / omega) * Math.sin(fase)
    const qPonto = -q0 * omega * Math.sin(fase) + qPonto0 * Math.cos(fase)
    return { q, qPonto, qDoisPontos: -omega * omega * q }
  }

  /** Enumera analiticamente todas as raízes no intervalo, mesmo num quadro lento. */
  private emitirTravessiasFormula(runtime: RuntimePendulo, inicio: number, fim: number): void {
    if (!(fim > inicio)) return
    const thetaInicial = grausParaRad(deg(this.store.numeroDoPendulo('theta0', runtime.indice)))
    const omegaInicial = this.store.numeroDoPendulo('omega0', runtime.indice)
    const omega = (2 * Math.PI) / runtime.periodo
    const a = runtime.modo === 'cicloidal' ? Math.sin(thetaInicial) : thetaInicial
    const qPonto0 = runtime.modo === 'cicloidal'
      ? Math.cos(thetaInicial) * omegaInicial
      : omegaInicial
    const b = qPonto0 / omega
    if (Math.hypot(a, b) <= Number.EPSILON) return

    // q(t) = R cos(ωt − φ); raízes em φ + π/2 + kπ.
    const phi = Math.atan2(b, a)
    const base = phi + Math.PI / 2
    let k = Math.floor((omega * inicio - base) / Math.PI) + 1
    const tolerancia = 1e-12
    while (true) {
      const t = (base + k * Math.PI) / omega
      if (t > fim + tolerancia) break
      if (t > inicio + tolerancia && t >= 0) {
        const fase = omega * t
        const qPonto = -a * omega * Math.sin(fase) + qPonto0 * Math.cos(fase)
        const evento: EventoPassagem = {
          t: segundo(t),
          sentido: qPonto >= 0 ? 1 : -1,
          qPonto,
          numeroTravessia: runtime.travessiasFormula,
        }
        runtime.travessiasFormula += 1
        runtime.ultimoDisparo = t
        this.emitirPassagem(
          runtime.modo,
          evento,
          this.amplitudeEquivalente(runtime.modo, 0, qPonto, runtime.indice),
        )
      }
      k += 1
    }
  }

  private amplitudeEquivalente(
    modo: ModoPendulo,
    q: number,
    qPonto: number,
    indice = this.store.numero('penduloFoco'),
  ): Rad {
    const L = this.store.numeroDoPendulo('L', indice)
    const g = this.store.numeroDoPendulo('g', indice)
    if (modo === 'cicloidal') {
      const sin2 = q * q + (L * qPonto * qPonto) / g
      return Math.asin(Math.sqrt(Math.min(1, Math.max(0, sin2)))) as Rad
    }
    const cosAlpha = Math.cos(q) - (L * qPonto * qPonto) / (2 * g)
    return Math.acos(Math.min(1, Math.max(-1, cosAlpha))) as Rad
  }

  private emitirPassagem(modo: ModoPendulo, evento: EventoPassagem, alpha: Rad): void {
    for (const ouvinte of this.ouvintesPassagem) ouvinte({ modo, evento, alpha })
  }

  private estadoIntegrado(runtime: RuntimePendulo): EstadoPenduloCena {
    const atual = runtime.motor.atual
    const qDoisPontos = aceleracaoGeneralizada(atual.q, atual.qPonto, atual.t, runtime.parametros)
    return this.montarEstado(runtime, runtime.motor.theta, atual.qPonto, qDoisPontos, runtime.motor.tempoSolicitado)
  }

  private montarEstado(
    runtime: RuntimePendulo,
    theta: number,
    qPonto: number,
    qDoisPontos: number,
    tempo: number,
  ): EstadoPenduloCena {
    const indice = runtime.indice
    const L = this.store.numeroDoPendulo('L', indice)
    const g = this.store.numeroDoPendulo('g', indice)
    const dinamica = runtime.parametros
    const alpha = grausParaRad(deg(this.store.numeroDoPendulo('alpha', indice)))
    const estado = runtime.estadoCena ??= {} as EstadoPenduloCenaMutavel
    // A identidade precisa distinguir pendulos do mesmo modo: rastro e
    // estroboscopio sao indexados por ela, e dois pendulos com o mesmo id
    // compartilhariam a mesma trilha.
    estado.id = chaveRuntime(runtime.modo, indice)
    estado.indice = indice
    estado.modo = runtime.modo
    estado.L = L
    estado.m = this.store.numeroDoPendulo('m', indice)
    estado.g = g
    estado.alphaInicial = alpha
    estado.theta = theta
    estado.qPonto = qPonto
    estado.qDoisPontos = qDoisPontos
    estado.tempo = tempo
    estado.ultimoDisparoSensor = runtime.ultimoDisparo
    estado.T0 = runtime.T0
    estado.periodo = runtime.periodo
    estado.modeloAtrito = dinamica.modeloAtrito
    estado.gamma = dinamica.gamma
    estado.cq = dinamica.cq
    estado.aceleracaoExterna = dinamica.amplitudeForcamento * Math.cos(
      dinamica.omegaForcamento * tempo + dinamica.faseForcamento,
    )
    return estado
  }

  private sincronizarRelogio(): void {
    this.store.atualizarTempoSimulacao(this.tempo, false)
  }
}
