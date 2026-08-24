import { desenharFacesETrajetoria, desenharFioCicloidal, geometriaCicloidal } from './cycloid-face.js'
import { desenharInstrumentosEstaticos, desenharVetores } from './instruments.js'
import type { CamadasCanvas } from './layers.js'
import { ControladorPaleta, type PaletaCena } from './palette.js'
import { desenharSensorZero } from './sensor-marker.js'
import { RastroDePeriodo, RastroIncremental } from './trace.js'
import { calcularVistas, type VistaCena } from './transform.js'
import type { EstadoPenduloCena, PontoMundo, QuadroCena, TemposCamadas } from './types.js'

export interface AmostraEstroboscopio {
  readonly tempo: number
  readonly ponto: PontoMundo
}

export class HistoricoEstroboscopio {
  private readonly amostrasPorPendulo = new Map<string, AmostraEstroboscopio[]>()
  private readonly inicios = new Map<string, number>()
  private readonly ultimaEntrada = new Map<string, AmostraEstroboscopio>()
  private readonly proximaAmostra = new Map<string, number>()

  atualizar(id: string, tempo: number, ponto: PontoMundo, intervalo: number, maximo: number): void {
    const anterior = this.ultimaEntrada.get(id)
    if (anterior !== undefined && tempo < anterior.tempo) {
      this.limpar(id)
    }
    const entradaAnterior = this.ultimaEntrada.get(id)
    const amostras = this.amostrasPorPendulo.get(id) ?? []
    let inicio = this.inicios.get(id) ?? 0
    if (entradaAnterior === undefined) {
      amostras.push({ tempo, ponto })
      this.proximaAmostra.set(id, tempo + intervalo)
    } else {
      let proxima = this.proximaAmostra.get(id) ?? entradaAnterior.tempo + intervalo
      // Um quadro lento pode atravessar vários intervalos. Interpolamos cada
      // instante, em vez de condensá-los numa única imagem final.
      while (proxima <= tempo + 1e-12) {
        const faixa = tempo - entradaAnterior.tempo
        const u = faixa <= 0 ? 1 : (proxima - entradaAnterior.tempo) / faixa
        amostras.push({
          tempo: proxima,
          ponto: {
            x: entradaAnterior.ponto.x + (ponto.x - entradaAnterior.ponto.x) * u,
            y: entradaAnterior.ponto.y + (ponto.y - entradaAnterior.ponto.y) * u,
          },
        })
        proxima += intervalo
      }
      this.proximaAmostra.set(id, proxima)
    }
    this.ultimaEntrada.set(id, { tempo, ponto })
    if (amostras.length - inicio > maximo) inicio = amostras.length - maximo
    if (inicio > 1024 && inicio * 2 > amostras.length) {
      amostras.splice(0, inicio)
      inicio = 0
    }
    this.amostrasPorPendulo.set(id, amostras)
    this.inicios.set(id, inicio)
  }

  obter(id: string): readonly AmostraEstroboscopio[] {
    const amostras = this.amostrasPorPendulo.get(id)
    return amostras === undefined ? [] : amostras.slice(this.inicios.get(id) ?? 0)
  }

  paraCada(id: string, acao: (amostra: AmostraEstroboscopio, indice: number, quantidade: number) => void): void {
    const amostras = this.amostrasPorPendulo.get(id)
    if (amostras === undefined) return
    const inicio = this.inicios.get(id) ?? 0
    const quantidade = amostras.length - inicio
    for (let i = inicio; i < amostras.length; i++) acao(amostras[i]!, i - inicio, quantidade)
  }

  limpar(id?: string): void {
    if (id === undefined) {
      this.amostrasPorPendulo.clear()
      this.ultimaEntrada.clear()
      this.proximaAmostra.clear()
      this.inicios.clear()
    } else {
      this.amostrasPorPendulo.delete(id)
      this.ultimaEntrada.delete(id)
      this.proximaAmostra.delete(id)
      this.inicios.delete(id)
    }
  }
}

function posicaoMassa(estado: EstadoPenduloCena): PontoMundo {
  if (estado.modo === 'cicloidal') return geometriaCicloidal(estado.L, estado.theta).massa
  return {
    x: estado.L * Math.sin(estado.theta),
    y: estado.L * Math.cos(estado.theta),
  }
}

export function anguloFantasmaT0(estado: EstadoPenduloCena): number {
  const fase = (2 * Math.PI * estado.tempo) / estado.T0
  return estado.modo === 'cicloidal'
    ? Math.asin(Math.sin(estado.alphaInicial) * Math.cos(fase))
    : estado.alphaInicial * Math.cos(fase)
}

