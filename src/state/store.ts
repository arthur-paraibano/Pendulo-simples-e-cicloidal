/**
 * O store: única porta de escrita do estado.
 *
 * A camada de interface **nunca** altera valores diretamente e **nunca** chama o
 * motor de física — escreve por ações, lê por seletores. É essa disciplina que
 * mantém o determinismo do Princípio V e permite que o endereço compartilhável
 * reconstrua qualquer estado.
 */

import type { ValorParametro } from './tipos.js'
import { encontrarParametro, PARAMETROS, POR_ID, valoresPadrao } from './schema.js'
import type { DefinicaoParametro, LeitorDeValores } from './tipos.js'

export type OrigemValor = 'padrao' | 'usuario' | 'preset' | 'url' | 'roteiro' | 'limitado'

/** O que aconteceu ao tentar escrever um parâmetro. */
export interface ResultadoEscrita {
  readonly id: string
  readonly aplicado: boolean
  readonly valor: ValorParametro
  /** Preenchido quando o valor foi limitado à faixa válida. */
  readonly limitadoDe?: number
  /** Mensagem para o usuário, nomeando parâmetro, valor recusado e limite. */
  readonly mensagem?: string
}

export class ErroDeParametro extends Error {
  constructor(
    readonly termo: string,
    mensagem: string,
  ) {
    super(mensagem)
    this.name = 'ErroDeParametro'
  }
}

export interface ContextoAlteracao {
  /** Campos escritos por uma ação pública (usuário, console, preset ou URL). */
  readonly explicitas: ReadonlySet<string>
  /** Campos propagados pelo grafo de derivações do Store. */
  readonly derivadas: ReadonlySet<string>
}

type Ouvinte = (chavesAlteradas: ReadonlySet<string>, contexto: ContextoAlteracao) => void

export class Store {
  private valores: Record<string, ValorParametro>
  private origens: Record<string, OrigemValor> = {}
  private readonly ouvintes = new Map<Ouvinte, ReadonlySet<string> | null>()
  private pendentes = new Set<string>()
  private explicitasPendentes = new Set<string>()
  private derivadasPendentes = new Set<string>()
  private notificando = false
  private agrupando = 0

  constructor(iniciais: Readonly<Record<string, ValorParametro>> = {}) {
    this.valores = valoresPadrao()
    for (const p of PARAMETROS) this.origens[p.id] = 'padrao'
    if (Object.keys(iniciais).length > 0) {
      this.definirVarios(iniciais, 'preset')
    }
  }

  // ── Leitura ───────────────────────────────────────────────────────────────

  bruto(id: string): ValorParametro {
    if (!POR_ID.has(id)) throw new ErroDeParametro(id, `Parâmetro desconhecido: "${id}".`)
    return this.valores[id] as ValorParametro
  }

  numero(id: string): number {
    const v = this.bruto(id)
    if (typeof v !== 'number') {
      throw new ErroDeParametro(id, `"${id}" não é numérico.`)
    }
    return v
  }

  booleano(id: string): boolean {
    const v = this.bruto(id)
    return typeof v === 'boolean' ? v : Boolean(v)
  }

  texto(id: string): string {
    const v = this.bruto(id)
    return typeof v === 'string' ? v : String(v)
  }

  origem(id: string): OrigemValor {
    return this.origens[id] ?? 'padrao'
  }

  /** Instantâneo completo, seguro para serializar. */
  instantaneo(): Record<string, ValorParametro> {
    return { ...this.valores }
  }

  /** Apenas o que difere do padrão — a base do endereço compartilhável. */
  naoPadrao(): Record<string, ValorParametro> {
    const saida: Record<string, ValorParametro> = {}
    for (const p of PARAMETROS) {
      if (p.derivado) continue
      const atual = this.valores[p.id]
      if (!iguais(atual, p.padrao)) saida[p.id] = atual as ValorParametro
    }
    return saida
  }

  /** Leitor somente-leitura para limites dinâmicos e derivações. */
  private get leitor(): LeitorDeValores {
    return {
      numero: (id) => this.numero(id),
      booleano: (id) => this.booleano(id),
      texto: (id) => this.texto(id),
    }
  }

