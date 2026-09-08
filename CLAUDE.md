# Afterlap — briefing para Claude Code

Lê isto antes de escrever código. O repositório já tem um laboratório web. O teu trabalho é o **nativo**, não um segundo protótipo web.

## Quem decide

O utilizador não é o programador principal. Tu implementas. Ele decide produto, testa, e corta âmbito. Não peças confirmação para cada ficheiro. Pede confirmação para decisões de arquitectura, permissões nativas, e qualquer tratamento de dados novo.

## Língua e lei (obrigatório)

- Português de Portugal (**pt-PT**). Tu, telemóvel, ecrã, aplicação, ficheiro, palavra-passe.
- Lei: **Portugal + União Europeia**. RGPD, Lei n.º 58/2019, CNPD (`https://www.cnpd.pt`).
- **Proibido:** Brasil, LGPD, ANPD, português brasileiro.
- Textos legais: `src/routes/legal.*` e `src/lib/legal/config.ts`. Identidade do responsável ainda é placeholder — não lances lojas sem isso preenchido. Não és advogado; não finjas que és.

## O que já está feito (não reinventar)

Motor em `src/lib/afterlap/` — **fonte de verdade do produto**:

```
RAW SAMPLES  →  EVENTS  →  SEGMENTS  →  MÉTRICAS
```

- Uma **Session** não é um desporto. É uma sequência.
- `sport_changed` **não** pára a sessão. Não crias outro ficheiro.
- Segmentos são derivados do log de eventos. Nunca o contrário.
- Persistência: append-only, flush frequente, recuperar sessão `live` ao reabrir (`recovered`).
- UX sagrada: **START / CHANGE (Lap) / STOP**. No relógio, Lap cicla desporto.

Fluxo mínimo a preservar:

```
START → treinar → CHANGE (sem parar) → treinar → STOP
```

Resultado: uma sessão, vários segmentos (ex.: Run → Bike → Run).

## O que isto NÃO é

- Não é a app nativa. GPS desta web é **simulado**.
- O ecrã `/watch` é um estudo de UX. **Não** é Connect IQ, não emparelha Garmin, não há FIT.
- Sem contas, sem nuvem, sem cookies de rastreio. Treinos só no dispositivo. Mantém assim no MVP nativo.

## O que tu vais construir

1. **Portar o motor para Dart** (`types` + `engine` + persistência). Testes: start, change, change, stop, crash a meio, rebuild de segmentos idêntico.
2. **Flutter (Android + iOS)** — recorder com GPS real, sessão viva à prova de crash, Change sem parar, histórico, resumo.
3. **Garmin Connect IQ** (depois do telemóvel gravar 3h sem perder dados): três acções no relógio — Start, Lap (= change sport), Stop. GPS no relógio. O telemóvel lê a sessão. Não começes por OAuth Garmin.

Ordem. Não invertas. Relógio antes de GPS à prova de crash no telemóvel é como construir o telhado primeiro.

## Stack

Flutter. Dart. Persistência local (não Firebase “porque é fácil”). Sem contas no MVP.

Não migres o lab web para Next/Expo. O web fica como referência de UX e domínio.

## Fora do MVP

Social, IA de desporto, VO₂, feed tipo Strava, Apple Watch, contas, nuvem, auto-detecção perfeita de desporto.

## Marcas

Sem afiliação a Garmin, Strava, Apple, Ironman. Não copies UI dessas marcas. Não uses os nomes delas na App Store como se fossem tuas.

## Primeira tarefa

Clonar este repo. Analisar `src/lib/afterlap/`. Portar o motor para Dart com testes. Mostrar o mapeamento Session/Event/Segment. Só depois UI Flutter.
