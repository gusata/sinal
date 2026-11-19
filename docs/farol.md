# 🗼 FAROL — Documento de Design

> Nome provisório: **"Faroleiro"** (alternativas: *Luz Distante*, *Alcance*, *Ilha Acesa*, *Maré Alta*)
> Plataforma: **Mobile (Android/iOS), retrato, uma mão só**
> Gênero: Idle / incremental com construção leve
> Status: **ideia para o futuro**. Projeto atual: Rádio (ver `radio.md`)

---

## 1. Pitch

Uma ilha pequena, escura, no meio do mar. No centro, um farol apagado. Você acende uma chama fraca e o primeiro barco perdido encontra o caminho. Ele deixa mercadorias. Com elas você melhora a luz, e quanto mais longe a luz alcança, mais barcos chegam, mais gente fica e a ilha vai ganhando vida.

**O seu progresso é literalmente o tamanho da luz na tela.**

**Referências de sensação:** *A Dark Room*, *Townscaper* (o aconchego), *Mini Metro* (minimalismo funcional), *Islanders*, *Cookie Clicker* (estrutura).

---

## 2. Pilares de design

1. **Luz = progresso.** O raio do círculo iluminado é a métrica central, visível o tempo todo.
2. **Aconchego.** O mar é escuro, mas a ilha é um lugar quente. O tom é calmo, não de sobrevivência.
3. **Ver o mundo crescer.** Cada upgrade importante muda algo visível: uma casa, um cais, um barco novo.
4. **Minimalismo geométrico.** Círculos, pontos, linhas, gradientes e poucas cores.
5. **Uma mão, um polegar.**

---

## 3. Loop principal

```
   [Farol emite LUZ] ──► [Alcance ilumina o mar] ──► [BARCOS chegam]
           ▲                                            │
           │                                            ▼
   [Melhorar lente/combustível/torre] ◄── [MERCADORIAS + MORADORES]
                                                        │
                                                        ▼
                                          [Construir na ILHA → bônus]
```

- **Micro:** tocar para dar um "lampejo" (pulso de luz) e guiar barcos perdidos.
- **Médio:** comprar melhorias do farol, construir prédios, lidar com o clima.
- **Macro:** expandir a ilha, desbloquear eras tecnológicas e fazer o prestígio ("Maré").

---

## 4. Recursos

| Recurso | Ícone | Como ganha | Para que serve |
|---|---|---|---|
| **Combustível** | 🔥 | Produção passiva (estoque, depois geradores) | Mantém a luz acesa. Consumido continuamente |
| **Alcance** | ◯ | Derivado de lente × altura × intensidade | Define quantos barcos/s chegam e quais tipos |
| **Mercadorias** | 📦 | Barcos que atracam | Moeda principal |
| **Moradores** | 👤 | Alguns barcos deixam pessoas | Trabalham em prédios e multiplicam produção |
| **Histórias** | ✉ | Barcos especiais e eventos | Lore da ilha, upgrades únicos |
| **Marés** | 🌊 | Prestígio | Bônus permanente |

**Por que existe combustível:** dá uma tensão leve. Se acabar, a luz enfraquece (não apaga de vez) e chegam menos barcos. O jogador automatiza isso cedo, e a própria automação vira uma recompensa.

---

## 5. O farol (upgrades centrais)

O alcance vem de três eixos multiplicativos:

`Alcance = Intensidade × Lente × Altura × modificadorClima`

### Intensidade (fonte de luz), as eras do farol
| Era | Fonte | Observação |
|---|---|---|
| 1 | Fogueira | Início, chama tremulando |
| 2 | Lampião a óleo | Primeira automação de combustível |
| 3 | Querosene pressurizado | |
| 4 | Lâmpada a gás / acetileno | Libera o "lampejo" automático |
| 5 | Elétrica (gerador a carvão) | A ilha ganha rede elétrica |
| 6 | Elétrica (eólica/solar) | Combustível deixa de ser problema |
| 7 | LED / laser | Alcance muito grande, visual de feixe |
| 8 | ??? | Algo que ilumina o horizonte inteiro (fim de jogo) |

### Lente
Espelho polido → Lente simples → **Lente de Fresnel** (ordens 6ª a 1ª, cada ordem é um upgrade com nome histórico) → Lente rotativa → Óptica moderna.

### Altura da torre
Cada andar aumenta o alcance e muda o desenho da torre na tela. Andares têm custo crescente: `custo = base × 1.6^andares`.

---

## 6. Barcos (os "geradores" do jogo)

Barcos aparecem na borda da área iluminada e navegam até o cais. **Barcos fora do alcance não te veem.** Por isso cada tipo exige um alcance mínimo.

