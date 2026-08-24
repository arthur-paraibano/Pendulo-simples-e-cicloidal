import { MotorPendulo } from '../physics/engine.js'
import { aceleracaoGeneralizada, exigirModeloAtritoImplementado, type ParametrosDinamica } from '../physics/ode.js'
import { periodoExato, periodoPequenaAmplitude } from '../physics/period.js'
import type { ModoPendulo } from '../physics/types.js'
import { grausParaRad, deg, kg, metro, mPorS2 } from '../physics/units.js'
import type { EstadoPenduloCena } from '../render/types.js'
import { ControleExecucao, type Comando } from '../state/execucao.js'
import type { Store } from '../state/store.js'

interface RuntimePendulo {
  readonly modo: ModoPendulo
  readonly motor: MotorPendulo
  readonly parametros: ParametrosDinamica
  readonly T0: number
  readonly periodo: number
  ultimoDisparo: number | null
  qFormulaAnterior: number | null
  estadoCena?: EstadoPenduloCenaMutavel
}

type EstadoPenduloCenaMutavel = { -readonly [K in keyof EstadoPenduloCena]: EstadoPenduloCena[K] }

const CHAVES_DINAMICA = new Set([
  'L', 'alpha', 'theta0', 'omega0', 'g', 'm', 'dt', 'integrador', 'modeloAtrito', 'b', 'zeta', 'cq',
  'amplitudeForcamento', 'omegaForcamento', 'faseForcamento',
])