  // ── Escrita ───────────────────────────────────────────────────────────────

  /**
   * Escreve um parâmetro, seguindo a ordem obrigatória do contrato:
   * existência → tipo → faixa estática → faixa dinâmica → quantização →
   * derivações → notificação.
   */
  definirParametro(id: string, valor: unknown, origem: OrigemValor = 'usuario'): ResultadoEscrita {
    const def = POR_ID.get(id)
    if (def === undefined) {
      throw new ErroDeParametro(id, `Parâmetro desconhecido: "${id}".`)
    }
    if (def.derivado) {
      throw new ErroDeParametro(
        id,
        `"${def.nome}" (${def.simbolo}) é calculado a partir de outros e não pode ser editado.`,
      )
    }

    const resultado = this.coagirEValidar(def, valor)
    if (!resultado.aplicado) return resultado

    if (!iguais(this.valores[id], resultado.valor)) {
      this.valores[id] = resultado.valor
      this.origens[id] = resultado.limitadoDe !== undefined ? 'limitado' : origem
      this.marcar(id, 'explicita')
      this.aplicarDerivacoes(id)
      this.talvezNotificar()
    }
    return resultado
  }

  /**
   * Aplicação **atômica**: se qualquer identificador for desconhecido, nada é
   * escrito. Metade de um comando aplicada é pior que nenhum.
   */
  definirVarios(
    entradas: Readonly<Record<string, unknown>>,
    origem: OrigemValor = 'usuario',
  ): ResultadoEscrita[] {
    for (const id of Object.keys(entradas)) {
      if (!POR_ID.has(id)) {
        throw new ErroDeParametro(id, `Parâmetro desconhecido: "${id}". Nada foi alterado.`)
      }
    }
    return this.emLote(() =>
      Object.entries(entradas)
        .filter(([id]) => !POR_ID.get(id)!.derivado)
        .map(([id, valor]) => this.definirParametro(id, valor, origem)),
    )
  }

  restaurarParametro(id: string): ResultadoEscrita {
    const def = POR_ID.get(id)
    if (def === undefined) throw new ErroDeParametro(id, `Parâmetro desconhecido: "${id}".`)
    return this.definirParametro(id, def.padrao, 'padrao')
  }

  restaurarTudo(): void {
    this.emLote(() => {
      for (const p of PARAMETROS) {
        if (p.derivado) continue
        this.definirParametro(p.id, p.padrao, 'padrao')
      }
    })
  }

  /**
   * Atualiza o relógio derivado da simulação sem transformar cada quadro em
   * uma alteração de configuração. Por padrão não notifica assinantes: o
   * relógio pode avançar a 60/120 Hz, enquanto UI e URL o amostram em cadência
   * própria. Restauração de URL pode pedir uma notificação única.
   */
  atualizarTempoSimulacao(valor: number, notificar = false): ResultadoEscrita {
    const def = POR_ID.get('t')!
    const resultado = this.coagirEValidar(def, valor)
    if (!resultado.aplicado) return resultado
    if (!iguais(this.valores['t'], resultado.valor)) {
      this.valores['t'] = resultado.valor
      this.origens['t'] = resultado.limitadoDe === undefined ? 'usuario' : 'limitado'
      if (notificar) {
        this.marcar('t', 'explicita')
        this.talvezNotificar()
      }
    }
    return resultado
  }

  /** Agrupa várias escritas em uma única notificação. */
  emLote<T>(acao: () => T): T {
    this.agrupando += 1
    try {
      return acao()
    } finally {
      this.agrupando -= 1
      this.talvezNotificar()
    }
  }

  // ── Validação ─────────────────────────────────────────────────────────────