| Tipo | Alcance mín. | Mercadoria/visita | Especial |
|---|---|---|---|
| Canoa de pescador | 1 | 1 | Frequente |
| Veleiro mercante | 3 | 8 | Às vezes deixa morador |
| Barco de correio | 6 | 5 | Traz Histórias |
| Escuna | 10 | 50 | |
| Vapor | 18 | 300 | Requer cais de pedra |
| Cargueiro | 35 | 2k | Requer porto |
| Navio de pesquisa | 60 | 500 | Traz upgrades raros |
| Transatlântico | 100 | 15k | Turistas = moradores temporários |
| Navio fantasma | ??? | ??? | Evento raro, lore |

- **Taxa de chegada** = f(alcance, reputação, clima).
- Visualmente, cada barco é um ponto ou triângulo que deixa um rastro curto. São poucos ao mesmo tempo, para manter a tela limpa. Em escala alta, os barcos viram "comboios" (um ponto representa muitos).

---

## 7. A ilha (construção)

A ilha fica no centro, abaixo do farol, e cresce em **lotes fixos** (sem grid livre, para manter simples no celular). Cada prédio aparece como uma forma geométrica com uma luzinha na janela.

| Prédio | Efeito |
|---|---|
| Cabana do faroleiro | Início. Armazenamento de combustível |
| Depósito de óleo | + estoque e produção de combustível |
| Cais de madeira → pedra → porto | Mais barcos atracando ao mesmo tempo |
| Casa | + moradores máximos |
| Mercado | Mercadorias × multiplicador |
| Oficina | Desconto em upgrades do farol |
| Escola | Moradores rendem mais |
| Correio | Mais Histórias, cartas de moradores |
| Taverna | Barcos ficam mais tempo e rendem mais |
| Observatório | Prevê o clima e reduz penalidades |
| Estação de resgate | Libera eventos de resgate |

**Moradores** são alocados automaticamente (com opção manual): pescadores, faroleiros assistentes, comerciantes etc. Cada um tem um nome gerado, o que dá personalidade sem custo de arte.

---

## 8. Clima e ciclo dia/noite

- **Ciclo dia/noite em tempo real acelerado** (1 dia de jogo ≈ 10 a 20 min reais). De dia o farol rende menos. À noite, o círculo de luz fica dramático. É o momento visualmente mais bonito.
- **Clima:**
  - *Calmaria:* normal.
  - *Neblina:* alcance −40%, mas barcos guiados com lampejo rendem o dobro.
  - *Tempestade:* menos barcos, chance de **resgate** (tocar no barco em perigo dá recompensa grande e História).
  - *Céu limpo / lua cheia:* bônus.
- Clima é um **modificador**, nunca uma punição pesada. Idle não pode frustrar quem está offline.

---

## 9. Mecânica de toque (ativa)

- **Tocar no farol:** lampejo. O alcance ganha um boost por alguns segundos e barcos fora da borda são atraídos.
- **Tocar em barcos perdidos** (piscando na borda escura): você guia o barco e ganha bônus de mercadoria.
- **Arrastar o feixe:** com lente rotativa, o jogador pode girar o feixe manualmente e "pescar" barcos naquela direção.
- Háptica sutil no lampejo e ao atracar.

---

## 10. Narrativa (leve)

Menos central que no Rádio. A história é **ambiental e epistolar**:

- **Cartas** chegam pelo barco do correio: moradores, ex-faroleiros, marinheiros agradecidos, um faroleiro de outra ilha distante que também escreve.
- **Diário do faroleiro:** o anterior deixou anotações. Por que ele partiu? O que tem além do horizonte?
- **Mistério de fundo:** em noites de neblina, uma luz responde de muito longe. Outro farol? Um navio? Isso amarra o fim de jogo e o prestígio.
- **Ganchos possíveis de conexão com o Rádio** (universo compartilhado, opcional): o farol tem um rádio antigo. Uma das cartas vem de "uma estação no fim do mundo". Easter egg, não dependência.

---

## 11. Prestígio — "Maré"

- Liberado ao atingir alcance X ou a era elétrica.
- **Narrativa:** você passa o farol para um morador e parte num barco rumo à próxima ilha. A ilha antiga continua lá, visível ao longe como um pontinho de luz no mapa.
- **O que reseta:** ilha, farol, recursos.
- **O que fica:** Histórias, **Marés** e as ilhas anteriores, que viram **constelação de faróis** e dão um bônus passivo pequeno.
- **Marés ganhas:** `floor( (mercadoriasTotais / 1e6)^0.5 )`, ajustável.
- **Árvore de Marés:** começar com lente melhor, barcos raros mais frequentes, menos penalidade de clima, auto-construir etc.
- **Ilhas diferentes por prestígio:** ilha rochosa (mais pedra, menos casas), ilha tropical (sem tempestade, mas com furacão), ilha gelada (noites longas, bônus de luz). Isso dá variedade sem muito conteúdo novo.

**Visual do meta:** uma tela de "mapa do arquipélago" com todos os faróis que você já acendeu. É muito satisfatório ver crescer.

---

## 12. Progresso offline

