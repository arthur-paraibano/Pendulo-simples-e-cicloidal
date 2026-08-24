/**
 * ★ FONTE ÚNICA DE VERDADE dos parâmetros — os 112 do catálogo da spec (P01…P112).
 *
 * Cada parâmetro é declarado **uma vez**, com tudo o que qualquer camada precisa
 * saber sobre ele. É essa centralização que torna executável o Princípio III:
 * todo parâmetro é nomeado, digitável e declarado, e nenhuma constante mágica
 * fica escondida no código.
 *
 * Ordem do arquivo = ordem canônica na interface e no endereço compartilhável.
 */

import type { ModoPendulo } from '../physics/types.js'
import type {
  DefinicaoParametro,
  Efeito,
  GrupoParametro,
  LimiteDinamico,
  NivelParametro,
  OpcaoEnum,
  ValorParametro,
} from './tipos.js'

const AMBOS: readonly ModoPendulo[] = ['simples', 'cicloidal']
const SO_CICLOIDAL: readonly ModoPendulo[] = ['cicloidal']

interface Comum {
  aliases?: readonly string[]
  derivado?: boolean
  indexavel?: boolean
  aplicavelEm?: readonly ModoPendulo[]
  limiteDinamico?: LimiteDinamico
  afeta?: readonly Efeito[]
  passoFino?: number
  precisao?: number
}

function num(
  codigo: string,
  id: string,
  simbolo: string,
  nome: string,
  descricao: string,
  unidade: string | null,
  min: number,
  max: number,
  padrao: number,
  passo: number,
  grupo: GrupoParametro,
  nivel: NivelParametro,
  extra: Comum = {},
): DefinicaoParametro {
  return {
    codigo,
    id,
    simbolo,
    nome,
    descricao,
    tipo: 'numero',
    unidade,
    min,
    max,
    passo,
    padrao,
    grupo,
    nivel,
    aliases: extra.aliases ?? [],
    derivado: extra.derivado ?? false,
    indexavel: extra.indexavel ?? false,
    aplicavelEm: extra.aplicavelEm ?? AMBOS,
    afeta: extra.afeta ?? ['cena'],
    ...(extra.passoFino !== undefined ? { passoFino: extra.passoFino } : {}),
    ...(extra.precisao !== undefined ? { precisao: extra.precisao } : {}),
    ...(extra.limiteDinamico !== undefined ? { limiteDinamico: extra.limiteDinamico } : {}),
  }
}

function inteiro(
  codigo: string,
  id: string,
  simbolo: string,
  nome: string,
  descricao: string,
  min: number,
  max: number,
  padrao: number,
  grupo: GrupoParametro,
  nivel: NivelParametro,
  extra: Comum = {},
): DefinicaoParametro {
  return {
    ...num(codigo, id, simbolo, nome, descricao, null, min, max, padrao, 1, grupo, nivel, extra),
    tipo: 'inteiro',
    precisao: 0,
  }
}

function bool(
  codigo: string,
  id: string,
  simbolo: string,
  nome: string,
  descricao: string,
  padrao: boolean,
  grupo: GrupoParametro,
  nivel: NivelParametro,
  extra: Comum = {},
): DefinicaoParametro {
  return {
    codigo,
    id,
    simbolo,
    nome,
    descricao,
    tipo: 'booleano',
    unidade: null,
    padrao,
    grupo,
    nivel,
    aliases: extra.aliases ?? [],
    derivado: extra.derivado ?? false,
    indexavel: extra.indexavel ?? false,
    aplicavelEm: extra.aplicavelEm ?? AMBOS,
    afeta: extra.afeta ?? ['cena'],
  }
}

function enu(
  codigo: string,
  id: string,
  simbolo: string,
  nome: string,
  descricao: string,
  opcoes: readonly OpcaoEnum[],
  padrao: string,
  grupo: GrupoParametro,
  nivel: NivelParametro,
  extra: Comum = {},
): DefinicaoParametro {
  return {
    codigo,
    id,
    simbolo,
    nome,
    descricao,
    tipo: 'enum',
    unidade: null,
    opcoes,
    padrao,
    grupo,
    nivel,
    aliases: extra.aliases ?? [],
    derivado: extra.derivado ?? false,
    indexavel: extra.indexavel ?? false,
    aplicavelEm: extra.aplicavelEm ?? AMBOS,
    afeta: extra.afeta ?? ['cena'],
  }
}

function outro(
  codigo: string,
  id: string,
  simbolo: string,
  nome: string,
  descricao: string,
  tipo: DefinicaoParametro['tipo'],
  padrao: ValorParametro,
  grupo: GrupoParametro,
  nivel: NivelParametro,
  extra: Comum = {},
): DefinicaoParametro {
  return {
    codigo,
    id,
    simbolo,
    nome,
    descricao,
    tipo,
    unidade: null,
    padrao,
    grupo,
    nivel,
    aliases: extra.aliases ?? [],
    derivado: extra.derivado ?? false,
    indexavel: extra.indexavel ?? false,
    aplicavelEm: extra.aplicavelEm ?? AMBOS,
    afeta: extra.afeta ?? ['apresentacao'],
  }
}

const op = (valor: string, rotulo: string): OpcaoEnum => ({ valor, rotulo })

