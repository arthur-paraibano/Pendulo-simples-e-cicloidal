import { expect, test, type Page } from '@playwright/test'

async function aplicarParametros(page: Page, linha: string): Promise<void> {
  const resumo = page.getByText('Console de parâmetros', { exact: true })
  const console = page.locator('.param-console textarea')
  if (!(await console.isVisible())) await resumo.click()
  await console.fill(linha)
  await page.getByRole('button', { name: 'Aplicar linha' }).click()
}

async function carregarPreset(page: Page, id: string): Promise<void> {
  await page.getByLabel('Preset a carregar').selectOption(id)
  await page.getByRole('button', { name: 'Carregar preset' }).click()
}

/** Captura o conteúdo do arquivo que a página tenta baixar. */
async function capturarDownload(page: Page, acao: () => Promise<void>): Promise<{
  nome: string
  texto: string
}> {
  const espera = page.waitForEvent('download')
  await acao()
  const download = await espera
  const fluxo = await download.createReadStream()
  const partes: Buffer[] = []
  for await (const pedaco of fluxo) partes.push(pedaco as Buffer)
  return { nome: download.suggestedFilename(), texto: Buffer.concat(partes).toString('utf8') }
}

test.describe('Fase 8 — cenários, roteiros e exportação', () => {
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

  // ── Cenário 7 ──────────────────────────────────────────────────────────────

  test('reproduz o experimento do roteiro alemão (Cenário 7)', async ({ page }) => {
    await carregarPreset(page, 'roteiro-alemao')
    await expect(page.locator('.cenarios-aviso')).toContainText('carregado')
    await expect(page.locator('[data-parametro="L"] input[type="text"]')).toHaveValue('1,000')
    await expect(page.getByLabel('Grandeza medida pelo sensor')).toHaveValue('meioPeriodo')

    // 7.2 a 7.4: o meio período cresce alguns milissegundos com a amplitude.
    const tabela = page.getByRole('table', { name: /Medições do sensor/ })
    const esperado: readonly (readonly [number, string])[] = [
      [1, '1,0031'],
      [10, '1,0049'],
      [20, '1,0107'],
    ]
    for (const [alpha, meio] of esperado) {
      await aplicarParametros(page, `theta0 = ${alpha}`)
      await page.getByRole('button', { name: 'Coletar agora' }).click()
      await expect(tabela.locator('tbody tr[data-medicao]').last().locator('[data-coluna="T"]'))
        .toHaveText(meio)
    }

    // 7.8: encostado no perfil cicloidal, o meio período para de depender de α.
    await aplicarParametros(page, 'MODO = cicloidal')
    for (const alpha of [1, 10, 20]) {
      await aplicarParametros(page, `theta0 = ${alpha}`)
      await page.getByRole('button', { name: 'Coletar agora' }).click()
      await expect(tabela.locator('tbody tr[data-medicao]').last().locator('[data-coluna="T"]'))
        .toHaveText('1,0030')
    }
  })

  // ── Cenário 8 ──────────────────────────────────────────────────────────────

  test('descobre a gravidade do Planeta X (Cenário 8)', async ({ page }) => {
    await carregarPreset(page, 'planeta-x')
    const estado = page.locator('[data-leitura="desafio-estado"]')
    await expect(estado).toContainText('oculta')

    // 8.2: coletar e estimar a partir da tabela.
    for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Coletar agora' }).click()
    await page.getByRole('button', { name: 'Estimar da tabela' }).click()
    const estimativa = page.getByLabel(/estimativa de g/)
    await expect(estimativa).not.toHaveValue('')

    // 8.3: só a submissão revela a comparação.
    const veredito = page.locator('[data-leitura="desafio-veredito"]')
    await expect(veredito).toBeEmpty()
    await page.getByRole('button', { name: 'Submeter estimativa' }).click()
    await expect(veredito).toContainText('14,2000')
    await expect(veredito).toHaveAttribute('data-acertou', 'true')
    await expect(estado).toContainText('revelada')

    // E o desafio pode recomeçar, voltando a ocultar o valor.
    await page.getByRole('button', { name: 'Reiniciar desafio' }).click()
    await expect(estado).toContainText('oculta')
    await expect(veredito).toBeEmpty()
  })

  test('uma estimativa ingênua a 60° erra por volta de 13 % (Cenário 8.4)', async ({ page }) => {
    await carregarPreset(page, 'planeta-x')
    await aplicarParametros(page, 'theta0 = 60')
    await page.getByRole('button', { name: 'Coletar agora' }).click()

    // A coluna ingênua é a que ignora os termos de correção — é dela que vem o
    // erro de modelo que o cenário quer evidenciar.
    const linha = page.getByRole('table', { name: /Medições do sensor/ }).locator('tbody tr[data-medicao]').last()
    const ingenuo = Number((await linha.locator('[data-coluna="gInferidoIngenuo"]').innerText()).replace(',', '.'))
    const corrigido = Number((await linha.locator('[data-coluna="gInferido"]').innerText()).replace(',', '.'))
    expect(Math.abs(ingenuo - 14.2) / 14.2).toBeGreaterThan(0.1)
    expect(corrigido).toBeCloseTo(14.2, 1)
  })

  // ── Cenário 10 ─────────────────────────────────────────────────────────────

  test('exporta a tabela em CSV conforme o contrato (Cenário 10.1 a 10.3)', async ({ page }) => {
    await aplicarParametros(page, 'theta0 = 45')
    await page.getByRole('button', { name: 'Coletar agora' }).click()

    const { nome, texto } = await capturarDownload(page, () =>
      page.getByRole('button', { name: 'Exportar CSV' }).click(),
    )
    expect(nome).toMatch(/^pendulo-medicoes-\d{4}-\d{2}-\d{2}-\d{4}\.csv$/)
    expect(texto.charCodeAt(0)).toBe(0xfeff)
    expect(texto).toContain('# Sensor: fixo no ponto zero (theta = 0)')
    expect(texto).toContain('# Estado completo: ')

    const linhas = texto.split('\r\n').filter((l) => l !== '' && !l.startsWith('﻿#') && !l.startsWith('#'))
    const cabecalho = linhas[0]!.replace('﻿', '').split(';')
    expect(cabecalho.slice(0, 7)).toEqual([
      'n',
      'pendulo',
      'T_s',
      'g_inferido_m_s2',
      'alpha_graus',
      'L_m',
      'erro_relativo_pct',
    ])
    // 10.3: a linha de 45° no modo simples.
    const dados = linhas[1]!.split(';')
    expect(dados[2]).toBe('2,086256')
    expect(dados[3]).toBe('9,803478')
  })

  test('o endereço compartilhável restaura e reserializa igual (Cenário 10.4 a 10.6)', async ({
    page,
  }) => {
    await aplicarParametros(page, 'theta0 = 45; L = 1.5; N = 3')
    await expect.poll(() => page.evaluate(() => globalThis.location.hash)).toContain('theta0=45')

    const endereco = await page.evaluate(() => globalThis.location.href)
    expect(endereco).toContain('v=1')
    expect(endereco).toContain('vis=simples')

    // 10.5: abrir noutra aba restaura o mesmo estado.
    await page.goto(endereco)
    await expect(page.locator('[data-parametro="L"] input[type="text"]')).toHaveValue('1,500')
    await expect(page.locator('[data-parametro="theta0"] input[type="text"]')).toHaveValue('45,0')

    // 10.6: reserializar dá o mesmo endereço, caractere a caractere.
    await expect.poll(() => page.evaluate(() => globalThis.location.href)).toBe(endereco)
  })

  test('exporta a imagem da cena carimbada (Cenário 10.7)', async ({ page }) => {
    await aplicarParametros(page, 'theta0 = 30')
    const espera = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportar imagem' }).click()
    const download = await espera
    expect(download.suggestedFilename()).toMatch(/^pendulo-cena-\d{4}-\d{2}-\d{2}-\d{4}\.png$/)
  })

  // ── Presets e roteiros ─────────────────────────────────────────────────────

  test('salva, renomeia e exclui um cenário do usuário (RF-098)', async ({ page }) => {
    await aplicarParametros(page, 'theta0 = 33')
    const nome = page.getByLabel('Nome do cenário a salvar')
    const seletor = page.getByLabel('Preset a carregar')

    await nome.fill('Meu ensaio')
    await page.getByRole('button', { name: 'Salvar cenário' }).click()
    await expect(seletor).toHaveValue('meu-ensaio')
    await expect(page.locator('.cenarios-aviso')).toContainText('salvo')

    await nome.fill('Ensaio renomeado')
    await page.getByRole('button', { name: 'Renomear' }).click()
    await expect(seletor.locator('option[value="meu-ensaio"]')).toHaveText('Ensaio renomeado')

    await page.getByRole('button', { name: 'Excluir' }).click()
    await expect(seletor.locator('option[value="meu-ensaio"]')).toHaveCount(0)
  })

  test('o cenário exportado é um arquivo reimportável (RF-099)', async ({ page }) => {
    await aplicarParametros(page, 'theta0 = 33; L = 1.25')
    const { nome, texto } = await capturarDownload(page, () =>
      page.getByRole('button', { name: 'Exportar cenário' }).click(),
    )
    expect(nome).toMatch(/\.json$/)
    const preset: { parametros: Record<string, unknown> } = JSON.parse(texto)
    expect(preset.parametros['L']).toBeCloseTo(1.25, 6)
    expect(preset.parametros['theta0']).toBeCloseTo(33, 6)
  })

  test('o roteiro avança, volta e sai sem perder o que foi mexido (RF-101)', async ({ page }) => {
    await page.getByRole('button', { name: 'Iniciar roteiro' }).click()
    const titulo = page.locator('.roteiro-passo-titulo')
    await expect(titulo).toContainText('Passo 1 de 4')
    await expect(page.locator('.roteiro-pergunta')).toContainText('?')
    await expect(page.getByRole('button', { name: 'Passo anterior' })).toBeDisabled()

    await page.getByRole('button', { name: 'Próximo passo' }).click()
    await expect(titulo).toContainText('Passo 2 de 4')

    // Mexer num parâmetro à mão não encerra o roteiro nem rebobina o passo.
    // O que sobrevive é o progresso; um passo revisitado reaplica a sua
    // configuração, que é justamente para o que o passo existe.
    await aplicarParametros(page, 'm = 2')
    await expect(titulo).toContainText('Passo 2 de 4')
    await expect(page.locator('[data-parametro="m"] input[type="text"]')).toHaveValue('2,00')

    await page.getByRole('button', { name: 'Passo anterior' }).click()
    await expect(titulo).toContainText('Passo 1 de 4')
    // A massa não é tocada por passo nenhum, e por isso atravessa a navegação.
    await expect(page.locator('[data-parametro="m"] input[type="text"]')).toHaveValue('2,00')

    await page.getByRole('button', { name: 'Sair do roteiro' }).click()
    await expect(titulo).toBeEmpty()
    // Sair não é desfazer: o estado alcançado permanece.
    await expect(page.locator('[data-parametro="theta0"] input[type="text"]')).toHaveValue('5,0')
    await expect(page.locator('[data-parametro="m"] input[type="text"]')).toHaveValue('2,00')
  })

  test('as medições aparecem sobre a curva teórica (RF-103)', async ({ page }) => {
    await aplicarParametros(page, 'theta0 = 45')
    await page.getByRole('button', { name: 'Coletar agora' }).click()
    await page.getByLabel('Gráfico exibido').selectOption('periodo-por-amplitude')
    await expect(page.locator('.graficos-descricao')).toContainText('1 ponto(s) medido(s)')
    await expect(page.locator('.graficos-legenda [data-serie="medicoes"]')).toBeVisible()
  })
})