function desenharGrade(
  contexto: CanvasRenderingContext2D,
  vista: VistaCena,
  espacamento: number,
  paleta: PaletaCena,
): void {
  if (!(espacamento > 0)) return
  const { retangulo, transformacao } = vista
  const minimo = transformacao.telaParaMundo({ x: retangulo.x, y: retangulo.y })
  const maximo = transformacao.telaParaMundo({
    x: retangulo.x + retangulo.largura,
    y: retangulo.y + retangulo.altura,
  })
  const passoMinimo = 22 / (transformacao.pixelsPorMetro * transformacao.zoom)
  const multiplicador = Math.max(1, Math.ceil(passoMinimo / espacamento))
  const passo = espacamento * multiplicador
  contexto.save()
  contexto.beginPath()
  contexto.rect(retangulo.x, retangulo.y, retangulo.largura, retangulo.altura)
  contexto.clip()
  contexto.strokeStyle = paleta.grade
  contexto.lineWidth = 1
  contexto.beginPath()
  for (let x = Math.floor(minimo.x / passo) * passo; x <= maximo.x; x += passo) {
    const tela = transformacao.mundoParaTela({ x, y: 0 })
    contexto.moveTo(tela.x, retangulo.y)
    contexto.lineTo(tela.x, retangulo.y + retangulo.altura)
  }
  for (let y = Math.floor(minimo.y / passo) * passo; y <= maximo.y; y += passo) {
    const tela = transformacao.mundoParaTela({ x: 0, y })
    contexto.moveTo(retangulo.x, tela.y)
    contexto.lineTo(retangulo.x + retangulo.largura, tela.y)
  }
  contexto.stroke()
  contexto.restore()
}

function desenharMassa(
  contexto: CanvasRenderingContext2D,
  vista: VistaCena,
  estado: EstadoPenduloCena,
  ponto: PontoMundo,
  cor: string,
  alpha = 1,
): void {
  const tela = vista.transformacao.mundoParaTela(ponto)
  const raio = Math.max(8, Math.min(18, vista.transformacao.metrosParaPixels(estado.L * 0.055)))
  contexto.save()
  contexto.globalAlpha = alpha
  contexto.fillStyle = cor
  contexto.strokeStyle = cor
  contexto.lineWidth = 2
  contexto.beginPath()
  contexto.arc(tela.x, tela.y, raio, 0, 2 * Math.PI)
  contexto.fill()
  contexto.globalAlpha = Math.min(1, alpha + 0.12)
  contexto.stroke()
  contexto.restore()
}

function desenharPivo(
  contexto: CanvasRenderingContext2D,
  vista: VistaCena,
  paleta: PaletaCena,
): void {
  const pivo = vista.transformacao.mundoParaTela({ x: 0, y: 0 })
  contexto.save()
  contexto.fillStyle = paleta.texto
  contexto.beginPath()
  contexto.arc(pivo.x, pivo.y, 6, 0, 2 * Math.PI)
  contexto.fill()
  contexto.strokeStyle = paleta.borda
  contexto.lineWidth = 4
  contexto.beginPath()
  contexto.moveTo(pivo.x - 18, pivo.y - 7)
  contexto.lineTo(pivo.x + 18, pivo.y - 7)
  contexto.stroke()
  contexto.restore()
}

export class RenderizadorCena {
  private readonly paleta: ControladorPaleta
  private readonly rastro = new RastroIncremental()
  private readonly rastroPeriodo = new RastroDePeriodo()
  private readonly estroboscopio = new HistoricoEstroboscopio()
  private estaticaInvalida = true
  private chaveEstatica = ''
  private chaveEfeitos = ''
  private cancelarResize: () => void
  private cancelarMovimentoRegua: () => void
  private ultimaDescricaoEm = Number.NEGATIVE_INFINITY
  private chaveVistas = ''
  private vistas: VistaCena[] = []
  private readonly pendulosComVista: { vista: VistaCena; estado: EstadoPenduloCena }[] = []
  private readonly opcoesInstrumentos = {
    linhaVertical: false,
    transferidor: false,
    regua: false,
    arcoAmplitude: false,
    deslocamentoReguaPx: 0,
  }
  private readonly limitesRegua = { min: 0, max: 0 }

