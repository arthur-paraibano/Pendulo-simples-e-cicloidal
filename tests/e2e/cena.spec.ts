import { expect, test } from '@playwright/test'

const checksumCanvas = async (localizador: import('@playwright/test').Locator): Promise<number> => localizador.evaluate((elemento) => {
  const canvas = elemento as HTMLCanvasElement
  const dados = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data
  let soma = 0
  for (let i = 0; i < dados.length; i += 97) soma = (soma + dados[i]! * (i + 1)) % 2_147_483_647
  return soma
})

test.describe('Fase 4 — cena em Canvas', () => {
  let errosPagina: string[]

  test.beforeEach(async ({ page }) => {
    errosPagina = []
    page.on('pageerror', (erro) => errosPagina.push(erro.message))
    page.on('console', (mensagem) => {
      if (mensagem.type() === 'error') errosPagina.push(mensagem.text())
    })
    await page.goto('/')
  })

  test.afterEach(() => {
    expect(errosPagina).toEqual([])
  })

  test('coordena as três camadas no DPR do dispositivo', async ({ page }) => {
    const camadas = page.locator('.camada-canvas')
    await expect(camadas).toHaveCount(3)
    const dimensoes = await camadas.evaluateAll((elementos) =>
      elementos.map((elemento) => {
        const canvas = elemento as HTMLCanvasElement
        return {
          bitmap: [canvas.width, canvas.height],
          css: [canvas.clientWidth, canvas.clientHeight],
          dpr: Math.min(2, window.devicePixelRatio),
        }
      }),
    )
    for (const camada of dimensoes) {
      expect(camada.bitmap[0]).toBeCloseTo(camada.css[0]! * camada.dpr, 0)
      expect(camada.bitmap[1]).toBeCloseTo(camada.css[1]! * camada.dpr, 0)
    }
  })

  test('URL com percent-encoding malformado não derruba o bootstrap', async ({ page }) => {
    await page.goto('/#v=1&alpha=%E0%A4%A')
    await expect(page.locator('.camada-canvas')).toHaveCount(3)
    await expect(page.locator('#estado-cena')).toBeVisible()
  })

  test('mantém a cena no bfcache e retoma sem duplicar camadas', async ({ page }) => {
    await page.getByRole('button', { name: 'Reproduzir' }).click()
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })))
    await expect(page.locator('.camada-canvas')).toHaveCount(3)
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })))
    await expect(page.getByText('Simulação em movimento')).toBeVisible()
    await expect(page.locator('.camada-canvas')).toHaveCount(3)
  })

  test('produz pixels na camada dinâmica, além da geometria estática', async ({ page }) => {
    const pixels = await page.locator('.camada-dinamica').evaluate((elemento) => {
      const canvas = elemento as HTMLCanvasElement
      const contexto = canvas.getContext('2d')!
      const dados = contexto.getImageData(0, 0, canvas.width, canvas.height).data
      let opacos = 0
      for (let i = 3; i < dados.length; i += 4) if (dados[i]! > 0) opacos += 1
      return opacos
    })
    expect(pixels).toBeGreaterThan(50)
  })

  test('reproduz, pausa e atualiza o diagnóstico sem erros', async ({ page }) => {
    const cena = page.getByLabel('Cena do pêndulo')
    const descricao = page.locator('.cena-overlay')
    const inicial = await descricao.getAttribute('aria-label')
    await page.getByRole('button', { name: 'Reproduzir' }).click()
    await page.waitForTimeout(250)
    await expect(page.getByText('Simulação em movimento')).toBeVisible()
    await expect(page.locator('#diagnostico-cena')).toContainText('FPS')
    await expect(descricao).not.toHaveAttribute('aria-label', inicial ?? '')
    await page.getByRole('button', { name: 'Pausar' }).click()
    await expect(page.getByText('Simulação pausada')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Passo' })).not.toHaveAttribute('aria-pressed')
    await expect(cena.getByRole('button', { name: 'Zerar' })).not.toHaveAttribute('aria-pressed')
  })

  test('separa parar de zerar e preserva a execução ao zerar', async ({ page }) => {
    // Ancorado na cena: o painel de instrumentos também tem um botão de zerar,
    // e os dois zeram coisas diferentes.
    const cena = page.getByLabel('Cena do pêndulo')
    const descricao = page.locator('.cena-overlay')
    await page.getByRole('button', { name: 'Reproduzir' }).click()
    await page.waitForTimeout(150)
    await cena.getByRole('button', { name: 'Zerar' }).click()
    await expect(page.getByText('Simulação em movimento')).toBeVisible()
    await expect(descricao).toHaveAttribute('aria-label', /tempo 0\./)
    await page.getByRole('button', { name: 'Parar' }).click()
    await expect(page.getByText('Simulação parada')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Parar' })).toHaveAttribute('aria-pressed', 'true')
  })

  test('mostra simples e cicloidal alinhados na comparação', async ({ page }) => {
    await page.goto('/#v=1&modo=comparacao&alpha=120&theta0=120&execucao=rodando')
    await page.reload()
    await expect(page).toHaveURL(/modo=comparacao/)
    await expect(page.locator('.cena-overlay')).toHaveAttribute('aria-label', /simples:.*cicloidal:/)
    await expect(page.locator('#diagnostico-cena')).toContainText('dinâmica')
    await expect(page.locator('.cena-overlay')).toHaveAttribute('aria-label', /ângulo (?!1[0-9]{2})/)
  })

  test('normaliza alto contraste antes do primeiro desenho e oferece régua por teclado', async ({ page }) => {
    await page.goto('/#v=1&tema=altoContraste&regua=1')
    await page.reload()
    await expect(page).toHaveURL(/tema=altoContraste/)
    await expect(page.locator('html')).toHaveAttribute('data-tema', 'alto-contraste')
    const regua = page.getByRole('slider', { name: /Posição horizontal da régua/ })
    await expect(regua).toBeVisible()
    await expect(regua).toHaveAttribute('aria-valuemin')
    await expect(regua).toHaveAttribute('aria-valuemax')
    await expect(regua).toHaveAttribute('aria-valuetext', /pixels CSS/)
    const antes = await regua.boundingBox()
    await regua.focus()
    await regua.press('ArrowRight')
    const depois = await regua.boundingBox()
    expect(depois!.x).toBeGreaterThan(antes!.x)
  })

  test('repinta pixels estáticos após resize enquanto pausada', async ({ page }) => {
    const estatica = page.locator('.camada-estatica')
    await estatica.evaluate((elemento) => {
      const canvas = elemento as HTMLCanvasElement
      canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height)
    })
    expect(await checksumCanvas(estatica)).toBe(0)
    await page.setViewportSize({ width: 980, height: 720 })
    await expect.poll(() => checksumCanvas(estatica)).not.toBe(0)
  })

  test('repinta a paleta quando o tema muda enquanto pausada', async ({ page }) => {
    const estatica = page.locator('.camada-estatica')
    const antes = await checksumCanvas(estatica)
    await page.locator('html').evaluate((raiz) => { raiz.dataset['tema'] = 'escuro' })
    await expect.poll(() => checksumCanvas(estatica)).not.toBe(antes)
  })

  test('repinta a régua movida por teclado enquanto pausada', async ({ page }) => {
    await page.goto('/#v=1&regua=1')
    await page.reload()
    const estatica = page.locator('.camada-estatica')
    const antes = await checksumCanvas(estatica)
    const regua = page.getByRole('slider', { name: /Posição horizontal da régua/ })
    await regua.focus()
    await regua.press('ArrowRight')
    await expect.poll(() => checksumCanvas(estatica)).not.toBe(antes)
  })

  test('restaura o tempo na fonte por integração', async ({ page }) => {
    await page.goto('/#v=1&fonteMovimento=integracao&t=2.5')
    await page.reload()
    await expect(page.locator('.cena-overlay')).toHaveAttribute('aria-label', /tempo 2\.50 segundos/)
  })

  test('rejeita atrito no pivô com explicação, sem converter para viscoso', async ({ page }) => {
    await page.goto('/#v=1&modeloAtrito=pivo')
    await page.reload()
    await expect(page).toHaveURL(/modeloAtrito=pivo/)
    await expect(page.locator('#estado-cena')).toContainText('coeficiente de torque')
  })

  test('mantém orçamento de quadro em comparação com rastro', async ({ page }) => {
    await page.goto('/#v=1&modo=comparacao&execucao=rodando&rastro=1&rastroPeriodo=1')
    await page.reload()
    await page.waitForTimeout(2_000)
    const texto = await page.locator('#diagnostico-cena').textContent()
    const fps = Number(/FPS ([\d.]+)/.exec(texto ?? '')?.[1])
    const total = Number(/total ([\d.]+) ms/.exec(texto ?? '')?.[1])
    expect(fps).toBeGreaterThanOrEqual(55)
    expect(total).toBeLessThan(16.7)
  })
})
