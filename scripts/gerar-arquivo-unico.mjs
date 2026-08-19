#!/usr/bin/env node
/**
 * Move o resultado do alvo autocontido para `pendulo-simulador.html` na raiz.
 *
 * Esse é o arquivo que a sala de aula abre com duplo clique (Princípio VII),
 * e é o nome prometido no quickstart. Fica na raiz, e não em `dist-single/`,
 * para que baixar o repositório baste — sem procurar em subpasta de build.
 */

import { copyFileSync, existsSync, statSync } from 'node:fs'

const ORIGEM = 'dist-single/index.html'
const DESTINO = 'pendulo-simulador.html'

if (!existsSync(ORIGEM)) {
  console.error(`✗ ${ORIGEM} não encontrado. Rode o build do alvo autocontido antes.`)
  process.exit(1)
}

copyFileSync(ORIGEM, DESTINO)
const kb = (statSync(DESTINO).size / 1024).toFixed(1)
console.log(`✓ ${DESTINO} gerado (${kb} kB) — abre offline com duplo clique.`)
