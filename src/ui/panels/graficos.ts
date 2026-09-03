/**
 * Painel de gráficos.
 *
 * Mantém um único `<canvas>` e troca o modelo desenhado conforme a seleção,
 * em vez de manter vários vivos: o orçamento de quadro é de 16,7 ms, e um
 * gráfico invisível que continua redesenhando é custo puro.
 *
 * O redesenho ocorre a no máximo 20 Hz (RNF-002), desacoplado dos 60 Hz da
 * cena. Curvas analíticas — `T(α)`, erro, convergência — não dependem do tempo
 * de simulação e só são refeitas quando um parâmetro muda; as temporais
 * acompanham o relógio.
 */

import type { Amostra } from '../../physics/engine.js'
import type { ModoPendulo } from '../../physics/types.js'
import {
  graficoConvergencia,
  graficoErroPorAmplitude,
  graficoPeriodoPorAmplitude,
  graficoTemporalPorId,
  type EixoGrafico,
  type IdGraficoTemporal,
  type ModeloGrafico,
} from '../../state/charts.js'
import type { Store } from '../../state/store.js'
import { ControladorPaleta } from '../../render/palette.js'
import {
  corDaPaleta,
  desenhar,
  lerNoPonto,
  valorSobPosicao,
  type LayoutGrafico,
} from '../../render/charts/xyplot.js'

/** Fonte das amostras. O painel não conhece o motor, só pede o que precisa. */
export interface FonteAmostras {
  amostrasDoModo(modo: ModoPendulo): readonly Amostra[]
  modosVisiveis(): readonly ModoPendulo[]
}

export interface PainelGraficos {
  readonly elemento: HTMLElement
  atualizar(): void
  destruir(): void
}

interface OpcaoGrafico {
  readonly id: string
  readonly rotulo: string
  readonly temporal: boolean
}

const OPCOES: readonly OpcaoGrafico[] = [
  { id: 'periodo-por-amplitude', rotulo: 'Período × amplitude', temporal: false },
  { id: 'erro-por-amplitude', rotulo: 'Erro da aproximação', temporal: false },
  { id: 'convergencia', rotulo: 'Convergência da série', temporal: false },
  { id: 'temporal', rotulo: 'Movimento no tempo', temporal: true },
  { id: 'energia', rotulo: 'Energia', temporal: true },
  { id: 'retrato-de-fase', rotulo: 'Espaço de fase', temporal: true },
  { id: 'poincare', rotulo: 'Seção de Poincaré', temporal: true },
]

const INTERVALO_MINIMO_MS = 50 // 20 Hz (RNF-002)

/**
 * Formata uma leitura conforme o eixo a que pertence.
 *
 * Num eixo logarítmico as grandezas atravessam ordens de magnitude, e a
 * notação fixa colapsaria um erro de 1e-8 em `0,000000` — justamente o valor
 * que o gráfico existe para mostrar.
 */
function formatar(valor: number, eixo: EixoGrafico): string {
  let texto: string
  if (!Number.isFinite(valor)) return '—'
  if (eixo.casas !== undefined) texto = valor.toFixed(eixo.casas)
  else if (valor !== 0 && Math.abs(valor) < 1e-3) texto = valor.toExponential(3)
  else texto = valor.toFixed(Math.abs(valor) >= 100 ? 1 : Math.abs(valor) >= 1 ? 4 : 6)
  texto = texto.replace('.', ',')
  return eixo.unidade === null ? texto : `${texto} ${eixo.unidade}`
}

