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

// Alvo "pages": build normal para hospedagem estática (GitHub Pages).
// `base` relativo permite servir de qualquer subdiretório sem reconfigurar.
export default defineConfig({
  base: './',
  resolve: { alias: { katex: KATEX } },
  optimizeDeps: { include: ['katex'] },
  build: {
    outDir: 'dist',
    target: 'es2022',
    sourcemap: true,
    // Orçamento de tamanho do Princípio VII / RNF-012: o aviso é o sinal de alerta.
    chunkSizeWarningLimit: 400,
  },
  server: {
    port: 5173,
    open: false,
  },
})
