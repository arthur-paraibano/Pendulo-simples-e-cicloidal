import { describe, expect, it } from 'vitest'
import {
  BOM,
  COLUNAS_OPCIONAIS,
  escapar,
  gerarCsv,
  nomeArquivoCsv,
  separadorDecimal,
  type MetadadosCsv,
} from '../../src/export/csv.js'
import { ColecaoMedicoes, type Medicao } from '../../src/state/measurements.js'
import { metro, rad, segundo } from '../../src/physics/units.js'

const META: MetadadosCsv = {
  versaoAplicativo: '1.0.0',
  exportadoEm: '2026-08-17T14:32:05-03:00',
  visualizacao: 'ambos',
  modeloPeriodo: 'série truncada em N = 2',
  formula: 'T = 2*pi*raiz(L/g) * (1 + (1/4)*sen^2(alpha/2) + (9/64)*sen^4(alpha/2))',
  grandezaSensor: 'período completo',
  parametrosNaoPadrao: 'L=1; g=9.81; alpha=45; N=2',
  estadoCompleto: 'https://exemplo/#v=1&alpha=45&vis=ambos',
}

function medicao(parcial: Partial<Medicao> = {}): Medicao {
  return {
    n: 1,
    idPendulo: 'simples#1',
    pendulo: 'simples',
    T: segundo(2.086256),
    grandeza: 'periodoCompleto',
    gInferido: 9.803478,
    gInferidoIngenuo: 9.070361,
    gConfigurado: 9.81,
    alphaGraus: 45,
    L: metro(1),
    Tteorico: segundo(2.085562),
    erroRelativo: 0.000332,
    N: 2,
    tColeta: segundo(4.17),
    origem: 'automatica',
    fonte: 'simulacao',
    ...parcial,
  }
}

const linhas = (csv: string): string[] => csv.slice(BOM.length).split('\r\n')
const corpo = (csv: string): string[] =>
  linhas(csv).filter((l) => l !== '' && !l.startsWith('#'))

