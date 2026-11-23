# ISSUE-01 — Registro de diálogo com IA e evidência de implementação

## Identificação da rodada

- Issue: #1 — [Bug/A2] Impedir criação de tarefas vazias ou compostas apenas por espaços (Defeito D-01)
- Branch (ramificação): `fix/issue-01-normalizar-titulo-vazio`
- Autor da alteração: Alexandre Barbosa (`agbarbosa`) — app-developer
- Revisor previsto: Prof. Alexandre Gomes (`profalexandregomes`) — qa-verifier
- Data: 2026-11-23

## Contexto aprovado

- Link ou referência da Issue: https://github.com/profalexandregomes/todolab-aegis-qa/issues/1
- Critérios de aceite revisados:
  - Cenário 1: normalização com *trim* (remoção de espaços nas bordas) mantendo espaços internos, acentos e emojis.
  - Cenário 2: entrada totalmente vazia `""` retorna `null`, registra `this.ultimoErro`, mantém foco em `#todo-input` e exibe aviso acessível em região `aria-live`.
  - Cenário 3: entradas compostas apenas por espaços/tabulações/quebras (`"   "`, `"\t\t"`, `"\n  "`) bloqueiam gravação no `localStorage` e preservam lista existente; aviso é limpo após criação válida.
  - Cenário 4: entradas `null`, `undefined`, numéricas ou objetos sem propriedade `titulo` textual válida retornam `null` sem lançar exceção.
- Arquivos que podem ser alterados: `src/store.js`, `src/app.js`, `src/styles.css`, `index.html`, `docs/prompts/ISSUE-01.md`
- Arquivos que não devem ser alterados: `tests/**` (suíte *Test-First* elaborada pelo revisor de QA)

## Prompt inicial enviado à IA

```text
Atue como equipe de desenvolvimento do TodoLab (esquadrão Aegis QA).

Contexto: Corrigir o Defeito D-01 (Issue #1 — item A2 do Backlog), impedindo a criação de tarefas vazias ou compostas apenas por espaços e normalizando títulos válidos na borda via trim.
Critérios de aceite aprovados (BDD):
- Dado que o usuário informa "  Estudar Garantia da Qualidade  ", quando aciona store.adicionar(...) ou envia o formulário, então o título salvo é "Estudar Garantia da Qualidade" sem espaços nas bordas, mantendo espaços internos.
- Dado que o usuário envia "" ou apenas espaços/tabulações/quebras, quando tenta adicionar, então store.adicionar retorna null, preenche this.ultimoErro, não grava no localStorage, mantém o foco em #todo-input e exibe aviso acessível em região aria-live dedicada; ao enviar tarefa válida em seguida, o aviso é limpo.
- Dado entradas nulas ou não textuais (null, undefined, número, objeto sem titulo válido), quando store.adicionar é chamado, então retorna null sem lançar exceção.

Restrições:
- JavaScript puro (ESM — ECMAScript Modules / Módulos Nativos JavaScript), sem novas dependências.
- Não alterar nenhum arquivo em tests/.
- Seguir estritamente scripts/lint.mjs (2 espaços, sem tabs, sem espaços no fim da linha).
- Manter estética visual e acessibilidade sem innerHTML inseguro.
```

## Resposta recebida da IA

```text
Implementada a correção da Issue #1 nos arquivos de domínio, interface e estilo:
1. `src/store.js`: adicionada função auxiliar `extrairTituloNormalizado(entrada)` aceitando string ou objeto `{ titulo }`, validando tipo textual, aplicando `.trim()`, rejeitando vazio/espaços com preenchimento de `this.ultimoErro` e limpando `this.ultimoErro = null` em criações válidas.
2. `index.html`: adicionada região dedicada `<p id="todo-feedback" class="feedback" role="status" aria-live="polite" hidden></p>` vinculada ao `#todo-input` via `aria-describedby="todo-feedback"`.
3. `src/app.js`: no evento `submit`, rejeições exibem `store.ultimoErro` na região `aria-live`, marcam `aria-invalid="true"` no campo e mantêm o foco em `#todo-input`; criações válidas ou digitação subsequente limpam o aviso.
4. `src/styles.css`: adicionados estilos consistentes para `.feedback`, `.feedback[hidden]` e destaque de erro em `.composer input[aria-invalid="true"]`.

