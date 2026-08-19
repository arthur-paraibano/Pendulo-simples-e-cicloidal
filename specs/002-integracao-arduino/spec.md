# Especificação de Funcionalidade: Integração com Arduino

**Funcionalidade**: `002-integracao-arduino`
**Data**: 2026-08-17
**Status**: 🕓 **ADIADA** — incremento planejado para depois da entrega de
[`001-pendulo-formula-completa`](../001-pendulo-formula-completa/spec.md)
**Depende de**: 001 concluída (motor de física, sensor do ponto zero, tabela de coleta)

---

## 1. Pergunta que originou esta especificação

> "Colocando um Arduino, o tempo daria para passar a informação para o sistema? Se sim, como?"

**Resposta curta: sim.** O navegador consegue ler um Arduino por USB **sem instalar nada e sem
servidor**, usando a **Web Serial API**. O Arduino cronometra as passagens do pêndulo por uma
barreira óptica e envia os instantes; a aplicação converte em período e alimenta a mesma tabela de
coleta que hoje é alimentada pelo sensor simulado.

**Há uma restrição que precisa ser decidida antes**: a Web Serial exige **contexto seguro** e só
existe em navegadores Chromium (Chrome, Edge, Opera) — **não** há suporte em Firefox nem Safari.
Ver Seção 6.

---

## 2. Por que isto encaixa bem na arquitetura existente

O ganho é que **não é preciso inventar nenhum modelo de dados novo**. A funcionalidade 001 já define
a entidade `EventoPassagem` — instante interpolado, sentido e número de travessia — produzida pelo
`SensorZero` simulado e consumida pela consolidação de `Medicao`.

O Arduino simplesmente vira **uma segunda fonte da mesma entidade**:

```
                       ┌─────────────────────┐
   sensor simulado ───▶│                     │
                       │   EventoPassagem    │──▶ período ──▶ inferência de g ──▶ TABELA
   Arduino (real)  ───▶│                     │
                       └─────────────────────┘
```

Tudo o que vem depois — cálculo de período, meio período versus período completo, inferência de `g`,
estatísticas, gráficos, exportação em CSV — funciona **sem alteração**. O aparato real passa a poder
ser comparado com a curva teórica na mesma tela, que é exatamente o que o roteiro experimental
alemão faz com osciloscópio e barreira de luz.

---

## 3. Montagem física

Reproduz o `Lichtschranke` (barreira de luz) do roteiro alemão, substituindo o osciloscópio pelo
Arduino.

| Item | Observação |
|---|---|
| Arduino Uno, Nano ou Leonardo | Qualquer um com um pino de interrupção externa |
| Sensor óptico de barreira | LED infravermelho + fototransistor, ou sensor óptico ranhurado |
| Resistores e protoboard | Divisor do fototransistor |
| Cabo USB | Alimentação e comunicação |

**Posicionamento**: a barreira fica no **ponto mais baixo da trajetória**, o mesmo ponto zero da
funcionalidade 001 — e, no aparato cicloidal, na cúspide inferior. A massa interrompe o feixe uma
vez a cada passagem.

**Precisão disponível**: `micros()` tem resolução de 4 µs em AVR de 16 MHz. Precisamos de 0,1 ms
(100 µs) para reproduzir a diferença de +3,826 ms a 10° descrita na
[pesquisa de 001](../001-pendulo-formula-completa/research.md). A folga é de **25×** — sobra
resolução, o gargalo real é o alinhamento mecânico do aparato, como o próprio roteiro alemão observa.

---

## 4. Requisitos Funcionais

### Aquisição

- **RF-201**: O sistema DEVE permitir conectar um dispositivo de medição externo por porta serial,
  a partir de uma ação explícita do usuário.
- **RF-202**: O sistema DEVE detectar e informar quando o navegador em uso não oferece a capacidade
  de comunicação serial, indicando as alternativas disponíveis, sem quebrar nenhuma funcionalidade
  existente.
- **RF-203**: O dispositivo DEVE informar sua identificação e a versão do protocolo ao conectar, e o
  sistema DEVE recusar versões incompatíveis com mensagem explícita.
- **RF-204**: O sistema DEVE registrar cada evento de passagem recebido como um `EventoPassagem`
  equivalente ao produzido pelo sensor simulado, preservando toda a cadeia de consolidação existente.
- **RF-205**: O sistema DEVE tratar os instantes recebidos como **intervalos relativos**, nunca como
  relógio absoluto, e DEVE tratar corretamente o transbordo do contador do dispositivo.
- **RF-206**: O sistema DEVE identificar cada linha da tabela como proveniente de **medição real** ou
  de **simulação**, e essa distinção DEVE constar da exportação em CSV.
- **RF-207**: O sistema DEVE permitir que medições reais e simuladas coexistam na mesma tabela, para
  comparação direta.

