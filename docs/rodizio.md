# Rodízio de Papéis e Separação de Poderes — Esquadrão Aegis QA

Este registro documenta a distribuição de responsabilidades e a aplicação estrita do princípio de **separação de poderes** (Autor do código ≠ Revisor de *Pull Request* [Solicitação de Integração] ≠ Responsável por liberar na `main` [ramificação principal]) ao longo das *Sprints* (ciclos iterativos curtos) 01, 02 e 03 do produto **TodoLab (`v1.0.1` → `v1.2.0`)**.

## Composição da Squad

- **Nome da squad (equipe ágil multidisciplinar):** Esquadrão Aegis QA (*Quality Assurance* — Garantia da Qualidade)
- **Integrantes operacionais do repositório:**
  - **Prof. Alexandre Gomes (`@profalexandregomes`):** *Product Owner* (Dono do Produto), *QA Engineer* (Engenheiro de Garantia da Qualidade — testes *Test-First* [escritos antes do código]), *Code Reviewer* (Revisor de Código) e *Release/DevOps Manager* (Gerente de Liberação e *Development & Operations* / Entrega Contínua).
  - **Alexandre Barbosa (`@agbarbosa`):** *Tech Lead* (Líder Técnico), Autor de Implementação (*App Developer* — Desenvolvedor da Aplicação) e *Documentation & Metrics Analyst* (Analista de Documentação e Métricas).

> **Regra de ouro verificável no histórico do GitHub:** Todos os *Pull Requests* (`#9` a `#15` e o da *Issue* `#8`) foram abertos por `@agbarbosa` e revisados/aprovados formalmente (`APPROVE`) e integrados via *merge* (mesclagem) na `main` por `@profalexandregomes`. Os arquivos de teste em `tests/` foram produzidos antes da implementação (*fase Red* — falha inicial esperada no *TDD* [*Test-Driven Development* / Desenvolvimento Orientado a Testes]) e nunca modificados pelo autor da implementação.

---

## Histórico Consolidado por Sprint e Rodada (Issues #1–#8)