describe('contrato de exportação CSV', () => {
  // ── 1 ──
  it('começa com BOM UTF-8', () => {
    const csv = gerarCsv([medicao()], META)
    expect(csv.startsWith(BOM)).toBe(true)
    expect(new TextEncoder().encode(csv).slice(0, 3)).toEqual(new Uint8Array([0xef, 0xbb, 0xbf]))
  })

  // ── 2 ──
  it('traz as colunas obrigatórias na ordem, com sufixo de unidade', () => {
    const cabecalho = corpo(gerarCsv([medicao()], META))[0]!
    expect(cabecalho.split(';')).toEqual([
      'n',
      'pendulo',
      'T_s',
      'g_inferido_m_s2',
      'alpha_graus',
      'L_m',
      'erro_relativo_pct',
    ])
  })

  // ── 3 ──
  it('mantém o separador decimal coerente com o de campo', () => {
    const comPontoEVirgula = corpo(gerarCsv([medicao()], META, { separador: ';' }))[1]!
    expect(comPontoEVirgula).toContain('2,086256')
    expect(comPontoEVirgula).not.toContain('2.086256')

    // Vírgula decimal com campos por vírgula seria ambíguo: a mesma linha
    // poderia ser lida com o dobro de colunas.
    const comVirgula = corpo(gerarCsv([medicao()], META, { separador: ',' }))[1]!
    expect(comVirgula).toContain('2.086256')
    expect(comVirgula.split(',')).toHaveLength(7)

    const comTabulacao = corpo(gerarCsv([medicao()], META, { separador: '\t' }))[1]!
    expect(comTabulacao).toContain('2.086256')

    expect(separadorDecimal(';')).toBe(',')
    expect(separadorDecimal(',')).toBe('.')
    expect(separadorDecimal('\t')).toBe('.')
  })

  // ── 4 ──
  it('abre no Excel pt-BR sem assistente: BOM, ponto e vírgula e CRLF', () => {
    const csv = gerarCsv([medicao()], META)
    expect(csv).toContain('\r\n')
    expect(csv.split('\r\n').some((l) => l.includes(';'))).toBe(true)
    // Nenhuma quebra de linha solta: LF sem CR antes quebraria a importação.
    expect(/[^\r]\n/.test(csv)).toBe(false)
  })

  // ── 5 ──
  it('ida e volta: reimportar reproduz as linhas na precisão exportada', () => {
    const original = [medicao({ n: 1 }), medicao({ n: 2, alphaGraus: 10, T: segundo(2.009893) })]
    const csv = gerarCsv(original, META)
    const dados = corpo(csv).slice(1)

    const relidas = dados.map((linha) => {
      const campos = linha.split(';')
      return {
        n: Number(campos[0]),
        pendulo: campos[1],
        T: Number(campos[2]!.replace(',', '.')),
        alphaGraus: Number(campos[4]!.replace(',', '.')),
      }
    })
    expect(relidas).toEqual([
      { n: 1, pendulo: 'simples', T: 2.086256, alphaGraus: 45 },
      { n: 2, pendulo: 'simples', T: 2.009893, alphaGraus: 10 },
    ])
  })

  // ── 6 ──
  it('tabela vazia gera metadados e cabeçalho, sem erro', () => {
    const csv = gerarCsv([], META)
    expect(corpo(csv)).toHaveLength(1)
    expect(linhas(csv).filter((l) => l.startsWith('#')).length).toBeGreaterThan(5)
  })

  // ── 7 ──
  it('exporta 10 000 linhas em menos de 2 s', () => {
    const muitas = Array.from({ length: 10_000 }, (_, i) => medicao({ n: i + 1 }))
    const inicio = performance.now()
    const csv = gerarCsv(muitas, META)
    expect(performance.now() - inicio).toBeLessThan(2000)
    expect(corpo(csv)).toHaveLength(10_001)
  })

  // ── 8 ──
  it('os valores de g conferem com a Tabela D da pesquisa', () => {
    const csv = gerarCsv([medicao()], META, { colunasOpcionais: ['gInferidoIngenuo'] })
    const linha = corpo(csv)[1]!
    expect(linha).toContain('9,803478')
    expect(linha).toContain('9,070361')
  })

  // ── 9 ──
  it('no cicloidal a inferência com correção coincide com a ingênua', () => {
    const csv = gerarCsv(
      [medicao({ pendulo: 'cicloidal', gInferido: 9.81, gInferidoIngenuo: 9.81 })],
      META,
      { colunasOpcionais: ['gInferidoIngenuo'] },
    )
    const campos = corpo(csv)[1]!.split(';')
    expect(campos[3]).toBe(campos.at(-1))
  })

  // ── 10 ──
  it('delimita por aspas o campo que contém o separador', () => {
    expect(escapar('a;b', ';')).toBe('"a;b"')
    expect(escapar('diz "oi"', ';')).toBe('"diz ""oi"""')
    expect(escapar('quebra\nlinha', ';')).toBe('"quebra\nlinha"')
    expect(escapar('simples', ';')).toBe('simples')
    // Com outro separador, o ponto e vírgula deixa de exigir aspas.
    expect(escapar('a;b', ',')).toBe('a;b')
  })
})

