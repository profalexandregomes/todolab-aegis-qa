# Painel de Métricas de Qualidade e Fluxo — TodoLab (`v1.2.0`)

**Squad (equipe ágil multidisciplinar):** Esquadrão Aegis QA (*Quality Assurance* — Garantia da Qualidade)  
**Repositório:** `profalexandregomes/todolab-aegis-qa`  
**Data de Consolidação:** 2026-11-23  
**Regra de Integridade:** Todos os números abaixo foram extraídos diretamente do histórico Git/GitHub do repositório e das execuções reais da suíte de testes (`npm test`, `npm run test:coverage:gate`, `npm run check`).

---

## 1. Métricas de Cobertura e Suíte de Testes (`v1.2.0`)

Execução observada na branch `feat/issue-08-telemetria-qa-exportacao-json` (após commit `ea35ff0`):

| Indicador | Valor Medido | Limiar / Meta | Situação |
|---|---:|---:|:---:|
| Total de testes executados (`npm test`) | **55** (16 suítes) | 100% aprovados | ✅ **55 aprovados / 0 falhas** |
| Testes ignorados (*skipped*) ou pendentes (*todo*) | **0** | 0 | ✅ Aprovado |
| Duração da suíte completa (`node --test`) | **454.17 ms** | < 5.000 ms | ✅ Aprovado |
| Cobertura de linhas — `src/store.js` | **93.61%** | >= 60% | ✅ Aprovado |
| Cobertura de ramos (*branches*) — `src/store.js` | **84.57%** | — | ✅ Alta cobertura de desvios |
| Cobertura de funções — `src/store.js` | **98.25%** | — | ✅ Praticamente integral |
| Cobertura de linhas — `src/app.js` | **66.57%** | >= 60% | ✅ Aprovado |
| **Média de cobertura de linhas em `src/`** | **80.09%** | **>= 60%** (`check-coverage.mjs`) | ✅ **Portão Verde** |
| Arquivos verificados no *Lint* (`scripts/lint.mjs`) | **7** arquivos `.js`/`.mjs` | 0 erros sintáticos/tabs/espaços | ✅ Aprovado |

---

## 2. Métricas de Entrega e Fluxo Ágil (Sprints 01 a 03)

| Sprint | Release (Versão Publicada) | Issues Entregues | Pontos Planejados (Estimativa) | PRs Integrados (`main`) | Defeitos Corrigidos / Prevenidos |
|---|---|---|---:|---|---|
| **Sprint 01** | `v1.0.1` | `#1`, `#2`, `#3` | 7 pts (2 + 2 + 3) | [PR #9](https://github.com/profalexandregomes/todolab-aegis-qa/pull/9), [PR #10](https://github.com/profalexandregomes/todolab-aegis-qa/pull/10), [PR #11](https://github.com/profalexandregomes/todolab-aegis-qa/pull/11) | `D-01` (espaços/vazio), `D-03` (exclusão por título), `D-02` (JSON corrompido / cota) |
| **Sprint 02** | `v1.1.0` | `#4`, `#5`, `#6` | 15 pts (5 + 5 + 5) | [PR #12](https://github.com/profalexandregomes/todolab-aegis-qa/pull/12), [PR #13](https://github.com/profalexandregomes/todolab-aegis-qa/pull/13), [PR #14](https://github.com/profalexandregomes/todolab-aegis-qa/pull/14) | Prevenção de sobrecarga *WIP* (*Work in Progress*) e eliminação de *flaky tests* (testes instáveis) de data |
| **Sprint 03** | `v1.2.0` | `#7`, `#8` | 13 pts (8 + 5) | [PR #15](https://github.com/profalexandregomes/todolab-aegis-qa/pull/15) + Issue `#8` em integração | Regressão de contador sob filtro, regressão de edição em concluída e poluição de protótipo |
| **Total** | **3 Releases** | **8 Issues** | **35 pts** | **7 PRs já mergeados + 1 final** | **3 defeitos estruturais corrigidos + 0 defeitos abertos** |

---

## 3. Indicadores de Governança e Separação de Poderes

- **Taxa de aderência ao fluxo *Test-First* (fase *Red* antes do código):** **8 / 8 Issues (100%)** tiveram suas suítes unitárias e de aceitação *BDD* (*Behavior-Driven Development* — Desenvolvimento Orientado a Comportamento) comitadas antes do código de produção.
- **Taxa de aderência à regra das quatro mãos (Autor ≠ Revisor):** **7 / 7 PRs mergeados (100%)** abertos por `@agbarbosa` e revisados formalmente com `APPROVE` por `@profalexandregomes` (seguindo o mesmo rito para o PR da Issue `#8`).
- **Conformidade com registro de prompts:** **8 / 8 rodadas (100%)** registradas em `docs/prompts/ISSUE-01.md` a `ISSUE-08.md`.
- **Conformidade com *CI* (*Continuous Integration* — Integração Contínua):** Todos os *PRs* `#9` a `#15` e commits na `main` passaram no fluxo `Quality Gate 0` no GitHub Actions antes do *merge*.

---

## 4. Telemetria Embarcada no Produto (`#telemetry-panel`)

Além das métricas do processo na esteira, o próprio produto **TodoLab `v1.2.0`** passa a calcular e exibir em tempo real (via `calcularEstatisticas` / `store.estatisticas`):

- Total de tarefas, pendentes e concluídas, além da **taxa de conclusão (`%`)** protegida contra divisão por zero (`0/0 -> 0`).
- Distribuição por coluna *Kanban* (`todo`, `in_progress`, `review`, `done`) e por prioridade (`alta`, `media`, `baixa`).
- Quantidade de tarefas **atrasadas**, com vencimento **hoje** e **próximas** (1 a 3 dias).
- Saúde do **WIP** (*Work in Progress*): ocupação atual vs. limite configurado e indicador booleano `wipExcedido`.
- Comparação global **Estimativa Total vs. Esforço Real Total (min)** e variação líquida (`variacaoEsforcoMin`).
