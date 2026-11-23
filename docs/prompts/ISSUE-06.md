# ISSUE-06 — Registro de diálogo com IA e evidência de implementação

## Identificação da rodada

- Issue: #6 — [Feature 3] Cronômetro de Foco (Pomodoro) Integrado e Telemetria Estimativa vs. Esforço Real
- Branch (ramificação): `feat/issue-06-foco-pomodoro-esforco`
- Autor da alteração: Alexandre Barbosa (`agbarbosa`) — app-developer
- Revisor previsto: Prof. Alexandre Gomes (`profalexandregomes`) — qa-verifier
- Data: 2026-11-23

## Contexto aprovado

- Link ou referência da Issue: https://github.com/profalexandregomes/todolab-aegis-qa/issues/6
- Critérios de aceite revisados:
  - Cenário 1: definição de `estimativaMin` (padrão `0` na Store, migração legada e saneamento de negativos/`NaN`) e `esforcoRealMin` inicial `0`, exibidos como `Estimativa: N min · Real: M min`.
  - Cenário 2: `TodoStore.registrarEsforco(id, min)` acumula esforço real em tarefas válidas, atualiza `atualizadaEm`, persiste no `localStorage` e rejeita (`null`) `id` inexistente ou minutos `<= 0` / não finitos.
  - Cenário 3: cronômetro *Pomodoro* integrado na UI (`25:00` foco / `05:00` pausa) com botões **Iniciar Foco**, **Pausar**, **Reiniciar** e **Concluir Ciclo**, prevenindo múltiplos `setInterval` concorrentes e registrando o ciclo na tarefa selecionada.
  - Cenário 4: botão rápido `+15 min` nos cartões e exibição do indicador de variação (`+N min` quando acima do estimado).
  - Caso de borda: exclusão da tarefa vinculada ao Pomodoro pausa/limpa o temporizador e desvincula sem erros.
- Arquivos que podem ser alterados: `src/store.js`, `src/app.js`, `src/styles.css`, `index.html`, `docs/prompts/ISSUE-06.md`
- Arquivos que não devem ser alterados: `tests/**` (suíte *Test-First* elaborada pelo revisor de QA)

## Prompt inicial enviado à IA

```text
Atue como equipe de desenvolvimento do TodoLab (esquadrão Aegis QA).

Contexto: Implementar o Cronômetro de Foco (Pomodoro) e a telemetria Estimativa vs. Esforço Real (Issue #6).
Critérios de aceite aprovados (BDD):
- Adicionar `estimativaMin` e `esforcoRealMin` (padrão 0, migração legada e saneamento de negativos/NaN/Infinity) no modelo de tarefa.
- Implementar `TodoStore.registrarEsforco(id, min)` validando `id` existente e `min` finito `> 0`.
- Adicionar campo de estimativa em minutos no `#todo-form`, painel Pomodoro (`25:00` / `05:00`) com seletor de tarefa e botões Iniciar Foco, Pausar, Reiniciar e Concluir Ciclo sem criar múltiplos timers concorrentes.
- Exibir `Estimativa: X min · Real: Y min`, botão rápido `+15 min` e desvio `+N min` nos cartões, pausando/desvinculando o timer com segurança se a tarefa vinculada for removida.

Restrições:
- JavaScript puro (ESM), zero dependências externas, sem `innerHTML` inseguro.
- Não alterar nenhum arquivo em `tests/`.
- Seguir estritamente `scripts/lint.mjs`.
```

## Resposta recebida da IA

```text
Implementados o domínio de esforço e o painel de cronômetro Pomodoro:
1. `src/store.js`:
   - Adicionada função `normalizarMinutosNaoNegativos(valor)` aplicada em `normalizarRegistroArmazenado()` e `criarTarefa()` para `estimativaMin` e `esforcoRealMin`.
   - Implementado `TodoStore.registrarEsforco(id, min)` com validação estrita de `id` e número finito `> 0`, acumulação incremental, atualização de `atualizadaEm` e persistência.
