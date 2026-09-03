/**
 * Presets de fábrica e do usuário (RF-097 a RF-099).
 *
 * Um preset guarda **apenas o que difere do padrão** — assim, quando um padrão
 * muda entre versões, os presets acompanham em vez de congelar valores velhos.
 */

import { PARAMETROS, POR_ID } from './schema.js'
import type { ValorParametro } from './tipos.js'
import type { Store } from './store.js'

export const VERSAO_ESQUEMA_PRESET = 1

export interface Preset {
  readonly versaoEsquema: number
  readonly id: string
  readonly nome: string
  readonly descricao?: string
  readonly origem: 'fabrica' | 'usuario' | 'arquivo'
  readonly visualizacao?: 'simples' | 'cicloidal' | 'ambos'
  readonly parametros: Readonly<Record<string, ValorParametro>>
  /**
   * Estado por pendulo: sobreposicoes e desacoplamentos (RF-151 a RF-156).
   *
   * Fica separado de `parametros` porque as chaves nao sao ids do catalogo. Sem
   * isto, um cenario com tres massas em alturas diferentes seria salvo como se
   * as tres estivessem na mesma altura -- e a ida e volta de RF-099 devolveria
   * um experimento diferente do que foi guardado.
   */
  readonly indexados?: Readonly<Record<string, ValorParametro>>
}

/**
 * Presets de fábrica obrigatórios (RF-097).
 *
 * O do roteiro alemão reproduz o experimento do PDF: pêndulo de 1 m e sensor em
 * meio período, que é o que a barreira de luz mede.
 */
export const PRESETS_FABRICA: readonly Preset[] = [
  {
    versaoEsquema: VERSAO_ESQUEMA_PRESET,
    id: 'pequenas-oscilacoes',
    nome: 'Pequenas oscilações',
    descricao: 'Onde a aproximação de pequenos ângulos é excelente: o erro fica abaixo de 0,05 %.',
    origem: 'fabrica',
    visualizacao: 'simples',
    parametros: { L: 1, g: 9.81, alpha: 5, N: 2 },
  },
  {
    versaoEsquema: VERSAO_ESQUEMA_PRESET,
    id: 'regime-anarmonico',
    nome: 'Regime anarmônico',
    descricao: 'A 90° a série truncada já subestima o período em 1,7 %.',
    origem: 'fabrica',
    visualizacao: 'simples',
    parametros: { L: 1, g: 9.81, alpha: 90, N: 2, curvaTalpha: true, graficoErro: { ligado: true, escala: 'logaritmica' } },
  },
  {
    versaoEsquema: VERSAO_ESQUEMA_PRESET,
    id: 'roteiro-alemao',
    nome: 'Experimento do roteiro alemão',
    descricao:
      'Pêndulo de 1 m com sensor em meio período, reproduzindo o Zykloidenpendel: a diferença é de alguns milissegundos.',
    origem: 'fabrica',
    visualizacao: 'ambos',
    parametros: { L: 1, g: 9.81, alpha: 10, N: 2, modoContagem: 'meioPeriodo', caderno: true },
  },
  {
    versaoEsquema: VERSAO_ESQUEMA_PRESET,
    id: 'tautocrona-huygens',
    nome: 'Tautócrona de Huygens',
    descricao: 'Três massas soltas de alturas diferentes chegam juntas ao ponto zero.',
    origem: 'fabrica',
    visualizacao: 'cicloidal',
    parametros: {
      modo: 'cicloidal',
      L: 1,
      g: 9.81,
      // P18 (massasTautocrona) descreve a mesma coisa que n_p e nunca e lido:
      // inclui-lo aqui so poluiria o endereco compartilhavel com ruido.
      numeroPendulos: 3,
      exibirEvoluta: true,
      fonteMovimento: 'integracao',
    },
    // As tres alturas sao o cenario inteiro: soltas de 0,05 m, 0,2 m e 0,45 m,
    // as massas chegam juntas ao ponto zero. Sem elas o preset mostraria tres
    // pendulos identicos, que e o oposto do que a tautocronia demonstra.
    indexados: {
      '#acoplado#theta0': false,
      '#acoplado#alpha': false,
      '#acoplado#h0': false,
      'h0#1': 0.05,
      'h0#2': 0.2,
      'h0#3': 0.45,
    },
  },
  {
    versaoEsquema: VERSAO_ESQUEMA_PRESET,
    id: 'lua',
    nome: 'Pêndulo na Lua',
    descricao: 'Com g seis vezes menor, o período mais que dobra.',
    origem: 'fabrica',
    parametros: { corpoCeleste: 'lua', L: 1, alpha: 10 },
  },
  {
    versaoEsquema: VERSAO_ESQUEMA_PRESET,
    id: 'jupiter',
    nome: 'Pêndulo em Júpiter',
    descricao: 'Gravidade duas vezes e meia a da Terra.',
    origem: 'fabrica',
    parametros: { corpoCeleste: 'jupiter', L: 1, alpha: 10 },
  },
  {
    versaoEsquema: VERSAO_ESQUEMA_PRESET,
    id: 'planeta-x',
    nome: 'Desafio do Planeta X',
    descricao: 'A gravidade fica oculta: descubra-a medindo o período.',
    origem: 'fabrica',
    parametros: { corpoCeleste: 'planetaX', desafioPlanetaX: true, L: 1, alpha: 5, caderno: true },
  },
  {
    versaoEsquema: VERSAO_ESQUEMA_PRESET,
    id: 'amortecido',
    nome: 'Regime amortecido',
    descricao: 'Com atrito a amplitude decai e o período medido perde sentido aos poucos.',
    origem: 'fabrica',
    parametros: { modeloAtrito: 'viscoso', zeta: 0.05, alpha: 45, barrasEnergia: true },
  },
]

