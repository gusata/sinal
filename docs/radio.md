# 📡 RÁDIO — Documento de Design

> Nome provisório: **"Sinal"** (alternativas: *Estática*, *Ouvinte*, *Banda Larga*, *Eco Profundo*)
> Plataforma: **Mobile (Android/iOS), retrato, uma mão só**
> Gênero: Idle / incremental com narrativa revelada aos poucos

---

## 1. Pitch

Você é o operador solitário de uma estação de rádio no fim do mundo, apontada para o céu. No começo só há estática. Com o tempo você melhora a antena, aprende a filtrar o ruído e começa a ouvir **padrões**. Alguém, ou alguma coisa, está transmitindo.

O jogo é um idle de números subindo, mas o que motiva o jogador é a **curiosidade**: cada upgrade deixa você um pouco mais perto de entender as mensagens.

**Referências de sensação:** *A Dark Room*, *Universal Paperclips*, *Contato* (filme), *Outer Wilds* (o mistério), *Signalis* (estética de terminal).

---

## 2. Pilares de design

1. **Mistério antes de número.** Todo marco numérico importante libera um pedaço de história.
2. **Minimalismo de terminal.** Texto, linhas e formas simples. Nada de sprites complexos.
3. **Sessões curtas, retorno recompensado.** O jogo é bom em 30 segundos e melhor ainda depois de 8 horas fora.
4. **Uma mão, um polegar.** Tudo alcançável na metade inferior da tela.
5. **Silêncio também é conteúdo.** Pausas, mensagens curtas e som ambiente fazem parte da experiência.

---

## 3. Loop principal

```
  [Antenas captam SINAL] ──► [Decodificador converte SINAL em DADOS]
            ▲                               │
            │                               ▼
  [Comprar/melhorar antenas] ◄── [Gastar DADOS em upgrades e decifrações]
                                            │
                                            ▼
                               [FRAGMENTOS de mensagem → História]
```

- **Micro (segundos):** tocar na tela para gerar pulsos manuais e ver os números subirem.
- **Médio (minutos):** comprar antenas, sintonizar frequências novas, decifrar mensagens.
- **Macro (horas/dias):** completar arcos de história e fazer o prestígio ("Silêncio").

---

## 4. Recursos

| Recurso | Ícone | Como ganha | Para que serve |
|---|---|---|---|
| **Sinal** (Hz) | `~` | Antenas, de forma passiva, e toques | Matéria-prima. Alimenta o decodificador |
| **Dados** (KB → MB → GB…) | `▤` | O decodificador converte Sinal | Moeda principal: compra antenas e upgrades |
| **Fragmentos** | `◆` | Decifrar transmissões | Desbloqueiam história e upgrades especiais |
| **Clareza** | `✦` | Prestígio (Silêncio) | Bônus permanente multiplicativo |
| **Frequências** | `|‖|` | Varredura do espectro | Cada uma é uma "fonte" nova, com bônus e história próprios |

> As unidades de Dados (KB, MB, GB, TB, PB…) servem como notação de números grandes que combina com o tema. Bem melhor que "1.2e15".

---

## 5. Geradores (antenas)

Custo: `custoBase × 1.15^quantidade`. Produção: `prodBase × quantidade × multiplicadores`.

| # | Antena | Custo base | Sinal/s base | Libera em |
|---|---|---|---|---|
| 1 | Fio de cobre no telhado | 10 KB | 0.1 | Início |
| 2 | Antena Yagi | 100 KB | 1 | 1 fio |
| 3 | Parabólica enferrujada | 1.1 MB | 8 | 5 Yagis |
| 4 | Conjunto de dipolos | 12 MB | 47 | Fragmento #3 |
| 5 | Radiotelescópio | 130 MB | 260 | Fragmento #6 |
| 6 | Rede de satélites | 1.4 GB | 1.4k | Arco 2 |
| 7 | Interferômetro continental | 20 GB | 7.8k | Arco 3 |
| 8 | Lente gravitacional | 330 GB | 44k | Arco 4 |
| 9 | ??? (revelado pela história) | 5.1 TB | 260k | Arco 5 |

