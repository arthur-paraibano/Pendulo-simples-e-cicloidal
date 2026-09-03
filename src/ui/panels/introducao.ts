/**
 * Orientação de primeiro uso (RF-126).
 *
 * É um cartão **no fluxo da página**, e não um modal. A diferença importa: um
 * modal na abertura rouba o foco de quem chega pelo teclado e cobre a cena de
 * quem chega pelo mouse, para dizer três frases que ninguém pediu. O cartão diz
 * as mesmas três frases sem impedir nada — e some com um clique.
 *
 * A decisão de aparecer mora em `state/introducao.ts`; aqui só há DOM.
 */

import { Persistencia } from '../../state/persist.js'
import {
  deveMostrarIntroducao,
  marcarIntroducaoVista,
  TITULO_INTRODUCAO,
  TRECHOS_INTRODUCAO,
} from '../../state/introducao.js'

export interface PainelIntroducao {
  readonly elemento: HTMLElement
  /** Reapresenta a orientação a pedido — nunca automaticamente. */
  mostrar(): void
  destruir(): void
}

export interface OpcoesIntroducao {
  readonly persistencia?: Persistencia
  readonly anunciar?: (mensagem: string, assertivo?: boolean) => void
}

export function criarPainelIntroducao(
  recipiente: HTMLElement,
  opcoes: OpcoesIntroducao = {},
): PainelIntroducao {
  const persistencia = opcoes.persistencia ?? new Persistencia()
  const anunciar = opcoes.anunciar ?? (() => undefined)

  const raiz = document.createElement('section')
  raiz.className = 'painel-introducao'
  raiz.id = 'introducao'
  raiz.setAttribute('role', 'region')
  raiz.setAttribute('aria-labelledby', 'introducao-titulo')

  // Título e botão dividem a mesma linha: empilhá-los custaria uma altura que
  // a fórmula não tem para ceder em 1366×768.
  const cabecalho = document.createElement('div')
  cabecalho.className = 'introducao-cabecalho'

  const titulo = document.createElement('h2')
  titulo.id = 'introducao-titulo'
  titulo.textContent = TITULO_INTRODUCAO

  const dispensar = document.createElement('button')
  dispensar.type = 'button'
  dispensar.className = 'introducao-dispensar'
  dispensar.dataset.acao = 'dispensar-introducao'
  dispensar.textContent = 'Entendi, começar'

  cabecalho.append(titulo, dispensar)
  raiz.append(cabecalho)

  const lista = document.createElement('ul')
  lista.className = 'introducao-lista'
  for (const trecho of TRECHOS_INTRODUCAO) {
    const item = document.createElement('li')
    // O título do trecho é inline, e não um bloco próprio: cada quebra de linha
    // a mais aqui sai do orçamento vertical da primeira dobra.
    const nome = document.createElement('strong')
    nome.textContent = `${trecho.titulo} — `
    item.append(nome, document.createTextNode(trecho.texto))
    lista.append(item)
  }
  raiz.append(lista)

  const aoDispensar = (): void => {
    raiz.hidden = true
    // Um clique dispensa e encerra o assunto: a preferência gravada é o que
    // garante o "não repetida automaticamente" do RF-126. Se o armazenamento
    // recusar a escrita — janela anônima, cota cheia — a orientação volta na
    // próxima abertura, que é o único modo de falhar sem esconder nada.
    persistencia.salvarPreferencias(marcarIntroducaoVista(persistencia.lerPreferencias()))
    anunciar('Orientação inicial dispensada. Ela continua disponível nos créditos.')
  }
  dispensar.addEventListener('click', aoDispensar)

  raiz.hidden = !deveMostrarIntroducao(persistencia.lerPreferencias())
  recipiente.prepend(raiz)

  return {
    elemento: raiz,
    mostrar(): void {
      raiz.hidden = false
      dispensar.focus()
    },
    destruir(): void {
      dispensar.removeEventListener('click', aoDispensar)
      raiz.remove()
    },
  }
}
