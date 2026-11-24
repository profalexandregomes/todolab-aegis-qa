# ISSUE-08 — Registro de diálogo com IA e evidência de implementação

## Identificação da rodada

- Issue: #8 — [Feature 5 / C3+D3] Painel de Telemetria de Qualidade, Auditoria e Exportação/Importação JSON Versionada (v1.2.0)
- Branch (ramificação): `feat/issue-08-telemetria-qa-exportacao-json`
- Autor da alteração: Alexandre Barbosa (`agbarbosa`) — app-developer
- Revisor previsto: Prof. Alexandre Gomes (`profalexandregomes`) — qa-verifier
- Data: 2026-11-23

## Contexto aprovado

- Link ou referência da Issue: https://github.com/profalexandregomes/todolab-aegis-qa/issues/8
- Critérios de aceite revisados:
  - Cenário 1 (C3): `calcularEstatisticas(tarefas, dataReferencia, limiteWip)` e `TodoStore.estatisticas(dataReferencia)` evitam divisão por zero (`0/0 -> 0`, `1/3 -> 33.3`) e apuram totais por coluna, prioridade, atrasos, WIP e variação de esforço.
  - Cenário 2 (D3): `exportarJSON()` e `importarJSON()` seguem contrato `v1.2.0` (`{ produto: "TodoLab", versaoSchema: "1.2.0", exportadoEm, limiteWip, tarefas }`) com suporte a `desfazer()`.
  - Cenário 3 (D3): `importarJSON()` rejeita atomicamente sintaxe quebrada, versão incompatível e títulos inválidos (`<= 200` chars) preservando 100% da lista atual.
  - Cenário 4 (UI): `#telemetry-panel` exibe taxa de conclusão `%`, atrasos/WIP, total Estimativa vs. Esforço Real e controles de Exportar `.json` (`Blob`) e Importar `.json` (`input[type="file"]`).
  - Cenário 5 (CI/CD e Governança): esteira `.github/workflows/quality-gate.yml` executa `lint`, `build`, `test:unit`, `test:acceptance`, `test:coverage:gate` (>= 60% em `src/`) e `guard-tests` (`scripts/guard-tests.mjs`), além de documentação consolidada (`README.md`, `docs/rodizio.md`, `docs/qualidade/*`, `CHANGELOG.md`).
  - Casos de borda: `validarSchemaImportacao()` remove campos extras e impede poluição de protótipo (`__proto__`), além de rejeitar cargas acima de 5.000 tarefas.
- Arquivos que podem ser alterados: `src/store.js`, `src/app.js`, `src/styles.css`, `index.html`, `package.json`, `scripts/guard-tests.mjs`, `scripts/check-coverage.mjs`, `.github/workflows/quality-gate.yml`, `docs/prompts/ISSUE-08.md` (e docs de governança com `@docs-governance`)
- Arquivos que não devem ser alterados: `tests/**` (suíte *Test-First* elaborada pelo revisor de QA)

## Prompt inicial enviado à IA

```text
Atue como equipe de desenvolvimento do TodoLab (esquadrão Aegis QA).

Contexto: Implementar a entrega final v1.2.0 (Issue #8 — C3 + D3 + endurecimento CI/CD): Painel de Telemetria de Qualidade, exportação/importação JSON versionada v1.2.0, cobertura >= 60% e guard-tests.
Critérios de aceite aprovados (BDD):
- Exportar `calcularEstatisticas(tarefas, dataReferencia, limiteWip)` e `validarSchemaImportacao(payload)` em `src/store.js`, mais `estatisticas()`, `exportarJSON()` e `importarJSON()` em `TodoStore`.
- Sanitizar estritamente propriedades permitidas na importação (proteção contra poluição de protótipo) e limitar a 5.000 tarefas.
- Adicionar `#telemetry-panel` na UI com taxa de conclusão `%`, atrasos/WIP, esforço estimado vs. real, botão Exportar JSON e `input[type="file"]` para Importar JSON.
- Criar `scripts/guard-tests.mjs` e `scripts/check-coverage.mjs` (>= 60% de linhas em `src/`) e integrá-los ao `.github/workflows/quality-gate.yml`.

Restrições:
- JavaScript puro (ESM), zero dependências externas, sem `innerHTML`.
- Não alterar nenhum arquivo em `tests/`.
- Seguir estritamente `scripts/lint.mjs`.
```

## Resposta recebida da IA

```text
Implementadas a telemetria global, portabilidade v1.2.0 e o endurecimento de CI/CD da Issue #8:
1. `src/store.js`:
   - Exportadas `calcularEstatisticas(tarefas, dataReferencia, limiteWip)` (com `0/0 -> 0` e arredondamento `1` casa decimal) e `validarSchemaImportacao(payload)` (validação de produto/versão `1.2.0`, limite de 5.000 tarefas, whitelist de campos contra poluição de protótipo e validação de cada tarefa).
   - Adicionados `TodoStore.estatisticas()`, `TodoStore.exportarJSON()` e `TodoStore.importarJSON()` (rejeição atômica em caso de erro e registro de snapshot em `pilhaUndo` no sucesso).