### Interpretação da medida

- **RF-208**: O sistema DEVE aplicar ao dispositivo real a mesma convenção da funcionalidade 001:
  passagens consecutivas correspondem a **meio período**; passagens no mesmo sentido, a um período
  completo.
- **RF-209**: Com **uma única** barreira óptica não é possível distinguir o sentido do movimento; o
  sistema DEVE assumir sentidos alternados — válido para movimento oscilatório — e DEVE declarar
  essa suposição na interface.
- **RF-210**: O sistema DEVE oferecer suporte opcional a **duas** barreiras, caso em que o sentido é
  determinado pela ordem de acionamento e a suposição de RF-209 deixa de ser necessária.
- **RF-211**: O comprimento `L` do pêndulo real DEVE ser informado manualmente pelo usuário, com
  campo próprio para sua incerteza, já que o dispositivo mede apenas tempo.
- **RF-212**: A partir do período real medido e do `L` informado, o sistema DEVE inferir `g` pelas
  mesmas regras da funcionalidade 001 — inclusive exibindo, lado a lado, o valor obtido **com** e
  **sem** os termos de correção da série.
- **RF-213**: O sistema PODE calcular a velocidade da massa na passagem a partir da duração da
  obstrução do feixe e da largura da esfera, se esta for informada.

### Robustez e diagnóstico

- **RF-214**: O sistema DEVE descartar acionamentos separados por intervalo inferior a um limiar
  configurável, para eliminar repique do sensor, e DEVE contabilizar os descartes.
- **RF-215**: O sistema DEVE exibir um painel de diagnóstico com estado da conexão, taxa de eventos,
  intervalo bruto do último par e eventos descartados.
- **RF-216**: A desconexão do dispositivo NÃO DEVE causar perda das medições já registradas, e o
  sistema DEVE permitir reconectar sem recarregar a página.
- **RF-217**: O sistema DEVE permitir exportar e importar a sessão de medição real, preservando a
  distinção em relação aos dados simulados.

---

## 5. Protocolo de Comunicação

Linhas ASCII terminadas em `\n`, 115200 bauds, 8N1. Formato deliberadamente legível: o usuário deve
conseguir abrir o monitor serial e entender o que está sendo transmitido.

### Dispositivo → aplicação

| Linha | Significado |
|---|---|
| `PEND,1,<descrição>` | Identificação e versão do protocolo, enviada ao conectar |
| `E,<micros>,<duracao_us>` | Evento de passagem: instante do acionamento e duração da obstrução |
| `S,<micros>,<mensagem>` | Estado ou diagnóstico |
| `X,<micros>,<motivo>` | Evento descartado, com o motivo |

### Aplicação → dispositivo

| Linha | Significado |
|---|---|
| `R` | Zerar o contador de eventos |
| `P` | Ping; o dispositivo responde com `S` |
| `D,<us>` | Definir o limiar de anti-repique |

### Esboço do lado Arduino *(ilustrativo, não normativo)*

```cpp
const uint8_t PINO_SENSOR = 2;          // interrupção externa
volatile uint32_t tInicio = 0, tFim = 0;
volatile bool temEvento = false;
uint32_t ultimoEvento = 0;
uint32_t limiarRepique = 50000;         // 50 ms

void aoMudar() {
  if (digitalRead(PINO_SENSOR) == LOW) {          // feixe interrompido
    tInicio = micros();
  } else {                                        // feixe restabelecido
    tFim = micros();
    if (tInicio - ultimoEvento > limiarRepique) { // subtração sem sinal trata o transbordo
      ultimoEvento = tInicio;
      temEvento = true;
    }
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(PINO_SENSOR, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(PINO_SENSOR), aoMudar, CHANGE);
  Serial.println(F("PEND,1,barreira-optica-ponto-zero"));
}

void loop() {
  if (temEvento) {
    noInterrupts();
    uint32_t t = tInicio, d = tFim - tInicio;
    temEvento = false;
    interrupts();
    Serial.print(F("E,")); Serial.print(t);
    Serial.print(','); Serial.println(d);
  }
}
```

Pontos que o esboço já resolve e que a implementação DEVE preservar: leitura por **interrupção**
(não por sondagem, que perderia eventos), **anti-repique** por limiar, aritmética **sem sinal** para
o transbordo de `micros()` a cada ~71,6 minutos, e cópia dos voláteis com as interrupções desligadas.

### Esboço do lado navegador *(ilustrativo)*