/** Runtime sem DOM: coordena Store, relógio e os dois motores testavelmente. */
export class RuntimeCena {
  readonly controle: ControleExecucao
  private readonly runtimes = new Map<ModoPendulo, RuntimePendulo>()
  private readonly erros = new Map<ModoPendulo, string>()
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
    const modo = this.store.texto('modo')
    if (modo === 'simples') return this.erros.get('simples') ?? null
    if (modo === 'cicloidal') return this.erros.get('cicloidal') ?? null
    return this.erros.get('cicloidal') ?? this.erros.get('simples') ?? null
  }

  temModo(modo: ModoPendulo): boolean {
    return this.runtimes.has(modo)
  }

  tempoDoModo(modo: ModoPendulo): number | null {
    return this.runtimes.get(modo)?.motor.tempoSolicitado ?? null
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
      this.tempoFormula += this.store.numero('dt')
    }
    this.sincronizarRelogio()
  }

  avancar(dt: number): void {
    if (!this.controle.rodando) return
    const escala = this.store.numero('escalaTempo')
    if (this.store.texto('fonteMovimento') === 'integracao') {
      for (const runtime of this.runtimes.values()) {
        this.avancarRuntime(runtime, () => runtime.motor.avancar(dt, escala))
      }
    }
    this.tempoFormula += Math.min(0.25, Math.max(0, dt) * escala)
    this.sincronizarRelogio()
  }

  estadosVisiveis(saida: EstadoPenduloCena[]): EstadoPenduloCena[] {
    saida.length = 0
    const modo = this.store.texto('modo')
    if (modo === 'simples' || modo === 'comparacao') this.adicionarEstado('simples', saida)
    if (modo === 'cicloidal' || modo === 'comparacao') this.adicionarEstado('cicloidal', saida)
    return saida
  }

  destruir(): void {
    this.runtimes.clear()
    this.erros.clear()
  }

  private parametrosDinamica(modo: ModoPendulo): ParametrosDinamica {
    const L = this.store.numero('L')
    const g = this.store.numero('g')
    const m = this.store.numero('m')
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

  private criarRuntime(modo: ModoPendulo, tempoInicial = this.store.numero('t')): RuntimePendulo {
    const theta0 = grausParaRad(deg(this.store.numero('theta0')))
    const parametros = this.parametrosDinamica(modo)
    const L = metro(this.store.numero('L'))
    const g = mPorS2(this.store.numero('g'))
    const alpha = grausParaRad(deg(this.store.numero('alpha')))
    return {
      modo,
      motor: new MotorPendulo(parametros, theta0, {
        h: this.store.numero('dt'),
        metodo: this.store.texto('integrador') === 'rk4' ? 'rk4' : 'verlet',
        omegaInicial: this.store.numero('omega0'),
        tempoInicial,
      }),
      parametros,
      T0: periodoPequenaAmplitude(L, g),
      periodo: periodoExato(L, g, alpha, modo),
      ultimoDisparo: null,
      qFormulaAnterior: null,
    }
  }

  private garantirModo(modo: ModoPendulo, tempoInicial = this.store.numero('t')): void {
    if (this.runtimes.has(modo)) return
    try {
      this.runtimes.set(modo, this.criarRuntime(modo, tempoInicial))
      this.erros.delete(modo)
    } catch (erro) {
      this.erros.set(modo, erro instanceof Error ? erro.message : 'Configuração dinâmica inválida.')
    }
  }

  private garantirModosVisiveis(): void {
    const modo = this.store.texto('modo')
    if (modo === 'simples' || modo === 'comparacao') this.garantirModo('simples')
    if (modo === 'cicloidal' || modo === 'comparacao') this.garantirModo('cicloidal')
  }

  private reconstruirTodos(zerarTempo: boolean): void {
    this.runtimes.clear()
    this.erros.clear()
    const tempoInicial = zerarTempo ? 0 : this.store.numero('t')
    if (zerarTempo) this.tempoFormula = 0
    this.garantirModo('simples', tempoInicial)
    this.garantirModo('cicloidal', tempoInicial)
    this.sincronizarRelogio()
  }

  private avancarRuntime(runtime: RuntimePendulo, acao: () => readonly { readonly t: number }[]): void {
    try {
      const eventos = acao()
      const ultimo = eventos.at(-1)
      if (ultimo !== undefined) runtime.ultimoDisparo = ultimo.t
      this.erros.delete(runtime.modo)
    } catch (erro) {
      this.runtimes.delete(runtime.modo)
      this.erros.set(runtime.modo, erro instanceof Error ? erro.message : 'Estado físico inválido.')
    }
  }

  private adicionarEstado(modo: ModoPendulo, saida: EstadoPenduloCena[]): void {
    const runtime = this.runtimes.get(modo)
    if (runtime === undefined) return
    try {
      saida.push(this.store.texto('fonteMovimento') === 'integracao'
        ? this.estadoIntegrado(runtime)
        : this.estadoFormula(runtime))
      this.erros.delete(modo)
    } catch (erro) {
      this.runtimes.delete(modo)
      this.erros.set(modo, erro instanceof Error ? erro.message : 'Estado físico inválido.')
    }
  }

  private estadoFormula(runtime: RuntimePendulo): EstadoPenduloCena {
    const L = this.store.numero('L')
    const g = this.store.numero('g')
    const alpha = grausParaRad(deg(this.store.numero('alpha')))
    const thetaInicial = grausParaRad(deg(this.store.numero('theta0')))
    const omegaInicial = this.store.numero('omega0')
    if (runtime.modo === 'cicloidal' && this.store.numero('amplitudeForcamento') !== 0) {
      throw new Error('Forçamento externo no cicloidal requer a fonte de movimento por integração numérica.')
    }
    const T = periodoExato(metro(L), mPorS2(g), alpha, runtime.modo)
    const omega = (2 * Math.PI) / T
    const fase = omega * this.tempoFormula
    let theta: number
    let q: number
    let qPonto: number
    let qDoisPontos: number
    if (runtime.modo === 'cicloidal') {
      const q0 = Math.sin(thetaInicial)
      const qPonto0 = Math.cos(thetaInicial) * omegaInicial
      q = q0 * Math.cos(fase) + (qPonto0 / omega) * Math.sin(fase)
      if (Math.abs(q) > 1 + 1e-12) {
        throw new Error('Estado cicloidal inválido: |q| excedeu 1; reduza θ₀ ou ω₀.')
      }
      theta = Math.asin(Math.max(-1, Math.min(1, q)))
      qPonto = -q0 * omega * Math.sin(fase) + qPonto0 * Math.cos(fase)
      qDoisPontos = -omega * omega * q
    } else {
      theta = thetaInicial * Math.cos(fase) + (omegaInicial / omega) * Math.sin(fase)
      q = theta
      qPonto = -thetaInicial * omega * Math.sin(fase) + omegaInicial * Math.cos(fase)
      qDoisPontos = -omega * omega * theta
    }
    if (runtime.qFormulaAnterior !== null && runtime.qFormulaAnterior * q < 0) runtime.ultimoDisparo = this.tempoFormula
    runtime.qFormulaAnterior = q
    return this.montarEstado(runtime, theta, qPonto, qDoisPontos, this.tempoFormula)
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
    const L = this.store.numero('L')
    const g = this.store.numero('g')
    const dinamica = runtime.parametros
    const alpha = grausParaRad(deg(this.store.numero('alpha')))
    const estado = runtime.estadoCena ??= {} as EstadoPenduloCenaMutavel
    estado.id = runtime.modo
    estado.modo = runtime.modo
    estado.L = L
    estado.m = this.store.numero('m')
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