**Marcos de quantidade:** com 10, 25, 50, 100 e 200 unidades de uma antena, a produção dela dobra. Cada marco vem com uma linha curta de texto ("A parabólica agora gira sozinha à noite.").

---

## 6. Decodificador

É a ponte entre Sinal e Dados e o segundo eixo de upgrades.

- **Taxa de conversão:** quanto Sinal/s ele consegue processar. Sinal acima da capacidade se perde e aparece como "estática" transbordando na tela, o que já sinaliza ao jogador que é hora de melhorar o decodificador.
- **Eficiência:** quantos Dados saem de cada unidade de Sinal.
- **Upgrades:** Válvulas → Transistores → Chip DSP → FPGA → Computação quântica → "Algo que você não construiu".

**Tensão de design:** o jogador precisa equilibrar antena (entrada) e decodificador (processamento). É o gargalo principal do jogo, simples de entender e interessante de otimizar.

---

## 7. Mecânica de toque (ativa)

- **Tocar** em qualquer ponto da tela de osciloscópio gera um **pulso** com +X de Sinal, e a onda reage visualmente.
- **Segurar** faz a "varredura": um dial gira e o Sinal sobe de forma contínua, mas com retorno menor por segundo do que tocar várias vezes.
- **Picos de ressonância:** de vez em quando aparece um pico brilhante na onda. Tocar nele em até 3 segundos dá um bônus (x10 por 30s, ou um pacote de Dados). Equivale ao "golden cookie".
- Vibração háptica leve a cada toque e mais forte no pico.

Upgrades de toque: "Ouvido treinado" (+% do Sinal/s por toque), "Reflexo" (janela maior do pico) etc.

---

## 8. Espectro e frequências (sistema de exploração)

Esse é o diferencial do jogo.

- Uma aba mostra o **espectro**: uma faixa horizontal com barras de ruído.
- O jogador gasta Dados para fazer uma **varredura**, que leva tempo real (30s → 5min → 1h, conforme a profundidade).
- A varredura pode encontrar:
  - **Fontes naturais** (pulsar, quasar, tempestade solar): dão bônus de Sinal e um texto curto.
  - **Fontes artificiais:** abrem uma *linha de transmissão* com mensagens para decifrar.
  - **Nada:** às vezes é só ruído, e o jogo admite isso com humor seco.
- Cada frequência sintonizada vira um **canal fixo** que produz Sinal extra e alimenta um arco de história.

**Minigame opcional de sintonia fina:** arrastar o dial até a onda "encaixar" (as linhas se alinham). Dá bônus de precisão. Deve ser sempre opcional, porque idle não pode exigir habilidade.

---

## 9. Decifração e narrativa

### Como funciona
- Cada transmissão tem um custo em Dados e um **tempo de decifração**.
- Enquanto decifra, o texto vai aparecendo letra por letra, no começo embaralhado (`#@k%a ...`) e aos poucos legível.
- Ao terminar, você ganha **Fragmentos** e uma entrada no **Diário**.
- Algumas mensagens oferecem **escolhas** ("Responder?" Sim / Não / Ignorar), que mudam ramificações leves e o final.

### Estrutura da história (rascunho)

**Arco 1 — Estática**
O operador chega à estação. Diário pessoal, tom melancólico. Pulsares, ruído, solidão. A primeira anomalia é uma sequência de números primos.

**Arco 2 — O Coro**
Uma fonte transmite "música": padrões matemáticos que parecem harmonias. Mensagens curtas e poéticas, sem linguagem clara. O jogador aprende a "ler" os padrões (os upgrades do decodificador fazem parte da narrativa).

**Arco 3 — O Arquivista**
Uma segunda fonte, muito mais clara. Ela transmite um catálogo de coisas: espécies, mundos, objetos. Aos poucos você percebe que é um catálogo de civilizações que **pararam de transmitir**.

