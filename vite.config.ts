import { defineConfig } from 'vite'

// Alvo "pages": build normal para hospedagem estática (GitHub Pages).
// `base` relativo permite servir de qualquer subdiretório sem reconfigurar.
export default defineConfig({
  base: './',
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