// ═══════════════════════════════════════════════════════════════════════════
// Grupo A — Geometria do pêndulo (P01–P10)
// ═══════════════════════════════════════════════════════════════════════════

const GEOMETRIA: readonly DefinicaoParametro[] = [
  num('P01', 'L', 'L', 'Comprimento do fio', 'Distância do ponto de suspensão até o centro da massa.', 'm', 0.05, 10, 1, 0.001, 'geometria', 'basico', {
    aliases: ['comprimento', 'l'],
    indexavel: true,
    afeta: ['periodo', 'cena', 'geometria', 'formula'],
    precisao: 3,
    passoFino: 0.0001,
  }),
  num('P02', 'alpha', 'α', 'Amplitude angular inicial', 'Ângulo máximo de afastamento da vertical, de onde a massa é solta.', '°', 0.1, 179.9, 10, 0.1, 'geometria', 'basico', {
    aliases: ['alfa', 'a', 'amplitude'],
    indexavel: true,
    afeta: ['periodo', 'cena', 'formula'],
    precisao: 1,
    passoFino: 0.01,
    // No modo cicloidal a geometria limita a 90°: s = L·sen θ com |s| ≤ L.
    limiteDinamico: (v) => (v.texto('modo') !== 'simples' ? { max: 90 } : null),
  }),
  num('P03', 'theta0', 'θ₀', 'Ângulo inicial com sinal', 'Posição inicial, permitindo soltar de qualquer um dos lados.', '°', -179.9, 179.9, 10, 0.1, 'geometria', 'basico', {
    aliases: ['theta', 'teta'],
    indexavel: true,
    afeta: ['cena'],
    precisao: 1,
    limiteDinamico: (v) => (v.texto('modo') !== 'simples' ? { min: -90, max: 90 } : null),
  }),
  num('P04', 'omega0', 'ω₀', 'Velocidade angular inicial', 'Impulso inicial: diferente de zero, a massa começa em movimento.', 'rad/s', -20, 20, 0, 0.01, 'geometria', 'avancado', {
    aliases: ['omega', 'velocidadeInicial'],
    indexavel: true,
    afeta: ['cena'],
    precisao: 2,
  }),
  num('P05', 'm', 'm', 'Massa da esfera', 'Não afeta o período — e comprovar isso é um dos objetivos didáticos.', 'kg', 0.01, 10, 1, 0.01, 'geometria', 'basico', {
    aliases: ['massa'],
    indexavel: true,
    afeta: ['cena', 'graficos'],
    precisao: 2,
  }),
  num('P06', 'raioEsfera', 'R_b', 'Raio da esfera', 'Zero trata a massa como pontual; acima disso entra a correção de pêndulo físico.', 'm', 0, 2.5, 0, 0.001, 'geometria', 'avancado', {
    aliases: ['raioBob'],
    indexavel: true,
    afeta: ['cena', 'periodo'],
    precisao: 3,
    limiteDinamico: (v) => ({ max: v.numero('L') / 4 }),
  }),
  enu('P07', 'modeloComprimento', 'MODL', 'Modelo de comprimento efetivo', 'Como o corpo da esfera entra no comprimento que governa o período.', [
    op('pontual', 'massa pontual'),
    op('fioMaisRaio', 'fio + raio'),
    op('esferaSolida', 'esfera sólida'),
  ], 'pontual', 'geometria', 'avancado', { afeta: ['periodo'] }),
  num('P08', 'massaFio', 'm_f', 'Massa do fio', 'Fio com massa desloca o centro de oscilação.', 'kg', 0, 10, 0, 0.001, 'geometria', 'avancado', {
    afeta: ['periodo'],
    precisao: 3,
  }),
  outro('P09', 'posicaoSuspensao', 'x_p, y_p', 'Posição do ponto de suspensão', 'Onde o pivô fica no palco, em metros.', 'composto', { x: 0, y: 0 }, 'geometria', 'avancado', {
    afeta: ['cena'],
  }),
  inteiro('P10', 'numeroPendulos', 'n_p', 'Número de pêndulos simultâneos', 'Quantos pêndulos coexistem na cena para comparação.', 1, 8, 1, 'geometria', 'basico', {
    aliases: ['pendulos'],
    afeta: ['cena'],
  }),
]

// ═══════════════════════════════════════════════════════════════════════════
// Grupo B — Cicloide e faces (P11–P22)
// ═══════════════════════════════════════════════════════════════════════════

