import { describe, expect, it, vi } from 'vitest'
import { ErroDeParametro, Store } from '../../src/state/store.js'
import { PARAMETROS } from '../../src/state/schema.js'

describe('Store: leitura', () => {
  it('começa com todos os padrões do catálogo', () => {
    const s = new Store()
    expect(s.numero('alpha')).toBe(10)
    expect(s.numero('L')).toBe(1)
    expect(s.numero('g')).toBe(9.81)
    expect(s.numero('N')).toBe(2)
    expect(s.texto('modo')).toBe('simples')
  })

  it('aceita valores iniciais no construtor', () => {
    const s = new Store({ alpha: 45, L: 2 })
    expect(s.numero('alpha')).toBe(45)
    expect(s.numero('L')).toBe(2)
  })

  it('rejeita leitura de parâmetro desconhecido', () => {
    const s = new Store()
    expect(() => s.bruto('inexistente')).toThrow(ErroDeParametro)
  })

  it('rejeita ler como número o que não é numérico', () => {
    const s = new Store()
    expect(() => s.numero('modo')).toThrow(ErroDeParametro)
  })

  it('naoPadrao devolve só o que foi alterado', () => {
    const s = new Store()
    expect(Object.keys(s.naoPadrao())).toHaveLength(0)
    s.definirParametro('alpha', 45)
    expect(s.naoPadrao()['alpha']).toBe(45)
  })
})

describe('Store: validação e limitação', () => {
  it('aplica valores dentro da faixa', () => {
    const s = new Store()
    const r = s.definirParametro('alpha', 45)
    expect(r.aplicado).toBe(true)
    expect(r.valor).toBe(45)
    expect(r.limitadoDe).toBeUndefined()
  })

  it('limita acima do máximo e explica, nomeando parâmetro, valor e limite', () => {
    const s = new Store()
    const r = s.definirParametro('alpha', 500)
    expect(r.valor).toBe(179.9)
    expect(r.limitadoDe).toBe(500)
    // RNF-023: a mensagem precisa conter os três elementos.
    expect(r.mensagem).toContain('α')
    expect(r.mensagem).toContain('500')
    expect(r.mensagem).toContain('179.9')
  })

  it('limita abaixo do mínimo', () => {
    const s = new Store()
    const r = s.definirParametro('L', 0.001)
    expect(r.valor).toBe(0.05)
    expect(r.limitadoDe).toBe(0.001)
  })

  it('registra a origem "limitado" quando houve ajuste', () => {
    const s = new Store()
    s.definirParametro('alpha', 500)
    expect(s.origem('alpha')).toBe('limitado')
    s.definirParametro('alpha', 30)
    expect(s.origem('alpha')).toBe('usuario')
  })

  it('recusa texto que não é número, sem alterar nada', () => {
    const s = new Store()
    const r = s.definirParametro('alpha', 'abc')
    expect(r.aplicado).toBe(false)
    expect(s.numero('alpha')).toBe(10)
    expect(r.mensagem).toContain('número')
  })

  it('preserva a precisão interna além das casas usadas na apresentação', () => {
    const s = new Store()
    s.definirParametro('alpha', 10.123456)
    expect(s.numero('alpha')).toBe(10.123456)
  })

  it('arredonda inteiros', () => {
    const s = new Store()
    s.definirParametro('N', 3.7)
    expect(s.numero('N')).toBe(4)
  })

  it('valida enum e lista os valores aceitos ao recusar', () => {
    const s = new Store()
    expect(s.definirParametro('modo', 'cicloidal').aplicado).toBe(true)
    const r = s.definirParametro('modo', 'inexistente')
    expect(r.aplicado).toBe(false)
    expect(r.mensagem).toContain('simples')
    expect(s.texto('modo')).toBe('cicloidal')
  })

  it('interpreta booleanos em várias formas', () => {
    const s = new Store()
    s.definirParametro('rastro', false)
    expect(s.booleano('rastro')).toBe(false)
    s.definirParametro('rastro', '1')
    expect(s.booleano('rastro')).toBe(true)
    s.definirParametro('rastro', 'true')
    expect(s.booleano('rastro')).toBe(true)
  })

  it('recusa escrever em parâmetro derivado', () => {
    const s = new Store()
    expect(() => s.definirParametro('t', 5)).toThrow(ErroDeParametro)
    expect(() => s.definirParametro('Q', 5)).toThrow(/calculado/)
  })

  it('recusa parâmetro desconhecido', () => {
    const s = new Store()
    expect(() => s.definirParametro('xyz', 1)).toThrow(ErroDeParametro)
  })
})

