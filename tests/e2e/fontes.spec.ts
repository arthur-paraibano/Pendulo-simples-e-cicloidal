import { expect, test, type Page } from '@playwright/test'

/**
 * Guarda do enxugamento do KaTeX.
 *
 * O produto entrega 6 das 20 fontes do KaTeX. O risco desse corte não é o erro
 * barulhento: fonte ausente **não** gera 404, porque o `@font-face`
 * correspondente também foi removido. O navegador cai numa fonte do sistema e a
 * fórmula fica sutilmente errada — o tipo de regressão que passa despercebida.
 *
 * Duas medidas foram descartadas por não detectarem o problema, e a razão fica
 * registrada para não serem tentadas de novo:
 *
 * - **Requisições que falham**: não há nenhuma. Sem `@font-face`, o navegador
 *   nem chega a pedir o arquivo.
 * - **Largura da expressão**: não muda. O KaTeX posiciona cada trecho com
 *   métricas próprias em CSS, então a caixa mede o mesmo com ou sem a fonte.
 *
 * O que funciona é confrontar duas coisas obtidas em tempo de execução:
 * o que o layout **exige** (`font-family` resolvida em cada trecho) contra o que
 * a página de fato **entrega** (`document.fonts`, que reflete os `@font-face`
 * presentes). Ambas saem da página real, então não há lista literal a manter em
 * sincronia — mexer no script de enxugamento move as duas pontas sozinho.
 */

interface Amostra {
  readonly exigidas: readonly string[]
  readonly entregues: readonly string[]
}

async function amostrar(page: Page): Promise<Amostra> {
  return page.evaluate(() => {
    const familiaKatex = (lista: string): string | undefined =>
      lista
        .split(',')
        .map((parte) => parte.trim().replace(/^["']|["']$/g, ''))
        .find((parte) => parte.startsWith('KaTeX_'))

    const exigidas = new Set<string>()
    for (const no of document.querySelectorAll('.katex, .katex *')) {
      if (no.textContent === null || no.textContent.trim() === '') continue
      const estilo = getComputedStyle(no)
      const familia = familiaKatex(estilo.fontFamily)
      if (familia === undefined) continue
      const estiloTexto = estilo.fontStyle === 'oblique' ? 'italic' : estilo.fontStyle
      exigidas.add(`${familia}/${estiloTexto}`)
    }

    const entregues = new Set<string>()
    for (const face of document.fonts) {
      if (face.family.startsWith('KaTeX_')) entregues.add(`${face.family}/${face.style}`)
    }

    return { exigidas: [...exigidas].sort(), entregues: [...entregues].sort() }
  })
}

test.describe('Enxugamento do KaTeX', () => {
  test('tudo que a fórmula exige está entre as fontes entregues', async ({ page }) => {
    await page.goto('/')
    await page.waitForFunction(() => document.fonts.status === 'loaded')

    const conferir = async (estado: string): Promise<readonly string[]> => {
      const { exigidas, entregues } = await amostrar(page)
      expect(exigidas.length, `${estado}: nenhuma fonte KaTeX resolvida na fórmula`).toBeGreaterThan(0)
      expect(entregues.length, `${estado}: nenhum @font-face do KaTeX na página`).toBeGreaterThan(0)

      const faltando = exigidas.filter((exigida) => !entregues.includes(exigida))
      expect(
        faltando,
        `${estado}: a fórmula exige ${faltando.join(', ')}, que a página não entrega. ` +
          'O texto cai para uma fonte do sistema e a matemática fica errada. ' +
          'Acrescente o arquivo em MANTIDAS, em scripts/enxugar-katex.mjs, e rode npm run katex:enxugar.',
      ).toEqual([])
      return exigidas
    }

    await conferir('simples')

    await page.getByRole('radio', { name: 'Cicloidal' }).click()
    await conferir('cicloidal')

    await page.getByRole('radio', { name: 'Ambos' }).click()
    await conferir('ambos')

    await page.getByRole('radio', { name: 'Simples' }).click()
    await page.getByText('Console de parâmetros', { exact: true }).click()

    // N alto alonga a expressão e eleva a raiz e os parênteses: é aqui que as
    // famílias Size1 a Size4 entram, se é que entram.
    for (const n of ['N=5', 'N=20', 'N=50']) {
      await page.locator('.param-console textarea').fill(n)
      await page.getByRole('button', { name: 'Aplicar linha' }).click()
      await page.waitForTimeout(200)
      await conferir(`simples com ${n}`)
    }
  })

  test('a página não entrega fonte que a fórmula nunca pede', async ({ page }) => {
    // O outro lado do corte: peso morto no pacote. Falha branda, por isso
    // apenas as famílias de delimitador são toleradas como folga deliberada —
    // o tamanho do delimitador depende da altura do conteúdo.
    await page.goto('/')
    await page.waitForFunction(() => document.fonts.status === 'loaded')
    await page.getByText('Console de parâmetros', { exact: true }).click()
    await page.locator('.param-console textarea').fill('N=50')
    await page.getByRole('button', { name: 'Aplicar linha' }).click()
    await page.waitForTimeout(300)

    const { exigidas, entregues } = await amostrar(page)
    const sobrando = entregues.filter(
      (entregue) => !exigidas.includes(entregue) && !entregue.startsWith('KaTeX_Size'),
    )
    expect(
      sobrando,
      `fontes entregues sem uso: ${sobrando.join(', ')}. ` +
        'Remova de MANTIDAS em scripts/enxugar-katex.mjs para não carregar peso morto.',
    ).toEqual([])
  })

  test('nenhuma requisição de fonte falha', async ({ page }) => {
    const falhas: string[] = []
    page.on('response', (resposta) => {
      const url = resposta.url()
      if (url.endsWith('.woff2') && !resposta.ok()) {
        falhas.push(`${resposta.status()} ${url.split('/').pop() ?? url}`)
      }
    })

    await page.goto('/')
    await page.waitForFunction(() => document.fonts.status === 'loaded')
    await page.getByRole('radio', { name: 'Ambos' }).click()
    await page.waitForTimeout(300)

    expect(falhas, `fontes que falharam: ${falhas.join(', ')}`).toHaveLength(0)
  })
})
