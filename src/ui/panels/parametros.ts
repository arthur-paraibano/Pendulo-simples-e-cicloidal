import { PARAMETROS } from '../../state/schema.js'
import type { Store } from '../../state/store.js'
import type { DefinicaoParametro, GrupoParametro } from '../../state/tipos.js'
import type { EstadoPenduloCena } from '../../render/types.js'
import { formatarDerivado, valoresDerivados } from '../derived-values.js'
import { criarParamControl, type ParamControl } from '../param-control.js'

type Anunciar = (mensagem: string, erro?: boolean) => void

const ROTULOS_GRUPO: Readonly<Record<GrupoParametro, string>> = {
  geometria: 'Geometria',
  cicloide: 'Cicloide',
  ambiente: 'Ambiente',
  modelo: 'Modelo',
  visual: 'Visual',
  graficos: 'Gráficos',
  medicao: 'Medição',
  animacao: 'Animação',
  dados: 'Dados',
  acessibilidade: 'Acessibilidade',
}

export interface PainelParametros {
  readonly elemento: HTMLElement
  atualizar(): void
  atualizarDinamica(estados: readonly EstadoPenduloCena[], agora?: number): void
  destruir(): void
}

function criarDerivado(id: string, simbolo: string, nome: string): {
  elemento: HTMLElement
  nome: HTMLSpanElement
  valor: HTMLOutputElement
} {
  const linha = document.createElement('div')
  linha.className = 'param-derivado'
  linha.dataset.derivado = id
  const label = document.createElement('span')
  const forte = document.createElement('strong')
  forte.textContent = simbolo
  const textoNome = document.createElement('span')
  textoNome.textContent = ` ${nome}`
  label.append(forte, textoNome)
  const valor = document.createElement('output')
  valor.setAttribute('aria-label', `${nome}, calculado`)
  const selo = document.createElement('small')
  selo.textContent = 'derivado · somente leitura'
  linha.append(label, valor, selo)
  return { elemento: linha, nome: textoNome, valor }
}

function criarControleDiscreto(
  def: DefinicaoParametro,
  store: Store,
  anunciar: Anunciar,
): { elemento: HTMLElement; atualizar(): void; destruir(): void } | null {
  if (def.tipo !== 'booleano' && def.tipo !== 'enum') return null
  const linha = document.createElement('div')
  linha.className = 'param-discreto'
  linha.dataset.parametro = def.id
  const label = document.createElement('label')
  label.innerHTML = `<strong>${def.simbolo}</strong><span>${def.nome}</span>`
  let controle: HTMLInputElement | HTMLSelectElement
  if (def.tipo === 'booleano') {
    const input = document.createElement('input')
    input.type = 'checkbox'
    controle = input
  } else {
    const select = document.createElement('select')
    for (const opcao of def.opcoes ?? []) {
      const item = document.createElement('option')
      item.value = opcao.valor
      item.textContent = opcao.rotulo
      select.append(item)
    }
    controle = select
  }
  controle.id = `param-${def.id}`
  label.htmlFor = controle.id
  controle.title = def.descricao
  linha.append(label, controle)
  const atualizar = (): void => {
    if (controle instanceof HTMLInputElement) controle.checked = store.booleano(def.id)
    else controle.value = store.texto(def.id)
  }
  const aoMudar = (): void => {
    const novo = controle instanceof HTMLInputElement ? controle.checked : controle.value
    const resultado = store.definirParametro(def.id, novo)
    if (resultado.mensagem !== undefined) anunciar(resultado.mensagem, !resultado.aplicado)
  }
  controle.addEventListener('change', aoMudar)
  atualizar()
  return {
    elemento: linha,
    atualizar,
    destruir: () => controle.removeEventListener('change', aoMudar),
  }
}