  constructor(
    private readonly camadas: CamadasCanvas,
    raizTema: HTMLElement,
    private readonly solicitarRender: () => void = () => undefined,
  ) {
    this.paleta = new ControladorPaleta(raizTema, () => {
      this.invalidarEstatica()
      this.reiniciarEfeitos()
      this.solicitarRender()
    })
    this.cancelarResize = this.camadas.aoRedimensionar(() => {
      this.invalidarEstatica()
      this.rastro.reiniciar()
      this.rastroPeriodo.limpar()
      this.estroboscopio.limpar()
      this.solicitarRender()
    })
    this.cancelarMovimentoRegua = this.camadas.aoMoverRegua(() => {
      this.invalidarEstatica()
      this.solicitarRender()
    })
  }

  invalidarEstatica(): void {
    this.estaticaInvalida = true
  }

  reiniciarEfeitos(): void {
    this.camadas.limpar('rastro')
    this.rastro.reiniciar()
    this.rastroPeriodo.limpar()
    this.estroboscopio.limpar()
  }

  renderizar(quadro: QuadroCena): TemposCamadas {
    const inicioTotal = performance.now()
    const { largura, altura } = this.camadas.dimensoes
    let comprimentoMaximo = 0.05
    for (const pendulo of quadro.pendulos) comprimentoMaximo = Math.max(comprimentoMaximo, pendulo.L)
    const chaveVistas = `${largura}|${altura}|${comprimentoMaximo}|${quadro.opcoes.zoom}|${quadro.visualizacao}`
    if (chaveVistas !== this.chaveVistas) {
      this.chaveVistas = chaveVistas
      this.vistas = calcularVistas(largura, altura, comprimentoMaximo, quadro.opcoes.zoom, quadro.visualizacao)
    }
    const pendulos = this.pendulosComVista
    let quantidadePendulos = 0
    for (const vista of this.vistas) {
      let estado: EstadoPenduloCena | undefined
      for (const candidato of quadro.pendulos) {
        if (candidato.modo === vista.modo) { estado = candidato; break }
      }
      if (estado !== undefined) {
        const item = pendulos[quantidadePendulos]
        if (item === undefined) pendulos.push({ vista, estado })
        else { item.vista = vista; item.estado = estado }
        quantidadePendulos += 1
      }
    }
    pendulos.length = quantidadePendulos
    this.camadas.recipiente.dataset['comparacao'] = String(quadro.visualizacao === 'comparacao')
    const primeiraVista = this.vistas[0]
    if (primeiraVista !== undefined) {
      this.limitesRegua.min = primeiraVista.retangulo.x + 22 - primeiraVista.transformacao.origem.x
      this.limitesRegua.max = primeiraVista.retangulo.x + primeiraVista.retangulo.largura - 22 - primeiraVista.transformacao.origem.x
    }
    this.camadas.definirReguaVisivel(
      quadro.opcoes.regua,
      primeiraVista?.transformacao.origem.x,
      primeiraVista?.transformacao.origem.y,
      primeiraVista === undefined ? undefined : this.limitesRegua,
    )
    const chaveEfeitos = `${quadro.visualizacao}|${quadro.opcoes.zoom}|${Number(quadro.opcoes.rastro)}|${quadro.opcoes.duracaoRastro}|${Number(quadro.opcoes.rastroPeriodo)}|${Number(quadro.opcoes.estroboscopio)}|${quadro.opcoes.intervaloEstroboscopio}|${quadro.opcoes.imagensEstroboscopio}`
    if (this.chaveEfeitos !== '' && chaveEfeitos !== this.chaveEfeitos) this.reiniciarEfeitos()
    this.chaveEfeitos = chaveEfeitos
    let chave = `${largura}|${altura}|${quadro.visualizacao}|${quadro.opcoes.zoom}|${Number(quadro.opcoes.grade.ligada)}|${quadro.opcoes.grade.espacamento}`
    chave += `|${Number(quadro.opcoes.transferidor)}${Number(quadro.opcoes.regua)}${Number(quadro.opcoes.linhaVertical)}${Number(quadro.opcoes.arcoAmplitude)}`
    for (const item of pendulos) chave += `|${item.estado.modo}:${item.estado.L}:${item.estado.alphaInicial}`
    if (chave !== this.chaveEstatica) {
      this.chaveEstatica = chave
      this.estaticaInvalida = true
    }

    let tempoEstatica = 0
    if (this.estaticaInvalida) {
      const inicio = performance.now()
      this.desenharEstatica(pendulos, quadro)
      tempoEstatica = performance.now() - inicio
      this.estaticaInvalida = false
    }

    const inicioRastro = performance.now()
    this.desenharRastro(pendulos, quadro)
    const tempoRastro = performance.now() - inicioRastro

    const inicioDinamica = performance.now()
    this.desenharDinamica(pendulos, quadro)
    const tempoDinamica = performance.now() - inicioDinamica
    const total = performance.now() - inicioTotal
    this.atualizarDescricao(quadro)
    return { estatica: tempoEstatica, rastro: tempoRastro, dinamica: tempoDinamica, total }
  }

