#!/usr/bin/env node
/**
 * Enxuga o KaTeX às fontes que o produto realmente usa.
 *
 * O KaTeX distribui **20 arquivos de fonte, 260 kB**, porque cobre toda a
 * notação matemática existente. A fórmula deste produto usa quatro famílias:
 * `Main` (dígitos, parênteses, "sen"), `Math` (as variáveis `L`, `g`, `α`, `π`)
 * e `Size2`/`Size3` (os delimitadores que crescem com a raiz e a fração).
 *
 * Este script lê o CSS **original e intacto** do `vendor/` e escreve um CSS
 * derivado contendo apenas os blocos `@font-face` das fontes mantidas. Nada é
 * apagado: os 20 arquivos seguem no `vendor/` como registro auditável da
 * procedência, e o empacotador emite apenas as fontes que o CSS derivado
 * referencia. Reincluir uma fonte é acrescentar uma linha em `MANTIDAS`.
 *
 * A lista de mantidas não foi adivinhada: veio de medir, no navegador, qual
 * família cada trecho da fórmula resolve — em Simples, Cicloidal, Ambos e com
 * `N` de 2 a 50. `Size1` e `Size4` entram como folga barata (10 kB somados):
 * o tamanho do delimitador depende da altura do conteúdo, e conteúdo mais alto
 * em fases futuras passaria a exigi-los.
 *
 * A garantia contra corte excessivo não é este comentário — é o cenário
 * `tests/e2e/fontes.spec.ts`, que reprova se o DOM resolver para qualquer
 * combinação de família, peso e estilo que não esteja sendo entregue.
 *
 * Uso: node scripts/enxugar-katex.mjs [--verificar]
 */

import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ORIGEM_CSS = 'vendor/katex/katex.min.css'
const DESTINO_CSS = 'vendor/katex/katex.subset.css'
const DIR_FONTES = 'vendor/katex/fonts'

/** Arquivos mantidos. Alterar aqui é a única forma de mudar o que é entregue. */
const MANTIDAS = [
  'KaTeX_Main-Regular.woff2',
  'KaTeX_Math-Italic.woff2',
  'KaTeX_Size1-Regular.woff2',
  'KaTeX_Size2-Regular.woff2',
  'KaTeX_Size3-Regular.woff2',
  'KaTeX_Size4-Regular.woff2',
]

const somenteVerificar = process.argv.includes('--verificar')
const kb = (bytes) => (bytes / 1024).toFixed(1)

if (!existsSync(ORIGEM_CSS)) {
  console.error(`✗ ${ORIGEM_CSS} não encontrado.`)
  process.exit(1)
}

const cssOriginal = readFileSync(ORIGEM_CSS, 'utf8')
const blocos = cssOriginal.match(/@font-face\{[^}]*\}/g) ?? []
if (blocos.length === 0) {
  console.error('✗ Nenhum bloco @font-face encontrado — o CSS de origem mudou de formato.')
  process.exit(1)
}

const arquivoDoBloco = (bloco) => /url\(fonts\/([^)]+?)\)/.exec(bloco)?.[1] ?? null

const mantidos = []
const descartados = []
for (const bloco of blocos) {
  const arquivo = arquivoDoBloco(bloco)
  if (arquivo === null) {
    console.error(`✗ Bloco @font-face sem url reconhecível: ${bloco.slice(0, 80)}…`)
    process.exit(1)
  }
  ;(MANTIDAS.includes(arquivo) ? mantidos : descartados).push({ arquivo, bloco })
}

// Toda fonte declarada como mantida precisa existir de fato.
const ausentes = MANTIDAS.filter((f) => !mantidos.some((m) => m.arquivo === f))
if (ausentes.length > 0) {
  console.error(`✗ Fontes declaradas como mantidas mas sem @font-face: ${ausentes.join(', ')}`)
  process.exit(1)
}

// O CSS derivado é o original sem os blocos descartados: tudo além das
// declarações de fonte — classes, métricas, espaçamentos — é preservado.
let cssEnxuto = cssOriginal
for (const { bloco } of descartados) cssEnxuto = cssEnxuto.replace(bloco, '')

const cabecalho =
  `/* Gerado por scripts/enxugar-katex.mjs a partir de ${ORIGEM_CSS}. Não editar à mão.\n` +
  `   Fontes entregues: ${MANTIDAS.length} de ${blocos.length}. Regenerar: npm run katex:enxugar */\n`

if (somenteVerificar) {
  const atual = existsSync(DESTINO_CSS) ? readFileSync(DESTINO_CSS, 'utf8') : ''
  if (atual !== cabecalho + cssEnxuto) {
    console.error(`✗ ${DESTINO_CSS} está fora de sincronia com ${ORIGEM_CSS}. Rode: npm run katex:enxugar`)
    process.exit(1)
  }
  console.log(`✓ ${DESTINO_CSS} está em sincronia com o original.`)
  process.exit(0)
}

writeFileSync(DESTINO_CSS, cabecalho + cssEnxuto, 'utf8')

// Os 20 arquivos permanecem no `vendor/`: ele é o registro fiel do upstream, e
// apagá-los tornaria impossível reincluir uma fonte sem baixar o KaTeX de novo.
// O que decide o que chega ao usuário é o CSS: o empacotador só emite a fonte
// que algum `@font-face` referencia, então as 14 descartadas custam zero byte
// no pacote e continuam disponíveis para uma revisão futura da lista.
const peso = (arquivos) =>
  arquivos.reduce((soma, f) => soma + statSync(join(DIR_FONTES, f)).size, 0)

const pesoEntregue = peso(MANTIDAS)
const pesoGuardado = peso(descartados.map((d) => d.arquivo))

console.log(`✓ ${DESTINO_CSS} gerado`)
console.log(`  entregues  : ${mantidos.length} fontes, ${kb(pesoEntregue)} kB no pacote`)
console.log(`  guardadas  : ${descartados.length} fontes, ${kb(pesoGuardado)} kB fora do pacote`)
for (const { arquivo } of mantidos) console.log(`    entrega   ${arquivo}`)