- **"Enquanto você dormia…"** com barcos que chegaram, mercadorias, cartas no correio e talvez *"Uma tempestade passou. Ninguém se feriu."*
- 50% de eficiência offline no início (upgradeável), limite de 8h → 24h.
- Combustível offline: o jogo assume consumo médio. Se acabaria, a luz cai para o mínimo, sem zerar.
- Push opcional: *"Uma carta chegou na ilha."*

---

## 13. Interface mobile

```
┌─────────────────────────────┐
│ 📦 12.4k   🔥 ███░░  👤 23  │  ← recursos
│                             │
│      ·            ▸         │
│          ╭───────╮          │
│       ▸ ╱    ▲    ╲         │  ← mar escuro + círculo de luz
│        │   ▓▓▓▓    │  ·     │     barcos = pontos/triângulos
│         ╲  ilha   ╱    ▸    │     ilha + farol no centro
│          ╰───────╯          │
│   ·          ▸       ·      │
├─────────────────────────────┤
│ ☾ Noite · Neblina leve      │  ← clima / log
├─────────────────────────────┤
│ [Lente Fresnel 4ª]  8.2k 📦 │
│ [Andar +1]         12.0k 📦 │  ← lista de compras (rolável)
├─────────────────────────────┤
│  🗼    🏠    ⛵    ✉    ⚙   │  ← Farol / Ilha / Barcos / Cartas / Config
└─────────────────────────────┘
```

- Zoom out automático suave conforme o alcance cresce (o círculo sempre cabe na tela; o mundo "encolhe").
- Pinch para zoom é opcional, nunca necessário.
- Botões de compra x1 / x10 / Máx.

---

## 14. Estilo visual e áudio

**Visual**
- Paleta: mar `#0B1426` (azul-noite), luz `#FFE9A8` (âmbar quente), ilha `#2B2A28`, janelas `#FFB347`, espuma `#8FA8C8`.
- Círculo de luz com **gradiente radial** suave e leve "respiração" (pulso lento).
- Feixe rotativo: um cone de luz girando, desenhado como um triângulo com gradiente.
- Ondas: linhas finas animadas devagar. Chuva e neblina como overlay de partículas/ruído.
- Tudo vetorial ou procedural (Canvas/SVG ou shaders simples). Quase zero assets de imagem.

**Áudio**
- Ondas do mar em loop (o som principal), vento conforme o clima.
- Sino ou buzina de navio ao atracar (variações por tipo de barco).
- Música ambiente opcional: piano esparso, ou acordeão para um tom mais folk.

---

## 15. Balanceamento (ponto de partida)

- Primeiro barco em **< 5 segundos**.
- Primeiro prédio em **~1 a 2 min**.
- Primeira troca de era (óleo) em **~10 min**.
- Primeira Carta/História em **< 5 min**.
- Primeiro prestígio em **~2 a 4 h** (ativo + offline).
- O alcance cresce em escala **logarítmica visual** (o raio na tela cresce devagar mesmo com números exponenciais) para nunca "estourar" a tela.
- Custos: crescimento ×1.15 para itens repetíveis, ×1.6 a ×2 para andares/eras.

---

## 16. Monetização (opcional)

Mesma filosofia do Rádio:
- Premium pago **ou** grátis com anúncio recompensado opcional ("Noite de lua cheia: x2 por 4h").
- Cosméticos: estilos de farol (listrado vermelho, pedra, metal), paletas (aurora boreal, pôr do sol), skins de ilha.
- Nada de energia/timers pagos.

---

## 17. Tecnologia sugerida

Reaproveitar ao máximo o que for construído no Rádio:
- Mesmo núcleo: **loop de tick, números grandes, save/load versionado, cálculo offline, sistema de upgrades em dados (JSON)**. Vale a pena fazer esse núcleo de forma genérica já no Rádio.
- **Renderização:** aqui o visual é mais "desenhado" que no Rádio. Opções:
  - Web + Canvas 2D (ou PixiJS) + Capacitor, se o Rádio for nessa stack.
  - Godot 4, se quiser shaders bonitos para luz e água com pouco esforço.
- **Performance:** limitar barcos simultâneos visíveis (ex.: 30), agrupar o resto em números. Pausar a renderização em background.

---

## 18. Escopo do MVP

1. Mar escuro, ilha, farol e círculo de luz que cresce.
2. 3 tipos de barco chegando e gerando mercadorias.
3. Upgrades: intensidade (3 eras), lente (3 níveis), altura.
4. Combustível com 1 automação.
5. 4 prédios na ilha.
6. Ciclo dia/noite (só visual no início).
7. Save local e offline.

**Depois:** clima → cartas/história → moradores → prestígio e arquipélago → áudio → cosméticos.

---

## 19. Questões em aberto

- Universo compartilhado com o Rádio ou totalmente separado?
- O combustível vale a complexidade ou o melhor é cortar e deixar a luz só como upgrade?
- Quanto de "city builder" colocar na ilha sem perder o minimalismo?
- Final: existe um "último farol" ou o arquipélago é infinito?
- Nome final?
