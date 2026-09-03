/**
 * Exportação CSV da tabela de medições (RF-109, RF-148).
 *
 * O arquivo é a ponte entre o simulador e a planilha do laboratório, e precisa
 * ser **autoexplicativo**: quem o abrir três meses depois deve conseguir
 * reconstruir as condições da medição sem recorrer à aplicação. Daí o cabeçalho
 * de metadados e, dentro dele, o endereço que reabre exatamente este estado.
 *
 * O módulo é puro — recebe dados, devolve texto. Quem baixa o arquivo é a
 * camada de interface; assim o formato pode ser provado por teste em vez de
 * conferido abrindo o Excel.
 */

import type { Medicao, ResumoEstatistico } from '../state/measurements.js'

/** BOM UTF-8. Sem ele o Excel em português corrompe `α`, `²` e os acentos. */
export const BOM = '﻿'

export const VERSAO_FORMATO_CSV = 1

export type SeparadorCampo = ';' | ',' | '\t'

export interface ColunaOpcional {
  readonly chave: string
  readonly cabecalho: string
}

/** Colunas opcionais disponíveis, na ordem em que são anexadas. */
export const COLUNAS_OPCIONAIS: readonly ColunaOpcional[] = [
  { chave: 'grandeza', cabecalho: 'grandeza' },
  { chave: 'gInferidoIngenuo', cabecalho: 'g_ingenuo_m_s2' },
  { chave: 'gConfigurado', cabecalho: 'g_configurado_m_s2' },
  { chave: 'Tteorico', cabecalho: 'T_teorico_s' },
  { chave: 'N', cabecalho: 'N_termos' },
  { chave: 'tColeta', cabecalho: 't_coleta_s' },
  { chave: 'origem', cabecalho: 'origem' },
  { chave: 'idPendulo', cabecalho: 'pendulo_id' },
]

export interface MetadadosCsv {
  readonly versaoAplicativo: string
  /** Instante da exportação em ISO 8601. Entra por parâmetro: o módulo é puro. */
  readonly exportadoEm: string
  readonly visualizacao: string
  readonly modeloPeriodo: string
  readonly formula: string
  readonly grandezaSensor: string
  readonly parametrosNaoPadrao: string
  /** Endereço que reabre este estado — o elo entre o CSV e o Princípio V. */
  readonly estadoCompleto: string
}

export interface OpcoesCsv {
  readonly separador?: SeparadorCampo
  /** Chaves de `COLUNAS_OPCIONAIS` a incluir, na ordem canônica. */
  readonly colunasOpcionais?: readonly string[]
  readonly estatisticas?: {
    readonly T: ResumoEstatistico
    readonly g: ResumoEstatistico
  }
}

const CABECALHOS_OBRIGATORIOS = [
  'n',
  'pendulo',
  'T_s',
  'g_inferido_m_s2',
  'alpha_graus',
  'L_m',
  'erro_relativo_pct',
] as const

/** Casas decimais por coluna, conforme a seção 3 do contrato. */
const CASAS: Readonly<Record<string, number>> = {
  T_s: 6,
  g_inferido_m_s2: 6,
  alpha_graus: 2,
  L_m: 4,
  erro_relativo_pct: 4,
  g_ingenuo_m_s2: 6,
  g_configurado_m_s2: 6,
  T_teorico_s: 6,
  t_coleta_s: 4,
}

/**
 * Separador decimal coerente com o separador de campo.
 *
 * Vírgula decimal com campos separados por vírgula seria ambíguo — a mesma
 * linha poderia ser lida com o dobro de colunas.
 */
export function separadorDecimal(campo: SeparadorCampo): ',' | '.' {
  return campo === ';' ? ',' : '.'
}

function numero(valor: number, casas: number, decimal: ',' | '.'): string {
  if (!Number.isFinite(valor)) return ''
  const texto = valor.toFixed(casas)
  return decimal === ',' ? texto.replace('.', ',') : texto
}

/** Delimita o campo quando ele contém separador, aspas ou quebra de linha. */
export function escapar(bruto: string, separador: SeparadorCampo): string {
  if (!bruto.includes(separador) && !bruto.includes('"') && !/[\r\n]/.test(bruto)) return bruto
  return `"${bruto.replaceAll('"', '""')}"`
}

const GRANDEZA_CSV: Readonly<Record<string, string>> = {
  meioPeriodo: 'meio_periodo',
  periodoCompleto: 'periodo_completo',
}

