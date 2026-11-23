# ISSUE-05 — Registro de diálogo com IA e evidência de implementação

## Identificação da rodada

- Issue: #5 — [Feature 2 / C1+C2] Matriz de Prioridade, Data de Vencimento e Classificador Determinístico de Atraso via TDD
- Branch (ramificação): `feat/issue-05-prioridade-vencimento-tdd`
- Autor da alteração: Alexandre Barbosa (`agbarbosa`) — app-developer
- Revisor previsto: Prof. Alexandre Gomes (`profalexandregomes`) — qa-verifier
- Data: 2026-11-23

## Contexto aprovado

- Link ou referência da Issue: https://github.com/profalexandregomes/todolab-aegis-qa/issues/5
- Critérios de aceite revisados:
  - Cenário 1 (C1): `ordenarTarefas(tarefas)` retorna novo *array* imutável ordenando pendentes antes de concluídas, depois por prioridade (`alta > media > baixa`), e desempate por `criadaEm` crescente.
  - Cenário 2 (C2): `classificarVencimento(tarefa, dataReferencia)` compara datas civis de modo determinístico sem deriva de fuso horário, validando as fronteiras `-1` (`atrasada`), `0` (`vence_hoje`), `+1`..`+3` (`proxima`) e `>= +4` (`futura`).
  - Cenário 3 e bordas: tarefas concluídas (`concluida === true` ou `status === 'done'`) retornam `'concluida'`; datas ausentes ou inválidas retornam `'sem_prazo'`; objetos `Date` em `00:00:00` e `23:59:59` produzem o mesmo resultado civil.
  - Cenário 4 (UI): formulário coleta `prioridade` e `dataVencimento`, cartões exibem selos de prioridade e prazo (removendo selo de atraso ao concluir) e barra de ferramentas oferece controle de ordenação por prioridade.
- Arquivos que podem ser alterados: `src/store.js`, `src/app.js`, `src/styles.css`, `index.html`, `docs/prompts/ISSUE-05.md`
- Arquivos que não devem ser alterados: `tests/**` (suíte *Test-First* elaborada pelo revisor de QA)

## Prompt inicial enviado à IA

```text
Atue como equipe de desenvolvimento do TodoLab (esquadrão Aegis QA).

Contexto: Implementar a Matriz de Prioridade (C1) e Classificador Determinístico de Vencimento (C2) via TDD (Issue #5).
Critérios de aceite aprovados (BDD):
- Exportar funções puras `classificarVencimento(tarefa, dataReferencia)` e `ordenarTarefas(tarefas)` em `src/store.js` com comparação civil determinística (sem deslocamento UTC em fronteiras 00:00/23:59) e saneamento rigoroso de datas `YYYY-MM-DD` (incluindo calendário inválido como 2026-13-40) e prioridades.
- Migrar tarefas legadas sem `prioridade`/`dataVencimento` para `'media'` e `null`.
- Adicionar seletor de prioridade e campo `input[type="date"]` no formulário `#todo-form`, seletor de ordenação na barra Kanban e selos visuais nos cartões (`Alta`/`Média`/`Baixa` e `Atrasada`/`Vence hoje`/`Próxima`/`Futura`/`Concluída`).

Restrições:
- JavaScript puro (ESM), zero dependências externas, sem `innerHTML` inseguro.
- Não alterar nenhum arquivo em `tests/`.
- Seguir estritamente `scripts/lint.mjs`.
```

## Resposta recebida da IA

```text
Implementados o modelo de prioridade/vencimento, funções puras determinísticas e controles de UI da Issue #5:
1. `src/store.js`:
   - Adicionadas funções puras `normalizarPrioridade()`, `normalizarDataVencimento()` (com validação de calendário real via `Date.UTC`), `extrairDiaCivilUtc()`, `classificarVencimento(tarefa, dataReferencia)` e `ordenarTarefas(tarefas)`.
   - Atualizados `normalizarRegistroArmazenado()` e `criarTarefa()` para persistir `prioridade` (padrão `'media'`) e `dataVencimento` (padrão `null`) migrando tarefas legadas com segurança.
