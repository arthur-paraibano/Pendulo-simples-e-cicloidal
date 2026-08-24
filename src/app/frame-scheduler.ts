export interface PlataformaQuadros {
  solicitar(callback: FrameRequestCallback): number
  cancelar(id: number): void
}

/**
 * Um único dono do RAF da cena. Coalesce repaints eventuais e mantém o loop
 * contínuo somente enquanto a simulação está rodando.
 */
export class AgendadorQuadros {
  private id: number | null = null
  private animando = false
  private repaintPendente = false
  private suspenso = false
  private destruido = false

  constructor(
    private readonly executarQuadro: (agora: number, repaintSolicitado: boolean) => void,
    private readonly plataforma: PlataformaQuadros,
  ) {}

  solicitarRender(): void {
    if (this.destruido) return
    this.repaintPendente = true
    this.agendar()
  }

  definirAnimando(animando: boolean): void {
    if (this.destruido || this.animando === animando) return
    this.animando = animando
    if (animando) this.agendar()
    else if (!this.repaintPendente) this.cancelarAtual()
  }

  suspender(): void {
    this.suspenso = true
    this.cancelarAtual()
  }

  retomar(): void {
    if (this.destruido) return
    this.suspenso = false
    this.solicitarRender()
  }

  destruir(): void {
    if (this.destruido) return
    this.destruido = true
    this.repaintPendente = false
    this.cancelarAtual()
  }

  private agendar(): void {
    if (this.destruido || this.suspenso || this.id !== null || (!this.animando && !this.repaintPendente)) return
    this.id = this.plataforma.solicitar(this.aoQuadro)
  }

  private readonly aoQuadro = (agora: number): void => {
    this.id = null
    if (this.destruido || this.suspenso) return
    const solicitado = this.repaintPendente
    this.repaintPendente = false
    this.executarQuadro(agora, solicitado)
    this.agendar()
  }

  private cancelarAtual(): void {
    if (this.id === null) return
    this.plataforma.cancelar(this.id)
    this.id = null
  }
}
