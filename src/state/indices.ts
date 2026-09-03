/**
 * Endereçamento indexado de parâmetros por pêndulo (Área L, RF-151 a RF-156).
 *
 * O modelo é deliberadamente pequeno: um parâmetro indexável tem um **valor
 * base**, que é o valor compartilhado enquanto ele está acoplado, e pode ganhar
 * **sobreposições por índice** quando desacoplado. Nada aqui toca o `Store`;
 * são regras puras, para que a semântica de `L₁ = 2` possa ser provada por
 * teste em vez de conferida clicando na interface.
 *
 * ## Por que o valor base não é a sobreposição do pêndulo 1
 *
 * Seria tentador guardar apenas um vetor de valores. Mas o catálogo declara um
 * padrão por parâmetro, a URL só carrega o que difere do padrão, e a fórmula
 * exibida fala de *um* pêndulo. Manter o base como o valor compartilhado
 * preserva os três: acoplado, o estado indexado é literalmente vazio.
 */

/** Separador das chaves de sobreposição. Não ocorre em nenhum id do catálogo. */
const SEPARADOR = '#'

/** Chave de armazenamento da sobreposição de um pêndulo: `L` + 2 ⇒ `L#2`. */
export function chaveIndexada(id: string, indice: number): string {
  return `${id}${SEPARADOR}${indice}`
}

/** Chave de armazenamento do estado de acoplamento de um parâmetro. */
export function chaveAcoplamento(id: string): string {
  return `${SEPARADOR}acoplado${SEPARADOR}${id}`
}

export interface ChaveAnalisada {
  readonly id: string
  /** Índice do pêndulo, ou `null` para o valor base. */
  readonly indice: number | null
}

/** Inverte `chaveIndexada`. Chaves sem separador são o próprio valor base. */
export function analisarChave(chave: string): ChaveAnalisada {
  const corte = chave.indexOf(SEPARADOR)
  if (corte <= 0) return { id: chave, indice: null }
  const indice = Number(chave.slice(corte + 1))
  if (!Number.isInteger(indice)) return { id: chave, indice: null }
  return { id: chave.slice(0, corte), indice }
}

/** Reconhece uma chave de acoplamento, para a serialização saber o que é. */
export function ehChaveDeAcoplamento(chave: string): boolean {
  return chave.startsWith(`${SEPARADOR}acoplado${SEPARADOR}`)
}

/**
 * Verifica se o índice endereça um pêndulo existente (RF-155).
 *
 * @returns `null` se válido, ou a mensagem que nomeia o recebido e a faixa.
 */
export function validarIndice(indice: number, numeroPendulos: number): string | null {
  if (Number.isInteger(indice) && indice >= 1 && indice <= numeroPendulos) return null
  const faixa =
    numeroPendulos === 1
      ? 'existe apenas o pêndulo 1'
      : `os pêndulos válidos vão de 1 a ${numeroPendulos}`
  return `Índice ${indice} não existe: ${faixa}. Ajuste n_p para criar mais pêndulos.`
}

/** Como uma atribuição foi interpretada, para poder ser comunicada (RF-153). */
export interface AlvoAtribuicao {
  /** Índices de pêndulo que recebem o valor. Vazio significa o valor base. */
  readonly indices: readonly number[]
  /** Verdadeiro quando a escrita altera o valor compartilhado. */
  readonly escreveBase: boolean
  /** Verdadeiro quando a escrita precisa desacoplar o parâmetro antes. */
  readonly desacopla: boolean
  /** Frase curta explicando a interpretação adotada. */
  readonly explicacao: string
}

export interface ContextoAtribuicao {
  readonly simbolo: string
  readonly acoplado: boolean
  readonly numeroPendulos: number
  /** Pêndulo em foco, usado quando não há índice e o parâmetro está solto. */
  readonly foco: number
}

/**
 * Decide o que uma atribuição alcança, e diz por quê.
 *
 * O usuário precisa saber qual das interpretações foi adotada: escrever `L = 2`
 * com dois pêndulos acoplados muda os dois, e o mesmo comando com eles soltos
 * muda apenas um. Sem a frase de retorno, as duas situações seriam
 * indistinguíveis na tela.
 */
export function resolverAlvo(
  indice: number | null,
  contexto: ContextoAtribuicao,
): AlvoAtribuicao {
  const { simbolo, acoplado, numeroPendulos, foco } = contexto

  if (indice === null) {
    if (acoplado) {
      return {
        indices: [],
        escreveBase: true,
        desacopla: false,
        // Com um pêndulo só não há interpretação a escolher, e anunciá-la a
        // cada linha digitada seria ruído no caso mais comum de todos.
        explicacao:
          numeroPendulos === 1
            ? ''
            : `${simbolo} está acoplado: aplicado aos ${numeroPendulos} pêndulos.`,
      }
    }
    return {
      indices: [foco],
      escreveBase: false,
      desacopla: false,
      explicacao: `${simbolo} está desacoplado: aplicado ao pêndulo ${foco}, em foco.`,
    }
  }

  // Escrever um índice enquanto o parâmetro está acoplado só pode significar
  // que o usuário quer aquele pêndulo diferente dos demais. Desacoplar em
  // silêncio esconderia a mudança de regime; recusar obrigaria a um passo
  // burocrático antes de cada experimento. Faz-se, e diz-se que se fez.
  if (acoplado) {
    return {
      indices: [indice],
      escreveBase: false,
      desacopla: true,
      explicacao: `${simbolo} foi desacoplado para que ${simbolo}${subscrito(indice)} possa diferir dos demais.`,
    }
  }

  return {
    indices: [indice],
    escreveBase: false,
    desacopla: false,
    explicacao: `${simbolo}${subscrito(indice)} aplicado ao pêndulo ${indice}.`,
  }
}

const DIGITOS_SUBSCRITOS = '₀₁₂₃₄₅₆₇₈₉'

/** Converte um índice em dígitos subscritos, para os rótulos (RF-156). */
export function subscrito(indice: number): string {
  return String(indice)
    .split('')
    .map((d) => DIGITOS_SUBSCRITOS[Number(d)] ?? d)
    .join('')
}

/** Rótulo indexado consistente em controles, cena, gráficos e exportação. */
export function rotuloIndexado(simbolo: string, indice: number | null): string {
  return indice === null ? simbolo : `${simbolo}${subscrito(indice)}`
}
