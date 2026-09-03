/**
 * O store: única porta de escrita do estado.
 *
 * A camada de interface **nunca** altera valores diretamente e **nunca** chama o
 * motor de física — escreve por ações, lê por seletores. É essa disciplina que
 * mantém o determinismo do Princípio V e permite que o endereço compartilhável
 * reconstrua qualquer estado.
 */

import type { ValorParametro } from './tipos.js'
import {
  analisarChave,
  chaveAcoplamento,
  chaveIndexada,
  ehChaveDeAcoplamento,
  resolverAlvo,
  rotuloIndexado,
  validarIndice,
} from './indices.js'
import { encontrarParametro, PARAMETROS, POR_ID, valoresPadrao } from './schema.js'
import type { DefinicaoParametro, LeitorDeValores } from './tipos.js'
import {
  ColetorTabela,
  ColecaoMedicoes,
  type EntradaMedicao,
  type Medicao,
  type ResumoEstatistico,
} from './measurements.js'
import type { EventoPassagem } from '../physics/sensor.js'
import type { ModoPendulo } from '../physics/types.js'
import type { Rad } from '../physics/units.js'

export type OrigemValor = 'padrao' | 'usuario' | 'preset' | 'url' | 'roteiro' | 'limitado'

/** Escrita indexada, acompanhada da interpretação adotada (RF-153). */
export interface ResultadoIndexado extends ResultadoEscrita {
  /** Frase curta dizendo quais pêndulos foram alcançados, e por quê. */
  readonly explicacao: string
}

/** Números em mensagens seguem a vírgula decimal, como o resto da interface. */
function decimal(valor: number): string {
  return String(valor).replace('.', ',')
}

