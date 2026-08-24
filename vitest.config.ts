import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/e2e/**', 'node_modules/**'],
    environment: 'node',
    reporters: ['default'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json', 'json-summary'],
      // Todo subsistema entregue entra na instrumentação; o bootstrap DOM fica
      // fino e a orquestração testável vive nos módulos de src/app.
      // Modelos puros da UI entram no mesmo gate por arquivo; os adaptadores DOM
      // são exercitados nos cenários Playwright em Chromium e Firefox.
      include: [
        'src/physics/**/*.ts',
        'src/state/**/*.ts',
        'src/render/**/*.ts',
        'src/app/**/*.ts',
        'src/ui/**/*-model.ts',
      ],
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