describe('Store: limites dinâmicos', () => {
  it('limita a amplitude a 90° no modo cicloidal', () => {
    const s = new Store()
    s.definirParametro('modo', 'cicloidal')
    const r = s.definirParametro('alpha', 120)
    expect(r.valor).toBe(90)
    expect(r.mensagem).toContain('90')
  })

  it('permite 120° no modo simples', () => {
    const s = new Store()
    expect(s.definirParametro('alpha', 120).valor).toBe(120)
  })

  it('ajusta a amplitude incompatível ao entrar no cicloidal', () => {
    const s = new Store()
    s.definirParametro('alpha', 150)
    s.definirParametro('modo', 'cicloidal')
    expect(s.numero('alpha')).toBe(90)
  })

  it('preserva os compatíveis e ajusta alpha/theta0 na comparação', () => {
    const s = new Store()
    s.definirParametro('alpha', 150)
    s.definirParametro('theta0', -140)
    s.definirParametro('modo', 'comparacao')
    expect(s.numero('alpha')).toBe(90)
    expect(s.numero('theta0')).toBe(-90)
    expect(s.definirParametro('alpha', 120).valor).toBe(90)
    expect(s.definirParametro('theta0', 120).valor).toBe(90)
  })

  it('limita o raio da esfera a L/4', () => {
    const s = new Store()
    s.definirParametro('L', 1)
    expect(s.definirParametro('raioEsfera', 0.5).valor).toBe(0.25)
  })
})

describe('Store: derivações', () => {
  it('mantém o vínculo L = 4r nos dois sentidos', () => {
    const s = new Store()
    s.definirParametro('L', 2)
    expect(s.numero('r')).toBeCloseTo(0.5, 6)
    s.definirParametro('r', 0.25)
    expect(s.numero('L')).toBeCloseTo(1, 6)
  })

  it('não aplica o vínculo quando destravado', () => {
    const s = new Store()
    s.definirParametro('vinculoLR', false)
    s.definirParametro('L', 2)
    expect(s.numero('r')).toBe(0.25)
  })

  it('o preset planetário escreve g', () => {
    const s = new Store()
    s.definirParametro('corpoCeleste', 'lua')
    expect(s.numero('g')).toBeCloseTo(1.62, 6)
    s.definirParametro('corpoCeleste', 'jupiter')
    expect(s.numero('g')).toBeCloseTo(24.79, 6)
  })

  it('editar g à mão passa o corpo celeste a personalizado', () => {
    const s = new Store()
    s.definirParametro('g', 5)
    expect(s.texto('corpoCeleste')).toBe('personalizado')
  })

  it('h e α são mutuamente determinados, com lado mestre no último editado', () => {
    const s = new Store()
    s.definirParametro('L', 1)
    // h = L·sen²θ/2: a 90° dá L/2.
    s.definirParametro('alpha', 90)
    expect(s.numero('h0')).toBeCloseTo(0.5, 3)
    s.definirParametro('alpha', 30)
    expect(s.numero('h0')).toBeCloseTo(0.125, 3)
    // Editando h, α acompanha.
    s.definirParametro('h0', 0.25)
    expect(s.numero('alpha')).toBeCloseTo(45, 0)
  })
})

describe('Store: atomicidade', () => {
  it('definirVarios aplica tudo de uma vez', () => {
    const s = new Store()
    s.definirVarios({ alpha: 10, L: 1, g: 9.81, N: 2 })
    expect(s.numero('alpha')).toBe(10)
    expect(s.numero('N')).toBe(2)
  })

  it('um identificador desconhecido impede QUALQUER escrita', () => {
    const s = new Store()
    expect(() => s.definirVarios({ alpha: 45, xyz: 1 })).toThrow(ErroDeParametro)
    expect(s.numero('alpha')).toBe(10)
  })
})

