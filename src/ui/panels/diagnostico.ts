import type { TemposCamadas } from '../../render/types.js'

export interface PainelDiagnostico {
  readonly elemento: HTMLElement
  registrarQuadro(dt: number, tempos: TemposCamadas, subpassos?: number): void
  atualizar(agora?: number): void
  destruir(): void
}

export function criarPainelDiagnostico(recipiente: HTMLElement): PainelDiagnostico {
  const raiz = document.createElement('section')
  raiz.className = 'painel-diagnostico'
  raiz.id = 'diagnostico-desempenho'
  raiz.setAttribute('aria-label', 'Diagnóstico de Desempenho')

  raiz.innerHTML = `
    <details class="diagnostico-detalhes">
      <summary class="diagnostico-resumo">
        <strong>Diagnóstico de Desempenho</strong>
        <span class="diagnostico-fps" id="diag-fps-resumo">FPS --</span>
      </summary>
      <div class="diagnostico-conteudo">
        <div class="diag-metrica">
          <span class="diag-rotulo">Taxa de quadros:</span>
          <output id="diag-fps" class="diag-valor">-- FPS</output>
        </div>
        <div class="diag-metrica">
          <span class="diag-rotulo">Orçamento por quadro:</span>
          <output id="diag-orcamento" class="diag-valor">16,67 ms</output>
        </div>
        <div class="diag-metrica">
          <span class="diag-rotulo">Tempo total por quadro:</span>
          <output id="diag-total" class="diag-valor">-- ms</output>
        </div>
        <div class="diag-camadas">
          <div class="diag-item">Estática: <output id="diag-estatica">--</output> ms</div>
          <div class="diag-item">Rastro: <output id="diag-rastro">--</output> ms</div>
          <div class="diag-item">Dinâmica: <output id="diag-dinamica">--</output> ms</div>
        </div>
        <div class="diag-metrica">
          <span class="diag-rotulo">Sub-passos físicos/quadro:</span>
          <output id="diag-subpassos" class="diag-valor">--</output>
        </div>
      </div>
    </details>
  `

  recipiente.appendChild(raiz)

  const outFpsResumo = raiz.querySelector<HTMLSpanElement>('#diag-fps-resumo')!
  const outFps = raiz.querySelector<HTMLOutputElement>('#diag-fps')!
  const outTotal = raiz.querySelector<HTMLOutputElement>('#diag-total')!
  const outEstatica = raiz.querySelector<HTMLOutputElement>('#diag-estatica')!
  const outRastro = raiz.querySelector<HTMLOutputElement>('#diag-rastro')!
  const outDinamica = raiz.querySelector<HTMLOutputElement>('#diag-dinamica')!
  const outSubpassos = raiz.querySelector<HTMLOutputElement>('#diag-subpassos')!

  const bufferTamanho = 120
  const dtBuffer = new Float64Array(bufferTamanho)
  const estaticaBuffer = new Float64Array(bufferTamanho)
  const rastroBuffer = new Float64Array(bufferTamanho)
  const dinamicaBuffer = new Float64Array(bufferTamanho)
  const totalBuffer = new Float64Array(bufferTamanho)
  let subpassosUltimo = 0
  let idx = 0
  let preenchidos = 0
  let ultimoAtualizar = performance.now()

  const media = (buffer: Float64Array): number => {
    if (preenchidos === 0) return 0
    let soma = 0
    for (let i = 0; i < preenchidos; i++) soma += buffer[i]!
    return soma / preenchidos
  }

  const painel: PainelDiagnostico = {
    elemento: raiz,
    registrarQuadro(dt: number, tempos: TemposCamadas, subpassos = 1): void {
      dtBuffer[idx] = dt
      estaticaBuffer[idx] = tempos.estatica
      rastroBuffer[idx] = tempos.rastro
      dinamicaBuffer[idx] = tempos.dinamica
      totalBuffer[idx] = tempos.total
      subpassosUltimo = subpassos
      idx = (idx + 1) % bufferTamanho
      preenchidos = Math.min(preenchidos + 1, bufferTamanho)
    },
    atualizar(agora = performance.now()): void {
      if (agora - ultimoAtualizar < 1000) return
      ultimoAtualizar = agora

      if (preenchidos === 0) {
        outFpsResumo.textContent = 'FPS --'
        outFps.value = '-- FPS'
        outTotal.value = '-- ms'
        return
      }

      const mediaDt = media(dtBuffer)
      const fpsCalculado = mediaDt >= 1e-4 ? (1 / mediaDt).toFixed(1) : '--'
      const mediaTotal = media(totalBuffer).toFixed(2)
      const mediaEst = media(estaticaBuffer).toFixed(2)
      const mediaRas = media(rastroBuffer).toFixed(2)
      const mediaDin = media(dinamicaBuffer).toFixed(2)

      outFpsResumo.textContent = `FPS ${fpsCalculado}`
      outFps.value = `${fpsCalculado} FPS`
      outTotal.value = `${mediaTotal} ms`
      outEstatica.value = mediaEst
      outRastro.value = mediaRas
      outDinamica.value = mediaDin
      outSubpassos.value = String(subpassosUltimo)
    },
    destruir(): void {
      raiz.remove()
    },
  }

  return painel
}
