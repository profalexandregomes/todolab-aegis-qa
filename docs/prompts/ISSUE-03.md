# ISSUE-03 — Registro de diálogo com IA e evidência de implementação

## Identificação da rodada

- Issue: #3 — [Bug/A4] Persistência resiliente contra JSON corrompido e falha de cota no localStorage (ISO 9126 Confiabilidade / D-02)
- Branch (ramificação): `fix/issue-03-persistencia-resiliente-iso9126`
- Autor da alteração: Alexandre Barbosa (`agbarbosa`) — app-developer
- Revisor previsto: Prof. Alexandre Gomes (`profalexandregomes`) — qa-verifier
- Data: 2026-11-23

## Contexto aprovado

- Link ou referência da Issue: https://github.com/profalexandregomes/todolab-aegis-qa/issues/3
- Critérios de aceite revisados:
  - Cenário 1: restauração fiel de tarefas válidas ao recarregar `TodoStore`, com `persistenciaDisponivel === true`.
  - Cenário 2: captura de JSON corrompido (`"{isso não é JSON"`), recuperação segura para `[]`, registro de `this.ultimoErro` e exibição de aviso na UI permitindo novas criações.
  - Cenário 3: tratamento de JSON válido com estrutura incompatível (objeto, número, `null`, string) como `[]` com registro diagnóstico em `this.ultimoErro`.
  - Cenário 4: tratamento de `QuotaExceededError` em `salvar()`, mantendo tarefas e operações em memória, preenchendo `this.ultimoErro` e exibindo alerta não bloqueante na UI.
  - Cenário 5: operação em memória quando `armazenamento` é `null` ou lança `SecurityError`, marcando `persistenciaDisponivel = false` e exibindo aviso claro na UI.
- Arquivos que podem ser alterados: `src/store.js`, `src/app.js`, `src/styles.css`, `index.html`, `docs/prompts/ISSUE-03.md`
- Arquivos que não devem ser alterados: `tests/**` (suíte *Test-First* elaborada pelo revisor de QA)

## Prompt inicial enviado à IA

```text
Atue como equipe de desenvolvimento do TodoLab (esquadrão Aegis QA).

Contexto: Implementar persistência resiliente (Issue #3 / item A4 e Defeito D-02, ISO 9126 Confiabilidade) em TodoStore.carregar() e TodoStore.salvar(), bem como faixa de aviso não bloqueante na UI.
Critérios de aceite aprovados (BDD):
- Capturar JSON inválido ou payload não-array no localStorage, filtrar itens corrompidos dentro de arrays mistos e inicializar com segurança sem propagar exceções.
- Capturar QuotaExceededError ao gravar, mantendo as tarefas utilizáveis em memória, registrando ultimoErro e limpando o erro se uma gravação posterior for bem-sucedida.
- Suportar armazenamento null ou bloqueado por SecurityError com persistenciaDisponivel = false e operação contínua em memória.
- Exibir faixa de aviso acessível (role="alert" / aria-live) na UI sem bloquear o uso da fila de tarefas.

Restrições:
- JavaScript puro (ESM — ECMAScript Modules / Módulos Nativos JavaScript), sem novas dependências.
- Não alterar nenhum arquivo em tests/.
- Seguir estritamente scripts/lint.mjs (2 espaços, sem tabs, sem espaços no fim da linha).
```

## Resposta recebida da IA

```text
Implementada a camada de persistência resiliente e os avisos não bloqueantes da Issue #3:
1. `src/store.js`:
   - Adicionadas funções auxiliares `obterArmazenamentoPadrao()`, `temInterfaceArmazenamento()`, `classificarErroArmazenamento()` e `normalizarRegistroArmazenado()`.
   - `TodoStore.carregar()` protege leitura (`getItem`) contra `SecurityError`, faz `JSON.parse` seguro, valida `Array.isArray(...)` e filtra/higieniza registros individuais, registrando diagnóstico em `this.erroPersistencia` e `this.ultimoErro`.
   - `TodoStore.salvar()` retorna booleano, captura `QuotaExceededError` / `SecurityError` mantendo o estado em memória, atualiza `persistenciaDisponivel` e limpa `ultimoErro`/`erroPersistencia` quando a gravação se recupera com sucesso.
2. `index.html`, `src/app.js` e `src/styles.css`:
   - Adicionado banner não bloqueante `#storage-alert` (`role="alert"`, `aria-live="polite"`) sincronizado em toda chamada a `render()` via `sincronizarAlertaPersistencia()`.
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
▶ Aceitação BDD — Issue #3 (Persistência resiliente ISO 9126 Confiabilidade)
  ✔ Cenário 2: inicializa sem quebrar com JSON corrompido, exibe aviso e permite criar novas tarefas
  ✔ Cenário 4: exibe alerta não bloqueante e mantém tarefa em memória quando QuotaExceededError ocorre
  ✔ Cenário 5: funciona em memória com aviso claro quando localStorage lança SecurityError
