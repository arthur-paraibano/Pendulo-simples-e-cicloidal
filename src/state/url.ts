import { analisarChave, ehChaveDeAcoplamento } from './indices.js'
/**
 * Estado serializado no fragmento do endereço (contrato `estado-url.md`).
 *
 * O formato é **legível e auditável a olho** de propósito: um professor precisa
 * conseguir montar o link à mão. Compressão só entra se estourar o limite.
 *
 *     #v=1&modo=simples&L=1&alpha=10&g=9.81&N=2
 */

import { PARAMETROS, POR_ID } from './schema.js'
import type { ValorParametro } from './tipos.js'
import type { Store } from './store.js'

export const VERSAO_FORMATO = 1
const LIMITE_CARACTERES = 2000

export interface AvisoUrl {
  readonly chave: string
  readonly mensagem: string
}

export interface ResultadoLeitura {
  readonly valores: Record<string, ValorParametro>
  /** Sobreposições e acoplamentos por pêndulo, fora do catálogo (RF-156). */
  readonly indexados: Record<string, ValorParametro>
  readonly extras: Readonly<Record<string, string>>
  readonly avisos: readonly AvisoUrl[]
  readonly versaoLida: number
}

/**
 * Formata um número na forma mais curta que ainda o reconstrói exatamente.
 *
 * Truncar às casas de **apresentação** degradaria o estado ao compartilhá-lo: o
 * armazenamento guarda precisão plena — é o que permite o passo fino mexer em
 * α por 0,01 embora a tela mostre uma casa — e um endereço que só carregasse a
 * casa exibida devolveria um estado diferente do original (RF-167).
 *
 * `String` de um número já produz a representação mais curta que volta ao mesmo
 * valor, então valores digitados continuam curtos: 45 vira "45".
 */
function formatarNumero(v: number): string {
  return String(v)
}

function serializarValor(valor: ValorParametro): string {
  if (typeof valor === 'number') return formatarNumero(valor)
  if (typeof valor === 'boolean') return valor ? '1' : '0'
  if (Array.isArray(valor)) return valor.join(',')
  if (typeof valor === 'object') return JSON.stringify(valor)
  return String(valor)
}

/**
 * Constrói o fragmento a partir do store.
 *
 * Determinístico: o mesmo estado gera sempre o mesmo texto, caractere a
 * caractere, porque percorre o catálogo na ordem canônica.
 */
export function serializar(store: Store, extras: Readonly<Record<string, string>> = {}): string {
  const partes: string[] = [`v=${VERSAO_FORMATO}`]

  for (const [chave, valor] of Object.entries(extras)) {
    partes.push(`${chave}=${valor}`)
  }

  const naoPadrao = store.naoPadrao()
  for (const p of PARAMETROS) {
    if (!(p.id in naoPadrao)) continue
    partes.push(`${p.id}=${serializarValor(naoPadrao[p.id] as ValorParametro)}`)
  }

  // Estado indexado: só entra quando algum parâmetro está desacoplado, de modo
  // que o endereço de um pêndulo único continua exatamente como era (RF-156).
  for (const [chave, valor] of Object.entries(store.estadoIndexadoNaoPadrao())) {
    partes.push(`${encodeURIComponent(chave)}=${serializarValor(valor)}`)
  }

  const texto = partes.join('&')
  return texto.length > LIMITE_CARACTERES ? `v=${VERSAO_FORMATO}&z=${comprimir(texto)}` : texto
}

/**
 * Lê um fragmento e devolve os valores reconhecidos mais os avisos.
 *
 * **Nunca falha**: chave desconhecida é ignorada com registro, valor inválido
 * volta ao padrão com aviso. Um endereço malformado jamais deixa a aplicação em
 * branco ou travada.
 */
