/**
 * Painel de instrumentos de medição.
 *
 * Casca fina sobre `state/instrumentos.ts`: aqui só há DOM e eventos, e toda a
 * lógica mensurável fica do lado testável.
 *
 * Os controles carregam o nome do instrumento ("Zerar instrumentos", não
 * "Zerar"): a cena tem seus próprios botões homônimos, e nomes acessíveis
 * repetidos deixam ambíguo, para quem navega por leitor de tela, qual dos dois
 * o foco alcançou.
 *
 * A fotoporta é apresentada como instrumento **adicional** ao sensor fixo do
 * ponto zero, nunca como substituto. Confundir os dois faria o usuário
 * comparar leituras que não são comparáveis: o sensor é fixo justamente para
 * que suas medições valham entre execuções.
 */

import {
  Cronometro,
  FotoportaMovel,
  type ModoFotoporta,
} from '../../state/instrumentos.js'
import type { Store } from '../../state/store.js'

export interface PainelMedicoes {
  readonly elemento: HTMLElement
  readonly cronometro: Cronometro
  readonly fotoporta: FotoportaMovel
  atualizar(): void
  destruir(): void
}

export interface OpcoesMedicoes {
  /** Relógio em segundos. Entra por injeção para o teste ser reproduzível. */
  readonly relogio?: () => number
  readonly anunciar?: (mensagem: string, assertivo?: boolean) => void
}

const seg = (v: number | null): string => (v === null ? '—' : `${v.toFixed(4).replace('.', ',')} s`)

