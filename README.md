# TodoLab — Esquadrão Aegis QA

> Repositório da disciplina **Gestão e Qualidade de Software (0006960)** — USJT (*Universidade São Judas Tadeu*) 2026/2  
> Prof. Alexandre Barbosa

| Campo | Registro da Squad |
|---|---|
| **Fábrica de software / Squad** | **Esquadrão Aegis QA** (*squad* — equipe ágil multidisciplinar; *QA* — *Quality Assurance* / Garantia da Qualidade) |
| **Integrantes e Papéis** | Alexandre Barbosa (`@agbarbosa` — *Tech Lead* / Líder Técnico, Autor das entregas e *Documentation & Metrics Analyst* / Analista de Documentação e Métricas)<br>Prof. Alexandre Gomes (`@profalexandregomes` — *Product Owner* / Dono do Produto, *QA Engineer* / Engenheiro de Qualidade, *Code Reviewer* / Revisor de Código e *Release/DevOps Manager* / Gerente de Liberação) |
| **Produto publicado** | https://profalexandregomes.github.io/todolab-aegis-qa/ |
| **Repositório** | https://github.com/profalexandregomes/todolab-aegis-qa |
| **Revisão e Homologação** | Prof. Alexandre Barbosa (`@profalexandregomes`) |

---

## Objetivo

Nesta disciplina a equipe atua como a **squad (equipe ágil multidisciplinar) de qualidade** responsável por especificar sem ambiguidade, testar antes (*Test-First* — escrever testes antes da implementação), revisar tecnicamente, medir indicadores de fluxo e qualidade, decidir o que pode ser integrado e responder pelo produto entregue.

> A inteligência artificial escreve código em segundos.  
> Quem garante que o produto atende aos critérios de qualidade é a equipe — do requisito à entrega em produção.

Cada *Issue* (demanda registrada no GitHub), *PR* (*Pull Request* — Solicitação de Integração), revisão independente, registro de diálogo em `docs/prompts/` e execução na esteira de *CI/CD* (*Continuous Integration / Continuous Delivery* — Integração Contínua / Entrega Contínua) compõe a rastreabilidade oficial do produto até a *Release* (Versão Publicada) `v1.2.0`.

---

## O produto (`v1.2.0`)

Um gerenciador de tarefas no estilo *TodoMVC* (*Model-View-Controller* aplicado a lista de tarefas), construído em JavaScript puro com *ESM* (*ECMAScript Modules* — Módulos Nativos JavaScript), sem dependências externas de execução ou bibliotecas de terceiros.

### Evolução entregue nas *Sprints* (ciclos iterativos curtos) 01 a 03

- **Sprint 01 — Estabilização e Confiabilidade (`v1.0.1`):**
  - **Issue #1 (Defeito D-01 / Item A2):** Normalização de títulos (*trim* — remoção de espaços nas bordas), bloqueio de tarefas vazias ou compostas apenas por espaços/tabulações e feedback acessível via `aria-live` (*Accessible Rich Internet Applications* — região dinâmica para leitores de tela).
  - **Issue #2 (Defeito D-03):** Exclusão estritamente por `id` (*Identifier* — Identificador Único) e garantia de unicidade de identificadores mesmo com títulos idênticos.
  - **Issue #3 (Item A4 / Defeito D-02 — *ISO 9126* Confiabilidade):** Tratamento tolerante a falhas conforme a norma *ISO/IEC 9126* (*International Organization for Standardization* — Norma Internacional de Qualidade de Produto de Software) contra *JSON* (*JavaScript Object Notation* — Notação de Objetos JavaScript) corrompido, estrutura inválida, `QuotaExceededError` (Erro de Cota Excedida) e `SecurityError` (armazenamento bloqueado) no `localStorage` (Armazenamento Local Persistente do Navegador), mantendo operação em memória com alerta não bloqueante na *UI* (*User Interface* — Interface de Usuário).
- **Sprint 02 — Fluxo Ágil, TDD e Foco (`v1.1.0`):**
  - **Issue #4 (Feature 1 — Funcionalidade 1):** Quadro *Scrum-Kanban* (*Scrum* — iterações curtas; *Kanban* — gestão visual de fluxo contínuo) de 4 colunas (`A Fazer`, `Em Progresso`, `Em Revisão`, `Concluído`), suporte a *Drag-and-Drop* (Arrastar e Soltar) com equivalência por teclado e **Limite de *WIP*** (*Work in Progress* — Trabalho em Progresso, padrão `2`) bloqueando excesso em `Em Progresso`.
  - **Issue #5 (Feature 2 / Itens C1 + C2):** Matriz de prioridade (`alta`, `media`, `baixa`), data de vencimento, ordenação automática e classificador determinístico de atraso (`classificarVencimento`, `ordenarTarefas`) desenvolvidos via *TDD* (*Test-Driven Development* — Desenvolvimento Orientado a Testes) com injeção da data de referência.
  - **Issue #6 (Feature 3):** Cronômetro de Foco integrado baseado na técnica *Pomodoro* (ciclos cronometrados de 25 min de foco e 5 min de pausa) e telemetria **Estimativa vs. Esforço Real** (`registrarEsforco`).
