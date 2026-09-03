import { expect, test } from '@playwright/test'

test.describe('Fase 10 — Orientação, créditos e rastreabilidade', () => {
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

  test('a orientação aparece no primeiro uso e some com um clique (RF-126)', async ({ page }) => {
    const introducao = page.locator('#introducao')
    await expect(introducao).toBeVisible()
    await expect(introducao.getByRole('heading', { level: 2 })).toHaveText(
      'O que este simulador demonstra',
    )

    // Um clique — não dois, não um menu.
    await introducao.getByRole('button', { name: 'Entendi, começar' }).click()
    await expect(introducao).toBeHidden()
  })

  test('dispensada, não volta sozinha na abertura seguinte (RF-126)', async ({ page }) => {
    await page.locator('#introducao').getByRole('button', { name: 'Entendi, começar' }).click()
    await expect(page.locator('#introducao')).toBeHidden()

    await page.reload()
    await expect(page.locator('#introducao')).toBeHidden()
  })

  test('a orientação não cobre a cena nem rouba o foco de entrada', async ({ page }) => {
    // O cartão está no fluxo da página: o seletor de visualização continua no
    // topo (RF-127) e os dois primeiros Tab continuam sendo os skip links.
    await expect(page.locator('#seletor-visualizacao')).toBeVisible()
    await expect(page.getByRole('radio', { name: /Simples/ })).toBeVisible()

    await page.keyboard.press('Tab')
    await expect(page.locator(':focus')).toHaveAttribute('href', '#principal')

    // E a cena segue clicável com a orientação aberta.
    await page.locator('#cena').getByRole('button', { name: 'Reproduzir' }).click()
    await expect(page.locator('#estado-cena')).toContainText('movimento')
  })

  test('com a orientação aberta, a fórmula continua acima da dobra', async ({ page }) => {
    // O cartão fica no fluxo da página, então a altura dele sai do orçamento
    // vertical da Área K. Este é o teste que impede um trecho a mais na
    // orientação de empurrar a fórmula para fora da tela em 1366×768 — foi
    // exatamente o que aconteceu na primeira versão do cartão.
    await page.setViewportSize({ width: 1366, height: 768 })
    await page.goto('/')
    await expect(page.locator('#introducao')).toBeVisible()

    const cena = await page.locator('#cena').boundingBox()
    const formula = await page.locator('#formula').boundingBox()
    expect(formula!.y).toBeGreaterThan(cena!.y)
    expect(formula!.y).toBeLessThan(768)
  })

  test('os créditos citam as fontes exigidas pelo RF-125', async ({ page }) => {
    const creditos = page.locator('#creditos')
    await expect(creditos.getByRole('heading', { name: 'Créditos e fontes' })).toBeVisible()

    // Materiais do usuário, roteiro alemão, simulações de referência e a
    // bibliografia das aproximações.
    await expect(creditos).toContainText('formula geral.jpeg')
    await expect(creditos).toContainText('mhd_zykloidenpendel.pdf')
    await expect(creditos).toContainText('PhET Pendulum Lab')
    await expect(creditos).toContainText('Cycloidal Pendulum')
    await expect(creditos).toContainText('Horologium oscillatorium')
    await expect(creditos).toContainText('Kidd')
    await expect(creditos).toContainText('Lima')
    await expect(creditos).toContainText('Carvalhaes')

    await expect(
      creditos.getByRole('link', {
        name: 'https://phet.colorado.edu/sims/html/pendulum-lab/latest/pendulum-lab_en.html',
      }),
    ).toBeVisible()
  })

  test('todo número de referência exibido aponta para uma fonte (RNF-021)', async ({ page }) => {
    const rastreabilidade = page.locator('.creditos-rastreabilidade')
    await rastreabilidade.getByText('De onde vem cada número').click()

    const tabela = rastreabilidade.locator('table')
    await expect(tabela).toBeVisible()

    // A célula de fonte só diz "sem fonte" quando o vínculo se perdeu.
    await expect(tabela).not.toContainText('sem fonte')

    // As aproximações aparecem como fórmula, não como código-fonte de fórmula.
    // A conferência é sobre o ramo visual do KaTeX: o LaTeX original continua
    // no MathML, de propósito, para o leitor de tela.
    const formulaKiddFogg = tabela.locator('[data-afirmacao="formula:kiddFogg"] .creditos-valor')
    await expect(formulaKiddFogg.locator('.katex')).toBeVisible()
    await expect(formulaKiddFogg.locator('.katex-html')).not.toContainText('dfrac')

    const linhas = tabela.locator('tbody tr')
    expect(await linhas.count()).toBeGreaterThan(10)
    for (const celula of await tabela.locator('tbody tr td:last-child').all()) {
      expect((await celula.innerText()).trim().length).toBeGreaterThan(0)
    }
  })

  test('os números creditados são os mesmos que a aplicação usa', async ({ page }) => {
    const tabela = page.locator('.creditos-tabela')
    await page.locator('.creditos-rastreabilidade').getByText('De onde vem cada número').click()

    // Gravidade da Terra: o valor do preset e o valor creditado.
    await expect(tabela.locator('[data-afirmacao="gravidade-terra"]')).toContainText('9,81 m/s²')
    await expect(page.locator('[data-parametro="g"] input[type="text"]')).toHaveValue('9,81')

    // Limiares de confiança e saturação de N = 2, com as casas que os distinguem.
    await expect(tabela.locator('[data-afirmacao="limiar-excelente"]')).toContainText('54,373°')
    await expect(tabela.locator('[data-afirmacao="limiar-boa"]')).toContainText('81,603°')
    await expect(tabela.locator('[data-afirmacao="limiar-limitada"]')).toContainText('110,164°')
    await expect(tabela.locator('[data-afirmacao="saturacao-n2"]')).toContainText('1,390625')
  })

  test('a orientação pode ser revista a pedido, pelos créditos', async ({ page }) => {
    await page.locator('#introducao').getByRole('button', { name: 'Entendi, começar' }).click()
    await expect(page.locator('#introducao')).toBeHidden()

    await page.locator('#creditos').getByRole('button', { name: 'Rever a orientação inicial' }).click()
    await expect(page.locator('#introducao')).toBeVisible()
  })
})
