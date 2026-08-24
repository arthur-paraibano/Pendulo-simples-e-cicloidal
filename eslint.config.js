// @ts-check
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import globals from 'globals'

/**
 * Regra de dependência entre camadas (plan.md §Estrutura do Código-Fonte):
 *
 *         ui ──┐
 *              ├──▶ state ──▶ physics
 *      render ─┘
 *
 * As setas só apontam para dentro. Isto é imposto mecanicamente aqui, e não por
 * disciplina — disciplina não sobrevive à pressa.
 */

const MSG_PHYSICS =
  'Violação da regra de dependência: src/physics/ é o núcleo puro e NÃO pode importar de render/, ui/ ou state/. ' +
  'Se o motor precisa desse dado, ele deve chegar como argumento de função.'

const MSG_INTERNO =
  'Violação da regra de dependência: render/ e ui/ não chamam o motor de física diretamente. ' +
  'Passe pela camada de estado (seletores e ações). Importar apenas o tipo é permitido: use `import type`.'

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'dist-single/**',
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
      'coverage/**',
      'vendor/**',
      'pendulo-simulador.html',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser },
    },
    rules: {
      eqeqeq: ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/explicit-module-boundary-types': 'off',
    },
  },

  // ── Núcleo de física: puro, sem DOM, sem dependência para fora ──────────────
  {
    files: ['src/physics/**/*.ts'],
    languageOptions: {
      globals: {}, // sem globais de navegador: o motor roda também no Node
    },
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['**/render/**', '**/ui/**', '**/state/**'], message: MSG_PHYSICS },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'window', message: MSG_PHYSICS },
        { name: 'document', message: MSG_PHYSICS },
        { name: 'performance', message: MSG_PHYSICS },
        { name: 'navigator', message: MSG_PHYSICS },
        { name: 'localStorage', message: MSG_PHYSICS },
        { name: 'requestAnimationFrame', message: MSG_PHYSICS },
      ],
      // Determinismo (Princípio V): o motor não pode ter fonte de não-determinismo própria.
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'Use um gerador com semente explícita (Princípio V).' },
        { object: 'Date', property: 'now', message: 'O tempo entra no motor como argumento, nunca lido do relógio.' },
      ],
    },
  },

  // ── Renderização e interface: não falam com o motor direto ──────────────────
  {
    files: ['src/render/**/*.ts', 'src/ui/**/*.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['**/physics/**'], message: MSG_INTERNO, allowTypeImports: true },
          ],
        },
      ],
    },
  },

  // ── Configurações e testes: rodam no Node ───────────────────────────────────
  {
    files: ['*.config.ts', '*.config.js', 'tests/**/*.ts', 'scripts/**/*.{ts,mjs,js}'],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-restricted-imports': 'off',
      'no-restricted-properties': 'off',
    },
  },
)
