import type { PaletaCena } from './palette.js'
import type { TransformacaoMundo } from './transform.js'
import type { EstadoPenduloCena, ForcaVisual, PontoMundo, VetorMundo } from './types.js'

export interface VetoresPendulo {
  readonly velocidade: VetorMundo
  readonly aceleracaoTangencial: VetorMundo
  readonly aceleracaoCentripeta: VetorMundo
  readonly aceleracao: VetorMundo
  readonly peso: VetorMundo
  readonly tracao: VetorMundo
  readonly arrasto: VetorMundo
  readonly externa: VetorMundo
  readonly resultante: VetorMundo
  readonly moduloTracao: number
}

const somar = (a: VetorMundo, b: VetorMundo): VetorMundo => ({ x: a.x + b.x, y: a.y + b.y })
const escalar = (v: VetorMundo, k: number): VetorMundo => ({ x: v.x * k, y: v.y * k })

/** Vetores em eixos do Canvas; a tangente positiva acompanha o aumento de theta. */
export function calcularVetores(estado: EstadoPenduloCena): VetoresPendulo {
  const { theta, qPonto, qDoisPontos, L, m, g, modo } = estado
  const tangente = { x: Math.cos(theta), y: -Math.sin(theta) }
  const radialExterna = { x: Math.sin(theta), y: Math.cos(theta) }
  const velocidade = escalar(tangente, L * qPonto)
  const aceleracaoTangencial = escalar(tangente, L * qDoisPontos)
  const cosseno = Math.cos(theta)
  // Na cicloide ds/dtheta = L cos(theta), portanto a curvatura assinada é
  // -1/(L cos(theta)) e a componente normal vale -L qPonto^2/cos(theta).
  // O estado admissível na cúspide tem qPonto=0; tratar 0/0 pelo seu limite
  // físico evita NaN sem falsear ângulos próximos com um piso arbitrário.
  const fatorCurvatura = modo === 'cicloidal'
    ? qPonto === 0 ? 0 : -(L * qPonto * qPonto) / cosseno
    : -L * qPonto * qPonto
  const aceleracaoCentripeta = escalar(radialExterna, fatorCurvatura)
  const aceleracao = somar(aceleracaoTangencial, aceleracaoCentripeta)
  const peso = { x: 0, y: m * g }
  const resultante = escalar(aceleracao, m)
  const aceleracaoArrasto = estado.modeloAtrito === 'viscoso'
    ? -estado.gamma * qPonto
    : estado.modeloAtrito === 'quadratico'
      ? -estado.cq * qPonto * Math.abs(qPonto)
      : 0
  const arrasto = escalar(tangente, m * L * aceleracaoArrasto)
  const externa = escalar(tangente, m * L * estado.aceleracaoExterna)
  // A reação do vínculo fecha a segunda lei sem esconder dissipação ou força
  // aplicada: F_res = peso + tração + arrasto + externa.
  const tracao = {
    x: resultante.x - peso.x - arrasto.x - externa.x,
    y: resultante.y - peso.y - arrasto.y - externa.y,
  }
  return {
    velocidade,
    aceleracaoTangencial,
    aceleracaoCentripeta,
    aceleracao,
    peso,
    tracao,
    arrasto,
    externa,
    resultante,
    moduloTracao: Math.hypot(tracao.x, tracao.y),
  }
}

export function desenharSeta(
  contexto: CanvasRenderingContext2D,
  origem: { readonly x: number; readonly y: number },
  vetorPixels: VetorMundo,
  cor: string,
  rotulo: string,
): void {
  const comprimento = Math.hypot(vetorPixels.x, vetorPixels.y)
  if (comprimento < 0.5) return
  const ponta = { x: origem.x + vetorPixels.x, y: origem.y + vetorPixels.y }
  const angulo = Math.atan2(vetorPixels.y, vetorPixels.x)
  const cabeca = Math.min(10, Math.max(5, comprimento * 0.2))
  contexto.save()
  contexto.strokeStyle = cor
  contexto.fillStyle = cor
  contexto.lineWidth = 2
  contexto.beginPath()
  contexto.moveTo(origem.x, origem.y)
  contexto.lineTo(ponta.x, ponta.y)
  contexto.lineTo(ponta.x - cabeca * Math.cos(angulo - Math.PI / 6), ponta.y - cabeca * Math.sin(angulo - Math.PI / 6))
  contexto.moveTo(ponta.x, ponta.y)
  contexto.lineTo(ponta.x - cabeca * Math.cos(angulo + Math.PI / 6), ponta.y - cabeca * Math.sin(angulo + Math.PI / 6))
  contexto.stroke()
  contexto.font = '12px var(--fonte-numerica)'
  contexto.fillText(rotulo, ponta.x + 4, ponta.y - 4)
  contexto.restore()
}

export interface OpcoesVetores {
  readonly velocidade: boolean
  readonly aceleracao: boolean
  readonly decomporAceleracao: boolean
  readonly forcas: readonly ForcaVisual[]
  readonly escala: number
}

