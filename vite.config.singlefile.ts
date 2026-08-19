import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Alvo "arquivo único offline" (Princípio VII da constituição): gera um HTML
// autocontido que abre com duplo clique, sem servidor e sem internet — o
// caminho previsto para a sala de aula.
export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
  build: {
    outDir: 'dist-single',
    target: 'es2022',
    sourcemap: false,
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
  },
})
