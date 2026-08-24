import { executar, formatarEstadoConsole } from '../state/console.js'
import type { Store } from '../state/store.js'

type Anunciar = (mensagem: string, erro?: boolean) => void

export interface ConsoleParametros {
  readonly elemento: HTMLElement
  readonly entrada: HTMLTextAreaElement
  executar(): boolean
  destruir(): void
}

export function criarConsoleParametros(
  recipiente: HTMLElement,
  store: Store,
  anunciar: Anunciar = () => undefined,
): ConsoleParametros {
  const detalhes = document.createElement('details')
  detalhes.className = 'param-console'
  const resumo = document.createElement('summary')
  resumo.textContent = 'Console de parâmetros'
  const ajuda = document.createElement('p')
  ajuda.id = 'console-ajuda'
  ajuda.textContent = 'Digite uma ou várias atribuições. Ex.: α = 10; L = 1,5 m; N = 2. Linhas iniciadas por # são comentários.'
  const entrada = document.createElement('textarea')
  entrada.rows = 3
  entrada.placeholder = 'α = 10; L = 1; g = 9,81; N = 2'
  entrada.setAttribute('aria-describedby', ajuda.id)
  const acoes = document.createElement('div')
  acoes.className = 'param-console-acoes'
  const aplicar = document.createElement('button')
  aplicar.type = 'button'
  aplicar.textContent = 'Aplicar linha'
  const copiar = document.createElement('button')
  copiar.type = 'button'
  copiar.textContent = 'Gerar estado atual'
  const resultado = document.createElement('div')
  resultado.className = 'param-console-resultado'
  resultado.setAttribute('role', 'status')
  resultado.setAttribute('aria-live', 'polite')
  acoes.append(aplicar, copiar)
  detalhes.append(resumo, ajuda, entrada, acoes, resultado)
  recipiente.append(detalhes)

  const executarLinha = (): boolean => {
    const inicio = performance.now()
    const retorno = executar(store, entrada.value)
    const mensagens = retorno.sucesso
      ? [...retorno.mensagens, `${retorno.atribuicoes.length} parâmetro(s) aplicado(s).`]
      : retorno.erros
    const texto = mensagens.join(' ')
    resultado.textContent = texto
    resultado.dataset.estado = retorno.sucesso ? 'sucesso' : 'erro'
    entrada.setAttribute('aria-invalid', String(!retorno.sucesso))
    anunciar(texto, !retorno.sucesso)
    const duracao = performance.now() - inicio
    resultado.dataset.tempoRespostaMs = duracao.toFixed(2)
    return retorno.sucesso
  }
  const aoTeclar = (evento: KeyboardEvent): void => {
    if ((evento.ctrlKey || evento.metaKey) && evento.key === 'Enter') {
      evento.preventDefault()
      executarLinha()
    }
  }
  const gerar = (): void => {
    entrada.value = formatarEstadoConsole(store)
    entrada.removeAttribute('aria-invalid')
    resultado.textContent = 'Estado atual gerado. O texto pode ser editado e reaplicado.'
  }
  aplicar.addEventListener('click', executarLinha)
  copiar.addEventListener('click', gerar)
  entrada.addEventListener('keydown', aoTeclar)

  return {
    elemento: detalhes,
    entrada,
    executar: executarLinha,
    destruir: () => {
      aplicar.removeEventListener('click', executarLinha)
      copiar.removeEventListener('click', gerar)
      entrada.removeEventListener('keydown', aoTeclar)
      detalhes.remove()
    },
  }
}
