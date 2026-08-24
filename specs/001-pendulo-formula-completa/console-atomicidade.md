# Decisão pendente — atomicidade do console

A implementação mantém, nesta fase, a atomicidade de cada bloco: se qualquer
atribuição for inválida, nenhuma das demais é aplicada.

Essa decisão segue o teste de aceitação T047 e o contrato já executável do
estado. Ela conflita com o texto atual do RF-057, que pede aplicar as linhas
válidas mesmo quando outras forem rejeitadas. A divergência não deve ser
resolvida silenciosamente: antes de mudar o comportamento, é necessário escolher
qual regra é normativa e atualizar em conjunto especificação, tarefa e testes.

Independentemente dessa decisão, toda rejeição agora informa linha, posição e
motivo, como exige a parte diagnóstica do RF-057.

Limitações válidas continuam sendo aplicadas atomicamente junto com o restante
do bloco. Quando uma troca para Cicloidal/Ambos provoca ajustes derivados em
`alpha` ou `theta0`, o resultado bem-sucedido também enumera os valores anterior
e final e explica a restrição geométrica. Isso não transforma o ajuste derivado
em uma segunda transação e não permite que um bloco inválido altere o estado.
