import { expect, test } from '@playwright/test'

test.describe('Fase 5 — fórmula e parâmetros', () => {
  const errosPorPagina = new WeakMap<object, string[]>()

  test.beforeEach(async ({ page }) => {
    const errosPagina: string[] = []
    errosPorPagina.set(page, errosPagina)
    page.on('pageerror', (erro) => errosPagina.push(erro.message))
    page.on('console', (mensagem) => {
      if (mensagem.type() === 'error') errosPagina.push(mensagem.text())
    })
    await page.goto('/')
  })

  test.afterEach(async ({ page }) => {
    await page.waitForTimeout(0)
    expect(errosPorPagina.get(page) ?? []).toEqual([])
  })

  test('cenário 1: inicia em Simples com KaTeX htmlAndMathml e valores vivos', async ({ page }) => {
    const primaria = page.locator('.formula-linha').first()
    await expect(page.getByRole('radio', { name: 'Simples' })).toBeChecked()
    await expect(page.locator('.formula-expressao .katex-html')).toBeVisible()
    await expect(page.locator('.formula-expressao math')).toBeAttached()
    await expect(page.locator('#formula-primaria-termo-0')).toBeAttached()
    await expect(page.locator('#formula-primaria-termo-1')).toBeAttached()
    await expect(page.locator('#formula-primaria-termo-2')).toBeAttached()
    await expect(page.locator('.katex-html [role="button"], .katex-html [tabindex]')).toHaveCount(0)
    await expect(primaria.locator('[data-metrica="T0"]')).toHaveText('2,006067 s')
    await expect(primaria.locator('[data-metrica="T"]')).toHaveText('2,009893 s')
    await expect(primaria.locator('[data-metrica="razao"]')).toHaveText('1,001907')
    await expect(page.locator('.formula-slot[data-termo="1"]')).toContainText('0,001899')
    expect(await page.evaluate(() => katex.version)).toBe('0.18.4')
  })

  test('cenário 2: campo mantém o valor intermediário e confirma no blur', async ({ page }) => {
    const primaria = page.locator('.formula-linha').first()
    const controle = page.locator('[data-parametro="alpha"] .param-entrada input').first()
    const slider = page.locator('[data-parametro="alpha"] input[type="range"]').first()
    await controle.fill('45')
    await expect(slider).toHaveValue('10')
    await expect(primaria.locator('[data-metrica="T"]')).toHaveText('2,009893 s')
    await controle.press('Tab')
    await expect(controle).toHaveValue('45,0')
    await expect(slider).toHaveValue('45')
    await expect(primaria.locator('[data-metrica="T"]')).toHaveText('2,085562 s')
    await expect(primaria.locator('[data-metrica="razao"]')).toHaveText('1,039628')
  })

  test('console aplica aliases e vírgula atomicamente em menos de 100 ms', async ({ page }) => {
    await page.getByText('Console de parâmetros', { exact: true }).click()
    const console = page.locator('.param-console textarea')
    await console.fill('α=10; L=1,5; g=9.81; N=2')
    await page.getByRole('button', { name: 'Aplicar linha' }).click()
    await expect(page.locator('[data-parametro="L"] .param-entrada input').first()).toHaveValue('1,500')
    await expect(page.locator('.formula-linha').first().locator('[data-metrica="T"]')).toHaveText('2,461606 s')
    const duracao = Number(await page.locator('.param-console-resultado').getAttribute('data-tempo-resposta-ms'))
    expect(duracao).toBeLessThanOrEqual(100)

    await console.fill('alpha=45; xyz=3; L=2')
    await page.getByRole('button', { name: 'Aplicar linha' }).click()
    await expect(page.locator('[data-parametro="alpha"] .param-entrada input').first()).toHaveValue('10,0')
    await expect(page.locator('[data-parametro="L"] .param-entrada input').first()).toHaveValue('1,500')
    await expect(page.locator('.param-console-resultado')).toContainText('xyz')
  })

  test('console atualiza fórmula e descrição real da cena em até 100 ms', async ({ page }) => {
    await page.getByText('Console de parâmetros', { exact: true }).click()
    await page.locator('.param-console textarea').fill('alpha=45; theta0=45')
    const duracao = await page.evaluate(async () => {
      const formula = document.querySelector<HTMLOutputElement>('.formula-linha [data-metrica="T"]')!
      const cena = document.querySelector<HTMLElement>('.cena-overlay')!
      const botao = [...document.querySelectorAll<HTMLButtonElement>('button')]
        .find((item) => item.textContent === 'Aplicar linha')!
      const formulaAntes = formula.value
      const cenaAntes = cena.getAttribute('aria-label')
      const inicio = performance.now()
      botao.click()
      return await new Promise<number>((resolver, rejeitar) => {
        const verificar = (): void => {
          if (formula.value !== formulaAntes && cena.getAttribute('aria-label') !== cenaAntes) {
            resolver(performance.now() - inicio)
            return
          }
          if (performance.now() - inicio > 250) {
            rejeitar(new Error('Fórmula e cena não atualizaram dentro de 250 ms.'))
            return
          }
          requestAnimationFrame(verificar)
        }
        requestAnimationFrame(verificar)
      })
    })
    expect(duracao).toBeLessThanOrEqual(100)
    await expect(page.locator('.formula-linha').first().locator('[data-metrica="T"]')).toHaveText('2,085562 s')
    await expect(page.locator('.cena-overlay')).toHaveAttribute('aria-label', /ângulo 45\.0 graus/)
  })

  test('teclado, passo fino, PageUp e restauração seguem o esquema', async ({ page }) => {
    const controle = page.locator('[data-parametro="alpha"] .param-entrada input').first()
    await controle.focus()
    await controle.press('ArrowUp')
    await expect(controle).toHaveValue('10,1')
    await controle.press('Shift+ArrowUp')
    const slider = page.locator('[data-parametro="alpha"] input[type="range"]').first()
    await expect(slider).toHaveAttribute('step', '0.1')
    await expect(slider).toHaveValue('10.1')
    await expect(controle).toHaveAttribute('data-valor-exato', '10.11')
    await controle.press('PageUp')
    await expect(controle).toHaveValue('11,1')
    await expect(slider).toHaveValue('11.1')
    await expect(controle).toHaveAttribute('data-valor-exato', '11.11')
    await controle.press('Shift+ArrowUp')
    await expect(controle).toHaveAttribute('data-valor-exato', '11.12')
    await controle.press('End')
    await expect(controle).toHaveValue('179,9')
    await controle.press('Home')
    await expect(controle).toHaveValue('0,1')
    await page.locator('[data-parametro="alpha"] .param-restaurar').first().click()
    await expect(controle).toHaveValue('10,0')
    await slider.focus()
    await slider.press('ArrowRight')
    await expect(slider).toHaveValue('10.1')
    await expect(controle).toHaveValue('10,1')
  })

  test('cenário 4: troca de projeção preserva o relógio e apaga os mesmos termos', async ({ page }) => {
    const primaria = page.locator('.formula-linha').first()
    const alpha = page.locator('[data-parametro="alpha"] .param-entrada input').first()
    await alpha.fill('120')
    await alpha.press('Enter')
    await page.getByRole('button', { name: 'Reproduzir' }).click()
    await page.waitForTimeout(180)
    const tempoAntes = await page.locator('.cena-overlay').getAttribute('aria-label')
    const ancoraAntes = await page.locator('#formula-primaria-termo-1').elementHandle()
    await page.getByRole('radio', { name: 'Cicloidal' }).check()
    await expect(page.getByRole('radio', { name: 'Cicloidal' })).toBeChecked()
    await expect(alpha).toHaveValue('90,0')
    await expect(page.locator('#estado-cena')).toContainText('ajustado de 120° para 90°')
    await expect(page.locator('#formula-primaria-termo-1')).toHaveAttribute('data-ativo', 'false')
    await expect(primaria.locator('[data-metrica="T"]')).toHaveText('2,006067 s')
    await expect(primaria.locator('[data-metrica="erroRelativo"]')).toHaveText('0,0000 %')
    await expect(primaria.locator('[data-metrica="erroAbsoluto"]')).toHaveText('0,000000 s')
    expect(await page.evaluate((antes) => antes === document.querySelector('#formula-primaria-termo-1'), ancoraAntes)).toBe(true)
    await page.waitForTimeout(100)
    await expect(page.locator('.cena-overlay')).not.toHaveAttribute('aria-label', tempoAntes ?? '')

    await alpha.fill('120')
    await alpha.press('Enter')
    await expect(alpha).toHaveValue('90,0')
  })

  test('Ambos empilha duas fórmulas alinhadas no sinal de igual', async ({ page }) => {
    await page.getByRole('radio', { name: 'Ambos' }).check()
    await expect(page.locator('.formula-linha')).toHaveCount(2)
    await expect(page.locator('.formula-linha').nth(1)).toBeVisible()
    const iguais = await page.locator('.formula-igual').evaluateAll((elementos) => elementos.map((elemento) => elemento.getBoundingClientRect().x))
    expect(Math.abs(iguais[0]! - iguais[1]!)).toBeLessThan(1)
    await expect(page.locator('.formula-linha').nth(0).locator('[data-metrica="T"]')).toHaveText('2,009893 s')
    await expect(page.locator('.formula-linha').nth(1).locator('[data-metrica="T"]')).toHaveText('2,006067 s')
  })

  test('termos respondem a cursor, foco e setas com explicação sincronizada', async ({ page }) => {
    const termo1 = page.locator('.formula-slot[data-termo="1"]').first()
    await termo1.hover()
    await expect(termo1).toHaveClass(/termo-destacado/)
    await expect(page.locator('#formula-primaria-termo-1')).toHaveClass(/termo-destacado/)
    await expect(page.locator('.formula-explicacao').first()).toContainText('Termo n=1')
    await termo1.focus()
    await termo1.press('ArrowRight')
    await expect(page.locator('.formula-slot[data-termo="2"]').first()).toBeFocused()
  })

  test('painel avançado fica a um passo e derivados são somente leitura', async ({ page }) => {
    const avancados = page.getByText('Parâmetros avançados', { exact: true })
    await expect(avancados).toBeVisible()
    await avancados.click()
    await expect(page.locator('[data-parametro="omega0"] input').first()).toBeVisible()
    await expect(page.locator('[data-derivado="tempo"] output')).toBeVisible()
    await expect(page.locator('[data-derivado="T0"]')).toContainText('somente leitura')
    await expect(page.locator('[data-derivado="frequencia"] output')).not.toHaveText('')
    await expect(page.locator('[data-derivado="energiaTotal"] output')).not.toHaveText('')
    await expect(page.locator('[data-derivado="energiaTotal"]')).toHaveAttribute('data-modo-energia', 'simples')
    await expect(page.locator('[data-derivado="energiaTotal"]')).toContainText('pêndulo simples')
  })

  test('em 1366×768 a fórmula começa visível imediatamente abaixo da cena', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 })
    const cena = await page.locator('#cena').boundingBox()
    const formula = await page.locator('#formula').boundingBox()
    expect(formula!.y).toBeGreaterThan(cena!.y)
    expect(formula!.y).toBeLessThan(768)
  })
})
