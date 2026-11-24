# Changelog — TodoLab (Esquadrão Aegis QA)

Todas as mudanças notáveis do produto **TodoLab** são documentadas neste arquivo (*Changelog* — Registro Histórico de Alterações por Versão), seguindo o padrão *Keep a Changelog* (Registro Estruturado de Alterações) e Versionamento Semântico (*SemVer* — `MAJOR.MINOR.PATCH` / Versão Maior.Menor.Correção).

---

## [1.2.0] — 2026-11-23 (Sprint 03: Produtividade, Telemetria QA e Portabilidade)

*Sprint* (ciclo iterativo curto de desenvolvimento) dedicada à consolidação funcional, qualidade de caixa-preta, telemetria *QA* (*Quality Assurance* — Garantia da Qualidade) e endurecimento da esteira *CI/CD* (*Continuous Integration / Continuous Delivery* — Integração Contínua / Entrega Contínua).

### Adicionado
- **Issue #7 (`Feature 4` — Produtividade e Caixa-Preta, [PR #15](https://github.com/profalexandregomes/todolab-aegis-qa/pull/15) [*PR* — *Pull Request* / Solicitação de Integração]):**
  - Contador de pendências (`A1`: `contarPendentes()` / `formatarContadorPendentes()`) imune aos filtros ativos (`"0 itens restantes"`, `"1 item restante"`, `"N itens restantes"`).
  - Limpar concluídas (`A3`: `limparConcluidas()`), marcar/desmarcar todas (`B3`: `alternarTodas(concluir)`) e filtros combinados com persistência de estado (`B1`: `todas` / `ativas` / `concluidas`, prioridade e coluna *Kanban* [gestão visual de fluxo contínuo]).
  - Busca instantânea insensível a maiúsculas/minúsculas e acentos via decomposição *NFD* (*Normalization Form Decomposition* — Decomposição Canônica Unicode) (`B5`).
  - Edição *inline* (direta na linha / no próprio cartão por duplo clique ou teclado) com suporte a `Enter`, *blur* (perda de foco do campo), `Esc` (cancelamento) e remoção em título vazio, preservando estritamente `concluida` e `status` (`B2`).
  - Limite de 200 *chars* (*characters* — caracteres) com contador regressivo exibido acima de 180 caracteres (`B4`) e proteção contra *XSS* (*Cross-Site Scripting* — Injeção de Script Entre Sites) via `textContent`.
  - Pilha de *Undo* (Desfazer) em memória (`C4`: `desfazer()`) revertendo inclusive operações em lote em um único passo.
- **Issue #8 (`Feature 5 / C3+D3` — Telemetria QA, Portabilidade `v1.2.0` e CI Gates):**
  - Funções puras `calcularEstatisticas(tarefas, dataReferencia, limiteWip)` (tratamento seguro de `0/0 -> 0` e arredondamento a 1 casa decimal) e `validarSchemaImportacao(payload)` (validação de esquema [*Schema*] `v1.2.0`, limite de 5.000 tarefas e proteção contra poluição de protótipo).
  - Métodos `estatisticas()`, `exportarJSON()` (*JSON* — *JavaScript Object Notation* / Notação de Objetos JavaScript) e `importarJSON(jsonBruto)` com rejeição atômica e suporte a `desfazer()`.
  - Painel de Telemetria de Qualidade na *UI* (*User Interface* — Interface de Usuário) (`#telemetry-panel`) com botões de Exportar `.json` e Importar `.json`.
  - Endurecimento da esteira *CI/CD* em `.github/workflows/quality-gate.yml` com `scripts/check-coverage.mjs` (`test:coverage:gate >= 60%` em `src/`) e `scripts/guard-tests.mjs` (`guard:tests` — proteção contra alteração simultânea de `tests/` e `src/`), atingindo **55/55 testes aprovados** e **`80.09%`** de média de cobertura de linhas em `src/`.
  - Documentação consolidada de governança: `README.md`, `docs/rodizio.md`, `docs/qualidade/checklist-iso9126.md`, `docs/qualidade/plano-qualidade-iso9126.md`, `docs/qualidade/casos-teste/classes-limites.md`, `docs/qualidade/painel-metricas.md`, `docs/qualidade/matriz-rastreabilidade-v1.2.0.md`, `docs/qualidade/checklist-revisao.md` e `CHANGELOG.md`.