  private coagirEValidar(def: DefinicaoParametro, valor: unknown): ResultadoEscrita {
    if (def.tipo === 'numero' || def.tipo === 'inteiro') {
      const numeroBruto = typeof valor === 'number' ? valor : Number(valor)
      if (!Number.isFinite(numeroBruto)) {
        return {
          id: def.id,
          aplicado: false,
          valor: this.valores[def.id] as ValorParametro,
          mensagem: `${def.simbolo} (${def.nome}) exige um número; recebeu "${String(valor)}".`,
        }
      }

      const { min, max } = this.faixaEfetiva(def)
      let limitado = numeroBruto
      let mensagem: string | undefined
      let limitadoDe: number | undefined

      if (limitado < min) {
        limitadoDe = numeroBruto
        limitado = min
        mensagem = `${def.simbolo} = ${numeroBruto} está abaixo do mínimo; ajustado para ${min}${sufixo(def)}.`
      } else if (limitado > max) {
        limitadoDe = numeroBruto
        limitado = max
        mensagem = `${def.simbolo} = ${numeroBruto} está acima do máximo; ajustado para ${max}${sufixo(def)}.`
      }

      // `precisao` é exclusivamente de apresentação (RF-039). O estado
      // preserva passos finos menores que o número de casas exibido.
      if (def.tipo === 'inteiro') limitado = Math.round(limitado)

      return {
        id: def.id,
        aplicado: true,
        valor: limitado,
        ...(limitadoDe !== undefined ? { limitadoDe } : {}),
        ...(mensagem !== undefined ? { mensagem } : {}),
      }
    }

    if (def.tipo === 'booleano') {
      const b =
        typeof valor === 'boolean'
          ? valor
          : valor === 1 || valor === '1' || valor === 'true' || valor === 'sim'
      return { id: def.id, aplicado: true, valor: b }
    }

    if (def.tipo === 'enum') {
      const texto = String(valor)
      const aceito = def.opcoes?.some((o) => o.valor === texto) ?? false
      if (!aceito) {
        const validos = def.opcoes?.map((o) => o.valor).join(', ') ?? ''
        return {
          id: def.id,
          aplicado: false,
          valor: this.valores[def.id] as ValorParametro,
          mensagem: `${def.simbolo} não aceita "${texto}". Valores válidos: ${validos}.`,
        }
      }
      return { id: def.id, aplicado: true, valor: texto }
    }

    if (def.tipo === 'multipla') {
      const lista = Array.isArray(valor) ? valor.map(String) : [String(valor)]
      return { id: def.id, aplicado: true, valor: lista }
    }

    return { id: def.id, aplicado: true, valor: valor as ValorParametro }
  }

  /** Faixa estática, estreitada pelo limite dinâmico quando houver. */
  faixaEfetiva(def: DefinicaoParametro): { min: number; max: number } {
    let min = def.min ?? Number.NEGATIVE_INFINITY
    let max = def.max ?? Number.POSITIVE_INFINITY
    const dinamico = def.limiteDinamico?.(this.leitor)
    if (dinamico) {
      if (dinamico.min !== undefined) min = Math.max(min, dinamico.min)
      if (dinamico.max !== undefined) max = Math.min(max, dinamico.max)
    }
    return { min, max }
  }

  // ── Derivações ────────────────────────────────────────────────────────────