/** Parâmetros cuja largada é um único fato físico, reconciliado em conjunto. */
const TRIO_LARGADA = new Set(['theta0', 'alpha', 'h0'])

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
  private readonly colecaoMedicoes = new ColecaoMedicoes()
  private readonly coletorTabela = new ColetorTabela(this)

  constructor(iniciais: Readonly<Record<string, ValorParametro>> = {}) {
    this.valores = valoresPadrao()
    for (const p of PARAMETROS) this.origens[p.id] = 'padrao'
    if (Object.keys(iniciais).length === 0) return

    // Um instantâneo carrega, além dos parâmetros do catálogo, as chaves
    // compostas do estado indexado. Elas não passam pela validação de novo:
    // já foram validadas quando escritas, e revalidá-las aqui as submeteria a
    // limites dinâmicos que dependem de parâmetros ainda não aplicados.
    const simples: Record<string, ValorParametro> = {}
    const compostas: Record<string, ValorParametro> = {}
    for (const [chave, valor] of Object.entries(iniciais)) {
      const indexada = ehChaveDeAcoplamento(chave) || analisarChave(chave).indice !== null
      if (indexada) compostas[chave] = valor
      else simples[chave] = valor
    }
    if (Object.keys(simples).length > 0) this.definirVarios(simples, 'preset')
    Object.assign(this.valores, compostas)
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
      // Derivados nunca entram; espelhos também não, porque são reconstruídos
      // a partir do canônico e incluí-los tornaria o resultado dependente da
      // ordem de aplicação (RF-166).
      if (p.derivado || p.espelhoDe !== undefined) continue
      const atual = this.valores[p.id]
      if (!iguais(atual, p.padrao)) saida[p.id] = atual as ValorParametro
    }
    return saida
  }

  /**
   * Sobreposições e desacoplamentos ativos, para o endereço compartilhável.
   *
   * Vem separado de `naoPadrao` porque as chaves não são parâmetros do
   * catálogo: quem consome precisa saber que está lidando com estado indexado,
   * e não descobrir isso ao tentar validar um id que não existe.
   */
  estadoIndexadoNaoPadrao(): Record<string, ValorParametro> {
    const saida: Record<string, ValorParametro> = {}
    for (const p of PARAMETROS) {
      if (p.indexavel !== true || this.acoplado(p.id)) continue
      // Espelhos do trio são reconstruídos a partir de θ₀, aqui como no base.
      if (p.espelhoDe === undefined) saida[chaveAcoplamento(p.id)] = false
      for (const i of this.indicesDePendulo()) {
        const chave = chaveIndexada(p.id, i)
        const valor = this.valores[chave]
        if (valor !== undefined && p.espelhoDe === undefined) saida[chave] = valor
      }
    }
    return saida
  }

  /** Aplica um estado indexado vindo de fora, reconciliando cada pêndulo. */
  aplicarEstadoIndexado(entradas: Readonly<Record<string, ValorParametro>>): void {
    this.emLote(() => {
      for (const [chave, valor] of Object.entries(entradas)) {
        if (ehChaveDeAcoplamento(chave)) {
          const id = chave.slice(`${'#'}acoplado${'#'}`.length)
          if (POR_ID.has(id) && valor === false) this.definirAcoplamento(id, false)
          continue
        }
        const { id, indice } = analisarChave(chave)
        if (indice === null || !POR_ID.has(id)) continue
        this.definirIndexado(id, indice, valor, 'url')
      }
    })
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
        // Espelhos ficam de fora pelo mesmo motivo que não entram em
        // `naoPadrao`: são reconstruídos a partir do canônico. Restaurá-los
        // explicitamente deixaria o último espelho da lista sobrescrever θ₀
        // com o seu próprio arredondamento, e o padrão não voltaria ao padrão.
        if (p.derivado || p.espelhoDe !== undefined) continue
        this.definirParametro(p.id, p.padrao, 'padrao')
      }
    })
  }

  // ── Parâmetros indexados por pêndulo (RF-151 a RF-156) ───────────────────

  /** Índices dos pêndulos existentes, de 1 a `n_p`. */
  indicesDePendulo(): readonly number[] {
    return Array.from({ length: this.numero('numeroPendulos') }, (_, i) => i + 1)
  }

  /**
   * Um parâmetro acoplado tem um valor só, compartilhado por todos os pêndulos.
   * Todos começam acoplados: um simulador em que `L` significa coisas
   * diferentes por padrão seria pior que um sem pêndulos múltiplos.
   */
  acoplado(id: string): boolean {
    this.exigirIndexavel(id)
    return this.valores[chaveAcoplamento(id)] !== false
  }

  /**
   * Acopla ou desacopla um parâmetro (RF-154).
   *
   * Desacoplar semeia as sobreposições com o valor compartilhado, e acoplar
   * as descarta. Nos dois sentidos a cena não muda de aparência no instante da
   * troca — mudar o regime de edição não é mudar o experimento.
   */
  definirAcoplamento(id: string, acoplado: boolean): void {
    this.exigirIndexavel(id)
    // θ₀, α e h descrevem um único fato físico por pêndulo (RF-161). Soltar só
    // um deles deixaria `h₂` reconciliar o `α` **compartilhado**, e o último
    // pêndulo escrito imporia o seu ângulo a todos os outros.
    const grupo = TRIO_LARGADA.has(id) ? [...TRIO_LARGADA] : [id]
    if (grupo.every((membro) => this.acoplado(membro) === acoplado)) return
    this.emLote(() => {
      for (const membro of grupo) {
        if (acoplado) {
          for (const i of this.indicesDePendulo()) delete this.valores[chaveIndexada(membro, i)]
        } else {
          const base = this.valores[membro] as ValorParametro
          for (const i of this.indicesDePendulo()) this.valores[chaveIndexada(membro, i)] = base
        }
        this.valores[chaveAcoplamento(membro)] = acoplado
        this.marcar(membro, 'explicita')
      }
    })
  }

  /** Valor bruto que vale para um pêndulo: a sobreposição, ou o compartilhado. */
  brutoDoPendulo(id: string, indice: number): ValorParametro {
    if (!POR_ID.has(id)) throw new ErroDeParametro(id, `Parâmetro desconhecido: "${id}".`)
    const def = POR_ID.get(id)!
    if (def.indexavel !== true || this.acoplado(id)) return this.valores[id] as ValorParametro
    return (this.valores[chaveIndexada(id, indice)] ?? this.valores[id]) as ValorParametro
  }

  numeroDoPendulo(id: string, indice: number): number {
    const valor = this.brutoDoPendulo(id, indice)
    if (typeof valor !== 'number') {
      throw new ErroDeParametro(id, `"${id}" não é numérico.`)
    }
    return valor
  }

  /**
   * Escreve respeitando o endereçamento indexado (RF-151 a RF-155).
   *
   * @param indice índice do pêndulo, ou `null` para a forma sem índice.
   */
  definirIndexado(
    id: string,
    indice: number | null,
    valor: unknown,
    origem: OrigemValor = 'usuario',
  ): ResultadoIndexado {
    const def = POR_ID.get(id)
    if (def === undefined) throw new ErroDeParametro(id, `Parâmetro desconhecido: "${id}".`)
    if (def.indexavel !== true) {
      if (indice !== null) {
        return {
          ...this.recusa(id, `${def.simbolo} (${def.nome}) não existe por pêndulo, então não aceita índice.`),
          explicacao: '',
        }
      }
      return { ...this.definirParametro(id, valor, origem), explicacao: '' }
    }

    const numeroPendulos = this.numero('numeroPendulos')
    if (indice !== null) {
      const erro = validarIndice(indice, numeroPendulos)
      if (erro !== null) return { ...this.recusa(id, erro), explicacao: '' }
    }

    const alvo = resolverAlvo(indice, {
      simbolo: def.simbolo,
      acoplado: this.acoplado(id),
      numeroPendulos,
      foco: this.numero('penduloFoco'),
    })

    if (alvo.escreveBase) {
      return { ...this.definirParametro(id, valor, origem), explicacao: alvo.explicacao }
    }

    return this.emLote(() => {
      if (alvo.desacopla) this.definirAcoplamento(id, false)
      let ultimo: ResultadoEscrita | null = null
      for (const i of alvo.indices) ultimo = this.escreverSobreposicao(def, i, valor, origem)
      return { ...(ultimo ?? this.recusa(id, 'Nenhum pêndulo alcançado.')), explicacao: alvo.explicacao }
    })
  }

  private exigirIndexavel(id: string): void {
    const def = POR_ID.get(id)
    if (def === undefined) throw new ErroDeParametro(id, `Parâmetro desconhecido: "${id}".`)
    if (def.indexavel !== true) {
      throw new ErroDeParametro(id, `${def.simbolo} (${def.nome}) não existe por pêndulo.`)
    }
  }

  private recusa(id: string, mensagem: string): ResultadoEscrita {
    return { id, aplicado: false, valor: this.valores[id] as ValorParametro, mensagem }
  }

  /** Escreve a sobreposição de um pêndulo, validando como o valor base. */
  private escreverSobreposicao(
    def: DefinicaoParametro,
    indice: number,
    valor: unknown,
    origem: OrigemValor,
  ): ResultadoEscrita {
    const resultado = this.coagirEValidar(def, valor, rotuloIndexado(def.simbolo, indice))
    if (!resultado.aplicado) return resultado
    const chave = chaveIndexada(def.id, indice)
    if (!iguais(this.valores[chave], resultado.valor)) {
      this.valores[chave] = resultado.valor
      this.origens[chave] = resultado.limitadoDe !== undefined ? 'limitado' : origem
      this.marcar(def.id, 'explicita')
      // O trio de largada existe por pêndulo, e reconciliá-lo com os valores
      // do pêndulo 1 desfaria justamente a independência que a tautocronia
      // precisa demonstrar (RF-159).
      if (TRIO_LARGADA.has(def.id)) this.sincronizarLargadaDoPendulo(def.id, indice)
      this.talvezNotificar()
    }
    return resultado
  }

  /** Reconcilia θ₀, α e h de um pêndulo, com os valores dele (RF-158). */
  private sincronizarLargadaDoPendulo(idAlterado: string, indice: number): void {
    this.sincronizarTrio(
      idAlterado,
      (id) => this.numeroDoPendulo(id, indice),
      (id, valor) => this.escreverDiretoNoPendulo(id, indice, valor),
    )
  }

  private escreverDiretoNoPendulo(id: string, indice: number, valor: number): void {
    const def = POR_ID.get(id)
    if (def === undefined) return
    if (def.indexavel !== true || this.acoplado(id)) {
      this.escreverDireto(id, valor)
      return
    }
    const { min, max } = this.faixaEfetiva(def)
    const ajustado = quantizarDerivado(Math.min(max, Math.max(min, valor)))
    const chave = chaveIndexada(id, indice)
    if (!iguais(this.valores[chave], ajustado)) {
      this.valores[chave] = ajustado
      this.marcar(id, 'derivada')
    }
  }

  // ── Medições ─────────────────────────────────────────────────────────────

  /** Seletor da coleção única usada pela tabela e pelo caderno. */
  selecionarMedicoes(): readonly Medicao[] {
    return this.colecaoMedicoes.todas
  }

  ordenarMedicoes(coluna: keyof Medicao, direcao: 'asc' | 'desc' = 'asc'): readonly Medicao[] {
    return this.colecaoMedicoes.ordenadas(coluna, direcao)
  }

  paginarMedicoes(
    coluna: keyof Medicao,
    direcao: 'asc' | 'desc',
    inicio: number,
    limite: number,
  ): readonly Medicao[] {
    return this.colecaoMedicoes.paginaOrdenada(coluna, direcao, inicio, limite)
  }

  contagemMedicoes(): number {
    return this.colecaoMedicoes.contagem
  }

  estatisticasMedicoes(coluna: 'T' | 'gInferido' | 'gInferidoIngenuo'): ResumoEstatistico {
    return this.colecaoMedicoes.estatisticasDe(coluna)
  }

  /** Seletor do estado da coleta automática, sem expor o coletor à interface. */
  selecionarColetaAutomatica(): boolean {
    return this.coletorTabela.automaticaAtiva
  }

  registrarMedicao(entrada: EntradaMedicao): Medicao {
    return this.colecaoMedicoes.registrar(entrada)
  }

  definirColetaAutomatica(ativa: boolean): void {
    this.coletorTabela.definirColeta(ativa)
  }

  registrarPassagemSensor(
    modo: ModoPendulo,
    evento: EventoPassagem,
    alpha: Rad,
  ): Medicao | null {
    return this.coletorTabela.registrarPassagem(modo, evento, alpha)
  }

  coletarMedicaoManual(modo: ModoPendulo, tColeta: number, alphaAtual?: Rad): Medicao {
    return this.coletorTabela.coletarManual(modo, tColeta, alphaAtual)
  }

  reiniciarSensorColeta(): void {
    this.coletorTabela.reiniciarSensor()
  }

  removerMedicao(n: number): boolean {
    return this.colecaoMedicoes.remover(n)
  }

  limparTabela(): void {
    this.colecaoMedicoes.limpar()
  }

  carregarMedicoes(linhas: readonly Medicao[]): void {
    this.colecaoMedicoes.carregar(linhas)
  }

  assinarMedicoes(ouvinte: () => void): () => void {
    return this.colecaoMedicoes.assinar(ouvinte)
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

  /**
   * @param rotulo nome a usar nas mensagens. Uma escrita indexada precisa dizer
   *   `L₁`, e não `L`: o usuário não reconheceria como sua a mensagem que
   *   nomeia um parâmetro que ele não digitou.
   */
  private coagirEValidar(
    def: DefinicaoParametro,
    valor: unknown,
    rotulo: string = def.simbolo,
  ): ResultadoEscrita {
    if (def.tipo === 'numero' || def.tipo === 'inteiro') {
      const numeroBruto = typeof valor === 'number' ? valor : Number(valor)
      if (!Number.isFinite(numeroBruto)) {
        return {
          id: def.id,
          aplicado: false,
          valor: this.valores[def.id] as ValorParametro,
          mensagem: `${rotulo} (${def.nome}) exige um número; recebeu "${String(valor)}".`,
        }
      }

      const { min, max } = this.faixaEfetiva(def)
      let limitado = numeroBruto
      let mensagem: string | undefined
      let limitadoDe: number | undefined

      if (limitado < min) {
        limitadoDe = numeroBruto
        limitado = min
        mensagem = `${rotulo} = ${decimal(numeroBruto)} está abaixo do mínimo; ajustado para ${decimal(min)}${sufixo(def)}.`
      } else if (limitado > max) {
        limitadoDe = numeroBruto
        limitado = max
        mensagem = `${rotulo} = ${decimal(numeroBruto)} está acima do máximo; ajustado para ${decimal(max)}${sufixo(def)}.`
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

    // Reduzir a quantidade de pêndulos não pode deixar o foco apontando para um
    // que deixou de existir: uma atribuição sem índice sumiria sem erro.
    // As sobreposições dos índices removidos ficam guardadas — descartá-las
    // faria uma mudança transitória de n_p apagar trabalho do usuário.
    if (idAlterado === 'numeroPendulos') {
      const limite = this.numero('numeroPendulos')
      if (this.numero('penduloFoco') > limite) this.escreverDireto('penduloFoco', limite)
    }

    // θ₀, α e h descrevem um único fato físico: de onde a massa é solta.
    // Qualquer um deles muda — e a troca de modo ou de L, que reposicionam o
    // que é geometricamente possível — reconcilia o trio (Área M).
    if (['theta0', 'alpha', 'h0', 'L', 'modo'].includes(idAlterado)) {
      this.sincronizarLargada(idAlterado)
    }
  }

  /**
   * Reconcilia θ₀, α e h a partir do canônico (RF-161 a RF-165).
   *
   * `θ₀` é o canônico por ser o único que carrega magnitude **e** lado. Editar
   * um espelho traduz a intenção para θ₀; os espelhos são então recalculados a
   * partir do θ₀ **já quantizado**, e nunca do valor cru digitado — do
   * contrário o estado guardaria um `h` que não corresponde ao `α` exibido, e a
   * incoerência voltaria menor, porém viva.
   */
  private sincronizarLargada(idAlterado: string): void {
    this.sincronizarTrio(
      idAlterado,
      (id) => this.numero(id),
      (id, valor) => this.escreverDireto(id, valor),
    )
  }

  /**
   * Altura de largada correspondente a uma amplitude, conforme o modo (RF-158).
   *
   * As duas relações descrevem geometrias diferentes e **não** são
   * intercambiáveis: no simples a massa sobe `L(1 − cos α)` ao longo de um arco
   * de círculo; no cicloidal ela sobe `L·sen²θ/2` ao longo da face, com máximo
   * `L/2 = 2r` no topo. Usar a segunda no primeiro modo — como se fazia até
   * aqui — dá 0,015077 m onde o correto é 0,015192 m a 10°.
   */
  private alturaDeAmplitude(alphaGraus: number, L: number): number {
    const alpha = (Math.abs(alphaGraus) * Math.PI) / 180
    if (this.texto('modo') === 'simples') return L * (1 - Math.cos(alpha))
    const seno = Math.sin(alpha)
    return (L * seno * seno) / 2
  }

  /** Inverte `alturaDeAmplitude`, saturando no máximo geométrico (RF-160). */
  private amplitudeDeAltura(h: number, L: number): number {
    const grausParaRad = Math.PI / 180
    if (this.texto('modo') === 'simples') {
      const cos = Math.min(1, Math.max(-1, 1 - h / L))
      return Math.acos(cos) / grausParaRad
    }
    const razao = Math.min(1, Math.max(0, (2 * h) / L))
    return Math.asin(Math.sqrt(razao)) / grausParaRad
  }

  /**
   * Reconcilia θ₀, α e h de **um** pêndulo, a partir do canônico.
   *
   * Recebe o par de acesso em vez de ler o store direto para que o trio do
   * pêndulo 1 e o de um pêndulo indexado passem exatamente pela mesma física:
   * duas cópias da reconciliação divergiriam na primeira correção.
   */
  private sincronizarTrio(
    idAlterado: string,
    ler: (id: string) => number,
    escrever: (id: string, valor: number) => void,
  ): void {
    const L = ler('L')

    // Lado de largada preservado: mexer em α não joga a massa para o outro
    // lado sem que isso tenha sido pedido (RF-164).
    const theta0Atual = ler('theta0')
    const lado = theta0Atual < 0 ? -1 : 1

    let theta0Alvo: number
    if (idAlterado === 'alpha') {
      theta0Alvo = lado * Math.abs(ler('alpha'))
    } else if (idAlterado === 'h0') {
      theta0Alvo = lado * this.amplitudeDeAltura(ler('h0'), L)
    } else {
      theta0Alvo = theta0Atual
    }

    // O limite geométrico do modo cicloidal vale para o canônico também: sem
    // isso, entrar no modo com θ₀ = 150° deixaria a massa fora da face.
    const defTheta0 = POR_ID.get('theta0')!
    const defAlpha = POR_ID.get('alpha')!
    const faixaAlpha = this.faixaEfetiva(defAlpha)
    const limite = Math.min(faixaAlpha.max, defTheta0.max ?? 179.9)
    theta0Alvo = Math.sign(theta0Alvo) * Math.min(Math.abs(theta0Alvo), limite)

    escrever('theta0', theta0Alvo)

    // Espelhos, sempre a partir do canônico recém-escrito e em precisão plena.
    const alpha = Math.abs(ler('theta0'))
    escrever('alpha', alpha)
    escrever('h0', this.alturaDeAmplitude(alpha, L))
  }

  /** Escrita sem revalidar nem re-derivar — usada só pelas derivações. */
  private escreverDireto(id: string, valor: ValorParametro): void {
    const def = POR_ID.get(id)
    if (def === undefined) return
    let ajustado = valor
    if (typeof valor === 'number') {
      const { min, max } = this.faixaEfetiva(def)
      ajustado = quantizarDerivado(Math.min(max, Math.max(min, valor)))
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

/**
 * Piso de quantização das escritas **derivadas**.
 *
 * Não é arredondamento de apresentação: `precisao` governa a tela, e escritas
 * diretas do usuário guardam o valor cheio — é o que permite o passo fino mexer
 * em α por 0,01 embora se exiba uma casa.
 *
 * O que se corta aqui é ruído de ponto flutuante: uma volta por `asin(sqrt(…))`
 * devolve 45,00000000000001 em vez de 45. Nove casas ficam muito abaixo de
 * qualquer passo fino do catálogo e muito acima de qualquer significado físico.
 */
const CASAS_DERIVADAS = 9

function quantizarDerivado(v: number): number {
  const f = 10 ** CASAS_DERIVADAS
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