export function desserializar(fragmento: string): ResultadoLeitura {
  const avisos: AvisoUrl[] = []
  const valores: Record<string, ValorParametro> = {}
  const indexados: Record<string, ValorParametro> = {}
  const extras: Record<string, string> = {}

  const limpo = fragmento.replace(/^#/, '').trim()
  if (limpo === '') return { valores, indexados, extras, avisos, versaoLida: VERSAO_FORMATO }

  let pares = limpo.split('&').filter((p) => p !== '')
  let versaoLida = VERSAO_FORMATO

  const compactado = pares.find((p) => p.startsWith('z='))
  if (compactado !== undefined) {
    try {
      pares = descomprimir(compactado.slice(2)).split('&').filter((p) => p !== '')
    } catch {
      avisos.push({ chave: 'z', mensagem: 'Estado compactado inválido; carregando os padrões.' })
      pares = []
    }
  }

  for (const par of pares) {
    const separador = par.indexOf('=')
    if (separador < 0) {
      avisos.push({ chave: par, mensagem: `Trecho sem valor ignorado: "${par}".` })
      continue
    }
    let chave: string
    let bruto: string
    try {
      chave = decodeURIComponent(par.slice(0, separador))
      bruto = decodeURIComponent(par.slice(separador + 1))
    } catch {
      avisos.push({ chave: par, mensagem: `Codificação percentual inválida ignorada: "${par}".` })
      continue
    }

    if (chave === 'v') {
      const lida = Number(bruto)
      versaoLida = Number.isFinite(lida) ? lida : VERSAO_FORMATO
      if (versaoLida > VERSAO_FORMATO) {
        avisos.push({
          chave: 'v',
          mensagem: `Endereço criado por uma versão mais nova (v=${versaoLida}). Carregando o que for reconhecível.`,
        })
      }
      continue
    }
    if (chave === 'z') continue
    if (chave === 'vis' || chave === 't' || chave === 'run' || chave === 'roteiro') {
      extras[chave] = bruto
      continue
    }

    // Estado indexado: `L#2` e `#acoplado#L`. Não passa pelo catálogo, porque
    // a chave não é um parâmetro — é um parâmetro mais um pêndulo (RF-156).
    if (ehChaveDeAcoplamento(chave)) {
      indexados[chave] = bruto === 'false' ? false : true
      continue
    }
    const analisada = analisarChave(chave)
    if (analisada.indice !== null) {
      const alvo = POR_ID.get(analisada.id)
      if (alvo === undefined) {
        avisos.push({ chave, mensagem: `Parâmetro desconhecido ignorado: "${chave}".` })
      } else {
        const numero = Number(bruto)
        if (Number.isFinite(numero)) indexados[chave] = numero
        else avisos.push({ chave, mensagem: `Valor indexado inválido ignorado: "${chave}".` })
      }
      continue
    }

    const def = POR_ID.get(chave)
    if (def === undefined) {
      avisos.push({ chave, mensagem: `Parâmetro desconhecido ignorado: "${chave}".` })
      continue
    }

    if (def.tipo === 'numero' || def.tipo === 'inteiro') {
      const n = Number(bruto)
      if (!Number.isFinite(n)) {
        avisos.push({
          chave,
          mensagem: `${def.simbolo} recebeu "${bruto}", que não é número; mantido o padrão.`,
        })
        continue
      }
      valores[chave] = n
    } else if (def.tipo === 'booleano') {
      valores[chave] = bruto === '1' || bruto === 'true'
    } else if (def.tipo === 'multipla') {
      valores[chave] = bruto === '' ? [] : bruto.split(',')
    } else if (def.tipo === 'composto') {
      try {
        valores[chave] = JSON.parse(bruto) as ValorParametro
      } catch {
        avisos.push({ chave, mensagem: `${def.simbolo} tem formato inválido; mantido o padrão.` })
      }
    } else {
      valores[chave] = bruto
    }
  }

  return { valores, indexados, extras, avisos, versaoLida }
}

/** Lê um fragmento e aplica ao store, devolvendo os avisos acumulados. */
export function aplicarAoStore(store: Store, fragmento: string): readonly AvisoUrl[] {
  const { valores, indexados, extras, avisos } = desserializar(fragmento)
  const acumulados: AvisoUrl[] = [...avisos]

  store.emLote(() => {
    for (const [id, valor] of Object.entries(valores)) {
      const resultado = store.definirParametro(id, valor, 'url')
      if (resultado.mensagem !== undefined) {
        acumulados.push({ chave: id, mensagem: resultado.mensagem })
      }
    }
  })
  // Depois dos valores base: uma sobreposição é lida contra o L e o modo já
  // aplicados, e aplicá-la antes a validaria contra limites que ainda mudariam.
  if (Object.keys(indexados).length > 0) store.aplicarEstadoIndexado(indexados)
  if (extras['t'] !== undefined) {
    const tempo = Number(extras['t'])
    const resultado = store.atualizarTempoSimulacao(tempo, true)
    if (resultado.mensagem !== undefined) acumulados.push({ chave: 't', mensagem: resultado.mensagem })
  }
  if (extras['run'] === '1') store.definirParametro('execucao', 'rodando', 'url')
  if (extras['vis'] !== undefined) {
    const modo = extras['vis'] === 'ambos' ? 'comparacao' : extras['vis']
    const antes = { alpha: store.numero('alpha'), theta0: store.numero('theta0') }
    const resultado = store.definirParametro('modo', modo, 'url')
    if (resultado.mensagem !== undefined) acumulados.push({ chave: 'vis', mensagem: resultado.mensagem })
    // Restauração é uma nova experiência, não uma troca de vista em curso:
    // reaplica explicitamente os limites geométricos e expõe cada limitação.
    if (modo === 'cicloidal' || modo === 'comparacao') {
      for (const id of ['alpha', 'theta0'] as const) {
        const atual = store.numero(id)
        if (atual !== antes[id]) {
          acumulados.push({ chave: id, mensagem: `${id} = ${antes[id]} foi ajustado para ${atual}° pelo limite cicloidal de 90°.` })
        }
      }
    }
  }
  return acumulados
}

// ── Compressão simples (apenas para estados muito grandes) ──────────────────

function comprimir(texto: string): string {
  const bytes = new TextEncoder().encode(texto)
  let binario = ''
  for (const b of bytes) binario += String.fromCharCode(b)
  return btoaCompativel(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function descomprimir(texto: string): string {
  const base = texto.replace(/-/g, '+').replace(/_/g, '/')
  const binario = atobCompativel(base)
  const bytes = Uint8Array.from(binario, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

/** `btoa` existe no navegador; no Node usa-se `Buffer`. */
function btoaCompativel(binario: string): string {
  const g = globalThis as { btoa?: (s: string) => string }
  if (typeof g.btoa === 'function') return g.btoa(binario)
  return Buffer.from(binario, 'binary').toString('base64')
}

function atobCompativel(base: string): string {
  const g = globalThis as { atob?: (s: string) => string }
  if (typeof g.atob === 'function') return g.atob(base)
  return Buffer.from(base, 'base64').toString('binary')
}
