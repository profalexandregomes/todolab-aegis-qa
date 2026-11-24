# ISSUE-07 — Registro de diálogo com IA e evidência de implementação

## Identificação da rodada

- Issue: #7 — [Feature 4 / A1+A3+B1+B2+B4+B5+C4] Filtros Combinados, Busca Instantânea, Edição Inline (Limite 200 chars) e Pilha de Desfazer (Undo)
- Branch (ramificação): `feat/issue-07-filtros-busca-edicao-undo`
- Autor da alteração: Alexandre Barbosa (`agbarbosa`) — app-developer
- Revisor previsto: Prof. Alexandre Gomes (`profalexandregomes`) — qa-verifier
- Data: 2026-11-23

## Contexto aprovado

- Link ou referência da Issue: https://github.com/profalexandregomes/todolab-aegis-qa/issues/7
- Critérios de aceite revisados:
  - Cenário 1 (A1): `contarPendentes()` e `formatarContadorPendentes()` retornam `"0 itens restantes"`, `"1 item restante"` ou `"N itens restantes"` contando sempre todas as tarefas pendentes da Store, imunes ao filtro ativo.
  - Cenário 2 (B1 + B5): `filtrar({ statusFiltro, prioridade, colunaKanban, busca, ordenar })` combina critérios com AND e busca normalizada via NFD (sem caixa/acentos); UI exibe mensagem explícita quando o filtro não encontra correspondências.
  - Cenário 3 (B1): `statusFiltro` (`todas` | `ativas` | `concluidas`) persiste em `todolab:config` no `localStorage`.
  - Cenário 4 (B2): edição *inline* via duplo clique ou botão **Editar**, confirmando com `Enter` / `blur`, cancelando com `Esc`, removendo com título vazio e preservando estritamente `concluida` e `status`.
  - Cenário 5 (B4): limite exato de `200` caracteres após *trim* (aceitando `199`/`200` e bloqueando `201` em `adicionar` e `editar` com `ultimoErro`) e contador regressivo visível na UI apenas acima de `180` caracteres.
  - Cenário 6 (A3 + B3 + C4): **Limpar concluídas** (oculto quando 0 concluídas), **Marcar/desmarcar todas** e pilha LIFO `pilhaUndo` / `desfazer()` revertendo inclusive lotes em 1 passo.
  - Segurança: proteção anti-XSS renderizando títulos exclusivamente via `textContent`.
- Arquivos que podem ser alterados: `src/store.js`, `src/app.js`, `src/styles.css`, `index.html`, `docs/prompts/ISSUE-07.md`
- Arquivos que não devem ser alterados: `tests/**` (suíte *Test-First* elaborada pelo revisor de QA)

## Prompt inicial enviado à IA

```text
Atue como equipe de desenvolvimento do TodoLab (esquadrão Aegis QA).

Contexto: Implementar as funcionalidades A1, A3, B1, B2, B3, B4, B5 e C4 da Issue #7 sobre o TodoStore e o quadro Scrum-Kanban.
Critérios de aceite aprovados (BDD):
- Implementar contarPendentes(), formatarContadorPendentes(), filtrar() com busca NFD, definirFiltroStatus() persistido em todolab:config, editar() preservando concluida/status e removendo em vazio, limite estrito de 200 chars em adicionar/editar, limparConcluidas(), alternarTodas() e pilha LIFO pilhaUndo/desfazer().
- Adicionar na UI: contador A1 permanente (sem aria-live), busca instantânea, filtros de status/prioridade, estado vazio de filtro, edição inline (botão Editar + dblclick, Enter/Esc/blur), contador regressivo acima de 180 chars, botões Marcar todas, Limpar concluídas e Desfazer (Undo), mantendo anti-XSS via textContent.

Restrições:
- JavaScript puro (ESM), zero dependências externas, sem `innerHTML`.
- Não alterar nenhum arquivo em `tests/`.
- Seguir estritamente `scripts/lint.mjs`.
```

## Resposta recebida da IA

```text
Implementadas todas as funcionalidades e proteções da Issue #7:
1. `src/store.js`:
   - Adicionada constante `LIMITE_TITULO = 200` e `normalizarTextoBusca()` (via `.normalize('NFD').replace(/[\u0300-\u036f]/g, '')`).
   - Implementados `carregarConfiguracao()`, `salvarConfiguracao()`, `definirFiltroStatus()`, `registrarSnapshotUndo()`, `editar(id, novoTitulo, camposExtras)`, `limparConcluidas()`, `alternarTodas(concluir)`, `desfazer()`, `contarPendentes()`, `formatarContadorPendentes()` e `filtrar(...)`.
   - `extrairTituloNormalizado()` e `editar()` aplicam o limite estrito de 200 caracteres após `trim()`.
2. `index.html`, `src/app.js` e `src/styles.css`:
   - Adicionados `#title-char-counter` (exibido apenas >180 chars), `#search-input`, `#filter-status`, `#filter-priority`, `#pending-counter`, `#toggle-all-btn`, `#clear-completed-btn`, `#undo-btn` e `#filter-empty-state`.
   - Implementada máquina de estados de edição *inline* (`editingTaskId`, `dblclick`/botão **Editar**, `Enter`/`blur`/`Esc`, foco e `select()`) com preservação de `concluida`/`status` e renderização anti-XSS via `textContent`.
