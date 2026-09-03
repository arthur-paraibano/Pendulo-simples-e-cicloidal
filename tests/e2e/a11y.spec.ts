import { expect, test } from '@playwright/test'

test.describe('Fase 9 — Acessibilidade e Operação por Teclado (Cenário 11)', () => {
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

  test('11.1 — Ordem de foco e skip links', async ({ page }) => {
    // Primeiro Tab atinge o skip link para o conteúdo principal
    await page.keyboard.press('Tab')
    const ativo = page.locator(':focus')
    await expect(ativo).toHaveClass(/skip-link/)
    await expect(ativo).toHaveAttribute('href', '#principal')

    // Segundo Tab atinge o skip link para os parâmetros
    await page.keyboard.press('Tab')
    await expect(page.locator(':focus')).toHaveAttribute('href', '#painel-parametros')
  })

  test('11.2 — Alternar modo de visualização pelo teclado', async ({ page }) => {
    const seletorSimples = page.getByRole('radio', { name: /Simples/ })
    await seletorSimples.focus()
    await expect(seletorSimples).toBeChecked()

    // Seta para a direita vai para Cicloidal
    await page.keyboard.press('ArrowRight')
    const seletorCicloidal = page.getByRole('radio', { name: /Cicloidal/ })
    await expect(seletorCicloidal).toBeChecked()

    // Seta para a direita vai para Ambos
    await page.keyboard.press('ArrowRight')
    const seletorAmbos = page.getByRole('radio', { name: /Ambos/ })
    await expect(seletorAmbos).toBeChecked()
  })

  test('11.3 — Modificar parâmetros com setas e teclado', async ({ page }) => {
    const campoAlpha = page.locator('[data-parametro="alpha"] input[type="text"]')
    await campoAlpha.focus()
    await expect(campoAlpha).toHaveValue('10,0')

    // Seta para cima incrementa o passo (0,1°)
    await page.keyboard.press('ArrowUp')
    await expect(campoAlpha).toHaveValue('10,1')

    // Seta para baixo decrementa o passo
    await page.keyboard.press('ArrowDown')
    await expect(campoAlpha).toHaveValue('10,0')
  })

  test('11.4 — Digitação sem clamp no dígito intermediário', async ({ page }) => {
    const campoAlpha = page.locator('[data-parametro="alpha"] input[type="text"]')
    await campoAlpha.click()
    await page.keyboard.press('Control+A')
    await page.keyboard.type('4')
    // Não foi clampado enquanto digita
    await expect(campoAlpha).toHaveValue('4')
    await page.keyboard.type('5')
    await page.keyboard.press('Tab')
    await expect(campoAlpha).toHaveValue('45,0')
  })

  test('11.6 — Anel de foco visível nos temas', async ({ page }) => {
    const temas = ['claro', 'escuro', 'altoContraste']
    for (const tema of temas) {
      await page.evaluate((t) => {
        document.documentElement.dataset.tema = t === 'altoContraste' ? 'alto-contraste' : t
      }, tema)

      const botaoReproduzir = page.getByRole('button', { name: 'Reproduzir' })
      await botaoReproduzir.focus()
      const outline = await botaoReproduzir.evaluate((el) => {
        const estilo = window.getComputedStyle(el)
        return {
          outlineWidth: estilo.outlineWidth,
          outlineStyle: estilo.outlineStyle,
        }
      })
      expect(outline.outlineStyle).not.toBe('none')
    }
  })

  test('11.5 — Navegar a tabela de coleta com as setas', async ({ page }) => {
    await page.getByRole('button', { name: 'Coletar agora' }).click()
    await page.getByRole('button', { name: 'Coletar agora' }).click()

    const tabela = page.getByRole('table', { name: /Medições do sensor/ })
    const primeira = tabela.locator('tbody tr[data-medicao="1"] td').first()
    await primeira.focus()
    await expect(primeira).toBeFocused()

    // Move célula a célula, e o foco roteirizado deixa apenas a célula corrente
    // alcançável por Tab — sem isso, uma tabela de cem linhas viraria uma
    // armadilha de tabulação.
    await page.keyboard.press('ArrowRight')
    const segunda = tabela.locator('tbody tr[data-medicao="1"] td').nth(1)
    await expect(segunda).toBeFocused()
    await expect(segunda).toHaveAttribute('tabindex', '0')
    await expect(primeira).toHaveAttribute('tabindex', '-1')

    await page.keyboard.press('ArrowDown')
    await expect(tabela.locator('tbody tr[data-medicao="2"] td').nth(1)).toBeFocused()

    await page.keyboard.press('ArrowUp')
    await expect(segunda).toBeFocused()
  })

  test('11.8 — Fórmula contém saída MathML para leitor de tela', async ({ page }) => {
    const mathml = page.locator('#formula math')
    await expect(mathml.first()).toBeAttached()
  })

  test('a região de anúncios existe e é discreta (RF-119)', async ({ page }) => {
    const regiao = page.locator('#a11y-live-region')
    await expect(regiao).toHaveAttribute('aria-live', 'polite')
    await expect(regiao).toHaveAttribute('role', 'status')
    // `polite` e não `assertive`: o anúncio espera a pausa do leitor em vez de
    // interromper o que o usuário está ouvindo.
    await expect(regiao).toHaveClass(/sr-only/)
  })

  test('paleta e densidade viram atributos na raiz (RF-121)', async ({ page }) => {
    const raiz = page.locator('html')
    await expect(raiz).toHaveAttribute('data-densidade', /\S/)
    await expect(raiz).not.toHaveAttribute('data-paleta-daltonismo', 'true')

    const resumo = page.getByText('Console de parâmetros', { exact: true })
    const consoleParametros = page.locator('.param-console textarea')
    if (!(await consoleParametros.isVisible())) await resumo.click()
    await consoleParametros.fill('DALT = ligado; FS = compacta')
    await page.getByRole('button', { name: 'Aplicar linha' }).click()

    await expect(raiz).toHaveAttribute('data-paleta-daltonismo', 'true')
    await expect(raiz).toHaveAttribute('data-densidade', 'compacta')
  })
})

test.describe('Fase 9 — Movimento Reduzido (Cenário 11.7)', () => {
  // Desde a 1.62 a preferência entra pelo contexto, e não como opção de teste.
  test.use({ contextOptions: { reducedMotion: 'reduce' } })

  test('inicia a simulação pausada quando o sistema prefere movimento reduzido', async ({ page }) => {
    await page.goto('/')
    const estado = page.locator('#estado-cena')
    await expect(estado).toContainText('pausada')
    await expect(page.locator('html')).toHaveAttribute('data-movimento-reduzido', 'true')
  })
})
