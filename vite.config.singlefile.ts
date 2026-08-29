import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

/**
 * O KaTeX vendorizado é um bundle UMD. O build o converte pelo plugin de
 * CommonJS, mas o servidor de desenvolvimento entrega ESM nativo — e um UMD não
 * tem `export default`, então a aplicação subia em branco só em `npm run dev`.
 *
 * Tratá-lo como uma dependência chamada `katex` faz o Vite pré-empacotá-lo com
 * esbuild, que resolve a interoperação uma vez só e vale para os dois modos.
 */
const KATEX = fileURLToPath(new URL('vendor/katex/katex.min.js', import.meta.url))
import { viteSingleFile } from 'vite-plugin-singlefile'

// Alvo "arquivo único offline" (Princípio VII da constituição): gera um HTML
// autocontido que abre com duplo clique, sem servidor e sem internet — o
// caminho previsto para a sala de aula.
export default defineConfig({
  base: './',
  resolve: { alias: { katex: KATEX } },
  optimizeDeps: { include: ['katex'] },
  plugins: [viteSingleFile()],
  build: {
    outDir: 'dist-single',
    target: 'es2022',
    sourcemap: false,
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
  },
})