describe('Store: restauração', () => {
  it('restaura um parâmetro ao padrão', () => {
    const s = new Store()
    s.definirParametro('alpha', 45)
    s.restaurarParametro('alpha')
    expect(s.numero('alpha')).toBe(10)
    expect(s.origem('alpha')).toBe('padrao')
  })

  it('restaura tudo', () => {
    const s = new Store()
    s.definirParametro('alpha', 45)
    s.definirParametro('L', 3)
    s.definirParametro('modo', 'cicloidal')
    s.restaurarTudo()
    expect(Object.keys(s.naoPadrao())).toHaveLength(0)
  })
})

describe('Store: notificação', () => {
  it('avisa os assinantes das chaves alteradas', () => {
    const s = new Store()
    const ouvinte = vi.fn()
    s.assinar(['alpha'], ouvinte)
    s.definirParametro('alpha', 45)
    expect(ouvinte).toHaveBeenCalledTimes(1)
    expect([...(ouvinte.mock.calls[0]![0] as Set<string>)]).toContain('alpha')
  })

  it('não avisa quem não assinou a chave', () => {
    const s = new Store()
    const ouvinte = vi.fn()
    s.assinar(['L'], ouvinte)
    s.definirParametro('rastro', false)
    expect(ouvinte).not.toHaveBeenCalled()
  })

  it('assinar sem filtro recebe tudo', () => {
    const s = new Store()
    const ouvinte = vi.fn()
    s.assinar(null, ouvinte)
    s.definirParametro('alpha', 45)
    expect(ouvinte).toHaveBeenCalled()
  })

  it('agrupa várias escritas do mesmo lote em UMA notificação', () => {
    // É isso que sustenta o RNF-003 com 112 parâmetros.
    const s = new Store()
    const ouvinte = vi.fn()
    s.assinar(null, ouvinte)
    s.emLote(() => {
      s.definirParametro('alpha', 45)
      s.definirParametro('L', 2)
      s.definirParametro('N', 5)
    })
    expect(ouvinte).toHaveBeenCalledTimes(1)
  })

  it('distingue no lote as escritas explícitas das derivações automáticas', () => {
    const s = new Store({ alpha: 120, theta0: 110 })
    const ouvinte = vi.fn()
    s.assinar(null, ouvinte)
    s.definirParametro('modo', 'cicloidal')
    const contexto = ouvinte.mock.calls[0]![1]
    expect([...contexto.explicitas]).toEqual(['modo'])
    expect([...contexto.derivadas]).toEqual(expect.arrayContaining(['alpha', 'theta0', 'h0']))
  })

  it('cancela a assinatura', () => {
    const s = new Store()
    const ouvinte = vi.fn()
    const cancelar = s.assinar(null, ouvinte)
    cancelar()
    s.definirParametro('alpha', 45)
    expect(ouvinte).not.toHaveBeenCalled()
  })

  it('não notifica quando o valor não mudou de fato', () => {
    const s = new Store()
    const ouvinte = vi.fn()
    s.assinar(null, ouvinte)
    s.definirParametro('alpha', 10)
    expect(ouvinte).not.toHaveBeenCalled()
  })

  it('detecta assinante que escreve no próprio callback', () => {
    // Laço de realimentação: precisa falhar alto, não travar em silêncio.
    const s = new Store()
    s.assinar(null, () => {
      s.definirParametro('L', Math.min(9, s.numero('L') + 1))
    })
    expect(() => s.definirParametro('alpha', 45)).toThrow(/realimentação/)
  })
})

describe('Store: cobertura do catálogo inteiro', () => {
  it('todo parâmetro editável aceita ser escrito com o próprio padrão', () => {
    const s = new Store()
    for (const p of PARAMETROS) {
      if (p.derivado) continue
      expect(() => s.definirParametro(p.id, p.padrao), `${p.codigo} ${p.id}`).not.toThrow()
    }
  })

  it('todo numérico aceita os extremos da faixa', () => {
    const s = new Store()
    for (const p of PARAMETROS) {
      if (p.derivado) continue
      if (p.tipo !== 'numero' && p.tipo !== 'inteiro') continue
      // Limites dinâmicos podem estreitar a faixa; basta não lançar.
      expect(() => s.definirParametro(p.id, p.min!), `${p.codigo} min`).not.toThrow()
      expect(() => s.definirParametro(p.id, p.max!), `${p.codigo} max`).not.toThrow()
    }
  })
})
