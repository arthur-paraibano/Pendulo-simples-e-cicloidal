import { describe, expect, it } from 'vitest'
import { aplicarAoStore, desserializar, serializar, VERSAO_FORMATO } from '../../src/state/url.js'
import { Store } from '../../src/state/store.js'
import { PARAMETROS } from '../../src/state/schema.js'

describe('serializar', () => {
  it('estado padrão gera só a versão', () => {
    expect(serializar(new Store())).toBe('v=1')
  })

  it('inclui apenas o que difere do padrão', () => {
    const s = new Store()
    s.definirParametro('alpha', 45)
    // Só o canônico viaja. α e h₀ são espelhos e são reconstruídos na leitura,
    // porque incluí-los tornaria o estado dependente da ordem de aplicação.
    expect(serializar(s)).toBe('v=1&theta0=45')
  })

  it('usa ponto decimal, independentemente do idioma', () => {
    const s = new Store()
    s.definirParametro('g', 1.62)
    expect(serializar(s)).toContain('g=1.62')
    expect(serializar(s)).not.toContain(',')
  })

  it('remove zeros supérfluos à direita', () => {
    const s = new Store()
    s.definirParametro('L', 2)
    expect(serializar(s)).toContain('L=2')
    expect(serializar(s)).not.toContain('L=2.000')
  })

  it('codifica booleanos como 1 e 0', () => {
    const s = new Store()
    s.definirParametro('rastro', false)
    expect(serializar(s)).toContain('rastro=0')
  })

  it('segue a ordem canônica do catálogo — o mesmo estado dá o mesmo texto', () => {
    const a = new Store()
    const b = new Store()
    a.definirParametro('N', 5)
    a.definirParametro('alpha', 45)
    b.definirParametro('alpha', 45)
    b.definirParametro('N', 5)
    expect(serializar(a)).toBe(serializar(b))
    // A ordem é a do catálogo (θ₀ é P03, N é P42), nunca a de digitação.
    expect(serializar(a)).toBe('v=1&theta0=45&N=5')
  })

  it('aceita chaves extras fora do catálogo', () => {
    const s = new Store()
    expect(serializar(s, { vis: 'ambos' })).toBe('v=1&vis=ambos')
  })

  it('nunca inclui parâmetros derivados', () => {
    const s = new Store()
    s.definirParametro('alpha', 45)
    expect(serializar(s)).not.toContain('t=')
    expect(serializar(s)).not.toContain('Q=')
  })
})

