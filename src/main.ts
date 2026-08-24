/** Bootstrap fino: DOM/RAF em volta do runtime testável da cena. */

import './styles/tokens.css'
import './styles/scene.css'
import { RuntimeCena } from './app/runtime.js'
import { AgendadorQuadros } from './app/frame-scheduler.js'
import { CamadasCanvas } from './render/layers.js'
import { RenderizadorCena } from './render/scene.js'
import type { EstadoPenduloCena, ForcaVisual, OpcoesCena, QuadroCena, TemposCamadas, VisualizacaoCena } from './render/types.js'
import { Store } from './state/store.js'
import type { Comando } from './state/execucao.js'
import { aplicarAoStore } from './state/url.js'

const FORCAS_ACEITAS = new Set<ForcaVisual>(['peso', 'tracao', 'arrasto', 'externa', 'resultante'])

class DiagnosticoQuadro {
  private readonly dt = new Float64Array(120)
  private readonly estatica = new Float64Array(120)
  private readonly rastro = new Float64Array(120)
  private readonly dinamica = new Float64Array(120)
  private readonly total = new Float64Array(120)
  private proximo = 0
  private tamanho = 0

  adicionar(delta: number, tempos: TemposCamadas): void {
    const i = this.proximo
    this.dt[i] = delta
    this.estatica[i] = tempos.estatica
    this.rastro[i] = tempos.rastro
    this.dinamica[i] = tempos.dinamica
    this.total[i] = tempos.total
    this.proximo = (i + 1) % this.dt.length
    this.tamanho = Math.min(this.tamanho + 1, this.dt.length)
  }

  texto(): string {
    if (this.tamanho === 0) return 'FPS -- | estática -- | rastro -- | dinâmica --'
    const media = (valores: Float64Array): number => {
      let soma = 0
      for (let i = 0; i < this.tamanho; i++) soma += valores[i]!
      return soma / this.tamanho
    }
    const fps = 1 / Math.max(1e-6, media(this.dt))
    return `FPS ${fps.toFixed(1)} | estática ${media(this.estatica).toFixed(2)} ms | rastro ${media(this.rastro).toFixed(2)} ms | dinâmica ${media(this.dinamica).toFixed(2)} ms | total ${media(this.total).toFixed(2)} ms`
  }
}

const temaCss = (tema: string): string => tema === 'altoContraste' ? 'alto-contraste' : tema

function construirOpcoes(store: Store): OpcoesCena {
  const gradeBruta = store.bruto('grade')
  const grade = typeof gradeBruta === 'object' && !Array.isArray(gradeBruta)
    ? gradeBruta as Record<string, unknown>
    : {}
  const forcas: ForcaVisual[] = []
  const bruto = store.bruto('vetoresForca')
  if (Array.isArray(bruto)) {
    for (const valor of bruto) if (FORCAS_ACEITAS.has(valor as ForcaVisual)) forcas.push(valor as ForcaVisual)
  }
  return {
    zoom: store.numero('zoom'),
    exibirEvoluta: store.booleano('exibirEvoluta'),
    exibirInvoluta: store.booleano('exibirInvoluta'),
    transferidor: store.booleano('transferidor'),
    regua: store.booleano('regua'),
    linhaVertical: store.booleano('linhaVertical'),
    arcoAmplitude: store.booleano('arcoAmplitude'),
    rastro: store.booleano('rastro'),
    duracaoRastro: store.numero('duracaoRastro'),
    rastroPeriodo: store.booleano('rastroPeriodo'),
    vetorVelocidade: store.booleano('vetorVelocidade'),
    vetorAceleracao: store.booleano('vetorAceleracao'),
    decomporAceleracao: store.booleano('decomporAceleracao'),
    vetoresForca: forcas,
    escalaVetores: store.numero('escalaVetores'),
    estroboscopio: store.booleano('estroboscopio'),
    intervaloEstroboscopio: store.numero('intervaloEstroboscopio'),
    imagensEstroboscopio: store.numero('imagensEstroboscopio'),
    penduloFantasma: store.booleano('pendulOFantasma'),
    grade: {
      ligada: grade['ligada'] === true,
      espacamento: typeof grade['espacamento'] === 'number' ? grade['espacamento'] : 0.25,
    },
  }
}