const CICLOIDE: readonly DefinicaoParametro[] = [
  num('P11', 'r', 'r', 'Raio do círculo gerador', 'Vinculado ao fio por L = 4r enquanto o vínculo estiver travado.', 'm', 0.0125, 2.5, 0.25, 0.001, 'cicloide', 'basico', {
    aliases: ['raioGerador'],
    aplicavelEm: SO_CICLOIDAL,
    afeta: ['geometria', 'cena'],
    precisao: 3,
  }),
  bool('P12', 'vinculoLR', 'VINC', 'Vínculo L = 4r', 'Travado, editar um atualiza o outro automaticamente.', true, 'cicloide', 'basico', {
    aplicavelEm: SO_CICLOIDAL,
    afeta: ['geometria'],
  }),
  num('P13', 'faseCicloide', 'φ', 'Fase paramétrica da cicloide', 'Parâmetro da curva, usado para inspecionar pontos específicos.', 'rad', 0, 2 * Math.PI, 0, 0.01, 'cicloide', 'avancado', {
    aplicavelEm: SO_CICLOIDAL,
    afeta: ['cena'],
    precisao: 3,
  }),
  num('P14', 's0', 's₀', 'Deslocamento inicial ao longo do arco', 'Posição de largada medida sobre a trajetória, em vez de por ângulo.', 'm', 0, 10, 0.5, 0.01, 'cicloide', 'basico', {
    aliases: ['arcoInicial'],
    aplicavelEm: SO_CICLOIDAL,
    afeta: ['cena'],
    precisao: 3,
    limiteDinamico: (v) => ({ max: v.numero('L') }),
  }),
  num('P15', 'h0', 'h', 'Altura de largada', 'Altura acima do ponto zero de onde a massa é solta: h = L·sen²θ/2.', 'm', 0, 5, 0.0151, 0.001, 'cicloide', 'basico', {
    aliases: ['altura', 'h'],
    indexavel: true,
    afeta: ['cena', 'periodo'],
    precisao: 4,
    limiteDinamico: (v) => ({ max: v.numero('L') / 2 }),
  }),
  num('P16', 'aberturaArco', 'ARC', 'Abertura angular do arco desenhado', 'Quanto da face cicloidal aparece na cena.', '°', 0, 360, 360, 1, 'cicloide', 'avancado', {
    aplicavelEm: SO_CICLOIDAL,
    afeta: ['cena'],
    precisao: 0,
  }),
  num('P17', 'espessuraFaces', 'e_f', 'Espessura das faces cicloidais', 'Traço com que as faces são desenhadas.', 'mm', 0, 20, 2, 0.5, 'cicloide', 'avancado', {
    aplicavelEm: SO_CICLOIDAL,
    afeta: ['cena'],
    precisao: 1,
  }),
  inteiro('P18', 'massasTautocrona', 'n_m', 'Massas na demonstração de tautocronia', 'Quantas massas são soltas juntas, de alturas diferentes.', 1, 8, 2, 'cicloide', 'basico', {
    aplicavelEm: SO_CICLOIDAL,
    afeta: ['cena'],
  }),
  bool('P19', 'exibirEvoluta', 'EVO', 'Exibir a curva de enrolamento', 'A evoluta: a cicloide sobre a qual o fio se enrola.', true, 'cicloide', 'basico', {
    aplicavelEm: SO_CICLOIDAL,
  }),
  bool('P20', 'exibirInvoluta', 'INV', 'Exibir a trajetória da massa', 'A involuta: a cicloide que a massa percorre.', true, 'cicloide', 'basico', {
    aplicavelEm: SO_CICLOIDAL,
  }),
  bool('P21', 'circuloOsculador', 'OSC', 'Círculo osculador', 'Mostra os centros de curvatura, que formam a evoluta.', false, 'cicloide', 'avancado', {
    aplicavelEm: SO_CICLOIDAL,
  }),
  bool('P22', 'circuloGerador', 'GEN', 'Círculo gerador rolante', 'Anima o círculo que, rolando, descreve a cicloide.', false, 'cicloide', 'avancado', {
    aplicavelEm: SO_CICLOIDAL,
  }),
]

// ═══════════════════════════════════════════════════════════════════════════
// Grupo C — Ambiente e dissipação (P23–P40)
// ═══════════════════════════════════════════════════════════════════════════

