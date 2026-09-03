import { expect, test } from '@playwright/test'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

/**
 * O arquivo único, aberto como a sala de aula o abre (RNF-011, T124).
 *
 * O que se verifica aqui não é a aplicação — isso os outros cenários já fazem
 * contra o servidor de desenvolvimento. É a **entrega**: que o artefato
 * versionado na raiz do repositório abre por `file://`, sem servidor, sem
 * instalação e sem tocar na rede, e que continua funcionando por completo.
 *
 * Toda requisição http(s) é abortada de propósito. Se o pacote tiver esquecido
 * uma fonte, um script ou uma folha de estilo do lado de fora, o teste falha
 * aqui em vez de falhar na aula.
 */

const CAMINHO = resolve('pendulo-simulador.html')

test.describe('Fase 10 — Entrega offline (RNF-011)', () => {
  test.skip(
    !existsSync(CAMINHO),
    'pendulo-simulador.html não existe. Rode `npm run build:single`.',
  )

  test('o arquivo único abre por file:// e funciona sem rede', async ({ page }) => {
    const externas: string[] = []
    const erros: string[] = []
    page.on('pageerror', (erro) => erros.push(erro.message))
    page.on('console', (mensagem) => {
      if (mensagem.type() === 'error') erros.push(mensagem.text())
    })
    await page.route('http://**', (rota) => {
      externas.push(rota.request().url())
      return rota.abort()
    })
    await page.route('https://**', (rota) => {
      externas.push(rota.request().url())
      return rota.abort()
    })

    await page.goto(pathToFileURL(CAMINHO).href)

    // ── A cena existe e anima ────────────────────────────────────────────────
    await expect(page.locator('#palco-pendulo canvas').first()).toBeVisible()
    await page.locator('#cena').getByRole('button', { name: 'Reproduzir' }).click()
    await expect(page.locator('#estado-cena')).toContainText('movimento')
    await page.locator('#cena').getByRole('button', { name: 'Pausar' }).click()

    // ── A fórmula foi renderizada pelo KaTeX embutido ────────────────────────
    await page.waitForFunction(() => document.fonts.status === 'loaded')
    await expect(page.locator('#formula .katex').first()).toBeVisible()

    // ── Trocar de regime e digitar parâmetro continuam funcionando ───────────
    await page.getByRole('radio', { name: /Cicloidal/ }).click()
    await expect(page.getByRole('radio', { name: /Cicloidal/ })).toBeChecked()

    const campoL = page.locator('[data-parametro="L"] input[type="text"]')
    await campoL.fill('2')
    await campoL.press('Enter')
    await expect(campoL).toHaveValue('2,000')

    // ── Os créditos vieram junto: o artefato é o desta versão ────────────────
    await expect(page.locator('#creditos')).toContainText('PhET Pendulum Lab')
    await expect(page.locator('#creditos')).toContainText('Horologium oscillatorium')

    expect(erros).toEqual([])
    expect(
      externas,
      `o arquivo único pediu recurso externo: ${externas.join(', ')}. ` +
        'Ele precisa ser autocontido — nada de CDN, fonte remota ou script de fora.',
    ).toEqual([])
  })
})