/** Extrai um preset do estado corrente, guardando só o que difere do padrão. */
export function capturarPreset(
  store: Store,
  id: string,
  nome: string,
  descricao?: string,
): Preset {
  const indexados = store.estadoIndexadoNaoPadrao()
  return {
    versaoEsquema: VERSAO_ESQUEMA_PRESET,
    id,
    nome,
    ...(descricao !== undefined ? { descricao } : {}),
    origem: 'usuario',
    parametros: store.naoPadrao(),
    ...(Object.keys(indexados).length > 0 ? { indexados } : {}),
  }
}

export interface ResultadoAplicacao {
  readonly aplicados: number
  readonly avisos: readonly string[]
}

/**
 * Aplica um preset: restaura tudo ao padrão e então escreve o que o preset traz.
 *
 * Restaurar antes é essencial — sem isso, carregar um preset por cima de outro
 * deixaria resíduos do anterior, e o estado deixaria de ser reproduzível.
 */
export function aplicarPreset(store: Store, preset: Preset): ResultadoAplicacao {
  const avisos: string[] = []

  if (preset.versaoEsquema > VERSAO_ESQUEMA_PRESET) {
    avisos.push(
      `Preset criado por uma versão mais nova (v${preset.versaoEsquema}). Carregando o que for reconhecível.`,
    )
  }

  let aplicados = 0
  store.emLote(() => {
    store.restaurarTudo()
    for (const [id, valor] of Object.entries(preset.parametros)) {
      const def = POR_ID.get(id)
      if (def === undefined) {
        avisos.push(`Parâmetro desconhecido no preset, ignorado: "${id}".`)
        continue
      }
      if (def.derivado) continue
      const resultado = store.definirParametro(id, valor, 'preset')
      if (resultado.mensagem !== undefined) avisos.push(resultado.mensagem)
      if (resultado.aplicado) aplicados += 1
    }
    // Depois dos valores base: uma sobreposicao e validada contra o L e o modo
    // ja aplicados, e antes deles encostaria em limites que ainda mudariam.
    if (preset.indexados !== undefined) {
      store.aplicarEstadoIndexado(preset.indexados)
      aplicados += Object.keys(preset.indexados).length
    }
  })

  return { aplicados, avisos }
}

export function buscarPresetFabrica(id: string): Preset | undefined {
  return PRESETS_FABRICA.find((p) => p.id === id)
}

/** Verifica se um objeto qualquer tem a forma de um preset válido. */
export function validarPreset(candidato: unknown): { valido: boolean; erros: string[] } {
  const erros: string[] = []
  if (typeof candidato !== 'object' || candidato === null) {
    return { valido: false, erros: ['Preset deve ser um objeto.'] }
  }
  const p = candidato as Partial<Preset>

  if (typeof p.versaoEsquema !== 'number') erros.push('Falta "versaoEsquema".')
  if (typeof p.id !== 'string' || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(p.id)) {
    erros.push('"id" deve estar em kebab-case.')
  }
  if (typeof p.nome !== 'string' || p.nome.trim() === '') erros.push('Falta "nome".')
  if (typeof p.parametros !== 'object' || p.parametros === null) {
    erros.push('Falta "parametros".')
  } else {
    for (const id of Object.keys(p.parametros)) {
      if (!POR_ID.has(id)) erros.push(`Parâmetro desconhecido: "${id}".`)
    }
  }
  return { valido: erros.length === 0, erros }
}

/** Todos os identificadores de parâmetro conhecidos — útil em diagnósticos. */
export const IDS_CONHECIDOS: readonly string[] = PARAMETROS.map((p) => p.id)
