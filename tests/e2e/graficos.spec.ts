import { expect, test, type Page } from '@playwright/test'

async function aplicarParametros(page: Page, linha: string): Promise<void> {
  const resumo = page.getByText('Console de parâmetros', { exact: true })
  const console = page.locator('.param-console textarea')
  if (!(await console.isVisible())) await resumo.click()
  await console.fill(linha)
  await page.getByRole('button', { name: 'Aplicar linha' }).click()
}

const metrica = (page: Page, id: string) => page.locator(`[data-metrica="${id}"]`).first()

test.describe('Fase 7 — gráficos e convergência', () => {
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

  // ── Cenário 3 ──────────────────────────────────────────────────────────────

  test('o período cresce com a amplitude e a confiança se degrada (Cenário 3)', async ({
    page,
  }) => {
    const esperado = [
      { alpha: 10, T: '2,009893', razao: '1,001907', confianca: 'excelente' },
      { alpha: 20, T: '2,021446', razao: '1,007666', confianca: 'excelente' },
      { alpha: 45, T: '2,085562', razao: '1,039628', confianca: 'excelente' },
      { alpha: 60, T: '2,149077', razao: '1,071289', confianca: 'boa' },
      { alpha: 90, T: '2,327351', razao: '1,160156', confianca: 'limitada' },
      { alpha: 120, T: '2,540887', razao: '1,266602', confianca: 'inadequada' },
    ]

    let anterior = 0
    for (const caso of esperado) {
      await aplicarParametros(page, `alpha=${caso.alpha}`)
      await expect(metrica(page, 'T')).toHaveText(`${caso.T} s`)
      await expect(metrica(page, 'razao')).toHaveText(caso.razao)
      await expect(metrica(page, 'confianca')).toHaveAttribute('data-confianca', caso.confianca)

      // O crescimento é monotônico: é a afirmação central da História 3.
      const T = Number(caso.T.replace(',', '.'))
      expect(T).toBeGreaterThan(anterior)
      anterior = T
    }
  })

  test('a série subestima o exato, e mais termos aproximam (Cenário 3.7 e 3.9)', async ({
    page,
  }) => {
    await aplicarParametros(page, 'alpha=90')
    // 3.7: erro negativo — a série truncada sempre fica abaixo do exato.
    const erro = await metrica(page, 'erroRelativo').textContent()
    expect(Number(erro!.replace(' %', '').replace(',', '.'))).toBeCloseTo(-1.71, 2)

    await aplicarParametros(page, 'N=10')
    await expect(metrica(page, 'T')).toHaveText('2,367790 s')
  })

  test('com N = 2 a razão satura em 89/64 enquanto o exato dispara (Cenário 3.10)', async ({
    page,
  }) => {
    await aplicarParametros(page, 'alpha=179.9; N=2')
    await expect(metrica(page, 'razao')).toHaveText('1,390625')
  })

  // ── Cenário 9 ──────────────────────────────────────────────────────────────

  test('a série converge termo a termo para o exato (Cenário 9)', async ({ page }) => {
    await aplicarParametros(page, 'alpha=90')
    for (const [N, razao] of [
      [1, '1,125000'],
      [2, '1,160156'],
      [3, '1,172363'],
      [5, '1,178929'],
      [10, '1,180315'],
    ] as const) {
      await aplicarParametros(page, `N=${N}`)
      await expect(metrica(page, 'razao')).toHaveText(razao)
    }
  })

  test('o gráfico de convergência informa o custo em termos (Cenário 9.8)', async ({ page }) => {
    await aplicarParametros(page, 'alpha=90')
    await page.getByLabel('Gráfico exibido').selectOption('convergencia')

    const descricao = page.locator('.graficos-descricao')
    await expect(descricao).toHaveText('Nesta amplitude: N ≥ 6 para 0,1 %; N ≥ 9 para 0,01 %.')

    // A 150° o custo estoura o teto N ≤ 50, e a interface diz isso em vez de
    // exibir um número que o usuário não conseguiria configurar.
    await aplicarParametros(page, 'alpha=150')
    await expect(descricao).toContainText('mais de 50 termos para 0,1 %')
  })

  test('a legenda formata conforme a grandeza do eixo', async ({ page }) => {
    await aplicarParametros(page, 'alpha=10; N=2')
    await page.getByLabel('Gráfico exibido').selectOption('convergencia')

    // Contagem de termos é inteira: "N = 2,0000" seria um erro de categoria.
    await expect(page.locator('.graficos-legenda-x')).toHaveText('Número de termos N = 2')
    // Num eixo logarítmico a notação fixa colapsaria 4,3e-8 em "0,000000".
    await expect(page.locator('.graficos-legenda dd').first()).toHaveText('4,297e-8')
  })

  test('o erro decai monotonicamente com N, sempre negativo (Cenário 9.7)', async ({ page }) => {
    await aplicarParametros(page, 'alpha=90')
    let anterior = Number.POSITIVE_INFINITY
    for (const N of [1, 2, 3, 5, 10]) {
      await aplicarParametros(page, `N=${N}`)
      const texto = await metrica(page, 'erroRelativo').textContent()
      const erro = Number(texto!.replace(' %', '').replace(',', '.'))
      expect(erro).toBeLessThan(0)
      expect(Math.abs(erro)).toBeLessThan(anterior)
      anterior = Math.abs(erro)
    }
  })

  // ── Painel de gráficos ─────────────────────────────────────────────────────

  test('cada gráfico desenha, se descreve e lê valores sob o cursor', async ({ page }) => {
    const seletor = page.getByLabel('Gráfico exibido')
    const tela = page.locator('.graficos-tela')
    const descricao = page.locator('.graficos-descricao')

    const ids = await seletor
      .locator('option')
      .evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value))
    expect(ids).toHaveLength(7)

    for (const id of ids) {
      await seletor.selectOption(id)
      await expect(tela).toBeVisible()
      await expect(descricao).not.toBeEmpty()
      // O canvas anuncia o que mostra: sem isso o gráfico é opaco ao leitor de tela.
      await expect(tela).toHaveAttribute('aria-label', /\S/)
      expect(await tela.evaluate((el) => (el as HTMLCanvasElement).width)).toBeGreaterThan(0)
    }

    // Sem cursor a legenda lê no marcador do valor corrente, não na borda.
    await seletor.selectOption('periodo-por-amplitude')
    const cabecalhoX = page.locator('.graficos-legenda-x')
    await expect(cabecalhoX).toHaveAttribute('data-origem', 'marcador')
    await expect(cabecalhoX).toContainText('10,0000')

    // A caixa vem em coordenadas de viewport: sem trazer a tela para a área
    // visível, o ponteiro cairia em outro elemento.
    await tela.scrollIntoViewIfNeeded()
    const caixa = (await tela.boundingBox())!
    await page.mouse.move(caixa.x + caixa.width * 0.7, caixa.y + caixa.height / 2)
    await expect(cabecalhoX).toHaveAttribute('data-origem', 'cursor')
  })

  test('no cicloidal o gráfico de convergência diz que não há o que convergir', async ({
    page,
  }) => {
    await aplicarParametros(page, 'MODO=cicloidal')
    await page.getByLabel('Gráfico exibido').selectOption('convergencia')
    await expect(page.locator('.graficos-descricao')).toContainText('não há o que convergir')
  })

  // ── RNF-001 com gráficos ativos ────────────────────────────────────────────

  test('mantém o orçamento de quadro com gráfico temporal ativo (RNF-001)', async ({ page }) => {
    await page.getByLabel('Gráfico exibido').selectOption('temporal')
    await aplicarParametros(page, 'rodando=1')

    const quadros = await page.evaluate(
      () =>
        new Promise<number[]>((resolve) => {
          const marcas: number[] = []
          let anterior = performance.now()
          const passo = (): void => {
            const agora = performance.now()
            marcas.push(agora - anterior)
            anterior = agora
            if (marcas.length < 90) requestAnimationFrame(passo)
            else resolve(marcas)
          }
          requestAnimationFrame(passo)
        }),
    )

    // Descarta o aquecimento inicial e mede a mediana: um pico isolado de GC
    // não é regressão de desempenho, mas um quadro típico acima do orçamento é.
    const estaveis = quadros.slice(15).sort((a, b) => a - b)
    const mediana = estaveis[Math.floor(estaveis.length / 2)]!
    expect(mediana).toBeLessThan(20)
  })
})