describe('desserializar', () => {
  it('caso 1: lê um único parâmetro', () => {
    const { valores } = desserializar('#v=1&alpha=10')
    expect(valores['alpha']).toBe(10)
  })

  it('caso 3: lê o exemplo canônico do quickstart', () => {
    const { valores } = desserializar('#v=1&alpha=10&L=1&g=9.81&N=2')
    expect(valores).toEqual({ alpha: 10, L: 1, g: 9.81, N: 2 })
  })

  it('caso 5: valor inválido vira aviso, sem derrubar o resto', () => {
    const { valores, avisos } = desserializar('#v=1&alpha=abc&L=2')
    expect(valores['alpha']).toBeUndefined()
    expect(valores['L']).toBe(2)
    expect(avisos.some((a) => a.chave === 'alpha')).toBe(true)
  })

  it('caso 6: chave desconhecida é ignorada com registro', () => {
    const { valores, avisos } = desserializar('#v=1&parametroInexistente=5&alpha=45')
    expect(valores['alpha']).toBe(45)
    expect(avisos.some((a) => a.chave === 'parametroInexistente')).toBe(true)
  })

  it('caso 7: versão futura avisa e segue adiante', () => {
    const { valores, avisos, versaoLida } = desserializar('#v=99&alpha=10')
    expect(versaoLida).toBe(99)
    expect(valores['alpha']).toBe(10)
    expect(avisos.some((a) => a.chave === 'v')).toBe(true)
  })

  it('caso 8: fragmento vazio devolve estado inteiramente padrão', () => {
    expect(desserializar('').valores).toEqual({})
    expect(desserializar('#').valores).toEqual({})
  })

  it('trecho sem valor é ignorado com aviso', () => {
    const { avisos } = desserializar('#v=1&lixo&alpha=10')
    expect(avisos.some((a) => a.chave === 'lixo')).toBe(true)
  })

  it('lê booleanos, múltipla escolha e compostos', () => {
    const { valores } = desserializar('#v=1&rastro=0&modelosExibidos=T0,exato&grade={"ligada":true,"espacamento":0.5}')
    expect(valores['rastro']).toBe(false)
    expect(valores['modelosExibidos']).toEqual(['T0', 'exato'])
    expect(valores['grade']).toEqual({ ligada: true, espacamento: 0.5 })
  })

  it('composto malformado vira aviso', () => {
    const { avisos } = desserializar('#v=1&grade={quebrado')
    expect(avisos.some((a) => a.chave === 'grade')).toBe(true)
  })

  it('sem chave de versão, assume a corrente', () => {
    expect(desserializar('#alpha=10').versaoLida).toBe(VERSAO_FORMATO)
  })

  it('percent-encoding truncado e compactação inválida viram avisos', () => {
    expect(() => desserializar('#v=1&alpha=%E0%A4%A')).not.toThrow()
    expect(desserializar('#v=1&alpha=%E0%A4%A').avisos).not.toHaveLength(0)
    expect(() => desserializar('#v=1&z=%%%')).not.toThrow()
  })

  it('restaura extras de relógio, execução e visualização pelo contrato', () => {
    const s = new Store()
    aplicarAoStore(s, '#v=1&t=12.5&run=1&vis=ambos')
    expect(s.numero('t')).toBe(12.5)
    expect(s.texto('execucao')).toBe('rodando')
    expect(s.texto('modo')).toBe('comparacao')
  })

  it('aplica o limite cicloidal ao extra vis sem limitação silenciosa', () => {
    const s = new Store()
    const avisos = aplicarAoStore(s, '#v=1&alpha=120&theta0=-120&vis=cicloidal')
    expect(s.numero('alpha')).toBe(90)
    expect(s.numero('theta0')).toBe(-90)
    expect(avisos.filter((a) => a.mensagem.includes('90'))).toHaveLength(2)
  })
})

describe('aplicarAoStore', () => {
  it('caso 4: limita ao aplicar e devolve o aviso', () => {
    const s = new Store()
    const avisos = aplicarAoStore(s, '#v=1&modo=cicloidal&alpha=120')
    expect(s.numero('alpha')).toBe(90)
    expect(avisos.some((a) => a.mensagem.includes('90'))).toBe(true)
  })

  it('marca a origem dos valores como url', () => {
    const s = new Store()
    aplicarAoStore(s, '#v=1&alpha=45')
    expect(s.origem('alpha')).toBe('url')
  })

  it('endereço malformado nunca trava a aplicação', () => {
    const s = new Store()
    expect(() => aplicarAoStore(s, '#$%&*(!@#=====')).not.toThrow()
    expect(s.numero('alpha')).toBe(10)
  })
})

