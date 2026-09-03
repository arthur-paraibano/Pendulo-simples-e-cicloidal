import { describe, expect, it } from 'vitest'
import {
  comRuido,
  Cronometro,
  FotoportaMovel,
  GeradorComSemente,
  leiturasDoSensor,
  resumo,
} from '../../src/state/instrumentos.js'
import { segundo } from '../../src/physics/units.js'

describe('Cronometro', () => {
  it('começa zerado e não conta antes de iniciar', () => {
    const c = new Cronometro()
    expect(c.estado).toBe('zerado')
    expect(c.contando).toBe(false)
    expect(c.decorrido(1000)).toBe(0)
  })

  it('conta o tempo entre iniciar e parar', () => {
    const c = new Cronometro()
    c.iniciar(1000)
    expect(c.decorrido(3500)).toBe(2500)
    c.parar(3500)
    expect(c.estado).toBe('parado')
    // Parado, o valor congela mesmo com o tempo passando.
    expect(c.decorrido(9999)).toBe(2500)
  })

  it('retomar acumula em vez de reiniciar', () => {
    const c = new Cronometro()
    c.iniciar(0)
    c.parar(1000)
    c.iniciar(5000)
    expect(c.decorrido(6000)).toBe(2000)
  })

  it('iniciar duas vezes não reinicia a contagem', () => {
    const c = new Cronometro()
    c.iniciar(1000)
    c.iniciar(2000)
    expect(c.decorrido(3000)).toBe(2000)
  })

  it('parar sem estar contando não muda nada', () => {
    const c = new Cronometro()
    c.parar(1000)
    expect(c.estado).toBe('zerado')
    expect(c.decorrido(2000)).toBe(0)
  })

  it('zerar volta ao início e limpa as marcas', () => {
    const c = new Cronometro()
    c.iniciar(0)
    c.marcarVolta(500)
    c.parar(1000)
    c.zerar()
    expect(c.estado).toBe('zerado')
    expect(c.decorrido(5000)).toBe(0)
    expect(c.marcas).toHaveLength(0)
  })

  it('marca voltas sem interromper a contagem', () => {
    const c = new Cronometro()
    c.iniciar(0)
    expect(c.marcarVolta(1000)).toBe(1000)
    expect(c.marcarVolta(2500)).toBe(2500)
    expect(c.contando).toBe(true)
    expect(c.marcas).toEqual([1000, 2500])
  })

  it('divide por n para reduzir o erro de reação (RF-093)', () => {
    // Dez períodos de 2,0099 s cronometrados de uma vez.
    const c = new Cronometro()
    c.iniciar(0)
    c.parar(20.099)
    expect(c.periodoMedio(10, 20.099)).toBeCloseTo(2.0099, 9)
  })

  it('recusa contagem de períodos inválida', () => {
    const c = new Cronometro()
    c.iniciar(0)
    c.parar(10)
    expect(c.periodoMedio(0, 10)).toBeNull()
    expect(c.periodoMedio(-1, 10)).toBeNull()
    expect(c.periodoMedio(2.5, 10)).toBeNull()
  })

  it('devolve nulo enquanto nada foi cronometrado', () => {
    expect(new Cronometro().periodoMedio(10, 0)).toBeNull()
  })
})

describe('FotoportaMovel', () => {
  it('é um instrumento distinto do sensor fixo, e pode sair do ponto zero', () => {
    const f = new FotoportaMovel(30)
    expect(f.posicaoGraus).toBe(30)
  })

  it('não registra passagem quando a massa não cruza a posição', () => {
    const f = new FotoportaMovel(0)
    expect(f.processar(0.5, 0.4, 0, 1)).toBeNull()
    expect(f.passagens).toHaveLength(0)
  })

  it('interpola o instante do cruzamento', () => {
    const f = new FotoportaMovel(0)
    const leitura = f.processar(1, -1, 0, 1)
    expect(leitura).not.toBeNull()
    expect(leitura!.t).toBeCloseTo(0.5, 12)
    expect(leitura!.sentido).toBe(-1)
  })

  it('respeita a posição angular ao decidir o cruzamento', () => {
    const emTrinta = (30 * Math.PI) / 180
    const f = new FotoportaMovel(30)
    // Passa por 20° a 40°: cruza os 30°.
    const leitura = f.processar((20 * Math.PI) / 180, (40 * Math.PI) / 180, 0, 1)
    expect(leitura).not.toBeNull()
    expect(leitura!.sentido).toBe(1)
    // Já entre 0° e 20° não há cruzamento.
    const g = new FotoportaMovel(30)
    expect(g.processar(0, emTrinta * 0.5, 0, 1)).toBeNull()
  })

  it('mede meio período entre passagens consecutivas', () => {
    const f = new FotoportaMovel(0)
    f.processar(1, -1, 0, 1) // t = 0,5
    f.processar(-1, 1, 1, 2) // t = 1,5
    expect(f.periodo('meioPeriodo')).toBeCloseTo(1, 12)
  })

  it('mede período completo entre passagens de mesmo sentido', () => {
    const f = new FotoportaMovel(0)
    f.processar(1, -1, 0, 1) // t = 0,5, sentido −1
    f.processar(-1, 1, 1, 2) // t = 1,5, sentido +1
    f.processar(1, -1, 2, 3) // t = 2,5, sentido −1
    expect(f.periodo('periodoCompleto')).toBeCloseTo(2, 12)
  })

  it('devolve nulo sem passagens suficientes', () => {
    const f = new FotoportaMovel(0)
    expect(f.periodo('meioPeriodo')).toBeNull()
    expect(f.periodo('periodoCompleto')).toBeNull()
    f.processar(1, -1, 0, 1)
    expect(f.periodo('meioPeriodo')).toBeNull()
    expect(f.periodo('periodoCompleto')).toBeNull()
  })

  it('zerar esquece as leituras', () => {
    const f = new FotoportaMovel(0)
    f.processar(1, -1, 0, 1)
    f.zerar()
    expect(f.passagens).toHaveLength(0)
  })
})

