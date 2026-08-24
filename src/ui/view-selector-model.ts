export type VisualizacaoUi = 'simples' | 'cicloidal' | 'comparacao'

export const OPCOES_VISUALIZACAO: readonly {
  readonly valor: VisualizacaoUi
  readonly rotulo: string
  readonly descricao: string
}[] = [
  { valor: 'simples', rotulo: 'Simples', descricao: 'Pêndulo livre' },
  { valor: 'cicloidal', rotulo: 'Cicloidal', descricao: 'Pêndulo entre faces cicloidais' },
  { valor: 'comparacao', rotulo: 'Ambos', descricao: 'Comparação com eixo e escala comuns' },
]
