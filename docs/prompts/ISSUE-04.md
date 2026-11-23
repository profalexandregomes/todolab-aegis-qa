# ISSUE-04 — Registro de diálogo com IA e evidência de implementação

## Identificação da rodada

- Issue: #4 — [Feature 1] Quadro Scrum-Kanban Interativo de 4 Colunas com Limite de WIP e Drag-and-Drop
- Branch (ramificação): `feat/issue-04-quadro-kanban-wip`
- Autor da alteração: Alexandre Barbosa (`agbarbosa`) — app-developer
- Revisor previsto: Prof. Alexandre Gomes (`profalexandregomes`) — qa-verifier
- Data: 2026-11-23

## Contexto aprovado

- Link ou referência da Issue: https://github.com/profalexandregomes/todolab-aegis-qa/issues/4
- Critérios de aceite revisados:
  - Cenário 1: Quadro com 4 colunas rotuladas (`A Fazer` / `todo`, `Em Progresso` / `in_progress` com contador `atual / limite`, `Em Revisão` / `review` e `Concluído` / `done`).
  - Cenário 2: Movimentação via `moverStatus(id, novoStatus)`, *Drag-and-Drop* (Arrastar e Soltar) e seletor acessível por teclado (`aria-label`), atualizando `atualizadaEm` e persistindo estado.
  - Cenário 3: Bloqueio por Limite de *WIP* (*Work in Progress* — Trabalho em Progresso) retornando `{ sucesso: false, motivo: 'WIP_LIMIT_EXCEEDED', limiteWip }` sem gravar no armazenamento, mantendo cartão na origem e exibindo aviso acessível na interface.
  - Cenário 4: Sincronização bidirecional entre `status === 'done'` e `concluida`.
  - Cenário 5: Configuração dinâmica e persistida de `limiteWip` via `definirLimiteWip(n)` e controle na interface, rejeitando valores `<= 0`, `NaN` ou não inteiros.
- Arquivos que podem ser alterados: `src/store.js`, `src/app.js`, `src/styles.css`, `index.html`, `docs/prompts/ISSUE-04.md`
- Arquivos que não devem ser alterados: `tests/**` (suíte *Test-First* elaborada pelo revisor de QA)

## Prompt inicial enviado à IA

```text
Atue como equipe de desenvolvimento do TodoLab (esquadrão Aegis QA).

Contexto: Evoluir o TodoLab para Quadro Scrum-Kanban de 4 colunas (todo, in_progress, review, done) com Limite de WIP configurável (padrão 2), Drag-and-Drop nativo e controles equivalentes acessíveis por teclado.
Critérios de aceite aprovados (BDD):
- Migrar tarefas legadas sem status (`concluida ? 'done' : 'todo'`) mantendo compatibilidade com as Issues #1-#3.
- Implementar `moverStatus(id, novoStatus)` bloqueando entrada em `in_progress` quando atingido `this.limiteWip` com `{ sucesso: false, motivo: 'WIP_LIMIT_EXCEEDED', limiteWip }` e permitindo mover cartão já em `in_progress` para a mesma coluna sem erro.
- Implementar `definirLimiteWip(n)` aceitando apenas inteiros >= 1 e persistindo em `todolab:config`.
- Renderizar as 4 colunas com contadores (`atual / limite` em Em Progresso), cartões `draggable="true"` com `data-id`, checkbox, botão `.remove` e seletor `<select>` com `aria-label`, além de controle de limite de WIP na interface.

Restrições:
- JavaScript puro (ESM), zero dependências externas, sem `innerHTML` inseguro.
- Não alterar nenhum arquivo em `tests/`.
- Seguir estritamente `scripts/lint.mjs`.
```

## Resposta recebida da IA

```text
Implementado o Quadro Scrum-Kanban com limite de WIP:
1. `src/store.js`:
   - Adicionados `CHAVE_CONFIG` (`todolab:config`), `STATUS_VALIDOS`, migração legada de `status` e `atualizadaEm` em `normalizarRegistroArmazenado()`, e suporte a `status` em `criarTarefa()`/`adicionar()`.
   - Adicionados `carregarLimiteWip()`, `definirLimiteWip(n)` (rejeita `<= 0`, `NaN`, decimais e não-números) e `moverStatus(id, novoStatus)` com aplicação do limite de WIP em `in_progress`, sincronização de `concluida` e retorno estruturado `{ sucesso: false, motivo: 'WIP_LIMIT_EXCEEDED', limiteWip }`.
   - `alternar(id)` atualizado para sincronizar `status` (`'done'` / `'todo'`) e `atualizadaEm`.
2. `index.html`, `src/app.js` e `src/styles.css`:
   - Adicionados formulário `#wip-form`/`#wip-limit-input`, região acessível `#kanban-alert` (`role="status"`, `aria-live="polite"`) e o quadro `#kanban-board` com as 4 colunas `data-status="todo|in_progress|review|done"`.
   - Cartões com `draggable="true"`, eventos `dragstart`/`dragend`, `dragover`/`dragleave`/`drop` nas colunas e `<select>` com `aria-label` para operação completa via teclado.
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