2. `index.html`, `src/app.js` e `src/styles.css`:
   - Adicionados `#todo-priority` (`alta`/`media`/`baixa`) e `#todo-due-date` (`type="date"`) em `#todo-form`, e `#sort-select` (`padrao` / `prioridade`) em `.kanban-toolbar`.
   - Cartões exibem selos `.badge--prio-*` e `.badge--due-*` conforme `classificarVencimento(tarefa)` (tarefas concluídas exibem `Concluída`, nunca `Atrasada`).
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
▶ Aceitação BDD — Issue #5 (Matriz de Prioridade, Vencimento e Ordenação na UI)
  ✔ Cenário 4: formulário coleta prioridade e dataVencimento, exibe selos nos cartões e ordena por prioridade
▶ TodoStore.adicionar — Issue #1 (5/5 aprovados)
▶ TodoStore Quadro Scrum-Kanban e Limite de WIP — Issue #4 (5/5 aprovados)
▶ TodoStore persistência resiliente — Issue #3 (6/6 aprovados)
▶ Prioridade, Vencimento e Classificador Determinístico (TDD) — Issue #5
  ✔ armazena prioridade (padrão media) e dataVencimento (padrão null) com migração legada e saneamento
  ✔ Cenário 1 (C1): ordenarTarefas ordena pendentes antes de concluídas, por prioridade e desempate por criadaEm sem mutar origem
  ✔ Cenário 2 (C2): classificarVencimento valida fronteiras exatas -1, 0, +1, +3 e +4 dias com dataReferencia fixa
  ✔ Cenário 3 e bordas: concluída nunca é atrasada, datas ausentes/malformadas dão sem_prazo e Date em 00:00/23:59 é determinístico
▶ TodoStore.remover e unicidade de ID — Issue #2 (5/5 aprovados)

ℹ tests 38 | suites 10 | pass 38 | fail 0
ℹ src/app.js: line 75.90% | branch 67.86%
ℹ src/store.js: line 94.79% | branch 89.08% | funcs 100.00%
```

Verificação manual / smoke test realizado:

- Passos: Executada suíte `tests/acceptance/issue-05.acceptance.test.js` criando tarefas com prioridades `baixa`/`media`/`alta` e datas futura/ontem/hoje, ativando ordenação por prioridade e concluindo a tarefa atrasada.
- Resultado observado: Ordenação respeitou `Alta > Média > Baixa`, selos exibiram `Vence hoje`, `Atrasada` e `Futura`, e ao concluir o selo de atraso foi removido (passando a `Concluída`).
- Pendências ou riscos: Durante a validação inicial foi identificada e reportada ao QA (`#35`) uma colisão no título `'Tarefa Média Atrasada'` no teste de aceitação, corrigida pelo `@qa-verifier` no commit `7057a69`.

## Pull Request e revisão

- URL ou número do Pull Request: a preencher após abertura do PR
- Autor do Pull Request: `agbarbosa`
- Revisor (integrante diferente do autor): `profalexandregomes`
- O PR contém `Closes #5`? [x] sim [ ] não
- Commit ou hash da versão revisada: registrado na abertura do PR
- Resultado do CI: [ ] verde [ ] vermelho [x] ainda em execução
- Comentário substantivo do revisor (referencie um critério de aceite): pendente de revisão
- Há mudanças solicitadas abertas? [ ] sim [x] não
- A aprovação é da versão atual, depois das últimas correções? [ ] sim [ ] não [x] não houve correção
- Aceite manual registrado, com cenários e resultado observado: registrado acima
- Decisão: [ ] merge autorizado [ ] mudanças solicitadas [x] pendente

## Aprendizado da rodada

- Ambiguidade encontrada: Objetos `Date` locais em `23:59:59` (em fuso `UTC-3`) mudam de dia se convertidos com `getUTCDate()`.
- Decisão tomada: Extrair ano/mês/dia locais com `getFullYear()`/`getMonth()`/`getDate()` antes de calcular `Date.UTC(...)` na comparação de dias civis em `classificarVencimento()`.
- Próxima melhoria de processo: Reaproveitar `normalizarPrioridade()` e `normalizarDataVencimento()` nas futuras funções de filtragem e validação de schema da Issue #8.
