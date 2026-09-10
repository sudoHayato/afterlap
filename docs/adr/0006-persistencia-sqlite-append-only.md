# ADR 0006 — Persistência local: SQLite append-only, replay ao arrancar

**Estado**: aceite (sessão 03, 2026-09-10). **Decisão do fundador**, executada pela equipa de desenvolvimento.

## Contexto

Até à Fase 1 a app Android guardava a sessão só em memória: fechar a app a meio de um treino perdia tudo. A Fase 2 começa por aqui, antes do GPS real — não vale a pena gravar posições verdadeiras se um toque errado as deita fora.

O motor já trata os eventos como fonte de verdade e deriva segmentos e métricas por replay. A persistência tem de respeitar isso: guardar eventos e amostras, nunca estado derivado.

## Decisão

1. **`expo-sqlite`, sem ORM.** SQL à mão, seis statements no total. A API síncrona (`runSync`, `withTransactionSync`) é o que permite a garantia seguinte.
2. **Uma tabela de eventos append-only.** `events(seq, session_id, type, at, sport, discarded)`. Nunca `UPDATE`, nunca `DELETE`. Descartar uma sessão é um `stopped` com `discarded = 1` — a linha fica, a marca diz o que aconteceu. O estado (que sessão está viva, quando começou) deriva-se por replay, exatamente como o motor faz.
3. **Amostras numa tabela irmã, também append-only.** `samples(seq, session_id, t, lat, lng, speed_mps, source)`. Separada de `events` por custo de escrita a 1 Hz: o caminho quente é uma linha de cinco colunas numéricas sem texto opcional, com um único índice `(session_id, seq)`; e a tabela de eventos — dezenas de linhas — nunca é varrida por entre milhares de posições. Uma tabela única obrigaria a colunas nulas em todas as linhas e a filtrar por tipo em cada leitura.
4. **Esquema versionado desde o dia zero.** `schema_version` com uma linha; `MIGRATIONS` ordenadas, cada uma numa transação que também sobe a versão. A v1 cria as tabelas; alterar o esquema é acrescentar uma entrada, nunca editar uma existente. Um salto na sequência ou uma migração que falha deixa a versão como estava.
5. **Escrita síncrona no evento.** START / CHANGE / STOP / RECOVERED vão para o disco numa transação antes de a interface reagir. As **amostras vão em lote**: ficam em memória no máximo `DEFAULT_FLUSH_INTERVAL_MS` = 2 s, e qualquer evento escreve primeiro o lote pendente na mesma transação — a amostra da fronteira fica sempre antes do CHANGE que a segue. Perda máxima numa morte súbita: **o lote em curso, ≤ 2 s + a amostra em voo ≈ 3 s**, abaixo do limite de 5 s definido. Ao ir para segundo plano, o lote é escrito de imediato.
6. **WAL + `synchronous = FULL`.** WAL para a leitura de arranque não bloquear escritas e para um `force-stop` deixar as transações confirmadas intactas; FULL para "confirmado" também sobreviver a ficar sem bateria, não só a um processo morto. O custo mede-se no dispositivo (relatório da sessão 03).
7. **O motor não muda.** O adaptador vive em `apps/mobile/persistence/` e expõe os mesmos verbos do store do web-lab (`hydrate`, `start`, `changeSport`, `stop`, `pushSample`, `discardLive`, `live`, `byId`). O que difere é por baixo — SQLite em vez de `localStorage` — e o facto de nada ser apagado.

## Testabilidade sem dependência nova

O adaptador fala com uma interface mínima (`SqlDb`: `execSync`, `runSync`, `getAllSync`, `withTransactionSync`), com os nomes do `expo-sqlite` para a ligação real encaixar sem invólucro. Nos testes, o `node:sqlite` do Node 24 (o mesmo SQLite, sem pacote extra) veste a mesma interface. Todo o caminho de escrita, migração e replay corre no `vitest`; só `expo.ts` (abrir o ficheiro nativo) fica fora. O teste de recuperação no dispositivo (`apps/mobile/device/`) usa o mesmo `node:sqlite` para abrir a base de dados puxada do telemóvel e compará-la com o que a app reconstruiu.

## Alternativas rejeitadas

- **`AsyncStorage` / JSON num ficheiro** (o que o web-lab faz com `localStorage`): reescreve o documento inteiro a cada amostra — O(n) por escrita, e uma morte a meio de uma escrita pode deixar o ficheiro truncado. Serve para um lab, não para um treino de 2 h.
- **ORM (Drizzle, WatermelonDB, TypeORM)**: camadas sobre seis statements, com o seu próprio ciclo de versões e migrações. Sem ganho a esta escala.
- **Guardar segmentos ou métricas**: violaria a regra de ouro do projeto e criaria duas verdades. Replay é barato: uma sessão de 2 h a 1 Hz são ~7 200 linhas.
- **`synchronous = NORMAL`**: mais rápido, e suficiente contra um processo morto; não contra falta de bateria. Medido na sessão 03 e decidido em função do custo real.

## Consequências

- A app sobrevive a ser fechada ou morta a meio de uma sessão; ao reabrir, mostra a sessão e pergunta se continua ou descarta.
- O histórico é uma leitura de `events` + `COUNT(*)` de `samples` — sem amostras, o suficiente para data, duração e segmentos. O resumo a sério é da Fase 4.
- A base de dados só cresce. Apagar de verdade (RGPD: direito ao apagamento) é uma decisão futura, com o fundador: pode ser `DELETE` por sessão numa operação explícita e separada, ou uma exportação seguida de apagamento total. Nunca implícito.
- O Fase 2 parte 2 (GPS real) só troca `sampleFromSim` por `sampleFromGps`; a persistência não muda.
