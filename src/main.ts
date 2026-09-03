/** Bootstrap fino: DOM/RAF em volta do runtime testável da cena. */

import './styles/tokens.css'
import './styles/scene.css'
import './styles/ui.css'
import '../vendor/katex/katex.subset.css'
// O bundle UMD vendorizado entra pelo alias `katex` do Vite, que o pré-empacota
// e resolve a interoperação de módulo igual em desenvolvimento e em produção.
// Também fica exposto no navegador para diagnóstico e conferência de versão.
import katexRuntime from 'katex'
import { RuntimeCena } from './app/runtime.js'
import { AgendadorQuadros } from './app/frame-scheduler.js'
import { CamadasCanvas } from './render/layers.js'
import { RenderizadorCena } from './render/scene.js'
import type { EstadoPenduloCena, ForcaVisual, OpcoesCena, QuadroCena, TemposCamadas, VisualizacaoCena } from './render/types.js'
import { Store } from './state/store.js'
import type { Comando } from './state/execucao.js'
import { aplicarAoStore } from './state/url.js'
import { criarSeletorVisualizacao } from './ui/view-selector.js'
import { criarPainelParametros } from './ui/panels/parametros.js'
import { criarConsoleParametros } from './ui/param-console.js'
import { criarPainelFormula } from './ui/formula.js'
import { criarTabelaColeta } from './ui/data-table.js'
import { criarPainelGraficos } from './ui/panels/graficos.js'
import { criarPainelMedicoes } from './ui/panels/medicoes.js'
import { criarPainelCenarios } from './ui/panels/cenarios.js'
import { criarPainelDiagnostico } from './ui/panels/diagnostico.js'
import { criarPainelCreditos } from './ui/panels/creditos.js'
import { criarPainelIntroducao } from './ui/panels/introducao.js'
import { configurarAcessibilidade, criarSkipLinks, navegarTabelaPorTeclado } from './ui/a11y.js'
import { sincronizarEndereco } from './state/endereco.js'
import { t } from './i18n/index.js'

