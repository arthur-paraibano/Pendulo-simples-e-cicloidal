/**
 * Painel de cenários: presets, roteiros guiados, desafio e exportação.
 *
 * Casca fina sobre `state/presets.ts`, `state/roteiros.ts`, `export/csv.ts` e
 * `export/png.ts`: aqui só há DOM, eventos e o gesto de baixar arquivo. Toda a
 * decisão testável fica do lado de fora.
 */

import { gerarCsv, nomeArquivoCsv, type MetadadosCsv } from '../../export/csv.js'
import { comporImagem, nomeArquivoPng, type CarimboImagem } from '../../export/png.js'
import { fragmentoDoStore } from '../../state/endereco.js'
import { Persistencia } from '../../state/persist.js'
import {
  aplicarPreset,
  capturarPreset,
  PRESETS_FABRICA,
  validarPreset,
  type Preset,
} from '../../state/presets.js'
import {
  conferirDesafio,
  estimarGravidade,
  gravidadeOculta,
  ProgressoRoteiro,
  ROTEIROS,
  buscarRoteiro,
} from '../../state/roteiros.js'
import type { Store } from '../../state/store.js'
import { PARAMETROS } from '../../state/schema.js'

export interface PainelCenarios {
  readonly elemento: HTMLElement
  atualizar(): void
  destruir(): void
}

export interface OpcoesCenarios {
  readonly anunciar?: (mensagem: string, assertivo?: boolean) => void
  /** Canvas da cena, para a exportação de imagem. */
  readonly telaDaCena?: () => HTMLCanvasElement | null
  /** Injetável: o teste não deve baixar arquivo de verdade. */
  readonly baixar?: (nome: string, conteudo: Blob) => void
  readonly agora?: () => Date
  readonly persistencia?: Persistencia
}

const VERSAO_APLICATIVO = '1.0.0'

function baixarPadrao(nome: string, conteudo: Blob): void {
  const url = URL.createObjectURL(conteudo)
  const ancora = document.createElement('a')
  ancora.href = url
  ancora.download = nome
  ancora.click()
  URL.revokeObjectURL(url)
}

function botao(rotulo: string, acao: string): HTMLButtonElement {
  const elemento = document.createElement('button')
  elemento.type = 'button'
  elemento.dataset.acao = acao
  elemento.textContent = rotulo
  return elemento
}

/** Resumo dos parâmetros não padrão, para o carimbo e o cabeçalho do CSV. */
function parametrosNaoPadrao(store: Store): string {
  const partes: string[] = []
  const naoPadrao = store.naoPadrao()
  for (const p of PARAMETROS) {
    if (!(p.id in naoPadrao)) continue
    partes.push(`${p.simbolo}=${String(naoPadrao[p.id])}`)
  }
  return partes.length === 0 ? '(todos no padrão)' : partes.join('; ')
}