export function criarPainelGraficos(
  recipiente: HTMLElement,
  store: Store,
  fonte: FonteAmostras,
  relogio: () => number = () => Date.now(),
): PainelGraficos {
  const raiz = document.createElement('section')
  raiz.className = 'painel-graficos'

  const cabecalho = document.createElement('div')
  cabecalho.className = 'graficos-cabecalho'

  const titulo = document.createElement('h2')
  titulo.textContent = 'Gráficos'

  const seletor = document.createElement('select')
  seletor.id = 'grafico-selecionado'
  seletor.setAttribute('aria-label', 'Gráfico exibido')
  for (const opcao of OPCOES) {
    const item = document.createElement('option')
    item.value = opcao.id
    item.textContent = opcao.rotulo
    seletor.append(item)
  }

  const rotuloSeletor = document.createElement('label')
  rotuloSeletor.htmlFor = seletor.id
  rotuloSeletor.textContent = 'Gráfico'

  cabecalho.append(titulo, rotuloSeletor, seletor)

  const descricao = document.createElement('p')
  descricao.className = 'graficos-descricao'

  const moldura = document.createElement('div')
  moldura.className = 'graficos-moldura'
  const tela = document.createElement('canvas')
  tela.className = 'graficos-tela'
  tela.setAttribute('role', 'img')
  moldura.append(tela)

  const legenda = document.createElement('dl')
  legenda.className = 'graficos-legenda'
  legenda.setAttribute('aria-live', 'polite')

  raiz.append(cabecalho, descricao, moldura, legenda)
  recipiente.append(raiz)

  const contexto = tela.getContext('2d')
  const paleta = new ControladorPaleta(document.documentElement, () => redesenhar(true))

  let modeloAtual: ModeloGrafico | null = null
  let layoutAtual: LayoutGrafico | null = null
  let ultimoDesenho = Number.NEGATIVE_INFINITY
  let assinaturaAnalitica = ''
  let destruido = false
  let valorApontado: number | null = null

  const opcaoSelecionada = (): OpcaoGrafico =>
    OPCOES.find((o) => o.id === seletor.value) ?? OPCOES[0]!

  const modoCorrente = (): ModoPendulo =>
    fonte.modosVisiveis().includes('simples') ? 'simples' : 'cicloidal'

  function construirModelo(): ModeloGrafico {
    const opcao = opcaoSelecionada()
    if (!opcao.temporal) {
      if (opcao.id === 'erro-por-amplitude') return graficoErroPorAmplitude(store)
      if (opcao.id === 'convergencia') return graficoConvergencia(store)
      return graficoPeriodoPorAmplitude(store)
    }
    const modo = modoCorrente()
    return graficoTemporalPorId(opcao.id as IdGraficoTemporal, store, fonte.amostrasDoModo(modo), modo)
  }

  /** Assinatura dos parâmetros que alteram uma curva analítica. */
  const assinatura = (): string =>
    [
      seletor.value,
      store.numero('L'),
      store.numero('g'),
      store.numero('N'),
      store.numero('alpha'),
      store.texto('modo'),
      JSON.stringify(store.bruto('modelosExibidos')),
    ].join('|')

  function redesenhar(forcar = false): void {
    if (destruido || contexto === null) return

    const agora = relogio()
    if (!forcar && agora - ultimoDesenho < INTERVALO_MINIMO_MS) return

    const opcao = opcaoSelecionada()
    // Curva analítica só é refeita quando algum parâmetro dela muda: recalcular
    // 120 pontos de varredura a cada quadro seria desperdício puro.
    if (!opcao.temporal) {
      const nova = assinatura()
      if (!forcar && nova === assinaturaAnalitica && modeloAtual !== null) return
      assinaturaAnalitica = nova
    }

    ultimoDesenho = agora
    modeloAtual = construirModelo()

    const largura = Math.max(200, moldura.clientWidth || 640)
    const altura = Math.max(160, Math.round(largura * 0.42))
    const dpr = Math.min(2, globalThis.devicePixelRatio ?? 1)
    if (tela.width !== Math.round(largura * dpr) || tela.height !== Math.round(altura * dpr)) {
      tela.width = Math.round(largura * dpr)
      tela.height = Math.round(altura * dpr)
      tela.style.width = `${largura}px`
      tela.style.height = `${altura}px`
    }
    contexto.setTransform(dpr, 0, 0, dpr, 0, 0)

    layoutAtual = desenhar(contexto, modeloAtual, { largura, altura }, paleta.atual)
    descricao.textContent = modeloAtual.descricao
    tela.setAttribute('aria-label', `${modeloAtual.titulo}. ${modeloAtual.descricao}`)
    atualizarLegenda()
  }

  /** Leitura de valores no ponto apontado (RF-083). */
  function atualizarLegenda(): void {
    if (modeloAtual === null) return
    legenda.replaceChildren()

    // Sem cursor, a legenda lê no marcador do valor corrente (RF-084). Mostrar
    // o último ponto da série daria os números da borda do gráfico — em α = 179°
    // no caso da curva T(α) — passando por valores atuais.
    const ondeLer = valorApontado ?? modeloAtual.marcadores[0]?.x ?? null
    const leituras =
      ondeLer === null
        ? modeloAtual.series.map((s) => ({
            serie: s.id,
            rotulo: s.rotulo,
            cor: s.cor,
            x: Number.NaN,
            y: s.pontos.at(-1)?.y ?? Number.NaN,
          }))
        : lerNoPonto(modeloAtual, ondeLer)

    if (ondeLer !== null) {
      const cabecalhoX = document.createElement('div')
      cabecalhoX.className = 'graficos-legenda-x'
      cabecalhoX.dataset.origem = valorApontado === null ? 'marcador' : 'cursor'
      cabecalhoX.textContent = `${modeloAtual.eixoX.rotulo} = ${formatar(ondeLer, modeloAtual.eixoX)}`
      legenda.append(cabecalhoX)
    }

    for (const leitura of leituras) {
      const grupo = document.createElement('div')
      grupo.dataset.serie = leitura.serie
      const dt = document.createElement('dt')
      dt.textContent = leitura.rotulo
      dt.style.setProperty('--cor-serie', corDaPaleta(paleta.atual, leitura.cor))
      const dd = document.createElement('dd')
      dd.textContent = formatar(leitura.y, modeloAtual.eixoY)
      grupo.append(dt, dd)
      legenda.append(grupo)
    }
  }

  const aoMover = (evento: PointerEvent): void => {
    if (layoutAtual === null || modeloAtual === null) return
    const caixa = tela.getBoundingClientRect()
    valorApontado = valorSobPosicao(evento.clientX - caixa.left, layoutAtual, modeloAtual.eixoX.tipo)
    atualizarLegenda()
  }

  const aoSair = (): void => {
    valorApontado = null
    atualizarLegenda()
  }

  const aoTrocar = (): void => {
    valorApontado = null
    redesenhar(true)
  }

  seletor.addEventListener('change', aoTrocar)
  tela.addEventListener('pointermove', aoMover)
  tela.addEventListener('pointerleave', aoSair)

  redesenhar(true)

  return {
    elemento: raiz,
    atualizar: () => redesenhar(),
    destruir: () => {
      destruido = true
      seletor.removeEventListener('change', aoTrocar)
      tela.removeEventListener('pointermove', aoMover)
      tela.removeEventListener('pointerleave', aoSair)
      paleta.destruir()
      raiz.remove()
    },
  }
}
