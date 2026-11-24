# ISSUE-18 — Registro de diálogo com IA e evidência de implementação

## Identificação da rodada

- Issue: #18 — Correção de UX nos cartões Kanban (largura útil do título, seletor CSS de checkbox e painel de edição multi-campo)
- Branch (ramificação): `fix/issue-18-kanban-card-ux-edicao-completa`
- Autor da alteração: Alexandre Barbosa (`agbarbosa`) — ux-developer
- Revisor previsto: Prof. Alexandre Gomes (`profalexandregomes`) — ux-verifier
- Data: 2026-11-24

## Contexto aprovado

- Link da Issue: https://github.com/profalexandregomes/todolab-aegis-qa/issues/18
- Critérios de aceite revisados:
  - Cenário 1 (Layout do Cartão *Kanban* [gestão visual de fluxo contínuo]): O cabeçalho `.todo-card__header` exibe `.todo-card__header-left` (*checkbox* [caixa de seleção], selo de prioridade e selo de prazo) à esquerda e `.todo-card__top-actions` (`Editar` quando não está em edição e `Remover`) à direita, enquanto `.todo-card__body` exibe `.todo-card__title` e `.todo-card__date` em 100% da largura útil sem compressão lateral por `.todo-card__main`.
  - Cenário 2 (*CSS* [*Cascading Style Sheets* — Folhas de Estilo em Cascata] dos *Inputs* [campos de entrada]): O seletor restritivo de 17×17 px aplica-se exclusivamente a `.todo-card input[type="checkbox"]` e `.todo input[type="checkbox"]`, nunca a `.todo-card__main input`, preservando largura total de `.todo-card__edit-input`.
  - Cenário 3 (Edição Multi-Campo na *UI* [*User Interface* — Interface de Usuário] e na `TodoStore`): Ao clicar em `Editar` (ou duplo clique no título), abre `.todo-card__edit-panel` com título (`.todo-card__edit-input`, primeiro `<input>` não-*checkbox* do cartão para compatibilidade com a Issue #7), prioridade (`.todo-card__edit-priority`), prazo (`.todo-card__edit-date`), estimativa em minutos (`.todo-card__edit-estimate`), esforço real em minutos (`.todo-card__edit-real`), botão `Salvar` (`.save-edit-btn`) e botão `Cancelar` (`.cancel-edit-btn`). Perda de foco (*blur*) não fecha o painel prematuramente; `Salvar` ou `Enter` persistem os 5 campos via `TodoStore.editar(id, novoTitulo, camposExtras)` preservando `status` e `concluida`.
  - Cenário 4 (Cancelamento, Esvaziamento e *Undo* [Desfazer]): `Cancelar` ou `Escape` descartam alterações; confirmar com título vazio ou apenas espaços remove a tarefa; `desfazer()` restaura todos os 5 campos em 1 único passo.
- Arquivos alterados: `src/store.js`, `src/app.js`, `src/styles.css`, `index.html`, `docs/prompts/ISSUE-18.md`, `CHANGELOG.md`
- Arquivos que não foram alterados pelo autor: `tests/**` (suíte *Test-First* elaborada pelo revisor de *QA* [*Quality Assurance* — Garantia da Qualidade])

## Prompt inicial enviado à IA

```text
Atue como ux-developer do TodoLab (Esquadrão Aegis QA).

Contexto: Corrigir o layout dos cartões Kanban e habilitar edição completa multi-campo conforme a Issue #18, mantendo 100% de compatibilidade com os testes das Issues #1–#8 e #18.
Requisitos:
1. Em `src/store.js`, suportar `esforcoRealMin` em `TodoStore.editar(id, novoTitulo, camposExtras = {})` e na criação via `normalizarMinutosNaoNegativos`.
2. Em `src/app.js`, reestruturar `criarCartaoTarefa(tarefa)` em `.todo-card__header` (`.todo-card__header-left` + `.todo-card__top-actions` ocultando `Editar` durante edição) e `.todo-card__body` (título + prazo em largura total ou `.todo-card__edit-panel` com título, prioridade, prazo, estimativa, esforço real, `Salvar` e `Cancelar`, sem fechamento prematuro por `blur`).
3. Em `src/styles.css`, substituir `.todo-card__main input` e `.todo input` por `input[type="checkbox"]`, estilizando `.todo-card__header`, `.todo-card__body`, `.todo-card__edit-panel`, `.todo-card__edit-grid` e `.todo-card__edit-actions`.
4. Atualizar `.build-mark` em `index.html` para `build 1.2.1 · Aegis QA` e documentar em `docs/prompts/ISSUE-18.md` e `CHANGELOG.md`.

Restrições:
- JavaScript puro (ESM), zero dependências externas, sem `innerHTML`.
- Não alterar nenhum arquivo em `tests/`.
- Seguir estritamente `scripts/lint.mjs`.
```

## Resposta recebida da IA

```text
Implementadas as correções de UX e edição multi-campo da Issue #18:
1. `src/store.js`: suporte a `esforcoRealMin` em `TodoStore.editar()` e em `criarTarefa()` com `normalizarMinutosNaoNegativos`, mantendo saneamento de valores inválidos/negativos e reversão completa em 1 passo no `desfazer()`.
2. `src/app.js`: `criarCartaoTarefa(tarefa)` reestruturado com `.todo-card__header` (`.todo-card__header-left` + `.todo-card__top-actions`) e `.todo-card__body` (largura total no modo leitura e `.todo-card__edit-panel` no modo edição com 5 campos, botões `Salvar`/`Cancelar`, atalhos `Enter`/`Escape` e sem fechamento em `blur`).
3. `src/styles.css`: remoção de `.todo-card__main input`, adoção de `.todo-card input[type="checkbox"]` e `.todo input[type="checkbox"]`, e estilização completa do cabeçalho, corpo em largura total e painel de edição responsivo em 2 colunas.
4. `index.html`: marca de compilação atualizada para `build 1.2.1 · Aegis QA`.
```

## Verificação humana antes do Pull Request

- [x] O diff (*differential* — diferença entre versões) foi lido pela equipe.
- [x] Os critérios de aceite foram comparados com a alteração.
- [x] `npm run check` foi executado e o resultado real foi registrado.
- [x] `npm test` e `npm run test:coverage:gate` foram executados.
- [x] Pendências, limitações ou dúvidas foram registradas abaixo.

Resultado real das verificações:

```text
> todolab-template@0.1.0 lint
> node scripts/lint.mjs
Lint aprovado: 7 arquivos JavaScript verificados.

> todolab-template@0.1.0 build
> node scripts/build.mjs
Build aprovado: artefato gerado em dist/.

> todolab-template@0.1.0 test
> node --test tests/unit tests/acceptance
tests 61 | suites 18 | pass 61 | fail 0

> todolab-template@0.1.0 test:coverage:gate
app.js: line 74.50% | branch 50.00% | funcs 41.67%
store.js: line 94.38% | branch 85.80% | funcs 98.25%
Coverage Gate aprovado (média de linhas em src/: 84.44% >= 60%).
```

Verificação manual / *smoke test* (teste rápido de fumaça) planejado:

- Passos: Após aprovação e publicação da *Release* (versão publicada) `v1.2.1` no *GitHub Pages* (hospedagem estática do GitHub), validar *HTTP* (*Hypertext Transfer Protocol* — Protocolo de Transferência de Hipertexto) `200` em `src/styles.css` (`input[type="checkbox"]`, `.todo-card__edit-panel`) e `src/app.js` (`.todo-card__edit-panel`, `esforcoRealMin`).
- Resultado observado localmente: Todos os 61 testes (unitários e aceitação *BDD* [*Behavior-Driven Development* — Desenvolvimento Orientado a Comportamento]) e portões locais passaram sem erros e com `tests/` intacto desde o *commit* *Red* (vermelho) `2833b6c`.

## Pull Request e revisão

- URL ou número do Pull Request: a preencher após abertura do PR (*Pull Request* — Solicitação de Integração)
- Autor do Pull Request: `agbarbosa`
- Revisor (integrante diferente do autor): `profalexandregomes`
- O PR contém `Closes #18`? [x] sim [ ] não
- Resultado do CI (*Continuous Integration* — Integração Contínua): [ ] verde [ ] vermelho [x] aguardando execução após abertura do PR
- Decisão: [ ] merge autorizado [ ] mudanças solicitadas [x] pendente de revisão por `@ux-verifier`

## Aprendizado da rodada

- Ambiguidade encontrada: Seletores *CSS* genéricos baseados em elemento ancestral (`.todo-card__main input`) vazam para novos campos adicionados dentro de painéis de edição, encolhendo *inputs* de texto/data/número para as dimensões do *checkbox*.
- Decisão tomada: Restringir estilização de *checkbox* estritamente a `input[type="checkbox"]`, separar visualmente o cabeçalho de metadados/ações (`.todo-card__header`) do corpo textual/edição em largura total (`.todo-card__body`) e substituir o salvamento automático em `blur` por confirmação explícita (`Salvar`/`Enter` e `Cancelar`/`Escape`).
