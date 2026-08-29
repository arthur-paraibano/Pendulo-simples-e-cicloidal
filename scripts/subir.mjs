#!/usr/bin/env node
/**
 * Sobe a interface completa com um comando só.
 *
 * Resolve sozinho o que costuma faltar numa máquina recém-clonada — pacotes
 * ausentes, CSS do KaTeX ainda não derivado — e só então inicia o servidor e
 * abre o navegador. A intenção é que `npm start` baste, sem roteiro de passos.
 *
 * Uso:
 *   npm start                    desenvolvimento, com recarga automática
 *   npm start -- --producao      serve o build de produção
 *   npm start -- --sem-navegador não abre o navegador sozinho
 *   npm start -- --porta 5180    porta específica
 */

import { spawn, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { platform } from 'node:os'

const args = process.argv.slice(2)
const temFlag = (nome) => args.includes(nome)
const valorDe = (nome, padrao) => {
  const i = args.indexOf(nome)
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : padrao
}

const producao = temFlag('--producao')
const abrirNavegador = !temFlag('--sem-navegador')
const porta = valorDe('--porta', producao ? '4173' : '5173')

const passo = (texto) => console.log(`\n▸ ${texto}`)
const ok = (texto) => console.log(`  ✓ ${texto}`)
const aviso = (texto) => console.log(`  ! ${texto}`)

function executar(comando, argumentos, descricao) {
  const r = spawnSync(comando, argumentos, { stdio: 'inherit', shell: true })
  if (r.status !== 0) {
    console.error(`\n✗ Falhou: ${descricao}`)
    process.exit(r.status ?? 1)
  }
}

// ── 1. Node em versão suficiente ─────────────────────────────────────────────
passo('Conferindo o ambiente')
const maior = Number(process.versions.node.split('.')[0])
if (maior < 20) {
  console.error(`✗ Node ${process.versions.node} é antigo demais. Requer 20 ou superior.`)
  console.error('  Sem Node, abra pendulo-simulador.html com duplo clique: funciona offline.')
  process.exit(1)
}
ok(`Node ${process.versions.node}`)

// ── 2. Dependências ──────────────────────────────────────────────────────────
if (!existsSync('node_modules')) {
  passo('Instalando dependências (primeira execução)')
  executar('npm', ['install'], 'npm install')
  ok('dependências instaladas')
} else {
  ok('dependências presentes')
}

// ── 3. CSS derivado do KaTeX ─────────────────────────────────────────────────
// Sem ele o build falha, e a mensagem do empacotador não diz o que fazer.
if (!existsSync('vendor/katex/katex.subset.css')) {
  passo('Gerando o CSS enxuto do KaTeX')
  executar('node', ['scripts/enxugar-katex.mjs'], 'enxugar-katex')
} else {
  ok('CSS do KaTeX já derivado')
}

// ── 4. Build, quando o alvo é produção ───────────────────────────────────────
if (producao) {
  passo('Gerando o build de produção')
  executar('npm', ['run', 'build'], 'npm run build')
  ok('build pronto')
}

// ── 5. Servidor ──────────────────────────────────────────────────────────────
const endereco = `http://localhost:${porta}/`
passo(producao ? 'Servindo o build de produção' : 'Iniciando o servidor de desenvolvimento')

const comando = producao
  ? ['run', 'preview', '--', '--port', porta, '--strictPort']
  : ['run', 'dev', '--', '--port', porta, '--strictPort']

const servidor = spawn('npm', comando, { stdio: ['inherit', 'pipe', 'inherit'], shell: true })

let jaAbriu = false
servidor.stdout.on('data', (bloco) => {
  const texto = String(bloco)
  process.stdout.write(texto)

  if (!jaAbriu && /localhost:\d+/.test(texto)) {
    jaAbriu = true
    console.log(`\n  A interface está em ${endereco}`)
    console.log('  Encerre com Ctrl+C.\n')

    if (abrirNavegador) {
      const sistema = platform()
      const abrir =
        sistema === 'win32'
          ? ['cmd', ['/c', 'start', '""', endereco]]
          : sistema === 'darwin'
            ? ['open', [endereco]]
            : ['xdg-open', [endereco]]
      try {
        spawn(abrir[0], abrir[1], { stdio: 'ignore', detached: true, shell: sistema === 'win32' }).unref()
      } catch {
        aviso(`não foi possível abrir o navegador; acesse ${endereco}`)
      }
    }
  }
})

const encerrar = () => {
  servidor.kill()
  process.exit(0)
}
process.on('SIGINT', encerrar)
process.on('SIGTERM', encerrar)
servidor.on('exit', (codigo) => process.exit(codigo ?? 0))
