# ADR 0003 — Android primeiro; iOS adiado

**Data**: 2026-09-09 · **Estado**: aceite

## Contexto

O telemóvel do CTO é Android. A máquina de desenvolvimento é Windows com WSL 2: não há Xcode, e builds iOS exigem macOS (local ou na nuvem). A validação do produto precisa de treinos reais no telemóvel de quem decide.

## Decisão

- A Fase 1 (e as Fases 2–4 propostas) são **Android only**.
- `app.json` não tem bloco `ios` nem `web`; não há scripts iOS; não se instala nada específico de iOS.
- iOS entra na Fase 6, com contas/lançamento, quando houver decisão e meios (macOS ou EAS Build iOS com credenciais Apple).

## Consequências

- Builds locais e sideload de APK são possíveis sem contas de loja.
- Textos legais e de permissões (localização "sempre" vs "enquanto usa a app", foreground service) podem ser escritos para o modelo Android sem generalizar prematuramente.
- O motor continua agnóstico; quando iOS entrar, só a camada de adaptadores (GPS, segundo plano) muda.
- Risco: decisões de UI feitas só com Android em mente (botão de retroceder, edge-to-edge). Aceite.

## Alternativas consideradas

- **Ambas as plataformas desde já**: duplica o custo de teste e exige macOS/EAS iOS antes de haver produto validado.
- **iOS primeiro**: o CTO não tem iPhone nem Mac; sem sentido.
