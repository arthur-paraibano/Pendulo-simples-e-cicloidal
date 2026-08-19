#!/usr/bin/env node
/**
 * Portão de orçamento de tamanho (plan.md §Contexto Técnico, RNF-012).
 *
 * Falha com código diferente de zero se algum alvo estourar o limite — o
 * Princípio VII só se sustenta se o custo de cada dependência nova aparecer
 * imediatamente, e não seis meses depois.
 */

import { gzipSync } from 'node:zlib'
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const LIMITE_PAGES_KB = 400 // comprimido
const LIMITE_ARQUIVO_UNICO_KB = 1536 // não comprimido

const kb = (bytes) => bytes / 1024
const fmt = (n) => n.toFixed(1).padStart(8)

function arquivos(dir) {
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const caminho = join(dir, e.name)
    return e.isDirectory() ? arquivos(caminho) : [caminho]
  })
}

let falhou = false

// ── Alvo "pages": soma comprimida de tudo que o navegador baixa ──────────────
const dist = arquivos('dist').filter((f) => !f.endsWith('.map'))
if (dist.length === 0) {
  console.error('✗ dist/ vazio ou inexistente. Rode `npm run build` antes.')
  process.exit(1)
}
const totalGzip = dist.reduce((soma, f) => soma + gzipSync(readFileSync(f)).length, 0)
console.log('Alvo "pages" (comprimido)')
for (const f of dist) {
  console.log(`  ${fmt(kb(gzipSync(readFileSync(f)).length))} kB  ${f}`)
}
console.log(`  ${fmt(kb(totalGzip))} kB  TOTAL  (limite ${LIMITE_PAGES_KB} kB)`)
if (kb(totalGzip) > LIMITE_PAGES_KB) {
  console.error(`✗ Orçamento estourado em ${(kb(totalGzip) - LIMITE_PAGES_KB).toFixed(1)} kB.`)
  falhou = true
}

// ── Alvo "arquivo único": o que abre com duplo clique na sala de aula ────────
const unico = 'dist-single/index.html'
if (existsSync(unico)) {
  const tamanho = kb(statSync(unico).size)
  console.log('\nAlvo "arquivo único offline"')
  console.log(`  ${fmt(tamanho)} kB  ${unico}  (limite ${LIMITE_ARQUIVO_UNICO_KB} kB)`)
  if (tamanho > LIMITE_ARQUIVO_UNICO_KB) {
    console.error(`✗ Orçamento estourado em ${(tamanho - LIMITE_ARQUIVO_UNICO_KB).toFixed(1)} kB.`)
    falhou = true
  }
} else {
  console.log('\n(arquivo único não gerado nesta execução — pulando)')
}

if (falhou) {
  console.error('\n✗ Portão de tamanho reprovado.')
  process.exit(1)
}
console.log('\n✓ Portão de tamanho aprovado.')
