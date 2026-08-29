/** Tabela semântica de coleta: visão imediata do caderno de laboratório. */

import type { RuntimeCena, PassagemRuntime } from '../app/runtime.js'
import type { ModoPendulo } from '../physics/types.js'
import {
  type GrandezaMedida,
  type Medicao,
  type ResumoEstatistico,
} from '../state/measurements.js'
import type { Store } from '../state/store.js'

type DirecaoOrdenacao = 'asc' | 'desc'
type ColunaOrdenavel = keyof Medicao

export interface TabelaColeta {
  reiniciarSensor(): void
  destruir(): void
}

interface OpcoesTabela {
  readonly confirmar?: (mensagem: string) => boolean
  readonly anunciar?: (mensagem: string) => void
}

const CHAVES_REINICIO_SENSOR = [
  'L', 'alpha', 'theta0', 'omega0', 'g', 'dt', 'integrador', 'fonteMovimento',
  'modeloAtrito', 'b', 'zeta', 'cq', 'amplitudeForcamento', 'omegaForcamento',
  'faseForcamento',
] as const

/** Mantém o DOM da tabela pequeno mesmo com o teto de 10 mil medições. */
export const LINHAS_POR_PAGINA = 100

const CABECALHOS: readonly { readonly chave: ColunaOrdenavel; readonly rotulo: string }[] = [
  { chave: 'n', rotulo: '#' },
  { chave: 'pendulo', rotulo: 'Pêndulo' },
  { chave: 'T', rotulo: 'T' },
  { chave: 'grandeza', rotulo: 'Grandeza' },
  { chave: 'gInferido', rotulo: 'g inferido' },
  { chave: 'gInferidoIngenuo', rotulo: 'g ingênuo' },
  { chave: 'gConfigurado', rotulo: 'g configurado' },
  { chave: 'alphaGraus', rotulo: 'α' },
  { chave: 'L', rotulo: 'L' },
  { chave: 'Tteorico', rotulo: 'T teórico' },
  { chave: 'erroRelativo', rotulo: 'Erro' },
  { chave: 'origem', rotulo: 'Origem' },
]

const formatar = (valor: number, casas: number): string => valor.toLocaleString('pt-BR', {
  minimumFractionDigits: casas,
  maximumFractionDigits: casas,
  useGrouping: false,
})

const rotuloModo = (modo: ModoPendulo): string => modo === 'simples' ? 'Simples' : 'Cicloidal'

function formatarEstatistica(valor: number | null, casas: number): string {
  return valor === null ? '—' : formatar(valor, casas)
}

function visivelNoModo(modoExibido: string, pendulo: ModoPendulo): boolean {
  return modoExibido === 'comparacao' || modoExibido === pendulo
}