  destruir(): void {
    this.cancelarResize()
    this.cancelarMovimentoRegua()
    this.paleta.destruir()
    this.reiniciarEfeitos()
  }

  private desenharEstatica(
    pendulos: readonly { readonly vista: VistaCena; readonly estado: EstadoPenduloCena }[],
    quadro: QuadroCena,
  ): void {
    const contexto = this.camadas.estatica.contexto
    const { largura, altura } = this.camadas.dimensoes
    const paleta = this.paleta.atual
    contexto.clearRect(0, 0, largura, altura)
    contexto.fillStyle = paleta.fundo
    contexto.fillRect(0, 0, largura, altura)
    for (const { vista, estado } of pendulos) {
      contexto.save()
      contexto.beginPath()
      contexto.rect(vista.retangulo.x, vista.retangulo.y, vista.retangulo.largura, vista.retangulo.altura)
      contexto.clip()
      if (quadro.opcoes.grade.ligada) desenharGrade(contexto, vista, quadro.opcoes.grade.espacamento, paleta)
      this.opcoesInstrumentos.linhaVertical = quadro.opcoes.linhaVertical
      this.opcoesInstrumentos.transferidor = quadro.opcoes.transferidor
      this.opcoesInstrumentos.regua = quadro.opcoes.regua
      this.opcoesInstrumentos.arcoAmplitude = quadro.opcoes.arcoAmplitude
      this.opcoesInstrumentos.deslocamentoReguaPx = this.camadas.deslocamentoReguaPx
      desenharInstrumentosEstaticos(
        contexto,
        vista.transformacao,
        estado.L,
        estado.alphaInicial,
        this.opcoesInstrumentos,
        paleta,
      )
      if (estado.modo === 'cicloidal') {
        desenharFacesETrajetoria(
          contexto,
          vista.transformacao,
          estado.L,
          estado.alphaInicial,
          paleta,
          quadro.opcoes.exibirEvoluta,
          quadro.opcoes.exibirInvoluta,
        )
      }
      contexto.save()
      contexto.fillStyle = paleta.texto
      contexto.font = '600 13px system-ui, sans-serif'
      contexto.fillText(estado.modo === 'simples' ? 'Pêndulo simples' : 'Pêndulo cicloidal', vista.retangulo.x + 14, 24)
      contexto.restore()
      contexto.restore()
    }
    if (pendulos.length === 2) {
      contexto.save()
      contexto.strokeStyle = paleta.borda
      contexto.beginPath()
      contexto.moveTo(largura / 2, 12)
      contexto.lineTo(largura / 2, altura - 12)
      contexto.stroke()
      contexto.restore()
    }
  }

  private desenharRastro(
    pendulos: readonly { readonly vista: VistaCena; readonly estado: EstadoPenduloCena }[],
    quadro: QuadroCena,
  ): void {
    if (!quadro.opcoes.rastro && !quadro.opcoes.rastroPeriodo) return
    const contexto = this.camadas.rastro.contexto
    const { largura, altura } = this.camadas.dimensoes
    let tempo = 0
    for (const item of pendulos) tempo = Math.max(tempo, item.estado.tempo)
    if (quadro.opcoes.rastroPeriodo) contexto.clearRect(0, 0, largura, altura)
    else this.rastro.atualizarDesvanecimento(contexto, largura, altura, tempo, quadro.opcoes.duracaoRastro)
    for (const { vista, estado } of pendulos) {
      const cor = estado.modo === 'simples' ? this.paleta.atual.simples : this.paleta.atual.cicloidal
      contexto.save()
      contexto.beginPath()
      contexto.rect(vista.retangulo.x, vista.retangulo.y, vista.retangulo.largura, vista.retangulo.altura)
      contexto.clip()
      const ponto = posicaoMassa(estado)
      if (quadro.opcoes.rastroPeriodo) {
        this.rastroPeriodo.adicionar(estado.id, ponto, estado.tempo, estado.periodo)
        this.rastroPeriodo.desenhar(
          estado.id,
          contexto,
          vista.transformacao,
          cor,
          estado.modo === 'cicloidal',
        )
      } else {
        this.rastro.adicionar(contexto, estado.id, ponto, estado.tempo, vista.transformacao, cor, estado.modo === 'cicloidal')
      }
      contexto.restore()
    }
  }