describe('metadados e rodapé', () => {
  it('o cabeçalho reproduz as condições e o endereço que as reabre', () => {
    const csv = gerarCsv([medicao()], META)
    expect(csv).toContain('# Versão do formato CSV: 1')
    expect(csv).toContain('# Sensor: fixo no ponto zero (theta = 0)')
    expect(csv).toContain(`# Estado completo: ${META.estadoCompleto}`)
    expect(csv).toContain('# Grandeza medida pelo sensor: período completo')
  })

  it('o rodapé estatístico aparece a partir de duas medições', () => {
    const colecao = new ColecaoMedicoes()
    const entrada = {
      idPendulo: 'simples#1',
      pendulo: 'simples' as const,
      grandeza: 'periodoCompleto' as const,
      L: metro(1),
      g: 9.81,
      N: 2,
      tColeta: segundo(1),
    }
    colecao.registrar({ ...entrada, T: segundo(2.0099), alpha: rad(0.1745), Tteorico: segundo(2.0099) })
    colecao.registrar({ ...entrada, T: segundo(2.0102), alpha: rad(0.1745), Tteorico: segundo(2.0099) })

    const csv = gerarCsv(colecao.todas, META, {
      estatisticas: { T: colecao.estatisticasDe('T'), g: colecao.estatisticasDe('gInferido') },
    })
    expect(csv).toContain('# Estatísticas (n = 2)')
    expect(csv).toMatch(/# T: média = 2,01/)
  })

  it('com uma medição só, não há rodapé a afirmar dispersão', () => {
    const colecao = new ColecaoMedicoes()
    colecao.registrar({
      idPendulo: 'simples#1',
      pendulo: 'simples',
      grandeza: 'periodoCompleto',
      L: metro(1),
      g: 9.81,
      N: 2,
      tColeta: segundo(1),
      T: segundo(2.0099),
      alpha: rad(0.1745),
      Tteorico: segundo(2.0099),
    })
    const csv = gerarCsv(colecao.todas, META, {
      estatisticas: { T: colecao.estatisticasDe('T'), g: colecao.estatisticasDe('gInferido') },
    })
    expect(csv).not.toContain('Estatísticas')
  })

  it('valor não finito vira campo vazio, nunca NaN', () => {
    const csv = gerarCsv([medicao({ gInferido: Number.NaN })], META)
    const campos = corpo(csv)[1]!.split(';')
    expect(campos[3]).toBe('')
  })
})

describe('colunas opcionais', () => {
  it('saem na ordem canônica, e não na ordem em que foram pedidas', () => {
    const csv = gerarCsv([medicao()], META, {
      colunasOpcionais: ['origem', 'grandeza', 'N'],
    })
    const cabecalho = corpo(csv)[0]!.split(';')
    expect(cabecalho.slice(7)).toEqual(['grandeza', 'N_termos', 'origem'])
  })

  it('a grandeza sai em forma legível por máquina', () => {
    const csv = gerarCsv([medicao({ grandeza: 'meioPeriodo' })], META, {
      colunasOpcionais: ['grandeza'],
    })
    expect(corpo(csv)[1]).toContain('meio_periodo')
  })

  it('toda chave opcional declarada é exportável', () => {
    const csv = gerarCsv([medicao()], META, {
      colunasOpcionais: COLUNAS_OPCIONAIS.map((c) => c.chave),
    })
    const cabecalho = corpo(csv)[0]!.split(';')
    for (const coluna of COLUNAS_OPCIONAIS) expect(cabecalho).toContain(coluna.cabecalho)
    // Nenhuma célula fica indefinida por falta de tradução.
    expect(corpo(csv)[1]!.split(';')).toHaveLength(cabecalho.length)
  })

  it('chave desconhecida é ignorada em vez de gerar coluna vazia', () => {
    const csv = gerarCsv([medicao()], META, { colunasOpcionais: ['naoExiste'] })
    expect(corpo(csv)[0]!.split(';')).toHaveLength(7)
  })
})

describe('nomeArquivoCsv', () => {
  it('segue o padrão datado do contrato', () => {
    expect(nomeArquivoCsv(new Date(2026, 7, 17, 14, 32))).toBe(
      'pendulo-medicoes-2026-08-17-1432.csv',
    )
  })

  it('preenche com zero à esquerda', () => {
    expect(nomeArquivoCsv(new Date(2026, 0, 5, 9, 7))).toBe('pendulo-medicoes-2026-01-05-0907.csv')
  })
})