Verificação manual sugerida: executar `npm run dev`, enviar `""` e `"   "` para validar mensagem acessível e manutenção de foco, e enviar `"  Comprar café  "` confirmando normalização e persistência após recarregar.
```

## Verificação humana antes do Pull Request

- [x] O diff foi lido pela equipe.
- [x] Os critérios de aceite foram comparados com a alteração.
- [x] `npm run check` foi executado e o resultado real foi registrado.
- [x] A verificação automatizada (`npm test` e `npm run test:coverage`) foi executada em substituição/apoio ao smoke test.
- [x] Pendências, limitações ou dúvidas foram registradas abaixo.

Resultado real do `npm run check && npm test && npm run test:coverage`:

```text
> todolab-template@0.1.0 check
> npm run lint && npm run build

Lint aprovado: 5 arquivos JavaScript verificados.
Build aprovado: artefato gerado em dist/.

▶ Aceitação BDD — Issue #1 (Impedir tarefas vazias/espaços e normalizar título)
  ✔ Cenário 1: cria tarefa normalizada via formulário, exibe na UI, limpa o campo e mantém o foco
  ✔ Cenário 2: entrada totalmente vazia "" bloqueia criação, mantém foco no #todo-input e exibe aviso em região aria-live
  ✔ Cenário 3: entradas com espaços, tabs e quebras preservam lista/storage intactos, avisam via aria-live e limpam aviso após envio válido
  ✔ Cenário 4: API da Store rejeita null, undefined e objetos inválidos de forma segura

▶ TodoStore.adicionar — Issue #1 (normalização e bloqueio de título vazio)
  ✔ Cenário 1: remove espaços das bordas ao criar tarefa válida e persiste no armazenamento
  ✔ Cenário 2: rejeita string vazia "", registra ultimoErro e não grava no armazenamento
  ✔ Cenário 3: rejeita entradas com apenas espaços, tabulações ou quebras de linha preservando tarefas existentes
  ✔ Cenário 4: rejeita entradas nulas ou não textuais sem lançar exceção
  ✔ Casos de borda: aceita 1 caractere, preserva espaços internos, aceita emojis/acentos e limpa ultimoErro após sucesso

ℹ tests 9 | pass 9 | fail 0
ℹ src/app.js: line 91.57% | branch 77.78% | funcs 57.14%
ℹ src/store.js: line 86.05% | branch 83.33% | funcs 77.78%
```

Verificação manual / smoke test realizado:

- Passos: Executada suíte de aceitação com simulação de DOM (`tests/acceptance/issue-01.acceptance.test.js`) cobrindo submissão de formulário com espaços nas bordas, submissão vazia, submissão com espaços/tabulações/quebras, manutenção de foco em `#todo-input`, anúncio em região `aria-live` e limpeza após criação válida, além de `npm run build` gerando artefato em `dist/`.
- Resultado observado: Todos os 9 cenários (5 unitários + 4 de aceitação) passaram sem modificações em `tests/`.
- Pendências ou riscos: Limite de 200 caracteres (B4) e resiliência contra falha de `localStorage` permanecem fora de escopo nesta rodada, previstos para as Issues #7 e #3 respectivamente.

## Pull Request e revisão

- URL ou número do Pull Request: a preencher após abertura do PR
- Autor do Pull Request: `agbarbosa`
- Revisor (integrante diferente do autor): `profalexandregomes`
- O PR contém `Closes #1`? [x] sim [ ] não
- Commit ou hash da versão revisada: registrado na abertura do PR
- Resultado do CI: [ ] verde [ ] vermelho [x] ainda em execução
- Comentário substantivo do revisor (referencie um critério de aceite): pendente de revisão
- Há mudanças solicitadas abertas? [ ] sim [x] não
- A aprovação é da versão atual, depois das últimas correções? [ ] sim [ ] não [x] não houve correção
- Aceite manual registrado, com cenários e resultado observado: registrado acima
- Decisão: [ ] merge autorizado [ ] mudanças solicitadas [x] pendente

## Aprendizado da rodada

- Ambiguidade encontrada: O contrato de `TodoStore.adicionar` precisava aceitar tanto string direta quanto objeto `{ titulo }` (usado pelos casos de borda e pela futura expansão de campos de tarefa) sem lançar exceção em objetos inválidos.
- Decisão tomada: Centralizar a extração e normalização em `extrairTituloNormalizado(entrada)` na camada de domínio (`src/store.js`) e expor a mensagem diagnóstica em `this.ultimoErro`.
- Próxima melhoria de processo: Manter a validação acessível (`aria-live` + `aria-invalid` + retorno de foco) padronizada para as próximas interações de edição inline e filtros.