const AMBIENTE: readonly DefinicaoParametro[] = [
  num('P23', 'g', 'g', 'Aceleração da gravidade', 'A grandeza que a tabela de coleta infere a partir do período medido.', 'm/s²', 0.01, 300, 9.81, 0.01, 'ambiente', 'basico', {
    aliases: ['gravidade'],
    indexavel: true,
    afeta: ['periodo', 'cena', 'formula'],
    precisao: 2,
  }),
  enu('P24', 'corpoCeleste', 'BODY', 'Corpo celeste', 'Preset de gravidade.', [
    op('lua', 'Lua'),
    op('terra', 'Terra'),
    op('jupiter', 'Júpiter'),
    op('planetaX', 'Planeta X'),
    op('personalizado', 'Personalizado'),
  ], 'terra', 'ambiente', 'basico', { aliases: ['planeta'], afeta: ['periodo'] }),
  num('P25', 'latitude', 'lat', 'Latitude', 'A gravidade local varia com a latitude.', '°', 0, 90, 45, 0.1, 'ambiente', 'avancado', {
    afeta: ['periodo'],
    precisao: 1,
  }),
  num('P26', 'altitude', 'alt', 'Altitude', 'A gravidade cai com a altitude.', 'm', 0, 10000, 0, 1, 'ambiente', 'avancado', {
    afeta: ['periodo'],
    precisao: 0,
  }),
  enu('P27', 'modeloAtrito', 'MODF', 'Modelo de atrito', 'Como a energia é dissipada.', [
    op('nenhum', 'nenhum'),
    op('viscoso', 'viscoso linear'),
    op('quadratico', 'quadrático'),
    op('pivo', 'atrito no pivô'),
  ], 'nenhum', 'ambiente', 'basico', { aliases: ['atrito'], afeta: ['cena', 'graficos'] }),
  num('P28', 'zeta', 'ζ', 'Amortecimento adimensional', 'Zero é o pêndulo ideal; acima disso a amplitude decai.', null, 0, 0.3, 0, 0.001, 'ambiente', 'basico', {
    aliases: ['amortecimento'],
    afeta: ['cena'],
    precisao: 4,
    passoFino: 0.0001,
  }),
  num('P29', 'b', 'b', 'Coeficiente de amortecimento viscoso', 'Forma dimensional do amortecimento.', 'kg/s', 0, 10, 0, 0.001, 'ambiente', 'avancado', {
    afeta: ['cena'],
    precisao: 3,
  }),
  num('P30', 'cq', 'c_q', 'Coeficiente de arrasto quadrático', 'Arrasto proporcional ao quadrado da velocidade.', 's', 0, 2, 0, 0.001, 'ambiente', 'basico', {
    afeta: ['cena'],
    precisao: 4,
    passoFino: 0.0001,
  }),
  num('P31', 'Q', 'Q', 'Fator de qualidade', 'Quantas oscilações até a amplitude cair sensivelmente.', null, 1, 100000, 100000, 1, 'ambiente', 'avancado', {
    derivado: true,
    afeta: ['graficos'],
    precisao: 0,
  }),
  num('P32', 'densidadeAr', 'ρ', 'Densidade do ar', 'Entra no arrasto e no empuxo.', 'kg/m³', 0, 20, 1.225, 0.001, 'ambiente', 'avancado', {
    afeta: ['cena'],
    precisao: 3,
  }),
  num('P33', 'coefArrasto', 'C_d', 'Coeficiente de arrasto', 'Depende da forma do corpo; 0,47 é o da esfera.', null, 0, 2, 0.47, 0.01, 'ambiente', 'avancado', {
    afeta: ['cena'],
    precisao: 2,
  }),
  bool('P34', 'empuxo', 'EMP', 'Empuxo do ar', 'Correção de segunda ordem, relevante em medições de precisão.', false, 'ambiente', 'avancado', {
    afeta: ['periodo'],
  }),
  num('P35', 'amplitudeForcamento', 'A_d', 'Amplitude do forçamento externo', 'Força periódica aplicada — caminho para o regime caótico.', 's⁻²', 0, 50, 0, 0.01, 'ambiente', 'avancado', {
    afeta: ['cena'],
    precisao: 2,
  }),
  num('P36', 'omegaForcamento', 'ω_d', 'Frequência angular do forçamento', 'Perto da frequência natural aparece ressonância.', 'rad/s', 0, 50, 3.13, 0.01, 'ambiente', 'avancado', {
    afeta: ['cena'],
    precisao: 2,
  }),
  num('P37', 'faseForcamento', 'ϕ_d', 'Fase inicial do forçamento', 'Deslocamento de fase da força externa.', 'rad', 0, 2 * Math.PI, 0, 0.01, 'ambiente', 'avancado', {
    afeta: ['cena'],
    precisao: 2,
  }),
  enu('P38', 'movimentoPivo', 'PIVO', 'Movimento do ponto de suspensão', 'Pivô oscilante gera o pêndulo de Kapitza e afins.', [
    op('fixo', 'fixo'),
    op('vertical', 'oscilante vertical'),
    op('horizontal', 'oscilante horizontal'),
  ], 'fixo', 'ambiente', 'avancado', { afeta: ['cena'] }),
  num('P39', 'coefTermico', 'λ_t', 'Coeficiente de dilatação térmica do fio', 'Por que relógios de pêndulo atrasam no calor.', '1/K', 0, 5e-5, 1.2e-5, 1e-7, 'ambiente', 'avancado', {
    afeta: ['periodo'],
    precisao: 8,
  }),
  num('P40', 'temperatura', 'Θ', 'Temperatura', 'Dilata o fio e altera o período.', '°C', -50, 150, 20, 0.5, 'ambiente', 'avancado', {
    aliases: ['temp'],
    afeta: ['periodo'],
    precisao: 1,
  }),
]

// ═══════════════════════════════════════════════════════════════════════════
// Grupo D — Modelo matemático e numérico (P41–P52)
// ═══════════════════════════════════════════════════════════════════════════

