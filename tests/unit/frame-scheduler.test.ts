import { describe, expect, it, vi } from 'vitest'
import { AgendadorQuadros, type PlataformaQuadros } from '../../src/app/frame-scheduler.js'

function plataformaManual() {
  let proximoId = 0
  const callbacks = new Map<number, FrameRequestCallback>()
  const plataforma: PlataformaQuadros = {
    solicitar: vi.fn((callback) => {
      const id = ++proximoId
      callbacks.set(id, callback)
      return id
    }),
    cancelar: vi.fn((id) => { callbacks.delete(id) }),
  }
  const executar = (agora = 16): void => {
    const entrada = callbacks.entries().next().value as [number, FrameRequestCallback] | undefined
    if (entrada === undefined) throw new Error('Nenhum quadro agendado.')
    callbacks.delete(entrada[0])
    entrada[1](agora)
  }
  return { plataforma, callbacks, executar }
}

describe('AgendadorQuadros', () => {
  it('coalesce repaints pausados num único RAF e para depois do quadro', () => {
    const manual = plataformaManual()
    const quadro = vi.fn()
    const agendador = new AgendadorQuadros(quadro, manual.plataforma)
    agendador.solicitarRender()
    agendador.solicitarRender()
    expect(manual.callbacks.size).toBe(1)
    manual.executar()
    expect(quadro).toHaveBeenCalledWith(16, true)
    expect(manual.callbacks.size).toBe(0)
  })

  it('mantém um único RAF animado, suspende e retoma com repaint', () => {
    const manual = plataformaManual()
    const quadro = vi.fn()
    const agendador = new AgendadorQuadros(quadro, manual.plataforma)
    agendador.definirAnimando(true)
    expect(manual.callbacks.size).toBe(1)
    manual.executar(20)
    expect(quadro).toHaveBeenCalledWith(20, false)
    expect(manual.callbacks.size).toBe(1)
    agendador.suspender()
    expect(manual.callbacks.size).toBe(0)
    agendador.solicitarRender()
    expect(manual.callbacks.size).toBe(0)
    agendador.retomar()
    expect(manual.callbacks.size).toBe(1)
    manual.executar(40)
    expect(quadro).toHaveBeenLastCalledWith(40, true)
    agendador.destruir()
    expect(manual.callbacks.size).toBe(0)
  })

  it('cancela o quadro pausado quando a animação é desligada sem repaint', () => {
    const manual = plataformaManual()
    const agendador = new AgendadorQuadros(vi.fn(), manual.plataforma)
    agendador.definirAnimando(true)
    agendador.definirAnimando(false)
    expect(manual.callbacks.size).toBe(0)
    expect(manual.plataforma.cancelar).toHaveBeenCalledOnce()
  })

  it('ignora novas ações após destruir e callbacks obsoletos durante suspensão', () => {
    const manual = plataformaManual()
    const quadro = vi.fn()
    const agendador = new AgendadorQuadros(quadro, manual.plataforma)
    agendador.solicitarRender()
    const callbackObsoleto = manual.callbacks.values().next().value as FrameRequestCallback
    agendador.suspender()
    callbackObsoleto(10)
    expect(quadro).not.toHaveBeenCalled()
    agendador.suspender()
    agendador.destruir()
    agendador.solicitarRender()
    agendador.definirAnimando(true)
    agendador.retomar()
    agendador.destruir()
    expect(manual.callbacks.size).toBe(0)
  })

  it('não reage quando o estado de animação pedido já está vigente', () => {
    const manual = plataformaManual()
    const agendador = new AgendadorQuadros(vi.fn(), manual.plataforma)
    agendador.definirAnimando(false)
    expect(manual.plataforma.solicitar).not.toHaveBeenCalled()
    agendador.definirAnimando(true)
    agendador.definirAnimando(true)
    expect(manual.plataforma.solicitar).toHaveBeenCalledOnce()
  })
})