```

## Verificação humana antes do Pull Request

- [x] O diff foi lido pela equipe.
- [x] Os critérios de aceite foram comparados com a alteração.
- [x] `npm run check` foi executado e o resultado real foi registrado.
- [x] A verificação automatizada (`npm test` e `npm run test:coverage`) foi executada.
- [x] Pendências, limitações ou dúvidas foram registradas abaixo.

Resultado real do `npm run check && npm test && npm run test:coverage`:

```text
> todolab-template@0.1.0 check
> npm run lint && npm run build

Lint aprovado: 5 arquivos JavaScript verificados.
Build aprovado: artefato gerado em dist/.

▶ Aceitação BDD — Issues #1 a #6 (15/15 aprovados)
▶ Aceitação BDD — Issue #7 (Filtros, Busca, Contador A1, Edição Inline 200 chars e Undo)
  ✔ Cenários 1, 2 e 3: contador A1 imune ao filtro, filtros combinados + busca sem acento, vazio e persistência do filtro
  ✔ Cenário 4: edição inline via Enter, Esc, vazio remove e preserva estado concluído
  ✔ Cenários 5, 6 e XSS: contador regressivo (>180), limite 200/201, limpar concluídas, desfazer em 1 passo e anti-XSS
▶ TodoStore — unitários Issues #1 a #6 (28/28 aprovados)
▶ TodoStore Filtros, Busca, Edição (200 chars), Lote e Undo — Issue #7
  ✔ Cenário 1 (A1): contarPendentes e formatarContadorPendentes pluralizam e ignoram filtros
  ✔ Cenário 2 (B1 + B5): filtrar combina statusFiltro, prioridade, colunaKanban, busca sem acento/caixa e ordenação
  ✔ Cenários 4 e 5 (B2 + B4): editar preserva concluida/status, remove quando vazio e impõe limite exato de 200 caracteres
  ✔ Cenário 6 e bordas (A3 + B3 + C4): limparConcluidas, alternarTodas e pilha LIFO de desfazer

ℹ tests 50 | suites 14 | pass 50 | fail 0
ℹ src/app.js: line 70.23% | branch 59.70%
ℹ src/store.js: line 94.88% | branch 86.59% | funcs 98.04%
```

Verificação manual / smoke test realizado:

- Passos: Executada suíte `tests/acceptance/issue-07.acceptance.test.js` validando contador A1 sob filtro, busca NFD sem acento, mensagem de filtro vazio, persistência de `ativas` após recarregar, edição inline (`Esc`/`Enter`/vazio) preservando `done`, contador regressivo >180, rejeição de 201 chars, payload XSS e `Limpar concluídas` + `Desfazer` em lote.
- Resultado observado: Todos os 50 testes passaram; durante a validação foi corrigido no helper `tests/helpers/dom-stub.js` (`cda4738` por `@qa-verifier`) o suporte a seletores descendentes e ajustada a ordem de `#sort-select` antes de `#filter-priority` em `index.html`.
- Pendências ou riscos: Painel de telemetria global, exportação/importação JSON `v1.2.0` e endurecimento final do CI/CD estão previstos na Issue #8.

## Pull Request e revisão

- URL ou número do Pull Request: a preencher após abertura do PR
- Autor do Pull Request: `agbarbosa`
- Revisor (integrante diferente do autor): `profalexandregomes`
- O PR contém `Closes #7`? [x] sim [ ] não
- Commit ou hash da versão revisada: registrado na abertura do PR
- Resultado do CI: [ ] verde [ ] vermelho [x] ainda em execução
- Comentário substantivo do revisor (referencie um critério de aceite): pendente de revisão
- Há mudanças solicitadas abertas? [ ] sim [x] não
- A aprovação é da versão atual, depois das últimas correções? [ ] sim [ ] não [x] não houve correção
- Aceite manual registrado, com cenários e resultado observado: registrado acima
- Decisão: [ ] merge autorizado [ ] mudanças solicitadas [x] pendente

## Aprendizado da rodada

- Ambiguidade encontrada: A ordem de elementos `<select>` na barra de ferramentas afeta heurísticas de descoberta de controles com palavra-chave compartilhada (`prioridade`), exigindo posicionamento explícito e rótulos inequívocos.
- Decisão tomada: Posicionar `#sort-select` antes de `#filter-priority` e manter `aria-live` restrito às regiões transitórias de feedback/alerta para preservar acessibilidade sem poluir leitores de tela com contadores permanentes.
- Próxima melhoria de processo: Integrar `estatisticas()` e `importarJSON()` na Issue #8 reutilizando `registrarSnapshotUndo()` e `normalizarRegistroArmazenado()`.