▶ Aceitação BDD — Issue #1 (4/4 aprovados)
▶ Aceitação BDD — Issue #2 (2/2 aprovados)
▶ Aceitação BDD — Issue #3 (3/3 aprovados)
▶ Aceitação BDD — Issue #4 (Quadro Scrum-Kanban de 4 colunas, WIP e Drag-and-Drop)
  ✔ Cenário 1: renderiza 4 colunas Kanban rotuladas e exibe contador WIP na coluna Em Progresso
  ✔ Cenários 2 e 3: movimenta cartões via Drag-and-Drop e controle acessível por teclado e bloqueia 3ª tarefa ao atingir WIP 2/2
  ✔ Cenários 4 e 5: permite configurar limite WIP para 3 na UI, concluir via Drag-and-Drop e persistir estado ao recarregar
▶ TodoStore.adicionar — Issue #1 (5/5 aprovados)
▶ TodoStore Quadro Scrum-Kanban e Limite de WIP — Issue #4
  ✔ inicializa com limiteWip padrão 2, status "todo" em novas tarefas e migra tarefas legadas sem status
  ✔ Cenário 2 e 4: moverStatus transiciona entre as 4 colunas, sincroniza concluida/atualizadaEm e persiste
  ✔ Cenário 3: bloqueia entrada em in_progress quando limiteWip (2) é atingido retornando WIP_LIMIT_EXCEEDED
  ✔ Cenário 5: definirLimiteWip(n) atualiza dinamicamente, persiste entre sessões e rejeita valores inválidos
  ✔ Casos de borda: mesma coluna in_progress cheia não falha, status/id inválido retorna sucesso:false e redução de WIP preserva existentes
▶ TodoStore persistência resiliente — Issue #3 (6/6 aprovados)
▶ TodoStore.remover e unicidade de ID — Issue #2 (5/5 aprovados)

ℹ tests 33 | suites 8 | pass 33 | fail 0
ℹ src/app.js: line 68.77% | branch 66.67%
ℹ src/store.js: line 97.05% | branch 90.16% | funcs 100.00%
```

Verificação manual / smoke test realizado:

- Passos: Executada suíte `tests/acceptance/issue-04.acceptance.test.js` verificando renderização das 4 colunas, contador `0 / 2` -> `1 / 2` -> `2 / 2`, bloqueio do 3º cartão com aviso acessível, alteração do limite de WIP para `3` e conclusão via `dragstart`/`dragover`/`drop` e `<select>` com recarga de instância.
- Resultado observado: Todas as transições, bloqueios de WIP e persistência funcionaram em conjunto com as regressões das Issues #1–#3.
- Pendências ou riscos: Prioridade/vencimento (Issue #5), Pomodoro/esforço (Issue #6), filtros/edição/undo (Issue #7) e telemetria/exportação (Issue #8) serão adicionados nas rodadas seguintes.

## Pull Request e revisão

- URL ou número do Pull Request: a preencher após abertura do PR
- Autor do Pull Request: `agbarbosa`
- Revisor (integrante diferente do autor): `profalexandregomes`
- O PR contém `Closes #4`? [x] sim [ ] não
- Commit ou hash da versão revisada: registrado na abertura do PR
- Resultado do CI: [ ] verde [ ] vermelho [x] ainda em execução
- Comentário substantivo do revisor (referencie um critério de aceite): pendente de revisão
- Há mudanças solicitadas abertas? [ ] sim [x] não
- A aprovação é da versão atual, depois das últimas correções? [ ] sim [ ] não [x] não houve correção
- Aceite manual registrado, com cenários e resultado observado: registrado acima
- Decisão: [ ] merge autorizado [ ] mudanças solicitadas [x] pendente

## Aprendizado da rodada

- Ambiguidade encontrada: A tentativa de reduzir o `limiteWip` abaixo do número atual em `in_progress` não deve remover cartões automaticamente, apenas impedir novas entradas até a coluna liberar capacidade.
- Decisão tomada: Validar `emProgresso >= this.limiteWip` apenas em transições cujo destino é `'in_progress'` e cuja origem ainda não é `'in_progress'`.
- Próxima melhoria de processo: Manter a região `#kanban-alert` separada de `#todo-feedback` e `#storage-alert` para preservar independência semântica de leitores de tela.
