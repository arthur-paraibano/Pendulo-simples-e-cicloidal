import type { Store } from '../state/store.js'
import { OPCOES_VISUALIZACAO, type VisualizacaoUi } from './view-selector-model.js'

export { OPCOES_VISUALIZACAO } from './view-selector-model.js'
export type { VisualizacaoUi } from './view-selector-model.js'

export interface SeletorVisualizacao {
  readonly elemento: HTMLElement
  atualizar(): void
  destruir(): void
}

/**
 * Projeção do parâmetro `modo`: trocar a opção escreve somente essa chave.
 * O relógio, os motores e as medições pertencem ao runtime/store e não são
 * reconstruídos pelo seletor.
 */
export function criarSeletorVisualizacao(
  recipiente: HTMLElement,
  store: Store,
  anunciar: (mensagem: string, erro?: boolean) => void = () => undefined,
): SeletorVisualizacao {
  recipiente.hidden = false
  recipiente.className = 'seletor-visualizacao'
  recipiente.setAttribute('aria-label', 'Visualização do pêndulo')

  const grupo = document.createElement('div')
  grupo.className = 'seletor-segmentado'
  grupo.setAttribute('role', 'radiogroup')
  grupo.setAttribute('aria-label', 'Escolha a visualização')

  const radios = new Map<VisualizacaoUi, HTMLInputElement>()
  for (const opcao of OPCOES_VISUALIZACAO) {
    const rotulo = document.createElement('label')
    rotulo.className = 'seletor-opcao'
    rotulo.title = opcao.descricao
    const radio = document.createElement('input')
    radio.type = 'radio'
    radio.name = 'visualizacao'
    radio.value = opcao.valor
    radio.dataset.visualizacao = opcao.valor
    const texto = document.createElement('span')
    texto.textContent = opcao.rotulo
    rotulo.append(radio, texto)
    grupo.append(rotulo)
    radios.set(opcao.valor, radio)
  }
  recipiente.replaceChildren(grupo)

  const atualizar = (): void => {
    const atual = store.texto('modo') as VisualizacaoUi
    for (const [valor, radio] of radios) radio.checked = valor === atual
  }
  const aoMudar = (evento: Event): void => {
    const alvo = evento.target
    if (!(alvo instanceof HTMLInputElement) || alvo.name !== 'visualizacao' || !alvo.checked) return
    if (!radios.has(alvo.value as VisualizacaoUi)) return
    const novoModo = alvo.value as VisualizacaoUi
    const alphaAnterior = store.numero('alpha')
    const thetaAnterior = store.numero('theta0')
    const ajustes: string[] = []
    store.definirParametro('modo', novoModo)
    if (store.numero('alpha') !== alphaAnterior) ajustes.push(`α foi ajustado de ${alphaAnterior}° para ${store.numero('alpha')}°`)
    if (store.numero('theta0') !== thetaAnterior) ajustes.push(`θ₀ foi ajustado de ${thetaAnterior}° para ${store.numero('theta0')}°`)
    if (ajustes.length > 0) {
      anunciar(`${ajustes.join('; ')}. O modo cicloidal exige |ângulo| ≤ 90° porque s = L·sen θ e |s| ≤ L.`)
    }
  }
  grupo.addEventListener('change', aoMudar)
  const cancelar = store.assinar(['modo'], atualizar)
  atualizar()

  return {
    elemento: grupo,
    atualizar,
    destruir: () => {
      cancelar()
      grupo.removeEventListener('change', aoMudar)
      recipiente.replaceChildren()
    },
  }
}