2. `index.html`, `src/app.js` e `src/styles.css`:
   - Adicionados `#todo-estimate` no `#todo-form` e `#pomodoro-panel` com visor `#pomodoro-timer` (`25:00`), modo `#pomodoro-mode` (`Foco (25 min)` / `Pausa Curta (5 min)`), seletor `#pomodoro-task` e controles `#pomodoro-start`, `#pomodoro-pause`, `#pomodoro-reset` e `#pomodoro-complete`.
   - Proteção contra múltiplos `setInterval` (`if (intervaloPomodoro !== null) return;`) e pausa/desvinculação automática ao excluir a tarefa vinculada.
   - Cartões exibem `Estimativa: N min · Real: M min`, botão rápido `+15 min` e badge de desvio (`+N min`).
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
▶ Aceitação BDD — Issue #4 (3/3 aprovados)
▶ Aceitação BDD — Issue #5 (1/1 aprovado)
▶ Aceitação BDD — Issue #6 (Cronômetro Pomodoro e Telemetria Estimativa vs. Esforço Real)
  ✔ Cenários 1, 3 e 4: define estimativa, opera Pomodoro sem múltiplos timers, acumula esforço real e exibe desvio
  ✔ Caso de borda: excluir a tarefa vinculada ao Pomodoro pausa o timer e desvincula sem lançar erro
▶ TodoStore.adicionar — Issue #1 (5/5 aprovados)
▶ TodoStore.esforco — Issue #6
  ✔ Cenário 1: armazena estimativaMin (padrão 0), esforcoRealMin inicial 0 e saneia valores inválidos
  ✔ Cenário 2: registrarEsforco acumula esforcoRealMin, atualiza atualizadaEm e persiste no armazenamento
  ✔ Casos de borda: registrarEsforco rejeita id inexistente e minutos <= 0 ou não finitos sem gravar
▶ TodoStore Quadro Scrum-Kanban e Limite de WIP — Issue #4 (5/5 aprovados)
▶ TodoStore persistência resiliente — Issue #3 (6/6 aprovados)
▶ Prioridade, Vencimento e Classificador Determinístico — Issue #5 (4/4 aprovados)
▶ TodoStore.remover e unicidade de ID — Issue #2 (5/5 aprovados)

ℹ tests 43 | suites 12 | pass 43 | fail 0
ℹ src/app.js: line 68.16% | branch 45.24%
ℹ src/store.js: line 95.12% | branch 90.10% | funcs 100.00%
```

Verificação manual / smoke test realizado:

- Passos: Executada suíte `tests/acceptance/issue-06.acceptance.test.js` com espião de temporizadores validando cliques repetidos em **Iniciar Foco**, **Pausar**, **Concluir Ciclo** (alternando para `05:00` Pausa e de volta para `25:00` Foco), acúmulo de `+15 min` com exibição de `+15 min` acima de `25 min`, e remoção da tarefa vinculada durante timer ativo.
- Resultado observado: Apenas 1 `setInterval` ativo por vez, registro de `25 + 15 = 40 min` persistido, variação `+15 min` exibida no cartão e timer limpo sem exceções ao remover a tarefa ativa.
- Pendências ou riscos: Filtros combinados, busca, edição inline e Undo (Issue #7) e painel global de telemetria + exportação JSON (Issue #8) serão entregues na Sprint 03.

## Pull Request e revisão

- URL ou número do Pull Request: a preencher após abertura do PR
- Autor do Pull Request: `agbarbosa`
- Revisor (integrante diferente do autor): `profalexandregomes`
- O PR contém `Closes #6`? [x] sim [ ] não
- Commit ou hash da versão revisada: registrado na abertura do PR
- Resultado do CI: [ ] verde [ ] vermelho [x] ainda em execução
- Comentário substantivo do revisor (referencie um critério de aceite): pendente de revisão
- Há mudanças solicitadas abertas? [ ] sim [x] não
- A aprovação é da versão atual, depois das últimas correções? [ ] sim [ ] não [x] não houve correção
- Aceite manual registrado, com cenários e resultado observado: registrado acima
- Decisão: [ ] merge autorizado [ ] mudanças solicitadas [x] pendente

## Aprendizado da rodada

- Ambiguidade encontrada: Um cronômetro com `setInterval` poderia vazar timers concorrentes em cliques repetidos ou perder referência se a tarefa vinculada fosse excluída.
- Decisão tomada: Centralizar o estado do temporizador com guarda `if (intervaloPomodoro !== null) return` e sincronizar `sincronizarSeletorPomodoro()` em `render()` para pausar/desvincular automaticamente quando a tarefa vinculada deixar de existir.
- Próxima melhoria de processo: Garantir que ações de `limparConcluidas()` ou `desfazer()` na Issue #7 também passem por `render()` e mantenham o seletor Pomodoro consistente.