describe('ida e volta (o portão da Fase 3)', () => {
  it('caso 10: reserializar normaliza a forma', () => {
    const s = new Store()
    aplicarAoStore(s, '#v=1&alpha=10.0000')
    expect(serializar(s)).toBe('v=1')
  })

  it('caso 2 e 9: preserva TODOS os 112 parâmetros em valor não padrão', () => {
    const original = new Store()

    // Escolhe, para cada parâmetro editável, um valor diferente do padrão.
    original.emLote(() => {
      for (const p of PARAMETROS) {
        if (p.derivado) continue
        if (p.tipo === 'numero' || p.tipo === 'inteiro') {
          const meio = ((p.min ?? 0) + (p.max ?? 1)) / 2
          const alvo = p.tipo === 'inteiro' ? Math.round(meio) : Number(meio.toFixed(p.precisao ?? 6))
          if (alvo !== p.padrao) original.definirParametro(p.id, alvo)
        } else if (p.tipo === 'booleano') {
          original.definirParametro(p.id, !(p.padrao as boolean))
        } else if (p.tipo === 'enum') {
          const outra = p.opcoes!.find((o) => o.valor !== p.padrao)
          if (outra) original.definirParametro(p.id, outra.valor)
        }
      }
    })

    const endereco = serializar(original)
    const restaurado = new Store()
    aplicarAoStore(restaurado, endereco)

    // Todo parâmetro precisa voltar idêntico.
    for (const p of PARAMETROS) {
      expect(restaurado.bruto(p.id), `${p.codigo} ${p.id}`).toEqual(original.bruto(p.id))
    }

    // E o endereço gerado de novo precisa ser idêntico, caractere a caractere.
    expect(serializar(restaurado)).toBe(endereco)
  })

  it('caso 12: aceita os valores extremos', () => {
    const s = new Store()
    aplicarAoStore(s, '#v=1&alpha=179.9&N=50')
    expect(s.numero('alpha')).toBe(179.9)
    expect(s.numero('N')).toBe(50)
    expect(serializar(s)).toContain('theta0=179.9')
  })

  it('caso 11: estado muito grande é comprimido e volta idêntico', () => {
    const s = new Store()
    // Um texto longo em um parâmetro de texto força o caminho de compressão.
    s.definirParametro('presetsUsuario', 'x'.repeat(2500))
    const endereco = serializar(s)
    expect(endereco).toContain('z=')

    const restaurado = new Store()
    aplicarAoStore(restaurado, endereco)
    expect(restaurado.texto('presetsUsuario')).toBe('x'.repeat(2500))
  })
})

describe('URL: estado indexado (RF-156)', () => {
  const comTres = (): Store => {
    const s = new Store()
    s.definirParametro('numeroPendulos', 3)
    return s
  }

  it('um pêndulo único não muda o endereço', () => {
    const s = new Store()
    expect(serializar(s)).not.toContain('#')
  })

  it('acoplado, nenhuma sobreposição entra no endereço', () => {
    const s = comTres()
    s.definirParametro('L', 2)
    expect(serializar(s)).not.toContain('%23')
  })

  it('leva e traz alturas independentes', () => {
    const origem = comTres()
    origem.definirParametro('modo', 'cicloidal')
    for (const [i, h] of [[1, 0.05], [2, 0.2], [3, 0.45]] as const) {
      origem.definirIndexado('h0', i, h)
    }

    const destino = new Store()
    aplicarAoStore(destino, `#${serializar(origem)}`)
    expect(destino.acoplado('h0')).toBe(false)
    for (const [i, h] of [[1, 0.05], [2, 0.2], [3, 0.45]] as const) {
      expect(destino.numeroDoPendulo('h0', i)).toBeCloseTo(h, 6)
    }
  })

  it('reconstrói o trio de cada pêndulo a partir do que trouxe', () => {
    const origem = comTres()
    origem.definirIndexado('theta0', 2, -40)
    const destino = new Store()
    aplicarAoStore(destino, `#${serializar(origem)}`)
    expect(destino.numeroDoPendulo('theta0', 2)).toBeCloseTo(-40, 6)
    expect(destino.numeroDoPendulo('alpha', 2)).toBeCloseTo(40, 6)
    expect(destino.numeroDoPendulo('theta0', 1)).toBeCloseTo(10, 6)
  })

  it('ignora índice de parâmetro inexistente, avisando', () => {
    const { avisos, indexados } = desserializar('#v=1&naoexiste%232=3')
    expect(Object.keys(indexados)).toHaveLength(0)
    expect(avisos.map((a) => a.mensagem).join(' ')).toContain('desconhecido')
  })

  it('ignora sobreposição não numérica, avisando', () => {
    const { avisos, indexados } = desserializar('#v=1&L%232=abc')
    expect(Object.keys(indexados)).toHaveLength(0)
    expect(avisos.map((a) => a.mensagem).join(' ')).toContain('inválido')
  })
})
