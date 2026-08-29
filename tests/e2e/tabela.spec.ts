import { expect, test, type Page } from '@playwright/test'

async function aplicarParametros(page: Page, linha: string): Promise<void> {
  const resumo = page.getByText('Console de parâmetros', { exact: true })
  const console = page.locator('.param-console textarea')
  if (!(await console.isVisible())) await resumo.click()
  await console.fill(linha)
  await page.getByRole('button', { name: 'Aplicar linha' }).click()
}

test.describe('Fase 6 — tabela de coleta', () => {
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

  test('é semântica, coleta manualmente e contrasta as três inferências', async ({ page }) => {
    const tabela = page.getByRole('table', { name: 'Medições do sensor fixo no ponto zero' })
    await expect(tabela).toBeVisible()
    await expect(tabela.getByRole('columnheader')).toHaveCount(13)
    await expect(tabela.getByRole('columnheader', { name: /T — período completo \(s\)/ })).toBeVisible()

    await page.getByRole('button', { name: 'Coletar agora' }).click()
    const linhas = tabela.locator('tbody tr[data-medicao]')
    await expect(linhas).toHaveCount(1)
    const linha1 = tabela.locator('tbody tr[data-medicao="1"]')
    await expect(linha1.locator('[data-coluna="pendulo"]')).toHaveText('Simples')
    await expect(linha1.locator('[data-coluna="T"]')).toHaveText('2,0099')
    await expect(linha1.locator('[data-coluna="grandeza"]')).toHaveText('Período completo')
    await expect(linha1.locator('[data-coluna="gInferido"]')).toHaveText('9,8100')
    await expect(linha1.locator('[data-coluna="gInferidoIngenuo"]')).toHaveText('9,7727')
    await expect(linha1.locator('[data-coluna="gConfigurado"]')).toHaveText('9,8100')
    await expect(linha1.locator('[data-coluna="origem"]')).toHaveText('Manual')
    await expect(tabela.locator('[data-estatistica="desvio-T"]')).toContainText('—')

    await aplicarParametros(page, 'alpha=45; theta0=45')
    await page.getByRole('button', { name: 'Coletar agora' }).click()
    const linha2 = tabela.locator('tbody tr[data-medicao="2"]')
    // O sensor mede o período exato (2,0863 s); 2,0856 s é a aproximação N=2
    // exibida na fórmula e não deve substituir a grandeza observada.
    await expect(linha2.locator('[data-coluna="T"]')).toHaveText('2,0863')
    await expect(linha2.locator('[data-coluna="gInferido"]')).toHaveText('9,8035')
    await expect(linha2.locator('[data-coluna="gInferidoIngenuo"]')).toHaveText('9,0704')

    await page.getByRole('radio', { name: 'Ambos' }).check()
    await page.getByLabel('Pêndulo para coleta manual').selectOption('cicloidal')
    await page.getByRole('button', { name: 'Coletar agora' }).click()
    const linha3 = tabela.locator('tbody tr[data-medicao="3"]')
    await expect(linha3.locator('[data-coluna="pendulo"]')).toHaveText('Cicloidal')
    await expect(linha3.locator('[data-coluna="T"]')).toHaveText('2,0061')
    await expect(linha3.locator('[data-coluna="gInferido"]')).toHaveText('9,8100')
    await expect(linha3.locator('[data-coluna="gInferidoIngenuo"]')).toHaveText('9,8100')
    await expect(page.getByLabel('Pêndulo para coleta manual')).toHaveValue('cicloidal')
    await expect(tabela.locator('[data-estatistica="contagem"]')).toHaveText('n = 3')
    await expect(tabela.locator('[data-estatistica="desvio-T"]')).not.toContainText('—')
  })

  test('coleta automaticamente uma linha por ciclo completo e rotula meio período', async ({ page }) => {
    await aplicarParametros(page, 'alpha=10; theta0=10; L=1; g=9.81; velocidade=4')
    const tabela = page.getByRole('table', { name: 'Medições do sensor fixo no ponto zero' })
    const linhas = tabela.locator('tbody tr[data-medicao]')
    await page.getByRole('button', { name: 'Ativar coleta automática' }).click()
    await page.getByRole('button', { name: 'Reproduzir' }).click()
    await expect.poll(() => linhas.count(), { timeout: 5_000 }).toBeGreaterThanOrEqual(3)
    await page.getByRole('button', { name: 'Pausar coleta automática' }).click()
    await expect(linhas.first().locator('[data-coluna="T"]')).toHaveText('2,0099')
    await expect(linhas.first().locator('[data-coluna="origem"]')).toHaveText('Automática')

    const quantidadePausada = await linhas.count()
    await page.waitForTimeout(700)
    await expect(linhas).toHaveCount(quantidadePausada)
    await page.getByRole('button', { name: 'Retomar coleta automática' }).click()
    await expect.poll(() => linhas.count(), { timeout: 3_000 }).toBeGreaterThan(quantidadePausada)
    await page.getByRole('button', { name: 'Pausar coleta automática' }).click()

    await page.getByLabel('Grandeza medida').selectOption('meioPeriodo')
    await page.getByLabel('Pêndulo para coleta manual').selectOption('simples')
    await page.getByRole('button', { name: 'Coletar agora' }).click()
    await expect(page.getByRole('columnheader', { name: /T — meio período \(s\)/ })).toBeVisible()
    await expect(linhas.last().locator('[data-coluna="T"]')).toHaveText('1,0049')
    await expect(linhas.last().locator('[data-coluna="grandeza"]')).toHaveText('Meio período')
  })

  test('ordena sem mutar, exclui, confirma a limpeza e preserva ao trocar a visualização', async ({ page }) => {
    const tabela = page.getByRole('table', { name: 'Medições do sensor fixo no ponto zero' })
    const linhas = tabela.locator('tbody tr[data-medicao]')
    await page.getByRole('button', { name: 'Coletar agora' }).click()
    await aplicarParametros(page, 'alpha=45; theta0=45')
    await page.getByRole('button', { name: 'Coletar agora' }).click()
    await page.getByRole('button', { name: /^α \(°\)$/ }).click()
    await expect(linhas.first().locator('[data-coluna="alphaGraus"]')).toHaveText('10,0')
    await page.getByRole('button', { name: /^α \(°\)$/ }).click()
    await expect(linhas.first().locator('[data-coluna="alphaGraus"]')).toHaveText('45,0')

    await page.getByRole('radio', { name: 'Ambos' }).check()
    await expect(linhas).toHaveCount(2)
    await linhas.first().getByRole('button', { name: /Excluir medição/ }).click()
    await expect(linhas).toHaveCount(1)
    await expect(page.locator('[data-estatistica="contagem"]')).toHaveText('n = 1')
    await expect(page.locator('[data-estatistica="erro-padrao-g"]')).toContainText('—')

    page.once('dialog', async (dialog) => {
      expect(dialog.message()).toContain('caderno de laboratório')
      await dialog.dismiss()
    })
    await page.getByRole('button', { name: 'Limpar tabela' }).click()
    await expect(linhas).toHaveCount(1)
    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: 'Limpar tabela' }).click()
    await expect(linhas).toHaveCount(0)
  })

  test('invalida o ciclo parcial ao parar e ao trocar de visualização', async ({ page }) => {
    await aplicarParametros(page, 'alpha=10; theta0=10; L=1; g=9.81; velocidade=4')
    const tabela = page.getByRole('table', { name: 'Medições do sensor fixo no ponto zero' })
    const linhas = tabela.locator('tbody tr[data-medicao]')
    await page.getByRole('button', { name: 'Ativar coleta automática' }).click()
    await page.getByRole('button', { name: 'Reproduzir' }).click()
    await expect.poll(() => linhas.count(), { timeout: 3_000 }).toBeGreaterThanOrEqual(1)

    await page.getByRole('button', { name: 'Parar' }).click()
    const antesDeReiniciar = await linhas.count()
    await page.getByRole('button', { name: 'Reproduzir' }).click()
    await page.waitForTimeout(150)
    await expect(linhas).toHaveCount(antesDeReiniciar)
    await expect.poll(() => linhas.count(), { timeout: 2_000 }).toBeGreaterThan(antesDeReiniciar)

    await page.getByRole('radio', { name: 'Ambos' }).check()
    const antesDaTroca = await linhas.count()
    await page.waitForTimeout(150)
    await expect(linhas).toHaveCount(antesDaTroca)
    await expect.poll(() => linhas.count(), { timeout: 2_000 }).toBeGreaterThan(antesDaTroca)
    await page.getByRole('button', { name: 'Pausar coleta automática' }).click()

    const valores = await linhas.locator('[data-coluna="T"]').allTextContents()
    expect(valores.every((valor) => valor === '2,0099' || valor === '2,0061')).toBe(true)
  })

  test('preserva foco e rolagem nas atualizações e mantém alvos táteis de 44 px', async ({ page }) => {
    await page.setViewportSize({ width: 760, height: 900 })
    await page.getByRole('button', { name: 'Coletar agora' }).click()
    const rolagem = page.locator('.tabela-coleta-rolagem')

    // A rolagem de referência é estabelecida DEPOIS de mover o foco, e nunca
    // antes: revelar o elemento recém-focado é comportamento nativo e correto
    // do navegador — o Firefox rola, o Chromium às vezes não. O que esta
    // verificação precisa medir é outra coisa: que **o re-render da tabela**
    // preserva a posição de rolagem que o usuário deixou.
    const ordenarAlpha = page.getByRole('button', { name: /^α \(°\)$/ })
    await ordenarAlpha.focus()
    await rolagem.evaluate((elemento) => { elemento.scrollLeft = 180 })
    await ordenarAlpha.press('Enter')
    await expect(ordenarAlpha).toBeFocused()
    await expect.poll(() => rolagem.evaluate((elemento) => elemento.scrollLeft)).toBe(180)

    const grandeza = page.getByLabel('Grandeza medida')
    await grandeza.focus()
    await rolagem.evaluate((elemento) => { elemento.scrollLeft = 180 })
    await grandeza.selectOption('meioPeriodo')
    await expect(grandeza).toBeFocused()
    await expect.poll(() => rolagem.evaluate((elemento) => elemento.scrollLeft)).toBe(180)

    for (const controle of [
      page.getByRole('button', { name: 'Ativar coleta automática' }),
      grandeza,
      page.getByRole('button', { name: /Excluir medição/ }),
      ordenarAlpha,
    ]) {
      const caixa = await controle.boundingBox()
      expect(caixa).not.toBeNull()
      expect(caixa!.height).toBeGreaterThanOrEqual(44)
    }

    const excluir = page.getByRole('button', { name: /Excluir medição/ })
    await excluir.focus()
    await excluir.click()
    await expect(rolagem).toBeFocused()

    await page.getByRole('button', { name: 'Coletar agora' }).click()
    const limpar = page.getByRole('button', { name: 'Limpar tabela' })
    await limpar.focus()
    page.once('dialog', (dialog) => dialog.accept())
    await limpar.click()
    await expect(rolagem).toBeFocused()
  })

  test('limita o DOM a 100 linhas sem descartar a coleção', async ({ page }) => {
    const coletar = page.getByRole('button', { name: 'Coletar agora' })
    for (let i = 0; i < 101; i++) await coletar.click()

    const tabela = page.getByRole('table', { name: 'Medições do sensor fixo no ponto zero' })
    await expect(tabela.locator('tbody tr[data-medicao]')).toHaveCount(1)
    await expect(tabela.locator('[data-estatistica="contagem"]')).toHaveText('n = 101')
    await expect(page.locator('#tabela-coleta-faixa')).toContainText('Exibindo 101–101 de 101 medições')
    await expect(tabela.locator('tbody tr[data-medicao="101"]')).toBeVisible()
    await page.getByRole('button', { name: 'Página anterior' }).click()
    await expect(tabela.locator('tbody tr[data-medicao]')).toHaveCount(100)
    await expect(tabela.locator('tbody tr[data-medicao="1"]')).toBeVisible()
  })
})
