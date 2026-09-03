/**
 * Interpretador do console de parâmetros — onde se digita `α = 10`.
 *
 * É o requisito que o usuário explicitou: definir parâmetros **por valor
 * digitado e nomeado**, não só arrastando sliders (Princípio III).
 *
 * Gramática aceita:
 *
 *     comando    := atribuicao (';' atribuicao)*
 *     atribuicao := alias ('='|':')? numero unidade?
 *     alias      := símbolo | id | nome | apelido    (sem distinção de acento ou caixa)
 *
 * Aceita índice subscrito para pêndulos indexados (RF-152): `L₁`, `L1`, `L_1`.
 *
 * Regra de atomicidade: uma linha inválida **não aplica nenhuma** das
 * atribuições daquela linha. Metade de um comando aplicada é pior que nenhum.
 */

import { encontrarParametro, normalizarChave, PARAMETROS_INDEXAVEIS, POR_ID } from './schema.js'
import { interpretarEntradaNumerica } from './numeric-input.js'
import { Store } from './store.js'

const SUBSCRITOS = '₀₁₂₃₄₅₆₇₈₉'

export interface Atribuicao {
  readonly termo: string
  readonly id: string
  readonly linha: number
  readonly posicao: number
  /** Índice do pêndulo, quando informado (`L₁` ⇒ 1). */
  readonly indice?: number
  readonly valor: number | boolean | string
}

export interface ResultadoConsole {
  readonly sucesso: boolean
  readonly atribuicoes: readonly Atribuicao[]
  readonly erros: readonly string[]
  readonly mensagens: readonly string[]
}

/** Converte dígitos subscritos em comuns: `L₁` ⇒ `L1`. */
function normalizarSubscritos(texto: string): string {
  let saida = ''
  for (const ch of texto) {
    const i = SUBSCRITOS.indexOf(ch)
    saida += i >= 0 ? String(i) : ch
  }
  return saida
}

/**
 * Separa o termo do índice: `L1`, `L_1` e `L₁` viram `{ base: 'L', indice: 1 }`.
 *
 * Só separa quando a base **sem** o dígito é reconhecida como parâmetro. Isso
 * evita mutilar nomes que terminam em número por natureza, como `theta0`.
 */
function separarIndice(termo: string): { base: string; indice?: number } {
  const normalizado = normalizarSubscritos(termo)
  if (encontrarParametro(normalizado) !== undefined) return { base: normalizado }

  const casamento = /^(.*?)_?(\d+)$/.exec(normalizado)
  if (casamento === null) return { base: normalizado }

  const base = casamento[1] ?? ''
  const indice = Number(casamento[2])
  if (base !== '' && encontrarParametro(base) !== undefined) return { base, indice }
  return { base: normalizado }
}

interface ComandoLocalizado {
  readonly texto: string
  readonly linha: number
  readonly posicao: number
}

function localizarComandos(bloco: string): ComandoLocalizado[] {
  const comandos: ComandoLocalizado[] = []
  for (const [indiceLinha, original] of bloco.split(/\r?\n/).entries()) {
    const marcadores = [original.indexOf('#'), original.indexOf('//')].filter((indice) => indice >= 0)
    const semComentario = original.slice(0, marcadores.length === 0 ? undefined : Math.min(...marcadores))
    let inicio = 0
    for (const trecho of semComentario.split(';')) {
      const primeiro = trecho.search(/\S/)
      if (primeiro >= 0) comandos.push({ texto: trecho.trim(), linha: indiceLinha + 1, posicao: inicio + primeiro + 1 })
      inicio += trecho.length + 1
    }
  }
  return comandos
}

const erroLocalizado = (comando: ComandoLocalizado, motivo: string): string =>
  `Linha ${comando.linha}, posição ${comando.posicao}: ${motivo}`

/**
 * Interpreta uma linha sem aplicá-la — útil para validar antes de escrever.
 */
export function interpretar(linha: string): ResultadoConsole {
  const erros: string[] = []
  const atribuicoes: Atribuicao[] = []

  const comandos = localizarComandos(linha)

  if (comandos.length === 0) {
    return { sucesso: false, atribuicoes: [], erros: ['Nada a interpretar.'], mensagens: [] }
  }

  for (const localizado of comandos) {
    const comando = localizado.texto
    // Separa por '=' ou ':' quando houver; senão, pelo primeiro espaço.
    let termoBruto: string
    let valorBruto: string
    const separador = /[=:]/.exec(comando)
    if (separador !== null) {
      termoBruto = comando.slice(0, separador.index)
      valorBruto = comando.slice(separador.index + 1)
    } else {
      const espaco = comando.search(/\s/)
      if (espaco < 0) {
        erros.push(erroLocalizado(localizado, `"${comando}" não é uma atribuição. Use, por exemplo, α = 10.`))
        continue
      }
      termoBruto = comando.slice(0, espaco)
      valorBruto = comando.slice(espaco + 1)
    }

    const { base, indice } = separarIndice(termoBruto.trim())
    const def = encontrarParametro(base)
    if (def === undefined) {
      erros.push(erroLocalizado(localizado, `Parâmetro desconhecido: "${termoBruto.trim()}".`))
      continue
    }
    if (indice !== undefined && !def.indexavel) {
      erros.push(erroLocalizado(localizado, `${def.simbolo} (${def.nome}) não existe por pêndulo, então não aceita índice.`))
      continue
    }

    const textoValor = valorBruto.trim()
    if (def.tipo === 'numero' || def.tipo === 'inteiro') {
      const analise = interpretarEntradaNumerica(textoValor, def)
      if (!analise.valido || analise.valor === undefined) {
        erros.push(erroLocalizado(localizado, analise.mensagem ?? `${def.simbolo} exige um número; recebeu "${textoValor}".`))
        continue
      }
      atribuicoes.push({
        termo: termoBruto.trim(),
        id: def.id,
        linha: localizado.linha,
        posicao: localizado.posicao,
        ...(indice !== undefined ? { indice } : {}),
        valor: analise.valor,
      })
    } else if (def.tipo === 'booleano') {
      const verdadeiro = ['1', 'true', 'sim', 'ligado', 'on'].includes(normalizarChave(textoValor))
      const falso = ['0', 'false', 'nao', 'desligado', 'off'].includes(normalizarChave(textoValor))
      if (!verdadeiro && !falso) {
        erros.push(erroLocalizado(localizado, `${def.simbolo} aceita ligado/desligado; recebeu "${textoValor}".`))
        continue
      }
      atribuicoes.push({ termo: termoBruto.trim(), id: def.id, linha: localizado.linha, posicao: localizado.posicao, valor: verdadeiro })
    } else {
      atribuicoes.push({ termo: termoBruto.trim(), id: def.id, linha: localizado.linha, posicao: localizado.posicao, valor: textoValor })
    }
  }

  return { sucesso: erros.length === 0, atribuicoes, erros, mensagens: [] }
}

