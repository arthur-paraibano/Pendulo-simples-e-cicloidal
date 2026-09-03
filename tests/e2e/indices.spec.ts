import { expect, test, type Page } from '@playwright/test'

async function aplicarParametros(page: Page, linha: string): Promise<void> {
  const resumo = page.getByText('Console de parâmetros', { exact: true })
  const console = page.locator('.param-console textarea')
  if (!(await console.isVisible())) await resumo.click()
  await console.fill(linha)
  await page.getByRole('button', { name: 'Aplicar linha' }).click()
}

const campo = (page: Page, id: string) => page.locator(`[data-parametro="${id}"] input[type="text"]`)
const metrica = (page: Page, id: string) => page.locator(`[data-metrica="${id}"]`).first()

test.describe('Fase 5b — parâmetros indexados e altura de largada', () => {
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

  // ── Largada por altura (RF-157, RF-158) ────────────────────────────────────

  test('define a largada pela altura, e o ângulo acompanha (RF-157)', async ({ page }) => {
    // Como o experimento é conduzido na bancada: mede-se a altura, não o ângulo.
    await aplicarParametros(page, 'L = 1; h = 0.5')
    await expect(campo(page, 'alpha')).toHaveValue('60,0')
    await expect(campo(page, 'theta0')).toHaveValue('60,0')
  })

  test('a relação h ↔ α segue a geometria do modo (RF-158)', async ({ page }) => {
    // No arco do simples a massa sobe L(1 − cos α): a 90° sobe o L inteiro.
    await aplicarParametros(page, 'L = 1; alpha = 90')
    await expect(campo(page, 'h0')).toHaveValue('1,0000')

    // Na face cicloidal ela sobe L·sen²θ/2, cujo topo é 2r = L/2.
    await aplicarParametros(page, 'MODO = cicloidal; alpha = 90')
    await expect(campo(page, 'h0')).toHaveValue('0,5000')
  })

  test('recusa altura acima do topo da face, comunicando o ajuste (RF-160)', async ({ page }) => {
    await aplicarParametros(page, 'MODO = cicloidal; L = 1; h = 5')
    await expect(campo(page, 'h0')).toHaveValue('0,5000')
    await expect(page.locator('.param-console-resultado')).toContainText('acima do máximo')
  })

  // ── Endereçamento indexado (RF-151 a RF-156) ───────────────────────────────

  test('aceita as três grafias do índice (RF-152)', async ({ page }) => {
    await aplicarParametros(page, 'n_p = 3')
    for (const linha of ['L₂ = 2', 'L2 = 3', 'L_2 = 4']) {
      await aplicarParametros(page, linha)
      await expect(page.locator('.param-console-resultado')).not.toContainText('desconhecido')
    }
  })

  test('índice inexistente nomeia a faixa e nada altera (RF-155)', async ({ page }) => {
    await aplicarParametros(page, 'n_p = 2')
    await aplicarParametros(page, 'L₅ = 3')
    await expect(page.locator('.param-console-resultado')).toContainText('1 a 2')
    await expect(campo(page, 'L')).toHaveValue('1,000')
  })

  test('diz qual interpretação adotou para uma linha sem índice (RF-153)', async ({ page }) => {
    await aplicarParametros(page, 'n_p = 3')
    await aplicarParametros(page, 'L = 2')
    await expect(page.locator('.param-console-resultado')).toContainText('3 pêndulos')
  })

  test('acopla e desacopla pelo controle, com o estado visível (RF-154)', async ({ page }) => {
    // Com um pêndulo só não há o que acoplar, e o botão não aparece.
    const botao = page.locator('[data-acoplamento="L"]')
    await expect(botao).toBeHidden()

    await aplicarParametros(page, 'n_p = 2')
    await expect(botao).toBeVisible()
    await expect(botao).toHaveAttribute('aria-pressed', 'true')

    await botao.click()
    await expect(botao).toHaveAttribute('aria-pressed', 'false')
    // Desacoplado, o rótulo passa a nomear o pêndulo que está sendo editado.
    await expect(page.locator('[data-parametro="L"] label strong')).toHaveText('L₁')

    await botao.click()
    await expect(botao).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('[data-parametro="L"] label strong')).toHaveText('L')
  })

  test('o estado gerado descreve os pêndulos um a um (RF-156)', async ({ page }) => {
    // A escrita do endereço compartilhável é da Fase 8 (T112); o que a Fase 5b
    // garante é que o bloco reimportável já fala de cada pêndulo.
    await aplicarParametros(page, 'n_p = 3; MODO = cicloidal; L = 1')
    await aplicarParametros(page, 'h₁ = 0.05; h₂ = 0.2; h₃ = 0.45')
    await page.getByRole('button', { name: 'Gerar estado atual' }).click()

    const bloco = await page.locator('.param-console textarea').inputValue()
    expect(bloco).toContain('theta0_1')
    expect(bloco).toContain('theta0_2')
    expect(bloco).toContain('theta0_3')
  })

  // ── Tautocronia com alturas diferentes (RF-159, Cenário 4.9) ───────────────

  test('massas soltas de alturas diferentes mantêm o mesmo período (Cenário 4.9)', async ({
    page,
  }) => {
    await aplicarParametros(page, 'n_p = 3; MODO = cicloidal; L = 1')
    const isocrono = '2,006067 s'
    await expect(metrica(page, 'T')).toHaveText(isocrono)

    // É esta a assinatura da tautocronia: mudar a altura de largada não muda
    // o período, e por isso as três massas chegam juntas ao ponto zero.
    for (const h of [0.05, 0.2, 0.45]) {
      await aplicarParametros(page, `h = ${h}`)
      await expect(metrica(page, 'T')).toHaveText(isocrono)
    }
  })

  test('desenha um pêndulo por índice, sem sobrepor as anotações', async ({ page }) => {
    await aplicarParametros(page, 'n_p = 3; MODO = cicloidal; L = 1; FONTE = integracao')
    await aplicarParametros(page, 'h₁ = 0.05; h₂ = 0.2; h₃ = 0.45')
    await page.getByRole('button', { name: 'Reproduzir' }).click()
    await page.waitForTimeout(400)

    await expect(page.getByText('Simulação em movimento')).toBeVisible()
    // A taxa deixa de ser inventada a partir de um intervalo nulo.
    await expect(page.locator('#diagnostico-cena')).not.toContainText('FPS 1000000')
  })
})