/** Painel gerado exclusivamente do catálogo declarativo. */
export function criarPainelParametros(
  recipiente: HTMLElement,
  store: Store,
  anunciar: Anunciar = () => undefined,
): PainelParametros {
  recipiente.hidden = false
  recipiente.className = 'painel-parametros'
  const titulo = document.createElement('div')
  titulo.className = 'painel-parametros-titulo'
  titulo.innerHTML = '<div><strong>Parâmetros</strong><small>fonte única: catálogo P01–P114</small></div>'
  const restaurarTudo = document.createElement('button')
  restaurarTudo.type = 'button'
  restaurarTudo.textContent = 'Restaurar tudo'
  titulo.append(restaurarTudo)

  const basicos = document.createElement('div')
  basicos.className = 'parametros-nivel parametros-basicos'
  const avancados = document.createElement('details')
  avancados.className = 'parametros-avancados'
  const resumoAvancado = document.createElement('summary')
  resumoAvancado.textContent = 'Parâmetros avançados'
  const corpoAvancado = document.createElement('div')
  corpoAvancado.className = 'parametros-nivel'
  avancados.append(resumoAvancado, corpoAvancado)
  const derivados = document.createElement('details')
  derivados.className = 'parametros-derivados'
  derivados.open = true
  const resumoDerivados = document.createElement('summary')
  resumoDerivados.textContent = 'Grandezas derivadas'
  const corpoDerivados = document.createElement('div')
  corpoDerivados.className = 'parametros-nivel'
  derivados.append(resumoDerivados, corpoDerivados)

  const controles: { atualizar(): void; destruir?(): void }[] = []
  const saidasDerivadas = new Map<string, {
    elemento: HTMLElement
    nome: HTMLSpanElement
    valor: HTMLOutputElement
  }>()
  const secoes = new Map<string, HTMLElement>()
  const obterSecao = (nivel: 'basico' | 'avancado' | 'derivado', grupo: GrupoParametro): HTMLElement => {
    const chave = `${nivel}-${grupo}`
    const existente = secoes.get(chave)
    if (existente !== undefined) return existente
    const secao = document.createElement('section')
    secao.className = 'parametros-grupo'
    secao.dataset.grupo = grupo
    const cabecalho = document.createElement('h3')
    cabecalho.textContent = ROTULOS_GRUPO[grupo]
    secao.append(cabecalho)
    if (nivel === 'basico') basicos.append(secao)
    else if (nivel === 'avancado') corpoAvancado.append(secao)
    else corpoDerivados.append(secao)
    secoes.set(chave, secao)
    return secao
  }

  for (const def of PARAMETROS) {
    if (def.derivado) {
      continue
    }
    let controle: ParamControl | ReturnType<typeof criarControleDiscreto>
    if (def.tipo === 'numero' || def.tipo === 'inteiro') controle = criarParamControl(def, store, anunciar)
    else controle = criarControleDiscreto(def, store, anunciar)
    if (controle === null) continue
    obterSecao(def.nivel, def.grupo).append(controle.elemento)
    controles.push(controle)
  }

  for (const derivado of valoresDerivados(store)) {
    const controle = criarDerivado(derivado.id, derivado.simbolo, derivado.nome)
    obterSecao('derivado', derivado.id.startsWith('energia') ? 'graficos' : 'modelo').append(controle.elemento)
    saidasDerivadas.set(derivado.id, controle)
  }

  recipiente.replaceChildren(titulo, basicos, avancados, derivados)
  let ultimoEstado: EstadoPenduloCena | undefined
  let ultimaAtualizacaoDinamica = Number.NEGATIVE_INFINITY
  let temporizadorDinamico: ReturnType<typeof setTimeout> | undefined
  let destruido = false
  const atualizarDerivados = (): void => {
    for (const derivado of valoresDerivados(store, ultimoEstado)) {
      const saida = saidasDerivadas.get(derivado.id)
      if (saida === undefined) continue
      const texto = formatarDerivado(derivado)
      if (saida.valor.value !== texto) saida.valor.value = texto
      const nome = ` ${derivado.nome}`
      if (saida.nome.textContent !== nome) saida.nome.textContent = nome
      if (derivado.modoEnergia === undefined) delete saida.elemento.dataset.modoEnergia
      else saida.elemento.dataset.modoEnergia = derivado.modoEnergia
    }
  }
  const atualizar = (): void => {
    for (const controle of controles) controle.atualizar()
    atualizarDerivados()
    const modo = store.texto('modo')
    for (const secao of secoes.values()) {
      if (secao.dataset.grupo === 'cicloide') secao.hidden = modo === 'simples'
    }
  }
  const aoRestaurarTudo = (): void => {
    store.restaurarTudo()
    anunciar('Todos os parâmetros foram restaurados para os valores padrão.')
  }
  restaurarTudo.addEventListener('click', aoRestaurarTudo)
  const cancelar = store.assinar(null, (alteradas) => {
    if ([...alteradas].some((id) => [
      'modo', 'L', 'g', 'm', 'alpha', 'theta0', 'omega0', 'modeloAtrito', 'b', 'zeta', 'cq',
    ].includes(id))) ultimoEstado = undefined
    atualizar()
  })
  atualizar()

  return {
    elemento: recipiente,
    atualizar,
    atualizarDinamica: (estados, agora = performance.now()) => {
      const modo = store.texto('modo')
      ultimoEstado = estados.find((estado) => estado.modo === (modo === 'cicloidal' ? 'cicloidal' : 'simples')) ?? estados[0]
      const restante = 100 - (agora - ultimaAtualizacaoDinamica)
      if (restante <= 0) {
        if (temporizadorDinamico !== undefined) clearTimeout(temporizadorDinamico)
        temporizadorDinamico = undefined
        ultimaAtualizacaoDinamica = agora
        atualizarDerivados()
      } else if (temporizadorDinamico === undefined) {
        // O primeiro quadro dentro da janela pode ser descartado, mas o último
        // sempre é publicado — inclusive quando a simulação está pausada.
        temporizadorDinamico = setTimeout(() => {
          temporizadorDinamico = undefined
          if (destruido) return
          ultimaAtualizacaoDinamica = performance.now()
          atualizarDerivados()
        }, restante)
      }
    },
    destruir: () => {
      destruido = true
      if (temporizadorDinamico !== undefined) clearTimeout(temporizadorDinamico)
      cancelar()
      restaurarTudo.removeEventListener('click', aoRestaurarTudo)
      for (const controle of controles) controle.destruir?.()
      recipiente.replaceChildren()
    },
  }
}