const MODELO: readonly DefinicaoParametro[] = [
  enu('P41', 'modo', 'MODO', 'Modo do pêndulo', 'Simples, cicloidal, ou os dois lado a lado.', [
    op('simples', 'simples'),
    op('cicloidal', 'cicloidal'),
    op('comparacao', 'comparação'),
  ], 'simples', 'modelo', 'basico', {
    aliases: ['pendulo'],
    afeta: ['periodo', 'cena', 'formula', 'geometria'],
  }),
  inteiro('P42', 'N', 'N', 'Número de termos da série', 'Dois é a fórmula entregue; aumentar mostra a convergência.', 0, 50, 2, 'modelo', 'basico', {
    aliases: ['termos', 'n'],
    afeta: ['periodo', 'formula'],
  }),
  outro('P43', 'modelosExibidos', 'MOD', 'Modelos de período exibidos', 'Quais curvas de período aparecem sobrepostas.', 'multipla', ['T0', 'serie', 'exato'], 'modelo', 'basico', {
    afeta: ['formula', 'graficos'],
  }),
  enu('P44', 'fonteMovimento', 'FONTE', 'Origem do movimento animado', 'A animação segue a fórmula fechada ou a integração numérica.', [
    op('formula', 'fórmula fechada'),
    op('integracao', 'integração numérica'),
  ], 'formula', 'modelo', 'basico', { afeta: ['cena'] }),
  enu('P45', 'integrador', 'INTEG', 'Método numérico', 'O simplético conserva energia; o de alta ordem é mais preciso por passo.', [
    op('verlet', 'conservativo simplético'),
    op('rk4', 'alta ordem'),
  ], 'verlet', 'modelo', 'avancado', { afeta: ['cena', 'graficos'] }),
  // 1/600 s não tem representação decimal finita; o padrão é declarado já
  // arredondado à precisão exibida, para que o valor declarado sobreviva à
  // própria validação — sem isso a ida e volta pela URL nunca fecharia.
  num('P46', 'dt', 'Δt', 'Passo de tempo do cálculo', 'Menor é mais preciso e mais caro.', 's', 1e-5, 0.02, 0.001667, 1e-5, 'modelo', 'avancado', {
    aliases: ['passo'],
    afeta: ['cena'],
    precisao: 6,
  }),
  inteiro('P47', 'subpassos', 'n_sub', 'Subdivisões por quadro', 'Quantos passos de física cabem em um quadro de animação.', 1, 64, 10, 'modelo', 'avancado', {
    afeta: ['cena'],
  }),
  num('P48', 'tolerancia', 'tol', 'Tolerância do método adaptativo', 'Critério de parada para métodos de passo variável.', null, 1e-12, 1e-4, 1e-9, 1e-12, 'modelo', 'avancado', {
    afeta: ['cena'],
    precisao: 12,
  }),
  inteiro('P49', 'iteracoesExato', 'n_ref', 'Iterações do cálculo do valor exato', 'O AGM converge em cerca de cinco; oito dá folga.', 3, 20, 8, 'modelo', 'avancado', {
    afeta: ['periodo'],
  }),
  enu('P50', 'unidadeAngular', 'UNI_A', 'Unidade angular', 'Como os ângulos são exibidos e digitados.', [
    op('grau', 'grau'),
    op('radiano', 'radiano'),
    op('fracaoPi', 'fração de π'),
    op('grado', 'grado'),
  ], 'grau', 'modelo', 'basico', { afeta: ['apresentacao'] }),
  inteiro('P51', 'casasDecimais', 'dec', 'Casas decimais exibidas', 'Não altera a precisão interna dos cálculos.', 0, 8, 4, 'modelo', 'basico', {
    aliases: ['decimais'],
    afeta: ['apresentacao'],
  }),
  inteiro('P52', 'semente', 'SEED', 'Semente do ruído de medição', 'Mesma semente, mesma sequência — determinismo mesmo com ruído.', 0, 2147483647, 0, 'modelo', 'avancado', {
    aliases: ['seed'],
    afeta: ['graficos'],
  }),
]

// ═══════════════════════════════════════════════════════════════════════════
// Grupo E — Visualização da cena (P53–P74)
// ═══════════════════════════════════════════════════════════════════════════