function celula(
  medicao: Medicao,
  cabecalho: string,
  decimal: ',' | '.',
): string {
  const casas = CASAS[cabecalho]
  switch (cabecalho) {
    case 'n':
      return String(medicao.n)
    case 'pendulo':
      return medicao.pendulo
    case 'pendulo_id':
      return medicao.idPendulo
    case 'T_s':
      return numero(medicao.T, casas!, decimal)
    case 'g_inferido_m_s2':
      return numero(medicao.gInferido, casas!, decimal)
    case 'alpha_graus':
      return numero(medicao.alphaGraus, casas!, decimal)
    case 'L_m':
      return numero(medicao.L, casas!, decimal)
    case 'erro_relativo_pct':
      return numero(medicao.erroRelativo * 100, casas!, decimal)
    case 'grandeza':
      return GRANDEZA_CSV[medicao.grandeza] ?? medicao.grandeza
    case 'g_ingenuo_m_s2':
      return numero(medicao.gInferidoIngenuo, casas!, decimal)
    case 'g_configurado_m_s2':
      return numero(medicao.gConfigurado, casas!, decimal)
    case 'T_teorico_s':
      return numero(medicao.Tteorico, casas!, decimal)
    case 'N_termos':
      return String(medicao.N)
    case 't_coleta_s':
      return numero(medicao.tColeta, casas!, decimal)
    case 'origem':
      return medicao.origem
    default:
      return ''
  }
}

function linhaEstatistica(
  rotulo: string,
  unidade: string,
  resumo: ResumoEstatistico,
  decimal: ',' | '.',
): string {
  // Com uma medição só, dispersão é campo vazio e nunca zero: zero afirmaria
  // uma precisão perfeita que uma amostra única não pode sustentar.
  const casas = 6
  const media = resumo.media === null ? '' : numero(resumo.media, casas, decimal)
  const desvio = resumo.desvioPadrao === null ? '' : numero(resumo.desvioPadrao, casas, decimal)
  const erro = resumo.erroPadrao === null ? '' : numero(resumo.erroPadrao, casas, decimal)
  return `# ${rotulo}: média = ${media} ${unidade}; desvio padrão = ${desvio} ${unidade}; erro padrão = ${erro} ${unidade}`
}

/**
 * Monta o conteúdo do arquivo, já com BOM e fim de linha CRLF.
 *
 * @returns o texto completo, pronto para virar um `Blob`.
 */
export function gerarCsv(
  medicoes: readonly Medicao[],
  metadados: MetadadosCsv,
  opcoes: OpcoesCsv = {},
): string {
  const separador = opcoes.separador ?? ';'
  const decimal = separadorDecimal(separador)
  const opcionais = COLUNAS_OPCIONAIS.filter((c) =>
    (opcoes.colunasOpcionais ?? []).includes(c.chave),
  )
  const cabecalhos = [...CABECALHOS_OBRIGATORIOS, ...opcionais.map((c) => c.cabecalho)]

  const linhas: string[] = [
    '# Simulador: Pêndulo — Fórmula Completa',
    `# Versão do aplicativo: ${metadados.versaoAplicativo}`,
    `# Versão do formato CSV: ${VERSAO_FORMATO_CSV}`,
    `# Exportado em: ${metadados.exportadoEm}`,
    `# Visualização: ${metadados.visualizacao}`,
    `# Modelo de período: ${metadados.modeloPeriodo}`,
    `# Fórmula: ${metadados.formula}`,
    `# Grandeza medida pelo sensor: ${metadados.grandezaSensor}`,
    '# Sensor: fixo no ponto zero (theta = 0)',
    `# Parâmetros não padrão: ${metadados.parametrosNaoPadrao}`,
    `# Estado completo: ${metadados.estadoCompleto}`,
    '#',
    cabecalhos.map((c) => escapar(c, separador)).join(separador),
  ]

  for (const medicao of medicoes) {
    linhas.push(
      cabecalhos.map((c) => escapar(celula(medicao, c, decimal), separador)).join(separador),
    )
  }

  if (opcoes.estatisticas !== undefined && medicoes.length >= 2) {
    linhas.push(
      '',
      '#',
      `# Estatísticas (n = ${medicoes.length})`,
      linhaEstatistica('T', 's', opcoes.estatisticas.T, decimal),
      linhaEstatistica('g', 'm/s²', opcoes.estatisticas.g, decimal),
    )
  }

  return BOM + linhas.join('\r\n') + '\r\n'
}

/**
 * Nome do arquivo, no padrão `pendulo-medicoes-AAAA-MM-DD-HHMM.csv`.
 *
 * O instante entra por parâmetro para o nome ser reproduzível em teste.
 */
export function nomeArquivoCsv(quando: Date): string {
  const p = (v: number, casas = 2): string => String(v).padStart(casas, '0')
  const data = `${quando.getFullYear()}-${p(quando.getMonth() + 1)}-${p(quando.getDate())}`
  const hora = `${p(quando.getHours())}${p(quando.getMinutes())}`
  return `pendulo-medicoes-${data}-${hora}.csv`
}