export function criarPainelCenarios(
  recipiente: HTMLElement,
  store: Store,
  opcoes: OpcoesCenarios = {},
): PainelCenarios {
  const anunciar = opcoes.anunciar ?? (() => undefined)
  const baixar = opcoes.baixar ?? baixarPadrao
  const agora = opcoes.agora ?? (() => new Date())
  const persistencia = opcoes.persistencia ?? new Persistencia()

  const raiz = document.createElement('section')
  raiz.className = 'painel-cenarios'

  const titulo = document.createElement('h2')
  titulo.textContent = 'Cenários'
  raiz.append(titulo)

  const aviso = document.createElement('p')
  aviso.className = 'cenarios-aviso'
  aviso.setAttribute('aria-live', 'polite')

  // ── Presets ────────────────────────────────────────────────────────────────
  const blocoPresets = document.createElement('div')
  blocoPresets.className = 'cenarios-bloco'
  blocoPresets.dataset.bloco = 'presets'

  const tituloPresets = document.createElement('h3')
  tituloPresets.textContent = 'Presets'

  const seletorPreset = document.createElement('select')
  seletorPreset.id = 'preset-selecionado'
  seletorPreset.setAttribute('aria-label', 'Preset a carregar')

  const rotuloPreset = document.createElement('label')
  rotuloPreset.htmlFor = seletorPreset.id
  rotuloPreset.textContent = 'Cenário'

  const descricaoPreset = document.createElement('p')
  descricaoPreset.className = 'cenarios-descricao'

  const nomeNovo = document.createElement('input')
  nomeNovo.type = 'text'
  nomeNovo.id = 'preset-nome'
  nomeNovo.placeholder = 'Nome do cenário'
  nomeNovo.setAttribute('aria-label', 'Nome do cenário a salvar')

  const acoesPreset = document.createElement('div')
  acoesPreset.className = 'cenarios-acoes'
  const botaoCarregar = botao('Carregar preset', 'carregar-preset')
  const botaoSalvar = botao('Salvar cenário', 'salvar-preset')
  const botaoRenomear = botao('Renomear', 'renomear-preset')
  const botaoExcluir = botao('Excluir', 'excluir-preset')
  acoesPreset.append(botaoCarregar, botaoSalvar, botaoRenomear, botaoExcluir)

  const arquivoEntrada = document.createElement('input')
  arquivoEntrada.type = 'file'
  arquivoEntrada.accept = 'application/json,.json'
  arquivoEntrada.id = 'preset-arquivo'
  arquivoEntrada.setAttribute('aria-label', 'Importar cenário de arquivo')

  const acoesArquivo = document.createElement('div')
  acoesArquivo.className = 'cenarios-acoes'
  const botaoExportarCenario = botao('Exportar cenário', 'exportar-cenario')
  acoesArquivo.append(botaoExportarCenario, arquivoEntrada)

  blocoPresets.append(
    tituloPresets,
    rotuloPreset,
    seletorPreset,
    descricaoPreset,
    nomeNovo,
    acoesPreset,
    acoesArquivo,
  )

  // ── Roteiros ───────────────────────────────────────────────────────────────
  const blocoRoteiro = document.createElement('div')
  blocoRoteiro.className = 'cenarios-bloco'
  blocoRoteiro.dataset.bloco = 'roteiro'

  const tituloRoteiro = document.createElement('h3')
  tituloRoteiro.textContent = 'Roteiros guiados'

  const seletorRoteiro = document.createElement('select')
  seletorRoteiro.id = 'roteiro-selecionado'
  seletorRoteiro.setAttribute('aria-label', 'Roteiro guiado')
  for (const roteiro of ROTEIROS) {
    const item = document.createElement('option')
    item.value = roteiro.id
    item.textContent = roteiro.nome
    seletorRoteiro.append(item)
  }

  const rotuloRoteiro = document.createElement('label')
  rotuloRoteiro.htmlFor = seletorRoteiro.id
  rotuloRoteiro.textContent = 'Roteiro'

  const passoTitulo = document.createElement('p')
  passoTitulo.className = 'roteiro-passo-titulo'
  const passoPergunta = document.createElement('p')
  passoPergunta.className = 'roteiro-pergunta'
  passoPergunta.setAttribute('aria-live', 'polite')

  const acoesRoteiro = document.createElement('div')
  acoesRoteiro.className = 'cenarios-acoes'
  const botaoIniciar = botao('Iniciar roteiro', 'iniciar-roteiro')
  const botaoAnterior = botao('Passo anterior', 'roteiro-voltar')
  const botaoProximo = botao('Próximo passo', 'roteiro-avancar')
  const botaoSair = botao('Sair do roteiro', 'sair-roteiro')
  acoesRoteiro.append(botaoIniciar, botaoAnterior, botaoProximo, botaoSair)

  blocoRoteiro.append(
    tituloRoteiro,
    rotuloRoteiro,
    seletorRoteiro,
    passoTitulo,
    passoPergunta,
    acoesRoteiro,
  )

  // ── Desafio do Planeta X ───────────────────────────────────────────────────
  const blocoDesafio = document.createElement('div')
  blocoDesafio.className = 'cenarios-bloco'
  blocoDesafio.dataset.bloco = 'desafio'

  const tituloDesafio = document.createElement('h3')
  tituloDesafio.textContent = 'Desafio do Planeta X'

  const estadoDesafio = document.createElement('p')
  estadoDesafio.className = 'cenarios-descricao'
  estadoDesafio.dataset.leitura = 'desafio-estado'

  const estimativa = document.createElement('input')
  estimativa.type = 'text'
  estimativa.inputMode = 'decimal'
  estimativa.id = 'desafio-estimativa'
  estimativa.setAttribute('aria-label', 'Sua estimativa de g, em metros por segundo ao quadrado')

  const acoesDesafio = document.createElement('div')
  acoesDesafio.className = 'cenarios-acoes'
  const botaoDaTabela = botao('Estimar da tabela', 'desafio-da-tabela')
  const botaoSubmeter = botao('Submeter estimativa', 'desafio-submeter')
  const botaoReiniciar = botao('Reiniciar desafio', 'desafio-reiniciar')
  acoesDesafio.append(botaoDaTabela, botaoSubmeter, botaoReiniciar)

  const veredito = document.createElement('p')
  veredito.className = 'cenarios-veredito'
  veredito.dataset.leitura = 'desafio-veredito'
  veredito.setAttribute('aria-live', 'polite')

  blocoDesafio.append(tituloDesafio, estadoDesafio, estimativa, acoesDesafio, veredito)

  // ── Exportação ─────────────────────────────────────────────────────────────
  const blocoExportar = document.createElement('div')
  blocoExportar.className = 'cenarios-bloco'
  blocoExportar.dataset.bloco = 'exportar'

  const tituloExportar = document.createElement('h3')
  tituloExportar.textContent = 'Exportar e compartilhar'

  const seletorSeparador = document.createElement('select')
  seletorSeparador.id = 'csv-separador'
  seletorSeparador.setAttribute('aria-label', 'Separador de campo do CSV')
  for (const [valor, texto] of [
    [';', 'ponto e vírgula (Excel pt-BR)'],
    [',', 'vírgula'],
    ['\t', 'tabulação'],
  ] as const) {
    const item = document.createElement('option')
    item.value = valor
    item.textContent = texto
    seletorSeparador.append(item)
  }
  const rotuloSeparador = document.createElement('label')
  rotuloSeparador.htmlFor = seletorSeparador.id
  rotuloSeparador.textContent = 'Separador'

  const acoesExportar = document.createElement('div')
  acoesExportar.className = 'cenarios-acoes'
  const botaoCsv = botao('Exportar CSV', 'exportar-csv')
  const botaoPng = botao('Exportar imagem', 'exportar-png')
  const botaoEndereco = botao('Copiar endereço', 'copiar-endereco')
  acoesExportar.append(botaoCsv, botaoPng, botaoEndereco)

  blocoExportar.append(tituloExportar, rotuloSeparador, seletorSeparador, acoesExportar)

  raiz.append(aviso, blocoPresets, blocoRoteiro, blocoDesafio, blocoExportar)
  recipiente.append(raiz)

  let destruido = false
  let progresso: ProgressoRoteiro | null = null

  const dizer = (mensagem: string, assertivo = false): void => {
    aviso.textContent = mensagem
    anunciar(mensagem, assertivo)
  }

  function presetsDoUsuario(): Preset[] {
    return persistencia.lerPresets()
  }

  function preencherPresets(): void {
    const selecionado = seletorPreset.value
    seletorPreset.replaceChildren()
    for (const grupo of [
      { rotulo: 'De fábrica', itens: PRESETS_FABRICA },
      { rotulo: 'Meus cenários', itens: presetsDoUsuario() },
    ]) {
      if (grupo.itens.length === 0) continue
      const optgroup = document.createElement('optgroup')
      optgroup.label = grupo.rotulo
      for (const preset of grupo.itens) {
        const item = document.createElement('option')
        item.value = preset.id
        item.textContent = preset.nome
        optgroup.append(item)
      }
      seletorPreset.append(optgroup)
    }
    if (selecionado !== '') seletorPreset.value = selecionado
    atualizarDescricaoPreset()
  }

  function presetSelecionado(): Preset | undefined {
    const id = seletorPreset.value
    return [...PRESETS_FABRICA, ...presetsDoUsuario()].find((p) => p.id === id)
  }

  function atualizarDescricaoPreset(): void {
    const preset = presetSelecionado()
    descricaoPreset.textContent = preset?.descricao ?? ''
    const doUsuario = preset?.origem === 'usuario'
    botaoExcluir.disabled = !doUsuario
    botaoRenomear.disabled = !doUsuario
  }

  function atualizar(): void {
    if (destruido) return

    const emCurso = progresso
    botaoSair.disabled = emCurso === null
    seletorRoteiro.disabled = emCurso !== null
    if (emCurso === null) {
      botaoAnterior.disabled = true
      botaoProximo.disabled = true
      passoTitulo.textContent = ''
      passoPergunta.textContent = ''
    } else {
      const { passo, indice, roteiro, primeiro, ultimo } = emCurso.estado
      botaoAnterior.disabled = primeiro
      botaoProximo.disabled = ultimo
      passoTitulo.textContent = `Passo ${indice + 1} de ${roteiro.passos.length}: ${passo.titulo}`
      passoPergunta.textContent = passo.pergunta
    }

    const oculta = gravidadeOculta(store)
    estadoDesafio.textContent = store.booleano('desafioPlanetaX')
      ? oculta
        ? 'A gravidade está oculta. Meça o período e estime g.'
        : 'Estimativa submetida: a comparação está revelada.'
      : 'Carregue o preset "Desafio do Planeta X" para começar.'
    botaoSubmeter.disabled = !oculta
    botaoDaTabela.disabled = !store.booleano('desafioPlanetaX')
    botaoReiniciar.disabled = !store.booleano('desafioPlanetaX')

    atualizarDescricaoPreset()
  }

  // ── Ações ──────────────────────────────────────────────────────────────────

  const aoCarregarPreset = (): void => {
    const preset = presetSelecionado()
    if (preset === undefined) return
    const { aplicados, avisos } = aplicarPreset(store, preset)
    dizer(
      avisos.length > 0
        ? `${preset.nome}: ${avisos.join(' ')}`
        : `${preset.nome} carregado (${aplicados} parâmetro(s)).`,
    )
    atualizar()
  }

  const identificador = (nome: string): string =>
    nome
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64) || 'cenario'

  const aoSalvarPreset = (): void => {
    const nome = nomeNovo.value.trim()
    if (nome === '') {
      dizer('Dê um nome ao cenário antes de salvar.', true)
      return
    }
    const preset = capturarPreset(store, identificador(nome), nome)
    if (persistencia.adicionarPreset(preset)) {
      nomeNovo.value = ''
      preencherPresets()
      seletorPreset.value = preset.id
      dizer(`Cenário "${nome}" salvo.`)
    } else {
      dizer('Não foi possível salvar: o armazenamento local está cheio.', true)
    }
    atualizar()
  }

  const aoRenomearPreset = (): void => {
    const preset = presetSelecionado()
    const nome = nomeNovo.value.trim()
    if (preset === undefined || preset.origem !== 'usuario') return
    if (nome === '') {
      dizer('Digite o novo nome antes de renomear.', true)
      return
    }
    // Mantém o identificador: renomear não pode quebrar um endereço já
    // compartilhado que aponte para este cenário.
    persistencia.adicionarPreset({ ...preset, nome })
    nomeNovo.value = ''
    preencherPresets()
    dizer(`Cenário renomeado para "${nome}".`)
  }

  const aoExcluirPreset = (): void => {
    const preset = presetSelecionado()
    if (preset === undefined || preset.origem !== 'usuario') return
    persistencia.removerPreset(preset.id)
    preencherPresets()
    dizer(`Cenário "${preset.nome}" excluído.`)
    atualizar()
  }

  const aoExportarCenario = (): void => {
    const preset = capturarPreset(store, 'cenario-exportado', 'Cenário exportado')
    const texto = JSON.stringify(preset, null, 2)
    baixar(
      `pendulo-cenario-${nomeArquivoCsv(agora()).slice('pendulo-medicoes-'.length, -4)}.json`,
      new Blob([texto], { type: 'application/json' }),
    )
    dizer('Cenário exportado.')
  }

  const aoImportarCenario = async (): Promise<void> => {
    const arquivo = arquivoEntrada.files?.[0]
    if (arquivo === undefined) return
    try {
      const bruto: unknown = JSON.parse(await arquivo.text())
      const { valido, erros } = validarPreset(bruto)
      if (!valido) {
        dizer(`Arquivo não é um cenário válido: ${erros.join(' ')}`, true)
        return
      }
      const { avisos } = aplicarPreset(store, bruto as Preset)
      dizer(avisos.length > 0 ? avisos.join(' ') : 'Cenário importado.')
    } catch {
      dizer('Não foi possível ler o arquivo: ele não contém JSON válido.', true)
    } finally {
      arquivoEntrada.value = ''
      atualizar()
    }
  }

  const aoIniciarRoteiro = (): void => {
    const roteiro = buscarRoteiro(seletorRoteiro.value)
    if (roteiro === undefined) return
    progresso = new ProgressoRoteiro(roteiro)
    progresso.aplicar(store)
    dizer(`Roteiro "${roteiro.nome}" iniciado.`)
    atualizar()
  }

  const aoAvancar = (): void => {
    progresso?.avancar(store)
    atualizar()
  }
  const aoVoltar = (): void => {
    progresso?.voltar(store)
    atualizar()
  }
  const aoSair = (): void => {
    progresso = null
    dizer('Roteiro encerrado. O estado corrente foi preservado.')
    atualizar()
  }

  const aoEstimarDaTabela = (): void => {
    const medicoes = store.selecionarMedicoes()
    if (medicoes.length === 0) {
      dizer('Colete ao menos uma medição antes de estimar.', true)
      return
    }
    const estimativas = medicoes.map((m) =>
      estimarGravidade(m.T, m.L, m.alphaGraus, m.pendulo),
    )
    const validas = estimativas.filter((v) => Number.isFinite(v))
    if (validas.length === 0) {
      dizer('As medições registradas não permitem estimar g.', true)
      return
    }
    const media = validas.reduce((a, b) => a + b, 0) / validas.length
    estimativa.value = media.toFixed(4).replace('.', ',')
    dizer(`Estimativa média de ${validas.length} medição(ões) preenchida.`)
  }

  const aoSubmeter = (): void => {
    const valor = Number(estimativa.value.replace(',', '.'))
    if (!Number.isFinite(valor) || valor <= 0) {
      dizer('Digite uma estimativa positiva de g antes de submeter.', true)
      return
    }
    const resultado = conferirDesafio(valor, store.numero('g'))
    store.definirParametro('desafioSubmetido', true)
    veredito.dataset.acertou = String(resultado.acertou)
    const erro = resultado.erroPercentual.toFixed(2).replace('.', ',')
    veredito.textContent = resultado.acertou
      ? `Acertou: g = ${store.numero('g').toFixed(4).replace('.', ',')} m/s², erro de ${erro} %.`
      : `Ainda não: o valor é ${store.numero('g').toFixed(4).replace('.', ',')} m/s², e a estimativa errou ${erro} %.`
    anunciar(veredito.textContent, true)
    atualizar()
  }

  const aoReiniciarDesafio = (): void => {
    store.definirParametro('desafioSubmetido', false)
    veredito.textContent = ''
    delete veredito.dataset.acertou
    estimativa.value = ''
    dizer('Desafio reiniciado: a gravidade voltou a ficar oculta.')
    atualizar()
  }

  function metadados(): MetadadosCsv {
    const N = store.numero('N')
    return {
      versaoAplicativo: VERSAO_APLICATIVO,
      exportadoEm: agora().toISOString(),
      visualizacao: store.texto('modo'),
      modeloPeriodo: `série truncada em N = ${N}`,
      formula: 'T = 2*pi*raiz(L/g) * S(alpha, N, modo)',
      grandezaSensor:
        store.texto('modoContagem') === 'meioPeriodo' ? 'meio período' : 'período completo',
      parametrosNaoPadrao: parametrosNaoPadrao(store),
      estadoCompleto: `${globalThis.location?.href.split('#')[0] ?? ''}${fragmentoDoStore(store)}`,
    }
  }

  const aoExportarCsv = (): void => {
    const medicoes = store.selecionarMedicoes()
    const csv = gerarCsv(medicoes, metadados(), {
      separador: seletorSeparador.value as ';' | ',' | '\t',
      colunasOpcionais: ['grandeza', 'gInferidoIngenuo', 'gConfigurado', 'Tteorico', 'origem'],
      estatisticas: {
        T: store.estatisticasMedicoes('T'),
        g: store.estatisticasMedicoes('gInferido'),
      },
    })
    baixar(nomeArquivoCsv(agora()), new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    dizer(`CSV exportado com ${medicoes.length} medição(ões).`)
  }

  const aoExportarPng = (): void => {
    const origem = opcoes.telaDaCena?.() ?? null
    if (origem === null) {
      dizer('A cena ainda não foi desenhada.', true)
      return
    }
    const carimbo: CarimboImagem = {
      titulo: 'Pêndulo — Fórmula Completa',
      formula: `T = 2π√(L/g) · S(α, N = ${store.numero('N')}, ${store.texto('modo')})`,
      parametros: parametrosNaoPadrao(store).split('; '),
      endereco: `${globalThis.location?.href.split('#')[0] ?? ''}${fragmentoDoStore(store)}`,
      geradoEm: agora().toISOString(),
    }
    const destino = document.createElement('canvas')
    comporImagem(destino, origem, carimbo)
    destino.toBlob((blob) => {
      if (blob === null) {
        dizer('O navegador não conseguiu gerar a imagem.', true)
        return
      }
      baixar(nomeArquivoPng(agora()), blob)
      dizer('Imagem exportada com os parâmetros carimbados.')
    })
  }

  const aoCopiarEndereco = (): void => {
    const endereco = `${globalThis.location?.href.split('#')[0] ?? ''}${fragmentoDoStore(store)}`
    void navigator.clipboard?.writeText(endereco).then(
      () => dizer('Endereço copiado.'),
      () => dizer(`Copie manualmente: ${endereco}`, true),
    )
  }

  const aoTrocarPreset = (): void => atualizarDescricaoPreset()
  const aoImportar = (): void => void aoImportarCenario()

  seletorPreset.addEventListener('change', aoTrocarPreset)
  botaoCarregar.addEventListener('click', aoCarregarPreset)
  botaoSalvar.addEventListener('click', aoSalvarPreset)
  botaoRenomear.addEventListener('click', aoRenomearPreset)
  botaoExcluir.addEventListener('click', aoExcluirPreset)
  botaoExportarCenario.addEventListener('click', aoExportarCenario)
  arquivoEntrada.addEventListener('change', aoImportar)
  botaoIniciar.addEventListener('click', aoIniciarRoteiro)
  botaoProximo.addEventListener('click', aoAvancar)
  botaoAnterior.addEventListener('click', aoVoltar)
  botaoSair.addEventListener('click', aoSair)
  botaoDaTabela.addEventListener('click', aoEstimarDaTabela)
  botaoSubmeter.addEventListener('click', aoSubmeter)
  botaoReiniciar.addEventListener('click', aoReiniciarDesafio)
  botaoCsv.addEventListener('click', aoExportarCsv)
  botaoPng.addEventListener('click', aoExportarPng)
  botaoEndereco.addEventListener('click', aoCopiarEndereco)

  preencherPresets()
  atualizar()

  return {
    elemento: raiz,
    atualizar,
    destruir: () => {
      destruido = true
      seletorPreset.removeEventListener('change', aoTrocarPreset)
      botaoCarregar.removeEventListener('click', aoCarregarPreset)
      botaoSalvar.removeEventListener('click', aoSalvarPreset)
      botaoRenomear.removeEventListener('click', aoRenomearPreset)
      botaoExcluir.removeEventListener('click', aoExcluirPreset)
      botaoExportarCenario.removeEventListener('click', aoExportarCenario)
      arquivoEntrada.removeEventListener('change', aoImportar)
      botaoIniciar.removeEventListener('click', aoIniciarRoteiro)
      botaoProximo.removeEventListener('click', aoAvancar)
      botaoAnterior.removeEventListener('click', aoVoltar)
      botaoSair.removeEventListener('click', aoSair)
      botaoDaTabela.removeEventListener('click', aoEstimarDaTabela)
      botaoSubmeter.removeEventListener('click', aoSubmeter)
      botaoReiniciar.removeEventListener('click', aoReiniciarDesafio)
      botaoCsv.removeEventListener('click', aoExportarCsv)
      botaoPng.removeEventListener('click', aoExportarPng)
      botaoEndereco.removeEventListener('click', aoCopiarEndereco)
      raiz.remove()
    },
  }
}