- **Sprint 03 — Produtividade, Telemetria QA e Portabilidade (`v1.2.0`):**
  - **Issue #7 (Feature 4 / Itens A1, A3, B1, B2, B3, B4, B5, C4):** Contador de pendências imune a filtros (`A1`), limpar concluídas (`A3`), marcar/desmarcar todas (`B3`), filtros combinados persistidos (`B1`), busca instantânea insensível a caixa e acentos via *NFD* (*Normalization Form Decomposition* — Decomposição Canônica Unicode) (`B5`), edição *inline* (direta no cartão) preservando conclusão (`B2`), limite estrito de 200 caracteres com contador regressivo após 180 (`B4`), pilha de *Undo* (Desfazer) em memória (`C4`) e proteção anti-*XSS* (*Cross-Site Scripting* — Injeção de Script Entre Sites) via `textContent`.
  - **Issue #8 (Feature 5 / Itens C3 + D3):** Estatísticas sem divisão por zero (`calcularEstatisticas`), Painel de Telemetria de Qualidade na interface, exportação/importação *JSON* com contrato versionado `v1.2.0` (`validarSchemaImportacao`, `exportarJSON`, `importarJSON`), endurecimento da esteira *CI/CD* (`test:coverage:gate >= 60%` e `guard:tests`) e documentação consolidada.

---

## Começo rápido e Portões de Qualidade

Requisito: **Node.js 20 ou superior**. Não há dependências externas nem etapa de `npm install` (*npm* — *Node Package Manager* / Gerenciador de Pacotes Node).

```bash
# Servidor HTTP (HyperText Transfer Protocol) local de desenvolvimento (http://localhost:4173)
npm run dev

# Gate básico: análise sintática/formatação (lint) + empacotamento (build) em dist/
npm run check

# Suíte completa de testes automatizados (unitários + aceitação BDD)
npm test

# Somente testes unitários (regras de negócio puras e TodoStore)
npm run test:unit

# Somente testes de aceitação BDD (Behavior-Driven Development — UI + Store)
npm run test:acceptance

# Relatório de cobertura e portão mínimo (>= 60% de linhas em src/)
npm run test:coverage
npm run test:coverage:gate

# Portão de separação de poderes (impede alterar tests/ e src/ sem label justificada)
npm run guard:tests
```

Todos os portões executam automaticamente no *GitHub Actions* (plataforma de automação de esteira no GitHub) em cada `push` (envio de alterações) e *Pull Request* por meio do fluxo `.github/workflows/quality-gate.yml`.

---

## Papéis e Separação de Poderes

Em todas as rodadas (Issues `#1`–`#8`), manteve-se a regra de ouro de governança: **quem escreve o código de implementação nunca aprova o próprio *Pull Request***.

| Papel | Responsável na Squad | Decisão pela qual responde | Restrição aplicada |
|---|---|---|---|
| *Tech Lead* / Desenvolvedor & Documentação | `@agbarbosa` (Alexandre Barbosa) | Implementação técnica, registro de *prompts* (instruções registradas em `docs/prompts/ISSUE-NN.md`), abertura de *PRs* e documentação | Não aprova o próprio *PR* e não modifica `tests/` após a fase *Red* (vermelha — falha inicial esperada) |
| *Product Owner* / *QA* / *Code Reviewer* / *Release Manager* | `@profalexandregomes` (Prof. Alexandre Gomes) | Especificação *BDD* (*Behavior-Driven Development* — Desenvolvimento Orientado a Comportamento) nas *Issues*, escrita prévia dos testes (*Test-First*), revisão substantiva, aprovação (`APPROVE`), *merge* (mesclagem) e *Releases* | Revisa e aprova apenas *PRs* de autor distinto (`agbarbosa`) após *CI* (*Continuous Integration*) verde |

Consulte o histórico detalhado por rodada em [`docs/rodizio.md`](docs/rodizio.md).

---

## Estrutura do Repositório

