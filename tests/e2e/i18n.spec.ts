import { expect, test, type Page } from '@playwright/test'

const trocarIdioma = (page: Page) => page.getByLabel('Trocar idioma')

test.describe('Fase 9 — idioma da interface (RF-115)', () => {
  const errosPorPagina = new WeakMap<object, string[]>()

  test.beforeEach(async ({ page }) => {
    const erros: string[] = []
    errosPorPagina.set(page, erros)
    page.on('pageerror', (erro) => erros.push(erro.message))
    page.on('console', (mensagem) => {
      if (mensagem.type() === 'error') erros.push(mensagem.text())
    })
    await page.goto('/')
  })

  test.afterEach(async ({ page }) => {
    await page.waitForTimeout(0)
    expect(errosPorPagina.get(page) ?? []).toEqual([])
  })

  test('a interface começa em português do Brasil (RF-114)', async ({ page }) => {
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR')
    await expect(page.locator('#cabecalho strong')).toHaveText('Pêndulo — Fórmula Completa')
    await expect(page.locator('[data-acao="reproduzir"]')).toHaveText('Reproduzir')
    // Notação e separador decimal do português: `sen` e vírgula.
    await expect(page.locator('[data-parametro="L"] input[type="text"]')).toHaveValue('1,000')
  })

  test('trocar o idioma muda a interface e preserva o estado (RF-115)', async ({ page }) => {
    // Um estado distinto do padrão, para provar que a troca não o rebobina.
    const alpha = page.locator('[data-parametro="alpha"] input[type="text"]')
    await alpha.fill('42')
    await alpha.press('Enter')

    await trocarIdioma(page).selectOption('en')
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.locator('#cabecalho strong')).toHaveText('Pendulum — Full Formula')
    await expect(page.locator('[data-acao="reproduzir"]')).toHaveText('Play')
    await expect(page.locator('#estado-cena')).toContainText('Simulation paused')
    await expect(alpha).toHaveValue('42,0')

    await trocarIdioma(page).selectOption('de')
    await expect(page.locator('html')).toHaveAttribute('lang', 'de')
    await expect(page.locator('#cabecalho strong')).toHaveText('Pendel — Vollständige Formel')
    await expect(page.locator('[data-acao="reproduzir"]')).toHaveText('Start')
    await expect(alpha).toHaveValue('42,0')

    await trocarIdioma(page).selectOption('pt-BR')
    await expect(page.locator('[data-acao="reproduzir"]')).toHaveText('Reproduzir')
    await expect(alpha).toHaveValue('42,0')
  })

  test('o seletor do cabeçalho e o do catálogo descrevem o mesmo parâmetro', async ({ page }) => {
    // São dois controles para P106; discordarem faria a interface mentir sobre
    // o próprio estado.
    await trocarIdioma(page).selectOption('en')
    await expect(page.locator('#param-idioma')).toHaveValue('en')

    await page.locator('#param-idioma').selectOption('de')
    await expect(trocarIdioma(page)).toHaveValue('de')
  })

  test('o idioma escolhido sobrevive ao endereço compartilhável', async ({ page }) => {
    await trocarIdioma(page).selectOption('de')
    await expect.poll(() => page.evaluate(() => globalThis.location.hash)).toContain('idioma=de')

    await page.goto(await page.evaluate(() => globalThis.location.href))
    await expect(page.locator('html')).toHaveAttribute('lang', 'de')
    await expect(trocarIdioma(page)).toHaveValue('de')
  })
})