| Sprint | Issue | Entrega / Demanda | Autor dos Testes (*Test-First*) | Autor da Implementação e PR | Revisor Aprovador (`APPROVE`) e Merge | Evidência de Diálogo e PR |
|---|---|---|---|---|---|---|
| Sprint 01 | [#1](https://github.com/profalexandregomes/todolab-aegis-qa/issues/1) | `[Bug/A2]` Impedir tarefas vazias/espaços (Defeito D-01) | `@profalexandregomes` | `@agbarbosa` | `@profalexandregomes` | [PR #9](https://github.com/profalexandregomes/todolab-aegis-qa/pull/9) (`d83852b`) · [`ISSUE-01.md`](prompts/ISSUE-01.md) |
| Sprint 01 | [#2](https://github.com/profalexandregomes/todolab-aegis-qa/issues/2) | `[Bug/D-03]` Exclusão estrita por *ID* (*Identifier* — Identificador Único) com duplicados | `@profalexandregomes` | `@agbarbosa` | `@profalexandregomes` | [PR #10](https://github.com/profalexandregomes/todolab-aegis-qa/pull/10) (`5aa3b36`) · [`ISSUE-02.md`](prompts/ISSUE-02.md) |
| Sprint 01 | [#3](https://github.com/profalexandregomes/todolab-aegis-qa/issues/3) | `[Bug/A4]` Persistência resiliente *ISO 9126* (*International Organization for Standardization* — Norma de Qualidade) (Defeito D-02) · **`v1.0.1`** | `@profalexandregomes` | `@agbarbosa` | `@profalexandregomes` | [PR #11](https://github.com/profalexandregomes/todolab-aegis-qa/pull/11) (`428cec4`) · [`ISSUE-03.md`](prompts/ISSUE-03.md) |
| Sprint 02 | [#4](https://github.com/profalexandregomes/todolab-aegis-qa/issues/4) | `[Feature 1]` Quadro *Scrum-Kanban* (método ágil + quadro visual de fluxo) 4 colunas + Limite *WIP* (*Work in Progress* — Trabalho em Progresso) + *Drag-and-Drop* (Arrastar e Soltar) | `@profalexandregomes` | `@agbarbosa` | `@profalexandregomes` | [PR #12](https://github.com/profalexandregomes/todolab-aegis-qa/pull/12) (`b534edf`) · [`ISSUE-04.md`](prompts/ISSUE-04.md) |
| Sprint 02 | [#5](https://github.com/profalexandregomes/todolab-aegis-qa/issues/5) | `[Feature 2 / C1+C2]` Prioridade, vencimento e classificador determinístico *TDD* | `@profalexandregomes` | `@agbarbosa` | `@profalexandregomes` | [PR #13](https://github.com/profalexandregomes/todolab-aegis-qa/pull/13) (`95e896f`) · [`ISSUE-05.md`](prompts/ISSUE-05.md) |
| Sprint 02 | [#6](https://github.com/profalexandregomes/todolab-aegis-qa/issues/6) | `[Feature 3]` Cronômetro *Pomodoro* (ciclos cronometrados de foco) e Estimativa vs. Esforço Real · **`v1.1.0`** | `@profalexandregomes` | `@agbarbosa` | `@profalexandregomes` | [PR #14](https://github.com/profalexandregomes/todolab-aegis-qa/pull/14) (`467506b`) · [`ISSUE-06.md`](prompts/ISSUE-06.md) |
| Sprint 03 | [#7](https://github.com/profalexandregomes/todolab-aegis-qa/issues/7) | `[Feature 4]` Filtros combinados, busca *NFD* (*Normalization Form Decomposition* — ignora acentos), edição *inline* (direta no cartão, limite 200 *chars* [caracteres]) e *Undo* (Desfazer) | `@profalexandregomes` | `@agbarbosa` | `@profalexandregomes` | [PR #15](https://github.com/profalexandregomes/todolab-aegis-qa/pull/15) (`22df8b7`) · [`ISSUE-07.md`](prompts/ISSUE-07.md) |
| Sprint 03 | [#8](https://github.com/profalexandregomes/todolab-aegis-qa/issues/8) | `[Feature 5 / C3+D3]` Painel de Telemetria QA, *JSON* (*JavaScript Object Notation*) `v1.2.0` e *CI Gates* (Portões de Integração Contínua) · **`v1.2.0`** | `@profalexandregomes` | `@agbarbosa` | `@profalexandregomes` | *Branch* (ramificação) `feat/issue-08-telemetria-qa-exportacao-json` · [`ISSUE-08.md`](prompts/ISSUE-08.md) |

---

## Contrato de Autoridade e Evidências

| Papel | Decisão assumida na rodada | Evidência produzida | Restrição verificada |
|---|---|---|---|
| *Product Owner* / Especificador | Aprovação das 8 *Issues* com *BDD* (*Behavior-Driven Development* — Desenvolvimento Orientado a Comportamento), casos de borda e *DoR* (*Definition of Ready* — Definição de Pronto para Iniciar) | *Issues* `#1` a `#8` no GitHub | Nenhuma demanda entrou em desenvolvimento sem critérios verificáveis |
| *QA Engineer* / *Test Analyst* (Analista de Testes) | Escrita prévia das suítes unitárias e de aceitação em `tests/` (fase *Red*) | *Commits* (registros de versão) de teste anteriores à implementação em todas as 8 *branches* | Código de produção não é alterado pelo autor do teste na fase *Red* |
| *Tech Lead* / *App Developer* | Geração e integração do código em `src/`, `index.html`, `scripts/` e `.github/workflows/` sem modificar `tests/` | *Commits* convencionais + registros `docs/prompts/ISSUE-01.md` a `ISSUE-08.md` | Proibido alterar arquivos em `tests/` para forçar aprovação |
| *Code Reviewer* | Inspeção linha a linha de *diff* (diferença de código), verificação da cobertura e submissão de revisão `APPROVE` via *API* (*Application Programming Interface* — Interface de Programação de Aplicações) do GitHub | Comentários substantivos + *Review* (revisão formal) `APPROVE` nos *PRs* `#9` a `#15` (e revisão final da *Issue* `#8`) | Revisor sempre diferente do autor do *PR* |
| *Release/DevOps Manager* | Verificação dos portões do *CI* (*Continuous Integration* — Integração Contínua) e criação de *Releases* (Versões Publicadas) e *GitHub Pages* (hospedagem estática) | *Merges* na `main`, exclusão de *branches* integradas, *tags* (etiquetas de versão) `v1.0.1`, `v1.1.0` e `v1.2.0` | Nenhum *merge* executado com portão de qualidade vermelho |
| *Documentation & Metrics Analyst* | Rastreabilidade, métricas de cobertura, `README.md`, `docs/qualidade/*` e `CHANGELOG.md` | Documentação consolidada na entrega `v1.2.0` | Dados sempre extraídos diretamente dos *logs* (registros) reais e histórico do repositório |

Confirmamos que, em todas as rodadas do **Esquadrão Aegis QA**, o autor do *Pull Request*, o *Code Reviewer* e o *Release/DevOps Manager* observaram a separação de responsabilidades definida para a unidade curricular.