```text
├── src/
│   ├── app.js                                 # Apresentação, manipulação segura do DOM (Modelo de Objeto de Documento) e UI
│   ├── store.js                               # Regras de negócio, persistência resiliente e funções puras TDD
│   └── styles.css                             # Identidade visual TodoLab e layout responsivo
├── tests/
│   ├── unit/                                  # Testes unitários por módulo e domínio (node:test)
│   ├── acceptance/                            # Testes de aceitação BDD (Issue #1 a #8)
│   └── helpers/                               # Dublês de teste (dom-stub.js e storage-stub.js)
├── scripts/
│   ├── build.mjs                              # Empacotamento estático (build) em dist/
│   ├── check-coverage.mjs                     # Portão automático de cobertura >= 60% em src/
│   ├── dev.mjs                                # Servidor HTTP local
│   ├── guard-tests.mjs                        # Verificação de separação entre tests/ e src/
│   └── lint.mjs                               # Validador sintático e de formatação (lint) ESM
├── docs/
│   ├── prompts/                               # Registro integral de prompts e evidências (ISSUE-01.md a ISSUE-08.md)
│   ├── qualidade/                             # Checklists ISO 9126, casos de borda, métricas e rastreabilidade
│   └── rodizio.md                             # Registro de papéis e evidências por Sprint/Issue
├── .github/
│   ├── workflows/quality-gate.yml             # Esteira CI/CD (lint, build, unit, acceptance, coverage, guard-tests)
│   ├── ISSUE_TEMPLATE/                        # Formulários guiados de Demanda e Defeito
│   └── pull_request_template.md               # Template obrigatório de Pull Request
├── CHANGELOG.md                               # Registro histórico de versões (v1.0.1, v1.1.0 e v1.2.0)
├── index.html                                 # Estrutura semântica HTML5 (HyperText Markup Language 5) acessível
└── package.json                               # Metadados ESM e scripts de qualidade
```

---

## A esteira de qualidade

Cada portão adicionado à esteira permanece ativo de forma cumulativa:

| Nível | Entrega | Portão de Qualidade | Comando / Mecanismo | Estado |
|---:|---|---|---|:---:|
| 0 | *Baseline* (linha de base inicial) | `lint` + `build` (*Quality Gate 0*) | `npm run check` | ✅ |
| 1 | Sprint 01 | Template de *PR* + revisão substantiva e aprovação de terceiro (`profalexandregomes` ≠ `agbarbosa`) | `.github/pull_request_template.md` + GitHub PR Review | ✅ |
| 2 | Sprint 01–03 | Testes unitários e de aceitação *BDD* automatizados no *CI* | `npm run test:unit` + `npm run test:acceptance` | ✅ |
| 3 | Sprint 03 | Portão de cobertura mínima >= 60% em `src/` | `npm run test:coverage:gate` | ✅ |
| 4 | Sprint 03 | `guard-tests` (proteção contra alteração simultânea de `tests/` e `src/` sem *label* — etiqueta `test-change-justificado`) | `npm run guard:tests` | ✅ |
| 5 | *Backlog* futuro (Lista Priorizada) | Testes *E2E* (*End-to-End* — Ponta a Ponta) em navegador real com Playwright | Substituído atualmente por suíte *BDD* em *DOM* simulado | ⬜ |
| 6 | *Backlog* futuro | *Branch protection* (proteção de ramificação principal `main`) nativa no GitHub | Operado por política de revisão antes do *merge* | ⬜ |
| 7 | Sprint 01–03 | Commits convencionais + *Tags* (etiquetas de versão) e *Releases* versionadas (`v1.0.1`, `v1.1.0`, `v1.2.0`) | Git Tags + GitHub Releases + `CHANGELOG.md` | ✅ |
| 8 | Sprint 03 | Painel de telemetria no produto + Matriz de Rastreabilidade e Plano *ISO 9126* | Painel `#telemetry-panel` + `docs/qualidade/` | ✅ |

---

## Releases e Documentação Complementar

- **Tags e Releases:** [`v1.0.1`](https://github.com/profalexandregomes/todolab-aegis-qa/releases/tag/v1.0.1) · [`v1.1.0`](https://github.com/profalexandregomes/todolab-aegis-qa/releases/tag/v1.1.0) · `v1.2.0` (em integração via Issue `#8`)
- [`CHANGELOG.md`](CHANGELOG.md) — Histórico completo de mudanças por versão.
- [`docs/rodizio.md`](docs/rodizio.md) — Papéis e separação de poderes nas Sprints 01–03.
- [`docs/qualidade/checklist-iso9126.md`](docs/qualidade/checklist-iso9126.md) — Checklist verificado da norma *ISO/IEC 9126*.
- [`docs/qualidade/plano-qualidade-iso9126.md`](docs/qualidade/plano-qualidade-iso9126.md) — Plano de qualidade *ISO/IEC 9126* por subcaracterística.
- [`docs/qualidade/casos-teste/classes-limites.md`](docs/qualidade/casos-teste/classes-limites.md) — Classes de equivalência, valores-limite, tabela de decisão e máquina de estados.
- [`docs/qualidade/painel-metricas.md`](docs/qualidade/painel-metricas.md) — Painel consolidado de métricas reais de testes, cobertura (`80.09%`) e fluxo.
- [`docs/qualidade/matriz-rastreabilidade-v1.2.0.md`](docs/qualidade/matriz-rastreabilidade-v1.2.0.md) — Rastreabilidade completa de *Issue* a *PR*, testes e evidências.
- [`docs/qualidade/checklist-revisao.md`](docs/qualidade/checklist-revisao.md) — Checklist de revisão técnica e registro consolidado.