```js
const porta = await navigator.serial.requestPort();   // exige gesto do usuário
await porta.open({ baudRate: 115200 });

const leitor = porta.readable
  .pipeThrough(new TextDecoderStream())
  .pipeThrough(new TransformStream(divisorDeLinhas))
  .getReader();

while (true) {
  const { value, done } = await leitor.read();
  if (done) break;
  const [tipo, micros, extra] = value.split(',');
  if (tipo === 'E') {
    registrarPassagem({                    // MESMA ação já existente na 001
      t: Number(micros) / 1e6,
      origem: 'real',
      duracaoFeixe: Number(extra) / 1e6,
    });
  }
}
```

---

## 6. Restrição decisiva: onde a página precisa estar hospedada

A Web Serial exige **contexto seguro** e **gesto explícito do usuário** para abrir a porta. Isso
entra em tensão direta com o **Princípio VII** da
[constituição](../../.specify/memory/constitution.md), que exige que a aplicação funcione como
arquivo único aberto com duplo clique.

| Forma de abrir | Serial funciona? |
|---|---|
| `https://…` (GitHub Pages) | **Sim** |
| `http://localhost` (`npm run dev` / `npm run preview`) | **Sim** |
| `file://` (duplo clique no `pendulo-simulador.html`) | **Incerto** — varia entre navegador e versão; **deve ser verificado no navegador-alvo antes de prometer** |
| Firefox, Safari | **Não** — a API não existe |

- **[NECESSITA ESCLARECIMENTO]**: confirmar experimentalmente o comportamento em `file://` no
  navegador que será usado em sala. Enquanto não for confirmado, a documentação **não deve** afirmar
  que o modo offline por duplo clique suporta o Arduino.
- **Consequência aceita**: a integração com Arduino é um recurso **adicional e opcional**. A
  aplicação inteira continua funcionando sem ele, em qualquer navegador (RF-202). Nenhum requisito
  da funcionalidade 001 pode passar a depender do hardware.

---

## 7. Alternativas Consideradas

| Rota | Como funciona | Prós | Contras |
|---|---|---|---|
| **Web Serial** *(recomendada)* | Navegador lê o USB direto | Nada a instalar, sem servidor, protocolo legível, bidirecional | Só Chromium; exige contexto seguro |
| **Teclado emulado** | Arduino Leonardo/Micro se apresenta como teclado e "digita" o valor no campo focado | Funciona em **todo** navegador e até em `file://`; zero API | Frágil: depende do foco correto; unidirecional; sem diagnóstico |
| **Web Bluetooth** | ESP32 ou Nano 33 BLE por BLE | Sem cabo | Mesma limitação de navegador; mais complexo; alimentação |
| **Ponte local** | Serviço em Node ou Python lê a serial e publica por WebSocket | Funciona em qualquer navegador | **Viola o Princípio VII** — exige instalação e um processo rodando |
| **Importação de arquivo** | Arduino grava em cartão SD ou no monitor serial; usuário importa CSV | Universal, sem API | Não é ao vivo |

**Recomendação**: implementar **Web Serial** como caminho principal e **importação de CSV** como
alternativa universal — as duas juntas cobrem todos os navegadores, sem violar nenhum princípio da
constituição. A emulação de teclado fica registrada como saída de emergência caso o `file://` se
mostre bloqueante e a sala de aula não tenha como servir por `localhost`.

---

## 8. Critérios de Sucesso

| # | Critério |
|---|---|
| CS-201 | Com um pêndulo real de 1 m, o período medido pelo Arduino concorda com o cronômetro de referência dentro de 1 ms |
| CS-202 | A diferença de período entre amplitudes de 10° e 20° é detectada e corresponde, dentro da incerteza declarada, aos ≈ 15,4 ms previstos pela teoria |
| CS-203 | O `g` inferido de medições reais, com os termos de correção, fica dentro de 1 % do valor local conhecido |
| CS-204 | Medições reais e simuladas aparecem sobrepostas no mesmo gráfico `T(α)`, visualmente distinguíveis |
| CS-205 | Em navegador sem suporte, a aplicação funciona integralmente e explica a ausência do recurso |
| CS-206 | Desconectar o cabo no meio da coleta não perde nenhuma linha já registrada |

---

## 9. Fora de Escopo desta Funcionalidade

- Controle de atuadores (soltar a massa por eletroímã, ajustar comprimento por motor)
- Aquisição de vídeo ou rastreamento óptico da massa
- Múltiplos dispositivos simultâneos
- Calibração automática do aparato
- Projeto de circuito impresso ou lista de materiais detalhada

---

## 10. Referências

- [Web Serial API — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API)
- [Read from and write to a serial port — Chrome for Developers](https://developer.chrome.com/docs/capabilities/serial)
- [Secure Contexts — MDN](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Secure_Contexts)
- `mhd_zykloidenpendel.pdf` — a barreira de luz e a medição de meio período que este hardware reproduz
- [research.md de 001](../001-pendulo-formula-completa/research.md) — Tabela E, os alvos numéricos a reproduzir