const VISUAL: readonly DefinicaoParametro[] = [
  num('P53', 'zoom', 'zoom', 'Zoom do palco', 'Aproxima ou afasta a cena.', '×', 0.2, 5, 1, 0.05, 'visual', 'basico', { afeta: ['cena'], precisao: 2 }),
  bool('P54', 'transferidor', 'TRAN', 'Transferidor', 'Escala em graus sobre o ponto de suspensão.', true, 'visual', 'basico'),
  bool('P55', 'regua', 'REG', 'Régua', 'Régua métrica reposicionável.', false, 'visual', 'basico'),
  bool('P56', 'linhaVertical', 'VERT', 'Linha vertical de referência', 'A vertical a partir do pivô.', true, 'visual', 'basico'),
  bool('P57', 'arcoAmplitude', 'ARCO', 'Arco de amplitude', 'Destaca o ângulo de largada.', true, 'visual', 'basico'),
  bool('P58', 'rastro', 'RAST', 'Rastro da massa', 'O caminho percorrido, que some aos poucos.', true, 'visual', 'basico'),
  num('P59', 'duracaoRastro', 't_r', 'Duração do rastro', 'Por quanto tempo o rastro permanece visível.', 's', 0, 60, 4, 0.1, 'visual', 'avancado', { afeta: ['cena'], precisao: 1 }),
  bool('P60', 'rastroPeriodo', 'PT', 'Rastro de período', 'Marca um período completo sobre a trajetória.', false, 'visual', 'basico'),
  bool('P61', 'vetorVelocidade', 'VEL', 'Vetor velocidade', 'Seta tangente à trajetória.', false, 'visual', 'basico'),
  bool('P62', 'vetorAceleracao', 'ACE', 'Vetor aceleração', 'Seta da aceleração resultante.', false, 'visual', 'basico'),
  // A spec dava a este parâmetro o símbolo `DEC`, que colide com o `dec` de
  // P51 (casas decimais) depois de normalizado — digitar `dec = 3` escreveria
  // no parâmetro errado, em silêncio. Renomeado para `DECOMP`.
  bool('P63', 'decomporAceleracao', 'DECOMP', 'Decompor aceleração', 'Separa em tangencial e centrípeta.', false, 'visual', 'avancado'),
  outro('P64', 'vetoresForca', 'FOR', 'Vetores de força', 'Peso, tração, arrasto e resultante.', 'multipla', [], 'visual', 'avancado', { afeta: ['cena'] }),
  num('P65', 'escalaVetores', 'k_v', 'Escala dos vetores', 'Tamanho com que as setas são desenhadas.', '×', 0.1, 5, 1, 0.1, 'visual', 'avancado', { afeta: ['cena'], precisao: 1 }),
  bool('P66', 'estroboscopio', 'ESTR', 'Estroboscópio', 'Congela imagens da massa em instantes regulares.', false, 'visual', 'avancado'),
  num('P67', 'intervaloEstroboscopio', 'Δt_e', 'Intervalo do estroboscópio', 'Tempo entre imagens congeladas.', 's', 0.01, 2, 0.1, 0.01, 'visual', 'avancado', { afeta: ['cena'], precisao: 2 }),
  inteiro('P68', 'imagensEstroboscopio', 'n_e', 'Número de imagens do estroboscópio', 'Quantas imagens permanecem na tela.', 1, 60, 12, 'visual', 'avancado'),
  enu('P69', 'tema', 'TEMA', 'Tema visual', 'Claro, escuro ou alto contraste.', [
    op('claro', 'claro'),
    op('escuro', 'escuro'),
    op('altoContraste', 'alto contraste'),
  ], 'claro', 'visual', 'basico', { afeta: ['apresentacao'] }),
  outro('P70', 'coresPendulos', 'COR_i', 'Cor de cada pêndulo', 'Cores da paleta, distintas também por traço.', 'cor', 'automatica', 'visual', 'basico', { indexavel: true, afeta: ['cena'] }),
  outro('P71', 'grade', 'GRID', 'Grade métrica de fundo', 'Grade com espaçamento configurável, em metros.', 'composto', { ligada: false, espacamento: 0.25 }, 'visual', 'avancado', { afeta: ['cena'] }),
  bool('P72', 'painelFormula', 'FORM', 'Painel da fórmula', 'A fórmula viva sob a cena. Ligado por padrão — é a interface.', true, 'visual', 'basico', { afeta: ['formula'] }),
  inteiro('P73', 'termoDestacado', 'n_h', 'Termo destacado da série', 'Qual termo da fórmula fica em evidência.', -1, 50, -1, 'visual', 'avancado', { afeta: ['formula'] }),
  bool('P74', 'pendulOFantasma', 'FANT', 'Pêndulo de referência com T₀', 'Sobrepõe o pêndulo idealizado, para ver a defasagem.', false, 'visual', 'avancado'),
]

// ═══════════════════════════════════════════════════════════════════════════
// Grupo F — Gráficos e medição (P75–P89)
// ═══════════════════════════════════════════════════════════════════════════

const GRAFICOS: readonly DefinicaoParametro[] = [
  outro('P75', 'graficosTemporais', 'GR_T', 'Gráficos temporais', 'θ(t), ω(t) e a(t).', 'multipla', ['theta'], 'graficos', 'basico', { afeta: ['graficos'] }),
  bool('P76', 'espacoFase', 'GR_F', 'Espaço de fase', 'Trajetória no plano ângulo × velocidade angular.', false, 'graficos', 'avancado', { afeta: ['graficos'] }),
  bool('P77', 'poincare', 'GR_P', 'Seção de Poincaré', 'Amostra o estado uma vez por ciclo do forçamento.', false, 'graficos', 'avancado', { afeta: ['graficos'] }),
  bool('P78', 'barrasEnergia', 'GR_E', 'Barras de energia', 'Cinética, potencial, térmica e total.', true, 'graficos', 'basico', { afeta: ['graficos'] }),
  bool('P79', 'curvaTalpha', 'GR_Ta', 'Curva T(α)', 'Como o período depende da amplitude. Reta horizontal no cicloidal.', true, 'graficos', 'basico', { afeta: ['graficos'] }),
  outro('P80', 'graficoErro', 'GR_err', 'Gráfico de erro relativo', 'Desvio de cada modelo em relação ao valor exato.', 'composto', { ligado: true, escala: 'logaritmica' }, 'graficos', 'basico', { afeta: ['graficos'] }),
  outro('P81', 'eixosGrafico', 'EIXO', 'Eixos do gráfico escolhíveis', 'Qualquer grandeza exposta em qualquer eixo.', 'composto', { x: 't', y: 'theta' }, 'graficos', 'avancado', { afeta: ['graficos'] }),
  bool('P82', 'fotoporta', 'FOTO', 'Fotoporta móvel', 'Instrumento adicional, distinto do sensor fixo no ponto zero.', true, 'medicao', 'basico', { afeta: ['cena'] }),
  num('P83', 'posicaoFotoporta', 'θ_g', 'Posição angular da fotoporta', 'Onde a fotoporta móvel fica ao longo do arco.', '°', -90, 90, 0, 0.1, 'medicao', 'avancado', { afeta: ['cena'], precisao: 1 }),
  enu('P84', 'modoContagem', 'MODT', 'Modo de contagem', 'Meio período é o que a barreira de luz do roteiro alemão mede.', [
    op('meioPeriodo', 'meio período'),
    op('periodoCompleto', 'período completo'),
  ], 'periodoCompleto', 'medicao', 'basico', { afeta: ['graficos'] }),
  bool('P85', 'cronometro', 'CRON', 'Cronômetro manual', 'Iniciar, parar e zerar.', false, 'medicao', 'basico'),
  inteiro('P86', 'periodosCronometrados', 'n_T', 'Períodos a cronometrar', 'Média sobre n períodos reduz o erro de reação.', 1, 100, 10, 'medicao', 'avancado'),
  num('P87', 'ruidoMedicao', 'σ_m', 'Ruído de medição simulado', 'Dispersão artificial, para simular medição real.', 'ms', 0, 100, 0, 0.1, 'medicao', 'avancado', { afeta: ['graficos'], precisao: 1 }),
  bool('P88', 'caderno', 'TAB', 'Caderno de laboratório', 'A mesma coleção que a tabela de coleta exibe.', false, 'medicao', 'basico', { afeta: ['graficos'] }),
  bool('P89', 'espectro', 'FFT', 'Espectro de potência', 'Conteúdo em frequência do movimento.', false, 'graficos', 'avancado', { afeta: ['graficos'] }),
]

