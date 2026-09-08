# Checklist legal — Afterlap (Portugal / UE)

**Língua: português de Portugal (pt-PT). Jurisdição: Portugal e União Europeia.**
**Fora de âmbito: Brasil, LGPD, ANPD, português brasileiro.**

Isto não é aconselhamento jurídico. É uma lista de trabalho para um pré-lançamento.

## Estado atual (2026-09-08)

| Tema | Estado |
|---|---|
| Contas / login | Não |
| Dados no servidor da app | Não (só `localStorage`) |
| Cookies de análise / ads | Não |
| Banner de cookies | Não (só armazenamento estritamente necessário) |
| Política de privacidade na app | Sim, com placeholders de identidade |
| Responsável pelo tratamento identificado | **Não — bloquear lançamento público até preencher** |
| App nativa / Garmin | Não |
| Dados de saúde (art. 9.º RGPD) | Não (sem FC, VO₂, diagnóstico) |

## Obrigatório antes de público

1. Preencher `src/lib/legal/config.ts` (nome ou sociedade, morada em PT, NIF, email).
2. Decidir se o responsável é pessoa singular ou sociedade (Lda, Unipessoal, etc.).
3. Confirmar email que lês (direitos RGPD: prazo de 1 mês).
4. Se fores sociedade e o tratamento crescer (nuvem, milhares de atletas, dados de saúde): avaliar DPO e avaliação de impacto (AIPD / DPIA).
5. Revisão por advogado **português** (ordem dos advogados em Portugal) antes de: contas, sincronização Garmin, pulsómetro, pagamentos, App Store / Play Store.

## Bases (referência) — só estas

- RGPD (UE) 2016/679
- Lei n.º 58/2019 (Portugal)
- Lei n.º 46/2012 e regime de cookies / ePrivacy (consentimento só para não essenciais)
- Código do Direito de Autor e dos Direitos Conexos
- Lei de Defesa do Consumidor (quando houver oferta a consumidores)
- CNPD: https://www.cnpd.pt — reclamação do titular

Não aplicar LGPD (Lei n.º 13.709/2018, Brasil) nem orientação da ANPD.

## O que virá a exigir texto novo

- Conta na nuvem = novo tratamento, nova finalidade, novo prazo, novo destinatário (hosting).
- GPS real em segundo plano = transparência reforçada de localização.
- Relógio Garmin = dados no aparelho do fabricante; contrato e subprocessadores.
- Frequência cardíaca = possível categoria especial (art. 9.º) — não improvisar.
