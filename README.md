# Sinal 📡

Jogo idle mobile sobre um operador de rádio ouvindo o céu.
Design completo em [`docs/radio.md`](docs/radio.md). A ideia futura do Farol está em [`docs/farol.md`](docs/farol.md).

**Stack:** TypeScript + Vite (web) → Capacitor (Android/iOS). Sem framework de UI.

## Comandos

```bash
npm install          # primeira vez
npm run dev          # roda no navegador (também acessível pelo celular na mesma rede)
npm test             # testes da lógica (vitest)
npm run typecheck    # checagem de tipos
npm run build        # gera dist/

npm run android      # build + sync + abre no Android Studio
npm run ios          # build + sync + abre no Xcode (só no macOS)
```

> **Testar no celular sem instalar nada:** rode `npm run dev` e abra no celular o endereço "Network" que aparece no terminal (o PC e o celular precisam estar no mesmo Wi-Fi).
>
> **Gerar APK:** precisa do [Android Studio](https://developer.android.com/studio) instalado (ele já traz o JDK e o Android SDK).

## Estrutura

```
src/
  core/          Regras do jogo. Não conhece DOM nem plataforma (reaproveitável no Farol)
    game.ts        estado + ações (tick, toque, compras, história)
    economy.ts     fórmulas de custo / marcos
    offline.ts     progresso offline (analítico)
    save.ts        serialização, migrações, exportar/importar
    state.ts       formato do save (SAVE_VERSION)
    format.ts      KB/MB/GB…, Hz/kHz…, durações
    requirements.ts  condições de desbloqueio
  data/          Conteúdo: dá para editar sem mexer na lógica
    antennas.ts    lista de antenas (custo, produção, desbloqueio)
    decoder.ts     upgrades do decodificador
    upgrades.ts    melhorias da estação (toque, picos, offline)
    spectrum.ts    varreduras e fontes do Espectro
    story.ts       diário + transmissões (a história)
  platform/      Integração Capacitor (save nativo, vibração)
  ui/            Interface (DOM puro + canvas do osciloscópio)
    panels/        uma aba por arquivo
  styles/        CSS (tokens no topo de main.css)
android/ ios/    Projetos nativos gerados pelo Capacitor
docs/            Documentos de design
```

## Regras importantes

- **Mudou o formato do save?** Incremente `SAVE_VERSION` em `core/state.ts` e adicione uma migração em `core/save.ts`.
- **Nunca renomeie IDs** de antenas ou de história depois de lançados: os saves dos jogadores usam esses IDs.
- Números usam `number` do JS (vai até ~1e308, sobra para este jogo). A formatação está isolada em `format.ts` caso um dia precise de `break_infinity.js`.
- `appId` em `capacitor.config.ts` (`com.sinal.idle`) é provisório. Troque **antes** da primeira publicação, porque depois não dá mais para mudar.