export function desenharVetores(
  contexto: CanvasRenderingContext2D,
  transformacao: TransformacaoMundo,
  posicao: PontoMundo,
  estado: EstadoPenduloCena,
  opcoes: OpcoesVetores,
  paleta: PaletaCena,
): void {
  if (!opcoes.velocidade && !opcoes.aceleracao && opcoes.forcas.length === 0) return
  const origem = transformacao.mundoParaTela(posicao)
  const vetores = calcularVetores(estado)
  const escalaCinematica = 18 * opcoes.escala
  const escalaForca = (18 / Math.max(0.1, estado.m)) * opcoes.escala
  if (opcoes.velocidade) {
    desenharSeta(contexto, origem, escalar(vetores.velocidade, escalaCinematica), paleta.energiaCinetica, 'v')
  }
  if (opcoes.aceleracao) {
    desenharSeta(contexto, origem, escalar(vetores.aceleracao, escalaCinematica), paleta.energiaPotencial, 'a')
    if (opcoes.decomporAceleracao) {
      desenharSeta(contexto, origem, escalar(vetores.aceleracaoTangencial, escalaCinematica), paleta.energiaTermica, 'aₜ')
      desenharSeta(contexto, origem, escalar(vetores.aceleracaoCentripeta, escalaCinematica), paleta.energiaTotal, 'aᵣ')
    }
  }
  const mapa: Record<ForcaVisual, { vetor: VetorMundo; cor: string; rotulo: string }> = {
    peso: { vetor: vetores.peso, cor: paleta.energiaPotencial, rotulo: 'P' },
    tracao: { vetor: vetores.tracao, cor: paleta.energiaCinetica, rotulo: 'T' },
    arrasto: { vetor: vetores.arrasto, cor: paleta.energiaTermica, rotulo: 'D' },
    externa: { vetor: vetores.externa, cor: paleta.sensorDisparo, rotulo: 'Fₑ' },
    resultante: { vetor: vetores.resultante, cor: paleta.energiaTotal, rotulo: 'F' },
  }
  for (const nome of opcoes.forcas) {
    const item = mapa[nome]
    desenharSeta(contexto, origem, escalar(item.vetor, escalaForca), item.cor, item.rotulo)
  }
  if (opcoes.forcas.includes('tracao')) {
    contexto.save()
    contexto.fillStyle = paleta.texto
    contexto.font = '12px var(--fonte-numerica)'
    contexto.fillText(`|T| = ${vetores.moduloTracao.toFixed(2)} N`, origem.x + 12, origem.y + 24)
    contexto.restore()
  }
}

export interface OpcoesInstrumentosEstaticos {
  readonly linhaVertical: boolean
  readonly transferidor: boolean
  readonly regua: boolean
  readonly arcoAmplitude: boolean
  readonly deslocamentoReguaPx?: number
}

export function desenharInstrumentosEstaticos(
  contexto: CanvasRenderingContext2D,
  transformacao: TransformacaoMundo,
  L: number,
  alpha: number,
  opcoes: OpcoesInstrumentosEstaticos,
  paleta: PaletaCena,
): void {
  if (!opcoes.linhaVertical && !opcoes.transferidor && !opcoes.regua && !opcoes.arcoAmplitude) return
  const pivo = transformacao.mundoParaTela({ x: 0, y: 0 })
  contexto.save()
  contexto.strokeStyle = paleta.eixo
  contexto.fillStyle = paleta.textoSuave
  contexto.lineWidth = 1
  contexto.font = '11px var(--fonte-numerica)'
  if (opcoes.linhaVertical) {
    const fim = transformacao.mundoParaTela({ x: 0, y: L * 1.06 })
    contexto.setLineDash([5, 5])
    contexto.beginPath()
    contexto.moveTo(pivo.x, pivo.y)
    contexto.lineTo(fim.x, fim.y)
    contexto.stroke()
    contexto.setLineDash([])
  }
  if (opcoes.transferidor) {
    const raio = Math.min(64, transformacao.metrosParaPixels(L * 0.28))
    contexto.beginPath()
    contexto.arc(pivo.x, pivo.y, raio, Math.PI / 2 - Math.PI / 2, Math.PI / 2 + Math.PI / 2)
    contexto.stroke()
    for (let graus = -90; graus <= 90; graus += 15) {
      const a = Math.PI / 2 - (graus * Math.PI) / 180
      const interno = raio - (graus % 30 === 0 ? 7 : 4)
      contexto.beginPath()
      contexto.moveTo(pivo.x + interno * Math.cos(a), pivo.y + interno * Math.sin(a))
      contexto.lineTo(pivo.x + raio * Math.cos(a), pivo.y + raio * Math.sin(a))
      contexto.stroke()
    }
  }
  if (opcoes.arcoAmplitude && Math.abs(alpha) > 1e-6) {
    const raio = Math.min(88, transformacao.metrosParaPixels(L * 0.38))
    contexto.strokeStyle = paleta.trajetoria
    contexto.lineWidth = 2
    contexto.beginPath()
    contexto.arc(pivo.x, pivo.y, raio, Math.PI / 2 - alpha, Math.PI / 2, alpha < 0)
    contexto.stroke()
    contexto.fillText(`${Math.abs((alpha * 180) / Math.PI).toFixed(1)} deg`, pivo.x + 8, pivo.y + raio + 14)
  }
  if (opcoes.regua) {
    const x = pivo.x + (opcoes.deslocamentoReguaPx ?? -Math.min(100, transformacao.metrosParaPixels(L * 0.55)))
    const yFinal = transformacao.mundoParaTela({ x: 0, y: L }).y
    contexto.beginPath()
    contexto.moveTo(x, pivo.y)
    contexto.lineTo(x, yFinal)
    contexto.stroke()
    const passo = 0.1
    for (let metros = 0; metros <= L + 1e-9; metros += passo) {
      const y = transformacao.mundoParaTela({ x: 0, y: metros }).y
      const maior = Math.round(metros * 10) % 5 === 0
      contexto.beginPath()
      contexto.moveTo(x, y)
      contexto.lineTo(x + (maior ? 10 : 5), y)
      contexto.stroke()
      if (maior) contexto.fillText(`${metros.toFixed(1)} m`, x - 38, y + 3)
    }
  }
  contexto.restore()
}
