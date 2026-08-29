#!/usr/bin/env node
/**
 * Validação visual da interface em execução.
 *
 * Sobe um navegador de verdade contra o servidor, percorre os estados
 * principais e captura a tela em cada um. Confere também os valores exibidos
 * contra as fixtures de referência — porque uma captura bonita com número
 * errado continua sendo um defeito.
 *
 * Uso:
 *   npm run validar:visual                     usa http://localhost:5173
 *   npm run validar:visual -- --url http://localhost:5199/
 *   npm run validar:visual -- --saida capturas
 */

import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const args = process.argv.slice(2)
const valorDe = (nome, padrao) => {
  const i = args.indexOf(nome)
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : padrao
}

const BASE = valorDe('--url', 'http://localhost:5173/')
const SAIDA = valorDe('--saida', 'capturas')

/** Valores de referência do quickstart, com L = 1 m e g = 9,81 m/s². */
const ESPERADO = {
  T0: '2,006067 s',
  T_alpha10: '2,009893 s',
  razao_alpha10: '1,001907',
  T_alpha45: '2,085562 s',
  T_cicloidal: '2,006067 s',
}

mkdirSync(SAIDA, { recursive: true })

const navegador = await chromium.launch()
const pagina = await navegador.newPage({ viewport: { width: 1366, height: 900 } })

const problemas = []
const erros = []
pagina.on('console', (m) => {
  if (m.type() === 'error') erros.push(m.text())
})
pagina.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`))

const ler = async (seletor) =>
  (await pagina.locator(seletor).first().textContent())?.trim() ?? '(ausente)'

const conferir = (rotulo, obtido, esperado) => {
  const passou = obtido === esperado
  console.log(`  ${passou ? '✓' : '✗'} ${rotulo}: ${obtido}${passou ? '' : ` (esperado ${esperado})`}`)
  if (!passou) problemas.push(`${rotulo}: obtido ${obtido}, esperado ${esperado}`)
}

const capturar = async (nome) => {
  await pagina.waitForTimeout(400)
  await pagina.screenshot({ path: `${SAIDA}/${nome}.png` })
  console.log(`  captura em ${SAIDA}/${nome}.png`)
}

console.log(`\n▸ Abrindo ${BASE}`)
await pagina.goto(BASE, { waitUntil: 'networkidle' })
await pagina.waitForFunction(() => document.fonts.status === 'loaded')

console.log('\n▸ Estado inicial: Simples, α = 10°')
conferir('T₀', await ler('[data-metrica="T0"]'), ESPERADO.T0)
conferir('T', await ler('[data-metrica="T"]'), ESPERADO.T_alpha10)
conferir('T/T₀', await ler('[data-metrica="razao"]'), ESPERADO.razao_alpha10)
await capturar('01-inicial')

console.log('\n▸ Console de parâmetros: α = 45')
await pagina.getByText('Console de parâmetros', { exact: true }).click()
await pagina.locator('.param-console textarea').fill('alpha = 45')
await pagina.getByRole('button', { name: 'Aplicar linha' }).click()
await pagina.waitForTimeout(300)
conferir('T em α = 45°', await ler('[data-metrica="T"]'), ESPERADO.T_alpha45)
await capturar('02-alpha-45')

console.log('\n▸ Modo cicloidal na mesma amplitude — deve ser isócrono')
await pagina.getByRole('radio', { name: 'Cicloidal' }).click()
await pagina.waitForTimeout(300)
conferir('T cicloidal em α = 45°', await ler('[data-metrica="T"]'), ESPERADO.T_cicloidal)
await capturar('03-cicloidal')

console.log('\n▸ Comparação lado a lado')
await pagina.getByRole('radio', { name: 'Ambos' }).click()
const linhas = await pagina.locator('.formula-linha').count()
console.log(`  ${linhas === 2 ? '✓' : '✗'} fórmulas empilhadas: ${linhas}`)
if (linhas !== 2) problemas.push(`esperava 2 fórmulas em "Ambos", encontrou ${linhas}`)
await capturar('04-ambos')

console.log('\n▸ Tabela de coleta')
await pagina.getByRole('radio', { name: 'Simples' }).click()
await pagina.waitForTimeout(300)
await pagina.getByRole('button', { name: 'Coletar agora' }).click()
await pagina.waitForTimeout(300)
const linhasTabela = await pagina.locator('tbody tr[data-medicao]').count()
console.log(`  ${linhasTabela > 0 ? '✓' : '✗'} linhas coletadas: ${linhasTabela}`)
if (linhasTabela === 0) problemas.push('a coleta manual não produziu linha na tabela')
await pagina.locator('.tabela-coleta-rolagem').scrollIntoViewIfNeeded().catch(() => {})
await capturar('05-tabela')

console.log('\n▸ Estrutura vertical exigida pelo esboço')
const regioes = await pagina.evaluate(() =>
  ['#seletor-visualizacao', '#cena', '#formula', '#tabela-coleta'].map((id) => {
    const el = document.querySelector(id)
    if (el === null) return { id, ausente: true, topo: -1, altura: 0 }
    const r = el.getBoundingClientRect()
    return { id, ausente: false, topo: Math.round(r.top + window.scrollY), altura: Math.round(r.height) }
  }),
)
for (const r of regioes) {
  console.log(`  ${r.ausente ? '✗' : '✓'} ${r.id}: topo=${r.topo} altura=${r.altura}`)
  if (r.ausente) problemas.push(`região ausente: ${r.id}`)
}
const ordem = regioes.filter((r) => !r.ausente).map((r) => r.topo)
const emOrdem = ordem.every((v, i) => i === 0 || v >= ordem[i - 1])
console.log(`  ${emOrdem ? '✓' : '✗'} ordem seletor → cena → fórmula → tabela`)
if (!emOrdem) problemas.push('a ordem vertical das regiões não corresponde ao esboço')

console.log(`\n▸ Erros de console: ${erros.length === 0 ? 'nenhum' : erros.length}`)
for (const e of erros) console.log(`  ✗ ${e}`)
if (erros.length > 0) problemas.push(`${erros.length} erro(s) de console`)

await navegador.close()

console.log('')
if (problemas.length > 0) {
  console.error(`✗ Validação visual reprovada, ${problemas.length} problema(s):`)
  for (const p of problemas) console.error(`  · ${p}`)
  process.exit(1)
}
console.log('✓ Validação visual aprovada.')