describe('GeradorComSemente', () => {
  it('mesma semente produz a mesma sequência', () => {
    const a = new GeradorComSemente(42)
    const b = new GeradorComSemente(42)
    const sequencia = (g: GeradorComSemente) => Array.from({ length: 5 }, () => g.proximo())
    expect(sequencia(a)).toEqual(sequencia(b))
  })

  it('sementes diferentes divergem', () => {
    const a = new GeradorComSemente(1)
    const b = new GeradorComSemente(2)
    expect(a.proximo()).not.toBe(b.proximo())
  })

  it('produz valores em [0, 1)', () => {
    const g = new GeradorComSemente(7)
    for (let i = 0; i < 500; i++) {
      const v = g.proximo()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('sobrevive à semente zero, que seria ponto fixo', () => {
    const g = new GeradorComSemente(0)
    const primeiro = g.proximo()
    expect(Number.isFinite(primeiro)).toBe(true)
    expect(g.proximo()).not.toBe(primeiro)
  })

  it('a normal tem média perto de zero e desvio perto de um', () => {
    const g = new GeradorComSemente(123)
    const amostra = Array.from({ length: 4000 }, () => g.normal())
    const { media, desvio } = resumo(amostra)
    expect(media!).toBeCloseTo(0, 1)
    expect(desvio!).toBeCloseTo(1, 1)
  })

  it('reiniciar volta ao começo da sequência', () => {
    const g = new GeradorComSemente(9)
    const primeiro = g.proximo()
    g.proximo()
    g.reiniciar(9)
    expect(g.proximo()).toBe(primeiro)
  })
})

describe('comRuido', () => {
  it('sem desvio devolve o período intacto', () => {
    expect(comRuido(2.0099, 0, new GeradorComSemente(1))).toBe(2.0099)
  })

  it('perturba dentro da ordem de grandeza pedida', () => {
    const g = new GeradorComSemente(5)
    const amostra = Array.from({ length: 3000 }, () => comRuido(2.0099, 10, g))
    const { media, desvio } = resumo(amostra)
    expect(media!).toBeCloseTo(2.0099, 2)
    // 10 ms de desvio pedido, em segundos.
    expect(desvio!).toBeCloseTo(0.01, 2)
  })

  it('é reprodutível com a mesma semente', () => {
    const a = comRuido(2, 5, new GeradorComSemente(77))
    const b = comRuido(2, 5, new GeradorComSemente(77))
    expect(a).toBe(b)
  })

  it('nunca devolve período negativo', () => {
    const g = new GeradorComSemente(3)
    for (let i = 0; i < 200; i++) expect(comRuido(0.001, 5000, g)).toBeGreaterThanOrEqual(0)
  })
})

describe('resumo', () => {
  it('devolve nulos para amostra vazia', () => {
    expect(resumo([])).toEqual({ media: null, desvio: null })
  })

  it('com um valor não afirma dispersão', () => {
    expect(resumo([2])).toEqual({ media: 2, desvio: null })
  })

  it('usa desvio amostral', () => {
    const { media, desvio } = resumo([2, 4, 4, 4, 5, 5, 7, 9])
    expect(media).toBe(5)
    expect(desvio).toBeCloseTo(Math.sqrt(32 / 7), 10)
  })
})

describe('leiturasDoSensor', () => {
  it('traduz eventos do sensor fixo para leituras comparáveis', () => {
    const leituras = leiturasDoSensor([
      { t: segundo(0.5), sentido: -1, qPonto: -2, numeroTravessia: 0 },
      { t: segundo(1.5), sentido: 1, qPonto: 2, numeroTravessia: 1 },
    ])
    expect(leituras).toEqual([
      { t: 0.5, sentido: -1 },
      { t: 1.5, sentido: 1 },
    ])
  })
})