  private desenharDinamica(
    pendulos: readonly { readonly vista: VistaCena; readonly estado: EstadoPenduloCena }[],
    quadro: QuadroCena,
  ): void {
    const contexto = this.camadas.dinamica.contexto
    const { largura, altura } = this.camadas.dimensoes
    const paleta = this.paleta.atual
    contexto.clearRect(0, 0, largura, altura)
    for (const { vista, estado } of pendulos) {
      contexto.save()
      contexto.beginPath()
      contexto.rect(vista.retangulo.x, vista.retangulo.y, vista.retangulo.largura, vista.retangulo.altura)
      contexto.clip()
      const cor = estado.modo === 'simples' ? paleta.simples : paleta.cicloidal
      const ponto = posicaoMassa(estado)
      if (quadro.opcoes.estroboscopio) {
        this.estroboscopio.atualizar(
          estado.id,
          estado.tempo,
          ponto,
          quadro.opcoes.intervaloEstroboscopio,
          quadro.opcoes.imagensEstroboscopio,
        )
        this.estroboscopio.paraCada(estado.id, (amostra, indice, quantidade) => {
          const alpha = 0.1 + (0.45 * (indice + 1)) / Math.max(1, quantidade)
          desenharMassa(contexto, vista, estado, amostra.ponto, cor, alpha)
        })
      }
      if (quadro.opcoes.penduloFantasma) this.desenharFantasma(contexto, vista, estado, paleta)
      if (estado.modo === 'simples') {
        const pivo = vista.transformacao.mundoParaTela({ x: 0, y: 0 })
        const massa = vista.transformacao.mundoParaTela(ponto)
        contexto.save()
        contexto.strokeStyle = cor
        contexto.lineWidth = 2
        contexto.beginPath()
        contexto.moveTo(pivo.x, pivo.y)
        contexto.lineTo(massa.x, massa.y)
        contexto.stroke()
        contexto.restore()
      } else {
        desenharFioCicloidal(contexto, vista.transformacao, estado.L, estado.theta, cor)
      }
      desenharPivo(contexto, vista, paleta)
      desenharMassa(contexto, vista, estado, ponto, cor)
      desenharSensorZero(
        contexto,
        vista.transformacao,
        { x: 0, y: estado.L },
        estado.tempo,
        estado.ultimoDisparoSensor,
        paleta,
      )
      desenharVetores(contexto, vista.transformacao, ponto, estado, {
        velocidade: quadro.opcoes.vetorVelocidade,
        aceleracao: quadro.opcoes.vetorAceleracao,
        decomporAceleracao: quadro.opcoes.decomporAceleracao,
        forcas: quadro.opcoes.vetoresForca,
        escala: quadro.opcoes.escalaVetores,
      }, paleta)
      contexto.restore()
    }
  }

  private desenharFantasma(
    contexto: CanvasRenderingContext2D,
    vista: VistaCena,
    estado: EstadoPenduloCena,
    paleta: PaletaCena,
  ): void {
    const theta = anguloFantasmaT0(estado)
    const fantasma = { ...estado, theta }
    const ponto = posicaoMassa(fantasma)
    const pivo = vista.transformacao.mundoParaTela({ x: 0, y: 0 })
    const massa = vista.transformacao.mundoParaTela(ponto)
    contexto.save()
    contexto.globalAlpha = 0.38
    contexto.strokeStyle = paleta.referenciaT0
    contexto.setLineDash([6, 5])
    contexto.beginPath()
    contexto.moveTo(pivo.x, pivo.y)
    contexto.lineTo(massa.x, massa.y)
    contexto.stroke()
    contexto.restore()
    desenharMassa(contexto, vista, fantasma, ponto, paleta.referenciaT0, 0.28)
  }

  private atualizarDescricao(quadro: QuadroCena): void {
    const agora = performance.now()
    if (agora - this.ultimaDescricaoEm < 1000) return
    this.ultimaDescricaoEm = agora
    let descricao = 'Cena animada.'
    for (const p of quadro.pendulos) {
      const graus = (p.theta * 180) / Math.PI
      descricao += ` ${p.modo}: ângulo ${graus.toFixed(1)} graus, tempo ${p.tempo.toFixed(2)} segundos;`
    }
    this.camadas.overlay.setAttribute('aria-label', descricao)
  }
}