**Arco 4 — A Resposta**
O jogador pode construir um transmissor e responder. Isso divide a história:
- *Responder:* algo responde de volta, cada vez mais perto.
- *Ficar em silêncio:* você continua só ouvindo, e o Arquivista cataloga a si mesmo.

**Arco 5 — O Eco**
Revelação: uma das fontes tem a assinatura da sua própria estação, deslocada no tempo. Você está ouvindo operadores anteriores (ou futuros). O prestígio passa a fazer sentido dentro da história: cada "Silêncio" é um novo operador que assume a estação e encontra o diário do anterior.

> **Regra de escrita:** mensagens curtas (1 a 3 linhas), muito subtexto e nada de explicar demais. O jogador preenche as lacunas.

### Diário
- Aba com todas as mensagens e entradas, em ordem cronológica.
- Entradas do operador (você) se misturam com as transmissões e dão voz ao personagem.
- Dá pra reler tudo. Para quem gosta de história, é a "recompensa" do jogo.

---

## 10. Prestígio — "Silêncio"

- Liberado depois do Arco 2 (aprox. 1 a 2 horas de jogo ativo + offline).
- **O que reseta:** Sinal, Dados, antenas, upgrades do decodificador.
- **O que fica:** Fragmentos, Diário, frequências descobertas (como "memórias") e **Clareza**.
- **Clareza ganha:** `floor( sqrt(totalDadosDaRodada / 1 GB) )`, ajustável.
- **Efeito:** cada ponto de Clareza dá +2% de produção global (multiplicativo com os demais bônus).
- **Árvore de Clareza:** pontos podem ser gastos em nós permanentes (começar com antenas, decodificar offline mais rápido, picos mais frequentes).
- **Narrativa:** a tela escurece e aparece *"Fim do turno."*, depois *"Novo operador designado."* e o diário do anterior. Cada operador tem um nome e uma frase.

Segunda camada de prestígio (pós-lançamento): **"Mudar de estação"**, outro ponto do planeta, outro céu e fontes diferentes.

---

## 11. Progresso offline

- Ao voltar: **"Enquanto você estava fora…"** com Dados acumulados, transmissões captadas e uma linha de diário curta.
- Offline produz 50% da taxa no começo (upgradeável até 100%), com limite de 8h (upgradeável até 24h).
- Varreduras e decifrações continuam rodando offline (tempo real). Essa é a principal razão para o jogador voltar.
- **Notificação push** opcional, sempre sutil: *"Nova transmissão captada."* No máximo uma por período, nunca spam.

---

## 12. Interface mobile

Retrato, fundo preto e tudo importante no terço inferior da tela.

```
┌─────────────────────────────┐
│ ▤ 1.24 MB      ~ 340 Hz/s   │  ← topo: recursos principais
│                             │
│   ╭─╮   ╭╮                  │
│ ──╯ ╰─╮╭╯╰──╮  ╭──────      │  ← osciloscópio (área de toque)
│       ╰╯    ╰──╯            │
│                             │
│ > fragmento #4 decifrado    │  ← log de 1-2 linhas
│                             │
├─────────────────────────────┤
│ [Antena Yagi x12]   1.4 MB  │
│ [Parabólica x3]     4.0 MB  │  ← lista rolável de compras
│ [Dipolos  🔒]               │
├─────────────────────────────┤
│  📡    ▤    |‖|    ✎    ⚙   │  ← abas: Antenas / Decodif. / Espectro / Diário / Config
└─────────────────────────────┘
```

- **Botão de compra x1 / x10 / Máx.**
- Botões com no mínimo 48dp de altura.
- Respeitar notch e safe areas.
- Modo de **baixo consumo** (menos animação) para bateria.

---

## 13. Estilo visual e áudio