/**
 * Interpreta e aplica ao store, de forma atômica.
 *
 * Havendo qualquer erro na linha, **nada** é escrito.
 */
export function executar(store: Store, linha: string): ResultadoConsole {
  const analise = interpretar(linha)
  if (!analise.sucesso) return analise
  const estadoAnterior = store.instantaneo()

  const erros: string[] = []
  // A primeira passagem acontece sobre um clone: valida tipos, enums,
  // derivados, limites dinâmicos e a ordem das atribuições sem tocar no estado
  // real. Só uma linha inteiramente válida chega à segunda passagem.
  const candidato = new Store(store.instantaneo())
  candidato.emLote(() => {
    for (const a of analise.atribuicoes) {
      const def = POR_ID.get(a.id)
      if (def?.derivado === true) {
        erros.push(`Linha ${a.linha}, posição ${a.posicao}: ${def.simbolo} é calculado a partir de outros e não pode ser definido.`)
        continue
      }
      const resultado = candidato.definirIndexado(a.id, a.indice ?? null, a.valor, 'usuario')
      if (!resultado.aplicado && resultado.mensagem !== undefined) {
        erros.push(`Linha ${a.linha}, posição ${a.posicao}: ${resultado.mensagem}`)
      }
    }
  })

  if (erros.length > 0) {
    return { sucesso: false, atribuicoes: analise.atribuicoes, erros, mensagens: [] }
  }

  const mensagens: string[] = []
  store.emLote(() => {
    for (const a of analise.atribuicoes) {
      const resultado = store.definirIndexado(a.id, a.indice ?? null, a.valor, 'usuario')
      if (resultado.mensagem !== undefined) mensagens.push(resultado.mensagem)
      // Qual pêndulo a linha alcançou não é dedutível do texto digitado: com os
      // parâmetros acoplados `L = 2` muda todos, e soltos muda um só (RF-153).
      if (resultado.explicacao !== '') mensagens.push(resultado.explicacao)
    }
  })

  const definiuModo = analise.atribuicoes.some((atribuicao) => atribuicao.id === 'modo')
  if (definiuModo) {
    for (const id of ['alpha', 'theta0'] as const) {
      const antes = estadoAnterior[id]
      const depois = store.bruto(id)
      const foiEscrito = analise.atribuicoes.some((atribuicao) => atribuicao.id === id)
      // Só é restrição geométrica se o valor tiver de fato encostado no limite
      // do modo. Sem esta conferência, qualquer reconciliação do trio — trocar
      // h, por exemplo — seria anunciada como um limite que não houve.
      const def0 = POR_ID.get(id)!
      const limite = store.faixaEfetiva(def0).max
      const encostou = typeof depois === 'number' && Math.abs(Math.abs(depois) - limite) < 1e-6
      if (!foiEscrito && encostou && typeof antes === 'number' && typeof depois === 'number' && antes !== depois) {
        const def = POR_ID.get(id)!
        mensagens.push(
          `${def.simbolo} foi ajustado de ${antes}${def.unidade ?? ''} para ${depois}${def.unidade ?? ''} pela restrição geométrica do modo cicloidal.`,
        )
      }
    }
  }

  return { sucesso: true, atribuicoes: analise.atribuicoes, erros: [], mensagens }
}

/** Produz um bloco que o próprio console consegue reimportar. */
export function formatarEstadoConsole(store: Store): string {
  const linhas: string[] = []
  for (const [id, valor] of Object.entries(store.instantaneo())) {
    const def = POR_ID.get(id)
    if (def === undefined || def.derivado || typeof valor === 'object') continue
    const texto = typeof valor === 'boolean' ? (valor ? 'ligado' : 'desligado') : String(valor)
    linhas.push(`${id} = ${texto}${def.unidade === null ? '' : ` ${def.unidade}`}`)
  }
  // Sobreposicoes por pendulo, na notacao que o proprio console reconhece de
  // volta (RF-152, RF-156). Sem elas, "gerar estado atual" produziria um bloco
  // que descreve um experimento diferente do que esta na tela.
  for (const p of PARAMETROS_INDEXAVEIS) {
    if (p.espelhoDe !== undefined || store.acoplado(p.id)) continue
    for (const i of store.indicesDePendulo()) {
      const valor = store.brutoDoPendulo(p.id, i)
      if (typeof valor === 'object') continue
      const texto = typeof valor === 'boolean' ? (valor ? 'ligado' : 'desligado') : String(valor)
      linhas.push(`${p.id}_${i} = ${texto}${p.unidade === null ? '' : ` ${p.unidade}`}`)
    }
  }
  return linhas.join('\n')
}
