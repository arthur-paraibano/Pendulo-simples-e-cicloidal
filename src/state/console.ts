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

import { encontrarParametro, normalizarChave, POR_ID } from './schema.js'
import type { Store } from './store.js'

const SUBSCRITOS = '₀₁₂₃₄₅₆₇₈₉'

export interface Atribuicao {
  readonly termo: string
  readonly id: string
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

/** Interpreta um número aceitando vírgula ou ponto como separador decimal. */
function interpretarNumero(texto: string): number | null {
  const limpo = texto.trim().replace(',', '.')
  if (limpo === '') return null
  const n = Number(limpo)
  return Number.isFinite(n) ? n : null
}

/**
 * Interpreta uma linha sem aplicá-la — útil para validar antes de escrever.
 */
export function interpretar(linha: string): ResultadoConsole {
  const erros: string[] = []
  const atribuicoes: Atribuicao[] = []

  const comandos = linha
    .split(';')
    .map((c) => c.trim())
    .filter((c) => c !== '')

  if (comandos.length === 0) {
    return { sucesso: false, atribuicoes: [], erros: ['Nada a interpretar.'], mensagens: [] }
  }

  for (const comando of comandos) {
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
        erros.push(`"${comando}" não é uma atribuição. Use, por exemplo, α = 10.`)
        continue
      }
      termoBruto = comando.slice(0, espaco)
      valorBruto = comando.slice(espaco + 1)
    }

    const { base, indice } = separarIndice(termoBruto.trim())
    const def = encontrarParametro(base)
    if (def === undefined) {
      erros.push(`Parâmetro desconhecido: "${termoBruto.trim()}".`)
      continue
    }
    if (indice !== undefined && !def.indexavel) {
      erros.push(
        `${def.simbolo} (${def.nome}) não existe por pêndulo, então não aceita índice.`,
      )
      continue
    }

    const textoValor = valorBruto.trim()
    if (def.tipo === 'numero' || def.tipo === 'inteiro') {
      // Descarta uma unidade escrita depois do número: "10 °", "0.1745 rad".
      const soNumero = /^[+-]?[\d.,]+(?:[eE][+-]?\d+)?/.exec(textoValor)?.[0] ?? ''
      const n = interpretarNumero(soNumero)
      if (n === null) {
        erros.push(`${def.simbolo} exige um número; recebeu "${textoValor}".`)
        continue
      }
      atribuicoes.push({
        termo: termoBruto.trim(),
        id: def.id,
        ...(indice !== undefined ? { indice } : {}),
        valor: n,
      })
    } else if (def.tipo === 'booleano') {
      const verdadeiro = ['1', 'true', 'sim', 'ligado', 'on'].includes(normalizarChave(textoValor))
      const falso = ['0', 'false', 'nao', 'desligado', 'off'].includes(normalizarChave(textoValor))
      if (!verdadeiro && !falso) {
        erros.push(`${def.simbolo} aceita ligado/desligado; recebeu "${textoValor}".`)
        continue
      }
      atribuicoes.push({ termo: termoBruto.trim(), id: def.id, valor: verdadeiro })
    } else {
      atribuicoes.push({ termo: termoBruto.trim(), id: def.id, valor: textoValor })
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

  const mensagens: string[] = []
  const erros: string[] = []

  store.emLote(() => {
    for (const a of analise.atribuicoes) {
      const def = POR_ID.get(a.id)
      if (def?.derivado === true) {
        erros.push(`${def.simbolo} é calculado a partir de outros e não pode ser definido.`)
        continue
      }
      const resultado = store.definirParametro(a.id, a.valor, 'usuario')
      if (resultado.mensagem !== undefined) mensagens.push(resultado.mensagem)
      if (!resultado.aplicado && resultado.mensagem !== undefined) {
        erros.push(resultado.mensagem)
      }
    }
  })

  return { sucesso: erros.length === 0, atribuicoes: analise.atribuicoes, erros, mensagens }
}
