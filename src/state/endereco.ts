/**
 * Publicação do estado no endereço da página (RF-106, RF-112).
 *
 * O endereço é a forma de compartilhar um experimento, e por isso precisa ser
 * **estável**: reserializar o mesmo estado tem de dar exatamente o mesmo texto,
 * caractere a caractere. A ordem determinística vem do catálogo, não da ordem
 * em que o usuário mexeu nos controles.
 *
 * ## O que fica de fora, e por quê
 *
 * O relógio da simulação não entra. Ele avança a 60 Hz sem notificar o Store —
 * é assim que o quadro não vira uma alteração de configuração —, de modo que
 * qualquer `t` gravado aqui já nasceria velho. Publicar um instante que não é o
 * instante corrente seria pior que não publicar nenhum. Ler `t` de um endereço
 * recebido continua funcionando: quem escreve o endereço à mão, ou o gera a
 * partir de um roteiro, pode fixar o instante.
 */

import { serializar } from './url.js'
import type { Store } from './store.js'

/** Extras que descrevem a apresentação, e não um parâmetro do catálogo. */
export function extrasDoStore(store: Store): Record<string, string> {
  const modo = store.texto('modo')
  return { vis: modo === 'comparacao' ? 'ambos' : modo }
}

/** Fragmento completo, com `#`, que reabre o estado corrente. */
export function fragmentoDoStore(store: Store): string {
  return `#${serializar(store, extrasDoStore(store))}`
}

export interface OpcoesEndereco {
  /** Injetável para o teste não depender de `window`. */
  readonly janela?: {
    readonly location: { readonly href: string; readonly hash: string }
    readonly history: { replaceState(dados: unknown, titulo: string, url: string): void }
  }
  /** Agenda a escrita. Injetável para o teste não depender do relógio. */
  readonly agendar?: (acao: () => void) => () => void
}

export interface SincronizadorEndereco {
  /** Escreve agora, sem esperar o agendamento. */
  publicarAgora(): void
  /** Endereço absoluto corrente, para copiar ou carimbar no CSV. */
  enderecoAbsoluto(): string
  destruir(): void
}

/**
 * Mantém o endereço em dia com o Store.
 *
 * Usa `replaceState` em vez de atribuir ao `hash`: cada ajuste de um controle
 * criaria uma entrada no histórico do navegador, e voltar uma página passaria a
 * significar desfazer meio grau de amplitude.
 */
export function sincronizarEndereco(
  store: Store,
  opcoes: OpcoesEndereco = {},
): SincronizadorEndereco {
  // O recurso pode faltar: `globalThis` existe em qualquer ambiente, mas só no
  // navegador ele traz `location` e `history`. Conferir o objeto não bastaria —
  // é a presença dos dois que decide se há endereço a publicar.
  const candidata = opcoes.janela ?? (globalThis as unknown as OpcoesEndereco['janela'])
  const janela =
    candidata?.location !== undefined && candidata.history !== undefined ? candidata : undefined
  const agendar =
    opcoes.agendar ??
    ((acao: () => void) => {
      const id = setTimeout(acao, 250)
      return () => clearTimeout(id)
    })

  let cancelarAgendado: (() => void) | null = null
  let destruido = false

  const publicarAgora = (): void => {
    if (destruido || janela === undefined) return
    const fragmento = fragmentoDoStore(store)
    if (janela.location.hash === fragmento) return
    const base = janela.location.href.split('#')[0] ?? ''
    janela.history.replaceState(null, '', `${base}${fragmento}`)
  }

  const cancelarStore = store.assinar(null, () => {
    if (destruido) return
    cancelarAgendado?.()
    cancelarAgendado = agendar(publicarAgora)
  })

  return {
    publicarAgora,
    enderecoAbsoluto: () => {
      const base = janela?.location.href.split('#')[0] ?? ''
      return `${base}${fragmentoDoStore(store)}`
    },
    destruir: () => {
      destruido = true
      cancelarAgendado?.()
      cancelarStore()
    },
  }
}
