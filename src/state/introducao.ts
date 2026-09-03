/**
 * Orientação de primeiro uso (RF-126).
 *
 * A decisão de mostrar ou não é pura e mora aqui, longe do DOM: é ela que
 * carrega a regra de "não repetida automaticamente", e é ela que o teste
 * unitário consegue apertar sem navegador.
 *
 * A preferência guarda um marcador explícito em vez de contar aberturas. O que
 * o requisito pede é que a orientação não volte sozinha depois de dispensada —
 * uma contagem responderia a outra pergunta, e responderia errado quando o
 * armazenamento falha.
 */

export const CHAVE_INTRODUCAO_VISTA = 'introducaoVista'

export interface TrechoIntroducao {
  readonly titulo: string
  readonly texto: string
}

/**
 * O texto é curto por duas razões, e a segunda é dura.
 *
 * A primeira: quem abre o simulador quer ver o pêndulo, não ler um manual.
 *
 * A segunda: a Área K exige que a fórmula comece visível logo abaixo da cena em
 * 1366×768, e o cartão fica no fluxo da página. Cada linha a mais aqui empurra a
 * fórmula para baixo da dobra. O orçamento é de cerca de 180 px com as margens —
 * medido, não estimado —, e é o que mantém estes três trechos em duas linhas.
 */
export const TITULO_INTRODUCAO = 'O que este simulador demonstra'

export const TRECHOS_INTRODUCAO: readonly TrechoIntroducao[] = [
  {
    titulo: 'Uma fórmula, dois pêndulos',
    texto:
      'o período do simples cresce com a amplitude; o cicloidal bate sempre no mesmo tempo, ' +
      'venha de onde vier.',
  },
  {
    titulo: 'A fórmula fica viva sob a cena',
    texto: 'cada termo mostra seu valor enquanto o pêndulo se move.',
  },
  {
    titulo: 'Mede-se e compara-se',
    texto:
      'o sensor no ponto mais baixo preenche a tabela com o período medido e a gravidade ' +
      'inferida.',
  },
]

/** Verdadeiro apenas enquanto a orientação nunca tiver sido dispensada. */
export function deveMostrarIntroducao(preferencias: Readonly<Record<string, unknown>>): boolean {
  return preferencias[CHAVE_INTRODUCAO_VISTA] !== true
}

/** Preferências com a orientação marcada como vista. Não altera a entrada. */
export function marcarIntroducaoVista(
  preferencias: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  return { ...preferencias, [CHAVE_INTRODUCAO_VISTA]: true }
}