2. `index.html`, `src/app.js` e `src/styles.css`:
   - Adicionado `#telemetry-panel` exibindo taxa de conclusão `%`, atrasos/WIP, Estimativa vs. Esforço Real, botão `#export-json-btn` (`Blob` + `URL.createObjectURL`) e `#import-json-input` (`FileReader`).
3. `scripts/check-coverage.mjs`, `scripts/guard-tests.mjs`, `package.json` e `.github/workflows/quality-gate.yml`:
   - Criados portões `test:coverage:gate` (exigindo cobertura de linhas >= 60% em `src/`) e `guard:tests` (exigindo label `test-change-justificado` em alterações simultâneas de `tests/` e `src/`), ambos executados na esteira CI.
```

## Verificação humana antes do Pull Request

- [x] O diff foi lido pela equipe.
- [x] Os critérios de aceite foram comparados com a alteração.
- [x] `npm run check` foi executado e o resultado real foi registrado.
- [x] `npm run test:unit`, `npm run test:acceptance`, `npm run test:coverage:gate` e `npm run guard:tests` foram executados.
- [x] Pendências, limitações ou dúvidas foram registradas abaixo.

Resultado real das verificações:

```text
> todolab-template@0.1.0 check
Lint aprovado: 7 arquivos JavaScript verificados.
Build aprovado: artefato gerado em dist/.

▶ Aceitação BDD — Issues #1 a #7 (18/18 aprovados)
▶ Aceitação BDD — Issue #8 (Painel de Telemetria QA e Exportação/Importação JSON v1.2.0)
  ✔ Cenário 4 e portabilidade: exibe métricas de telemetria, exporta JSON v1.2.0 e importa arquivo válido e rejeita inválido
▶ TodoStore — unitários Issues #1 a #7 (32/32 aprovados)
▶ Telemetria de Qualidade (C3) e Portabilidade JSON v1.2.0 (D3) — Issue #8
  ✔ Cenário 1 (C3): calcularEstatisticas evita divisão por zero (0/0 -> 0) e calcula 1/3 -> 33.3 com totais por coluna, prioridade, prazos e esforço
  ✔ Cenário 2 (D3): exportarJSON e importarJSON no schema v1.2.0 são idempotentes e suportam desfazer()
  ✔ Cenário 3 (D3): importarJSON rejeita atomicamente JSON inválido, versão incompatível e títulos inválidos preservando dados atuais
  ✔ Casos de borda: validarSchemaImportacao remove campos extras/poluição de protótipo e rejeita carga > 5000 itens

ℹ tests 55 | suites 16 | pass 55 | fail 0
ℹ src/app.js: line 66.28% | branch 46.55%
ℹ src/store.js: line 93.61% | branch 84.57% | funcs 98.25%
Coverage Gate aprovado (média de linhas em src/: 79.94% >= 60%).
```

Verificação manual / smoke test realizado:

- Passos: Executada suíte `tests/acceptance/issue-08.acceptance.test.js` verificando painel de telemetria (`50%`, `50 min`), geração de `Blob` `v1.2.0`, rejeição atômica de versão `0.1.0` via `input[type="file"]`, limpeza e restauração completa via importação do arquivo exportado.
- Resultado observado: Todos os 55 testes e portões locais passaram sem erros e com média de cobertura de `79.94%` em `src/`.
- Pendências ou riscos: Atualização final dos documentos de governança (`README.md`, `docs/rodizio.md`, `docs/qualidade/*`, `CHANGELOG.md`) coordenada com `@docs-governance` na mesma branch antes da abertura do PR #16.

## Pull Request e revisão

- URL ou número do Pull Request: a preencher após abertura do PR
- Autor do Pull Request: `agbarbosa`
- Revisor (integrante diferente do autor): `profalexandregomes`
- O PR contém `Closes #8`? [x] sim [ ] não
- Commit ou hash da versão revisada: registrado na abertura do PR
- Resultado do CI: [ ] verde [ ] vermelho [x] ainda em execução
- Comentário substantivo do revisor (referencie um critério de aceite): pendente de revisão
- Há mudanças solicitadas abertas? [ ] sim [x] não
- A aprovação é da versão atual, depois das últimas correções? [ ] sim [ ] não [x] não houve correção
- Aceite manual registrado, com cenários e resultado observado: registrado acima
- Decisão: [ ] merge autorizado [ ] mudanças solicitadas [x] pendente

## Aprendizado da rodada

- Ambiguidade encontrada: A esteira com `guard-tests` precisa permitir PRs legítimos que agrupam testes Test-First e implementação (como a entrega final da Issue #8) mediante label explícita `test-change-justificado`.
- Decisão tomada: Configurar `.github/workflows/quality-gate.yml` com `fetch-depth: 0` e evento `labeled` em `pull_request`, além de checagem de cobertura cross-version em `scripts/check-coverage.mjs` compatível com Node 20.
- Próxima melhoria de processo: Publicar a Release `v1.2.0` e validar o deploy no GitHub Pages com smoke test HTTP real.