export function criarTabelaColeta(
  recipiente: HTMLElement,
  store: Store,
  runtime: RuntimeCena,
  opcoes: OpcoesTabela = {},
): TabelaColeta {
  const confirmar = opcoes.confirmar ?? ((mensagem: string) => window.confirm(mensagem))
  const anunciar = opcoes.anunciar ?? (() => undefined)
  let automaticaFoiAtivada = false
  let colunaOrdenada: ColunaOrdenavel = 'n'
  let direcaoOrdenacao: DirecaoOrdenacao = 'asc'
  let paginaAtual = 0
  let acompanharRecentes = true
  let modoManualSelecionado: ModoPendulo = store.texto('modo') === 'cicloidal'
    ? 'cicloidal'
    : 'simples'

  recipiente.classList.add('tabela-coleta-painel')

  const grandezaAtual = (): GrandezaMedida => store.texto('modoContagem') as GrandezaMedida

  const aoPassarSensor = ({ modo, evento, alpha }: PassagemRuntime): void => {
    if (!visivelNoModo(store.texto('modo'), modo)) return
    const registrada = store.registrarPassagemSensor(modo, evento, alpha)
    if (registrada !== null) anunciar(`Medição automática do pêndulo ${modo} registrada.`)
  }

  const medirAgora = (modo: ModoPendulo): void => {
    store.coletarMedicaoManual(modo, runtime.tempo, runtime.amplitudeDoModo(modo) ?? undefined)
    anunciar(`Medição manual do pêndulo ${modo} registrada.`)
  }

  const ariaOrdenacao = (chave: ColunaOrdenavel): string => {
    if (chave !== colunaOrdenada) return 'none'
    return direcaoOrdenacao === 'asc' ? 'ascending' : 'descending'
  }

  const cabecalhos = (): string => CABECALHOS.map(({ chave, rotulo }) => {
    const rotuloGrandeza = chave === 'T'
      ? `${rotulo} — ${grandezaAtual() === 'meioPeriodo' ? 'meio período' : 'período completo'}`
      : rotulo
    const unidade = chave === 'T'
      ? ' (s)'
      : chave === 'gInferido' || chave === 'gInferidoIngenuo' || chave === 'gConfigurado'
        ? ' (m/s²)'
        : chave === 'alphaGraus'
          ? ' (°)'
          : chave === 'L'
            ? ' (m)'
            : chave === 'Tteorico'
              ? ' (s)'
              : chave === 'erroRelativo'
                ? ' (%)'
                : ''
    const indicador = chave === colunaOrdenada ? (direcaoOrdenacao === 'asc' ? ' ↑' : ' ↓') : ''
    return `<th scope="col" aria-sort="${ariaOrdenacao(chave)}"><button type="button" data-ordenar="${chave}">${rotuloGrandeza}${unidade}<span aria-hidden="true">${indicador}</span></button></th>`
  }).join('')

  const linhaHtml = (medicao: Medicao): string => {
    const teoricoExibido = medicao.grandeza === 'meioPeriodo'
      ? medicao.Tteorico / 2
      : medicao.Tteorico
    return `<tr data-medicao="${medicao.n}" data-pendulo="${medicao.pendulo}" data-origem="${medicao.origem}">
      <th scope="row">${medicao.n}</th>
      <td data-coluna="pendulo">${rotuloModo(medicao.pendulo)}</td>
      <td data-coluna="T">${formatar(medicao.T, 4)}</td>
      <td data-coluna="grandeza">${medicao.grandeza === 'meioPeriodo' ? 'Meio período' : 'Período completo'}</td>
      <td data-coluna="gInferido">${formatar(medicao.gInferido, 4)}</td>
      <td data-coluna="gInferidoIngenuo">${formatar(medicao.gInferidoIngenuo, 4)}</td>
      <td data-coluna="gConfigurado">${formatar(medicao.gConfigurado, 4)}</td>
      <td data-coluna="alphaGraus">${formatar(medicao.alphaGraus, 1)}</td>
      <td data-coluna="L">${formatar(medicao.L, 4)}</td>
      <td data-coluna="Tteorico">${formatar(teoricoExibido, 4)}</td>
      <td data-coluna="erroRelativo">${formatar(medicao.erroRelativo * 100, 4)}</td>
      <td data-coluna="origem">${medicao.origem === 'manual' ? 'Manual' : 'Automática'}</td>
      <td data-coluna="acoes"><button type="button" data-remover="${medicao.n}" aria-label="Excluir medição ${medicao.n}">Excluir</button></td>
    </tr>`
  }

  const estatisticasHtml = (
    T: ResumoEstatistico,
    g: ResumoEstatistico,
  ): string => `<tr>
    <th scope="row">Estatísticas</th>
    <td colspan="12">
      <span data-estatistica="contagem">n = ${T.contagem}</span>
      <span data-estatistica="media-T">média T completo (normalizado) = ${formatarEstatistica(T.media, 4)} s</span>
      <span data-estatistica="desvio-T">s(T completo) = ${formatarEstatistica(T.desvioPadrao, 4)} s</span>
      <span data-estatistica="erro-padrao-T">EP(T completo) = ${formatarEstatistica(T.erroPadrao, 4)} s</span>
      <span data-estatistica="media-g">média g = ${formatarEstatistica(g.media, 4)} m/s²</span>
      <span data-estatistica="desvio-g">s(g) = ${formatarEstatistica(g.desvioPadrao, 4)} m/s²</span>
      <span data-estatistica="erro-padrao-g">EP(g) = ${formatarEstatistica(g.erroPadrao, 4)} m/s²</span>
    </td>
  </tr>`

  const renderizar = (): void => {
    const rolagemAnterior = recipiente.querySelector<HTMLElement>('.tabela-coleta-rolagem')
    const scrollLeft = rolagemAnterior?.scrollLeft ?? 0
    const scrollTop = rolagemAnterior?.scrollTop ?? 0
    const ativo = document.activeElement instanceof HTMLElement && recipiente.contains(document.activeElement)
      ? document.activeElement
      : null
    const chaveFoco = ativo === null ? null : (['acao', 'ordenar', 'remover'] as const)
      .map((atributo) => ({ atributo, valor: ativo.dataset[atributo] }))
      .find(({ valor }) => valor !== undefined) ?? (ativo.classList.contains('tabela-coleta-rolagem')
        ? { atributo: 'rolagem' as const, valor: '' }
        : null)
    const totalLinhas = store.contagemMedicoes()
    const totalPaginas = Math.max(1, Math.ceil(totalLinhas / LINHAS_POR_PAGINA))
    if (acompanharRecentes) paginaAtual = totalPaginas - 1
    paginaAtual = Math.min(Math.max(0, paginaAtual), totalPaginas - 1)
    const inicioPagina = paginaAtual * LINHAS_POR_PAGINA
    const linhas = store.paginarMedicoes(
      colunaOrdenada,
      direcaoOrdenacao,
      inicioPagina,
      LINHAS_POR_PAGINA,
    )
    const primeiraExibida = totalLinhas === 0 ? 0 : inicioPagina + 1
    const ultimaExibida = inicioPagina + linhas.length
    const coletaAutomaticaAtiva = store.selecionarColetaAutomatica()
    const rotuloAutomatica = coletaAutomaticaAtiva
      ? 'Pausar coleta automática'
      : automaticaFoiAtivada
        ? 'Retomar coleta automática'
        : 'Ativar coleta automática'
    recipiente.innerHTML = `
      <div class="tabela-coleta-cabecalho">
        <div><h2>Coleta de T e g</h2><p>A mesma coleção do caderno de laboratório.</p></div>
        <div class="tabela-coleta-controles" aria-label="Controles da coleta">
          <button type="button" data-acao="alternar-automatica" aria-pressed="${coletaAutomaticaAtiva}">${rotuloAutomatica}</button>
          <label>Grandeza
            <select data-acao="grandeza" aria-label="Grandeza medida">
              <option value="periodoCompleto"${grandezaAtual() === 'periodoCompleto' ? ' selected' : ''}>Período completo</option>
              <option value="meioPeriodo"${grandezaAtual() === 'meioPeriodo' ? ' selected' : ''}>Meio período</option>
            </select>
          </label>
          <label>Pêndulo
            <select data-acao="pendulo-manual" aria-label="Pêndulo para coleta manual">
              <option value="simples"${modoManualSelecionado === 'simples' ? ' selected' : ''}>Simples</option>
              <option value="cicloidal"${modoManualSelecionado === 'cicloidal' ? ' selected' : ''}>Cicloidal</option>
            </select>
          </label>
          <button type="button" data-acao="coletar-manual">Coletar agora</button>
          <button type="button" data-acao="limpar"${totalLinhas === 0 ? ' disabled' : ''}>Limpar tabela</button>
        </div>
      </div>
      <div class="tabela-coleta-paginacao" aria-label="Paginação da tabela">
        <p id="tabela-coleta-faixa" aria-live="polite">${totalLinhas === 0
          ? 'Nenhuma medição coletada.'
          : `Exibindo ${primeiraExibida}–${ultimaExibida} de ${totalLinhas} medições. No máximo ${LINHAS_POR_PAGINA} linhas são exibidas por página.`}</p>
        <div>
          <button type="button" data-acao="pagina-anterior"${paginaAtual === 0 ? ' disabled' : ''}>Página anterior</button>
          <span aria-current="page">Página ${paginaAtual + 1} de ${totalPaginas}</span>
          <button type="button" data-acao="pagina-proxima"${paginaAtual >= totalPaginas - 1 ? ' disabled' : ''}>Próxima página</button>
          <button type="button" data-acao="pagina-recentes"${acompanharRecentes ? ' disabled' : ''}>Ir para medições mais recentes</button>
        </div>
      </div>
      <div class="tabela-coleta-rolagem" tabindex="0" aria-label="Tabela de medições, rolável horizontalmente">
        <table data-grandeza="${grandezaAtual()}">
          <caption>Medições do sensor fixo no ponto zero</caption>
          <thead><tr>${cabecalhos()}<th scope="col">Ações</th></tr></thead>
          <tbody>${linhas.length === 0
            ? '<tr class="tabela-coleta-vazia"><td colspan="13">Nenhuma medição coletada.</td></tr>'
            : linhas.map(linhaHtml).join('')}</tbody>
          <tfoot>${estatisticasHtml(
            store.estatisticasMedicoes('T'),
            store.estatisticasMedicoes('gInferido'),
          )}</tfoot>
        </table>
      </div>`
    const rolagemAtual = recipiente.querySelector<HTMLElement>('.tabela-coleta-rolagem')
    if (rolagemAtual !== null) {
      rolagemAtual.scrollLeft = scrollLeft
      rolagemAtual.scrollTop = scrollTop
    }
    if (chaveFoco?.atributo === 'rolagem') rolagemAtual?.focus({ preventScroll: true })
    else if (chaveFoco !== null) {
      const destino = recipiente.querySelector<HTMLElement>(
        `[data-${chaveFoco.atributo}="${CSS.escape(chaveFoco.valor ?? '')}"]`,
      ) ?? (chaveFoco.atributo === 'remover'
        ? recipiente.querySelector<HTMLElement>('[data-remover], [data-acao="limpar"]')
        : null)
      const habilitado = destino !== null
        && (!(destino instanceof HTMLButtonElement) || !destino.disabled)
        && (!(destino instanceof HTMLSelectElement) || !destino.disabled)
      if (habilitado) destino.focus({ preventScroll: true })
      else rolagemAtual?.focus({ preventScroll: true })
    }
  }

  const aoClicar = (evento: Event): void => {
    const alvo = evento.target instanceof Element ? evento.target.closest<HTMLElement>('button') : null
    if (alvo === null) return
    const acao = alvo.dataset['acao']
    if (acao === 'alternar-automatica') {
      store.definirColetaAutomatica(!store.selecionarColetaAutomatica())
      automaticaFoiAtivada = true
      anunciar(store.selecionarColetaAutomatica() ? 'Coleta automática ativada.' : 'Coleta automática pausada.')
      renderizar()
      return
    }
    if (acao === 'coletar-manual') {
      const seletor = recipiente.querySelector<HTMLSelectElement>('[data-acao="pendulo-manual"]')
      medirAgora((seletor?.value ?? 'simples') as ModoPendulo)
      return
    }
    if (acao === 'pagina-anterior') {
      paginaAtual = Math.max(0, paginaAtual - 1)
      acompanharRecentes = false
      renderizar()
      return
    }
    if (acao === 'pagina-proxima') {
      paginaAtual += 1
      acompanharRecentes = false
      renderizar()
      return
    }
    if (acao === 'pagina-recentes') {
      acompanharRecentes = true
      renderizar()
      return
    }
    if (acao === 'limpar') {
      if (confirmar('Descartar todas as medições da tabela e do caderno de laboratório?')) {
        store.limparTabela()
        anunciar('Tabela de coleta limpa.')
      }
      return
    }
    const remover = alvo.dataset['remover']
    if (remover !== undefined) {
      store.removerMedicao(Number(remover))
      anunciar(`Medição ${remover} excluída.`)
      return
    }
    const ordenar = alvo.dataset['ordenar'] as ColunaOrdenavel | undefined
    if (ordenar !== undefined) {
      if (colunaOrdenada === ordenar) direcaoOrdenacao = direcaoOrdenacao === 'asc' ? 'desc' : 'asc'
      else {
        colunaOrdenada = ordenar
        direcaoOrdenacao = 'asc'
      }
      paginaAtual = 0
      acompanharRecentes = false
      renderizar()
    }
  }

  const aoAlterar = (evento: Event): void => {
    const alvo = evento.target instanceof HTMLSelectElement ? evento.target : null
    if (alvo?.dataset['acao'] === 'grandeza') {
      store.definirParametro('modoContagem', alvo.value)
    } else if (alvo?.dataset['acao'] === 'pendulo-manual') {
      modoManualSelecionado = alvo.value as ModoPendulo
    }
  }

  recipiente.addEventListener('click', aoClicar)
  recipiente.addEventListener('change', aoAlterar)
  const cancelarColecao = store.assinarMedicoes(renderizar)
  const cancelarPassagens = runtime.assinarPassagens(aoPassarSensor)
  const cancelarStore = store.assinar([...CHAVES_REINICIO_SENSOR, 'modo', 'modoContagem', 'execucao'], (alteradas) => {
    if (alteradas.has('modo')) {
      const modo = store.texto('modo')
      if (modo === 'simples' || modo === 'cicloidal') modoManualSelecionado = modo
    }
    if (
      CHAVES_REINICIO_SENSOR.some((chave) => alteradas.has(chave))
      || alteradas.has('modo')
      || alteradas.has('modoContagem')
      || (alteradas.has('execucao') && store.texto('execucao') === 'parado')
    ) {
      store.reiniciarSensorColeta()
    }
    renderizar()
  })
  renderizar()

  return {
    reiniciarSensor(): void {
      store.reiniciarSensorColeta()
    },
    destruir(): void {
      cancelarStore()
      cancelarPassagens()
      cancelarColecao()
      recipiente.removeEventListener('click', aoClicar)
      recipiente.removeEventListener('change', aoAlterar)
      recipiente.replaceChildren()
      recipiente.classList.remove('tabela-coleta-painel')
    },
  }
}