**Visual**
- Paleta: preto `#0A0A0A`, verde fósforo `#33FF66`, âmbar opcional `#FFB000` como tema alternativo desbloqueável.
- Fonte monoespaçada (ex.: *IBM Plex Mono*, *JetBrains Mono*, *VT323* para títulos).
- Efeitos leves de CRT: scanlines discretas, brilho (glow) nos números e leve flicker. Tudo desligável.
- A onda do osciloscópio é o "personagem" visual: fica mais complexa e organizada conforme o progresso.

**Áudio**
- Estática ambiente baixa e contínua.
- Clique de relé nas compras e bip curto nas decifrações.
- Cada fonte de história tem um "timbre" próprio (o Coro é harmônico, o Arquivista é rítmico e seco).
- Tudo procedural ou com poucos samples curtos.

---

## 14. Balanceamento (ponto de partida)

- Crescimento de custo: **1.15** por unidade (padrão do gênero).
- Razão de custo entre antenas consecutivas: **~×11 a ×15**.
- Razão de produção: **~×6 a ×8**.
- Primeira compra em **< 10 segundos**. Segunda antena em **~1 minuto**.
- Primeiro fragmento de história em **< 3 minutos**. É o gancho, então tem que vir rápido.
- Primeiro prestígio em **~1h30 a 3h** (somando ativo e offline).
- Usar planilha ou script para simular as curvas antes de fechar os números.

---

## 15. Monetização (opcional, sem ser predatória)

- **Premium pago** (ex.: R$ 10 a 15), sem anúncios. Combina com o tom do jogo.
- *Ou* gratuito com:
  - Anúncio recompensado **opcional** ("Amplificar sinal: x2 por 4h").
  - Compra única "Licença de operador" que remove anúncios e deixa o x2 permanente.
  - Temas visuais (âmbar, azul, CRT colorido).
- **Nunca:** energia, timers pagos para pular história ou paywall em capítulo.

---

## 16. Tecnologia sugerida

**Opção A (recomendada para começar): Web + Capacitor**
- HTML/CSS/TypeScript, testável direto no navegador do PC e do celular.
- Empacotar para Android/iOS com **Capacitor** (dá acesso a háptica, notificações e armazenamento nativo).
- Bom para UI baseada em texto e iteração rápida.

**Opção B: Godot 4**
- Exporta nativo para Android/iOS, tem bons recursos de UI e shaders (o efeito CRT fica fácil).
- Mais pesado para começar, mas ótimo se o jogo crescer visualmente.

**Pontos técnicos importantes**
- **Números grandes:** usar `break_infinity.js` / `break_eternity.js` (web) ou uma classe própria mantissa+expoente.
- **Tick:** lógica a 10 ticks/s com `deltaTime`, separada da renderização.
- **Offline:** salvar `timestamp` e, ao abrir, calcular `Δt` (com limite) e aplicar de forma analítica. Não simular tick a tick.
- **Save:** JSON versionado (`saveVersion`) com migrações, autosave a cada 10–30s e ao ir para o background. Export/import do save via texto.
- **Conteúdo de história em dados:** mensagens num arquivo JSON/YAML separado do código (id, requisito, texto, escolhas), fácil de escrever e revisar.

---

## 17. Escopo do MVP (o que fazer primeiro)

1. Osciloscópio tocável que gera Sinal.
2. 4 antenas com custo crescente.
3. Decodificador com 1 upgrade de taxa e 1 de eficiência.
4. 10 fragmentos de história (Arco 1 completo) e a aba Diário.
5. Save local e progresso offline.
6. Visual de terminal com fonte mono e verde fósforo.

**Depois:** espectro/varredura → Arcos 2 e 3 → prestígio → áudio → notificações → loja.

---

## 18. Questões em aberto

- Nome final do jogo?
- A história tem um final definitivo ou é aberta/infinita?
- Escolhas do jogador: só sabor ou finais realmente diferentes?
- Idioma: lançar em PT-BR, EN ou os dois desde o início? (Ter textos em arquivo de dados facilita.)
- Premium ou free-to-play?