// ═══════════════════════════════════════════════════════════════════════════
// Grupo G — Animação e tempo (P90–P95)
// ═══════════════════════════════════════════════════════════════════════════

const ANIMACAO: readonly DefinicaoParametro[] = [
  enu('P90', 'execucao', 'PLAY', 'Estado de execução', 'Parado, rodando ou pausado.', [
    op('parado', 'parado'),
    op('rodando', 'rodando'),
    op('pausado', 'pausado'),
  ], 'pausado', 'animacao', 'basico', { afeta: ['cena'] }),
  num('P91', 'escalaTempo', 'k_t', 'Fator de velocidade da animação', 'Câmera lenta escala o tempo simulado, não a taxa de quadros.', '×', 0.02, 4, 1, 0.01, 'animacao', 'basico', {
    aliases: ['velocidade'],
    afeta: ['cena'],
    precisao: 2,
  }),
  enu('P92', 'fps', 'fps', 'Taxa de quadros alvo', 'Quadros por segundo pretendidos.', [
    op('30', '30'),
    op('60', '60'),
    op('120', '120'),
  ], '60', 'animacao', 'avancado', { afeta: ['cena'] }),
  num('P93', 't', 't', 'Tempo de simulação', 'Quanto tempo simulado já decorreu.', 's', 0, Number.MAX_SAFE_INTEGER, 0, 0.001, 'animacao', 'basico', {
    derivado: true,
    afeta: ['cena'],
    precisao: 3,
  }),
  bool('P94', 'reverterTempo', 'REV', 'Reverter o tempo', 'Só faz sentido sem atrito, onde o movimento é reversível.', false, 'animacao', 'avancado', { afeta: ['cena'] }),
  inteiro('P95', 'pararApos', 'LOOP', 'Parar automaticamente após n períodos', 'Zero desliga a parada automática.', 0, 100, 0, 'animacao', 'avancado', { afeta: ['cena'] }),
]

// ═══════════════════════════════════════════════════════════════════════════
// Grupo H — Dados, presets e exportação (P96–P105)
// ═══════════════════════════════════════════════════════════════════════════

const DADOS: readonly DefinicaoParametro[] = [
  bool('P96', 'console', 'CONS', 'Console de parâmetros em texto', 'Onde se digita α = 10 diretamente.', true, 'dados', 'basico', { afeta: ['apresentacao'] }),
  outro('P97', 'presetsUsuario', 'PRESET', 'Presets nomeados do usuário', 'Salvar, carregar, renomear e excluir.', 'texto', '', 'dados', 'basico'),
  enu('P98', 'presetFabrica', 'FAB', 'Presets de fábrica', 'Cenários prontos, incluindo o do roteiro alemão.', [
    op('nenhum', 'nenhum'),
    op('pequenasOscilacoes', 'pequenas oscilações'),
    op('anarmonico', 'regime anarmônico'),
    op('roteiroAlemao', 'experimento do roteiro alemão'),
    op('tautocrona', 'tautócrona de Huygens'),
    op('amortecido', 'regime amortecido'),
  ], 'nenhum', 'dados', 'basico'),
  outro('P99', 'urlCompartilhavel', 'URL', 'Endereço compartilhável', 'Codifica o estado inteiro no endereço.', 'acao', '', 'dados', 'basico'),
  outro('P100', 'exportarCsv', 'CSV', 'Exportar tabela de medidas', 'CSV com as colunas T e g.', 'acao', '', 'dados', 'basico'),
  outro('P101', 'exportarImagem', 'IMG', 'Exportar imagem', 'PNG da cena ou do gráfico.', 'acao', '', 'dados', 'basico'),
  outro('P102', 'exportarVideo', 'VID', 'Exportar animação em vídeo', 'Gravação do movimento.', 'acao', '', 'dados', 'avancado'),
  outro('P103', 'arquivoCenario', 'CEN', 'Importar e exportar cenário', 'Arquivo com o estado completo.', 'acao', '', 'dados', 'avancado'),
  bool('P104', 'desafioPlanetaX', 'PX', 'Desafio Planeta X', 'Oculta a gravidade e pede que ela seja descoberta.', false, 'dados', 'basico', { afeta: ['apresentacao'] }),
  outro('P105', 'roteiros', 'ROT', 'Roteiros guiados', 'Sequências de passos com perguntas.', 'texto', '', 'dados', 'avancado'),
]