  /**
   * Propaga as consequências de uma escrita.
   *
   * O grafo é acíclico por construção; pares mutuamente determinados têm um
   * **lado mestre** explícito, que é o último campo editado pelo usuário.
   */
  private aplicarDerivacoes(idAlterado: string): void {
    // L = 4r, com o vínculo travado (RF-029).
    if (this.booleano('vinculoLR')) {
      if (idAlterado === 'L') {
        this.escreverDireto('r', this.numero('L') / 4)
      } else if (idAlterado === 'r') {
        this.escreverDireto('L', this.numero('r') * 4)
      }
    }

    // Preset planetário escreve g; editar g à mão passa a "personalizado".
    if (idAlterado === 'corpoCeleste') {
      const mapa: Record<string, number> = {
        lua: 1.62,
        terra: 9.81,
        jupiter: 24.79,
        planetaX: 14.2,
      }
      const g = mapa[this.texto('corpoCeleste')]
      if (g !== undefined) this.escreverDireto('g', g)
    } else if (idAlterado === 'g') {
      const mapa: Record<number, string> = { 1.62: 'lua', 9.81: 'terra', 24.79: 'jupiter', 14.2: 'planetaX' }
      const corpo = mapa[this.numero('g')] ?? 'personalizado'
      this.escreverDireto('corpoCeleste', corpo)
    }

    // Ao entrar no domínio cicloidal, condições geometricamente impossíveis
    // são limitadas no mesmo lote. A UI compara antes/depois para comunicar
    // exatamente quais campos mudaram (RF-025/RF-031).
    if (idAlterado === 'modo' && this.texto('modo') !== 'simples') {
      this.escreverDireto('alpha', this.numero('alpha'))
      this.escreverDireto('theta0', this.numero('theta0'))
      const L = this.numero('L')
      const alpha = (this.numero('alpha') * Math.PI) / 180
      this.escreverDireto('h0', (L * Math.sin(alpha) ** 2) / 2)
    }

    // h e α são mutuamente determinados: h = L·sen²θ/2 (RF-158).
    if (idAlterado === 'alpha' || idAlterado === 'L') {
      const L = this.numero('L')
      const rad = (this.numero('alpha') * Math.PI) / 180
      this.escreverDireto('h0', arredondar((L * Math.sin(rad) ** 2) / 2, 4))
    } else if (idAlterado === 'h0') {
      const L = this.numero('L')
      const razao = Math.min(1, Math.max(0, (2 * this.numero('h0')) / L))
      const graus = (Math.asin(Math.sqrt(razao)) * 180) / Math.PI
      this.escreverDireto('alpha', arredondar(graus, 1))
    }
  }

  /** Escrita sem revalidar nem re-derivar — usada só pelas derivações. */
  private escreverDireto(id: string, valor: ValorParametro): void {
    const def = POR_ID.get(id)
    if (def === undefined) return
    let ajustado = valor
    if (typeof valor === 'number') {
      const { min, max } = this.faixaEfetiva(def)
      ajustado = Math.min(max, Math.max(min, valor))
      if (def.precisao !== undefined) ajustado = arredondar(ajustado as number, def.precisao)
    }
    if (!iguais(this.valores[id], ajustado)) {
      this.valores[id] = ajustado
      this.marcar(id, 'derivada')
    }
  }

  // ── Notificação ───────────────────────────────────────────────────────────

  /**
   * Assina alterações. `chaves` vazio ou ausente assina tudo.
   *
   * @returns função de cancelamento.
   */
  assinar(chaves: readonly string[] | null, ouvinte: Ouvinte): () => void {
    this.ouvintes.set(ouvinte, chaves === null || chaves.length === 0 ? null : new Set(chaves))
    return () => {
      this.ouvintes.delete(ouvinte)
    }
  }

  private marcar(id: string, origem: 'explicita' | 'derivada'): void {
    this.pendentes.add(id)
    if (origem === 'explicita') this.explicitasPendentes.add(id)
    else this.derivadasPendentes.add(id)
  }

  private talvezNotificar(): void {
    if (this.agrupando > 0 || this.pendentes.size === 0) return
    if (this.notificando) {
      throw new Error(
        'Um assinante escreveu no estado dentro do próprio callback — isso cria laço de realimentação.',
      )
    }
    const alteradas = this.pendentes
    const contexto: ContextoAlteracao = {
      explicitas: this.explicitasPendentes,
      derivadas: this.derivadasPendentes,
    }
    this.pendentes = new Set()
    this.explicitasPendentes = new Set()
    this.derivadasPendentes = new Set()
    this.notificando = true
    try {
      for (const [ouvinte, filtro] of this.ouvintes) {
        if (filtro === null || [...alteradas].some((k) => filtro.has(k))) {
          ouvinte(alteradas, contexto)
        }
      }
    } finally {
      this.notificando = false
    }
  }
}

// ── Auxiliares ──────────────────────────────────────────────────────────────

function arredondar(v: number, casas: number): number {
  const f = 10 ** casas
  return Math.round(v * f) / f
}

function sufixo(def: DefinicaoParametro): string {
  return def.unidade === null ? '' : ` ${def.unidade}`
}

function iguais(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => v === b[i])
  }
  if (typeof a === 'object' && a !== null && typeof b === 'object' && b !== null) {
    return JSON.stringify(a) === JSON.stringify(b)
  }
  return a === b
}

export { encontrarParametro }
