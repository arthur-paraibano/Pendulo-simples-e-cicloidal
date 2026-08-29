import { describe, expect, it, vi } from 'vitest'
import { RuntimeCena } from '../../src/app/runtime.js'
import { dinamicaIdeal, validarEstadoCicloidalInicial } from '../../src/physics/ode.js'
import { kg, metro, mPorS2 } from '../../src/physics/units.js'
import { Store } from '../../src/state/store.js'
import { executar } from '../../src/state/console.js'
import { aplicarAoStore, desserializar } from '../../src/state/url.js'
import type { EstadoPenduloCena } from '../../src/render/types.js'

function conectar(store: Store, runtime: RuntimeCena): () => void {
  return store.assinar(null, (chaves, contexto) => runtime.aplicarAlteracoes(chaves, contexto.explicitas))
}

describe('runtime da cena', () => {
  it('integra o relógio P93 sem notificar o Store a cada quadro', () => {
    const store = new Store({ fonteMovimento: 'integracao' })
    const runtime = new RuntimeCena(store)
    const notificouTempo = vi.fn()
    store.assinar(['t'], notificouTempo)
    runtime.aplicarComando('reproduzir')
    runtime.avancar(0.1)
    expect(store.numero('t')).toBeGreaterThan(0.09)
    expect(store.numero('t')).toBeCloseTo(0.1, 12)
    expect(notificouTempo).not.toHaveBeenCalled()
  })

  it('restaura t/run/vis da URL e inicia o relógio fechado nesse instante', () => {
    const store = new Store()
    aplicarAoStore(store, '#v=1&t=2.5&run=1&vis=ambos')
    const runtime = new RuntimeCena(store)
    const estados: EstadoPenduloCena[] = []
    expect(store.numero('t')).toBeCloseTo(2.5, 12)
    expect(runtime.controle.rodando).toBe(true)
    expect(runtime.estadosVisiveis(estados)).toHaveLength(2)
    expect(estados[0]!.tempo).toBe(2.5)
  })

  it('restaura t da URL também nos motores de integração sem o Store rebobinar', () => {
    const store = new Store()
    aplicarAoStore(store, '#v=1&fonteMovimento=integracao&t=2.5')
    const runtime = new RuntimeCena(store)
    const estados: EstadoPenduloCena[] = []
    expect(store.numero('t')).toBeCloseTo(2.5, 12)
    expect(runtime.tempoDoModo('simples')).toBeCloseTo(2.5, 12)
    expect(runtime.tempoDoModo('cicloidal')).toBeCloseTo(2.5, 12)
    expect(runtime.estadosVisiveis(estados)[0]!.tempo).toBeCloseTo(2.5, 12)
  })

  it('troca para comparação, ajusta o domínio e não rebobina o simples sobrevivente', () => {
    const store = new Store({ fonteMovimento: 'integracao' })
    const runtime = new RuntimeCena(store)
    const desconectar = conectar(store, runtime)
    store.definirParametro('theta0', 120)
    runtime.aplicarComando('reproduzir')
    runtime.avancar(0.2)
    const antes = runtime.tempoDoModo('simples')!
    store.definirParametro('modo', 'comparacao')
    expect(runtime.tempoDoModo('simples')).toBe(antes)
    expect(store.numero('theta0')).toBe(90)
    expect(runtime.temModo('cicloidal')).toBe(true)
    expect(runtime.erroVisivel).toBeNull()
    runtime.avancar(0.1)
    expect(runtime.tempoDoModo('simples')).toBeGreaterThan(antes)
    desconectar()
  })

  it('reinicia a integração para um lote intencional de modo e condições iniciais do console', async () => {
    const store = new Store({ fonteMovimento: 'integracao' })
    const runtime = new RuntimeCena(store)
    const desconectar = conectar(store, runtime)
    runtime.aplicarComando('reproduzir')
    runtime.avancar(0.2)
    expect(runtime.tempoDoModo('simples')).toBeGreaterThan(0)

    const resultado = executar(store, 'modo=cicloidal; theta0=35; alpha=30; h0=0,25')
    expect(resultado.sucesso).toBe(true)
    await Promise.resolve()

    const estados: EstadoPenduloCena[] = []
    expect(runtime.controle.estado).toBe('pausado')
    expect(runtime.tempo).toBe(0)
    // h₀ = 0,25 m com L = 1 m corresponde a 45°, e por ser o último do trio no
    // lote é ele que decide: α e θ₀ passam a 45°, coerentes entre si.
    expect(store.numero('alpha')).toBe(45)
    expect(store.numero('theta0')).toBe(45)
    expect(runtime.estadosVisiveis(estados)[0]?.theta).toBeCloseTo((45 * Math.PI) / 180, 12)
    expect(estados[0]?.alphaInicial).toBeCloseTo(Math.PI / 4, 12)
    desconectar()
  })

  it('isola falha cicloidal por impulso excessivo e mantém o simples', () => {
    const store = new Store({ theta0: 80, omega0: 10, modo: 'comparacao' })
    const runtime = new RuntimeCena(store)
    const estados: EstadoPenduloCena[] = []
    expect(runtime.temModo('simples')).toBe(true)
    expect(runtime.temModo('cicloidal')).toBe(false)
    expect(runtime.estadosVisiveis(estados).map((e) => e.modo)).toEqual(['simples'])
    expect(runtime.erroVisivel).toContain('omega0')
  })

  it('passo, zerar e parar mantêm as transições e o relógio coerentes', () => {
    const store = new Store({ fonteMovimento: 'integracao' })
    const runtime = new RuntimeCena(store)
    runtime.passo()
    expect(runtime.controle.estado).toBe('pausado')
    expect(store.numero('t')).toBeGreaterThan(0)
    runtime.aplicarComando('reproduzir')
    runtime.passo()
    expect(runtime.controle.estado).toBe('rodando')
    runtime.zerar()
    expect(store.numero('t')).toBe(0)
    runtime.aplicarComando('parar')
    expect(runtime.controle.estado).toBe('parado')
    runtime.destruir()
  })

  it('rejeita forçamento na fórmula cicloidal com mensagem acionável', () => {
    const store = new Store({ modo: 'cicloidal', amplitudeForcamento: 2 })
    const runtime = new RuntimeCena(store)
    const estados: EstadoPenduloCena[] = []
    expect(runtime.estadosVisiveis(estados)).toHaveLength(0)
    expect(runtime.erroVisivel).toContain('integração numérica')
  })

  it('cobre sincronização externa, alteração não estrutural e avanço pausado', () => {
    const store = new Store()
    const runtime = new RuntimeCena(store)
    expect(runtime.erroVisivel).toBeNull()
    runtime.avancar(1)
    expect(runtime.tempo).toBe(0)
    store.definirParametro('execucao', 'rodando')
    expect(runtime.aplicarAlteracoes(new Set(['execucao'])).reiniciou).toBe(false)
    expect(runtime.controle.rodando).toBe(true)
    expect(runtime.aplicarAlteracoes(new Set(['zoom'])).reiniciou).toBe(false)
    runtime.aplicarComando('pausar')
    runtime.passo()
    expect(store.numero('t')).toBeGreaterThan(0)
  })

  it('cobre projeções cicloidal/comparação válidas e estrutural enquanto parado', () => {
    const cicloidal = new Store({ modo: 'cicloidal' })
    const runtimeCicloidal = new RuntimeCena(cicloidal)
    expect(runtimeCicloidal.erroVisivel).toBeNull()
    expect(runtimeCicloidal.aplicarAlteracoes(new Set(['modo'])).reiniciou).toBe(false)
    const comparacao = new Store({ modo: 'comparacao' })
    const runtimeComparacao = new RuntimeCena(comparacao)
    expect(runtimeComparacao.erroVisivel).toBeNull()
    comparacao.definirParametro('L', 1.5)
    expect(runtimeComparacao.aplicarAlteracoes(new Set(['L'])).reiniciou).toBe(true)
    expect(runtimeComparacao.controle.estado).toBe('pausado')
  })

  it('detecta cruzamento de zero também na fonte por fórmula', () => {
    const store = new Store()
    const runtime = new RuntimeCena(store)
    const estados: EstadoPenduloCena[] = []
    runtime.estadosVisiveis(estados)
    runtime.aplicarComando('reproduzir')
    for (let i = 0; i < 4; i++) {
      runtime.avancar(0.25)
      runtime.estadosVisiveis(estados)
    }
    expect(estados[0]!.ultimoDisparoSensor).not.toBeNull()
  })

  it('publica cada passagem interpolada da fonte por fórmula para a coleta', () => {
    const store = new Store()
    const runtime = new RuntimeCena(store)
    const estados: EstadoPenduloCena[] = []
    const passagens: number[] = []
    const cancelar = runtime.assinarPassagens(({ modo, evento }) => {
      if (modo === 'simples') passagens.push(evento.t)
    })
    runtime.estadosVisiveis(estados)
    runtime.aplicarComando('reproduzir')
    for (let i = 0; i < 80; i++) {
      runtime.avancar(0.05)
      runtime.estadosVisiveis(estados)
    }
    cancelar()
    expect(passagens.length).toBeGreaterThanOrEqual(3)
    expect(passagens[2]! - passagens[0]!).toBeCloseTo(2.009893, 3)
  })

  it('detecta todas as travessias de períodos curtos sem depender do FPS ou da projeção', () => {
    const coletar = (particoes: readonly number[]): number[] => {
      const store = new Store({ L: 0.05, g: 30, alpha: 10, theta0: 10, escalaTempo: 4 })
      const runtime = new RuntimeCena(store)
      const passagens: number[] = []
      runtime.assinarPassagens(({ modo, evento }) => {
        if (modo === 'simples') passagens.push(evento.t)
      })
      runtime.aplicarComando('reproduzir')
      for (const dt of particoes) runtime.avancar(dt)
      return passagens
    }

    const quadroLento = coletar([0.0625]) // 0,25 s simulados em um único quadro
    const quadrosRapidos = coletar(Array.from({ length: 25 }, () => 0.0025))
    expect(quadroLento).toHaveLength(2)
    expect(quadrosRapidos).toHaveLength(quadroLento.length)
    for (let i = 0; i < quadroLento.length; i++) {
      expect(quadrosRapidos[i]).toBeCloseTo(quadroLento[i]!, 12)
    }
  })

  it('publica a amplitude do instante da passagem sob amortecimento', () => {
    const store = new Store({
      fonteMovimento: 'integracao', modeloAtrito: 'viscoso', b: 0.5,
      alpha: 45, theta0: 45,
    })
    const runtime = new RuntimeCena(store)
    const amplitudes: number[] = []
    runtime.assinarPassagens(({ modo, alpha }) => {
      if (modo === 'simples') amplitudes.push(alpha)
    })
    runtime.aplicarComando('reproduzir')
    for (let i = 0; i < 80; i++) runtime.avancar(0.05)
    expect(amplitudes.length).toBeGreaterThanOrEqual(3)
    expect(amplitudes.at(-1)).toBeLessThan(amplitudes[0]!)
    expect(amplitudes[0]).toBeLessThan(45 * Math.PI / 180)
  })

  it('expõe a amplitude corrente nos dois motores e null para modo indisponível', () => {
    const store = new Store({ modo: 'comparacao', alpha: 30, theta0: 30 })
    const runtime = new RuntimeCena(store)
    expect(runtime.amplitudeDoModo('simples')).toBeCloseTo(Math.PI / 6, 12)
    expect(runtime.amplitudeDoModo('cicloidal')).toBeCloseTo(Math.PI / 6, 12)

    const invalido = new RuntimeCena(new Store({
      modo: 'comparacao', theta0: 80, omega0: 10,
    }))
    expect(invalido.amplitudeDoModo('simples')).not.toBeNull()
    expect(invalido.amplitudeDoModo('cicloidal')).toBeNull()
  })

  it('coleta manual amortecida com a amplitude física instantânea', () => {
    const store = new Store({
      fonteMovimento: 'integracao', modeloAtrito: 'viscoso', b: 0.5,
      alpha: 45, theta0: 45,
    })
    const runtime = new RuntimeCena(store)
    runtime.aplicarComando('reproduzir')
    for (let i = 0; i < 40; i++) runtime.avancar(0.05)
    const alphaAtual = runtime.amplitudeDoModo('simples')!
    const medicao = store.coletarMedicaoManual('simples', runtime.tempo, alphaAtual)

    expect(medicao.alphaGraus).toBeCloseTo((alphaAtual * 180) / Math.PI, 10)
    expect(medicao.alphaGraus).toBeLessThan(45)
  })

  it('renderiza a fonte integrada, RK4 e registra passagem pelo sensor', () => {
    const store = new Store({ fonteMovimento: 'integracao', integrador: 'rk4', theta0: 20 })
    const runtime = new RuntimeCena(store)
    const estados: EstadoPenduloCena[] = []
    runtime.aplicarComando('reproduzir')
    for (let i = 0; i < 12; i++) runtime.avancar(0.2)
    runtime.estadosVisiveis(estados)
    expect(estados).toHaveLength(1)
    expect(estados[0]!.tempo).toBeGreaterThan(2)
    expect(estados[0]!.ultimoDisparoSensor).not.toBeNull()
  })

  it('publica as passagens integradas mesmo antes de projetar a cena', () => {
    const store = new Store({ fonteMovimento: 'integracao' })
    const runtime = new RuntimeCena(store)
    const passagens: number[] = []
    runtime.assinarPassagens(({ modo, evento }) => {
      if (modo === 'simples') passagens.push(evento.t)
    })
    runtime.aplicarComando('reproduzir')
    for (let i = 0; i < 12; i++) runtime.avancar(0.2)
    expect(passagens.length).toBeGreaterThanOrEqual(2)
  })

  it('pausa e reinicia uma mudança estrutural em curso', async () => {
    const store = new Store()
    const runtime = new RuntimeCena(store)
    runtime.aplicarComando('reproduzir')
    store.definirParametro('L', 2)
    expect(runtime.aplicarAlteracoes(new Set(['L'])).reiniciou).toBe(true)
    await Promise.resolve()
    expect(runtime.controle.estado).toBe('pausado')
    expect(store.numero('t')).toBe(0)
  })

  it('remove apenas o cicloidal se a fórmula ultrapassar o domínio durante o movimento', () => {
    const store = new Store({ modo: 'comparacao', theta0: 80, omega0: 10, modeloAtrito: 'viscoso', b: 0.1 })
    const runtime = new RuntimeCena(store)
    const estados: EstadoPenduloCena[] = []
    runtime.aplicarComando('reproduzir')
    runtime.avancar(0.1)
    runtime.estadosVisiveis(estados)
    expect(runtime.temModo('simples')).toBe(true)
    expect(runtime.temModo('cicloidal')).toBe(false)
    expect(runtime.erroVisivel).toContain('|q|')
  })

  it('expõe erro do modo simples inválido sem derrubar o runtime', () => {
    const store = new Store({ modeloAtrito: 'pivo', modo: 'simples' })
    const runtime = new RuntimeCena(store)
    expect(runtime.temModo('simples')).toBe(false)
    expect(runtime.tempoDoModo('simples')).toBeNull()
    expect(runtime.erroVisivel).toContain('torque')
  })
})

describe('domínio físico e URL adversária', () => {
  it('valida energia inicial cicloidal, sem clamp silencioso', () => {
    const p = dinamicaIdeal(metro(1), mPorS2(9.81), kg(1), 'cicloidal')
    expect(() => validarEstadoCicloidalInicial(Math.PI / 3, 0, p)).not.toThrow()
    expect(() => validarEstadoCicloidalInicial(Math.PI / 3, 10, p)).toThrow(/omega0/)
  })

  it.each(['#v=1&%E0%A4%A=1', '#v=1&z=!!!', '#v=1&alpha=%'])('URL malformada nunca lança: %s', (url) => {
    expect(() => desserializar(url)).not.toThrow()
    expect(desserializar(url).avisos.length).toBeGreaterThan(0)
  })
})