▶ TodoStore.adicionar — Issue #1 (5/5 aprovados)
▶ TodoStore persistência resiliente (ISO 9126 Confiabilidade) — Issue #3 (D-02 / A4)
  ✔ Cenário 1: restaura exatamente 3 tarefas com títulos, IDs e estados preservados ao recarregar
  ✔ Cenário 2: captura JSON corrompido no localStorage, recupera para [] e registra ultimoErro
  ✔ Cenário 3: trata JSON válido com estrutura incompatível (objeto, número, null) como [] com ultimoErro
  ✔ Cenário 4: captura QuotaExceededError em salvar(), mantém tarefas em memória e registra ultimoErro
  ✔ Cenário 5: opera em memória quando armazenamento é null ou lança SecurityError, marcando persistenciaDisponivel = false
  ✔ Casos de borda: filtra registros corrompidos no array, trata vazio sem erro e limpa ultimoErro ao recuperar gravação
▶ TodoStore.remover e unicidade de ID — Issue #2 (5/5 aprovados)

ℹ tests 25 | suites 6 | pass 25 | fail 0
ℹ src/app.js: line 84.00% | branch 71.43% | funcs 75.00%
ℹ src/store.js: line 98.12% | branch 88.46% | funcs 100.00%
```

Verificação manual / smoke test realizado:

- Passos: Executada suíte `tests/acceptance/issue-03.acceptance.test.js` simulando `localStorage` com payload `"{isso não é JSON"`, falha `QuotaExceededError` ao gravar e bloqueio `SecurityError` na inicialização e gravação.
- Resultado observado: A UI inicializou sem exceções, exibiu aviso acessível em `#storage-alert` e manteve todas as operações funcionais em memória.
- Pendências ou riscos: Exportação/importação manual em JSON versionado `v1.2.0` está prevista para a Issue #8.

## Pull Request e revisão

- URL ou número do Pull Request: a preencher após abertura do PR
- Autor do Pull Request: `agbarbosa`
- Revisor (integrante diferente do autor): `profalexandregomes`
- O PR contém `Closes #3`? [x] sim [ ] não
- Commit ou hash da versão revisada: registrado na abertura do PR
- Resultado do CI: [ ] verde [ ] vermelho [x] ainda em execução
- Comentário substantivo do revisor (referencie um critério de aceite): pendente de revisão
- Há mudanças solicitadas abertas? [ ] sim [x] não
- A aprovação é da versão atual, depois das últimas correções? [ ] sim [ ] não [x] não houve correção
- Aceite manual registrado, com cenários e resultado observado: registrado acima
- Decisão: [ ] merge autorizado [ ] mudanças solicitadas [x] pendente

## Aprendizado da rodada

- Ambiguidade encontrada: Erros de validação de entrada do formulário (`ultimoErro` na Issue #1) não devem sobrescrever o estado de aviso de persistência da UI, e recuperações de escrita (`salvar()`) devem limpar `ultimoErro` quando o armazenamento volta a responder.
- Decisão tomada: Manter `erroPersistencia` separado internamente para sincronização do banner `#storage-alert`, espelhando em `ultimoErro` para manter compatibilidade integral com o contrato da `TodoStore`.
- Próxima melhoria de processo: Garantir que toda migração de campos nas próximas Features (Kanban, Prioridade, Pomodoro) reutilize `normalizarRegistroArmazenado()`.
