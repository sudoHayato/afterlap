# Origem deste repositório

O laboratório web Afterlap neste repositório foi **desenhado e escrito pelo Grok / Grok Build (xAI)**, a pedido do dono do projeto. Não foi escrito pelo dono.

Este ficheiro é **contexto e estado**, não um caderno de instruções. Quem instrui o desenvolvimento a partir daqui é o dono do projeto, no chat. O Grok não dá ordens a outras ferramentas.

Quem continuar o código (Claude ou outro) pode **alterar, refazer ou melhorar** o que achar melhor. O que se segue descreve o que existe hoje e a intenção com que foi feito — não um contrato.

## Intenção de produto (como o Grok a implementou)

Uma sessão de treino não está presa a um único desporto. É uma sequência. O atleta faz Start uma vez, muda de modalidade sem parar, e só no fim faz Stop.

Modelo que o Grok pôs em `src/lib/afterlap/`:

```
amostras (GPS/sensor)  →  eventos  →  segmentos (derivados)  →  métricas
```

Eventos no log: `started`, `sport_changed`, `stopped`, `recovered`. Mudar de desporto não fecha a sessão.

Fluxo da interface actual: Start → Change/Lap → Stop. No ecrã `/watch`, Lap cicla a modalidade. GPS nesta web está **simulado**. `/watch` é um estudo visual, não uma app Garmin.

## O que o Grok considerou o passo seguinte (opinião, não ordem)

Portar o motor para Dart/Flutter com GPS real no telemóvel; mais tarde um ecrã Connect IQ com as mesmas três acções. O Grok Build não consegue compilar nativo nem Garmin — por isso o trabalho passou para fora deste ambiente.

Fora do que o Grok chegou a construir: contas, nuvem, feed social, auto-detecção de desporto, dados de saúde.

## Língua e lei (como o Grok configurou o lab)

Textos legais e cópia do projeto estão em **português de Portugal (pt-PT)**, com jurisdição **Portugal e União Europeia** (RGPD, Lei 58/2019, CNPD). O Grok não aplicou lei brasileira. Identidade do responsável em `src/lib/legal/config.ts` ainda é placeholder.

## Estado no Git

O GitHub é o ponto de situação. Cada clone e cada conversa nova deve partir do `main` actual, não da memória de um chat anterior.