// ═══════════════════════════════════════════════════════════════════════════
// Grupo I — Idioma e acessibilidade (P106–P112)
// ═══════════════════════════════════════════════════════════════════════════

const ACESSIBILIDADE: readonly DefinicaoParametro[] = [
  enu('P106', 'idioma', 'LANG', 'Idioma da interface', 'Trocar o idioma não perde o estado.', [
    op('pt-BR', 'português do Brasil'),
    op('en', 'English'),
    op('de', 'Deutsch'),
  ], 'pt-BR', 'acessibilidade', 'basico', { afeta: ['apresentacao'] }),
  enu('P107', 'densidadeInterface', 'FS', 'Tamanho de fonte e densidade', 'Compacta, normal ou ampliada.', [
    op('compacta', 'compacta'),
    op('normal', 'normal'),
    op('ampliada', 'ampliada'),
  ], 'normal', 'acessibilidade', 'avancado', { afeta: ['apresentacao'] }),
  bool('P108', 'paletaDaltonismo', 'DALT', 'Paleta segura para daltonismo', 'Cores distinguíveis também por traço e marcador.', false, 'acessibilidade', 'avancado', { afeta: ['apresentacao'] }),
  bool('P109', 'sonificacao', 'SOM', 'Sonificação do movimento', 'Torna audível a simultaneidade das passagens.', false, 'acessibilidade', 'avancado', { afeta: ['apresentacao'] }),
  bool('P110', 'teclado', 'KBD', 'Operação completa por teclado', 'Sempre ligada — não é desativável.', true, 'acessibilidade', 'basico', { derivado: true, afeta: ['apresentacao'] }),
  bool('P111', 'descricoesLeitorTela', 'SR', 'Descrições para leitor de tela', 'Textos alternativos e regiões dinâmicas.', true, 'acessibilidade', 'basico', { afeta: ['apresentacao'] }),
  bool('P112', 'movimentoReduzido', 'MOV', 'Reduzir movimento', 'Segue a preferência do sistema; nesse modo inicia pausado.', false, 'acessibilidade', 'basico', { afeta: ['apresentacao'] }),
]

// ═══════════════════════════════════════════════════════════════════════════

/** Catálogo completo, na ordem canônica. */
export const PARAMETROS: readonly DefinicaoParametro[] = [
  ...GEOMETRIA,
  ...CICLOIDE,
  ...AMBIENTE,
  ...MODELO,
  ...VISUAL,
  ...GRAFICOS,
  ...ANIMACAO,
  ...DADOS,
  ...ACESSIBILIDADE,
]

/** Índice por `id`, para busca em tempo constante. */
export const POR_ID: ReadonlyMap<string, DefinicaoParametro> = new Map(
  PARAMETROS.map((p) => [p.id, p]),
)

/** Índice por código do catálogo (`P01`…`P112`). */
export const POR_CODIGO: ReadonlyMap<string, DefinicaoParametro> = new Map(
  PARAMETROS.map((p) => [p.codigo, p]),
)

/** Normaliza um termo digitado: sem acentos, minúsculo, sem espaços nas bordas. */
export function normalizarChave(texto: string): string {
  return texto
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

/**
 * Índice de busca do console: mapeia toda grafia aceita para o `id`.
 *
 * Inclui `id`, `simbolo`, `nome` e os `aliases` declarados, todos normalizados.
 */
export const POR_TERMO: ReadonlyMap<string, string> = (() => {
  const mapa = new Map<string, string>()
  for (const p of PARAMETROS) {
    for (const termo of [p.id, p.simbolo, p.nome, ...p.aliases]) {
      const chave = normalizarChave(termo)
      if (chave !== '' && !mapa.has(chave)) mapa.set(chave, p.id)
    }
  }
  return mapa
})()

/** Busca um parâmetro por qualquer grafia aceita. */
export function encontrarParametro(termo: string): DefinicaoParametro | undefined {
  const id = POR_TERMO.get(normalizarChave(termo))
  return id === undefined ? undefined : POR_ID.get(id)
}

/** Valores padrão de todo o catálogo. */
export function valoresPadrao(): Record<string, ValorParametro> {
  const saida: Record<string, ValorParametro> = {}
  for (const p of PARAMETROS) saida[p.id] = p.padrao
  return saida
}

export const PARAMETROS_EDITAVEIS = PARAMETROS.filter((p) => !p.derivado)
export const PARAMETROS_INDEXAVEIS = PARAMETROS.filter((p) => p.indexavel)