export function criarPainelMedicoes(
  recipiente: HTMLElement,
  store: Store,
  opcoes: OpcoesMedicoes = {},
): PainelMedicoes {
  const relogio = opcoes.relogio ?? (() => performance.now() / 1000)
  const anunciar = opcoes.anunciar ?? (() => undefined)

  const cronometro = new Cronometro()
  const fotoporta = new FotoportaMovel(store.numero('posicaoFotoporta'))

  const raiz = document.createElement('section')
  raiz.className = 'painel-medicoes'

  const titulo = document.createElement('h2')
  titulo.textContent = 'Instrumentos'
  raiz.append(titulo)

  // ── Cronômetro ─────────────────────────────────────────────────────────────
  const blocoCrono = document.createElement('div')
  blocoCrono.className = 'medicao-bloco'
  blocoCrono.dataset.instrumento = 'cronometro'

  const tituloCrono = document.createElement('h3')
  tituloCrono.textContent = 'Cronômetro manual'

  const leituraCrono = document.createElement('output')
  leituraCrono.dataset.leitura = 'cronometro'
  leituraCrono.className = 'medicao-leitura'

  const acoes = document.createElement('div')
  acoes.className = 'medicao-acoes'
  const botaoIniciar = document.createElement('button')
  botaoIniciar.type = 'button'
  botaoIniciar.dataset.acao = 'crono-alternar'
  const botaoVolta = document.createElement('button')
  botaoVolta.type = 'button'
  botaoVolta.dataset.acao = 'crono-volta'
  botaoVolta.textContent = 'Marcar volta do cronômetro'
  const botaoZerar = document.createElement('button')
  botaoZerar.type = 'button'
  botaoZerar.dataset.acao = 'crono-zerar'
  botaoZerar.textContent = 'Zerar instrumentos'
  acoes.append(botaoIniciar, botaoVolta, botaoZerar)

  const mediaCrono = document.createElement('p')
  mediaCrono.className = 'medicao-derivada'
  mediaCrono.dataset.leitura = 'crono-media'

  blocoCrono.append(tituloCrono, leituraCrono, acoes, mediaCrono)

  // ── Fotoporta móvel ────────────────────────────────────────────────────────
  const blocoFoto = document.createElement('div')
  blocoFoto.className = 'medicao-bloco'
  blocoFoto.dataset.instrumento = 'fotoporta'

  const tituloFoto = document.createElement('h3')
  tituloFoto.textContent = 'Fotoporta móvel'

  const nota = document.createElement('p')
  nota.className = 'medicao-nota'
  nota.textContent =
    'Instrumento adicional ao sensor fixo do ponto zero. As leituras dos dois são exibidas separadamente.'

  const leituraFoto = document.createElement('output')
  leituraFoto.dataset.leitura = 'fotoporta'
  leituraFoto.className = 'medicao-leitura'

  const rotuloModo = document.createElement('label')
  const seletorModo = document.createElement('select')
  seletorModo.id = 'fotoporta-modo'
  for (const [valor, texto] of [
    ['periodoCompleto', 'Período completo'],
    ['meioPeriodo', 'Meio período'],
  ] as const) {
    const item = document.createElement('option')
    item.value = valor
    item.textContent = texto
    seletorModo.append(item)
  }
  rotuloModo.htmlFor = seletorModo.id
  rotuloModo.textContent = 'Grandeza da fotoporta'

  const contagem = document.createElement('p')
  contagem.className = 'medicao-derivada'
  contagem.dataset.leitura = 'fotoporta-passagens'

  blocoFoto.append(tituloFoto, nota, leituraFoto, rotuloModo, seletorModo, contagem)

  raiz.append(blocoCrono, blocoFoto)
  recipiente.append(raiz)

  let destruido = false

  function atualizar(): void {
    if (destruido) return
    const agora = relogio()

    const decorrido = cronometro.decorrido(agora)
    leituraCrono.value = seg(decorrido)
    leituraCrono.dataset.estado = cronometro.estado
    botaoIniciar.textContent = cronometro.contando
      ? 'Parar cronômetro'
      : 'Iniciar cronômetro'
    botaoIniciar.setAttribute('aria-pressed', String(cronometro.contando))

    const n = store.numero('periodosCronometrados')
    const medio = cronometro.periodoMedio(n, agora)
    mediaCrono.textContent =
      medio === null
        ? `Cronometre ${n} períodos para obter a média.`
        : `Período médio sobre ${n} períodos: ${seg(medio)}`

    fotoporta.posicaoGraus = store.numero('posicaoFotoporta')
    const modo = seletorModo.value as ModoFotoporta
    leituraFoto.value = seg(fotoporta.periodo(modo))
    leituraFoto.dataset.grandeza = modo
    contagem.textContent = `${fotoporta.passagens.length} passagem(ns) registrada(s) em θ = ${fotoporta.posicaoGraus.toFixed(1).replace('.', ',')}°`
  }

  const aoAlternar = (): void => {
    const agora = relogio()
    if (cronometro.contando) {
      cronometro.parar(agora)
      anunciar(`Cronômetro parado em ${seg(cronometro.decorrido(agora))}.`)
    } else {
      cronometro.iniciar(agora)
      anunciar('Cronômetro iniciado.')
    }
    atualizar()
  }

  const aoVolta = (): void => {
    const t = cronometro.marcarVolta(relogio())
    anunciar(`Volta marcada em ${seg(t)}.`)
    atualizar()
  }

  const aoZerar = (): void => {
    cronometro.zerar()
    fotoporta.zerar()
    anunciar('Instrumentos zerados.')
    atualizar()
  }

  const aoTrocarModo = (): void => atualizar()

  botaoIniciar.addEventListener('click', aoAlternar)
  botaoVolta.addEventListener('click', aoVolta)
  botaoZerar.addEventListener('click', aoZerar)
  seletorModo.addEventListener('change', aoTrocarModo)

  atualizar()

  return {
    elemento: raiz,
    cronometro,
    fotoporta,
    atualizar,
    destruir: () => {
      destruido = true
      botaoIniciar.removeEventListener('click', aoAlternar)
      botaoVolta.removeEventListener('click', aoVolta)
      botaoZerar.removeEventListener('click', aoZerar)
      seletorModo.removeEventListener('change', aoTrocarModo)
      raiz.remove()
    },
  }
}
