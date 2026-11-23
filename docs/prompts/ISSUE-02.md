# ISSUE-02 — Registro de diálogo com IA e evidência de implementação

## Identificação da rodada

- Issue: #2 — [Bug/D-03] Corrigir exclusão de tarefas com títulos duplicados usando ID único
- Branch (ramificação): `fix/issue-02-remover-por-id`
- Autor da alteração: Alexandre Barbosa (`agbarbosa`) — app-developer
- Revisor previsto: Prof. Alexandre Gomes (`profalexandregomes`) — qa-verifier
- Data: 2026-11-23

## Contexto aprovado

- Link ou referência da Issue: https://github.com/profalexandregomes/todolab-aegis-qa/issues/2
- Critérios de aceite revisados:
  - Cenário 1: excluir `T2` (`id2`) quando `T1` (`id1`) e `T2` têm o mesmo título remove apenas `T2` e preserva `T1` (inclusive seu estado concluído).
  - Cenário 2: criação em sequência imediata gera `id`s não vazios e estritamente distintos.
  - Cenário 3: `remover(id)` com `id` inexistente, `null`, `undefined` ou `""` não altera a lista, não grava no `localStorage` e não lança exceção.
  - Cenário 4: exclusão persiste ao recarregar nova instância de `TodoStore`.
- Arquivos que podem ser alterados: `src/store.js`, `docs/prompts/ISSUE-02.md`
- Arquivos que não devem ser alterados: `tests/**` (suíte *Test-First* elaborada pelo revisor de QA)

## Prompt inicial enviado à IA

```text
Atue como equipe de desenvolvimento do TodoLab (esquadrão Aegis QA).

Contexto: Corrigir o Defeito D-03 (Issue #2), no qual TodoStore.remover(id) utilizava findIndex por titulo em vez de id único.
Critérios de aceite aprovados (BDD):
- Dado duas tarefas com título "Revisar código" (T1 concluída, T2 pendente), quando removo T2 pelo seu id único (via store.remover(t2.id) ou botão na UI), então apenas T2 é removida e T1 permanece concluída inclusive após recarga.
- Dado criação rápida de tarefas em sequência imediata no mesmo milissegundo, então cada tarefa recebe id não vazio e estritamente distinto.
- Dado remoção com id inexistente, nulo, vazio ou repetido, então não altera a lista, não grava no storage e não lança exceção.

Restrições:
- JavaScript puro (ESM — ECMAScript Modules / Módulos Nativos JavaScript), sem novas dependências.
- Não alterar nenhum arquivo em tests/.
- Seguir estritamente scripts/lint.mjs (2 espaços, sem tabs, sem espaços no fim da linha).
```

## Resposta recebida da IA

```text
Implementada a correção da Issue #2 exclusivamente em `src/store.js`:
1. Adicionada função `gerarIdUnico()` utilizando `crypto.randomUUID()` quando disponível e fallback determinístico com contador monotônico (`sequenciaId`), carimbo temporal e sufixo aleatório, evitando colisões mesmo no mesmo milissegundo.
2. Atualizado `TodoStore.remover(id)` para validar `id` (`id == null || id === ''`), localizar o item estritamente por `tarefa.id === id` via `findIndex`, retornar `false` sem gravar no armazenamento quando não encontrado, e remover/persistir retornando `true` quando encontrado.
3. Atualizado `TodoStore.alternar(id)` com guarda defensiva para `id == null || id === ''`.

A camada de UI (`src/app.js`) já vinculava `store.remover(tarefa.id)` e `dataset.id = tarefa.id`, dispensando alterações adicionais na interface.
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

▶ Aceitação BDD — Issue #1 (Impedir tarefas vazias/espaços e normalizar título)
  ✔ 4/4 cenários aprovados
▶ Aceitação BDD — Issue #2 (Exclusão por ID único com títulos duplicados)
  ✔ Cenário 1 e 4: remove apenas a segunda tarefa duplicada pela UI e preserva a primeira concluída após recarregar
  ✔ Cenário 2 e 3: gera IDs únicos sob criação rápida na Store e ignora remoção de ID inexistente ou nulo
▶ TodoStore.adicionar — Issue #1 (normalização e bloqueio de título vazio)
  ✔ 5/5 testes aprovados
▶ TodoStore.remover e unicidade de ID — Issue #2 (Defeito D-03)
  ✔ 5/5 testes aprovados (Cenários 1-4 + bordas)

ℹ tests 16 | suites 4 | pass 16 | fail 0
ℹ src/app.js: line 83.13% | branch 90.00% | funcs 71.43%
ℹ src/store.js: line 97.94% | branch 86.84% | funcs 100.00%
```

Verificação manual / smoke test realizado:

- Passos: Executada suíte de aceitação `tests/acceptance/issue-02.acceptance.test.js` criando duas tarefas idênticas `"Revisar código"` pela UI, marcando `T1` como concluída, clicando em **Remover** em `T2` e reinstanciando `TodoStore` sobre o mesmo `storage`.
- Resultado observado: `T1` permaneceu marcada como concluída na UI e no `localStorage`, enquanto `T2` foi excluída; criação de 50 tarefas em sequência gerou 50 IDs únicos; chamadas inválidas não gravaram no storage.
- Pendências ou riscos: Nenhuma pendência; funcionalidade de *Undo* (Desfazer) está prevista para a Issue #7.

## Pull Request e revisão

- URL ou número do Pull Request: a preencher após abertura do PR
- Autor do Pull Request: `agbarbosa`
- Revisor (integrante diferente do autor): `profalexandregomes`
- O PR contém `Closes #2`? [x] sim [ ] não
- Commit ou hash da versão revisada: registrado na abertura do PR
- Resultado do CI: [ ] verde [ ] vermelho [x] ainda em execução
- Comentário substantivo do revisor (referencie um critério de aceite): pendente de revisão
- Há mudanças solicitadas abertas? [ ] sim [x] não
- A aprovação é da versão atual, depois das últimas correções? [ ] sim [ ] não [x] não houve correção
- Aceite manual registrado, com cenários e resultado observado: registrado acima
- Decisão: [ ] merge autorizado [ ] mudanças solicitadas [x] pendente

## Aprendizado da rodada

- Ambiguidade encontrada: O fallback original `${Date.now()}-${Math.random()}` dependeria apenas de `Math.random()` em ambientes sem `crypto.randomUUID`.
- Decisão tomada: Introduzir `gerarIdUnico()` com contador monotônico incremental como fallback seguro e validar `id == null || id === ''` antes de buscar ou persistir.
- Próxima melhoria de processo: Manter todas as operações futuras da `TodoStore` (`editar`, `moverStatus`, `registrarEsforco`) indexadas exclusivamente por `id`.
