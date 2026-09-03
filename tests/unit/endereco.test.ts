import { describe, expect, it, vi } from 'vitest'
import {
  extrasDoStore,
  fragmentoDoStore,
  sincronizarEndereco,
} from '../../src/state/endereco.js'
import { aplicarAoStore } from '../../src/state/url.js'
import { Store } from '../../src/state/store.js'

function janelaFalsa(href = 'https://exemplo/app/') {
  const estado = { href, hash: '' }
  return {
    location: estado,
    history: {
      replaceState: (_d: unknown, _t: string, url: string) => {
        estado.href = url
        estado.hash = url.includes('#') ? `#${url.split('#')[1]}` : ''
      },
    },
  }
}

describe('endereço compartilhável', () => {
  it('descreve a visualização como o formato espera', () => {
    const s = new Store()
    expect(extrasDoStore(s)).toEqual({ vis: 'simples' })
    s.definirParametro('modo', 'comparacao')
    expect(extrasDoStore(s)).toEqual({ vis: 'ambos' })
  })

  it('reserializar dá o mesmo texto, caractere a caractere (Cenário 10.6)', () => {
    const s = new Store()
    s.definirParametro('alpha', 45)
    s.definirParametro('N', 3)
    const primeiro = fragmentoDoStore(s)
    expect(fragmentoDoStore(s)).toBe(primeiro)

    // E a ordem não depende de como se chegou ao estado.
    const outro = new Store()
    outro.definirParametro('N', 3)
    outro.definirParametro('alpha', 45)
    expect(fragmentoDoStore(outro)).toBe(primeiro)
  })

  it('abrir o endereço restaura o mesmo estado (Cenário 10.5)', () => {
    const origem = new Store()
    origem.definirParametro('alpha', 45)
    origem.definirParametro('L', 1.5)
    origem.definirParametro('modo', 'comparacao')

    const destino = new Store()
    aplicarAoStore(destino, fragmentoDoStore(origem))
    expect(destino.numero('alpha')).toBeCloseTo(45, 9)
    expect(destino.numero('L')).toBeCloseTo(1.5, 9)
    expect(destino.texto('modo')).toBe('comparacao')
    expect(fragmentoDoStore(destino)).toBe(fragmentoDoStore(origem))
  })

  it('publica pelo histórico, sem empilhar uma entrada por ajuste', () => {
    const janela = janelaFalsa()
    const replaceState = vi.spyOn(janela.history, 'replaceState')
    const acoes: (() => void)[] = []
    const sinc = sincronizarEndereco(new Store(), {
      janela,
      agendar: (acao) => {
        acoes.push(acao)
        return () => undefined
      },
    })
    sinc.publicarAgora()
    expect(replaceState).toHaveBeenCalledTimes(1)
    expect(janela.location.hash).toContain('v=1')
    sinc.destruir()
  })

  it('não reescreve quando o endereço já está em dia', () => {
    const janela = janelaFalsa()
    const s = new Store()
    const sinc = sincronizarEndereco(s, { janela, agendar: () => () => undefined })
    sinc.publicarAgora()
    const replaceState = vi.spyOn(janela.history, 'replaceState')
    sinc.publicarAgora()
    expect(replaceState).not.toHaveBeenCalled()
    sinc.destruir()
  })

  it('agenda uma escrita só por rajada de alterações', () => {
    const janela = janelaFalsa()
    const s = new Store()
    let pendentes = 0
    const sinc = sincronizarEndereco(s, {
      janela,
      agendar: (acao) => {
        pendentes += 1
        return () => {
          pendentes -= 1
          void acao
        }
      },
    })
    s.definirParametro('alpha', 20)
    s.definirParametro('alpha', 30)
    s.definirParametro('alpha', 40)
    expect(pendentes).toBe(1)
    sinc.destruir()
  })

  it('o endereço absoluto serve para copiar e para carimbar no CSV', () => {
    const janela = janelaFalsa('https://exemplo/app/?a=1')
    const s = new Store()
    s.definirParametro('alpha', 45)
    const sinc = sincronizarEndereco(s, { janela, agendar: () => () => undefined })
    const endereco = sinc.enderecoAbsoluto()
    expect(endereco.startsWith('https://exemplo/app/?a=1#')).toBe(true)
    // θ₀ é o canônico da largada (Área M); α é espelho e se reconstrói dele,
    // e incluí-lo tornaria o endereço dependente da ordem de aplicação.
    expect(endereco).toContain('theta0=45')
    expect(endereco).not.toContain('alpha=')
    sinc.destruir()
  })

  it('depois de destruído, deixa de publicar', () => {
    const janela = janelaFalsa()
    const s = new Store()
    const sinc = sincronizarEndereco(s, { janela, agendar: () => () => undefined })
    sinc.destruir()
    const replaceState = vi.spyOn(janela.history, 'replaceState')
    sinc.publicarAgora()
    expect(replaceState).not.toHaveBeenCalled()
  })

  it('o relógio não entra no endereço, porque nasceria velho', () => {
    const s = new Store()
    s.atualizarTempoSimulacao(3.5)
    expect(fragmentoDoStore(s)).not.toContain('t=')
  })
})

describe('agendamento padrão e ausência de janela', () => {
  it('adia a escrita e a executa uma vez por rajada', () => {
    vi.useFakeTimers()
    try {
      const janela = janelaFalsa()
      const s = new Store()
      const sinc = sincronizarEndereco(s, { janela })
      const replaceState = vi.spyOn(janela.history, 'replaceState')

      s.definirParametro('alpha', 20)
      s.definirParametro('alpha', 30)
      expect(replaceState).not.toHaveBeenCalled()

      vi.advanceTimersByTime(300)
      expect(replaceState).toHaveBeenCalledTimes(1)
      expect(janela.location.hash).toContain('theta0=30')
      sinc.destruir()
    } finally {
      vi.useRealTimers()
    }
  })

  it('destruir cancela a escrita já agendada', () => {
    vi.useFakeTimers()
    try {
      const janela = janelaFalsa()
      const s = new Store()
      const sinc = sincronizarEndereco(s, { janela })
      const replaceState = vi.spyOn(janela.history, 'replaceState')
      s.definirParametro('alpha', 20)
      sinc.destruir()
      vi.advanceTimersByTime(300)
      expect(replaceState).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  it('sem janela, não quebra: devolve apenas o fragmento', () => {
    const s = new Store()
    // `janela` explicitamente ausente cobre o ambiente sem DOM, como o Node.
    const sinc = sincronizarEndereco(s, {
      janela: undefined as never,
      agendar: () => () => undefined,
    })
    expect(() => sinc.publicarAgora()).not.toThrow()
    expect(sinc.enderecoAbsoluto()).toBe(fragmentoDoStore(s))
    sinc.destruir()
  })
})
