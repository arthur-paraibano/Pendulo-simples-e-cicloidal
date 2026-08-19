import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/e2e/**', 'node_modules/**'],
    environment: 'node',
    reporters: ['default'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      // A física é o que não pode estar errado; o estado é o que não pode
      // perder dados. Os dois entram no mesmo limiar.
      include: ['src/physics/**/*.ts', 'src/state/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/state/tipos.ts'],
      // Princípio I: o núcleo de física é o que não pode estar errado.
      // O limiar é deliberadamente alto e vale por arquivo, não só no agregado.
      thresholds: {
        lines: 95,
        functions: 95,
        branches: 90,
        statements: 95,
        perFile: true,
      },
    },
  },
})