;(globalThis as typeof globalThis & { katex: KatexGlobal }).katex = katexRuntime

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
    // Pausado, os intervalos são praticamente nulos, e dividir por eles
    // anunciaria um milhão de quadros por segundo. Sem quadro medido não há
    // taxa a informar.
    const intervalo = media(this.dt)
    const fps = intervalo >= 1e-4 ? (1 / intervalo).toFixed(1) : '--'
    return `FPS ${fps} | estática ${media(this.estatica).toFixed(2)} ms | rastro ${media(this.rastro).toFixed(2)} ms | dinâmica ${media(this.dinamica).toFixed(2)} ms | total ${media(this.total).toFixed(2)} ms`
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
    penduloFoco: store.numero('penduloFoco'),
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
        <button type="button" data-acao="reproduzir"></button><button type="button" data-acao="pausar"></button>
        <button type="button" data-acao="passo"></button><button type="button" data-acao="parar"></button><button type="button" data-acao="zerar"></button>
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
  const ACOES_CENA = ['reproduzir', 'pausar', 'passo', 'parar', 'zerar'] as const
  const traduzirControlesCena = (): void => {
    const idioma = store.texto('idioma')
    for (const acao of ACOES_CENA) {
      const botao = secaoCena.querySelector<HTMLButtonElement>(`[data-acao="${acao}"]`)
      if (botao !== null) botao.textContent = t(`animacao.${acao}` as never, undefined, idioma)
    }
  }
  traduzirControlesCena()
  const cabecalho = document.querySelector<HTMLElement>('#cabecalho')
  const recipienteSeletor = document.querySelector<HTMLElement>('#seletor-visualizacao')
  const recipienteFormula = document.querySelector<HTMLElement>('#formula')
  const recipienteTabela = document.querySelector<HTMLElement>('#tabela-coleta')
  const recipienteParametros = document.querySelector<HTMLElement>('#painel-parametros')
  const recipienteGraficos = document.querySelector<HTMLElement>('#graficos')
  const recipienteMedicoes = document.querySelector<HTMLElement>('#medicoes')
  const recipienteCenarios = document.querySelector<HTMLElement>('#cenarios')
  const recipienteCreditos = document.querySelector<HTMLElement>('#creditos')
  const recipientePrincipal = document.querySelector<HTMLElement>('#principal')
  if (!document.querySelector('.skip-links')) {
    document.body.prepend(criarSkipLinks())
  }
  const a11y = configurarAcessibilidade(store)
  if (cabecalho !== null) {
    cabecalho.hidden = false
    const idiomaAtual = (): string => store.texto('idioma')
    cabecalho.innerHTML = `
      <div class="cabecalho-principal">
        <strong data-i18n="geral.titulo"></strong>
      </div>
      <div class="cabecalho-acoes">
        <label for="seletor-idioma-cabecalho" class="sr-only">Trocar idioma</label>
        <select id="seletor-idioma-cabecalho" class="seletor-idioma" title="Trocar idioma">
          <option value="pt-BR">Português (BR)</option>
          <option value="en">English</option>
          <option value="de">Deutsch</option>
        </select>
      </div>
      <p data-i18n="geral.subtitulo"></p>
    `
    /**
     * Aplica o dicionário aos nós marcados com `data-i18n`.
     *
     * Marcar o nó em vez de reconstruir o cabeçalho inteiro preserva o foco: o
     * seletor de idioma está dentro dele, e recriá-lo tiraria o foco do
     * controle que o usuário acabou de usar.
     */
    const traduzirCabecalho = (): void => {
      for (const no of cabecalho.querySelectorAll<HTMLElement>('[data-i18n]')) {
        const chave = no.dataset['i18n']
        if (chave !== undefined) no.textContent = t(chave as never, undefined, idiomaAtual())
      }
    }
    traduzirCabecalho()

    const seletorIdioma = cabecalho.querySelector<HTMLSelectElement>('#seletor-idioma-cabecalho')
    if (seletorIdioma !== null) {
      seletorIdioma.value = store.texto('idioma')
      seletorIdioma.addEventListener('change', () => {
        store.definirParametro('idioma', seletorIdioma.value)
      })
      store.assinar(['idioma'], () => {
        seletorIdioma.value = store.texto('idioma')
        traduzirCabecalho()
        traduzirControlesCena()
      })
    }
  }
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
  const anunciar = (mensagem: string, erro = false): void => {
    saidaEstado.textContent = mensagem
    saidaEstado.dataset.estado = erro ? 'erro' : 'informacao'
  }
  const seletor = recipienteSeletor === null ? null : criarSeletorVisualizacao(recipienteSeletor, store, anunciar)
  const formula = recipienteFormula === null ? null : criarPainelFormula(recipienteFormula, store)
  const tabela = recipienteTabela === null
    ? null
    : criarTabelaColeta(recipienteTabela, store, runtime, { anunciar })
  // O cancelamento precisa ser guardado: sem ele, o ouvinte de teclado
  // sobreviveria ao desmonte e continuaria movendo o foco numa tabela morta.
  const cancelarTecladoTabela =
    recipienteTabela === null ? null : navegarTabelaPorTeclado(recipienteTabela)
  const painel = recipienteParametros === null ? null : criarPainelParametros(recipienteParametros, store, anunciar)
  const graficos =
    recipienteGraficos === null ? null : criarPainelGraficos(recipienteGraficos, store, runtime)
  const medicoes =
    recipienteMedicoes === null ? null : criarPainelMedicoes(recipienteMedicoes, store, { anunciar })
  const cenarios =
    recipienteCenarios === null
      ? null
      : criarPainelCenarios(recipienteCenarios, store, {
          anunciar,
          telaDaCena: () => camadas.compor(),
        })
  const painelDiagnostico = criarPainelDiagnostico(secaoCena)
  // A orientação entra no topo do conteúdo principal, depois do seletor de
  // visualização — que continua sendo o primeiro elemento da tela (RF-127).
  const introducao =
    recipientePrincipal === null
      ? null
      : criarPainelIntroducao(recipientePrincipal, { anunciar })
  const creditos =
    recipienteCreditos === null
      ? null
      : criarPainelCreditos(
          recipienteCreditos,
          introducao === null ? {} : { aoReverIntroducao: () => introducao.mostrar() },
        )
  // O endereco so passa a ser publicado depois que a URL de entrada ja foi
  // aplicada: publicar antes reescreveria o estado recebido com o padrao.
  const endereco = sincronizarEndereco(store)
  const consoleParametros = recipienteParametros === null ? null : criarConsoleParametros(recipienteParametros, store, anunciar)

  const atualizarEstadoControles = (): void => {
    const execucao = store.texto('execucao')
    const aviso = runtime.erroVisivel ?? avisosUrl[0]?.mensagem
    const idioma = store.texto('idioma')
    const chaveEstado =
      execucao === 'rodando' ? 'animacao.emMovimento'
      : execucao === 'pausado' ? 'animacao.pausada'
      : 'animacao.parada'
    const texto = aviso ?? t(chaveEstado as never, undefined, idioma)
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
    const quadroAtual = prepararQuadro()
    const tempos = cena.renderizar(quadroAtual)
    painel?.atualizarDinamica(quadroAtual.pendulos, agora)
    // Os painéis abaixo se autolimitam: o de gráficos redesenha no máximo a
    // 20 Hz (RNF-002), e o de instrumentos só formata texto.
    graficos?.atualizar()
    medicoes?.atualizar()
    diagnostico.adicionar(dt, tempos)
    painelDiagnostico.registrarQuadro(dt, tempos)
    painelDiagnostico.atualizar(agora)
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
    else if (acao === 'zerar') { runtime.zerar(); tabela?.reiniciarSensor(); solicitarRender() }
    else if (acao === 'passo') { runtime.passo(); solicitarRender() }
  }
  secaoCena.addEventListener('click', aoClicarControle)
  const cancelarStore = store.assinar(null, (alteradas, contexto) => {
    const { reiniciou } = runtime.aplicarAlteracoes(alteradas, contexto.explicitas)
    opcoes = construirOpcoes(store)
    document.documentElement.dataset.tema = temaCss(store.texto('tema'))
    cena.invalidarEstatica()
    cena.invalidarDescricao()
    if (reiniciou) cena.reiniciarEfeitos()
    agendador.definirAnimando(runtime.controle.rodando)
    cenarios?.atualizar()
    solicitarRender()
  })
  const aoMudarVisibilidade = (): void => {
    tabela?.reiniciarSensor()
    if (document.visibilityState === 'hidden') agendador.suspender()
    else { ultimoQuadro = performance.now(); camadas.redimensionar(); agendador.retomar() }
  }
  const aoOcultarPagina = (evento: PageTransitionEvent): void => {
    tabela?.reiniciarSensor()
    agendador.suspender()
    if (evento.persisted) return
    destruir()
  }
  const aoMostrarPagina = (evento: PageTransitionEvent): void => {
    if (!evento.persisted || destruida) return
    tabela?.reiniciarSensor()
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
    seletor?.destruir()
    formula?.destruir()
    graficos?.destruir()
    medicoes?.destruir()
    cenarios?.destruir()
    endereco.destruir()
    tabela?.destruir()
    consoleParametros?.destruir()
    painel?.destruir()
    painelDiagnostico.destruir()
    creditos?.destruir()
    introducao?.destruir()
    cancelarTecladoTabela?.()
    a11y.destruir()
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