---

## [1.1.0] — 2026-11-23 (Sprint 02: Quadro Kanban, TDD e Foco Pomodoro)

### Adicionado
- **Issue #4 (`Feature 1` — Quadro *Scrum-Kanban* e Limite de *WIP*, [PR #12](https://github.com/profalexandregomes/todolab-aegis-qa/pull/12)):**
  - Quadro visual de 4 colunas (`A Fazer`, `Em Progresso`, `Em Revisão`, `Concluído`) com *Drag-and-Drop* (Arrastar e Soltar) e controles equivalentes acessíveis por teclado.
  - Métodos `moverStatus(id, novoStatus)` e `definirLimiteWip(n)` aplicando bloqueio `WIP_LIMIT_EXCEEDED` (*WIP* — *Work in Progress* / Trabalho em Progresso, padrão `2` itens em `Em Progresso`) e sincronização bidirecional com `concluida`.
- **Issue #5 (`Feature 2 / C1+C2` — Prioridade e Prazo via *TDD*, [PR #13](https://github.com/profalexandregomes/todolab-aegis-qa/pull/13)):**
  - Suporte a `prioridade` (`alta`, `media`, `baixa`) e `dataVencimento` (`YYYY-MM-DD`).
  - Funções puras determinísticas desenvolvidas por *TDD* (*Test-Driven Development* — Desenvolvimento Orientado a Testes): `classificarVencimento(tarefa, dataReferencia)` (`atrasada`, `vence_hoje`, `proxima`, `futura`, `sem_prazo`, `concluida`) e `ordenarTarefas(tarefas)` (pendentes antes de concluídas, prioridade decrescente e desempate por `criadaEm`).
- **Issue #6 (`Feature 3` — Cronômetro *Pomodoro* e Esforço Real, [PR #14](https://github.com/profalexandregomes/todolab-aegis-qa/pull/14)):**
  - Campos `estimativaMin` e `esforcoRealMin`, método `registrarEsforco(id, min)` e cronômetro *Pomodoro* (técnica de ciclos de 25 min de foco e 5 min de pausa) integrado à interface com comparação **Estimativa vs. Esforço Real**.

---

## [1.0.1] — 2026-11-23 (Sprint 01: Estabilização e Confiabilidade ISO 9126)

### Corrigido
- **Issue #1 (`Bug/A2` — Defeito D-01, [PR #9](https://github.com/profalexandregomes/todolab-aegis-qa/pull/9)):**
  - Normalização de títulos com `.trim()` (remoção de espaços nas bordas), rejeição de textos vazios ou compostos apenas por espaços/tabulações/quebras de linha, criação da suíte inicial de testes (`node:test`) e feedback acessível via região `aria-live` (*Accessible Rich Internet Applications* — região dinâmica para leitores de tela).
- **Issue #2 (`Bug/D-03` — Defeito D-03, [PR #10](https://github.com/profalexandregomes/todolab-aegis-qa/pull/10)):**
  - Remoção e alternância realizadas estritamente por `id` (*Identifier* — Identificador Único), eliminando exclusão incorreta de tarefas homônimas, além de garantia de identificadores únicos.
- **Issue #3 (`Bug/A4` — Defeito D-02, [PR #11](https://github.com/profalexandregomes/todolab-aegis-qa/pull/11)):**
  - Persistência tolerante a falhas de acordo com a norma **ISO/IEC 9126** (*International Organization for Standardization* — Confiabilidade): recuperação segura de *JSON* corrompido ou estrutura incompatível no `localStorage` (Armazenamento Local Persistente do Navegador), captura de `QuotaExceededError` (Erro de Cota Excedida) e `SecurityError` (armazenamento bloqueado) mantendo operação em memória e exibição de alerta não bloqueante na *UI*.
