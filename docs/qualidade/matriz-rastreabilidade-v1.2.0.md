# Matriz de Rastreabilidade e Evidências — TodoLab (`v1.2.0`)

**Squad:** Esquadrão Aegis QA  
**Repositório:** `profalexandregomes/todolab-aegis-qa`  
**Versão Consolidada:** `v1.2.0` (2026-11-23)

Esta matriz garante a rastreabilidade ponta a ponta exigida pela governança de qualidade da disciplina (**Issue → Branch → Suíte Test-First → Implementação → Diálogo IA → Pull Request → Merge / Release**).

---

## 1. Rastreabilidade Completa das Demandas (Issues #1–#8)

| Issue | Título e Escopo | Branch | Testes Unitários (`tests/unit/`) | Testes de Aceitação BDD (`tests/acceptance/`) | Registro IA | Pull Request & Merge | Release |
|---|---|---|---|---|---|---|---|
| [#1](https://github.com/profalexandregomes/todolab-aegis-qa/issues/1) | `[Bug/A2]` Normalização (*trim*) e bloqueio de tarefas vazias/espaços (Defeito D-01) | `fix/issue-01-normalizar-titulo-vazio` | `store.adicionar.test.js` | `issue-01.acceptance.test.js` | [`ISSUE-01.md`](../prompts/ISSUE-01.md) | [PR #9](https://github.com/profalexandregomes/todolab-aegis-qa/pull/9) (`d83852b`) | `v1.0.1` |
| [#2](https://github.com/profalexandregomes/todolab-aegis-qa/issues/2) | `[Bug/D-03]` Exclusão por `id` único com títulos duplicados (Defeito D-03) | `fix/issue-02-remover-por-id` | `store.remover.test.js` | `issue-02.acceptance.test.js` | [`ISSUE-02.md`](../prompts/ISSUE-02.md) | [PR #10](https://github.com/profalexandregomes/todolab-aegis-qa/pull/10) (`5aa3b36`) | `v1.0.1` |
| [#3](https://github.com/profalexandregomes/todolab-aegis-qa/issues/3) | `[Bug/A4]` Persistência resiliente contra *JSON* corrompido e `QuotaExceededError` (D-02) | `fix/issue-03-persistencia-resiliente-iso9126` | `store.persistencia.test.js` | `issue-03.acceptance.test.js` | [`ISSUE-03.md`](../prompts/ISSUE-03.md) | [PR #11](https://github.com/profalexandregomes/todolab-aegis-qa/pull/11) (`428cec4`) | [`v1.0.1`](https://github.com/profalexandregomes/todolab-aegis-qa/releases/tag/v1.0.1) |
| [#4](https://github.com/profalexandregomes/todolab-aegis-qa/issues/4) | `[Feature 1]` Quadro Scrum-Kanban 4 colunas, Limite *WIP* e *Drag-and-Drop* | `feat/issue-04-quadro-kanban-wip` | `store.kanban.test.js` | `issue-04.acceptance.test.js` | [`ISSUE-04.md`](../prompts/ISSUE-04.md) | [PR #12](https://github.com/profalexandregomes/todolab-aegis-qa/pull/12) (`b534edf`) | `v1.1.0` |
| [#5](https://github.com/profalexandregomes/todolab-aegis-qa/issues/5) | `[Feature 2 / C1+C2]` Matriz de prioridade, vencimento e classificador determinístico (*TDD*) | `feat/issue-05-prioridade-vencimento-tdd` | `store.prioridade-vencimento.test.js` | `issue-05.acceptance.test.js` | [`ISSUE-05.md`](../prompts/ISSUE-05.md) | [PR #13](https://github.com/profalexandregomes/todolab-aegis-qa/pull/13) (`95e896f`) | `v1.1.0` |
| [#6](https://github.com/profalexandregomes/todolab-aegis-qa/issues/6) | `[Feature 3]` Cronômetro *Pomodoro* e telemetria Estimativa vs. Esforço Real | `feat/issue-06-foco-pomodoro-esforco` | `store.esforco.test.js` | `issue-06.acceptance.test.js` | [`ISSUE-06.md`](../prompts/ISSUE-06.md) | [PR #14](https://github.com/profalexandregomes/todolab-aegis-qa/pull/14) (`467506b`) | [`v1.1.0`](https://github.com/profalexandregomes/todolab-aegis-qa/releases/tag/v1.1.0) |
| [#7](https://github.com/profalexandregomes/todolab-aegis-qa/issues/7) | `[Feature 4]` Contador `A1`, limpar concluídas `A3`, filtros `B1/B5`, edição `B2/B4` (200 *chars*) e *Undo* `C4` | `feat/issue-07-filtros-busca-edicao-undo` | `store.filtros-edicao-undo.test.js` | `issue-07.acceptance.test.js` | [`ISSUE-07.md`](../prompts/ISSUE-07.md) | [PR #15](https://github.com/profalexandregomes/todolab-aegis-qa/pull/15) (`22df8b7`) | `v1.2.0` |
| [#8](https://github.com/profalexandregomes/todolab-aegis-qa/issues/8) | `[Feature 5 / C3+D3]` Painel de Telemetria QA, *JSON* `v1.2.0`, portões *CI* e governança | `feat/issue-08-telemetria-qa-exportacao-json` | `store.telemetria-portabilidade.test.js` | `issue-08.acceptance.test.js` | [`ISSUE-08.md`](../prompts/ISSUE-08.md) | Em revisão final (`Closes #8`) | `v1.2.0` |

---

## 2. Evidência Consolidada dos Portões de Qualidade (Baseline `v1.2.0`)

Medição observada na branch `feat/issue-08-telemetria-qa-exportacao-json` (após commit `ea35ff0`):

| Portão / Verificação | Comando | Resultado Observado | Limiar / Regra |
|---|---|---|---|
| Análise Estática (*Lint*) | `npm run lint` | Aprovado (7 arquivos JavaScript verificados) | Zero tabs, zero espaços finais, sintaxe *ESM* válida |
| Empacotamento (*Build*) | `npm run build` | Aprovado (artefato gerado em `dist/`) | Cópia íntegra de `index.html` e `src/` |
| Suíte Automatizada Completa | `npm test` | **55 / 55 testes aprovados** (16 suítes, 0 falhas, 0 ignorados) | 100% dos cenários unitários e *BDD* verdes |
| Cobertura de Código (`src/store.js`) | `npm run test:coverage:gate` | **93.61%** linhas · **84.57%** ramos (*branches*) · **98.25%** funções | >= 60% linhas em `src/` |
| Cobertura de Código (`src/app.js`) | `npm run test:coverage:gate` | **66.57%** linhas · **49.12%** ramos (*branches*) · **34.04%** funções | >= 60% linhas em `src/` |
| Média do Portão de Cobertura (`src/`) | `npm run test:coverage:gate` | **80.09%** média de linhas em `src/` | Aprovado (`80.09% >= 60%`) |
| Proteção de Testes (*Guard-Tests*) | `npm run guard:tests` | Configurado no `.github/workflows/quality-gate.yml` | Bloqueia alteração simultânea de `tests/` e `src/` sem label `test-change-justificado` |

---

## 3. Verificação da Definição de Pronto (*DoD* — *Definition of Done*) da Entrega `v1.2.0`

- [x] Todas as 8 *Issues* especificadas com História de Usuário, *BDD* (Dado / Quando / Então), casos de borda, fora de escopo, atributo *ISO 9126*, estimativa e *DoR* (*Definition of Ready*).
- [x] Todos os testes escritos antes da implementação (*Test-First* — fase *Red* confirmada em todas as rodadas).
- [x] 55 testes unitários e de aceitação executando sem falhas e com média de cobertura de `80.09%` em `src/`.
- [x] Registro completo dos prompts e respostas da inteligência artificial em `docs/prompts/ISSUE-01.md` a `ISSUE-08.md`.
- [x] Separação de poderes respeitada em todos os *Pull Requests* (`agbarbosa` autor ≠ `profalexandregomes` revisor e aprovador).
- [x] Documentos de governança (`README.md`, `docs/rodizio.md`, `docs/qualidade/*` e `CHANGELOG.md`) atualizados para a *Release* `v1.2.0`.