export function iniciarAplicacao(secaoCena: HTMLElement): () => void {
  secaoCena.innerHTML = `
    <div class="cena-cabecalho">
      <div><h1 class="cena-titulo">Pêndulo — cena física</h1><p class="cena-subtitulo">Três camadas Canvas: geometria, rastro incremental e movimento.</p></div>
      <div class="cena-controles" aria-label="Controles da animação">
        <button type="button" data-acao="reproduzir">Reproduzir</button><button type="button" data-acao="pausar">Pausar</button>
        <button type="button" data-acao="passo">Passo</button><button type="button" data-acao="parar">Parar</button><button type="button" data-acao="zerar">Zerar</button>
      </div>
    </div>
    <div id="palco-pendulo"></div>
    <div class="cena-rodape"><span id="estado-cena" role="status" aria-live="polite">Simulação pausada</span><output id="diagnostico-cena" class="diagnostico-cena"></output></div>
  `
  const palco = secaoCena.querySelector<HTMLElement>('#palco-pendulo')!
  const saidaEstado = secaoCena.querySelector<HTMLElement>('#estado-cena')!
  const saidaDiagnostico = secaoCena.querySelector<HTMLOutputElement>('#diagnostico-cena')!
  const store = new Store()
  const avisosUrl = aplicarAoStore(store, window.location.hash)
  document.documentElement.dataset.tema = temaCss(store.texto('tema'))
  const camadas = new CamadasCanvas(palco)
  let solicitarRender = (): void => undefined
  const cena = new RenderizadorCena(camadas, document.documentElement, () => solicitarRender())
  const runtime = new RuntimeCena(store)
  const diagnostico = new DiagnosticoQuadro()
  const estados: EstadoPenduloCena[] = []
  let opcoes = construirOpcoes(store)
  const quadro = { visualizacao: store.texto('modo') as VisualizacaoCena, pendulos: estados, opcoes } as {
    visualizacao: VisualizacaoCena; pendulos: EstadoPenduloCena[]; opcoes: OpcoesCena
  }
  let ultimoQuadro = performance.now()
  let ultimoRender = 0
  let ultimoDiagnostico = Number.NEGATIVE_INFINITY
  let destruida = false
  let chaveEstadoControles = ''
  const botoes = [...secaoCena.querySelectorAll<HTMLButtonElement>('[data-acao]')]

  const atualizarEstadoControles = (): void => {
    const execucao = store.texto('execucao')
    const aviso = runtime.erroVisivel ?? avisosUrl[0]?.mensagem
    const texto = aviso ?? (execucao === 'rodando' ? 'Simulação em movimento' : execucao === 'pausado' ? 'Simulação pausada' : 'Simulação parada')
    const chave = `${execucao}|${texto}`
    if (chave === chaveEstadoControles) return
    chaveEstadoControles = chave
    saidaEstado.textContent = texto
    for (const botao of botoes) {
      const acao = botao.dataset.acao
      if (acao === 'reproduzir' || acao === 'pausar' || acao === 'parar') {
        botao.setAttribute('aria-pressed', String((acao === 'reproduzir' && execucao === 'rodando') || (acao === 'pausar' && execucao === 'pausado') || (acao === 'parar' && execucao === 'parado')))
      } else botao.removeAttribute('aria-pressed')
    }
  }
  const prepararQuadro = (): QuadroCena => {
    runtime.estadosVisiveis(estados)
    quadro.visualizacao = store.texto('modo') as VisualizacaoCena
    quadro.opcoes = opcoes
    return quadro
  }
  const desenharUmaVez = (agora = performance.now(), dt = 0): void => {
    camadas.verificarDpr()
    const tempos = cena.renderizar(prepararQuadro())
    diagnostico.adicionar(dt, tempos)
    if (agora - ultimoDiagnostico >= 1000) {
      ultimoDiagnostico = agora
      saidaDiagnostico.value = diagnostico.texto()
    }
    atualizarEstadoControles()
  }
  const agendador = new AgendadorQuadros((agora, repaintSolicitado) => {
    const fpsAlvo = Number(store.texto('fps'))
    const intervaloMinimo = 1000 / (Number.isFinite(fpsAlvo) ? fpsAlvo : 60)
    const deveAnimar = runtime.controle.rodando && agora - ultimoRender >= intervaloMinimo * 0.9
    if (deveAnimar) {
      const dt = Math.min(0.25, Math.max(0, (agora - ultimoQuadro) / 1000))
      ultimoQuadro = agora
      ultimoRender = agora
      runtime.avancar(dt)
      desenharUmaVez(agora, dt)
    } else if (repaintSolicitado) desenharUmaVez(agora)
  }, {
    solicitar: (callback) => requestAnimationFrame(callback),
    cancelar: (id) => cancelAnimationFrame(id),
  })
  solicitarRender = (): void => agendador.solicitarRender()
  const aplicarComando = (comando: Comando): void => {
    runtime.aplicarComando(comando)
    if (runtime.controle.rodando) ultimoQuadro = performance.now()
    agendador.definirAnimando(runtime.controle.rodando)
    solicitarRender()
  }
  const aoClicarControle = (evento: Event): void => {
    const alvo = evento.target instanceof Element ? evento.target.closest<HTMLButtonElement>('[data-acao]') : null
    if (alvo === null) return
    const acao = alvo.dataset.acao
    if (acao === 'reproduzir') aplicarComando('reproduzir')
    else if (acao === 'pausar') aplicarComando('pausar')
    else if (acao === 'parar') aplicarComando('parar')
    else if (acao === 'zerar') { runtime.zerar(); solicitarRender() }
    else if (acao === 'passo') { runtime.passo(); solicitarRender() }
  }
  secaoCena.addEventListener('click', aoClicarControle)
  const cancelarStore = store.assinar(null, (alteradas) => {
    const { reiniciou } = runtime.aplicarAlteracoes(alteradas)
    opcoes = construirOpcoes(store)
    document.documentElement.dataset.tema = temaCss(store.texto('tema'))
    cena.invalidarEstatica()
    if (reiniciou) cena.reiniciarEfeitos()
    agendador.definirAnimando(runtime.controle.rodando)
    solicitarRender()
  })
  const aoMudarVisibilidade = (): void => {
    if (document.visibilityState === 'hidden') agendador.suspender()
    else { ultimoQuadro = performance.now(); camadas.redimensionar(); agendador.retomar() }
  }
  const aoOcultarPagina = (evento: PageTransitionEvent): void => {
    agendador.suspender()
    if (evento.persisted) return
    destruir()
  }
  const aoMostrarPagina = (evento: PageTransitionEvent): void => {
    if (!evento.persisted || destruida) return
    ultimoQuadro = performance.now()
    camadas.redimensionar()
    agendador.retomar()
  }
  const destruir = (): void => {
    if (destruida) return
    destruida = true
    agendador.destruir()
    cancelarStore()
    runtime.destruir()
    secaoCena.removeEventListener('click', aoClicarControle)
    document.removeEventListener('visibilitychange', aoMudarVisibilidade)
    window.removeEventListener('pagehide', aoOcultarPagina)
    window.removeEventListener('pageshow', aoMostrarPagina)
    cena.destruir()
    camadas.destruir()
  }
  document.addEventListener('visibilitychange', aoMudarVisibilidade)
  window.addEventListener('pagehide', aoOcultarPagina)
  window.addEventListener('pageshow', aoMostrarPagina)
  atualizarEstadoControles()
  agendador.definirAnimando(runtime.controle.rodando)
  solicitarRender()
  return destruir
}

const secaoCena = document.querySelector<HTMLElement>('#cena')
if (secaoCena !== null) iniciarAplicacao(secaoCena)
